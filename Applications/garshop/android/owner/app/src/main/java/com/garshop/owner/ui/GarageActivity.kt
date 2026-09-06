package com.garshop.owner.ui

import android.os.Bundle
import com.google.android.material.button.MaterialButton
import android.widget.EditText
import android.widget.LinearLayout
import android.widget.ScrollView
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import com.garshop.owner.api.Session
import com.garshop.owner.api.Supabase
import org.json.JSONObject

class GarageActivity : AppCompatActivity() {

    private lateinit var etName: EditText
    private lateinit var etLocation: EditText
    private lateinit var etCity: EditText
    private lateinit var etPhone: EditText
    private lateinit var etDescription: EditText
    private lateinit var etServices: EditText
    private lateinit var btnSave: MaterialButton
    private var existingId: Long? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        Session.init(this)

        val scroll = ScrollView(this)
        val root = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(40, 64, 40, 40)
        }

        val title = android.widget.TextView(this).apply {
            text = "My Garage"
            textSize = 24f
            setPadding(0, 0, 0, 24)
        }
        root.addView(title)

        etName = EditText(this).apply { hint = "Garage name"; setSingleLine(true) }
        etLocation = EditText(this).apply { hint = "Location / address"; setSingleLine(true) }
        etCity = EditText(this).apply { hint = "City"; setSingleLine(true) }
        etPhone = EditText(this).apply { hint = "Contact phone"; setSingleLine(true); inputType = android.text.InputType.TYPE_CLASS_PHONE }
        etDescription = EditText(this).apply { hint = "Short description" }
        etServices = EditText(this).apply { hint = "Services offered (comma separated)" }
        btnSave = MaterialButton(this).apply { text = "Save Garage" }

        root.addView(etName)
        root.addView(etLocation)
        root.addView(etCity)
        root.addView(etPhone)
        root.addView(etDescription)
        root.addView(etServices)
        root.addView(btnSave)

        scroll.addView(root)
        setContentView(scroll)

        loadExisting()
        btnSave.setOnClickListener { save() }
    }

    private fun loadExisting() {
        Thread {
            try {
                val uid = Session.uid() ?: return@Thread
                val arr = Supabase.select("gs_garages", "owner_id=eq.$uid&limit=1")
                if (arr.length() > 0) {
                    val g = arr.getJSONObject(0)
                    existingId = g.optLong("id")
                    runOnUiThread {
                        etName.setText(g.optString("name"))
                        etLocation.setText(g.optString("location"))
                        etCity.setText(g.optString("city"))
                        etPhone.setText(g.optString("phone"))
                        etDescription.setText(g.optString("description"))
                        etServices.setText(g.optString("services_offered"))
                    }
                }
            } catch (e: Exception) {
                runOnUiThread { Toast.makeText(this, e.message ?: "Error", Toast.LENGTH_SHORT).show() }
            }
        }.start()
    }

    private fun save() {
        val name = etName.text.toString().trim()
        val location = etLocation.text.toString().trim()
        if (name.isEmpty() || location.isEmpty()) {
            Toast.makeText(this, "Garage name and location required", Toast.LENGTH_SHORT).show()
            return
        }
        btnSave.isEnabled = false
        Thread {
            try {
                val obj = JSONObject()
                    .put("name", name)
                    .put("location", location)
                    .put("city", etCity.text.toString().trim())
                    .put("phone", etPhone.text.toString().trim())
                    .put("description", etDescription.text.toString().trim())
                    .put("services_offered", etServices.text.toString().trim())
                if (existingId != null) {
                    obj.put("status", "pending")
                    Supabase.update("gs_garages", "id=eq.$existingId", obj)
                    runOnUiThread {
                        Toast.makeText(this, "Garage updated (pending approval).", Toast.LENGTH_LONG).show()
                        finish()
                    }
                } else {
                    obj.put("owner_id", Session.uid())
                    obj.put("status", "pending")
                    Supabase.insert("gs_garages", obj)
                    runOnUiThread {
                        Toast.makeText(this, "Garage submitted for admin approval.", Toast.LENGTH_LONG).show()
                        finish()
                    }
                }
            } catch (e: Exception) {
                runOnUiThread {
                    btnSave.isEnabled = true
                    Toast.makeText(this, e.message ?: "Save failed", Toast.LENGTH_LONG).show()
                }
            }
        }.start()
    }
}
