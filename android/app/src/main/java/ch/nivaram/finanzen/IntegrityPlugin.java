package ch.nivaram.finanzen;

import android.content.pm.ApplicationInfo;
import android.content.pm.PackageInfo;
import android.content.pm.PackageManager;
import android.content.pm.Signature;
import android.os.Build;
import android.os.Debug;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.BufferedReader;
import java.io.File;
import java.io.FileReader;
import java.security.MessageDigest;
import java.util.Locale;

/**
 * Sicherheitsprüfung des Geräts und der App (wie bei Bank-Apps, OWASP MASVS-RESILIENCE).
 *
 * Erkannt werden: Root (su, Magisk, KernelSU, APatch), Test-Builds des Systems,
 * Hooking-Werkzeuge (Frida, Xposed/LSPosed, Substrate), ein angehängter Debugger,
 * ein Emulator und eine App, die nicht mit dem offiziellen Schlüssel signiert ist.
 *
 * Die App WARNT nur – sie sperrt nichts, damit deine Daten immer erreichbar bleiben.
 * Es geht nichts ins Internet; das Ergebnis bleibt auf dem Gerät.
 */
@CapacitorPlugin(name = "Integrity")
public class IntegrityPlugin extends Plugin {

    private static final String[] SU_PATHS = {
        "/system/bin/su", "/system/xbin/su", "/sbin/su", "/su/bin/su", "/system/sd/xbin/su",
        "/system/bin/failsafe/su", "/data/local/su", "/data/local/bin/su", "/data/local/xbin/su",
        "/system/app/Superuser.apk", "/system/xbin/daemonsu", "/data/adb/magisk", "/data/adb/ksu",
        "/data/adb/ap", "/data/adb/modules", "/cache/.disable_magisk", "/dev/.magisk.unblock"
    };
    private static final String[] ROOT_APPS = {
        "com.topjohnwu.magisk", "io.github.vvb2060.magisk", "me.weishu.kernelsu", "me.bmax.apatch",
        "eu.chainfire.supersu", "com.koushikdutta.superuser", "com.noshufou.android.su",
        "de.robv.android.xposed.installer", "org.lsposed.manager", "com.saurik.substrate"
    };
    private static final String[] HOOK_MARKS = { "frida", "gadget", "xposed", "lsposed", "substrate", "libriru", "zygisk" };

    @PluginMethod
    public void check(PluginCall call) {
        JSArray reasons = new JSArray();
        boolean rooted = false, hooked = false, debug = false, emulator = false;

        for (String p : SU_PATHS) {
            try { if (new File(p).exists()) { rooted = true; reasons.put("Root-Datei gefunden: " + p); break; } }
            catch (SecurityException ignored) { /* nicht lesbar = gut */ }
        }
        PackageManager pm = getContext().getPackageManager();
        for (String pkg : ROOT_APPS) {
            if (installed(pm, pkg)) {
                if (pkg.contains("xposed") || pkg.contains("lsposed") || pkg.contains("substrate")) { hooked = true; }
                else { rooted = true; }
                reasons.put("App zum Verändern des Systems installiert: " + pkg);
            }
        }
        String tags = Build.TAGS == null ? "" : Build.TAGS;
        if (tags.contains("test-keys")) { rooted = true; reasons.put("System mit Test-Schlüssel signiert"); }

        try (BufferedReader r = new BufferedReader(new FileReader("/proc/self/maps"))) {
            String line; int n = 0;
            while ((line = r.readLine()) != null && n < 20000) {
                n++;
                String l = line.toLowerCase(Locale.ROOT);
                for (String m : HOOK_MARKS) {
                    if (l.contains(m)) { hooked = true; reasons.put("Fremder Code im App-Speicher: " + m); n = 20000; break; }
                }
            }
        } catch (Exception ignored) { /* nicht lesbar */ }
        try { Class.forName("de.robv.android.xposed.XposedBridge"); hooked = true; reasons.put("Xposed aktiv"); }
        catch (Throwable ignored) { /* gut */ }

        boolean appDebuggable = (getContext().getApplicationInfo().flags & ApplicationInfo.FLAG_DEBUGGABLE) != 0;
        if (Debug.isDebuggerConnected() || Debug.waitingForDebugger()) { debug = true; reasons.put("Debugger angehängt"); }
        if (appDebuggable && !BuildConfig.DEBUG) { debug = true; reasons.put("App ist als debuggable markiert"); }

        String fp = (Build.FINGERPRINT == null ? "" : Build.FINGERPRINT).toLowerCase(Locale.ROOT);
        String hw = (Build.HARDWARE == null ? "" : Build.HARDWARE).toLowerCase(Locale.ROOT);
        if (fp.startsWith("generic") || fp.contains("emulator") || hw.contains("goldfish") || hw.contains("ranchu")) {
            emulator = true; reasons.put("Emulator");
        }

        String cert = signingCert(pm);
        String expected = BuildConfig.EXPECTED_CERT == null ? "" : BuildConfig.EXPECTED_CERT.replace(":", "").replace(" ", "").toLowerCase(Locale.ROOT);
        Boolean sigOk = expected.isEmpty() ? null : expected.equals(cert);
        if (Boolean.FALSE.equals(sigOk)) reasons.put("App nicht mit dem offiziellen Schlüssel signiert");

        String installer = "";
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                String s = pm.getInstallSourceInfo(getContext().getPackageName()).getInstallingPackageName();
                installer = s == null ? "" : s;
            }
        } catch (Exception ignored) { /* unbekannt */ }

        JSObject r = new JSObject();
        r.put("rooted", rooted);
        r.put("hooked", hooked);
        r.put("debugger", debug);
        r.put("emulator", emulator);
        r.put("signatureOk", sigOk == null ? JSObject.NULL : sigOk);
        r.put("cert", cert);
        r.put("installer", installer);
        r.put("reasons", reasons);
        call.resolve(r);
    }

    private static boolean installed(PackageManager pm, String pkg) {
        try { pm.getPackageInfo(pkg, 0); return true; } catch (Exception e) { return false; }
    }

    private String signingCert(PackageManager pm) {
        try {
            Signature[] sigs;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
                PackageInfo pi = pm.getPackageInfo(getContext().getPackageName(), PackageManager.GET_SIGNING_CERTIFICATES);
                if (pi.signingInfo == null) return "";
                sigs = pi.signingInfo.hasMultipleSigners() ? pi.signingInfo.getApkContentsSigners() : pi.signingInfo.getSigningCertificateHistory();
            } else {
                return "";
            }
            if (sigs == null || sigs.length == 0) return "";
            // bei Schlüsselrotation ist der aktuelle Schlüssel der letzte in der Liste
            byte[] d = MessageDigest.getInstance("SHA-256").digest(sigs[sigs.length - 1].toByteArray());
            StringBuilder sb = new StringBuilder();
            for (byte b : d) sb.append(String.format(Locale.ROOT, "%02x", b));
            return sb.toString();
        } catch (Exception e) {
            return "";
        }
    }
}
