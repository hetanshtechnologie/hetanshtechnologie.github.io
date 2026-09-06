package com.zippyride.driver

import android.content.Intent
import android.os.Bundle
import android.widget.Button
import android.widget.EditText
import android.widget.TextView
import android.widget.Toast
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import com.google.android.gms.auth.api.signin.GoogleSignIn
import com.google.android.gms.auth.api.signin.GoogleSignInOptions
import com.google.android.gms.common.api.ApiException
import com.zippyride.driver.BuildConfig
import com.zippyride.driver.network.Supabase
import io.github.jan.supabase.gotrue.provider.builtin.IdToken
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

class MainActivity : AppCompatActivity() {

  private val googleSignInLauncher = registerForActivityResult(
    ActivityResultContracts.StartActivityForResult()
  ) { result ->
    if (result.resultCode == RESULT_OK) {
      try {
        val account = GoogleSignIn.getSignedInAccountFromIntent(result.data)
        val idToken = account?.idToken ?: throw Exception("No ID token received")
        signInWithGoogle(idToken)
      } catch (e: ApiException) {
        Toast.makeText(this, "Google Sign-In failed: ${e.localizedMessage}", Toast.LENGTH_LONG).show()
      }
    }
  }

  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    setContentView(R.layout.activity_main)

    checkSession()

    findViewById<Button>(R.id.btn_login).setOnClickListener { login() }
    findViewById<TextView>(R.id.tv_register).setOnClickListener { register() }
    findViewById<Button>(R.id.btn_google_signin).setOnClickListener { googleSignIn() }
  }

  private fun checkSession() {
    CoroutineScope(Dispatchers.IO).launch {
      try {
        val session = Supabase.auth.currentSessionOrNull()
        if (session != null) {
          withContext(Dispatchers.Main) { goToMap() }
        }
      } catch (_: Exception) {}
    }
  }

  private fun login() {
    val email = findViewById<EditText>(R.id.et_email).text.trim().toString()
    val password = findViewById<EditText>(R.id.et_password).text.trim().toString()
    if (email.isEmpty() || password.isEmpty()) {
      Toast.makeText(this, "Enter email and password", Toast.LENGTH_SHORT).show()
      return
    }

    CoroutineScope(Dispatchers.IO).launch {
      try {
        Supabase.auth.signInWith(email, password)
        withContext(Dispatchers.Main) { goToMap() }
      } catch (e: Exception) {
        withContext(Dispatchers.Main) {
          Toast.makeText(this@MainActivity, e.message ?: "Login failed", Toast.LENGTH_LONG).show()
        }
      }
    }
  }

  private fun register() {
    val email = findViewById<EditText>(R.id.et_email).text.trim().toString()
    val password = findViewById<EditText>(R.id.et_password).text.trim().toString()
    if (email.isEmpty() || password.length < 6) {
      Toast.makeText(this, "Valid email and password (6+ chars)", Toast.LENGTH_SHORT).show()
      return
    }

    CoroutineScope(Dispatchers.IO).launch {
      try {
        Supabase.auth.signUp(email, password)
        withContext(Dispatchers.Main) {
          Toast.makeText(this@MainActivity, "Registered! Check email for verification.", Toast.LENGTH_LONG).show()
        }
      } catch (e: Exception) {
        withContext(Dispatchers.Main) {
          Toast.makeText(this@MainActivity, e.message ?: "Registration failed", Toast.LENGTH_LONG).show()
        }
      }
    }
  }

  private fun googleSignIn() {
    val gso = GoogleSignInOptions.Builder(GoogleSignInOptions.DEFAULT_SIGN_IN)
      .requestIdToken(BuildConfig.GOOGLE_WEB_CLIENT_ID)
      .requestEmail()
      .build()
    val client = GoogleSignIn.getClient(this, gso)
    googleSignInLauncher.launch(client.signInIntent)
  }

  private fun signInWithGoogle(idToken: String) {
    CoroutineScope(Dispatchers.IO).launch {
      try {
        Supabase.auth.signInWith(IdToken(provider = "google", idToken = idToken))
        withContext(Dispatchers.Main) { goToMap() }
      } catch (e: Exception) {
        withContext(Dispatchers.Main) {
          Toast.makeText(this@MainActivity, "Google Sign-In failed: ${e.message}", Toast.LENGTH_LONG).show()
        }
      }
    }
  }

  private fun goToMap() {
    startActivity(Intent(this, DriverMapActivity::class.java))
    finish()
  }
}
