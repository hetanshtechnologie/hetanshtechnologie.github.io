package com.garshop.user.ui

import android.content.Intent
import android.os.Bundle
import android.widget.Button
import android.widget.LinearLayout
import android.widget.ScrollView
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import com.garshop.user.api.Session
import com.garshop.user.api.Supabase
import org.json.JSONObject

class ServicesActivity : AppCompatActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        Session.init(this)

        val scroll = ScrollView(this)
        val root = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(40, 64, 40, 40)
        }
        root.addView(TextView(this).apply {
            text = "Garage Services & Prices"
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
                val query = if (boundGid != null) {
                    "garage_id=eq.$boundGid&select=id,name,description,price,category&order=category.asc"
                } else {
                    "select=id,name,description,price,category,garage_id&order=garage_id.asc"
                }
                val services = Supabase.select("gs_garage_services", query)
                val garageName = if (boundGid != null) {
                    Session.garageName() ?: "garage #$boundGid"
                } else {
                    fetchGarageName(services)
                }
                runOnUiThread {
                    if (services.length() == 0) {
                        list.addView(TextView(this).apply {
                            text = "No services listed yet. Contact the garage or check back later."
                            setPadding(0, 8, 0, 8)
                        })
                        return@runOnUiThread
                    }
                    list.addView(TextView(this).apply {
                        text = if (boundGid != null)
                            "Services at $garageName"
                        else
                            "Services offered by approved garages"
                        textSize = 15f
                        setPadding(0, 0, 0, 14)
                    })
                    for (i in 0 until services.length()) {
                        val s = services.getJSONObject(i)
                        val card = LinearLayout(this).apply {
                            orientation = LinearLayout.VERTICAL
                            setPadding(16, 16, 16, 16)
                            background = android.graphics.drawable.ColorDrawable(android.graphics.Color.parseColor("#F2F5F9"))
                            layoutParams = LinearLayout.LayoutParams(
                                LinearLayout.LayoutParams.MATCH_PARENT,
                                LinearLayout.LayoutParams.WRAP_CONTENT
                            ).apply { bottomMargin = 14 }
                        }
                        val gName = if (boundGid != null) "" else s.optString("garage_name") + "\n"
                        card.addView(TextView(this).apply {
                            text = s.optString("name") + "  ₹" + s.optString("price", "0")
                            textSize = 17f
                        })
                        card.addView(TextView(this).apply {
                            text = gName +
                                "Category: ${s.optString("category")}\n" +
                                "${s.optString("description").ifEmpty { "—" }}\nService ID: ${s.optLong("id")}"
                            textSize = 13f
                        })
                        val btn = Button(this).apply { text = "Book this service" }
                        btn.setOnClickListener {
                            startActivity(
                                Intent(this@ServicesActivity, BookActivity::class.java)
                                    .putExtra("service_id", s.optLong("id"))
                                    .putExtra("service_name", s.optString("name"))
                            )
                        }
                        card.addView(btn)
                        list.addView(card)
                    }
                }
            } catch (e: Exception) {
                runOnUiThread { Toast.makeText(this, e.message ?: "Error", Toast.LENGTH_SHORT).show() }
            }
        }.start()
    }

    private fun fetchGarageName(services: org.json.JSONArray): String {
        return try {
            val ids = HashSet<Long>()
            for (i in 0 until services.length()) ids.add(services.getJSONObject(i).optLong("garage_id"))
            val idList = ids.joinToString(",")
            val q = "id=in.($idList)&select=id,name"
            val garages = Supabase.select("gs_garages", q)
            val names = HashMap<Long, String>()
            for (i in 0 until garages.length()) {
                val g = garages.getJSONObject(i)
                names[g.optLong("id")] = g.optString("name")
            }
            for (i in 0 until services.length()) {
                (services.getJSONObject(i) as JSONObject).put(
                    "garage_name",
                    names[services.getJSONObject(i).optLong("garage_id")] ?: ""
                )
            }
            ""
        } catch (e: Exception) { "" }
    }
}
