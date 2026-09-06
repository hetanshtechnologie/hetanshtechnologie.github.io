package com.garshop.owner.ui

import android.os.Bundle
import android.widget.LinearLayout
import android.widget.ScrollView
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import com.garshop.owner.api.Session
import com.garshop.owner.api.Supabase
import org.json.JSONObject

class UsersActivity : AppCompatActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        Session.init(this)

        val scroll = ScrollView(this)
        val root = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(40, 64, 40, 40)
        }
        root.addView(TextView(this).apply {
            text = "Registered Users"
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
                val garages = Supabase.select("gs_garages", "owner_id=eq.$uid&select=id&limit=1")
                if (garages.length() == 0) {
                    runOnUiThread { list.addView(TextView(this).apply { text = "Register your garage first." }) }
                    return@Thread
                }
                val gid = garages.getJSONObject(0).optLong("id")
                val issues = Supabase.select("gs_issues", "garage_id=eq.$gid&select=user_id")
                val userIds = linkedSetOf<String>()
                for (i in 0 until issues.length()) userIds.add(issues.getJSONObject(i).optString("user_id"))

                runOnUiThread {
                    list.removeAllViews()
                    if (userIds.isEmpty()) {
                        list.addView(TextView(this).apply { text = "No users have requested your services yet." })
                        return@runOnUiThread
                    }
                    for (uidVal in userIds) {
                        try {
                            val profiles = Supabase.select("gs_profiles", "user_id=eq.$uidVal&select=full_name,phone,role")
                            if (profiles.length() > 0) {
                                val p = profiles.getJSONObject(0)
                                val card = LinearLayout(this).apply {
                                    orientation = LinearLayout.VERTICAL
                                    setPadding(16, 16, 16, 16)
                                    background = android.graphics.drawable.ColorDrawable(android.graphics.Color.parseColor("#F2F5F9"))
                                    layoutParams = LinearLayout.LayoutParams(
                                        LinearLayout.LayoutParams.MATCH_PARENT,
                                        LinearLayout.LayoutParams.WRAP_CONTENT
                                    ).apply { bottomMargin = 12 }
                                }
                                val name = TextView(this).apply {
                                    text = p.optString("full_name").ifEmpty { "Unknown user" }
                                    textSize = 16f
                                }
                                val meta = TextView(this).apply {
                                    text = "Phone: ${p.optString("phone").ifEmpty { "—" }}   (ID: $uidVal)"
                                    textSize = 13f
                                }
                                card.addView(name); card.addView(meta)
                                list.addView(card)
                            }
                        } catch (e: Exception) { /* skip */ }
                    }
                }
            } catch (e: Exception) {
                runOnUiThread { Toast.makeText(this, e.message ?: "Error", Toast.LENGTH_SHORT).show() }
            }
        }.start()
    }
}
