package com.quickbite.app;

import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.webkit.CookieManager;
import android.webkit.WebResourceRequest;
import android.webkit.WebView;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.BridgeWebViewClient;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Ensure persistent HTTP cookies across app lifecycles for Supabase Auth
        CookieManager cookieManager = CookieManager.getInstance();
        cookieManager.setAcceptCookie(true);

        WebView webView = getBridge().getWebView();
        if (webView != null) {
            cookieManager.setAcceptThirdPartyCookies(webView, true);

            // Configure WebView Client to intercept and delegate UPI payment intents
            webView.setWebViewClient(new BridgeWebViewClient(getBridge()) {
                @Override
                public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                    Uri uri = request.getUrl();
                    if (uri != null) {
                        String scheme = uri.getScheme();
                        String url = uri.toString();

                        // Intercept UPI payment intents (Google Pay, PhonePe, Paytm, BHIM)
                        if ("upi".equalsIgnoreCase(scheme) ||
                            url.startsWith("intent://") ||
                            url.startsWith("phonepe://") ||
                            url.startsWith("paytmmp://") ||
                            url.startsWith("gpay://")) {
                            try {
                                Intent intent = Intent.parseUri(url, Intent.URI_INTENT_SCHEME);
                                view.getContext().startActivity(intent);
                                return true;
                            } catch (Exception e) {
                                // Gracefully handle if target UPI application is unavailable
                                return true;
                            }
                        }
                    }
                    return super.shouldOverrideUrlLoading(view, request);
                }
            });
        }
    }

    @Override
    protected void onPause() {
        super.onPause();
        // Flush auth session cookies to persistent storage
        CookieManager.getInstance().flush();
    }
}
