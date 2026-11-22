package com.calex.app;

import android.Manifest;
import android.app.Activity;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.net.Uri;
import android.os.Bundle;
import android.provider.Settings;
import android.speech.RecognitionListener;
import android.speech.RecognizerIntent;
import android.speech.SpeechRecognizer;
import android.graphics.drawable.GradientDrawable;
import android.os.Build;
import android.util.DisplayMetrics;
import android.view.Gravity;
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
import android.widget.Toast;

import java.util.ArrayList;

/**
 * Calex para Android y Google TV: la interfaz web a pantalla completa, sin barra de direcciones.
 * - Iniciar sesión con Google/Apple se hace en el navegador (Google no lo permite dentro de un WebView) y se vuelve a la app con calex://login?code=…
 * - El dictado por voz usa el reconocedor de Android (el WebView no trae el del navegador).
 */
public class MainActivity extends Activity {
  static final String HOST = "https://calex.federicoreta773.workers.dev";
  static final int REQ_MIC = 7, REQ_FILE = 9;
  static final String OFFLINE = "<!doctype html><meta charset=utf-8><meta name=viewport content='width=device-width,initial-scale=1'><body style='margin:0;height:100vh;display:grid;place-items:center;background:#000000;color:#ece7db;font:20px Georgia,serif;text-align:center'><div><h1 style='font-weight:600;letter-spacing:.12em'>CALEX</h1><p>Sin conexión.<br>Cuando vuelva internet, toca para reintentar.</p><p><a href='" + HOST + "' style='display:inline-block;background:#d4a35f;color:#000000;padding:.6em 1.6em;border-radius:2em;text-decoration:none;font:600 18px sans-serif'>Reintentar</a></p></div></body>";
  long lastBack = 0;
  WebView web;
  ValueCallback<Uri[]> chooser;
  PermissionRequest pendingPerm;
  SpeechRecognizer sr;
  boolean listenerSet = false;
  android.speech.tts.TextToSpeech tts;
  boolean ttsReady = false;
  int ttsPending = 0;
  String pendingLang = "es-ES";

  @Override
  protected void onCreate(Bundle b) {
    super.onCreate(b);
    Window w = getWindow();
    w.setStatusBarColor(Color.parseColor("#000000"));
    w.setNavigationBarColor(Color.parseColor("#000000"));
    w.setSoftInputMode(WindowManager.LayoutParams.SOFT_INPUT_ADJUST_RESIZE);
    web = new WebView(this);
    web.setBackgroundColor(sheet() || overlay() ? Color.TRANSPARENT : Color.parseColor("#000000"));
    setContentView(web);
    if (sheet()) setupSheet(w); else if (overlay()) setupOverlay(w);
    WebSettings s = web.getSettings();
    s.setJavaScriptEnabled(true);
    s.setDomStorageEnabled(true);
    s.setMediaPlaybackRequiresUserGesture(false);
    s.setUserAgentString(s.getUserAgentString() + " CalexApp/1.8");
    web.addJavascriptInterface(new Bridge(), "CalexNative");
    web.setWebViewClient(new WebViewClient() {
      @Override public void onReceivedError(WebView v, WebResourceRequest r, android.webkit.WebResourceError e) {
        if (r.isForMainFrame()) v.loadDataWithBaseURL(HOST, OFFLINE, "text/html", "UTF-8", null); // sin conexión y sin copia guardada
      }
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
    if (!handleIntent(getIntent())) web.loadUrl(HOST + startQuery());
  }

  /** AssistActivity devuelve true: se muestra como un panel flotante abajo, no como una pantalla completa. */
  protected boolean sheet() { return false; }
  /** Asistente estilo Siri: pantalla completa transparente; la página dibuja el brillo de los bordes y la cápsula. */
  protected boolean overlay() { return false; }

  void setupOverlay(Window w) {
    w.setStatusBarColor(Color.TRANSPARENT); w.setNavigationBarColor(Color.TRANSPARENT);
    w.addFlags(WindowManager.LayoutParams.FLAG_DIM_BEHIND);
    WindowManager.LayoutParams lp = w.getAttributes(); lp.dimAmount = 0.12f; w.setAttributes(lp);
    w.getDecorView().setSystemUiVisibility(View.SYSTEM_UI_FLAG_LAYOUT_STABLE | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION);
  }

  void setupSheet(Window w) {
    DisplayMetrics dm = getResources().getDisplayMetrics(); float d = dm.density;
    w.setStatusBarColor(Color.TRANSPARENT); w.setNavigationBarColor(Color.TRANSPARENT);
    GradientDrawable bg = new GradientDrawable(); bg.setCornerRadius(28 * d); bg.setColor(Color.parseColor("#59101828"));
    w.setBackgroundDrawable(bg);
    w.addFlags(WindowManager.LayoutParams.FLAG_DIM_BEHIND);
    WindowManager.LayoutParams lp = w.getAttributes();
    lp.dimAmount = 0.28f; lp.width = dm.widthPixels - (int) (20 * d); lp.height = (int) (Math.min(dm.heightPixels * 0.62f, 560 * d)); lp.gravity = Gravity.BOTTOM | Gravity.CENTER_HORIZONTAL; lp.y = (int) (12 * d);
    w.setAttributes(lp);
    if (Build.VERSION.SDK_INT >= 31) { try { w.setBackgroundBlurRadius((int) (70 * d)); } catch (Exception e) { } } // desenfoca de verdad lo que hay detrás (liquid glass)
    setFinishOnTouchOutside(true);
  }

  /** Calex Auto (paquete com.calex.auto) arranca en modo coche; como asistente digital, en modo de voz. */
  String startQuery() { return getPackageName().endsWith(".auto") ? "/?auto=1" : ""; }

  /** calex://login?code=… → el Worker canjea el código por una sesión dentro del WebView. */
  boolean handleIntent(Intent i) {
    String act = i == null ? null : i.getAction();
    if (act != null && (act.equals("com.calex.app.ASSIST") || act.equals(Intent.ACTION_ASSIST) || act.equals(Intent.ACTION_VOICE_COMMAND) || act.equals("android.intent.action.VOICE_ASSIST"))) { web.loadUrl(HOST + "/?assist=1&style=" + (overlay() ? "siri" : "panel")); return true; }
    Uri d = i == null ? null : i.getData();
    if (d != null && "calex".equals(d.getScheme()) && "login".equals(d.getHost()) && d.getQueryParameter("code") != null) {
      web.loadUrl(HOST + "/auth/app?code=" + Uri.encode(d.getQueryParameter("code")));
      return true;
    }
    if (d != null && "calex".equals(d.getScheme()) && "connected".equals(d.getHost())) { js("window.dispatchEvent(new Event('calex-connected'))"); return true; } // volvió de vincular un conector
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
    /** Abre un enlace https en el navegador (la vinculación de conectores no puede hacerse dentro del WebView). */
    @JavascriptInterface public void openExternal(final String url) {
      runOnUiThread(new Runnable() { public void run() { try { Uri u = Uri.parse(url); if ("https".equals(u.getScheme())) startActivity(new Intent(Intent.ACTION_VIEW, u)); } catch (Exception e) { } } });
    }
    /** Música del celular: la isla dinámica de la interfaz la lee y la controla (ver Media.java). */
    @JavascriptInterface public boolean mediaAccess() { return Media.hasAccess(MainActivity.this); }
    @JavascriptInterface public void mediaSettings() { runOnUiThread(new Runnable() { public void run() { try { startActivity(new Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS)); } catch (Exception e) { } } }); }
    @JavascriptInterface public String mediaState() { return Media.state(MainActivity.this); }
    @JavascriptInterface public void mediaCmd(String c) { Media.cmd(MainActivity.this, c); }
    /** Cierra la pantalla del asistente / modo coche y vuelve a lo que estabas haciendo. */
    @JavascriptInterface public void close() { runOnUiThread(new Runnable() { public void run() { finish(); } }); }
    /** Abre la app completa (si falta iniciar sesión o se toca ⤢) y cierra el panel. */
    @JavascriptInterface public void openApp() { runOnUiThread(new Runnable() { public void run() { try { Intent i = new Intent(MainActivity.this, MainActivity.class).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP); startActivity(i); } catch (Exception e) { } if (sheet()) finish(); } }); }
    /** Voz de Calex con el sintetizador de Android: avisa a la página cuando termina de hablar. */
    @JavascriptInterface public void say(final String text) { runOnUiThread(new Runnable() { public void run() { speakNative(text); } }); }
    @JavascriptInterface public void sayStop() { runOnUiThread(new Runnable() { public void run() { if (tts != null) { tts.stop(); } ttsPending = 0; } }); }
    /** Estilo del asistente digital: "siri" (brillo en los bordes) o "panel" (hoja de cristal abajo). */
    @JavascriptInterface public void setAssistStyle(String st) { getSharedPreferences("calex", 0).edit().putString("assist", "panel".equals(st) ? "panel" : "siri").apply(); }
    @JavascriptInterface public String getAssistStyle() { return getSharedPreferences("calex", 0).getString("assist", "siri"); }
    @JavascriptInterface public void cancel() { runOnUiThread(new Runnable() { public void run() { if (sr != null) sr.cancel(); } }); }
    @JavascriptInterface public void stop() { runOnUiThread(new Runnable() { public void run() { if (sr != null) sr.stopListening(); } }); }
  }

  void speakNative(final String text) {
    if (tts == null) {
      tts = new android.speech.tts.TextToSpeech(this, new android.speech.tts.TextToSpeech.OnInitListener() {
        public void onInit(int st) {
          ttsReady = st == android.speech.tts.TextToSpeech.SUCCESS;
          if (ttsReady) { try { tts.setLanguage(new java.util.Locale("es", "AR")); } catch (Exception e) { } tts.setSpeechRate(1.02f); }
          if (ttsReady) speakNative(text); else js("window.__ttsEnd&&window.__ttsEnd()");
        }
      });
      tts.setOnUtteranceProgressListener(new android.speech.tts.UtteranceProgressListener() {
        void done() { runOnUiThread(new Runnable() { public void run() { if (ttsPending > 0) ttsPending--; if (ttsPending == 0) js("window.__ttsEnd&&window.__ttsEnd()"); } }); }
        public void onStart(String id) { }
        public void onDone(String id) { done(); }
        public void onError(String id) { done(); }
      });
      return;
    }
    if (!ttsReady) return;
    ttsPending++;
    tts.speak(text, android.speech.tts.TextToSpeech.QUEUE_ADD, null, "u" + System.nanoTime());
  }

  void listen() {
    if (sr == null) sr = Rec.create(this); // reconocedor real del teléfono (nunca el de Calex)
    if (sr == null) { js("window.__nsEnd('service-not-allowed')"); return; }
    if (!listenerSet) {
      listenerSet = true;
      sr.setRecognitionListener(new RecognitionListener() {
        public void onReadyForSpeech(Bundle p) { js("window.__nsReady&&window.__nsReady()"); }
        public void onBeginningOfSpeech() {}
        public void onRmsChanged(float v) { js("window.__rms&&window.__rms(" + v + ")"); }
        public void onBufferReceived(byte[] b) {}
        public void onEndOfSpeech() {}
        public void onPartialResults(Bundle p) { ArrayList<String> l = p.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION); if (l != null && !l.isEmpty()) js("window.__nsPartial&&window.__nsPartial(" + org.json.JSONObject.quote(l.get(0)) + ")"); }
        public void onEvent(int t, Bundle p) {}
        public void onError(int e) {
          String c = "error";
          if (e == SpeechRecognizer.ERROR_NO_MATCH || e == SpeechRecognizer.ERROR_SPEECH_TIMEOUT) c = "no-speech";
          else if (e == SpeechRecognizer.ERROR_CLIENT) c = "aborted";
          else if (e == SpeechRecognizer.ERROR_NETWORK || e == SpeechRecognizer.ERROR_NETWORK_TIMEOUT || e == SpeechRecognizer.ERROR_SERVER) c = "network";
          else if (e == SpeechRecognizer.ERROR_INSUFFICIENT_PERMISSIONS) c = "not-allowed";
          else if (e == SpeechRecognizer.ERROR_AUDIO) c = "audio-capture";
          else if (e == SpeechRecognizer.ERROR_RECOGNIZER_BUSY) { c = "no-speech"; try { sr.destroy(); } catch (Exception x) { } sr = null; listenerSet = false; } // se vuelve a crear en el próximo intento
          js("window.__nsEnd('" + c + "')");
        }
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
    i.putExtra(RecognizerIntent.EXTRA_LANGUAGE_PREFERENCE, pendingLang);
    i.putExtra(RecognizerIntent.EXTRA_PARTIAL_RESULTS, true);
    i.putExtra(RecognizerIntent.EXTRA_MAX_RESULTS, 1);
    i.putExtra(RecognizerIntent.EXTRA_CALLING_PACKAGE, getPackageName());
    i.putExtra(RecognizerIntent.EXTRA_SPEECH_INPUT_COMPLETE_SILENCE_LENGTH_MILLIS, 2600L);
    i.putExtra(RecognizerIntent.EXTRA_SPEECH_INPUT_POSSIBLY_COMPLETE_SILENCE_LENGTH_MILLIS, 2200L);
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

  @Override public void onBackPressed() {
    if (web == null) { super.onBackPressed(); return; }
    web.evaluateJavascript("(function(){try{return !!(window.calexBack&&window.calexBack())}catch(e){return false}})()", new ValueCallback<String>() {
      public void onReceiveValue(String v) {
        if ("true".equals(v)) return; // la página cerró algo (menú, historial, charla…)
        if (web.canGoBack()) { web.goBack(); return; }
        long now = System.currentTimeMillis();
        if (now - lastBack < 2000) finish(); else { lastBack = now; Toast.makeText(MainActivity.this, "Pulsa Atrás otra vez para salir", Toast.LENGTH_SHORT).show(); }
      }
    });
  }
  @Override protected void onDestroy() { if (tts != null) { try { tts.shutdown(); } catch (Exception e) { } } if (sr != null) sr.destroy(); super.onDestroy(); }
}
