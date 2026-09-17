package com.garshop.userweb

import android.annotation.SuppressLint
import android.content.ContentValues
import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.provider.MediaStore
import android.webkit.ValueCallback
import android.webkit.WebChromeClient
import android.webkit.WebResourceRequest
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.appcompat.app.AppCompatActivity

class MainActivity : AppCompatActivity() {

    private lateinit var webView: WebView
    private var pendingGarageId: String? = null
    private var fileChooserCallback: ValueCallback<Array<Uri>>? = null
    private var cameraUri: Uri? = null

    companion object {
        const val BASE_URL = "https://HetanshTechnologie.github.io/Applications/garshop/user-web/index.html"
        const val BIND_HOST = "bind"
        private const val FILE_CHOOSER_REQUEST = 1001
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        webView = WebView(this)
        configureWebView()
        setContentView(webView)
        handleIntent(intent)
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        handleIntent(intent)
    }

    private fun handleIntent(intent: Intent?) {
        intent?.data?.let { uri ->
            if (uri.scheme == "garshop" && uri.host == BIND_HOST) {
                uri.getQueryParameter("garage_id")?.let { pendingGarageId = it }
            }
        }
        loadApp()
    }

    private fun loadApp() {
        val url = if (pendingGarageId != null) {
            "$BASE_URL?bind_garage_id=$pendingGarageId"
        } else {
            BASE_URL
        }
        webView.loadUrl(url)
    }

    @SuppressLint("SetJavaScriptEnabled")
    private fun configureWebView() {
        val settings = webView.settings
        settings.javaScriptEnabled = true
        settings.domStorageEnabled = true
        settings.databaseEnabled = true
        settings.allowFileAccess = false
        settings.javaScriptCanOpenWindowsAutomatically = true
        settings.setSupportMultipleWindows(true)
        settings.loadWithOverviewMode = true
        settings.useWideViewPort = true
        webView.webViewClient = object : WebViewClient() {
            override fun shouldOverrideUrlLoading(view: WebView, request: WebResourceRequest): Boolean {
                val url = request.url ?: return false
                if (url.scheme == "garshop" && url.host == BIND_HOST) {
                    pendingGarageId = url.getQueryParameter("garage_id")
                    loadApp()
                    return true
                }
                if (url.host == null || url.scheme == "http" || url.scheme == "https") {
                    return false
                }
                try {
                    startActivity(Intent(Intent.ACTION_VIEW, url))
                } catch (e: Exception) { /* no handler */ }
                return true
            }
        }
        webView.webChromeClient = object : WebChromeClient() {
            override fun onShowFileChooser(
                webView: WebView,
                filePathCallback: ValueCallback<Array<Uri>>,
                fileChooserParams: FileChooserParams
            ): Boolean {
                fileChooserCallback?.onReceiveValue(null)
                fileChooserCallback = filePathCallback

                val captureIntent = Intent(MediaStore.ACTION_IMAGE_CAPTURE).apply {
                    cameraUri = createImageUri()
                    putExtra(MediaStore.EXTRA_OUTPUT, cameraUri)
                }
                val galleryIntent = Intent(Intent.ACTION_GET_CONTENT).apply {
                    addCategory(Intent.CATEGORY_OPENABLE)
                    type = "image/*"
                }
                val chooser = Intent.createChooser(galleryIntent, "Choose photo").apply {
                    putExtra(Intent.EXTRA_INITIAL_INTENTS, arrayOf(captureIntent))
                }
                return try {
                    startActivityForResult(chooser, FILE_CHOOSER_REQUEST)
                    true
                } catch (e: Exception) {
                    fileChooserCallback?.onReceiveValue(null)
                    fileChooserCallback = null
                    cameraUri = null
                    false
                }
            }

            override fun onCreateWindow(
                view: WebView,
                isDialog: Boolean,
                isUserGesture: Boolean,
                resultMsg: android.os.Message
            ): Boolean {
                val transport = resultMsg.obj as android.webkit.WebView.WebViewTransport
                val child = WebView(view.context)
                child.settings.javaScriptEnabled = true
                child.webViewClient = object : WebViewClient() {
                    override fun shouldOverrideUrlLoading(v: WebView, request: WebResourceRequest): Boolean {
                        val url = request.url ?: return false
                        if (url.scheme == "http" || url.scheme == "https") {
                            if (url.host?.endsWith("hetanshtechnologie.github.io") == true) {
                                webView.loadUrl(url.toString())
                            } else {
                                try { startActivity(Intent(Intent.ACTION_VIEW, url)) } catch (e: Exception) {}
                            }
                        } else {
                            try { startActivity(Intent(Intent.ACTION_VIEW, url)) } catch (e: Exception) {}
                        }
                        return true
                    }
                }
                transport.webView = child
                resultMsg.sendToTarget()
                return true
            }
        }
    }

    private fun createImageUri(): Uri {
        val values = ContentValues().apply {
            put(MediaStore.Images.Media.DISPLAY_NAME, "gs_photo_${System.currentTimeMillis()}.jpg")
            put(MediaStore.Images.Media.MIME_TYPE, "image/jpeg")
        }
        return contentResolver.insert(MediaStore.Images.Media.EXTERNAL_CONTENT_URI, values)!!
    }

    @Suppress("DEPRECATION")
    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        if (requestCode == FILE_CHOOSER_REQUEST) {
            var results: Array<Uri>? = null
            if (resultCode == RESULT_OK) {
                results = when {
                    data?.data != null -> arrayOf(data.data!!)
                    cameraUri != null -> arrayOf(cameraUri!!)
                    else -> null
                }
            }
            fileChooserCallback?.onReceiveValue(results ?: arrayOf())
            fileChooserCallback = null
            cameraUri = null
            return
        }
        super.onActivityResult(requestCode, resultCode, data)
    }

    @Deprecated("Deprecated in Java")
    override fun onBackPressed() {
        if (webView.canGoBack()) webView.goBack() else super.onBackPressed()
    }

    override fun onSaveInstanceState(outState: Bundle) {
        super.onSaveInstanceState(outState)
        webView.saveState(outState)
    }

    override fun onRestoreInstanceState(savedInstanceState: Bundle) {
        super.onRestoreInstanceState(savedInstanceState)
        webView.restoreState(savedInstanceState)
    }
}
