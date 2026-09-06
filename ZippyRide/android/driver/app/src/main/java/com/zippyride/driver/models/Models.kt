package com.zippyride.driver.models

data class Profile(
  val id: String = "",
  val name: String? = null,
  val email: String? = null,
  val phone: String? = null,
  val role: String? = null,
  val created_at: String? = null,
)

data class DriverDetails(
  val id: String = "",
  val license_number: String? = null,
  val vehicle_type: String? = null,
  val vehicle_number: String? = null,
  val vehicle_color: String? = null,
  val is_verified: Boolean = false,
  val is_online: Boolean = false,
  val current_lat: Double? = null,
  val current_lng: Double? = null,
  val rating: Double? = null,
  val total_rides: Int = 0,
  val total_earnings: Double = 0.0,
  val bank_account: String? = null,
  val bank_ifsc: String? = null,
  val fcm_token: String? = null,
)

data class Trip(
  val id: Long = 0,
  val rider_id: String? = null,
  val driver_id: String? = null,
  val pickup_lat: Double = 0.0,
  val pickup_lng: Double = 0.0,
  val drop_lat: Double? = null,
  val drop_lng: Double? = null,
  val pickup_address: String? = null,
  val drop_address: String? = null,
  val fare_estimate: Double? = null,
  val fare_final: Double? = null,
  val status: String = "requested",
  val distance_km: Double? = null,
  val duration_min: Int? = null,
  val created_at: String? = null,
)

data class FareRequest(
  val pickup_lat: Double,
  val pickup_lng: Double,
  val drop_lat: Double,
  val drop_lng: Double,
)

data class FareResponse(
  val fare: FareDetail? = null,
)

data class FareDetail(
  val base: Double = 0.0,
  val per_km: Double = 0.0,
  val per_min: Double = 0.0,
  val total: Double = 0.0,
  val distance_km: Double = 0.0,
  val duration_min: Int = 0,
)

data class TripStatusUpdate(
  val trip_id: Long,
  val status: String,
  val driver_id: String? = null,
  val driver_lat: Double? = null,
  val driver_lng: Double? = null,
)
