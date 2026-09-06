package com.zippyride.driver

import android.app.Notification
import android.app.PendingIntent
import android.app.Service
import android.content.Intent
import android.location.Location
import android.os.Build
import android.os.IBinder
import android.os.Looper
import androidx.core.app.NotificationCompat
import com.google.android.gms.location.FusedLocationProviderClient
import com.google.android.gms.location.LocationCallback
import com.google.android.gms.location.LocationRequest
import com.google.android.gms.location.LocationResult
import com.google.android.gms.location.LocationServices
import com.google.android.gms.location.Priority
import com.zippyride.driver.network.Supabase
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch

class RideRequestService : Service() {
  private lateinit var fusedLocationClient: FusedLocationProviderClient
  private var isRunning = false

  private val locationCallback = object : LocationCallback() {
    override fun onLocationResult(result: LocationResult) {
      result.lastLocation?.let { updateDriverLocation(it) }
    }
  }

  override fun onCreate() {
    super.onCreate()
    fusedLocationClient = LocationServices.getFusedLocationProviderClient(this)
  }

  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    if (isRunning) return START_STICKY
    isRunning = true

    val notificationIntent = Intent(this, DriverMapActivity::class.java)
    val pendingIntent = PendingIntent.getActivity(
      this, 0, notificationIntent,
      PendingIntent.FLAG_UPDATE_CURRENT or
        (if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) PendingIntent.FLAG_IMMUTABLE else 0)
    )

    val notification: Notification = NotificationCompat.Builder(this, ZippyRideApp.CHANNEL_LOCATION)
      .setContentTitle("ZippyRide Driver")
      .setContentText("Online and sharing location")
      .setSmallIcon(R.drawable.ic_launcher_foreground)
      .setContentIntent(pendingIntent)
      .setOngoing(true)
      .build()

    startForeground(NOTIFICATION_ID, notification)
    startLocationUpdates()
    return START_STICKY
  }

  private fun startLocationUpdates() {
    val request = LocationRequest.Builder(Priority.PRIORITY_HIGH_ACCURACY, UPDATE_INTERVAL)
      .setMinUpdateInterval(FASTEST_INTERVAL)
      .build()

    try {
      fusedLocationClient.requestLocationUpdates(request, locationCallback, Looper.getMainLooper())
    } catch (_: SecurityException) {}
  }

  private fun updateDriverLocation(location: Location) {
    CoroutineScope(Dispatchers.IO).launch {
      try {
        val user = Supabase.auth.currentUserOrNull() ?: return@launch
        Supabase.postgrest["driver_details"].update(
          mapOf("current_lat" to location.latitude, "current_lng" to location.longitude)
        ) { eq("id", user.id) }
      } catch (_: Exception) {}
    }
  }

  override fun onBind(intent: Intent?): IBinder? = null

  override fun onDestroy() {
    super.onDestroy()
    isRunning = false
    fusedLocationClient.removeLocationUpdates(locationCallback)
  }

  companion object {
    private const val NOTIFICATION_ID = 1001
    private const val UPDATE_INTERVAL = 10000L
    private const val FASTEST_INTERVAL = 5000L
  }
}
