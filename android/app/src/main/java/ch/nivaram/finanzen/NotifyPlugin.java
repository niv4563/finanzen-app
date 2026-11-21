package ch.nivaram.finanzen;

import android.Manifest;
import android.app.AlarmManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;
import org.json.JSONObject;

/**
 * Mitteilungen aufs Handy (fällige Rechnungen, geplante Zahlungen, Warnungen).
 *
 * Eigener Code, keine Fremdbibliothek, kein Push-Server: Die App plant die Mitteilungen selbst
 * mit dem Android-Wecker (AlarmManager). Es geht nichts ins Internet. Gespeichert werden nur die
 * Nummern der geplanten Mitteilungen, damit sie beim nächsten Planen ersetzt werden können.
 * Auf dem Sperrbildschirm zeigt Android nur «Finanzen – Neuer Hinweis» (VISIBILITY_PRIVATE).
 */
@CapacitorPlugin(
    name = "Notify",
    permissions = { @Permission(strings = { Manifest.permission.POST_NOTIFICATIONS }, alias = "notify") }
)
public class NotifyPlugin extends Plugin {

    private static final String PREFS = "finanzen_notify";
    private static final String IDS = "ids";

    @PluginMethod
    public void enable(PluginCall call) {
        if (Build.VERSION.SDK_INT >= 33 && getPermissionState("notify") != PermissionState.GRANTED) {
            requestPermissionForAlias("notify", call, "permissionDone");
            return;
        }
        JSObject r = new JSObject();
        r.put("granted", true);
        call.resolve(r);
    }

    @PermissionCallback
    private void permissionDone(PluginCall call) {
        JSObject r = new JSObject();
        r.put("granted", getPermissionState("notify") == PermissionState.GRANTED);
        call.resolve(r);
    }

    @PluginMethod
    public void schedule(PluginCall call) {
        Context ctx = getContext();
        AlarmManager am = (AlarmManager) ctx.getSystemService(Context.ALARM_SERVICE);
        if (am == null) {
            call.reject("Wecker nicht verfügbar");
            return;
        }
        SharedPreferences prefs = ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        // alte Mitteilungen entfernen
        String old = prefs.getString(IDS, "");
        if (old != null && !old.isEmpty()) {
            for (String s : old.split(",")) {
                try {
                    int id = Integer.parseInt(s.trim());
                    PendingIntent pi = PendingIntent.getBroadcast(ctx, id, new Intent(ctx, NotifyReceiver.class),
                            PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_NO_CREATE);
                    if (pi != null) {
                        am.cancel(pi);
                        pi.cancel();
                    }
                } catch (NumberFormatException ignored) {
                    // nichts zu tun
                }
            }
        }
        StringBuilder ids = new StringBuilder();
        JSArray items = call.getArray("items");
        long now = System.currentTimeMillis();
        int count = 0;
        if (items != null) {
            for (int i = 0; i < items.length() && count < 60; i++) {
                try {
                    JSONObject o = items.getJSONObject(i);
                    int id = o.getInt("id");
                    long at = o.getLong("at");
                    if (at <= now) continue;
                    Intent intent = new Intent(ctx, NotifyReceiver.class);
                    intent.putExtra("id", id);
                    intent.putExtra("title", limit(o.optString("title", "Finanzen"), 80));
                    intent.putExtra("text", limit(o.optString("text", ""), 240));
                    PendingIntent pi = PendingIntent.getBroadcast(ctx, id, intent,
                            PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT);
                    am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, at, pi);
                    if (ids.length() > 0) ids.append(',');
                    ids.append(id);
                    count++;
                } catch (Exception ignored) {
                    // fehlerhafter Eintrag – überspringen
                }
            }
        }
        prefs.edit().putString(IDS, ids.toString()).apply();
        JSObject r = new JSObject();
        r.put("scheduled", count);
        call.resolve(r);
    }

    private static String limit(String s, int n) {
        if (s == null) return "";
        return s.length() > n ? s.substring(0, n) : s;
    }
}
