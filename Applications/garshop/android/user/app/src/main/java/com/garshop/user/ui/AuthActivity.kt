package com.garshop.user.ui

import android.os.Bundle
import com.google.android.material.button.MaterialButton
import android.widget.EditText
import android.widget.LinearLayout
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import com.garshop.user.api.Session
import com.garshop.user.api.Supabase
import org.json.JSONObject

class AuthActivity : AppCompatActivity() {

    private lateinit var etName: EditText
    private lateinit var etPhone: EditText
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

        root.addView(TextView(this).apply {
            text = "GarShop"
            textSize = 28f
            setPadding(0, 0, 0, 4)
        })
        root.addView(TextView(this).apply {
            text = "Find a garage & book your service"
            setPadding(0, 0, 0, 32)
        })

        etName = EditText(this).apply { hint = "Full name"; setSingleLine(true) }
        etPhone = EditText(this).apply { hint = "Phone"; setSingleLine(true); inputType = android.text.InputType.TYPE_CLASS_PHONE }
        etEmail = EditText(this).apply { hint = "Email"; setSingleLine(true); inputType = android.text.InputType.TYPE_TEXT_VARIATION_EMAIL_ADDRESS }
        etPassword = EditText(this).apply {
            hint = "Password"
            setSingleLine(true)
            inputType = android.text.InputType.TYPE_TEXT_VARIATION_PASSWORD or android.text.InputType.TYPE_CLASS_TEXT
        }
        btnSubmit = MaterialButton(this).apply { text = "Login" }
        tvToggle = TextView(this).apply {
            text = "New user? Register"
            setPadding(0, 24, 0, 0)
            setOnClickListener {
                isRegister = !isRegister
                btnSubmit.text = if (isRegister) "Register" else "Login"
                etName.visibility = if (isRegister) android.view.View.VISIBLE else android.view.View.GONE
                etPhone.visibility = if (isRegister) android.view.View.VISIBLE else android.view.View.GONE
                tvToggle.text = if (isRegister) "Already have an account? Login" else "New user? Register"
            }
        }

        root.addView(etName)
        root.addView(etPhone)
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
                    val phone = etPhone.text.toString().trim()
                    if (name.isEmpty()) throw RuntimeException("Enter your name")
                    Supabase.signUp(email, password)
                    val signin = Supabase.signIn(email, password)
                    val uid = JSONObject(signin.optString("user")).optString("id")
                    Supabase.accessToken = signin.optString("access_token")
                    val profile = JSONObject()
                        .put("user_id", uid)
                        .put("full_name", name)
                        .put("phone", phone)
                        .put("role", "user")
                    Supabase.insert("gs_profiles", profile)
                    syncBinding(uid)
                    Session.save(signin.optString("access_token"), uid, email)
                    runOnUiThread {
                        Toast.makeText(this, "Registered successfully!", Toast.LENGTH_SHORT).show()
                        finish()
                    }
                } else {
                    val signin = Supabase.signIn(email, password)
                    val uid = JSONObject(signin.optString("user")).optString("id")
                    syncBinding(uid)
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

    private fun syncBinding(uid: String) {
        val gid = Session.garageId() ?: return
        try {
            val existing = Supabase.select("gs_garage_users", "user_id=eq.$uid&garage_id=eq.$gid")
            if (existing.length() == 0) {
                Supabase.insert("gs_garage_users", JSONObject().put("user_id", uid).put("garage_id", gid))
            }
        } catch (e: Exception) { /* non-fatal: binding sync failure should not block auth */ }
    }
}
