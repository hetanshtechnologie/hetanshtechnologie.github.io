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

class RequestsActivity : AppCompatActivity() {

    private var garageId: Long? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        Session.init(this)

        val scroll = ScrollView(this)
        val root = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(40, 64, 40, 40)
        }
        val title = TextView(this).apply {
            text = "Service Requests & Repair Status"
            textSize = 24f
            setPadding(0, 0, 0, 20)
        }
        root.addView(title)
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
                    loadIssues(list)
                } else {
                    runOnUiThread {
                        list.addView(TextView(this).apply { text = "Register your garage first." })
                    }
                }
            } catch (e: Exception) {
                runOnUiThread { Toast.makeText(this, e.message ?: "Error", Toast.LENGTH_SHORT).show() }
            }
        }.start()
    }

    private fun loadIssues(list: LinearLayout) {
        val gid = garageId ?: return
        Thread {
            try {
                val arr = Supabase.select(
                    "gs_issues",
                    "garage_id=eq.$gid&select=id,title,description,status,user_id,created_at&order=created_at.desc"
                )
                runOnUiThread {
                    list.removeAllViews()
                    if (arr.length() == 0) {
                        list.addView(TextView(this).apply { text = "No service requests yet." })
                        return@runOnUiThread
                    }
                    for (i in 0 until arr.length()) {
                        val issue = arr.getJSONObject(i)
                        val id = issue.optLong("id")
                        val status = issue.optString("status")

                        val card = LinearLayout(this).apply {
                            orientation = LinearLayout.VERTICAL
                            setPadding(16, 16, 16, 16)
                            background = android.graphics.drawable.ColorDrawable(
                                android.graphics.Color.parseColor("#F2F5F9")
                            )
                            layoutParams = LinearLayout.LayoutParams(
                                LinearLayout.LayoutParams.MATCH_PARENT,
                                LinearLayout.LayoutParams.WRAP_CONTENT
                            ).apply { bottomMargin = 16 }
                        }
                        val t = TextView(this).apply {
                            text = issue.optString("title")
                            textSize = 17f
                        }
                        val d = TextView(this).apply {
                            text = "${issue.optString("description")}\nStatus: $status"
                            textSize = 14f
                        }
                        card.addView(t); card.addView(d)

                        if (status != "completed") {
                            val next = if (status == "pending") "in_progress" else "completed"
                            val btn = MaterialButton(this).apply {
                                text = "Mark $next"
                                setOnClickListener {
                                    Thread {
                                        try {
                                            val obj = JSONObject().put("status", next)
                                            Supabase.update("gs_issues", "id=eq.$id", obj)
                                            runOnUiThread { loadIssues(list) }
                                        } catch (e: Exception) {
                                            runOnUiThread { Toast.makeText(this@RequestsActivity, e.message, Toast.LENGTH_SHORT).show() }
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
