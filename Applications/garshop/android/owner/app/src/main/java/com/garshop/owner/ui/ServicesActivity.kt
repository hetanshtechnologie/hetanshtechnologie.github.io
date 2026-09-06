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

class ServicesActivity : AppCompatActivity() {

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
            text = "Services Catalog"
            textSize = 24f
            setPadding(0, 0, 0, 20)
        }
        root.addView(title)

        val etName = EditText(this).apply { hint = "Service name (e.g. Engine Oil Change)"; setSingleLine(true) }
        val etDesc = EditText(this).apply { hint = "Description" }
        val etPrice = EditText(this).apply { hint = "Price (₹)"; setSingleLine(true); inputType = android.text.InputType.TYPE_CLASS_NUMBER or android.text.InputType.TYPE_NUMBER_FLAG_DECIMAL }
        val btnAdd = MaterialButton(this).apply { text = "Add Service" }

        root.addView(etName)
        root.addView(etDesc)
        root.addView(etPrice)
        root.addView(btnAdd)

        val listTitle = TextView(this).apply {
            text = "\nMy Services"
            textSize = 18f
        }
        root.addView(listTitle)
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
                    refresh(list)
                } else {
                    runOnUiThread {
                        Toast.makeText(this, "Register your garage first.", Toast.LENGTH_LONG).show()
                        list.addView(TextView(this).apply { text = "No garage registered." })
                    }
                }
            } catch (e: Exception) {
                runOnUiThread { Toast.makeText(this, e.message ?: "Error", Toast.LENGTH_SHORT).show() }
            }
        }.start()

        btnAdd.setOnClickListener {
            val gid = garageId
            if (gid == null) {
                Toast.makeText(this, "Register your garage first.", Toast.LENGTH_SHORT).show()
                return@setOnClickListener
            }
            val name = etName.text.toString().trim()
            if (name.isEmpty()) {
                Toast.makeText(this, "Service name required", Toast.LENGTH_SHORT).show()
                return@setOnClickListener
            }
            val obj = JSONObject()
                .put("garage_id", gid)
                .put("name", name)
                .put("description", etDesc.text.toString().trim())
                .put("price", etPrice.text.toString().trim().toDoubleOrNull() ?: 0.0)
            Thread {
                try {
                    Supabase.insert("gs_garage_services", obj)
                    runOnUiThread {
                        etName.text.clear(); etDesc.text.clear(); etPrice.text.clear()
                        Toast.makeText(this, "Service added", Toast.LENGTH_SHORT).show()
                        refresh(list)
                    }
                } catch (e: Exception) {
                    runOnUiThread { Toast.makeText(this, e.message ?: "Failed", Toast.LENGTH_SHORT).show() }
                }
            }.start()
        }
    }

    private fun refresh(list: LinearLayout) {
        val gid = garageId ?: return
        Thread {
            try {
                val arr = Supabase.select("gs_garage_services", "garage_id=eq.$gid&order=created_at.asc")
                runOnUiThread {
                    list.removeAllViews()
                    if (arr.length() == 0) {
                        list.addView(TextView(this).apply { text = "No services yet. Add one above." })
                        return@runOnUiThread
                    }
                    for (i in 0 until arr.length()) {
                        val s = arr.getJSONObject(i)
                        val row = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL; setPadding(0, 10, 0, 10) }
                        val name = TextView(this).apply {
                            text = "${s.optString("name")}  —  ₹${s.optString("price")}"
                            textSize = 16f
                        }
                        val desc = TextView(this).apply {
                            text = s.optString("description")
                            textSize = 13f
                        }
                        val del = MaterialButton(this).apply {
                            text = "Delete"
                            setOnClickListener {
                                Thread {
                                    try {
                                        Supabase.delete("gs_garage_services", "id=eq.${s.optLong("id")}")
                                        runOnUiThread { refresh(list) }
                                    } catch (e: Exception) {
                                        runOnUiThread { Toast.makeText(this@ServicesActivity, e.message, Toast.LENGTH_SHORT).show() }
                                    }
                                }.start()
                            }
                        }
                        row.addView(name); row.addView(desc); row.addView(del)
                        list.addView(row)
                    }
                }
            } catch (e: Exception) {
                runOnUiThread { Toast.makeText(this, e.message ?: "Error", Toast.LENGTH_SHORT).show() }
            }
        }.start()
    }
}
