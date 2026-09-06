package com.garshop.user.ui

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

class CarsActivity : AppCompatActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        Session.init(this)

        val scroll = ScrollView(this)
        val root = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(40, 64, 40, 40)
        }
        root.addView(TextView(this).apply {
            text = "My Cars"
            textSize = 24f
            setPadding(0, 0, 0, 20)
        })

        val etBrand = EditText(this).apply { hint = "Brand (e.g. Maruti)"; setSingleLine(true) }
        val etModel = EditText(this).apply { hint = "Model (e.g. Swift)"; setSingleLine(true) }
        val etYear = EditText(this).apply { hint = "Year"; setSingleLine(true); inputType = android.text.InputType.TYPE_CLASS_NUMBER }
        val btnAdd = MaterialButton(this).apply { text = "Add Car" }

        root.addView(etBrand)
        root.addView(etModel)
        root.addView(etYear)
        root.addView(btnAdd)

        val listTitle = TextView(this).apply { text = "\nMy Cars"; textSize = 18f }
        root.addView(listTitle)
        val list = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL }
        root.addView(list)

        scroll.addView(root)
        setContentView(scroll)

        refresh(list)

        btnAdd.setOnClickListener {
            val brand = etBrand.text.toString().trim()
            val model = etModel.text.toString().trim()
            if (brand.isEmpty() || model.isEmpty()) {
                Toast.makeText(this, "Brand and model required", Toast.LENGTH_SHORT).show()
                return@setOnClickListener
            }
            val obj = JSONObject()
                .put("user_id", Session.uid())
                .put("brand", brand)
                .put("model", model)
                .put("year", etYear.text.toString().trim().toIntOrNull() ?: 0)
            Thread {
                try {
                    Supabase.insert("gs_cars", obj)
                    runOnUiThread {
                        etBrand.text.clear(); etModel.text.clear(); etYear.text.clear()
                        Toast.makeText(this, "Car added", Toast.LENGTH_SHORT).show()
                        refresh(list)
                    }
                } catch (e: Exception) {
                    runOnUiThread { Toast.makeText(this, e.message ?: "Failed", Toast.LENGTH_SHORT).show() }
                }
            }.start()
        }
    }

    private fun refresh(list: LinearLayout) {
        Thread {
            try {
                val uid = Session.uid() ?: return@Thread
                val arr = Supabase.select("gs_cars", "user_id=eq.$uid&order=created_at.desc")
                runOnUiThread {
                    list.removeAllViews()
                    if (arr.length() == 0) {
                        list.addView(TextView(this).apply { text = "No cars added yet." })
                        return@runOnUiThread
                    }
                    for (i in 0 until arr.length()) {
                        val c = arr.getJSONObject(i)
                        val card = LinearLayout(this).apply {
                            orientation = LinearLayout.VERTICAL
                            setPadding(16, 16, 16, 16)
                            background = android.graphics.drawable.ColorDrawable(android.graphics.Color.parseColor("#F2F5F9"))
                            layoutParams = LinearLayout.LayoutParams(
                                LinearLayout.LayoutParams.MATCH_PARENT,
                                LinearLayout.LayoutParams.WRAP_CONTENT
                            ).apply { bottomMargin = 12 }
                        }
                        val line = TextView(this).apply {
                            text = "${c.optString("brand")} ${c.optString("model")} (${c.optString("year")})  [ID: ${c.optLong("id")}]"
                            textSize = 16f
                        }
                        card.addView(line)
                        list.addView(card)
                    }
                }
            } catch (e: Exception) {
                runOnUiThread { Toast.makeText(this, e.message ?: "Error", Toast.LENGTH_SHORT).show() }
            }
        }.start()
    }
}
