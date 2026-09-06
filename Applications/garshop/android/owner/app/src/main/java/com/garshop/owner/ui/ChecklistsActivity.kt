package com.garshop.owner.ui

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
import com.garshop.owner.api.Session
import com.garshop.owner.api.Supabase
import org.json.JSONArray
import org.json.JSONObject

class ChecklistsActivity : AppCompatActivity() {

    private var garageId: Long? = null
    private lateinit var list: LinearLayout

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        Session.init(this)

        val scroll = ScrollView(this)
        val root = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(40, 64, 40, 40)
        }
        root.addView(TextView(this).apply {
            text = "Customer Checklists"
            textSize = 24f
            setPadding(0, 0, 0, 20)
        })
        list = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL }
        root.addView(list)
        scroll.addView(root)
        setContentView(scroll)

        Thread {
            try {
                val uid = Session.uid() ?: return@Thread
                val garages = Supabase.select("gs_garages", "owner_id=eq.$uid&select=id&limit=1")
                if (garages.length() > 0) {
                    garageId = garages.getJSONObject(0).optLong("id")
                    loadChecklists()
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

    private fun loadChecklists() {
        val gid = garageId ?: return
        Thread {
            try {
                val body = JSONObject().put("p_garage_id", gid)
                val res = Supabase.rpc("gs_owner_checklists", body)
                val arr = if (res.isBlank()) JSONArray() else JSONArray(res)
                runOnUiThread {
                    list.removeAllViews()
                    if (arr.length() == 0) {
                        list.addView(TextView(this).apply {
                            text = "No checklists yet. Ask connected users to submit a checklist from the app."
                        })
                        return@runOnUiThread
                    }
                    for (i in 0 until arr.length()) {
                        list.addView(renderChecklist(arr.getJSONObject(i)))
                    }
                }
            } catch (e: Exception) {
                runOnUiThread { Toast.makeText(this, e.message ?: "Error loading checklists", Toast.LENGTH_SHORT).show() }
            }
        }.start()
    }

    private fun renderChecklist(cl: JSONObject): LinearLayout {
        val card = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(16, 16, 16, 16)
            background = ColorDrawable(Color.parseColor("#F2F5F9"))
            layoutParams = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
            ).apply { bottomMargin = 16 }
        }
        val clId = cl.optLong("id")
        val user = cl.optString("user_name").ifEmpty { "Unknown user" }
        val phone = cl.optString("phone")
        val car = cl.optString("car")
        val created = cl.optString("created_at").substringBefore("T")
        val status = cl.optString("status")

        card.addView(TextView(this).apply {
            text = "#$clId · $user${if (phone.isNotEmpty()) " · $phone" else ""}\n$car · $created"
            textSize = 14f
        })
        card.addView(TextView(this).apply {
            text = "${cl.optString("title")}  [${status}]"
            textSize = 16f
            setPadding(0, 6, 0, 2)
        })
        val notes = cl.optString("notes")
        if (notes.isNotEmpty()) {
            card.addView(TextView(this).apply {
                text = "Notes: $notes"
                textSize = 13f
                setPadding(0, 0, 0, 6)
            })
        }

        val items = cl.optJSONArray("items") ?: JSONArray()
        val checkboxes = HashMap<Long, CheckBox>()
        val noteFields = HashMap<Long, EditText>()

        for (j in 0 until items.length()) {
            val it = items.getJSONObject(j)
            val itemId = it.optLong("id")
            val fixed = it.optBoolean("fixed")
            val row = LinearLayout(this).apply {
                orientation = LinearLayout.HORIZONTAL
                setPadding(0, 4, 0, 4)
            }
            val cb = CheckBox(this).apply {
                text = it.optString("item") + if (it.optBoolean("checked")) "  [flagged]" else ""
                isChecked = fixed
                layoutParams = LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1.6f)
            }
            val note = EditText(this).apply {
                hint = "fix note"
                setSingleLine(true)
                setText(it.optString("note"))
                layoutParams = LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f)
            }
            row.addView(cb)
            row.addView(note)
            card.addView(row)
            checkboxes[itemId] = cb
            noteFields[itemId] = note

            cb.setOnCheckedChangeListener { _, isChecked ->
                val n = noteFields[itemId]?.text?.toString()?.trim() ?: ""
                Thread {
                    try {
                        Supabase.update(
                            "gs_checklist_items",
                            "id=eq.$itemId",
                            JSONObject().put("owner_fixed", isChecked).put("fixed_note", n)
                        )
                        if (isChecked) markInProgressIfPending(clId)
                        runOnUiThread { loadChecklists() }
                    } catch (e: Exception) {
                        runOnUiThread { Toast.makeText(this@ChecklistsActivity, e.message, Toast.LENGTH_SHORT).show() }
                    }
                }.start()
            }
        }

        if (status != "completed") {
            val btnDone = Button(this).apply { text = "Mark All Fixed & Completed" }
            btnDone.setOnClickListener {
                Thread {
                    try {
                        Supabase.update("gs_checklist_items", "checklist_id=eq.$clId", JSONObject().put("owner_fixed", true))
                        Supabase.update("gs_checklists", "id=eq.$clId", JSONObject().put("status", "completed"))
                        Supabase.insert(
                            "gs_notifications",
                            JSONObject()
                                .put("user_id", cl.optString("user_id"))
                                .put("title", "Checklist completed")
                                .put("message", "Your service checklist \"${cl.optString("title")}\" is completed — the flagged items have been fixed.")
                                .put("type", "success")
                        )
                        runOnUiThread {
                            Toast.makeText(this@ChecklistsActivity, "Checklist completed. User notified.", Toast.LENGTH_LONG).show()
                            loadChecklists()
                        }
                    } catch (e: Exception) {
                        runOnUiThread { Toast.makeText(this@ChecklistsActivity, e.message ?: "Failed", Toast.LENGTH_SHORT).show() }
                    }
                }.start()
            }
            card.addView(btnDone)
        }

        return card
    }

    private fun markInProgressIfPending(clId: Long) {
        try {
            Supabase.update("gs_checklists", "id=eq.$clId&status=eq.pending", JSONObject().put("status", "in_progress"))
        } catch (e: Exception) { /* ignore */ }
    }
}
