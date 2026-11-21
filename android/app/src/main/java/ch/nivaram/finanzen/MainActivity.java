package ch.nivaram.finanzen;

import android.os.Build;
import android.os.Environment;
import android.os.Bundle;
import android.content.res.Configuration;
import android.view.View;
import android.view.WindowInsets;
import android.view.WindowInsetsController;
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
        registerPlugin(ScreenPlugin.class);                      // Screenshots auf Wunsch kurz erlauben
        super.onCreate(savedInstanceState);
        hardenWebView();
        handleSystemBars();
        deleteOldPhotos();
    }

    // Statusleiste oben und Navigationsleiste unten (Android 15+ zeichnet die App darunter):
    // Die Abstände werden der Oberfläche als CSS-Variablen mitgegeben, damit nichts unter den Leisten verschwindet.
    private float[] lastInsets = new float[]{0, 0, 0, 0};

    private void handleSystemBars() {
        if (getBridge() == null || getBridge().getWebView() == null) return;
        final WebView webView = getBridge().getWebView();
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            WindowInsetsController c = getWindow().getInsetsController();
            if (c != null) {
                boolean night = (getResources().getConfiguration().uiMode & Configuration.UI_MODE_NIGHT_MASK) == Configuration.UI_MODE_NIGHT_YES;
                // oben grüne Leiste -> helle Symbole; unten heller Hintergrund -> dunkle Symbole (im Dunkelmodus hell)
                c.setSystemBarsAppearance(0, WindowInsetsController.APPEARANCE_LIGHT_STATUS_BARS);
                c.setSystemBarsAppearance(night ? 0 : WindowInsetsController.APPEARANCE_LIGHT_NAVIGATION_BARS,
                        WindowInsetsController.APPEARANCE_LIGHT_NAVIGATION_BARS);
            }
        }
        webView.setOnApplyWindowInsetsListener((View v, WindowInsets insets) -> {
            float d = getResources().getDisplayMetrics().density;
            int top, bottom, left, right;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                android.graphics.Insets i = insets.getInsets(WindowInsets.Type.systemBars() | WindowInsets.Type.displayCutout());
                top = i.top; bottom = i.bottom; left = i.left; right = i.right;
            } else {
                top = insets.getSystemWindowInsetTop(); bottom = insets.getSystemWindowInsetBottom();
                left = insets.getSystemWindowInsetLeft(); right = insets.getSystemWindowInsetRight();
            }
            lastInsets = new float[]{top / d, right / d, bottom / d, left / d};
            pushInsets(webView);
            return v.onApplyWindowInsets(insets);
        });
        webView.requestApplyInsets();
        // nach dem Laden der Seite nochmals setzen (die Seite ist beim ersten Mal evtl. noch nicht da)
        for (int ms : new int[]{400, 1200, 3000}) webView.postDelayed(() -> pushInsets(webView), ms);
    }

    private void pushInsets(WebView webView) {
        float[] i = lastInsets;
        String js = "(function(){var s=document.documentElement.style;"
                + "s.setProperty('--sat','" + i[0] + "px');s.setProperty('--sar','" + i[1] + "px');"
                + "s.setProperty('--sab','" + i[2] + "px');s.setProperty('--sal','" + i[3] + "px');})();";
        webView.evaluateJavascript(js, null);
    }

    @Override
    public void onResume() {
        super.onResume();
        deleteOldPhotos();
        if (getBridge() != null && getBridge().getWebView() != null) getBridge().getWebView().requestApplyInsets();
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
