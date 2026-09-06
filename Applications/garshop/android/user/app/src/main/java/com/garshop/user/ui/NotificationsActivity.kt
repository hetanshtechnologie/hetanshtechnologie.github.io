package com.garshop.user.ui

import android.os.Bundle
import android.widget.LinearLayout
import android.widget.ScrollView
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import com.garshop.user.api.Session
import com.garshop.user.api.Supabase
import org.json.JSONObject

class NotificationsActivity : AppCompatActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        Session.init(this)

        val scroll = ScrollView(this)
        val root = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(40, 64, 40, 40)
        }
        root.addView(TextView(this).apply {
            text = "Notifications"
            textSize = 24f
            setPadding(0, 0, 0, 20)
        })
        val list = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL }
        root.addView(list)
        scroll.addView(root)
        setContentView(scroll)

        refresh(list)
    }

    private fun refresh(list: LinearLayout) {
        Thread {
            try {
                val uid = Session.uid() ?: return@Thread
                val arr = Supabase.select("gs_notifications", "user_id=eq.$uid&select=id,title,message,type,read,created_at&order=created_at.desc")
                runOnUiThread {
                    list.removeAllViews()
                    if (arr.length() == 0) {
                        list.addView(TextView(this).apply { text = "No notifications." })
                        return@runOnUiThread
                    }
                    for (i in 0 until arr.length()) {
                        val n = arr.getJSONObject(i)
                        val card = LinearLayout(this).apply {
                            orientation = LinearLayout.VERTICAL
                            setPadding(16, 16, 16, 16)
                            background = android.graphics.drawable.ColorDrawable(android.graphics.Color.parseColor("#F2F5F9"))
                            layoutParams = LinearLayout.LayoutParams(
                                LinearLayout.LayoutParams.MATCH_PARENT,
                                LinearLayout.LayoutParams.WRAP_CONTENT
                            ).apply { bottomMargin = 12 }
                        }
                        card.addView(TextView(this).apply {
                            text = n.optString("title")
                            textSize = 16f
                        })
                        card.addView(TextView(this).apply {
                            text = n.optString("message")
                            textSize = 13f
                        })
                        card.addView(TextView(this).apply {
                            text = n.optString("created_at").substringBefore("T")
                            textSize = 12f
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
