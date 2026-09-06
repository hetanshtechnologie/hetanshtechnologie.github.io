package com.zippyride.rider

import android.content.Intent
import android.location.Geocoder
import android.os.Bundle
import android.widget.Button
import android.widget.EditText
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
import com.zippyride.rider.models.FareDetail
import com.zippyride.rider.network.ApiService
import com.zippyride.rider.network.Supabase
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.util.Locale

class BookRideActivity : AppCompatActivity(), OnMapReadyCallback {

  private lateinit var map: GoogleMap
  private lateinit var fusedLocationClient: FusedLocationProviderClient
  private var pickupLat = 0.0
  private var pickupLng = 0.0
  private var dropLat: Double? = null
  private var dropLng: Double? = null
  private var pickupMarker: Marker? = null
  private var dropMarker: Marker? = null

  private lateinit var etDropLocation: EditText
  private lateinit var tvFareEstimate: TextView
  private lateinit var btnBookRide: Button
  private lateinit var tvPickupAddress: TextView

  private val scope = CoroutineScope(Dispatchers.IO)

  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    setContentView(R.layout.activity_book_ride)

    fusedLocationClient = LocationServices.getFusedLocationProviderClient(this)

    etDropLocation = findViewById(R.id.et_drop_location)
    tvFareEstimate = findViewById(R.id.tv_fare_estimate)
    btnBookRide = findViewById(R.id.btn_book_ride)
    tvPickupAddress = findViewById(R.id.tv_pickup_address)

    findViewById<Button>(R.id.btn_set_pickup).setOnClickListener { setPickupFromMap() }
    findViewById<Button>(R.id.btn_estimate_fare).setOnClickListener { estimateFare() }
    btnBookRide.setOnClickListener { bookRide() }

    val mapFragment = supportFragmentManager.findFragmentById(R.id.map) as SupportMapFragment
    mapFragment.getMapAsync(this)

    requestPermissions()
  }

  override fun onMapReady(googleMap: GoogleMap) {
    map = googleMap
    map.uiSettings.isZoomControlsEnabled = true
    map.setOnMapClickListener { latLng ->
      if (dropMarker == null) {
        dropMarker?.remove()
        dropMarker = map.addMarker(
          MarkerOptions().position(latLng).title("Drop-off")
            .icon(BitmapDescriptorFactory.defaultMarker(BitmapDescriptorFactory.HUE_RED))
        )
        dropLat = latLng.latitude
        dropLng = latLng.longitude
        updateAddress(latLng, etDropLocation)
      } else {
        pickupMarker?.remove()
        pickupMarker = map.addMarker(
          MarkerOptions().position(latLng).title("Pickup")
            .icon(BitmapDescriptorFactory.defaultMarker(BitmapDescriptorFactory.HUE_GREEN))
        )
        pickupLat = latLng.latitude
        pickupLng = latLng.longitude
        updateAddress(latLng, null)
      }
    }
    enableMyLocation()
  }

  private fun enableMyLocation() {
    if (ActivityCompat.checkSelfPermission(this, android.Manifest.permission.ACCESS_FINE_LOCATION) == android.content.pm.PackageManager.PERMISSION_GRANTED) {
      map.isMyLocationEnabled = true
      fusedLocationClient.lastLocation.addOnSuccessListener { loc ->
        if (loc != null) {
          pickupLat = loc.latitude
          pickupLng = loc.longitude
          val latLng = LatLng(loc.latitude, loc.longitude)
          map.moveCamera(CameraUpdateFactory.newLatLngZoom(latLng, 15f))
          pickupMarker = map.addMarker(
            MarkerOptions().position(latLng).title("You are here")
              .icon(BitmapDescriptorFactory.defaultMarker(BitmapDescriptorFactory.HUE_GREEN))
          )
          updateAddress(latLng, null)
        }
      }
    }
  }

  private fun setPickupFromMap() {
    Toast.makeText(this, "Tap on the map to set pickup location", Toast.LENGTH_SHORT).show()
    dropMarker = null
    dropLat = null
    dropLng = null
  }

  private fun updateAddress(latLng: LatLng, editText: EditText?) {
    try {
      val geocoder = Geocoder(this, Locale.getDefault())
      val addresses = geocoder.getFromLocation(latLng.latitude, latLng.longitude, 1)
      if (!addresses.isNullOrEmpty()) {
        val address = addresses[0].getAddressLine(0)
        if (editText != null) {
          editText.setText(address)
        } else {
          tvPickupAddress.text = "Pickup: $address"
        }
      }
    } catch (_: Exception) {}
  }

  private fun requestPermissions() {
    if (ActivityCompat.checkSelfPermission(this, android.Manifest.permission.ACCESS_FINE_LOCATION) != android.content.pm.PackageManager.PERMISSION_GRANTED) {
      ActivityCompat.requestPermissions(this, arrayOf(android.Manifest.permission.ACCESS_FINE_LOCATION), 100)
    }
  }

  private fun estimateFare() {
    if (dropLat == null || dropLng == null) {
      Toast.makeText(this, "Set drop-off location first", Toast.LENGTH_SHORT).show()
      return
    }

    btnBookRide.isEnabled = false
    tvFareEstimate.text = "Calculating..."

    scope.launch {
      try {
        val result = ApiService.estimateFare(pickupLat, pickupLng, dropLat!!, dropLng!!)
        withContext(Dispatchers.Main) {
          if (result?.fare != null) {
            val f = result.fare
            tvFareEstimate.text = "₹${String.format("%.0f", f.total)} (${String.format("%.1f", f.distance_km)} km, ~${f.duration_min} min)"
            btnBookRide.tag = f.total
            btnBookRide.isEnabled = true
          } else {
            tvFareEstimate.text = "Could not estimate fare"
          }
        }
      } catch (e: Exception) {
        withContext(Dispatchers.Main) {
          tvFareEstimate.text = "Error: ${e.message}"
        }
      }
    }
  }

  private fun bookRide() {
    if (dropLat == null || dropLng == null) {
      Toast.makeText(this, "Set drop-off location", Toast.LENGTH_SHORT).show()
      return
    }

    AlertDialog.Builder(this)
      .setTitle("Confirm Ride")
      .setMessage("Estimated fare: ${tvFareEstimate.text}\nProceed to book?")
      .setPositiveButton("Book Now") { _, _ -> createTrip() }
      .setNegativeButton("Cancel", null)
      .show()
  }

  private fun createTrip() {
    btnBookRide.isEnabled = false
    btnBookRide.text = "Booking..."

    scope.launch {
      try {
        val user = Supabase.auth.currentUserOrNull()
        if (user == null) {
          withContext(Dispatchers.Main) {
            Toast.makeText(this@BookRideActivity, "Please sign in first", Toast.LENGTH_SHORT).show()
          }
          return@launch
        }

        val fare = (btnBookRide.tag as? Double) ?: 0.0
        val dropAddress = etDropLocation.text.trim().toString()
        val pickupAddress = tvPickupAddress.text.removePrefix("Pickup: ")

        val trip = mapOf(
          "rider_id" to user.id,
          "pickup_lat" to pickupLat,
          "pickup_lng" to pickupLng,
          "drop_lat" to dropLat,
          "drop_lng" to dropLng,
          "pickup_address" to pickupAddress,
          "drop_address" to dropAddress,
          "fare_estimate" to fare,
          "status" to "requested",
        )

        val result = Supabase.postgrest["trips"].insert(trip)

        withContext(Dispatchers.Main) {
          Toast.makeText(this@BookRideActivity, "Ride booked! Waiting for driver...", Toast.LENGTH_LONG).show()
          val intent = Intent(this@BookRideActivity, RiderTrackerActivity::class.java)
          intent.putExtra("trip_id", (result.data as? Map<*, *>)?.get("id")?.toString()?.toLongOrNull() ?: 0L)
          startActivity(intent)
        }
      } catch (e: Exception) {
        withContext(Dispatchers.Main) {
          Toast.makeText(this@BookRideActivity, "Error: ${e.message}", Toast.LENGTH_LONG).show()
          btnBookRide.isEnabled = true
          btnBookRide.text = "Book Ride"
        }
      }
    }
  }
}
