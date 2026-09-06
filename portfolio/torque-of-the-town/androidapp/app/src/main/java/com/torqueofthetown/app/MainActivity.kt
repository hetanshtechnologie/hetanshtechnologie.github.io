package com.torqueofthetown.app

import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import com.torqueofthetown.app.databinding.ActivityMainBinding

class MainActivity : AppCompatActivity() {

    private lateinit var binding: ActivityMainBinding

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityMainBinding.inflate(layoutInflater)
        setContentView(binding.root)

        binding.btnWhatsApp.setOnClickListener { openWhatsApp() }
    }

    private fun openWhatsApp() {
        val name = binding.etName.text.toString().trim()
        val phone = binding.etPhone.text.toString().trim()
        val car = binding.etCar.text.toString().trim()
        val problem = binding.etProblem.text.toString().trim()

        if (problem.isEmpty()) {
            Toast.makeText(this, R.string.error_description, Toast.LENGTH_SHORT).show()
            binding.etProblem.requestFocus()
            return
        }

        val message = buildString {
            appendLine(getString(R.string.wa_intro))
            if (name.isNotEmpty()) appendLine(getString(R.string.wa_name, name))
            if (phone.isNotEmpty()) appendLine(getString(R.string.wa_phone, phone))
            if (car.isNotEmpty()) appendLine(getString(R.string.wa_car, car))
            appendLine(getString(R.string.wa_problem, problem))
            append(getString(R.string.wa_footer))
        }

        val url = "https://wa.me/911234567890?text=" + Uri.encode(message)
        val intent = Intent(Intent.ACTION_VIEW, Uri.parse(url))
        intent.setPackage("com.whatsapp")

        try {
            startActivity(intent)
        } catch (e: Exception) {
            // WhatsApp not installed - fall back to browser link
            try {
                startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(url)))
            } catch (fallback: Exception) {
                Toast.makeText(this, R.string.error_no_wa, Toast.LENGTH_LONG).show()
            }
        }
    }
}
