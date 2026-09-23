package com.hetanshtechnologie.yttrack;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.view.View;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Button;
import android.widget.TextView;

public class MainActivity extends Activity {

    private static final String HOME_URL = "https://hetanshtechnologie.github.io";
    private static final String YT_URL = "https://hetanshtechnologie.github.io/yt-track/index.html";

    private WebView webView;
    private View homeScreen;
    private View toolbar;
    private TextView title;

    @SuppressLint("SetJavaScriptEnabled")
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);

        webView = findViewById(R.id.web);
        homeScreen = findViewById(R.id.home);
        toolbar = findViewById(R.id.toolbar);
        title = findViewById(R.id.toolbar_title);

        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setAllowFileAccess(false);
        settings.setJavaScriptCanOpenWindowsAutomatically(true);
        settings.setSupportMultipleWindows(true);
        settings.setLoadWithOverviewMode(true);
        settings.setUseWideViewPort(true);

        webView.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                Uri url = request.getUrl();
                if (url != null && ("http".equals(url.getScheme()) || "https".equals(url.getScheme()))) {
                    return false;
                }
                openExternal(url);
                return true;
            }

            @Override
            public void onReceivedError(WebView view, int errorCode, String description, String failingUrl) {
                title.setText("Hetansh Tech");
            }
        });

        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public boolean onCreateWindow(WebView view, boolean isDialog, boolean isUserGesture, android.os.Message resultMsg) {
                WebView.WebViewTransport transport = (WebView.WebViewTransport) resultMsg.obj;
                final WebView child = new WebView(view.getContext());
                child.getSettings().setJavaScriptEnabled(true);
                child.setWebViewClient(new WebViewClient() {
                    @Override
                    public boolean shouldOverrideUrlLoading(WebView v, WebResourceRequest request) {
                        Uri url = request.getUrl();
                        if (url == null) return true;
                        if ("http".equals(url.getScheme()) || "https".equals(url.getScheme())) {
                            if (url.getHost() != null && url.getHost().endsWith("hetanshtechnologie.github.io")) {
                                webView.loadUrl(url.toString());
                            } else {
                                openExternal(url);
                            }
                        } else {
                            openExternal(url);
                        }
                        return true;
                    }
                });
                transport.setWebView(child);
                resultMsg.sendToTarget();
                return true;
            }
        });

        webView.setDownloadListener((url, userAgent, contentDisposition, mimetype, contentLength) ->
                openExternal(Uri.parse(url)));

        ((Button) findViewById(R.id.btn_site)).setOnClickListener(v -> open(HOME_URL));
        ((Button) findViewById(R.id.btn_yttrack)).setOnClickListener(v -> open(YT_URL));
        findViewById(R.id.btn_home).setOnClickListener(v -> goHome());
    }

    private void open(String url) {
        homeScreen.setVisibility(View.GONE);
        toolbar.setVisibility(View.VISIBLE);
        title.setText("Hetansh Tech");
        webView.setVisibility(View.VISIBLE);
        webView.loadUrl(url);
    }

    private void goHome() {
        webView.setVisibility(View.GONE);
        toolbar.setVisibility(View.GONE);
        homeScreen.setVisibility(View.VISIBLE);
    }

    private void openExternal(Uri uri) {
        if (uri == null) return;
        try {
            startActivity(new Intent(Intent.ACTION_VIEW, uri));
        } catch (Exception ignored) {
            /* no handler for this scheme */
        }
    }

    @Override
    public void onBackPressed() {
        if (webView.getVisibility() == View.VISIBLE && webView.canGoBack()) {
            webView.goBack();
        } else {
            super.onBackPressed();
        }
    }

    @Override
    protected void onPause() {
        super.onPause();
        webView.onPause();
    }

    @Override
    protected void onResume() {
        super.onResume();
        webView.onResume();
    }

    @Override
    protected void onDestroy() {
        webView.destroy();
        super.onDestroy();
    }
}