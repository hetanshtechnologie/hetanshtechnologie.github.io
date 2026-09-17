package com.garshop.ownerweb

import android.annotation.SuppressLint
import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.webkit.WebChromeClient
import android.webkit.WebResourceRequest
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.appcompat.app.AppCompatActivity

class MainActivity : AppCompatActivity() {

    private lateinit var webView: WebView

    companion object {
        const val BASE_URL = "https://HetanshTechnologie.github.io/Applications/garshop/owner-web/index.html"
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        webView = WebView(this)
        configureWebView()
        setContentView(webView)
        webView.loadUrl(BASE_URL)
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
