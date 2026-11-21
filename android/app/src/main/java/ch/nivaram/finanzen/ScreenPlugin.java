package ch.nivaram.finanzen;

import android.view.WindowManager;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * Screenshot-Schutz ein- und ausschalten.
 * Standard ist «geschützt» (FLAG_SECURE). Die App erlaubt Screenshots nur auf Wunsch für kurze Zeit
 * und schaltet den Schutz danach und beim Sperren selbst wieder ein.
 */
@CapacitorPlugin(name = "Screen")
public class ScreenPlugin extends Plugin {

    @PluginMethod
    public void setSecure(PluginCall call) {
        final boolean secure = call.getBoolean("secure", Boolean.TRUE);
        getActivity().runOnUiThread(() -> {
            if (secure) {
                getActivity().getWindow().addFlags(WindowManager.LayoutParams.FLAG_SECURE);
            } else {
                getActivity().getWindow().clearFlags(WindowManager.LayoutParams.FLAG_SECURE);
            }
            call.resolve();
        });
    }
}
