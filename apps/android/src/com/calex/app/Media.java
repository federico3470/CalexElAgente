package com.calex.app;

import android.content.ComponentName;
import android.content.Context;
import android.graphics.Bitmap;
import android.media.MediaMetadata;
import android.media.session.MediaController;
import android.media.session.MediaSessionManager;
import android.media.session.PlaybackState;
import android.os.SystemClock;
import android.provider.Settings;
import android.util.Base64;

import org.json.JSONObject;

import java.io.ByteArrayOutputStream;
import java.util.List;

/** Lee y controla la música que suena en el celular (cualquier app con sesión de medios: Spotify, YouTube Music, Deezer…). Pide «Acceso a notificaciones». */
final class Media {
  private static String artKey = "", artData = "";

  static boolean hasAccess(Context c) {
    String s = Settings.Secure.getString(c.getContentResolver(), "enabled_notification_listeners");
    return s != null && s.contains(c.getPackageName());
  }

  static MediaController active(Context c) {
    try {
      MediaSessionManager m = (MediaSessionManager) c.getSystemService(Context.MEDIA_SESSION_SERVICE);
      List<MediaController> l = m.getActiveSessions(new ComponentName(c, MediaListener.class));
      MediaController best = null;
      for (MediaController mc : l) {
        PlaybackState ps = mc.getPlaybackState();
        if (ps != null && ps.getState() == PlaybackState.STATE_PLAYING) return mc;
        if (best == null && mc.getMetadata() != null) best = mc;
      }
      return best;
    } catch (Exception e) { return null; }
  }

  static String state(Context c) {
    try {
      MediaController mc = active(c);
      if (mc == null || mc.getMetadata() == null) return "{}";
      MediaMetadata md = mc.getMetadata();
      String title = md.getString(MediaMetadata.METADATA_KEY_TITLE);
      if (title == null || title.length() == 0) return "{}";
      String artist = md.getString(MediaMetadata.METADATA_KEY_ARTIST);
      if (artist == null) artist = md.getString(MediaMetadata.METADATA_KEY_ALBUM_ARTIST);
      PlaybackState ps = mc.getPlaybackState();
      boolean playing = ps != null && ps.getState() == PlaybackState.STATE_PLAYING;
      long pos = 0;
      if (ps != null) { pos = ps.getPosition(); if (playing) pos += (long) ((SystemClock.elapsedRealtime() - ps.getLastPositionUpdateTime()) * ps.getPlaybackSpeed()); }
      JSONObject o = new JSONObject();
      o.put("title", title); o.put("artist", artist == null ? "" : artist); o.put("playing", playing);
      o.put("pos", Math.max(0, pos)); o.put("dur", md.getLong(MediaMetadata.METADATA_KEY_DURATION)); o.put("app", mc.getPackageName());
      String key = title + "|" + artist;
      if (!key.equals(artKey)) { // la carátula solo se vuelve a codificar cuando cambia la canción
        artKey = key; artData = "";
        Bitmap b = md.getBitmap(MediaMetadata.METADATA_KEY_ALBUM_ART);
        if (b == null) b = md.getBitmap(MediaMetadata.METADATA_KEY_ART);
        if (b != null) {
          Bitmap s = Bitmap.createScaledBitmap(b, 96, 96, true);
          ByteArrayOutputStream bo = new ByteArrayOutputStream(); s.compress(Bitmap.CompressFormat.JPEG, 70, bo);
          artData = "data:image/jpeg;base64," + Base64.encodeToString(bo.toByteArray(), Base64.NO_WRAP);
        }
      }
      o.put("art", artData);
      return o.toString();
    } catch (Exception e) { return "{}"; }
  }

  static void cmd(Context c, String x) {
    try {
      MediaController mc = active(c); if (mc == null) return;
      MediaController.TransportControls t = mc.getTransportControls();
      if ("next".equals(x)) t.skipToNext(); else if ("prev".equals(x)) t.skipToPrevious(); else if ("pause".equals(x)) t.pause(); else if ("play".equals(x)) t.play();
    } catch (Exception e) { }
  }
}
