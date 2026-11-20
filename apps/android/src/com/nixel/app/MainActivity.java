package com.nixel.app;

import android.Manifest;
import android.app.Activity;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.content.res.Configuration;
import android.graphics.Color;
import android.net.Uri;
import android.os.Bundle;
import android.webkit.PermissionRequest;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

/**
 * Nixel para Android y Google TV.
 * - Teléfono o tableta con Chrome: abre Nixel en una pestaña personalizada de Chrome (a pantalla casi completa).
 *   Así funcionan el inicio de sesión con Google y el dictado por voz, que Google bloquea en un WebView.
 * - Google TV / Android TV (sin Chrome): usa un WebView. Se puede entrar como invitado.
 */
public class MainActivity extends Activity {
  static final String URL = "https://nixel.federicoreta773.workers.dev";
  WebView web;
  ValueCallback<Uri[]> chooser;
  PermissionRequest pendingPerm;

  @Override
  protected void onCreate(Bundle b) {
    super.onCreate(b);
    boolean tv = (getResources().getConfiguration().uiMode & Configuration.UI_MODE_TYPE_MASK) == Configuration.UI_MODE_TYPE_TELEVISION;
    if (!tv && chromeInstalled()) {
      Intent i = new Intent(Intent.ACTION_VIEW, Uri.parse(URL));
      i.setPackage("com.android.chrome");
      Bundle ex = new Bundle();
      ex.putBinder("android.support.customtabs.extra.SESSION", null); // marca la intención como «pestaña personalizada»
      i.putExtras(ex);
      i.putExtra("android.support.customtabs.extra.TOOLBAR_COLOR", Color.parseColor("#0f1115"));
      startActivity(i);
      finish();
      return;
    }
    web = new WebView(this);
    web.setBackgroundColor(Color.parseColor("#0f1115"));
    setContentView(web);
    WebSettings s = web.getSettings();
    s.setJavaScriptEnabled(true);
    s.setDomStorageEnabled(true);
    s.setMediaPlaybackRequiresUserGesture(false);
    web.setWebViewClient(new WebViewClient());
    web.setWebChromeClient(new WebChromeClient() {
      @Override public void onPermissionRequest(final PermissionRequest r) {
        runOnUiThread(new Runnable() { public void run() {
          if (checkSelfPermission(Manifest.permission.RECORD_AUDIO) == PackageManager.PERMISSION_GRANTED) r.grant(r.getResources());
          else { pendingPerm = r; requestPermissions(new String[] { Manifest.permission.RECORD_AUDIO }, 7); }
        } });
      }
      @Override public boolean onShowFileChooser(WebView w, ValueCallback<Uri[]> cb, FileChooserParams p) {
        if (chooser != null) chooser.onReceiveValue(null);
        chooser = cb;
        Intent i = new Intent(Intent.ACTION_GET_CONTENT); i.addCategory(Intent.CATEGORY_OPENABLE); i.setType("*/*");
        i.putExtra(Intent.EXTRA_ALLOW_MULTIPLE, true);
        try { startActivityForResult(Intent.createChooser(i, "Elegir archivo"), 9); } catch (Exception e) { chooser = null; return false; }
        return true;
      }
    });
    web.loadUrl(URL);
  }

  boolean chromeInstalled() {
    try { getPackageManager().getPackageInfo("com.android.chrome", 0); return true; } catch (Exception e) { return false; }
  }

  @Override
  public void onRequestPermissionsResult(int code, String[] perms, int[] res) {
    if (code == 7 && pendingPerm != null) {
      if (res.length > 0 && res[0] == PackageManager.PERMISSION_GRANTED) pendingPerm.grant(pendingPerm.getResources()); else pendingPerm.deny();
      pendingPerm = null;
    }
  }

  @Override
  protected void onActivityResult(int req, int res, Intent data) {
    if (req == 9 && chooser != null) {
      Uri[] out = null;
      if (res == RESULT_OK && data != null) {
        if (data.getClipData() != null) { int n = data.getClipData().getItemCount(); out = new Uri[n]; for (int k = 0; k < n; k++) out[k] = data.getClipData().getItemAt(k).getUri(); }
        else if (data.getData() != null) out = new Uri[] { data.getData() };
      }
      chooser.onReceiveValue(out); chooser = null;
    }
  }

  @Override
  public void onBackPressed() {
    if (web != null && web.canGoBack()) web.goBack(); else super.onBackPressed();
  }
}
