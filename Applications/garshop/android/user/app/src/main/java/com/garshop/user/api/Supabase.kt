package com.garshop.user.api

import org.json.JSONArray
import org.json.JSONObject
import java.io.BufferedReader
import java.io.InputStreamReader
import java.io.OutputStream
import java.net.HttpURLConnection
import java.net.URL

object Supabase {
    const val BASE = "https://vgipghqejzbcoighktij.supabase.co"
    const val ANON =
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZnaXBnaHFlanpiY29pZ2hrdGlqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk3MjQ2MjIsImV4cCI6MjA5NTMwMDYyMn0.KoDwAZarGWOLwKXOwycA8wuIiIrksvZy7dyaO0-ehUo"

    var accessToken: String? = null

    fun signUp(email: String, password: String): JSONObject {
        val body = JSONObject().put("email", email).put("password", password)
        return JSONObject(request("$BASE/auth/v1/signup", "POST", body.toString()))
    }

    fun signIn(email: String, password: String): JSONObject {
        val body = JSONObject().put("email", email).put("password", password).put("grant_type", "password")
        val json = JSONObject(request("$BASE/auth/v1/token?grant_type=password", "POST", body.toString()))
        accessToken = json.optString("access_token")
        return json
    }

    fun insert(table: String, obj: JSONObject): JSONObject {
        val res = request("$BASE/rest/v1/$table", "POST", obj.toString())
        return if (res.isBlank()) JSONObject() else JSONObject(res)
    }

    fun rpc(name: String, obj: JSONObject): String {
        return request("$BASE/rest/v1/rpc/$name", "POST", obj.toString())
    }

    fun select(table: String, query: String): JSONArray {
        val res = request("$BASE/rest/v1/$table?$query", "GET")
        return if (res.isBlank()) JSONArray() else JSONArray(res)
    }

    fun update(table: String, query: String, obj: JSONObject): JSONObject {
        val res = request("$BASE/rest/v1/$table?$query", "PATCH", obj.toString())
        return if (res.isBlank()) JSONObject() else JSONObject(res)
    }

    fun upload(bucket: String, path: String, bytes: ByteArray, contentType: String): String {
        val url = "$BASE/storage/v1/object/$bucket/$path"
        val conn = URL(url).openConnection() as HttpURLConnection
        conn.requestMethod = "POST"
        conn.connectTimeout = 20000
        conn.readTimeout = 20000
        conn.doOutput = true
        conn.setRequestProperty("apikey", ANON)
        conn.setRequestProperty("Authorization", "Bearer $accessToken")
        conn.setRequestProperty("Content-Type", contentType)
        conn.outputStream.use { it.write(bytes) }
        val code = conn.responseCode
        val text = if (code in 200..299) conn.inputStream?.bufferedReader()?.use { it.readText() } ?: "" else conn.errorStream?.bufferedReader()?.use { it.readText() } ?: ""
        conn.disconnect()
        if (code !in 200..299) throw RuntimeException("Upload error $code: $text")
        return "$BASE/storage/v1/object/public/$bucket/$path"
    }

    private fun request(url: String, method: String, body: String? = null): String {
        val conn = URL(url).openConnection() as HttpURLConnection
        conn.requestMethod = method
        conn.connectTimeout = 15000
        conn.readTimeout = 15000
        conn.setRequestProperty("apikey", ANON)
        conn.setRequestProperty("Content-Type", "application/json")
        conn.setRequestProperty("Accept", "application/json")
        val token = accessToken
        if (token != null) conn.setRequestProperty("Authorization", "Bearer $token")
        if (body != null) {
            conn.doOutput = true
            conn.outputStream.use { it.write(body.toByteArray(Charsets.UTF_8)) }
        }
        val code = conn.responseCode
        val stream = if (code in 200..299) conn.inputStream else conn.errorStream
        val text = if (stream != null) BufferedReader(InputStreamReader(stream, Charsets.UTF_8)).use { it.readText() } else ""
        conn.disconnect()
        if (code !in 200..299) throw RuntimeException("Supabase error $code: $text")
        return text
    }
}
