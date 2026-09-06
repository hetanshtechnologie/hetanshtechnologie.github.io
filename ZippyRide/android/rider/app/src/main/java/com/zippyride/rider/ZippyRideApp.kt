package com.zippyride.rider

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
          CHANNEL_RIDE_STATUS,
          "Ride Status",
          NotificationManager.IMPORTANCE_HIGH
        ).apply { description = "Ride accepted, driver assigned notifications" }
      )
    }
  }

  companion object {
    const val CHANNEL_RIDE_STATUS = "ride_status"
  }
}
