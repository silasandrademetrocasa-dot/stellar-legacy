package com.stellarlegacy.mobile;

import android.Manifest;
import android.app.AlarmManager;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.os.Build;

import java.text.SimpleDateFormat;
import java.util.Calendar;
import java.util.Date;
import java.util.Locale;
import java.util.TimeZone;

/**
 * V108: lembrete LOCAL (sem push, sem HTTP e sem alterar a economia).
 * O servidor continua responsavel por decidir se a Arena e as missoes foram renovadas.
 * AlarmManager inexact permite que o Android atrase alguns minutos por bateria/Doze.
 */
public final class DailyResetNotifier {
    static final String ACTION_DAILY = "com.stellarlegacy.mobile.DAILY_RESET_REMINDER";
    private static final String PREFS = "stellar_daily_alerts_v108";
    private static final String ENABLED = "enabled";
    private static final String REQUESTED = "permission_requested";
    private static final String LAST_DAY = "last_notified_day";
    private static final String CHANNEL = "stellar_daily_reset_v108";
    private static final int ALARM_ID = 10800;
    private static final int NOTIFICATION_ID = 10801;
    private static final TimeZone SAO_PAULO = TimeZone.getTimeZone("America/Sao_Paulo");

    private DailyResetNotifier() { }
    private static SharedPreferences prefs(Context ctx) {
        return ctx.getApplicationContext().getSharedPreferences(PREFS, Context.MODE_PRIVATE);
    }
    static boolean enabled(Context ctx) {
        return prefs(ctx).getBoolean(ENABLED, false);
    }
    static boolean notificationsAllowed(Context ctx) {
        if (Build.VERSION.SDK_INT >= 33 && ctx.checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) return false;
        NotificationManager nm = (NotificationManager) ctx.getSystemService(Context.NOTIFICATION_SERVICE);
        return nm != null && nm.areNotificationsEnabled();
    }
    static void createChannel(Context ctx) {
        NotificationManager nm = (NotificationManager) ctx.getSystemService(Context.NOTIFICATION_SERVICE);
        if (nm == null) return;
        NotificationChannel channel = new NotificationChannel(CHANNEL, "Lembretes diarios - Stellar Legacy", NotificationManager.IMPORTANCE_DEFAULT);
        channel.setDescription("Aviso opcional de novo dia, missoes diarias e Arena.");
        nm.createNotificationChannel(channel);
    }
    static long nextMidnightBrt() {
        Calendar time = Calendar.getInstance(SAO_PAULO);
        time.set(Calendar.HOUR_OF_DAY, 0);
        time.set(Calendar.MINUTE, 0);
        time.set(Calendar.SECOND, 0);
        time.set(Calendar.MILLISECOND, 0);
        if (time.getTimeInMillis() <= System.currentTimeMillis()) time.add(Calendar.DAY_OF_MONTH, 1);
        return time.getTimeInMillis();
    }
    private static String dateKeyBrt(long millis) {
        SimpleDateFormat fmt = new SimpleDateFormat("yyyy-MM-dd", Locale.US);
        fmt.setTimeZone(SAO_PAULO);
        return fmt.format(new Date(millis));
    }
    private static PendingIntent alarmIntent(Context ctx) {
        Intent intent = new Intent(ctx, DailyResetReceiver.class).setAction(ACTION_DAILY);
        return PendingIntent.getBroadcast(ctx, ALARM_ID, intent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }
    static void markRequested(Context ctx) {
        prefs(ctx).edit().putBoolean(REQUESTED, true).apply();
    }
    static synchronized void setEnabled(Context ctx, boolean enable) {
        prefs(ctx).edit().putBoolean(ENABLED, enable).putBoolean(REQUESTED, enable).apply();
        scheduleNext(ctx);
    }
    static synchronized void scheduleNext(Context ctx) {
        AlarmManager manager = (AlarmManager) ctx.getSystemService(Context.ALARM_SERVICE);
        if (manager == null) return;
        PendingIntent operation = alarmIntent(ctx);
        manager.cancel(operation); // evita alarmes acumulados depois de reboot/update
        if (!enabled(ctx) || !notificationsAllowed(ctx)) return;
        manager.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, nextMidnightBrt(), operation);
    }
    static String state(Context ctx) {
        if (prefs(ctx).getBoolean(REQUESTED, false) && !notificationsAllowed(ctx)) return "permission_denied";
        if (!enabled(ctx)) return "disabled";
        return notificationsAllowed(ctx) ? "enabled" : "permission_denied";
    }
    static void deliver(Context ctx, boolean isTest) {
        if (!enabled(ctx) || !notificationsAllowed(ctx)) return;
        createChannel(ctx);
        long now = System.currentTimeMillis();
        if (!isTest) {
            // Não entregar notificações muito atrasadas (ex.: celular desligado até de tarde).
            Calendar clock = Calendar.getInstance(SAO_PAULO);
            int hour = clock.get(Calendar.HOUR_OF_DAY);
            if (hour >= 6) return;
            String day = dateKeyBrt(now);
            if (day.equals(prefs(ctx).getString(LAST_DAY, ""))) return;
            // Persistir o dia ANTES do envio previne repetição em broadcasts duplicados.
            if (!prefs(ctx).edit().putString(LAST_DAY, day).commit()) return;
        }
        Intent open = new Intent(ctx, MainActivity.class);
        open.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        PendingIntent tap = PendingIntent.getActivity(ctx, 10802, open, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        String title = isTest ? "🚀 Teste de notificacao • Stellar Legacy" : "🌌 Novo dia no Stellar Legacy!";
        String message = isTest ? "Tudo pronto! O lembrete diario esta configurado neste APK." : "As missoes diarias e 10 batalhas da Arena renovam a cada dia. Confira suas recompensas!";
        Notification note = new Notification.Builder(ctx, CHANNEL)
            .setSmallIcon(R.drawable.ic_stellar_notification)
            .setContentTitle(title)
            .setContentText(message)
            .setStyle(new Notification.BigTextStyle().bigText(message))
            .setAutoCancel(true)
            .setShowWhen(true)
            .setOnlyAlertOnce(true)
            .setContentIntent(tap)
            .setVisibility(Notification.VISIBILITY_PRIVATE)
            .build();
        NotificationManager nm = (NotificationManager) ctx.getSystemService(Context.NOTIFICATION_SERVICE);
        if (nm != null) nm.notify(isTest ? NOTIFICATION_ID+1 : NOTIFICATION_ID, note);
    }
    static void onAlarm(Context ctx) {
        try { deliver(ctx, false); }
        finally { scheduleNext(ctx); }
    }
}
