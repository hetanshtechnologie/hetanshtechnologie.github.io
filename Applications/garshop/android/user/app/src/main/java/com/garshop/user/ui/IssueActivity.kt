package com.garshop.user.ui

import android.app.Activity
import android.content.Intent
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.net.Uri
import android.os.Bundle
import android.provider.MediaStore
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
import java.io.ByteArrayOutputStream
import java.util.UUID

class IssueActivity : AppCompatActivity() {

    private lateinit var etCarId: EditText
    private lateinit var etTitle: EditText
    private lateinit var etDesc: EditText
    private lateinit var etGarageId: EditText
    private var photoBytes: ByteArray? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        Session.init(this)

        val scroll = ScrollView(this)
        val root = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(40, 64, 40, 40)
        }
        root.addView(TextView(this).apply {
            text = "Report a Car Problem"
            textSize = 24f
            setPadding(0, 0, 0, 20)
        })

        etCarId = EditText(this).apply { hint = "Car ID (from My Cars)"; setSingleLine(true); inputType = android.text.InputType.TYPE_CLASS_NUMBER }
        etTitle = EditText(this).apply { hint = "Problem title"; setSingleLine(true) }
        etDesc = EditText(this).apply { hint = "Describe the problem" }
        etGarageId = EditText(this).apply { hint = "Preferred garage ID (optional)"; setSingleLine(true); inputType = android.text.InputType.TYPE_CLASS_NUMBER }
        Session.garageId()?.let { gid ->
            etGarageId.setText(gid.toString())
            etGarageId.isEnabled = false
            etGarageId.hint = "Connected garage (locked)"
        }
        val btnPhoto = MaterialButton(this).apply { text = "Attach Photo" }
        val btnSubmit = MaterialButton(this).apply { text = "Submit Issue" }

        root.addView(etCarId)
        root.addView(etTitle)
        root.addView(etDesc)
        root.addView(etGarageId)
        root.addView(btnPhoto)
        root.addView(btnSubmit)

        scroll.addView(root)
        setContentView(scroll)

        btnPhoto.setOnClickListener {
            val intent = Intent(Intent.ACTION_PICK, MediaStore.Images.Media.EXTERNAL_CONTENT_URI)
            startActivityForResult(intent, 100)
        }

        btnSubmit.setOnClickListener {
            val carId = etCarId.text.toString().trim()
            val title = etTitle.text.toString().trim()
            if (carId.isEmpty() || title.isEmpty()) {
                Toast.makeText(this, "Car ID and title required", Toast.LENGTH_SHORT).show()
                return@setOnClickListener
            }
            btnSubmit.isEnabled = false
            Thread {
                try {
                    var photoUrl = ""
                    if (photoBytes != null) {
                        photoUrl = Supabase.upload("gs_images", "${Session.uid()}/${UUID.randomUUID()}.jpg", photoBytes!!, "image/jpeg")
                    }
                    val obj = JSONObject()
                        .put("user_id", Session.uid())
                        .put("car_id", carId.toLong())
                        .put("title", title)
                        .put("description", etDesc.text.toString().trim())
                        .put("photo_url", photoUrl)
                    val gid = etGarageId.text.toString().trim().toLongOrNull()
                    if (gid != null) obj.put("garage_id", gid)
                    Supabase.insert("gs_issues", obj)
                    runOnUiThread {
                        btnSubmit.isEnabled = true
                        Toast.makeText(this, "Issue submitted!", Toast.LENGTH_LONG).show()
                        finish()
                    }
                } catch (e: Exception) {
                    runOnUiThread {
                        btnSubmit.isEnabled = true
                        Toast.makeText(this, e.message ?: "Failed", Toast.LENGTH_LONG).show()
                    }
                }
            }.start()
        }
    }

    @Deprecated("Deprecated in Java")
    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        super.onActivityResult(requestCode, resultCode, data)
        if (requestCode == 100 && resultCode == Activity.RESULT_OK && data?.data != null) {
            val uri: Uri = data.data!!
            try {
                val stream = contentResolver.openInputStream(uri)
                val bitmap = BitmapFactory.decodeStream(stream)
                val scaled = Bitmap.createScaledBitmap(bitmap, 800, (bitmap.height * 800.0 / bitmap.width).toInt(), true)
                val out = ByteArrayOutputStream()
                scaled.compress(Bitmap.CompressFormat.JPEG, 80, out)
                photoBytes = out.toByteArray()
                Toast.makeText(this, "Photo attached", Toast.LENGTH_SHORT).show()
            } catch (e: Exception) {
                Toast.makeText(this, "Could not read photo", Toast.LENGTH_SHORT).show()
            }
        }
    }
}
