package com.zippyride.rider.network

import com.google.gson.Gson
import com.zippyride.rider.BuildConfig
import com.zippyride.rider.models.FareRequest
import com.zippyride.rider.models.FareResponse
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.io.OutputStreamWriter
import java.net.HttpURLConnection
import java.net.URL

object ApiService {
  private val gson = Gson()
  private val functionBase = "${BuildConfig.SUPABASE_URL}/functions/v1"

  private suspend fun postFunction(path: String, body: Any): String? = withContext(Dispatchers.IO) {
    try {
      val url = URL("$functionBase/$path")
      val conn = url.openConnection() as HttpURLConnection
      conn.requestMethod = "POST"
      conn.setRequestProperty("Content-Type", "application/json")
      conn.setRequestProperty("Authorization", "Bearer ${BuildConfig.SUPABASE_ANON_KEY}")
      conn.doOutput = true
      conn.connectTimeout = 15000
      conn.readTimeout = 15000

      OutputStreamWriter(conn.outputStream).use { it.write(gson.toJson(body)) }

      if (conn.responseCode in 200..299) {
        conn.inputStream.bufferedReader().readText()
      } else {
        conn.errorStream?.bufferedReader()?.readText() ?: "Error ${conn.responseCode}"
      }
    } catch (e: Exception) {
      e.message
    }
  }

  suspend fun estimateFare(pickupLat: Double, pickupLng: Double, dropLat: Double, dropLng: Double): FareResponse? {
    val result = postFunction("fare-estimate", FareRequest(pickupLat, pickupLng, dropLat, dropLng))
    return try {
      result?.let { gson.fromJson(it, FareResponse::class.java) }
    } catch (e: Exception) { null }
  }
}
