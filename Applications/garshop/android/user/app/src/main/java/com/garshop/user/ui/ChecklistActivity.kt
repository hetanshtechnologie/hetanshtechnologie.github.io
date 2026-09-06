package com.garshop.user.ui

import android.graphics.Color
import android.graphics.drawable.ColorDrawable
import android.os.Bundle
import android.widget.Button
import android.widget.CheckBox
import android.widget.EditText
import android.widget.LinearLayout
import android.widget.ScrollView
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import com.garshop.user.api.Session
import com.garshop.user.api.Supabase
import org.json.JSONArray
import org.json.JSONObject

class ChecklistActivity : AppCompatActivity() {

    private val items = listOf(
        "Engine oil level",
        "Engine oil leak",
        "Brake pads",
        "Brake fluid",
        "Coolant level",
        "Battery & terminals",
        "Air filter",
        "AC cooling",
        "Tyre pressure",
        "Tyre tread",
        "Headlights & indicators",
        "Wiper blades",
        "Suspension / shocks",
        "Spark plugs",
        "Horn",
        "Exhaust smoke"
    )

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        Session.init(this)

        val scroll = ScrollView(this)
        val root = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(40, 64, 40, 40)
        }
        root.addView(TextView(this).apply {
            text = "Service Checklist"
            textSize = 24f
            setPadding(0, 0, 0, 20)
        })

        val carHeader = TextView(this).apply { text = "Select your car"; textSize = 16f; setPadding(0, 8, 0, 8) }
        val carContainer = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL }
        val itemsHeader = TextView(this).apply {
            text = "Tick items that need attention"
            textSize = 16f
            setPadding(0, 16, 0, 8)
        }
        val itemsContainer = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL }
        val etNotes = EditText(this).apply {
            hint = "Notes for the garage (optional)"
            setPadding(16, 12, 16, 12)
            background = ColorDrawable(Color.parseColor("#F2F5F9"))
        }
        val btnSave = Button(this).apply { text = "Submit Checklist" }
        val historyHeader = TextView(this).apply {
            text = "My submitted checklists"
            textSize = 16f
            setPadding(0, 24, 0, 8)
        }
        val historyContainer = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL }

        root.addView(carHeader)
        root.addView(carContainer)
        root.addView(itemsHeader)
        root.addView(itemsContainer)
        root.addView(etNotes)
        root.addView(btnSave)
        root.addView(historyHeader)
        root.addView(historyContainer)

        scroll.addView(root)
        setContentView(scroll)

        val gid = Session.garageId()
        if (gid == null) {
            carHeader.text = "Connect to a garage first"
            carContainer.addView(TextView(this).apply {
                text = "Install the app from your garage's page so requests, bookings and checklists go to your garage."
                setPadding(0, 0, 0, 8)
            })
            itemsHeader.visibility = TextView.GONE
            itemsContainer.visibility = TextView.GONE
            etNotes.visibility = TextView.GONE
            btnSave.visibility = TextView.GONE
            loadHistory(historyContainer)
            return
        }

        // Car selection cards
        var selectedCarId: Long? = null
        val uid = Session.uid()
        Thread {
            try {
                val cars = Supabase.select("gs_cars", "user_id=eq.$uid&select=id,brand,model,year")
                runOnUiThread {
                    if (cars.length() == 0) {
                        carContainer.addView(TextView(this).apply {
                            text = "No cars yet. Add a car from the My Cars screen first."
                            setPadding(0, 0, 0, 8)
                        })
                    }
                    for (i in 0 until cars.length()) {
                        val c = cars.getJSONObject(i)
                        val id = c.optLong("id")
                        val label = "${c.optString("brand")} ${c.optString("model")} (${c.optString("year")}) · ID $id"
                        val card = Button(this).apply { text = label }
                        card.setOnClickListener {
                            if (selectedCarId == id) {
                                selectedCarId = null
                                card.background = defaultBackground()
                            } else {
                                for (j in 0 until carContainer.childCount) {
                                    carContainer.getChildAt(j).background = defaultBackground()
                                }
                                selectedCarId = id
                                card.background = ColorDrawable(Color.parseColor("#BFDBFE"))
                            }
                        }
                        carContainer.addView(card)
                    }
                }
            } catch (e: Exception) {
                runOnUiThread { Toast.makeText(this, e.message ?: "Error loading cars", Toast.LENGTH_SHORT).show() }
            }
        }.start()

        // Checklist boxes
        val boxes = ArrayList<CheckBox>()
        items.forEach { label ->
            boxes.add(CheckBox(this).apply {
                text = label
                setPadding(0, 6, 0, 6)
            })
        }
        boxes.forEach { itemsContainer.addView(it) }

        btnSave.setOnClickListener {
            val carId = selectedCarId
            if (carId == null) {
                Toast.makeText(this, "Select your car first", Toast.LENGTH_SHORT).show()
                return@setOnClickListener
            }
            val arr = JSONArray()
            boxes.forEach { cb ->
                arr.put(JSONObject().put("item", cb.text.toString()).put("checked", cb.isChecked))
            }
            btnSave.isEnabled = false
            Thread {
                try {
                    val body = JSONObject()
                        .put("p_garage_id", gid)
                        .put("p_car_id", carId)
                        .put("p_title", "Pre-Service Checklist")
                        .put("p_items", arr)
                        .put("p_notes", etNotes.text.toString().trim())
                    val res = Supabase.rpc("gs_submit_checklist", body).trim().trim('"')
                    if (res.toLongOrNull() == null) throw RuntimeException("Submit failed: $res")
                    runOnUiThread {
                        btnSave.isEnabled = true
                        boxes.forEach { it.isChecked = false }
                        etNotes.text.clear()
                        selectedCarId = null
                        for (j in 0 until carContainer.childCount) {
                            carContainer.getChildAt(j).background = defaultBackground()
                        }
                        Toast.makeText(this, "Checklist submitted to your garage!", Toast.LENGTH_LONG).show()
                        loadHistory(historyContainer)
                    }
                } catch (e: Exception) {
                    runOnUiThread {
                        btnSave.isEnabled = true
                        Toast.makeText(this, e.message ?: "Submit failed", Toast.LENGTH_LONG).show()
                    }
                }
            }.start()
        }

        loadHistory(historyContainer)
    }

    private fun loadHistory(container: LinearLayout) {
        Thread {
            try {
                val uid = Session.uid()
                val arr = Supabase.select(
                    "gs_checklists",
                    "user_id=eq.$uid&select=id,title,status,created_at,gs_checklist_items(item,user_checked,owner_fixed)&order=created_at.desc"
                )
                runOnUiThread {
                    container.removeAllViews()
                    if (arr.length() == 0) {
                        container.addView(TextView(this).apply { text = "No checklists submitted yet." })
                        return@runOnUiThread
                    }
                    for (i in 0 until arr.length()) {
                        val cl = arr.getJSONObject(i)
                        val listItems = cl.optJSONArray("gs_checklist_items") ?: JSONArray()
                        val flagged = (0 until listItems.length()).count { j ->
                            listItems.getJSONObject(j).optBoolean("user_checked")
                        }
                        val fixed = (0 until listItems.length()).count { j ->
                            listItems.getJSONObject(j).optBoolean("owner_fixed")
                        }
                        val card = LinearLayout(this).apply {
                            orientation = LinearLayout.VERTICAL
                            setPadding(16, 16, 16, 16)
                            background = ColorDrawable(Color.parseColor("#F2F5F9"))
                            layoutParams = LinearLayout.LayoutParams(
                                LinearLayout.LayoutParams.MATCH_PARENT,
                                LinearLayout.LayoutParams.WRAP_CONTENT
                            ).apply { bottomMargin = 12 }
                        }
                        card.addView(TextView(this).apply {
                            text = "#${cl.optLong("id")} · ${cl.optString("title")} · ${cl.optString("status")}"
                            textSize = 15f
                        })
                        card.addView(TextView(this).apply {
                            text = "Submitted ${cl.optString("created_at").substringBefore("T")} · " +
                                "Flagged $flagged item(s) · Fixed $fixed by garage"
                            textSize = 13f
                            setPadding(0, 4, 0, 4)
                        })
                        container.addView(card)
                    }
                }
            } catch (e: Exception) {
                runOnUiThread { Toast.makeText(this, e.message ?: "Error loading history", Toast.LENGTH_SHORT).show() }
            }
        }.start()
    }

    private fun defaultBackground() = ColorDrawable(Color.parseColor("#E0E7FF"))
}
