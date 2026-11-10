package com.beyondlimits.app;

import android.os.Bundle;
import android.webkit.CookieManager;
import android.webkit.WebSettings;
import android.webkit.WebView;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    private BiometricBridge biometricBridge;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        initCustomSettings();
    }

    @Override
    public void onResume() {
        super.onResume();
        initCustomSettings();
    }

    private void initCustomSettings() {
        if (getBridge() != null && getBridge().getWebView() != null) {
            WebView webView = getBridge().getWebView();
            WebSettings settings = webView.getSettings();
            settings.setJavaScriptEnabled(true);
            settings.setDomStorageEnabled(true);
            settings.setDatabaseEnabled(true);
            settings.setMediaPlaybackRequiresUserGesture(false);
            settings.setJavaScriptCanOpenWindowsAutomatically(true);
            settings.setSupportMultipleWindows(false);

            // Enable first-party and third-party cookies (essential for Google OAuth & Clerk tokens)
            CookieManager cookieManager = CookieManager.getInstance();
            cookieManager.setAcceptCookie(true);
            cookieManager.setAcceptThirdPartyCookies(webView, true);

            // Strip '; wv' and 'Version/X.X' so Google OAuth recognizes the WebView
            // as standard Android Chrome without blocking with disallowed_useragent
            String ua = settings.getUserAgentString();
            if (ua != null) {
                String cleanUa = ua.replace("; wv", "").replaceAll("Version/\\d+\\.\\d+\\s?", "");
                settings.setUserAgentString(cleanUa);
            }

            if (biometricBridge == null) {
                biometricBridge = new BiometricBridge(this, webView);
                webView.addJavascriptInterface(biometricBridge, "AndroidBiometricBridge");
            }
        }
    }
}
