package com.zippyride.driver

import android.app.Application
import android.app.NotificationChannel
import android.app.NotificationManager
import android.os.Build

class ZippyRideApp : Application() {
  override fun onCreate() {
    super.onCreate()
    createNotificationChannels()
  }

  private fun createNotificationChannels() {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      val nm = getSystemService(NotificationManager::class.java)

      nm.createNotificationChannel(
        NotificationChannel(
          CHANNEL_RIDE_REQUESTS,
          "Ride Requests",
          NotificationManager.IMPORTANCE_HIGH
        ).apply { description = "New ride request alerts" }
      )

      nm.createNotificationChannel(
        NotificationChannel(
          CHANNEL_LOCATION,
          "Location Service",
          NotificationManager.IMPORTANCE_LOW
        ).apply { description = "Location sharing for active rides" }
      )
    }
  }

  companion object {
    const val CHANNEL_RIDE_REQUESTS = "ride_requests"
    const val CHANNEL_LOCATION = "location_service"
  }
}
