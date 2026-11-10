package com.beyondlimits.app;

import android.os.Build;
import android.os.Handler;
import android.os.Looper;
import android.webkit.JavascriptInterface;
import android.webkit.WebView;
import androidx.annotation.NonNull;
import androidx.biometric.BiometricManager;
import androidx.biometric.BiometricPrompt;
import androidx.core.content.ContextCompat;
import java.util.concurrent.Executor;

public class BiometricBridge {
    private final MainActivity activity;
    private final WebView webView;
    private final Handler mainHandler;

    public BiometricBridge(MainActivity activity, WebView webView) {
        this.activity = activity;
        this.webView = webView;
        this.mainHandler = new Handler(Looper.getMainLooper());
    }

    @JavascriptInterface
    public boolean isAvailable() {
        try {
            android.app.KeyguardManager keyguardManager = (android.app.KeyguardManager) activity.getSystemService(android.content.Context.KEYGUARD_SERVICE);
            if (keyguardManager != null && keyguardManager.isDeviceSecure()) {
                return true;
            }

            BiometricManager biometricManager = BiometricManager.from(activity);
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                int authenticators = BiometricManager.Authenticators.BIOMETRIC_STRONG | BiometricManager.Authenticators.DEVICE_CREDENTIAL;
                return biometricManager.canAuthenticate(authenticators) == BiometricManager.BIOMETRIC_SUCCESS;
            } else {
                return biometricManager.canAuthenticate() == BiometricManager.BIOMETRIC_SUCCESS;
            }
        } catch (Exception e) {
            return true;
        }
    }

    @JavascriptInterface
    public void authenticate(final String title, final String subtitle) {
        mainHandler.post(new Runnable() {
            @Override
            public void run() {
                try {
                    Executor executor = ContextCompat.getMainExecutor(activity);
                    BiometricPrompt biometricPrompt = new BiometricPrompt(activity, executor,
                        new BiometricPrompt.AuthenticationCallback() {
                            @Override
                            public void onAuthenticationSucceeded(@NonNull BiometricPrompt.AuthenticationResult result) {
                                super.onAuthenticationSucceeded(result);
                                notifyJsResult(true, null);
                            }

                            @Override
                            public void onAuthenticationError(int errorCode, @NonNull CharSequence errString) {
                                super.onAuthenticationError(errorCode, errString);
                                if (errorCode == BiometricPrompt.ERROR_USER_CANCELED ||
                                    errorCode == BiometricPrompt.ERROR_NEGATIVE_BUTTON ||
                                    errorCode == BiometricPrompt.ERROR_CANCELED) {
                                    notifyJsResult(false, "Authentication was cancelled");
                                } else {
                                    notifyJsResult(false, errString.toString());
                                }
                            }

                            @Override
                            public void onAuthenticationFailed() {
                                super.onAuthenticationFailed();
                                // Biometric attempt failed (e.g. wrong finger), Android will prompt user again.
                            }
                        }
                    );

                    BiometricPrompt.PromptInfo.Builder promptInfoBuilder = new BiometricPrompt.PromptInfo.Builder()
                        .setTitle(title != null && !title.trim().isEmpty() ? title : "BeyondLimits Authentication")
                        .setSubtitle(subtitle != null && !subtitle.trim().isEmpty() ? subtitle : "Touch fingerprint sensor or use screen lock");

                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                        promptInfoBuilder.setAllowedAuthenticators(
                            BiometricManager.Authenticators.BIOMETRIC_STRONG | BiometricManager.Authenticators.DEVICE_CREDENTIAL
                        );
                    } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                        promptInfoBuilder.setDeviceCredentialAllowed(true);
                    } else {
                        promptInfoBuilder.setNegativeButtonText("Cancel");
                    }

                    biometricPrompt.authenticate(promptInfoBuilder.build());
                } catch (Exception e) {
                    notifyJsResult(false, e.getMessage());
                }
            }
        });
    }

    private void notifyJsResult(final boolean success, final String error) {
        mainHandler.post(new Runnable() {
            @Override
            public void run() {
                try {
                    String script;
                    if (success) {
                        script = "if (window.__onAndroidBiometricResult) { window.__onAndroidBiometricResult({ success: true }); }";
                    } else {
                        String safeError = error != null ? error.replace("'", "\\'").replace("\n", " ") : "Authentication failed";
                        script = "if (window.__onAndroidBiometricResult) { window.__onAndroidBiometricResult({ success: false, error: '" + safeError + "' }); }";
                    }
                    webView.evaluateJavascript(script, null);
                } catch (Exception ignored) {
                }
            }
        });
    }
}

