package com.garshop.owner.api

import android.content.Context
import android.content.SharedPreferences

object Session {
    private const val PREFS = "garshop_owner"
    lateinit var prefs: SharedPreferences

    fun init(context: Context) {
        prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
    }

    fun save(accessToken: String, userId: String, email: String) {
        prefs.edit()
            .putString("token", accessToken)
            .putString("uid", userId)
            .putString("email", email)
            .apply()
    }

    fun clear() {
        prefs.edit().clear().apply()
    }

    fun token(): String? = prefs.getString("token", null)
    fun uid(): String? = prefs.getString("uid", null)
    fun email(): String? = prefs.getString("email", null)
    fun isLoggedIn(): Boolean = !token().isNullOrEmpty()
}
