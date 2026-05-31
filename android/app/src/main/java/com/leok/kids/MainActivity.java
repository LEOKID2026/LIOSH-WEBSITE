package com.leok.kids;

import android.graphics.Color;
import android.os.Bundle;
import android.view.View;
import android.webkit.WebView;
import androidx.activity.OnBackPressedCallback;
import androidx.appcompat.app.ActionBar;
import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import com.getcapacitor.BridgeActivity;

/**
 * Applies system bar inset padding to the Capacitor WebView container so remote
 * website content is not drawn under the Android status/navigation bars.
 * Website CSS is unchanged; this is shell-only safe-area handling.
 */
public class MainActivity extends BridgeActivity {

    private static final int APP_BACKGROUND = Color.parseColor("#050816");

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        hideNativeActionBar();
        configureSystemBarAppearance();
        registerWebViewBackHandler();
    }

    @Override
    public void onResume() {
        super.onResume();
        if (getWindow() != null && getWindow().getDecorView() != null) {
            getWindow().getDecorView().post(this::applyWebViewSystemBarInsets);
        }
    }

    /**
     * Android Back: go back inside the WebView when history exists; otherwise use
     * the default activity behavior (leave the app).
     */
    private void registerWebViewBackHandler() {
        getOnBackPressedDispatcher().addCallback(
            this,
            new OnBackPressedCallback(true) {
                @Override
                public void handleOnBackPressed() {
                    WebView webView = getBridge() != null ? getBridge().getWebView() : null;
                    if (webView != null && webView.canGoBack()) {
                        webView.goBack();
                        return;
                    }
                    setEnabled(false);
                    MainActivity.this.getOnBackPressedDispatcher().onBackPressed();
                }
            }
        );
    }

    private void hideNativeActionBar() {
        ActionBar actionBar = getSupportActionBar();
        if (actionBar != null) {
            actionBar.hide();
        }
    }

    private void configureSystemBarAppearance() {
        getWindow().setStatusBarColor(APP_BACKGROUND);
        getWindow().setNavigationBarColor(APP_BACKGROUND);
        WindowInsetsControllerCompat controller = WindowCompat.getInsetsController(
            getWindow(),
            getWindow().getDecorView()
        );
        if (controller != null) {
            controller.setAppearanceLightStatusBars(false);
            controller.setAppearanceLightNavigationBars(false);
        }
    }

    private void applyWebViewSystemBarInsets() {
        if (getBridge() == null) {
            return;
        }

        WebView webView = getBridge().getWebView();
        if (webView == null) {
            return;
        }

        View container = (View) webView.getParent();
        if (container == null) {
            return;
        }

        ViewCompat.setOnApplyWindowInsetsListener(container, (v, insets) -> {
            Insets systemBars = insets.getInsets(
                WindowInsetsCompat.Type.systemBars() | WindowInsetsCompat.Type.displayCutout()
            );
            Insets imeInsets = insets.getInsets(WindowInsetsCompat.Type.ime());
            boolean keyboardVisible = insets.isVisible(WindowInsetsCompat.Type.ime());
            int bottomInset = keyboardVisible ? imeInsets.bottom : systemBars.bottom;

            v.setPadding(systemBars.left, systemBars.top, systemBars.right, bottomInset);
            return WindowInsetsCompat.CONSUMED;
        });

        ViewCompat.requestApplyInsets(container);
    }
}
