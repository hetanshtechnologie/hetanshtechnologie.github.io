package com.garshop.user.ui

import android.os.Bundle
import android.widget.LinearLayout
import android.widget.ScrollView
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import com.garshop.user.api.Session
import com.garshop.user.api.Supabase
import org.json.JSONArray

class GaragesActivity : AppCompatActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        Session.init(this)

        val scroll = ScrollView(this)
        val root = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(40, 64, 40, 40)
        }
        root.addView(TextView(this).apply {
            text = "Your Garage"
            textSize = 24f
            setPadding(0, 0, 0, 20)
        })
        val list = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL }
        root.addView(list)
        scroll.addView(root)
        setContentView(scroll)

        val boundGid = Session.garageId()
        Thread {
            try {
                val garages: JSONArray = if (boundGid != null) {
                    Supabase.select("gs_garages", "id=eq.$boundGid&select=id,name,location,city,phone,services_offered")
                } else {
                    Supabase.select("gs_garages", "status=eq.approved&select=id,name,location,city,phone,services_offered&order=created_at.asc")
                }
                runOnUiThread {
                    list.removeAllViews()
                    if (boundGid != null) {
                        list.addView(TextView(this).apply {
                            text = "You are connected to your garage only. Your requests and bookings go to this garage."
                            textSize = 13f
                            setPadding(0, 0, 0, 16)
                        })
                    }
                    if (garages.length() == 0) {
                        list.addView(TextView(this).apply { text = if (boundGid != null) "Garage not found." else "No approved garages yet." })
                        return@runOnUiThread
                    }
                    for (i in 0 until garages.length()) {
                        val g = garages.getJSONObject(i)
                        val card = LinearLayout(this).apply {
                            orientation = LinearLayout.VERTICAL
                            setPadding(16, 16, 16, 16)
                            background = android.graphics.drawable.ColorDrawable(android.graphics.Color.parseColor("#F2F5F9"))
                            layoutParams = LinearLayout.LayoutParams(
                                LinearLayout.LayoutParams.MATCH_PARENT,
                                LinearLayout.LayoutParams.WRAP_CONTENT
                            ).apply { bottomMargin = 14 }
                        }
                        card.addView(TextView(this).apply {
                            text = g.optString("name")
                            textSize = 18f
                        })
                        card.addView(TextView(this).apply {
                            text = "${g.optString("location")}, ${g.optString("city")}\nPhone: ${g.optString("phone")}\nServices: ${g.optString("services_offered")}\nGarage ID: ${g.optLong("id")}"
                            textSize = 13f
                        })
                        list.addView(card)
                    }
                }
            } catch (e: Exception) {
                runOnUiThread { Toast.makeText(this, e.message ?: "Error", Toast.LENGTH_SHORT).show() }
            }
        }.start()
    }
}
