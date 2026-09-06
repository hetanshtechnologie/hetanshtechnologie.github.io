package com.zippyride.rider

import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.widget.Button
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.core.app.ActivityCompat
import com.google.android.gms.location.FusedLocationProviderClient
import com.google.android.gms.location.LocationServices
import com.google.android.gms.maps.CameraUpdateFactory
import com.google.android.gms.maps.GoogleMap
import com.google.android.gms.maps.OnMapReadyCallback
import com.google.android.gms.maps.SupportMapFragment
import com.google.android.gms.maps.model.BitmapDescriptorFactory
import com.google.android.gms.maps.model.LatLng
import com.google.android.gms.maps.model.Marker
import com.google.android.gms.maps.model.MarkerOptions
import com.zippyride.rider.network.Supabase
import io.github.jan.supabase.postgrest.query.Order
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

class RiderTrackerActivity : AppCompatActivity(), OnMapReadyCallback {

  private lateinit var map: GoogleMap
  private lateinit var fusedLocationClient: FusedLocationProviderClient
  private var tripId: Long = 0
  private var driverMarker: Marker? = null
  private var pickupMarker: Marker? = null
  private var dropMarker: Marker? = null
  private var isTracking = true

  private lateinit var tvStatus: TextView
  private lateinit var tvDriverInfo: TextView
  private lateinit var btnCancelRide: Button

  private val scope = CoroutineScope(Dispatchers.IO)

  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    setContentView(R.layout.activity_rider_tracker)

    tripId = intent.getLongExtra("trip_id", 0L)
    if (tripId == 0L) {
      Toast.makeText(this, "Invalid trip", Toast.LENGTH_SHORT).show()
      finish()
      return
    }

    fusedLocationClient = LocationServices.getFusedLocationProviderClient(this)

    tvStatus = findViewById(R.id.tv_tracker_status)
    tvDriverInfo = findViewById(R.id.tv_driver_info)
    btnCancelRide = findViewById(R.id.btn_cancel_ride)
    btnCancelRide.setOnClickListener { cancelRide() }

    val mapFragment = supportFragmentManager.findFragmentById(R.id.map_tracker) as SupportMapFragment
    mapFragment.getMapAsync(this)

    startTracking()
  }

  override fun onMapReady(googleMap: GoogleMap) {
    map = googleMap
    map.uiSettings.isZoomControlsEnabled = true
    enableMyLocation()
  }

  private fun enableMyLocation() {
    if (ActivityCompat.checkSelfPermission(this, android.Manifest.permission.ACCESS_FINE_LOCATION) == android.content.pm.PackageManager.PERMISSION_GRANTED) {
      map.isMyLocationEnabled = true
    }
  }

  private fun startTracking() {
    scope.launch {
      while (isTracking) {
        try {
          val result = Supabase.postgrest["trips"].select {
            eq("id", tripId)
            single()
          }
          val trip = result.data as? Map<*, *> ?: break
          val status = trip["status"] as? String ?: ""

          withContext(Dispatchers.Main) {
            when (status) {
              "accepted", "in_progress" -> {
                tvStatus.text = if (status == "accepted") "Driver is on the way!" else "En route to destination"
                btnCancelRide.isEnabled = status == "accepted"
              }
              "completed" -> {
                tvStatus.text = "Ride completed!"
                btnCancelRide.isEnabled = false
                isTracking = false
              }
              "cancelled" -> {
                tvStatus.text = "Ride cancelled"
                btnCancelRide.isEnabled = false
                isTracking = false
              }
              else -> {
                tvStatus.text = "Finding a driver..."
              }
            }
          }

          // Update driver marker
          val driverId = trip["driver_id"] as? String
          if (driverId != null) {
            val driverResult = Supabase.postgrest["driver_details"].select {
              eq("id", driverId)
              single()
            }
            val driver = driverResult.data as? Map<*, *>
            val dLat = (driver?.get("current_lat") as? Number)?.toDouble()
            val dLng = (driver?.get("current_lng") as? Number)?.toDouble()

            if (dLat != null && dLng != null) {
              val driverLatLng = LatLng(dLat, dLng)
              withContext(Dispatchers.Main) {
                driverMarker?.remove()
                driverMarker = map.addMarker(
                  MarkerOptions().position(driverLatLng)
                    .title("Driver")
                    .icon(BitmapDescriptorFactory.defaultMarker(BitmapDescriptorFactory.HUE_BLUE))
                )
                map.animateCamera(CameraUpdateFactory.newLatLngZoom(driverLatLng, 14f))
              }
            }

            val driverName = driver?.let {
              val profile = Supabase.postgrest["profiles"].select { eq("id", driverId) }
              (profile.data as? Map<*, *>)?.get("name") as? String
            }
            withContext(Dispatchers.Main) {
              tvDriverInfo.text = "Driver: ${driverName ?: "Assigned"}"
            }
          }

          // Show pickup/drop markers
          val pLat = (trip["pickup_lat"] as? Number)?.toDouble()
          val pLng = (trip["pickup_lng"] as? Number)?.toDouble()
          val dLat2 = (trip["drop_lat"] as? Number)?.toDouble()
          val dLng2 = (trip["drop_lng"] as? Number)?.toDouble()

          withContext(Dispatchers.Main) {
            if (pLat != null && pLng != null && pickupMarker == null) {
              pickupMarker = map.addMarker(
                MarkerOptions().position(LatLng(pLat, pLng)).title("Pickup")
                  .icon(BitmapDescriptorFactory.defaultMarker(BitmapDescriptorFactory.HUE_GREEN))
              )
            }
            if (dLat2 != null && dLng2 != null && dropMarker == null) {
              dropMarker = map.addMarker(
                MarkerOptions().position(LatLng(dLat2, dLng2)).title("Drop-off")
                  .icon(BitmapDescriptorFactory.defaultMarker(BitmapDescriptorFactory.HUE_RED))
              )
            }
          }

          delay(5000)
        } catch (_: Exception) {
          delay(10000)
        }
      }
    }
  }

  private fun cancelRide() {
    scope.launch {
      try {
        Supabase.postgrest["trips"].update(mapOf("status" to "cancelled")) { eq("id", tripId) }
        withContext(Dispatchers.Main) {
          Toast.makeText(this@RiderTrackerActivity, "Ride cancelled", Toast.LENGTH_SHORT).show()
          finish()
        }
      } catch (e: Exception) {
        withContext(Dispatchers.Main) {
          Toast.makeText(this@RiderTrackerActivity, "Error: ${e.message}", Toast.LENGTH_LONG).show()
        }
      }
    }
  }

  override fun onDestroy() {
    super.onDestroy()
    isTracking = false
  }
}
