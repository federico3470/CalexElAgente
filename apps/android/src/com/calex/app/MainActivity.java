package com.calex.app;

import android.Manifest;
import android.app.Activity;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.net.Uri;
import android.os.Bundle;
import android.speech.RecognitionListener;
import android.speech.RecognizerIntent;
import android.speech.SpeechRecognizer;
import android.view.View;
import android.view.Window;
import android.view.WindowManager;
import android.webkit.JavascriptInterface;
import android.webkit.PermissionRequest;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import java.util.ArrayList;

/**
 * Calex para Android y Google TV: la interfaz web a pantalla completa, sin barra de direcciones.
 * - Iniciar sesión con Google/Apple se hace en el navegador (Google no lo permite dentro de un WebView) y se vuelve a la app con calex://login?code=…
 * - El dictado por voz usa el reconocedor de Android (el WebView no trae el del navegador).
 */
public class MainActivity extends Activity {
  static final String HOST = "https://nixel.federicoreta773.workers.dev";
  static final int REQ_MIC = 7, REQ_FILE = 9;
  WebView web;
  ValueCallback<Uri[]> chooser;
  PermissionRequest pendingPerm;
  SpeechRecognizer sr;
  String pendingLang = "es-ES";

  @Override
  protected void onCreate(Bundle b) {
    super.onCreate(b);
    Window w = getWindow();
    w.setStatusBarColor(Color.parseColor("#15140f"));
    w.setNavigationBarColor(Color.parseColor("#15140f"));
    w.setSoftInputMode(WindowManager.LayoutParams.SOFT_INPUT_ADJUST_RESIZE);
    web = new WebView(this);
    web.setBackgroundColor(Color.parseColor("#15140f"));
    setContentView(web);
    WebSettings s = web.getSettings();
    s.setJavaScriptEnabled(true);
    s.setDomStorageEnabled(true);
    s.setMediaPlaybackRequiresUserGesture(false);
    s.setUserAgentString(s.getUserAgentString() + " CalexApp/1.0");
    web.addJavascriptInterface(new Bridge(), "CalexNative");
    web.setWebViewClient(new WebViewClient() {
      @Override public boolean shouldOverrideUrlLoading(WebView v, WebResourceRequest r) {
        Uri u = r.getUrl();
        String path = u.getPath() == null ? "" : u.getPath();
        if (u.toString().startsWith(HOST) && path.startsWith("/auth/start/")) { // iniciar sesión: en el navegador
          Uri out = u.buildUpon().appendQueryParameter("app", "1").build();
          try { startActivity(new Intent(Intent.ACTION_VIEW, out)); } catch (Exception e) { return false; }
          return true;
        }
        if (!u.toString().startsWith(HOST) && "https".equals(u.getScheme())) { // enlaces externos: navegador
          try { startActivity(new Intent(Intent.ACTION_VIEW, u)); return true; } catch (Exception e) { return false; }
        }
        return false;
      }
    });
    web.setWebChromeClient(new WebChromeClient() {
      @Override public void onPermissionRequest(final PermissionRequest r) {
        runOnUiThread(new Runnable() { public void run() {
          if (checkSelfPermission(Manifest.permission.RECORD_AUDIO) == PackageManager.PERMISSION_GRANTED) r.grant(r.getResources());
          else { pendingPerm = r; requestPermissions(new String[] { Manifest.permission.RECORD_AUDIO }, REQ_MIC); }
        } });
      }
      @Override public boolean onShowFileChooser(WebView w, ValueCallback<Uri[]> cb, FileChooserParams p) {
        if (chooser != null) chooser.onReceiveValue(null);
        chooser = cb;
        Intent i = new Intent(Intent.ACTION_GET_CONTENT); i.addCategory(Intent.CATEGORY_OPENABLE); i.setType("*/*");
        i.putExtra(Intent.EXTRA_ALLOW_MULTIPLE, true);
        try { startActivityForResult(Intent.createChooser(i, "Elegir archivo"), REQ_FILE); } catch (Exception e) { chooser = null; return false; }
        return true;
      }
    });
    if (!handleIntent(getIntent())) web.loadUrl(HOST);
  }

  /** calex://login?code=… → el Worker canjea el código por una sesión dentro del WebView. */
  boolean handleIntent(Intent i) {
    Uri d = i == null ? null : i.getData();
    if (d != null && "calex".equals(d.getScheme()) && "login".equals(d.getHost()) && d.getQueryParameter("code") != null) {
      web.loadUrl(HOST + "/auth/app?code=" + Uri.encode(d.getQueryParameter("code")));
      return true;
    }
    return false;
  }

  @Override protected void onNewIntent(Intent i) { super.onNewIntent(i); setIntent(i); handleIntent(i); }

  void js(final String code) { runOnUiThread(new Runnable() { public void run() { web.evaluateJavascript(code, null); } }); }

  /** Puente del dictado por voz hacia la página (ver el código de CalexNative en la interfaz). */
  class Bridge {
    @JavascriptInterface public void start(final String lang) {
      runOnUiThread(new Runnable() { public void run() {
        pendingLang = lang;
        if (checkSelfPermission(Manifest.permission.RECORD_AUDIO) != PackageManager.PERMISSION_GRANTED) { requestPermissions(new String[] { Manifest.permission.RECORD_AUDIO }, REQ_MIC + 1); return; }
        listen();
      } });
    }
    @JavascriptInterface public void stop() { runOnUiThread(new Runnable() { public void run() { if (sr != null) sr.stopListening(); } }); }
  }

  void listen() {
    if (!SpeechRecognizer.isRecognitionAvailable(this)) { js("window.__nsEnd('service-not-allowed')"); return; }
    if (sr == null) {
      sr = SpeechRecognizer.createSpeechRecognizer(this);
      sr.setRecognitionListener(new RecognitionListener() {
        public void onReadyForSpeech(Bundle p) {}
        public void onBeginningOfSpeech() {}
        public void onRmsChanged(float v) {}
        public void onBufferReceived(byte[] b) {}
        public void onEndOfSpeech() {}
        public void onPartialResults(Bundle p) {}
        public void onEvent(int t, Bundle p) {}
        public void onError(int e) { js("window.__nsEnd('" + (e == SpeechRecognizer.ERROR_NO_MATCH || e == SpeechRecognizer.ERROR_SPEECH_TIMEOUT ? "no-speech" : "error") + "')"); }
        public void onResults(Bundle r) {
          ArrayList<String> l = r.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION);
          if (l != null && !l.isEmpty()) js("window.__nsResult(" + org.json.JSONObject.quote(l.get(0)) + ")");
          js("window.__nsEnd()");
        }
      });
    }
    Intent i = new Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH);
    i.putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM);
    i.putExtra(RecognizerIntent.EXTRA_LANGUAGE, pendingLang);
    sr.startListening(i);
  }

  @Override
  public void onRequestPermissionsResult(int code, String[] perms, int[] res) {
    boolean ok = res.length > 0 && res[0] == PackageManager.PERMISSION_GRANTED;
    if (code == REQ_MIC && pendingPerm != null) { if (ok) pendingPerm.grant(pendingPerm.getResources()); else pendingPerm.deny(); pendingPerm = null; }
    if (code == REQ_MIC + 1) { if (ok) listen(); else js("window.__nsEnd('not-allowed')"); }
  }

  @Override
  protected void onActivityResult(int req, int res, Intent data) {
    if (req == REQ_FILE && chooser != null) {
      Uri[] out = null;
      if (res == RESULT_OK && data != null) {
        if (data.getClipData() != null) { int n = data.getClipData().getItemCount(); out = new Uri[n]; for (int k = 0; k < n; k++) out[k] = data.getClipData().getItemAt(k).getUri(); }
        else if (data.getData() != null) out = new Uri[] { data.getData() };
      }
      chooser.onReceiveValue(out); chooser = null;
    }
  }

  @Override public void onBackPressed() { if (web != null && web.canGoBack()) web.goBack(); else super.onBackPressed(); }
  @Override protected void onDestroy() { if (sr != null) sr.destroy(); super.onDestroy(); }
}
