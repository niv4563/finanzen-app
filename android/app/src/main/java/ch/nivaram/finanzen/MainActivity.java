package ch.nivaram.finanzen;

import android.os.Build;
import android.os.Bundle;
import android.view.WindowManager;
import android.webkit.WebSettings;
import android.webkit.WebView;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        // Bildschirm schützen: keine Screenshots, keine Bildschirmaufnahme,
        // keine Vorschau der Finanzdaten in der Übersicht «Zuletzt verwendet».
        getWindow().setFlags(WindowManager.LayoutParams.FLAG_SECURE, WindowManager.LayoutParams.FLAG_SECURE);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            getWindow().setHideOverlayWindows(true);              // fremde Overlays ausblenden (Tapjacking)
        }
        super.onCreate(savedInstanceState);
        hardenWebView();
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
