package com.garshop.owner.api

import android.content.Context
import org.json.JSONArray
import org.json.JSONObject
import java.io.BufferedReader
import java.io.InputStreamReader
import java.io.OutputStream
import java.net.HttpURLConnection
import java.net.URL
import java.net.URLEncoder

object Supabase {
    const val BASE = "https://vgipghqejzbcoighktij.supabase.co"
    const val ANON =
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZnaXBnaHFlanpiY29pZ2hrdGlqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk3MjQ2MjIsImV4cCI6MjA5NTMwMDYyMn0.KoDwAZarGWOLwKXOwycA8wuIiIrksvZy7dyaO0-ehUo"

    var accessToken: String? = null

    // ---------- Auth ----------
    fun signUp(email: String, password: String): JSONObject {
        val body = JSONObject().put("email", email).put("password", password)
        val res = request("$BASE/auth/v1/signup", "POST", body.toString())
        return JSONObject(res)
    }

    fun signIn(email: String, password: String): JSONObject {
        val body = JSONObject()
            .put("email", email)
            .put("password", password)
            .put("grant_type", "password")
        val res = request("$BASE/auth/v1/token?grant_type=password", "POST", body.toString(), isAuth = true)
        val json = JSONObject(res)
        accessToken = json.optString("access_token")
        return json
    }

    // ---------- REST ----------
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

    fun delete(table: String, query: String) {
        request("$BASE/rest/v1/$table?$query", "DELETE")
    }

    fun upsert(table: String, obj: JSONObject): JSONObject {
        val res = request("$BASE/rest/v1/$table", "POST", obj.toString(), prefer = "resolution=merge-duplicates")
        return if (res.isBlank()) JSONObject() else JSONObject(res)
    }

    private fun request(
        url: String,
        method: String,
        body: String? = null,
        isAuth: Boolean = false,
        prefer: String? = null
    ): String {
        val conn = URL(url).openConnection() as HttpURLConnection
        conn.requestMethod = method
        conn.connectTimeout = 15000
        conn.readTimeout = 15000
        conn.setRequestProperty("apikey", ANON)
        conn.setRequestProperty("Content-Type", "application/json")
        conn.setRequestProperty("Accept", "application/json")
        if (prefer != null) conn.setRequestProperty("Prefer", prefer)
        val token = if (isAuth) null else accessToken
        if (token != null) conn.setRequestProperty("Authorization", "Bearer $token")

        if (body != null) {
            conn.doOutput = true
            val os: OutputStream = conn.outputStream
            os.write(body.toByteArray(Charsets.UTF_8))
            os.flush()
            os.close()
        }

        val code = conn.responseCode
        val stream = if (code in 200..299) conn.inputStream else conn.errorStream
        val text = if (stream != null) {
            val reader = BufferedReader(InputStreamReader(stream, Charsets.UTF_8))
            reader.use { it.readText() }
        } else ""
        conn.disconnect()

        if (code !in 200..299) {
            throw RuntimeException("Supabase error $code: $text")
        }
        return text
    }

    fun urlEncode(value: String): String = URLEncoder.encode(value, "UTF-8")
}
