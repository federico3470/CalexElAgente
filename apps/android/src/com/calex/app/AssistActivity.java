package com.calex.app;

/** Calex como asistente: se abre directo en el modo de voz (sin cámara), encima de lo que estés haciendo. */
public class AssistActivity extends MainActivity {
  @Override public void onBackPressed() { finish(); }
}
