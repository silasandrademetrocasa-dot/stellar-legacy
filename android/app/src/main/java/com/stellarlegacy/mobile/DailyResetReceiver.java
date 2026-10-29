package com.stellarlegacy.mobile;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

/** Recebe o lembrete do Android e rearma o proximo dia apos reinicio/atualizacao. */
public final class DailyResetReceiver extends BroadcastReceiver {
    @Override public void onReceive(Context context, Intent intent) {
        String action = intent == null ? "" : intent.getAction();
        if (DailyResetNotifier.ACTION_DAILY.equals(action)) {
            DailyResetNotifier.onAlarm(context);
        } else if (Intent.ACTION_BOOT_COMPLETED.equals(action)
                || Intent.ACTION_MY_PACKAGE_REPLACED.equals(action)
                || Intent.ACTION_TIME_CHANGED.equals(action)
                || Intent.ACTION_TIMEZONE_CHANGED.equals(action)) {
            DailyResetNotifier.scheduleNext(context);
        }
    }
}
