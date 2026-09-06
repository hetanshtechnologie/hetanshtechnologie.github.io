package com.garshop.user.ui

import android.app.DatePickerDialog
import android.app.TimePickerDialog
import android.os.Bundle
import com.google.android.material.button.MaterialButton
import android.widget.EditText
import android.widget.LinearLayout
import android.widget.ScrollView
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import com.garshop.user.api.Session
import com.garshop.user.api.Supabase
import org.json.JSONObject
import java.util.Calendar
import java.util.Locale

class BookActivity : AppCompatActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        Session.init(this)

        val scroll = ScrollView(this)
        val root = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(40, 64, 40, 40)
        }
        root.addView(TextView(this).apply {
            text = "Book Appointment"
            textSize = 24f
            setPadding(0, 0, 0, 20)
        })

        val etGarageId = EditText(this).apply { hint = "Garage ID"; setSingleLine(true); inputType = android.text.InputType.TYPE_CLASS_NUMBER }
        Session.garageId()?.let { gid ->
            etGarageId.setText(gid.toString())
            etGarageId.isEnabled = false
            etGarageId.hint = "Connected garage (locked)"
        }
        val etCarId = EditText(this).apply { hint = "Car ID"; setSingleLine(true); inputType = android.text.InputType.TYPE_CLASS_NUMBER }
        val etServiceId = EditText(this).apply { hint = "Service ID (optional)"; setSingleLine(true); inputType = android.text.InputType.TYPE_CLASS_NUMBER }
        val intentSid = intent.getLongExtra("service_id", -1L)
        val intentSname = intent.getStringExtra("service_name")
        if (intentSid > 0) {
            etServiceId.setText(intentSid.toString())
            if (intentSname != null) etServiceId.hint = intentSname
        }

        val etNotes = EditText(this).apply { hint = "Notes (e.g. doorstep pickup)" }
        val btnBook = MaterialButton(this).apply { text = "Book Appointment" }

        // ---- Date & time picker (replaces the free-text field) ----
        var chosenDate: String? = null
        var chosenTime: String? = null
        val tvDateTime = TextView(this).apply {
            text = "No date & time selected yet"
            setTextColor(android.graphics.Color.parseColor("#8aa0b8"))
            setPadding(16, 14, 16, 14)
            background = android.graphics.drawable.ColorDrawable(android.graphics.Color.parseColor("#F2F5F9"))
        }
        fun updateDateTime() {
            if (chosenDate != null && chosenTime != null) {
                tvDateTime.text = "$chosenDate $chosenTime"
                tvDateTime.setTextColor(android.graphics.Color.parseColor("#101828"))
            }
        }
        val btnDate = MaterialButton(this).apply { text = "Pick Date" }
        btnDate.setOnClickListener {
            val cal = Calendar.getInstance()
            DatePickerDialog(this, { _, y, m, d ->
                chosenDate = String.format(Locale.US, "%04d-%02d-%02d", y, m + 1, d)
                updateDateTime()
            }, cal.get(Calendar.YEAR), cal.get(Calendar.MONTH), cal.get(Calendar.DAY_OF_MONTH)).show()
        }
        val btnTime = MaterialButton(this).apply { text = "Pick Time" }
        btnTime.setOnClickListener {
            val cal = Calendar.getInstance()
            TimePickerDialog(this, { _, h, min ->
                chosenTime = String.format(Locale.US, "%02d:%02d:00", h, min)
                updateDateTime()
            }, cal.get(Calendar.HOUR_OF_DAY), cal.get(Calendar.MINUTE), true).show()
        }
        val dateTimeRow = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            layoutParams = LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT)
        }
        dateTimeRow.addView(btnDate)
        dateTimeRow.addView(btnTime)

        root.addView(etGarageId)
        root.addView(etCarId)
        root.addView(etServiceId)
        root.addView(tvDateTime)
        root.addView(dateTimeRow)
        root.addView(etNotes)
        root.addView(btnBook)

        scroll.addView(root)
        setContentView(scroll)

        btnBook.setOnClickListener {
            val gid = etGarageId.text.toString().trim()
            val cid = etCarId.text.toString().trim()
            val dt = if (chosenDate != null && chosenTime != null) "$chosenDate" + "T" + chosenTime else ""
            if (gid.isEmpty() || cid.isEmpty() || dt.isEmpty()) {
                Toast.makeText(this, "Garage ID, Car ID and date/time required", Toast.LENGTH_SHORT).show()
                return@setOnClickListener
            }
            btnBook.isEnabled = false
            Thread {
                try {
                    val obj = JSONObject()
                        .put("user_id", Session.uid())
                        .put("garage_id", gid.toLong())
                        .put("car_id", cid.toLong())
                        .put("scheduled_at", dt)
                        .put("notes", etNotes.text.toString().trim())
                    val sid = etServiceId.text.toString().trim().toLongOrNull()
                    if (sid != null) obj.put("service_id", sid)
                    Supabase.insert("gs_appointments", obj)

                    val garages = Supabase.select("gs_garages", "id=eq.$gid&select=owner_id")
                    if (garages.length() > 0) {
                        val notif = JSONObject()
                            .put("user_id", garages.getJSONObject(0).optString("owner_id"))
                            .put("title", "New appointment")
                            .put("message", "A user booked an appointment at your garage.")
                            .put("type", "info")
                        Supabase.insert("gs_notifications", notif)
                    }

                    runOnUiThread {
                        btnBook.isEnabled = true
                        Toast.makeText(this, "Appointment booked!", Toast.LENGTH_LONG).show()
                        finish()
                    }
                } catch (e: Exception) {
                    runOnUiThread {
                        btnBook.isEnabled = true
                        Toast.makeText(this, e.message ?: "Failed", Toast.LENGTH_LONG).show()
                    }
                }
            }.start()
        }
    }
}
