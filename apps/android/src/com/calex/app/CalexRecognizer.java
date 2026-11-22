package com.calex.app;

import android.content.Intent;
import android.os.Bundle;
import android.speech.RecognitionListener;
import android.speech.RecognitionService;
import android.speech.SpeechRecognizer;

/**
 * Android exige un reconocedor para registrar un asistente y lo usa como reconocedor del sistema.
 * Este reenvía todo al reconocedor real del teléfono, así el dictado de otras aplicaciones sigue funcionando.
 */
public class CalexRecognizer extends RecognitionService {
  private SpeechRecognizer inner;

  @Override protected void onStartListening(Intent i, final Callback cb) {
    try {
      if (inner != null) { try { inner.destroy(); } catch (Exception e) { } }
      inner = Rec.create(this);
      if (inner == null) { cb.error(SpeechRecognizer.ERROR_RECOGNIZER_BUSY); return; }
      inner.setRecognitionListener(new RecognitionListener() {
        public void onReadyForSpeech(Bundle p) { try { cb.readyForSpeech(p); } catch (Exception e) { } }
        public void onBeginningOfSpeech() { try { cb.beginningOfSpeech(); } catch (Exception e) { } }
        public void onRmsChanged(float v) { try { cb.rmsChanged(v); } catch (Exception e) { } }
        public void onBufferReceived(byte[] b) { try { cb.bufferReceived(b); } catch (Exception e) { } }
        public void onEndOfSpeech() { try { cb.endOfSpeech(); } catch (Exception e) { } }
        public void onError(int e) { try { cb.error(e); } catch (Exception x) { } }
        public void onResults(Bundle r) { try { cb.results(r); } catch (Exception e) { } }
        public void onPartialResults(Bundle p) { try { cb.partialResults(p); } catch (Exception e) { } }
        public void onEvent(int t, Bundle p) { }
      });
      inner.startListening(i);
    } catch (Exception e) { try { cb.error(SpeechRecognizer.ERROR_CLIENT); } catch (Exception x) { } }
  }

  @Override protected void onCancel(Callback cb) { if (inner != null) inner.cancel(); }
  @Override protected void onStopListening(Callback cb) { if (inner != null) inner.stopListening(); }
  @Override public void onDestroy() { if (inner != null) { try { inner.destroy(); } catch (Exception e) { } inner = null; } super.onDestroy(); }
}
