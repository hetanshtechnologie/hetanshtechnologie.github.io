package com.garshop.owner.ui

import android.os.Bundle
import com.google.android.material.button.MaterialButton
import android.widget.EditText
import android.widget.LinearLayout
import android.widget.ScrollView
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import com.garshop.owner.api.Session
import com.garshop.owner.api.Supabase
import org.json.JSONObject

class RemindersActivity : AppCompatActivity() {

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
            text = "Send Service Reminder"
            textSize = 24f
            setPadding(0, 0, 0, 20)
        })

        val etUserId = EditText(this).apply { hint = "User ID (from requests screen)"; setSingleLine(true) }
        val etCarId = EditText(this).apply { hint = "Car ID (optional)"; setSingleLine(true); inputType = android.text.InputType.TYPE_CLASS_NUMBER }
        val etTitle = EditText(this).apply { hint = "Reminder title (e.g. Service due)"; setSingleLine(true) }
        val etMessage = EditText(this).apply { hint = "Reminder message" }
        val btnSend = MaterialButton(this).apply { text = "Send Reminder" }

        root.addView(etUserId)
        root.addView(etCarId)
        root.addView(etTitle)
        root.addView(etMessage)
        root.addView(btnSend)

        scroll.addView(root)
        setContentView(scroll)

        Thread {
            try {
                val uid = Session.uid() ?: return@Thread
                val garages = Supabase.select("gs_garages", "owner_id=eq.$uid&select=id&limit=1")
                if (garages.length() > 0) garageId = garages.getJSONObject(0).optLong("id")
            } catch (e: Exception) { /* ignore */ }
        }.start()

        btnSend.setOnClickListener {
            val gid = garageId
            if (gid == null) {
                Toast.makeText(this, "Register your garage first.", Toast.LENGTH_SHORT).show()
                return@setOnClickListener
            }
            val userId = etUserId.text.toString().trim()
            val title = etTitle.text.toString().trim()
            if (userId.isEmpty() || title.isEmpty()) {
                Toast.makeText(this, "User ID and title required", Toast.LENGTH_SHORT).show()
                return@setOnClickListener
            }
            btnSend.isEnabled = false
            Thread {
                try {
                    val carId = etCarId.text.toString().trim().toLongOrNull()
                    val reminder = JSONObject()
                        .put("user_id", userId)
                        .put("garage_id", gid)
                        .put("car_id", carId)
                        .put("title", title)
                        .put("message", etMessage.text.toString().trim())
                    Supabase.insert("gs_reminders", reminder)

                    val notif = JSONObject()
                        .put("user_id", userId)
                        .put("title", title)
                        .put("message", etMessage.text.toString().trim())
                        .put("type", "reminder")
                    Supabase.insert("gs_notifications", notif)

                    runOnUiThread {
                        btnSend.isEnabled = true
                        Toast.makeText(this, "Reminder sent to user.", Toast.LENGTH_LONG).show()
                        etUserId.text.clear(); etTitle.text.clear(); etMessage.text.clear()
                    }
                } catch (e: Exception) {
                    runOnUiThread {
                        btnSend.isEnabled = true
                        Toast.makeText(this, e.message ?: "Failed", Toast.LENGTH_LONG).show()
                    }
                }
            }.start()
        }
    }
}
