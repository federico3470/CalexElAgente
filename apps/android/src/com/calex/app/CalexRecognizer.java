package com.calex.app;

import android.content.Intent;
import android.speech.RecognitionService;
import android.speech.SpeechRecognizer;

/** Requerido por Android para registrar un asistente. El reconocimiento real lo hace la página con el reconocedor del sistema, así que este no se anuncia como reconocedor. */
public class CalexRecognizer extends RecognitionService {
  @Override protected void onStartListening(Intent i, Callback cb) { try { cb.error(SpeechRecognizer.ERROR_CLIENT); } catch (Exception e) { } }
  @Override protected void onCancel(Callback cb) { }
  @Override protected void onStopListening(Callback cb) { }
}
