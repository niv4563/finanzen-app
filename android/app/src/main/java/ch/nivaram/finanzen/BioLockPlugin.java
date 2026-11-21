package ch.nivaram.finanzen;

import android.content.Context;
import android.content.DialogInterface;
import android.hardware.biometrics.BiometricManager;
import android.hardware.biometrics.BiometricPrompt;
import android.os.Build;
import android.os.CancellationSignal;
import android.security.keystore.KeyGenParameterSpec;
import android.security.keystore.KeyPermanentlyInvalidatedException;
import android.security.keystore.KeyProperties;
import android.security.keystore.StrongBoxUnavailableException;
import android.util.Base64;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.nio.charset.StandardCharsets;
import java.security.KeyStore;
import java.util.Arrays;
import java.util.concurrent.Executor;
import javax.crypto.Cipher;
import javax.crypto.KeyGenerator;
import javax.crypto.SecretKey;
import javax.crypto.spec.GCMParameterSpec;

/**
 * Entsperren mit Fingerabdruck.
 *
 * Die PIN wird mit einem Schlüssel im Sicherheitschip des Handys (Android Keystore, wenn möglich StrongBox)
 * verschlüsselt. Dieser Schlüssel verlässt den Chip nie und lässt sich nur nach einer erfolgreichen
 * Prüfung des Fingerabdrucks (Klasse «stark») für genau einen Vorgang benutzen (CryptoObject).
 * Wird ein neuer Fingerabdruck im Handy hinzugefügt, wird der Schlüssel ungültig – dann ist wieder die PIN nötig.
 */
@CapacitorPlugin(name = "BioLock")
public class BioLockPlugin extends Plugin {

    private static final String ALIAS = "finanzen_biolock_v1";
    private static final String STORE = "AndroidKeyStore";
    private static final String TRANSFORM = "AES/GCM/NoPadding";
    private static final int IV_LEN = 12;

    private CancellationSignal running;

    @PluginMethod
    public void status(PluginCall call) {
        JSObject r = new JSObject();
        int code = canAuth(getContext());
        r.put("available", code == BiometricManager.BIOMETRIC_SUCCESS);
        r.put("reason", code == BiometricManager.BIOMETRIC_ERROR_NONE_ENROLLED ? "keinFinger"
                : code == BiometricManager.BIOMETRIC_SUCCESS ? "ok" : "nichtVerfuegbar");
        r.put("enrolled", hasKey());
        call.resolve(r);
    }

    @PluginMethod
    public void enable(PluginCall call) {
        String secret = call.getString("secret");
        if (secret == null || secret.isEmpty() || secret.length() > 512) { call.reject("Ungültige Eingabe", "BAD_INPUT"); return; }
        if (canAuth(getContext()) != BiometricManager.BIOMETRIC_SUCCESS) { call.reject("Kein Fingerabdruck eingerichtet", "UNAVAILABLE"); return; }
        try {
            deleteKey();
            SecretKey key = createKey();
            Cipher cipher = Cipher.getInstance(TRANSFORM);
            cipher.init(Cipher.ENCRYPT_MODE, key);
            final byte[] plain = secret.getBytes(StandardCharsets.UTF_8);
            prompt(call, cipher, "Fingerabdruck einrichten", "Bestätige mit deinem Fingerabdruck", c -> {
                byte[] ct = c.doFinal(plain);
                Arrays.fill(plain, (byte) 0);
                byte[] out = new byte[IV_LEN + ct.length];
                System.arraycopy(c.getIV(), 0, out, 0, IV_LEN);
                System.arraycopy(ct, 0, out, IV_LEN, ct.length);
                JSObject r = new JSObject();
                r.put("data", Base64.encodeToString(out, Base64.NO_WRAP));
                return r;
            });
        } catch (Exception e) {
            deleteKey();
            call.reject("Fingerabdruck konnte nicht eingerichtet werden", "FAILED");
        }
    }

    @PluginMethod
    public void unlock(PluginCall call) {
        String data = call.getString("data");
        byte[] raw;
        try { raw = Base64.decode(data == null ? "" : data, Base64.NO_WRAP); } catch (IllegalArgumentException e) { raw = new byte[0]; }
        if (raw.length <= IV_LEN + 16 || !hasKey()) { call.reject("Nicht eingerichtet", "NOT_ENROLLED"); return; }
        try {
            SecretKey key = (SecretKey) keyStore().getKey(ALIAS, null);
            Cipher cipher = Cipher.getInstance(TRANSFORM);
            cipher.init(Cipher.DECRYPT_MODE, key, new GCMParameterSpec(128, raw, 0, IV_LEN));
            final byte[] ct = Arrays.copyOfRange(raw, IV_LEN, raw.length);
            prompt(call, cipher, "Finanzen entsperren", "Mit Fingerabdruck entsperren", c -> {
                byte[] plain = c.doFinal(ct);
                JSObject r = new JSObject();
                r.put("secret", new String(plain, StandardCharsets.UTF_8));
                Arrays.fill(plain, (byte) 0);
                return r;
            });
        } catch (KeyPermanentlyInvalidatedException e) {
            deleteKey();
            call.reject("Fingerabdrücke wurden geändert – bitte mit PIN entsperren und neu einrichten", "INVALIDATED");
        } catch (Exception e) {
            call.reject("Entsperren mit Fingerabdruck nicht möglich", "FAILED");
        }
    }

    @PluginMethod
    public void disable(PluginCall call) {
        deleteKey();
        call.resolve();
    }

    // ---------------------------------------------------------------------------------------------

    private interface Finish { JSObject run(Cipher c) throws Exception; }

    private void prompt(PluginCall call, Cipher cipher, String title, String subtitle, Finish finish) {
        final Executor ex = getContext().getMainExecutor();
        getActivity().runOnUiThread(() -> {
            if (running != null) running.cancel();
            running = new CancellationSignal();
            BiometricPrompt.Builder b = new BiometricPrompt.Builder(getActivity())
                    .setTitle(title)
                    .setSubtitle(subtitle)
                    .setConfirmationRequired(false)
                    .setNegativeButton("PIN verwenden", ex, (DialogInterface d, int w) -> call.reject("Abgebrochen", "CANCELED"));
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                b.setAllowedAuthenticators(BiometricManager.Authenticators.BIOMETRIC_STRONG);
            }
            b.build().authenticate(new BiometricPrompt.CryptoObject(cipher), running, ex, new BiometricPrompt.AuthenticationCallback() {
                @Override
                public void onAuthenticationSucceeded(BiometricPrompt.AuthenticationResult result) {
                    running = null;
                    try {
                        call.resolve(finish.run(result.getCryptoObject().getCipher()));
                    } catch (Exception e) {
                        call.reject("Fingerabdruck-Prüfung fehlgeschlagen", "FAILED");
                    }
                }

                @Override
                public void onAuthenticationError(int code, CharSequence msg) {
                    running = null;
                    boolean canceled = code == BiometricPrompt.BIOMETRIC_ERROR_USER_CANCELED
                            || code == BiometricPrompt.BIOMETRIC_ERROR_CANCELED;
                    call.reject(msg == null ? "Abgebrochen" : msg.toString(),
                            canceled ? "CANCELED" : (code == BiometricPrompt.BIOMETRIC_ERROR_LOCKOUT
                                    || code == BiometricPrompt.BIOMETRIC_ERROR_LOCKOUT_PERMANENT ? "LOCKOUT" : "ERROR"));
                }
                // onAuthenticationFailed (falscher Finger): Android zeigt das selbst an, die Abfrage läuft weiter.
            });
        });
    }

    private static int canAuth(Context ctx) {
        BiometricManager bm = ctx.getSystemService(BiometricManager.class);
        if (bm == null) return BiometricManager.BIOMETRIC_ERROR_NO_HARDWARE;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            return bm.canAuthenticate(BiometricManager.Authenticators.BIOMETRIC_STRONG);
        }
        return bm.canAuthenticate();
    }

    private static KeyStore keyStore() throws Exception {
        KeyStore ks = KeyStore.getInstance(STORE);
        ks.load(null);
        return ks;
    }

    private static boolean hasKey() {
        try { return keyStore().containsAlias(ALIAS); } catch (Exception e) { return false; }
    }

    private static void deleteKey() {
        try { keyStore().deleteEntry(ALIAS); } catch (Exception ignored) { /* nichts zu tun */ }
    }

    private static SecretKey createKey() throws Exception {
        try {
            return generate(true);                       // Sicherheitschip (StrongBox), falls vorhanden
        } catch (StrongBoxUnavailableException e) {
            return generate(false);                      // sonst geschützter Bereich des Prozessors (TEE)
        } catch (Exception e) {
            deleteKey();
            return generate(false);
        }
    }

    private static SecretKey generate(boolean strongBox) throws Exception {
        KeyGenParameterSpec.Builder b = new KeyGenParameterSpec.Builder(ALIAS,
                KeyProperties.PURPOSE_ENCRYPT | KeyProperties.PURPOSE_DECRYPT)
                .setBlockModes(KeyProperties.BLOCK_MODE_GCM)
                .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
                .setKeySize(256)
                .setUserAuthenticationRequired(true)
                .setInvalidatedByBiometricEnrollment(true)
                .setIsStrongBoxBacked(strongBox);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            b.setUserAuthenticationParameters(0, KeyProperties.AUTH_BIOMETRIC_STRONG);   // jede Nutzung braucht den Finger
        }
        KeyGenerator kg = KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, STORE);
        kg.init(b.build());
        return kg.generateKey();
    }
}
