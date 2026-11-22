package com.calex.app;

import android.os.Bundle;
import android.service.voice.VoiceInteractionSession;
import android.service.voice.VoiceInteractionSessionService;

public class CalexSessionService extends VoiceInteractionSessionService {
  @Override public VoiceInteractionSession onNewSession(Bundle args) { return new CalexSession(this); }
}
