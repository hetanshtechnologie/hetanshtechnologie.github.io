package com.zippyride.rider.fcm

import android.app.PendingIntent
import android.content.Intent
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import com.google.firebase.messaging.FirebaseMessagingService
import com.google.firebase.messaging.RemoteMessage
import com.zippyride.rider.MainActivity
import com.zippyride.rider.R
import com.zippyride.rider.RiderTrackerActivity
import com.zippyride.rider.ZippyRideApp
import com.zippyride.rider.network.Supabase
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch

class ZippyFirebaseMessagingService : FirebaseMessagingService() {

  override fun onNewToken(token: String) {
    super.onNewToken(token)
    CoroutineScope(Dispatchers.IO).launch {
      try {
        val user = Supabase.auth.currentUserOrNull()
        if (user != null) {
          Supabase.postgrest["rider_details"].update(mapOf("fcm_token" to token)) {
            eq("id", user.id)
          }
        }
      } catch (_: Exception) {}
    }
  }

  override fun onMessageReceived(message: RemoteMessage) {
    super.onMessageReceived(message)
    val data = message.data

    when (data["type"]) {
      "driver_accepted" -> {
        val tripId = data["trip_id"]?.toLongOrNull() ?: return
        val intent = Intent(this, RiderTrackerActivity::class.java).apply {
          putExtra("trip_id", tripId)
          flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
        }
        val pendingIntent = PendingIntent.getActivity(
          this, tripId.toInt(), intent,
          PendingIntent.FLAG_UPDATE_CURRENT or
            (if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) PendingIntent.FLAG_IMMUTABLE else 0)
        )

        val notification = NotificationCompat.Builder(this, ZippyRideApp.CHANNEL_RIDE_STATUS)
          .setSmallIcon(R.drawable.ic_launcher_foreground)
          .setContentTitle("Driver Assigned!")
          .setContentText("Your driver is on the way")
          .setPriority(NotificationCompat.PRIORITY_HIGH)
          .setContentIntent(pendingIntent)
          .setAutoCancel(true)
          .build()

        NotificationManagerCompat.from(this).notify(tripId.toInt(), notification)
      }
      "ride_completed" -> {
        showNotification("Ride Complete", "Thank you for riding with ZippyRide!")
      }
      "ride_cancelled" -> {
        showNotification("Ride Cancelled", "Your ride has been cancelled")
      }
    }
  }

  private fun showNotification(title: String, body: String) {
    val intent = Intent(this, MainActivity::class.java).apply {
      flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
    }
    val pendingIntent = PendingIntent.getActivity(
      this, 0, intent,
      PendingIntent.FLAG_UPDATE_CURRENT or
        (if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) PendingIntent.FLAG_IMMUTABLE else 0)
    )

    val notification = NotificationCompat.Builder(this, ZippyRideApp.CHANNEL_RIDE_STATUS)
      .setSmallIcon(R.drawable.ic_launcher_foreground)
      .setContentTitle(title)
      .setContentText(body)
      .setPriority(NotificationCompat.PRIORITY_DEFAULT)
      .setContentIntent(pendingIntent)
      .setAutoCancel(true)
      .build()

    NotificationManagerCompat.from(this).notify(System.currentTimeMillis().toInt(), notification)
  }
}
