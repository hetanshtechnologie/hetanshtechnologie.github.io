package com.garshop.owner.ui

import android.content.Intent
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

class MainActivity : AppCompatActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        Session.init(this)

        if (!Session.isLoggedIn()) {
            startActivity(Intent(this, AuthActivity::class.java))
            finish()
            return
        }
        Supabase.accessToken = Session.token()

        val scroll = ScrollView(this)
        val root = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(40, 64, 40, 40)
        }

        val title = TextView(this).apply {
            text = "GarShop Owner"
            textSize = 26f
            setPadding(0, 0, 0, 4)
        }
        root.addView(title)

        val status = TextView(this)
        root.addView(status)
        loadGarageStatus(status)

        val btnGarage = hubButton("Register / Edit My Garage")
        val btnServices = hubButton("Services Catalog")
        val btnRequests = hubButton("Service Requests & Repair Status")
        val btnChecklists = hubButton("Customer Checklists")
        val btnAppointments = hubButton("Appointments")
        val btnReminders = hubButton("Send Service Reminders")
        val btnUsers = hubButton("Registered Users")
        val btnLogout = MaterialButton(this).apply { text = "Logout" }

        btnGarage.setOnClickListener { startActivity(Intent(this, GarageActivity::class.java)) }
        btnServices.setOnClickListener { startActivity(Intent(this, ServicesActivity::class.java)) }
        btnRequests.setOnClickListener { startActivity(Intent(this, RequestsActivity::class.java)) }
        btnChecklists.setOnClickListener { startActivity(Intent(this, ChecklistsActivity::class.java)) }
        btnAppointments.setOnClickListener { startActivity(Intent(this, AppointmentsActivity::class.java)) }
        btnReminders.setOnClickListener { startActivity(Intent(this, RemindersActivity::class.java)) }
        btnUsers.setOnClickListener { startActivity(Intent(this, UsersActivity::class.java)) }
        btnLogout.setOnClickListener {
            Session.clear()
            startActivity(Intent(this, AuthActivity::class.java))
            finish()
        }

        root.addView(btnGarage)
        root.addView(btnServices)
        root.addView(btnRequests)
        root.addView(btnChecklists)
        root.addView(btnAppointments)
        root.addView(btnReminders)
        root.addView(btnUsers)
        root.addView(btnLogout)

        scroll.addView(root)
        setContentView(scroll)
    }

    private fun hubButton(text: String) = MaterialButton(this).apply {
        this.text = text
        setPadding(0, 0, 0, 0)
        android.widget.LinearLayout.LayoutParams(
            android.widget.LinearLayout.LayoutParams.MATCH_PARENT,
            android.widget.LinearLayout.LayoutParams.WRAP_CONTENT
        ).apply { topMargin = 16 }
    }

    private fun loadGarageStatus(statusView: TextView) {
        Thread {
            try {
                val uid = Session.uid() ?: return@Thread
                val q = "owner_id=eq.$uid&select=name,status&limit=1"
                val arr = Supabase.select("gs_garages", q)
                runOnUiThread {
                    statusView.text = if (arr.length() > 0) {
                        val g = arr.getJSONObject(0)
                        "Garage: ${g.optString("name")}  |  Status: ${g.optString("status")}"
                    } else {
                        "No garage registered yet. Tap 'Register / Edit My Garage'."
                    }
                }
            } catch (e: Exception) {
                runOnUiThread {
                    Toast.makeText(this, e.message ?: "Error", Toast.LENGTH_SHORT).show()
                }
            }
        }.start()
    }
}
