package com.zippyride.driver.fcm

import android.app.PendingIntent
import android.content.Intent
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import com.google.firebase.messaging.FirebaseMessagingService
import com.google.firebase.messaging.RemoteMessage
import com.zippyride.driver.DriverMapActivity
import com.zippyride.driver.R
import com.zippyride.driver.ZippyRideApp
import com.zippyride.driver.network.Supabase
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
          Supabase.postgrest["driver_details"].update(mapOf("fcm_token" to token)) {
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
      "new_ride_request" -> {
        val tripId = data["trip_id"]?.toLongOrNull() ?: return
        showRideRequestNotification(tripId, data["pickup_address"] ?: "New ride request")
      }
      "ride_cancelled" -> {
        val tripId = data["trip_id"] ?: ""
        showNotification("Ride Cancelled", "Trip #$tripId was cancelled by the rider")
      }
    }
  }

  private fun showRideRequestNotification(tripId: Long, address: String) {
    val intent = Intent(this, DriverMapActivity::class.java).apply {
      putExtra("trip_id", tripId)
      flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
    }
    val pendingIntent = PendingIntent.getActivity(
      this, tripId.toInt(), intent,
      PendingIntent.FLAG_UPDATE_CURRENT or
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) PendingIntent.FLAG_IMMUTABLE else 0
    )

    val notification = NotificationCompat.Builder(this, ZippyRideApp.CHANNEL_RIDE_REQUESTS)
      .setSmallIcon(R.drawable.ic_launcher_foreground)
      .setContentTitle("New Ride Request")
      .setContentText(address)
      .setPriority(NotificationCompat.PRIORITY_HIGH)
      .setContentIntent(pendingIntent)
      .setAutoCancel(true)
      .build()

    NotificationManagerCompat.from(this).notify(tripId.toInt(), notification)
  }

  private fun showNotification(title: String, body: String) {
    val notification = NotificationCompat.Builder(this, ZippyRideApp.CHANNEL_RIDE_REQUESTS)
      .setSmallIcon(R.drawable.ic_launcher_foreground)
      .setContentTitle(title)
      .setContentText(body)
      .setPriority(NotificationCompat.PRIORITY_DEFAULT)
      .setAutoCancel(true)
      .build()

    NotificationManagerCompat.from(this).notify(System.currentTimeMillis().toInt(), notification)
  }
}
