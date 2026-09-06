package com.garshop.owner.ui

import android.os.Bundle
import com.google.android.material.button.MaterialButton
import android.widget.LinearLayout
import android.widget.ScrollView
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import com.garshop.owner.api.Session
import com.garshop.owner.api.Supabase
import org.json.JSONObject

class AppointmentsActivity : AppCompatActivity() {

    private var garageId: Long? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        Session.init(this)

        val scroll = ScrollView(this)
        val root = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(40, 64, 40, 40)
        }
        root.addView(TextView(this).apply {
            text = "Appointments"
            textSize = 24f
            setPadding(0, 0, 0, 20)
        })
        val list = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL }
        root.addView(list)
        scroll.addView(root)
        setContentView(scroll)

        Thread {
            try {
                val uid = Session.uid() ?: return@Thread
                val garages = Supabase.select("gs_garages", "owner_id=eq.$uid&select=id&limit=1")
                if (garages.length() > 0) {
                    garageId = garages.getJSONObject(0).optLong("id")
                    load(list)
                } else {
                    runOnUiThread { list.addView(TextView(this).apply { text = "Register your garage first." }) }
                }
            } catch (e: Exception) {
                runOnUiThread { Toast.makeText(this, e.message ?: "Error", Toast.LENGTH_SHORT).show() }
            }
        }.start()
    }

    private fun load(list: LinearLayout) {
        val gid = garageId ?: return
        Thread {
            try {
                val arr = Supabase.select(
                    "gs_appointments",
                    "garage_id=eq.$gid&select=id,user_id,scheduled_at,status,notes&order=scheduled_at.asc"
                )
                runOnUiThread {
                    list.removeAllViews()
                    if (arr.length() == 0) {
                        list.addView(TextView(this).apply { text = "No appointments." })
                        return@runOnUiThread
                    }
                    for (i in 0 until arr.length()) {
                        val a = arr.getJSONObject(i)
                        val id = a.optLong("id")
                        val status = a.optString("status")

                        val card = LinearLayout(this).apply {
                            orientation = LinearLayout.VERTICAL
                            setPadding(16, 16, 16, 16)
                            background = android.graphics.drawable.ColorDrawable(android.graphics.Color.parseColor("#F2F5F9"))
                            layoutParams = LinearLayout.LayoutParams(
                                LinearLayout.LayoutParams.MATCH_PARENT,
                                LinearLayout.LayoutParams.WRAP_CONTENT
                            ).apply { bottomMargin = 16 }
                        }
                        val info = TextView(this).apply {
                            text = "User: ${a.optString("user_id").take(8)}\nDate: ${a.optString("scheduled_at")}\nStatus: $status\nNotes: ${a.optString("notes")}"
                            textSize = 14f
                        }
                        card.addView(info)

                        if (status == "pending") {
                            val btn = MaterialButton(this).apply {
                                text = "Confirm"
                                setOnClickListener {
                                    Thread {
                                        try {
                                            Supabase.update("gs_appointments", "id=eq.$id", JSONObject().put("status", "confirmed"))
                                            runOnUiThread { load(list) }
                                        } catch (e: Exception) {
                                            runOnUiThread { Toast.makeText(this@AppointmentsActivity, e.message, Toast.LENGTH_SHORT).show() }
                                        }
                                    }.start()
                                }
                            }
                            card.addView(btn)
                        } else if (status == "confirmed") {
                            val btn = MaterialButton(this).apply {
                                text = "Mark Completed"
                                setOnClickListener {
                                    Thread {
                                        try {
                                            Supabase.update("gs_appointments", "id=eq.$id", JSONObject().put("status", "completed"))
                                            runOnUiThread { load(list) }
                                        } catch (e: Exception) {
                                            runOnUiThread { Toast.makeText(this@AppointmentsActivity, e.message, Toast.LENGTH_SHORT).show() }
                                        }
                                    }.start()
                                }
                            }
                            card.addView(btn)
                        }
                        list.addView(card)
                    }
                }
            } catch (e: Exception) {
                runOnUiThread { Toast.makeText(this, e.message ?: "Error", Toast.LENGTH_SHORT).show() }
            }
        }.start()
    }
}
