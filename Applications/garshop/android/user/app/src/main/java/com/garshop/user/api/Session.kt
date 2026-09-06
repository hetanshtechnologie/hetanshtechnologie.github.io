package com.garshop.user.api

import android.content.Context
import android.content.SharedPreferences

object Session {
    private const val PREFS = "garshop_user"
    lateinit var prefs: SharedPreferences

    fun init(context: Context) {
        prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
    }

    fun save(accessToken: String, userId: String, email: String) {
        prefs.edit().putString("token", accessToken).putString("uid", userId).putString("email", email).apply()
    }

    fun saveGarageId(id: Long) {
        prefs.edit().putLong("garage_id", id).apply()
    }

    fun saveGarageName(name: String) {
        prefs.edit().putString("garage_name", name).apply()
    }

    fun garageId(): Long? =
        if (prefs.contains("garage_id")) prefs.getLong("garage_id", -1L).takeIf { it > 0 } else null

    fun garageName(): String? = prefs.getString("garage_name", null)

    fun clear() = prefs.edit().clear().apply()
    fun token(): String? = prefs.getString("token", null)
    fun uid(): String? = prefs.getString("uid", null)
    fun isLoggedIn(): Boolean = !token().isNullOrEmpty()
}
