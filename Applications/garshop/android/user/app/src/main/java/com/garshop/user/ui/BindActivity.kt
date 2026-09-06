package com.garshop.user.ui

import android.content.Intent
import android.os.Bundle
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import com.garshop.user.api.Session
import com.garshop.user.api.Supabase

class BindActivity : AppCompatActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        Session.init(this)

        val gid = intent?.data?.getQueryParameter("garage_id")?.toLongOrNull()
        if (gid == null) {
            goHome()
            return
        }

        Thread {
            var name = "Garage #$gid"
            try {
                val arr = Supabase.select("gs_garages", "id=eq.$gid&select=name")
                if (arr.length() > 0) name = arr.getJSONObject(0).optString("name").ifEmpty { name }
            } catch (e: Exception) { /* offline: fall back to Garage #id */ }

            Session.saveGarageId(gid)
            Session.saveGarageName(name)

            runOnUiThread {
                Toast.makeText(this, "Connected to $name", Toast.LENGTH_LONG).show()
                goHome()
            }
        }.start()
    }

    private fun goHome() {
        startActivity(Intent(this, MainActivity::class.java))
        finish()
    }
}
