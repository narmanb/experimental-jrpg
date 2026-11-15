package com.narmanb.ashglade;

import android.app.Activity;
import android.os.Build;
import android.os.Bundle;
import android.view.View;
import android.view.WindowInsets;
import android.view.WindowInsetsController;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.webkit.WebChromeClient;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.util.HashMap;
import java.util.Map;

/** Offline shell: only this APK's assets can be loaded, on a local secure origin. */
public final class MainActivity extends Activity {
    private static final String HOST = "appassets.androidplatform.net";
    private static final String PREFIX = "/game/";
    private WebView webView;

    @Override public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        webView = new WebView(this);
        webView.setBackgroundColor(0xff15231f);
        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(false);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        settings.setMediaPlaybackRequiresUserGesture(true);
        settings.setSupportMultipleWindows(false);
        webView.setWebChromeClient(new WebChromeClient());
        webView.setWebViewClient(new WebViewClient() {
            @Override public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                return !local(request);
            }
            @Override public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                if (!local(request) || !"GET".equals(request.getMethod())) return missing();
                String path = request.getUrl().getPath().substring(PREFIX.length());
                if (path.isEmpty()) path = "index.html";
                for (String segment : path.split("/")) if (segment.equals("..") || segment.equals(".")) return missing();
                try {
                    String mime = path.endsWith(".js") ? "text/javascript" : path.endsWith(".css") ? "text/css" :
                        path.endsWith(".html") ? "text/html" : path.endsWith(".png") ? "image/png" : "application/octet-stream";
                    Map<String, String> headers = new HashMap<>();
                    headers.put("Content-Security-Policy", "default-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'none'; base-uri 'none'");
                    headers.put("X-Content-Type-Options", "nosniff");
                    return new WebResourceResponse(mime, "UTF-8", 200, "OK", headers, getAssets().open("public/" + path));
                } catch (IOException ignored) { return missing(); }
            }
            @Override public void onPageFinished(WebView view, String url) {
                // The native window already fills the screen; the browser fullscreen button is redundant.
                view.evaluateJavascript("{const b=document.getElementById('fullscreen-button');if(b)b.hidden=true}", null);
            }
        });
        setContentView(webView);
        if (Build.VERSION.SDK_INT >= 28) webView.setOnApplyWindowInsetsListener((view, insets) -> {
            android.view.DisplayCutout cutout = insets.getDisplayCutout();
            if (cutout != null) view.setPadding(cutout.getSafeInsetLeft(), cutout.getSafeInsetTop(), cutout.getSafeInsetRight(), cutout.getSafeInsetBottom());
            return insets;
        });
        immersive();
        webView.loadUrl("https://" + HOST + PREFIX + "compatibility.html");
    }

    private static boolean local(WebResourceRequest request) {
        return "https".equals(request.getUrl().getScheme()) && HOST.equals(request.getUrl().getHost()) &&
            request.getUrl().getPath() != null && request.getUrl().getPath().startsWith(PREFIX);
    }
    private static WebResourceResponse missing() {
        return new WebResourceResponse("text/plain", "UTF-8", 404, "Not Found", new HashMap<>(), new ByteArrayInputStream(new byte[0]));
    }
    @SuppressWarnings("deprecation") private void immersive() {
        if (Build.VERSION.SDK_INT >= 30) {
            WindowInsetsController controller = getWindow().getInsetsController();
            if (controller != null) {
                controller.hide(WindowInsets.Type.systemBars());
                controller.setSystemBarsBehavior(WindowInsetsController.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE);
            }
        } else getWindow().getDecorView().setSystemUiVisibility(View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY | View.SYSTEM_UI_FLAG_FULLSCREEN |
            View.SYSTEM_UI_FLAG_HIDE_NAVIGATION | View.SYSTEM_UI_FLAG_LAYOUT_STABLE | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION);
    }
    @Override public void onWindowFocusChanged(boolean focused) { super.onWindowFocusChanged(focused); if (focused) immersive(); }
    @Override protected void onPause() { if (webView != null) { webView.onPause(); webView.pauseTimers(); } super.onPause(); }
    @Override protected void onResume() { super.onResume(); if (webView != null) { webView.resumeTimers(); webView.onResume(); } }
    @Override protected void onDestroy() { if (webView != null) { webView.destroy(); webView = null; } super.onDestroy(); }
    @SuppressWarnings("deprecation") @Override public void onBackPressed() {
        webView.evaluateJavascript("(()=>{const d=document.querySelector('dialog[open]');if(d){d.querySelector('[data-close]')?.click()}else{document.getElementById('menu-button').click()}})()", null);
    }
}
