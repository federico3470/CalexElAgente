package com.calex.app;

import android.content.Context;
import android.content.Intent;
import android.os.Bundle;
import android.service.voice.VoiceInteractionSession;

/** Se activa con el botón lateral / pulsación larga de inicio / botón del volante: abre el modo de voz de Calex. */
public class CalexSession extends VoiceInteractionSession {
  public CalexSession(Context c) { super(c); }

  @Override public void onShow(Bundle args, int flags) {
    super.onShow(args, flags);
    Intent i = new Intent(getContext(), "panel".equals(getContext().getSharedPreferences("calex", 0).getString("assist", "siri")) ? AssistActivity.class : AssistSiriActivity.class).setAction("com.calex.app.ASSIST").addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
    try { startAssistantActivity(i); } catch (Exception e) { try { getContext().startActivity(i); } catch (Exception e2) { } }
  }
}
