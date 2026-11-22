package com.calex.app;

/** Calex como asistente: un panel flotante de vidrio abajo (como Gemini), directo en el modo de voz y sin cámara. */
public class AssistActivity extends MainActivity {
  @Override protected boolean sheet() { return true; }
  @Override public void onBackPressed() { finish(); }
}
