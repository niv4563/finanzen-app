package ch.nivaram.finanzen;

import android.content.Context;
import android.content.SharedPreferences;
import android.security.keystore.KeyGenParameterSpec;
import android.security.keystore.KeyProperties;
import android.security.keystore.StrongBoxUnavailableException;
import android.util.Base64;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.security.KeyStore;
import java.security.SecureRandom;
import java.util.Arrays;
import javax.crypto.Cipher;
import javax.crypto.KeyGenerator;
import javax.crypto.SecretKey;
import javax.crypto.spec.GCMParameterSpec;

/**
 * Geräteschlüssel: bindet die gespeicherten Finanzdaten an genau dieses Handy.
 *
 * Ein zufälliges 256-Bit-Geheimnis wird mit einem AES-256-Schlüssel im Sicherheitschip
 * (Android Keystore, wenn möglich StrongBox) verschlüsselt abgelegt. Der Chip-Schlüssel verlässt
 * das Handy nie. Die App verbindet dieses
 * Geheimnis mit der PIN – wer die gespeicherten Daten vom Handy kopiert, kann die PIN deshalb
 * nicht auf einem anderen Gerät durchprobieren.
 */
@CapacitorPlugin(name = "DeviceKey")
public class DeviceKeyPlugin extends Plugin {

    private static final String ALIAS = "finanzen_device_v1";
    private static final String STORE = "AndroidKeyStore";
    private static final String PREFS = "finanzen_devicekey";
    private static final String ENTRY = "wrapped";
    private static final int IV_LEN = 12;

    @PluginMethod
    public synchronized void get(PluginCall call) {
        try {
            SharedPreferences sp = getContext().getSharedPreferences(PREFS, Context.MODE_PRIVATE);
            String wrapped = sp.getString(ENTRY, null);
            byte[] secret;
            if (wrapped == null || !hasKey()) {
                if (wrapped != null) { call.reject("Geräteschlüssel fehlt", "MISSING"); return; }
                secret = new byte[32];
                new SecureRandom().nextBytes(secret);
                Cipher c = Cipher.getInstance("AES/GCM/NoPadding");
                c.init(Cipher.ENCRYPT_MODE, createKey());
                byte[] ct = c.doFinal(secret);
                byte[] out = new byte[IV_LEN + ct.length];
                System.arraycopy(c.getIV(), 0, out, 0, IV_LEN);
                System.arraycopy(ct, 0, out, IV_LEN, ct.length);
                if (!sp.edit().putString(ENTRY, Base64.encodeToString(out, Base64.NO_WRAP)).commit()) {
                    throw new IllegalStateException("speichern");
                }
            } else {
                byte[] raw = Base64.decode(wrapped, Base64.NO_WRAP);
                SecretKey key = (SecretKey) keyStore().getKey(ALIAS, null);
                Cipher c = Cipher.getInstance("AES/GCM/NoPadding");
                c.init(Cipher.DECRYPT_MODE, key, new GCMParameterSpec(128, raw, 0, IV_LEN));
                secret = c.doFinal(raw, IV_LEN, raw.length - IV_LEN);
            }
            JSObject r = new JSObject();
            r.put("secret", Base64.encodeToString(secret, Base64.NO_WRAP));
            Arrays.fill(secret, (byte) 0);
            call.resolve(r);
        } catch (Exception e) {
            call.reject("Geräteschlüssel nicht verfügbar", "FAILED");
        }
    }

    private static KeyStore keyStore() throws Exception {
        KeyStore ks = KeyStore.getInstance(STORE);
        ks.load(null);
        return ks;
    }

    private static boolean hasKey() {
        try { return keyStore().containsAlias(ALIAS); } catch (Exception e) { return false; }
    }

    private static SecretKey createKey() throws Exception {
        try {
            return generate(true);                       // Sicherheitschip (StrongBox), falls vorhanden
        } catch (StrongBoxUnavailableException e) {
            return generate(false);                      // sonst geschützter Bereich des Prozessors (TEE)
        } catch (Exception e) {
            try { keyStore().deleteEntry(ALIAS); } catch (Exception ignored) { /* nichts */ }
            return generate(false);
        }
    }

    private static SecretKey generate(boolean strongBox) throws Exception {
        KeyGenParameterSpec.Builder b = new KeyGenParameterSpec.Builder(ALIAS,
                KeyProperties.PURPOSE_ENCRYPT | KeyProperties.PURPOSE_DECRYPT)
                .setBlockModes(KeyProperties.BLOCK_MODE_GCM)
                .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
                .setKeySize(256)
                .setRandomizedEncryptionRequired(true)
                .setIsStrongBoxBacked(strongBox);
        KeyGenerator kg = KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, STORE);
        kg.init(b.build());
        return kg.generateKey();
    }
}
