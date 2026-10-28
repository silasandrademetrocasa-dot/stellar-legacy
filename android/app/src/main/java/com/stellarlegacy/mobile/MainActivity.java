package com.stellarlegacy.mobile;

import android.app.Activity;
import android.content.pm.ActivityInfo;
import android.webkit.JavascriptInterface;
import android.app.AlertDialog;
import android.content.Intent;
import android.content.Context;
import android.content.SharedPreferences;
import android.security.keystore.KeyGenParameterSpec;
import android.security.keystore.KeyProperties;
import android.util.Base64;
import java.security.KeyStore;
import javax.crypto.Cipher;
import javax.crypto.KeyGenerator;
import javax.crypto.SecretKey;
import javax.crypto.spec.GCMParameterSpec;
import java.nio.charset.StandardCharsets;
import org.json.JSONObject;
import android.graphics.Color;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.webkit.SslErrorHandler;
import android.net.http.SslError;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import java.io.ByteArrayInputStream;
import java.util.Collections;
import androidx.webkit.WebViewAssetLoader;

/**
 * Stellar Legacy Android: TODOS os recursos de apresentacao vem do APK.
 * Apenas /api, /ws e endpoints explicitos de dados passam pelo HTTPS real do Render.
 * Usar o hostname de producao preserva a mesma origem da Web e permite WebSocket +
 * fetch POST autenticado SEM CORS, proxy nativo ou duplicacao de regras economicas.
 */
public final class MainActivity extends Activity {
    private WebView browser;
    private String origin;
    private String host;
    private WebViewAssetLoader localFiles;

    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        origin = BuildConfig.SERVER_ORIGIN;
        Uri endpoint = Uri.parse(origin);
        host = endpoint.getHost();
        if (!"https".equals(endpoint.getScheme()) || host == null || host.isEmpty()) {
            throw new IllegalStateException("Origem HTTPS do Render invalida");
        }
        localFiles = new WebViewAssetLoader.Builder()
            .setDomain(host)
            .addPathHandler("/", new WebViewAssetLoader.AssetsPathHandler(this))
            .build();
        showGame();
    }

    private void showGame() {
        browser = new WebView(this);
        browser.setBackgroundColor(Color.rgb(5, 11, 22));
        browser.setVerticalScrollBarEnabled(false);
        browser.setHorizontalScrollBarEnabled(false);
        browser.setOverScrollMode(WebView.OVER_SCROLL_NEVER);
        browser.setLayerType(WebView.LAYER_TYPE_HARDWARE, null);
        WebSettings settings = browser.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(false);
        settings.setCacheMode(WebSettings.LOAD_DEFAULT);
        settings.setMediaPlaybackRequiresUserGesture(true);
        settings.setJavaScriptCanOpenWindowsAutomatically(false);
        settings.setSupportMultipleWindows(false);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        WebView.setWebContentsDebuggingEnabled(BuildConfig.DEBUG);
        // Somente o WebView local recebe esta ponte restrita de orientação.
        browser.addJavascriptInterface(new OrientationBridge(), "StellarAndroid");
        // V101: sessao opt-in, criptografada pelo Android Keystore. Nenhuma senha salva.
        browser.addJavascriptInterface(new SessionVaultBridge(), "StellarSessionVault");
        browser.setWebChromeClient(new WebChromeClient());
        browser.setWebViewClient(new WebViewClient() {
            @Override public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                Uri url = request.getUrl();
                if (!"https".equals(url.getScheme()) || !host.equalsIgnoreCase(url.getHost())) return null;
                String path = url.getPath();
                if (path == null) return null;
                // SOMENTE DADOS: servidor autentica, valida economia e sincroniza multiplayer.
                // WebSocket WSS /ws e aberto pelo Chromium (nao passa por WebResourceRequest).
                if (path.equals("/api") || path.startsWith("/api/") || path.equals("/ws") || path.equals("/health")) return null;
                // Todo resto, incluindo imagens, mapas, CSS, JS e JSON, SEMPRE local.
                // Arquivo ausente gera erro local; nunca cai para a rede e gasta Render.
                WebResourceResponse local = localFiles.shouldInterceptRequest(url);
                if (local != null) return local;
                // A origem remota jamais pode servir arte faltante para o APK.
                return new WebResourceResponse("text/plain", "UTF-8", 404, "Not Found",
                    Collections.emptyMap(), new ByteArrayInputStream(new byte[0]));
            }
            @Override public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                Uri url = request.getUrl();
                if ("https".equals(url.getScheme()) && host.equalsIgnoreCase(url.getHost())) return false;
                // Link de suporte, politicas e OAuth externo: navegador do Android.
                // Google OAuth no APK requer um fluxo de retorno via App Links dedicado.
                if ("https".equals(url.getScheme()) || "mailto".equals(url.getScheme())) {
                    try { startActivity(new Intent(Intent.ACTION_VIEW, url)); } catch (Exception ignored) { }
                }
                return true;
            }
            @Override public void onReceivedSslError(WebView view, SslErrorHandler handler, SslError error) {
                handler.cancel(); // Nunca ignorar certificados invalidos.
            }
            @Override public void onReceivedError(WebView view, WebResourceRequest request, android.webkit.WebResourceError error) {
                if (request.isForMainFrame() && browser != null) {
                    runOnUiThread(() -> new AlertDialog.Builder(MainActivity.this)
                        .setTitle("Stellar Legacy")
                        .setMessage("A tela local nao abriu. Verifique a instalacao do APK.")
                        .setPositiveButton("Reabrir", (d,w) -> browser.loadUrl(origin + "/index.html"))
                        .setNegativeButton("Fechar", (d,w) -> finish()).show());
                }
            }
        });
        setContentView(browser);
        // A primeira pagina e o jogo EMPACOTADO, nao o site remoto.
        browser.loadUrl(origin + "/index.html");
    }

    /**
     * Sessão persistente APENAS no APK. Token de renovação e ID de sessão ficam
     * cifrados com AES-GCM no Android Keystore, em prefs privadas e sem backup.
     * A sessão é revalidada pelo Render antes de abrir qualquer save.
     */
    private final class SessionVaultBridge {
        private static final String KEY_ALIAS = "stellar_legacy_login_v101";
        private static final String PREFS = "stellar_legacy_auth_v101";
        private static final String ENTRY = "encrypted_session";
        private final Object vaultLock = new Object();

        private SharedPreferences prefs() {
            return getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        }
        private SecretKey vaultKey() throws Exception {
            KeyStore keyStore = KeyStore.getInstance("AndroidKeyStore");
            keyStore.load(null);
            if (keyStore.containsAlias(KEY_ALIAS)) {
                return ((KeyStore.SecretKeyEntry) keyStore.getEntry(KEY_ALIAS, null)).getSecretKey();
            }
            KeyGenerator generator = KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, "AndroidKeyStore");
            generator.init(new KeyGenParameterSpec.Builder(KEY_ALIAS,
                KeyProperties.PURPOSE_ENCRYPT | KeyProperties.PURPOSE_DECRYPT)
                .setBlockModes(KeyProperties.BLOCK_MODE_GCM)
                .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
                .setKeySize(256)
                .build());
            return generator.generateKey();
        }
        @JavascriptInterface public void storeSession(String json) {
            synchronized (vaultLock) {
                if (json == null || json.length() > 8192) return;
                try {
                    JSONObject root = new JSONObject(json);
                    JSONObject auth = root.getJSONObject("session");
                    if (auth.optString("refresh_token").isEmpty() ||
                        auth.optString("game_session_id").isEmpty() ||
                        root.getJSONObject("user").optString("id").isEmpty()) return;
                    Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
                    cipher.init(Cipher.ENCRYPT_MODE, vaultKey());
                    byte[] encrypted = cipher.doFinal(json.getBytes(StandardCharsets.UTF_8));
                    String packed = "v1:"+Base64.encodeToString(cipher.getIV(),Base64.NO_WRAP)+":"+
                        Base64.encodeToString(encrypted,Base64.NO_WRAP);
                    prefs().edit().putString(ENTRY, packed).commit();
                } catch (Exception e) {
                    // Falha local não deve derrubar o jogo nem expor tokens nos logs.
                }
            }
        }
        @JavascriptInterface public String loadSession() {
            synchronized (vaultLock) {
                try {
                    String packed = prefs().getString(ENTRY, "");
                    if (packed.isEmpty()) return "";
                    String[] parts = packed.split(":",3);
                    if (parts.length != 3 || !"v1".equals(parts[0])) return "";
                    byte[] iv = Base64.decode(parts[1],Base64.NO_WRAP);
                    if (iv.length != 12) return "";
                    Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
                    cipher.init(Cipher.DECRYPT_MODE,vaultKey(),new GCMParameterSpec(128,iv));
                    byte[] plain = cipher.doFinal(Base64.decode(parts[2],Base64.NO_WRAP));
                    return new String(plain,StandardCharsets.UTF_8);
                } catch (Exception e) {
                    prefs().edit().remove(ENTRY).apply();
                    return "";
                }
            }
        }
        @JavascriptInterface public void clearSession() {
            synchronized (vaultLock) { prefs().edit().remove(ENTRY).apply(); }
        }
    }

    private final class OrientationBridge {
        @JavascriptInterface public void setLandscape(boolean landscape) {
            runOnUiThread(() -> setRequestedOrientation(landscape
                ? ActivityInfo.SCREEN_ORIENTATION_SENSOR_LANDSCAPE
                : ActivityInfo.SCREEN_ORIENTATION_UNSPECIFIED));
        }
    }

    @Override public void onBackPressed() {
        if (browser != null && browser.canGoBack()) browser.goBack();
        else moveTaskToBack(true);
    }
    @Override protected void onDestroy() {
        if (browser != null) { browser.stopLoading(); browser.destroy(); browser = null; }
        super.onDestroy();
    }
}
