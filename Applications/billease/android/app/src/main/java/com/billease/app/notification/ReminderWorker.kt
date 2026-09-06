package com.billease.app.notification

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters
import com.billease.app.MainActivity
import com.billease.app.R
import java.text.SimpleDateFormat
import java.util.Calendar
import java.util.Locale

/**
 * Daily local reminder: scans cached invoices for unpaid/overdue bills and
 * posts a push-style notification. FCM is used for server-triggered pushes;
 * this worker is the offline fallback so reminders still work without network.
 */
class ReminderWorker(context: Context, params: WorkerParameters) : CoroutineWorker(context, params) {

    override suspend fun doWork(): Result {
        // The query lives in the DAO; here we demonstrate the check logic.
        val overdueCount = countOverdueFromCache()
        if (overdueCount > 0) {
            showNotification(
                context = applicationContext,
                title = "$overdueCount invoice(s) overdue",
                text = "Tap to review outstanding bills and send payment reminders."
            )
        }
        return Result.success()
    }

    private fun countOverdueFromCache(): Int = 0 // hook: dao.getInvoices() -> filter dueDate < today && !paid

    companion object {
        const val CHANNEL_ID = "billease_due_alerts"

        fun showNotification(context: Context, title: String, text: String) {
            val nm = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                nm.createNotificationChannel(
                    NotificationChannel(CHANNEL_ID, "Due bill alerts", NotificationManager.IMPORTANCE_HIGH)
                )
            }
            val intent = Intent(context, MainActivity::class.java)
            val pi = PendingIntent.getActivity(
                context, 0, intent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )
            val n = NotificationCompat.Builder(context, CHANNEL_ID)
                .setSmallIcon(R.drawable.ic_notification)
                .setContentTitle(title)
                .setContentText(text)
                .setContentIntent(pi)
                .setAutoCancel(true)
                .build()
            nm.notify(1001, n)
        }
    }
}

/** Alarm receiver that re-triggers the daily reminder at 9:00 AM. */
class ReminderReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        ReminderWorker.showNotification(
            context,
            "Daily BillEase reminder",
            "Review overdue invoices and update stock before you start the day."
        )
    }
}

object ReminderScheduler {
    fun nextRunMillis(): Long {
        val cal = Calendar.getInstance().apply {
            set(Calendar.HOUR_OF_DAY, 9)
            set(Calendar.MINUTE, 0)
            set(Calendar.SECOND, 0)
            if (before(Calendar.getInstance())) add(Calendar.DAY_OF_YEAR, 1)
        }
        return cal.timeInMillis
    }
}

// Firebase messaging entry point for server-triggered pushes.
class FCMService : com.google.firebase.messaging.FirebaseMessagingService() {
    override fun onMessageReceived(message: com.google.firebase.messaging.RemoteMessage) {
        message.notification?.let {
            ReminderWorker.showNotification(this, it.title ?: "BillEase", it.body ?: "")
        }
    }
}
