package com.garshop.owner.ui

import android.os.Bundle
import com.google.android.material.button.MaterialButton
import android.widget.EditText
import android.widget.LinearLayout
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import com.garshop.owner.api.Session
import com.garshop.owner.api.Supabase
import org.json.JSONObject

class AuthActivity : AppCompatActivity() {

    private lateinit var etName: EditText
    private lateinit var etEmail: EditText
    private lateinit var etPassword: EditText
    private lateinit var btnSubmit: MaterialButton
    private lateinit var tvToggle: TextView
    private var isRegister = false

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        Session.init(this)

        val root = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(48, 80, 48, 48)
        }

        val title = TextView(this).apply {
            text = "GarShop Garage Owner"
            textSize = 26f
            setPadding(0, 0, 0, 8)
        }
        val subtitle = TextView(this).apply {
            text = "Manage your garage shop"
            setPadding(0, 0, 0, 32)
        }

        etName = EditText(this).apply { hint = "Full name"; setSingleLine(true) }
        etEmail = EditText(this).apply { hint = "Email"; setSingleLine(true); inputType = android.text.InputType.TYPE_TEXT_VARIATION_EMAIL_ADDRESS }
        etPassword = EditText(this).apply {
            hint = "Password"
            setSingleLine(true)
            inputType = android.text.InputType.TYPE_TEXT_VARIATION_PASSWORD or android.text.InputType.TYPE_CLASS_TEXT
        }
        btnSubmit = MaterialButton(this).apply { text = "Login" }
        tvToggle = TextView(this).apply {
            text = "New garage owner? Register"
            setPadding(0, 24, 0, 0)
            setOnClickListener {
                isRegister = !isRegister
                btnSubmit.text = if (isRegister) "Register" else "Login"
                etName.visibility = if (isRegister) android.view.View.VISIBLE else android.view.View.GONE
                tvToggle.text = if (isRegister) "Already have an account? Login" else "New garage owner? Register"
            }
        }

        root.addView(title)
        root.addView(subtitle)
        root.addView(etName)
        root.addView(etEmail)
        root.addView(etPassword)
        root.addView(btnSubmit)
        root.addView(tvToggle)

        setContentView(root)

        btnSubmit.setOnClickListener { doAuth() }
    }

    private fun doAuth() {
        val email = etEmail.text.toString().trim()
        val password = etPassword.text.toString().trim()
        if (email.isEmpty() || password.isEmpty()) {
            Toast.makeText(this, "Enter email and password", Toast.LENGTH_SHORT).show()
            return
        }
        btnSubmit.isEnabled = false
        Thread {
            try {
                if (isRegister) {
                    val name = etName.text.toString().trim()
                    if (name.isEmpty()) throw RuntimeException("Enter your name")
                    Supabase.signUp(email, password)
                    val signin = Supabase.signIn(email, password)
                    val uid = signin.optString("user").let { JSONObject(it).optString("id") }
                    Supabase.accessToken = signin.optString("access_token")
                    val profile = JSONObject().put("user_id", uid).put("full_name", name).put("role", "owner")
                    Supabase.insert("gs_profiles", profile)
                    Session.save(signin.optString("access_token"), uid, email)
                    runOnUiThread {
                        Toast.makeText(this, "Registered. Waiting for admin approval of your garage.", Toast.LENGTH_LONG).show()
                        finish()
                    }
                } else {
                    val signin = Supabase.signIn(email, password)
                    val uid = signin.optString("user").let { JSONObject(it).optString("id") }
                    Session.save(signin.optString("access_token"), uid, email)
                    runOnUiThread { finish() }
                }
            } catch (e: Exception) {
                runOnUiThread {
                    btnSubmit.isEnabled = true
                    Toast.makeText(this, e.message ?: "Auth failed", Toast.LENGTH_LONG).show()
                }
            }
        }.start()
    }
}
