package com.zippyride.driver

import android.content.Intent
import android.os.Build
import android.os.Bundle
import android.widget.Button
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AlertDialog
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
import com.zippyride.driver.models.Trip
import com.zippyride.driver.network.ApiService
import com.zippyride.driver.network.Supabase
import io.github.jan.supabase.postgrest.query.Order
import io.github.jan.supabase.realtime.RealtimeJoin
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import org.json.JSONObject

class DriverMapActivity : AppCompatActivity(), OnMapReadyCallback {

  private lateinit var map: GoogleMap
  private lateinit var fusedLocationClient: FusedLocationProviderClient
  private var isOnline = false
  private var currentTrip: Trip? = null
  private var pickupMarker: Marker? = null
  private var dropMarker: Marker? = null
  private var driverMarker: Marker? = null

  private lateinit var btnToggleOnline: Button
  private lateinit var tvStatus: TextView
  private lateinit var tvRideInfo: TextView

  private val scope = CoroutineScope(Dispatchers.IO)

  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    setContentView(R.layout.activity_driver_map)

    fusedLocationClient = LocationServices.getFusedLocationProviderClient(this)

    btnToggleOnline = findViewById(R.id.btn_toggle_online)
    tvStatus = findViewById(R.id.tv_status)
    tvRideInfo = findViewById(R.id.tv_ride_info)

    btnToggleOnline.setOnClickListener { toggleOnline() }

    val mapFragment = supportFragmentManager.findFragmentById(R.id.map) as SupportMapFragment
    mapFragment.getMapAsync(this)

    requestPermissions()
    listenForRideRequests()
  }

  override fun onMapReady(googleMap: GoogleMap) {
    map = googleMap
    map.uiSettings.isZoomControlsEnabled = true
    enableMyLocation()
  }

  private fun enableMyLocation() {
    if (ActivityCompat.checkSelfPermission(this, android.Manifest.permission.ACCESS_FINE_LOCATION) == android.content.pm.PackageManager.PERMISSION_GRANTED) {
      map.isMyLocationEnabled = true
      fusedLocationClient.lastLocation.addOnSuccessListener { loc ->
        if (loc != null) {
          val latLng = LatLng(loc.latitude, loc.longitude)
          map.moveCamera(CameraUpdateFactory.newLatLngZoom(latLng, 15f))
        }
      }
    }
  }

  private fun requestPermissions() {
    val perms = mutableListOf<String>()
    if (ActivityCompat.checkSelfPermission(this, android.Manifest.permission.ACCESS_FINE_LOCATION) != android.content.pm.PackageManager.PERMISSION_GRANTED)
      perms.add(android.Manifest.permission.ACCESS_FINE_LOCATION)
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
      if (ActivityCompat.checkSelfPermission(this, android.Manifest.permission.POST_NOTIFICATIONS) != android.content.pm.PackageManager.PERMISSION_GRANTED)
        perms.add(android.Manifest.permission.POST_NOTIFICATIONS)
    }
    if (perms.isNotEmpty()) {
      ActivityCompat.requestPermissions(this, perms.toTypedArray(), 100)
    }
  }

  private fun toggleOnline() {
    if (!isOnline) {
      startService(Intent(this, RideRequestService::class.java))
      updateOnlineStatus(true)
    } else {
      stopService(Intent(this, RideRequestService::class.java))
      updateOnlineStatus(false)
    }
  }

  private fun updateOnlineStatus(online: Boolean) {
    isOnline = online
    scope.launch {
      try {
        val user = Supabase.auth.currentUserOrNull() ?: return@launch
        Supabase.postgrest["driver_details"].update(mapOf("is_online" to online)) { eq("id", user.id) }
        withContext(Dispatchers.Main) {
          btnToggleOnline.text = if (online) "Go Offline" else "Go Online"
          tvStatus.text = if (online) "You are ONLINE" else "You are OFFLINE"
        }
      } catch (_: Exception) {}
    }
  }

  private fun listenForRideRequests() {
    scope.launch {
      try {
        Supabase.realtime.join(
          RealtimeJoin(
            channel = "trip-requests",
            table = "trips",
            schema = "public",
            filter = "status=eq.requested"
          )
        ) { _, msg ->
          val record = msg.records.firstOrNull() ?: return@join
          val trip = Trip(
            id = (record["id"] as? Number)?.toLong() ?: return@join,
            rider_id = record["rider_id"] as? String,
            pickup_lat = (record["pickup_lat"] as? Number)?.toDouble() ?: 0.0,
            pickup_lng = (record["pickup_lng"] as? Number)?.toDouble() ?: 0.0,
            drop_lat = (record["drop_lat"] as? Number)?.toDouble(),
            drop_lng = (record["drop_lng"] as? Number)?.toDouble(),
            pickup_address = record["pickup_address"] as? String,
            drop_address = record["drop_address"] as? String,
            fare_estimate = (record["fare_estimate"] as? Number)?.toDouble(),
            status = record["status"] as? String ?: "requested",
          )
          withContext(Dispatchers.Main) { showRideRequest(trip) }
        }
      } catch (_: Exception) {}
    }
  }

  private fun showRideRequest(trip: Trip) {
    pickupMarker?.remove()
    pickupMarker = map.addMarker(
      MarkerOptions().position(LatLng(trip.pickup_lat, trip.pickup_lng))
        .title("Pickup: ${trip.pickup_address ?: "Unknown"}")
        .icon(BitmapDescriptorFactory.defaultMarker(BitmapDescriptorFactory.HUE_GREEN))
    )

    AlertDialog.Builder(this)
      .setTitle("New Ride Request")
      .setMessage("Pickup: ${trip.pickup_address ?: "Unknown"}\nFare: ₹${String.format("%.2f", trip.fare_estimate ?: 0.0)}")
      .setPositiveButton("Accept") { _, _ -> acceptTrip(trip) }
      .setNegativeButton("Decline") { _, _ -> declineTrip(trip) }
      .show()
  }

  private fun acceptTrip(trip: Trip) {
    currentTrip = trip
    scope.launch {
      try {
        val user = Supabase.auth.currentUserOrNull()
        Supabase.postgrest["trips"].update(
          mapOf("status" to "accepted", "driver_id" to (user?.id ?: ""))
        ) { eq("id", trip.id) }
        withContext(Dispatchers.Main) {
          tvRideInfo.text = "Ride accepted — heading to ${trip.pickup_address ?: "pickup"}"
          Toast.makeText(this@DriverMapActivity, "Ride accepted!", Toast.LENGTH_SHORT).show()
          startNavigationTo(trip.pickup_lat, trip.pickup_lng)
        }
      } catch (e: Exception) {
        withContext(Dispatchers.Main) {
          Toast.makeText(this@DriverMapActivity, "Error: ${e.message}", Toast.LENGTH_LONG).show()
        }
      }
    }
  }

  private fun declineTrip(trip: Trip) {
    scope.launch {
      try {
        Supabase.postgrest["trips"].update(mapOf("status" to "requested", "driver_id" to null)) { eq("id", trip.id) }
      } catch (_: Exception) {}
    }
  }

  private fun startNavigationTo(lat: Double, lng: Double) {
    val uri = "google.navigation:q=$lat,$lng"
    val intent = Intent(Intent.ACTION_VIEW, android.net.Uri.parse(uri))
    intent.setPackage("com.google.android.apps.maps")
    startActivity(intent)
  }

  override fun onDestroy() {
    super.onDestroy()
    Supabase.realtime.leave("trip-requests")
  }
}
