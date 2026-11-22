package com.calex.app;

/** Calex como asistente, estilo Siri: brillo multicolor en los bordes de la pantalla y una cápsula arriba con la esfera animada. */
public class AssistSiriActivity extends MainActivity {
  @Override protected boolean overlay() { return true; }
  @Override public void onBackPressed() { finish(); }
}
