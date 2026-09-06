package com.garshop.user.ui

import android.os.Bundle
import android.widget.LinearLayout
import android.widget.ScrollView
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import com.garshop.user.api.Session
import com.garshop.user.api.Supabase

class HistoryActivity : AppCompatActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        Session.init(this)

        val scroll = ScrollView(this)
        val root = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(40, 64, 40, 40)
        }
        root.addView(TextView(this).apply {
            text = "Service History"
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

                val issues = Supabase.select("gs_issues", "user_id=eq.$uid&select=id,title,status,created_at&order=created_at.desc")
                val appts = Supabase.select("gs_appointments", "user_id=eq.$uid&select=id,scheduled_at,status&order=created_at.desc")

                runOnUiThread {
                    list.removeAllViews()
                    list.addView(TextView(this).apply { text = "Reported Issues"; textSize = 17f })

                    if (issues.length() == 0) {
                        list.addView(TextView(this).apply { text = "No issues reported." })
                    }
                    for (i in 0 until issues.length()) {
                        val it = issues.getJSONObject(i)
                        val card = historyCard("${it.optString("title")} — ${it.optString("status")}", it.optString("created_at"))
                        list.addView(card)
                    }

                    list.addView(TextView(this).apply { text = "\nAppointments"; textSize = 17f })
                    if (appts.length() == 0) {
                        list.addView(TextView(this).apply { text = "No appointments." })
                    }
                    for (i in 0 until appts.length()) {
                        val a = appts.getJSONObject(i)
                        val card = historyCard("Appointment — ${a.optString("status")}", a.optString("scheduled_at"))
                        list.addView(card)
                    }
                }
            } catch (e: Exception) {
                runOnUiThread { Toast.makeText(this, e.message ?: "Error", Toast.LENGTH_SHORT).show() }
            }
        }.start()
    }

    private fun historyCard(title: String, sub: String): LinearLayout {
        return LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(16, 16, 16, 16)
            background = android.graphics.drawable.ColorDrawable(android.graphics.Color.parseColor("#F2F5F9"))
            layoutParams = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
            ).apply { topMargin = 10 }
            addView(TextView(context).apply { text = title; textSize = 16f })
            addView(TextView(context).apply { text = sub; textSize = 13f })
        }
    }
}
