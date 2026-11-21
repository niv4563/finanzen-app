package ch.nivaram.finanzen;

import android.os.Build;
import android.os.Environment;
import android.os.Bundle;
import android.view.WindowManager;
import android.webkit.WebSettings;
import android.webkit.WebView;
import com.getcapacitor.BridgeActivity;
import java.io.File;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        // Bildschirm schützen: keine Screenshots, keine Bildschirmaufnahme,
        // keine Vorschau der Finanzdaten in der Übersicht «Zuletzt verwendet».
        getWindow().setFlags(WindowManager.LayoutParams.FLAG_SECURE, WindowManager.LayoutParams.FLAG_SECURE);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            getWindow().setHideOverlayWindows(true);              // fremde Overlays ausblenden (Tapjacking)
        }
        registerPlugin(BioLockPlugin.class);                     // Entsperren mit Fingerabdruck (eigener Code, keine Fremdbibliothek)
        super.onCreate(savedInstanceState);
        hardenWebView();
        deleteOldPhotos();
    }

    @Override
    public void onResume() {
        super.onResume();
        deleteOldPhotos();
    }

    // Fotos von Rechnungen werden nur für die Erkennung gebraucht und nie aufbewahrt:
    // alles, was älter als 30 Minuten ist, wird gelöscht (das gerade aufgenommene Foto bleibt für die Erkennung erhalten).
    private void deleteOldPhotos() {
        try {
            File dir = getExternalFilesDir(Environment.DIRECTORY_PICTURES);
            File[] files = dir == null ? null : dir.listFiles();
            if (files == null) return;
            long limit = System.currentTimeMillis() - 30L * 60L * 1000L;
            for (File f : files) {
                if (f.isFile() && f.lastModified() < limit) {
                    //noinspection ResultOfMethodCallIgnored
                    f.delete();
                }
            }
        } catch (SecurityException ignored) {
            // nichts zu tun
        }
    }

    private void hardenWebView() {
        if (getBridge() == null || getBridge().getWebView() == null) return;
        WebView webView = getBridge().getWebView();
        webView.setFilterTouchesWhenObscured(true);               // keine Eingaben, wenn ein anderes Fenster darüber liegt
        WebSettings settings = webView.getSettings();
        settings.setAllowFileAccess(false);                       // App-Dateien kommen über https://localhost, kein file://
        settings.setGeolocationEnabled(false);                    // Standort wird nie gebraucht
        settings.setJavaScriptCanOpenWindowsAutomatically(false); // keine Popups
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            settings.setSafeBrowsingEnabled(true);
        }
    }
}
