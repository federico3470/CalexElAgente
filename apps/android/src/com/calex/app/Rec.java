package com.calex.app;

import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.pm.ResolveInfo;
import android.speech.SpeechRecognizer;

import java.util.List;

/**
 * Elige el reconocedor de voz real del teléfono (el de Google, o el primero que no sea Calex).
 * Es necesario porque, al elegir una app como asistente digital, Android la usa también como reconocedor
 * predeterminado de todo el sistema: si Calex se usara a sí mismo, nadie escucharía nada.
 */
final class Rec {
  static ComponentName pick(Context c) {
    try {
      List<ResolveInfo> l = c.getPackageManager().queryIntentServices(new Intent("android.speech.RecognitionService"), 0);
      ComponentName any = null;
      for (ResolveInfo r : l) {
        if (r.serviceInfo == null || c.getPackageName().equals(r.serviceInfo.packageName)) continue;
        ComponentName cn = new ComponentName(r.serviceInfo.packageName, r.serviceInfo.name);
        if (r.serviceInfo.packageName.startsWith("com.google.android")) return cn;
        if (any == null) any = cn;
      }
      return any;
    } catch (Exception e) { return null; }
  }

  static SpeechRecognizer create(Context c) {
    ComponentName cn = pick(c);
    return cn != null ? SpeechRecognizer.createSpeechRecognizer(c, cn) : null;
  }
}
