package com.zippyride.driver.utils

object LocationUtils {
  fun haversineKm(lat1: Double, lng1: Double, lat2: Double, lng2: Double): Double {
    val r = 6371.0
    val dLat = Math.toRadians(lat2 - lat1)
    val dLng = Math.toRadians(lng2 - lng1)
    val a = Math.sin(dLat / 2).pow2() + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2)) * Math.sin(dLng / 2).pow2()
    return r * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  }

  private fun Double.pow2() = this * this
}
