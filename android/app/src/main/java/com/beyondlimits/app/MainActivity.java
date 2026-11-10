package com.beyondlimits.app;

import android.os.Bundle;
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

            // Removing '; wv' from User Agent prevents Google OAuth from blocking the WebView
            // and stops Android from launching an external Chrome browser session.
            String ua = settings.getUserAgentString();
            if (ua != null && ua.contains("; wv")) {
                settings.setUserAgentString(ua.replace("; wv", ""));
            }

            if (biometricBridge == null) {
                biometricBridge = new BiometricBridge(this, webView);
                webView.addJavascriptInterface(biometricBridge, "AndroidBiometricBridge");
            }
        }
    }
}
