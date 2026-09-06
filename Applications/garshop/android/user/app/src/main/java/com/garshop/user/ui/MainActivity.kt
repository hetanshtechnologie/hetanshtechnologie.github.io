package com.garshop.user.ui

import android.content.Intent
import android.os.Bundle
import com.google.android.material.button.MaterialButton
import android.widget.LinearLayout
import android.widget.ScrollView
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity
import com.garshop.user.api.Session
import com.garshop.user.api.Supabase

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

        root.addView(TextView(this).apply {
            text = "GarShop"
            textSize = 26f
            setPadding(0, 0, 0, 24)
        })

        val boundGid = Session.garageId()
        if (boundGid != null) {
            val garageLine = TextView(this).apply {
                text = "Connected to ${Session.garageName() ?: "garage #$boundGid"}"
                setPadding(0, 0, 0, 20)
            }
            root.addView(garageLine)
            Thread {
                try {
                    val arr = Supabase.select("gs_garages", "id=eq.$boundGid&select=name")
                    if (arr.length() > 0) {
                        val name = arr.getJSONObject(0).optString("name").ifEmpty { null }
                        if (name != null) {
                            Session.saveGarageName(name)
                            runOnUiThread { garageLine.text = "Connected to $name" }
                        }
                    }
                } catch (e: Exception) { /* ignore */ }
            }.start()
        }

        val btnCars = hubButton("My Cars")
        val btnIssue = hubButton("Report a Car Problem")
        val btnServices = hubButton("Garage Services & Prices")
        val btnGarages = hubButton("Nearby Garages & Services")
        val btnChecklist = hubButton("Service Checklist")
        val btnBook = hubButton("Book Appointment")
        val btnNotifs = hubButton("Notifications")
        val btnHistory = hubButton("Service History")
        val btnLogout = MaterialButton(this).apply { text = "Logout" }

        btnCars.setOnClickListener { startActivity(Intent(this, CarsActivity::class.java)) }
        btnIssue.setOnClickListener { startActivity(Intent(this, IssueActivity::class.java)) }
        btnServices.setOnClickListener { startActivity(Intent(this, ServicesActivity::class.java)) }
        btnGarages.setOnClickListener { startActivity(Intent(this, GaragesActivity::class.java)) }
        btnChecklist.setOnClickListener { startActivity(Intent(this, ChecklistActivity::class.java)) }
        btnBook.setOnClickListener { startActivity(Intent(this, BookActivity::class.java)) }
        btnNotifs.setOnClickListener { startActivity(Intent(this, NotificationsActivity::class.java)) }
        btnHistory.setOnClickListener { startActivity(Intent(this, HistoryActivity::class.java)) }
        btnLogout.setOnClickListener {
            Session.clear()
            startActivity(Intent(this, AuthActivity::class.java))
            finish()
        }

        root.addView(btnCars)
        root.addView(btnIssue)
        root.addView(btnServices)
        root.addView(btnGarages)
        root.addView(btnChecklist)
        root.addView(btnBook)
        root.addView(btnNotifs)
        root.addView(btnHistory)
        root.addView(btnLogout)

        scroll.addView(root)
        setContentView(scroll)
    }

    private fun hubButton(text: String) = MaterialButton(this).apply {
        this.text = text
        android.widget.LinearLayout.LayoutParams(
            android.widget.LinearLayout.LayoutParams.MATCH_PARENT,
            android.widget.LinearLayout.LayoutParams.WRAP_CONTENT
        ).apply { topMargin = 16 }
    }
}
