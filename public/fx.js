/* Calex fx.js - movimiento estilo iOS, iconos animados y calidad adaptativa.
   Todo basado en TIEMPO (segundos/milisegundos y timestamps), nunca en incrementos por cuadro.
   Seguro si se carga dos veces. Sin dependencias. */
(function () {
  'use strict';
  var w = typeof window !== 'undefined' ? window : globalThis;
  if (w.__calexFx) return;
  w.__calexFx = 1;
  var doc = w.document;
  var root = doc && doc.documentElement;
  var nav = w.navigator || {};

  var OV = '.ov,#ov,#set,#lg,#ob,#lv,#cnov';
  var OV_CARD = '.ov,#ov,#set,#lg,#ob,#cnov'; /* #lv lleva video: no se anima su hijo */
  var TYPICAL = [48, 50, 60, 72, 75, 90, 100, 120, 144, 165, 240];

  /* ---------- utilidades ---------- */
  var rmq = null;
  try { rmq = w.matchMedia && w.matchMedia('(prefers-reduced-motion: reduce)'); } catch (e) {}
  function reduced() { return !!(rmq && rmq.matches); }
  function now() { return (w.performance && w.performance.now) ? w.performance.now() : Date.now(); }
  function raf(cb) { return w.requestAnimationFrame(cb); }
  function caf(id) { try { w.cancelAnimationFrame(id); } catch (e) {} }

  function snapHz(hz) {
    var best = TYPICAL[0], bd = Infinity;
    for (var i = 0; i < TYPICAL.length; i++) {
      var d = Math.abs(Math.log(hz / TYPICAL[i]));
      if (d < bd) { bd = d; best = TYPICAL[i]; }
    }
    return best;
  }
  function median(a) {
    var s = a.slice().sort(function (x, y) { return x - y; });
    var m = s.length >> 1;
    return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
  }

  /* ---------- CSS ---------- */
  var ICON_CSS = [
    ':where(.aicon){display:inline-block;vertical-align:middle;line-height:0}',
    '.ai{overflow:visible}',
    '.ai *{transform-box:fill-box;transform-origin:center}',
    /* spark */
    '.ai-spark .a{animation:fx-pulse 2.4s var(--ease-ios) infinite}',
    '.ai-spark .b{animation:fx-blink 2.4s ease-in-out .6s infinite}',
    /* dots */
    '.ai-dots circle{fill:currentColor;stroke:none;animation:fx-hop 1.2s ease-in-out infinite}',
    '.ai-dots .b{animation-delay:.15s}.ai-dots .c{animation-delay:.3s}',
    /* wave */
    '.ai-wave path{transform-origin:center;animation:fx-bar 1s ease-in-out infinite alternate}',
    '.ai-wave .w2{animation-delay:.15s}.ai-wave .w3{animation-delay:.3s}.ai-wave .w4{animation-delay:.45s}.ai-wave .w5{animation-delay:.6s}',
    /* mic */
    '.ai-mic .r{opacity:0;animation:fx-ring 1.8s ease-out infinite}',
    /* check */
    '.ai-check .a{stroke-dasharray:1;stroke-dashoffset:0;animation:fx-draw 3s var(--ease-ios) infinite}',
    /* heart */
    '.ai-heart .a{animation:fx-beat 1.4s ease-in-out infinite}',
    /* sun */
    '.ai-sun .a{animation:fx-spin 14s linear infinite}',
    '.ai-sun .b{animation:fx-pulse 3s ease-in-out infinite}',
    /* cloud */
    '.ai-cloud .a{animation:fx-drift 5s ease-in-out infinite alternate}',
    /* leaf */
    '.ai-leaf .a{transform-origin:15% 90%;animation:fx-sway 4s ease-in-out infinite alternate}',
    /* star */
    '.ai-star .a{animation:fx-twinkle 3s ease-in-out infinite}',
    /* bell */
    '.ai-bell .a{transform-origin:50% 0;animation:fx-bell 2.6s ease-in-out infinite}',
    '.ai-bell .b{animation:fx-clap 2.6s ease-in-out infinite}',
    /* clock */
    '.ai-clock .h,.ai-clock .m{transform-box:view-box;transform-origin:12px 12px}',
    '.ai-clock .m{animation:fx-spin 6s linear infinite}',
    '.ai-clock .h{animation:fx-spin 72s linear infinite}',
    /* book */
    '.ai-book .a{transform-origin:0 50%;animation:fx-page 3.2s var(--ease-ios) infinite}',
    /* cross */
    '.ai-cross .g{animation:fx-glow 4s ease-in-out infinite}',
    '.ai-cross .a{animation:fx-breathe 4s ease-in-out infinite}',
    /* dove */
    '.ai-dove .a{animation:fx-float 3s ease-in-out infinite}',
    '.ai-dove .w{transform-origin:20% 90%;animation:fx-flap 1.6s ease-in-out infinite}',
    /* flame */
    '.ai-flame .a{transform-origin:50% 100%;animation:fx-flicker 1.6s ease-in-out infinite}',
    /* drop */
    '.ai-drop .a{animation:fx-bob 2.4s ease-in-out infinite}',
    '.ai-drop .b{animation:fx-blink 2.4s ease-in-out infinite}',
    /* gear */
    '.ai-gear .a{animation:fx-spin 10s linear infinite}',
    /* bolt */
    '.ai-bolt .a{animation:fx-flash 2.2s ease-in-out infinite}',
    /* lock */
    '.ai-lock .a{animation:fx-latch 3s var(--ease-ios) infinite}',
    /* search */
    '.ai-search .a{animation:fx-scan 3.2s ease-in-out infinite}',
    /* mail */
    '.ai-mail .a{transform-origin:50% 0;animation:fx-flap2 3s var(--ease-ios) infinite}',
    /* note */
    '.ai-note .a{animation:fx-bounce 1.8s ease-in-out infinite}',
    /* play / pause */
    '.ai-play .a,.ai-pause .a{animation:fx-breathe 2.4s ease-in-out infinite}',
    /* moon */
    '.ai-moon .a{animation:fx-sway 5s ease-in-out infinite alternate}',
    '.ai-moon .b{animation:fx-twinkle 3s ease-in-out infinite}',
    /* keyframes (todo en segundos; solo transform, opacity y stroke-dashoffset) */
    '@keyframes fx-pulse{0%,100%{transform:scale(.9)}50%{transform:scale(1.08) rotate(8deg)}}',
    '@keyframes fx-blink{0%,100%{opacity:.2}50%{opacity:1}}',
    '@keyframes fx-hop{0%,60%,100%{transform:translateY(0);opacity:.45}30%{transform:translateY(-3px);opacity:1}}',
    '@keyframes fx-bar{0%{transform:scaleY(.3)}100%{transform:scaleY(1)}}',
    '@keyframes fx-ring{0%{transform:scale(.6);opacity:.5}100%{transform:scale(1.5);opacity:0}}',
    '@keyframes fx-draw{0%{stroke-dashoffset:1;opacity:1}30%,85%{stroke-dashoffset:0;opacity:1}100%{stroke-dashoffset:0;opacity:0}}',
    '@keyframes fx-beat{0%,70%,100%{transform:scale(1)}14%{transform:scale(1.16)}28%{transform:scale(1)}42%{transform:scale(1.1)}}',
    '@keyframes fx-spin{to{transform:rotate(360deg)}}',
    '@keyframes fx-drift{from{transform:translateX(-1.2px)}to{transform:translateX(1.2px)}}',
    '@keyframes fx-sway{from{transform:rotate(-5deg)}to{transform:rotate(5deg)}}',
    '@keyframes fx-twinkle{0%,100%{transform:scale(.94) rotate(-4deg);opacity:.75}50%{transform:scale(1.06) rotate(4deg);opacity:1}}',
    '@keyframes fx-bell{0%,55%,100%{transform:rotate(0)}8%{transform:rotate(12deg)}16%{transform:rotate(-10deg)}24%{transform:rotate(8deg)}32%{transform:rotate(-6deg)}40%{transform:rotate(3deg)}}',
    '@keyframes fx-clap{0%,55%,100%{transform:translateX(0)}12%{transform:translateX(1.5px)}24%{transform:translateX(-1.5px)}36%{transform:translateX(1px)}}',
    '@keyframes fx-page{0%,50%,100%{transform:scaleX(1)}70%{transform:scaleX(.12)}90%{transform:scaleX(1)}}',
    '@keyframes fx-glow{0%,100%{opacity:.25}50%{opacity:.75}}',
    '@keyframes fx-breathe{0%,100%{transform:scale(.95)}50%{transform:scale(1.04)}}',
    '@keyframes fx-float{0%,100%{transform:translateY(0)}50%{transform:translateY(-1.6px)}}',
    '@keyframes fx-flap{0%,100%{transform:rotate(6deg)}50%{transform:rotate(-14deg)}}',
    '@keyframes fx-flicker{0%,100%{transform:scale(1,1) rotate(0)}25%{transform:scale(.95,1.07) rotate(-2deg)}50%{transform:scale(1.03,.96) rotate(1.5deg)}75%{transform:scale(.97,1.05) rotate(-1deg)}}',
    '@keyframes fx-bob{0%,100%{transform:translateY(-1px)}50%{transform:translateY(1.5px) scale(1,.97)}}',
    '@keyframes fx-flash{0%,60%,100%{opacity:1;transform:scale(1)}65%{opacity:.35}70%{opacity:1;transform:scale(1.08)}75%{opacity:.5}80%{opacity:1}}',
    '@keyframes fx-latch{0%,60%,100%{transform:translateY(0)}25%,40%{transform:translateY(-2px)}}',
    '@keyframes fx-scan{0%,100%{transform:translate(0,0) rotate(0)}33%{transform:translate(1.5px,-1px) rotate(4deg)}66%{transform:translate(-1px,1.5px) rotate(-4deg)}}',
    '@keyframes fx-flap2{0%,50%,100%{transform:scaleY(1)}25%{transform:scaleY(.6)}}',
    '@keyframes fx-bounce{0%,100%{transform:translateY(0) rotate(-4deg)}50%{transform:translateY(-2px) rotate(4deg)}}',
    '.aicon[data-off] *{animation-play-state:paused!important}',
    'html.fx-hidden .ai *{animation-play-state:paused!important}'
  ].join('');

  var CSS = [
    ':root{--ease-ios:cubic-bezier(.32,.72,0,1);--ease-spring:cubic-bezier(.2,.9,.3,1.25);--t-fast:.18s;--t-base:.32s;--t-sheet:.5s}',
    'html{scroll-behavior:smooth;-webkit-tap-highlight-color:transparent}',
    '#log{overscroll-behavior-y:contain;scroll-padding-bottom:12px}',
    /* pulsacion estilo iOS: baja rapido, vuelve con elasticidad */
    ':where(button,.cnc,.pill,.chip,.tag,[role=tab],[role=button]){transition:transform var(--t-base) var(--ease-spring)}',
    ':where(button,.cnc,.pill,.chip,.tag,[role=tab],[role=button]):active{transform:scale(.965);transition-duration:var(--t-fast);transition-timing-function:var(--ease-ios)}',
    ':where(.cnc):active{transform:scale(.985)}',
    '.fx-wc{will-change:transform,opacity}',
    /* foco visible */
    ':where(button,a,input,textarea,select,summary,[tabindex]):focus-visible{outline:2px solid currentColor;outline:2px solid color-mix(in srgb,currentColor 55%,transparent);outline-offset:2px}',
    /* mensajes: entrada desde abajo, solo los nuevos (clase puesta por JS) */
    '.fx-in{animation:fx-in .42s var(--ease-ios) backwards}',
    '@keyframes fx-in{from{opacity:0;transform:translate3d(0,14px,0) scale(.985)}to{opacity:1;transform:none}}',
    '@keyframes fx-fade{from{opacity:0}to{opacity:1}}',
    /* mensajes antiguos fuera del area visible no se pintan */
    '#log>.m:not(:nth-last-child(-n+10)){content-visibility:auto;contain-intrinsic-size:auto 88px}',
    /* hojas y overlays: entrada con animacion, salida con transicion de display */
    ':where(' + OV + ').on{animation:fx-fade var(--t-base) var(--ease-ios) backwards}',
    ':where(' + OV_CARD + ').on>:first-child{animation:fx-sheet var(--t-sheet) var(--ease-ios) backwards}',
    '@keyframes fx-sheet{from{opacity:0;transform:translate3d(0,22px,0) scale(.96)}to{opacity:1;transform:none}}',
    '@supports (transition-behavior:allow-discrete){',
    '[data-fx-sheet]:not(.on){opacity:0;pointer-events:none;transition:opacity var(--t-base) var(--ease-ios),display var(--t-base) allow-discrete}',
    '}',
    ICON_CSS,
    /* calidad reducida: sin desenfoques, sombras grandes ni decoracion */
    'html.lowfx *{-webkit-backdrop-filter:none!important;backdrop-filter:none!important;filter:none!important}',
    'html.lowfx :where(' + OV + ',.cnc,.m,button,#log){box-shadow:none!important;text-shadow:none!important}',
    'html.lowfx .ai *{animation:none!important}',
    'html.lowfx .fx-in{animation-duration:.2s}',
    /* movimiento reducido: solo fundidos simples */
    '@media (prefers-reduced-motion:reduce){',
    'html{scroll-behavior:auto}',
    ':where(button,.cnc,.pill,.chip,.tag,[role=tab],[role=button]){transition:none}',
    ':where(button,.cnc,.pill,.chip,.tag,[role=tab],[role=button]):active{transform:none;opacity:.8}',
    '.fx-in{animation:fx-fade .2s linear backwards}',
    ':where(' + OV_CARD + ').on>:first-child{animation:fx-fade .2s linear backwards}',
    ':where(' + OV + ').on{animation:fx-fade .2s linear backwards}',
    '[data-fx-sheet]:not(.on){transition-duration:.15s}',
    '.ai *{animation:none!important}',
    '.ai-check .a{stroke-dashoffset:0}',
    '}'
  ].join('\n');

  function injectCss() {
    if (!doc || doc.getElementById('calex-fx-css')) return;
    var st = doc.createElement('style');
    st.id = 'calex-fx-css';
    st.textContent = CSS;
    (doc.head || root).appendChild(st);
  }

  /* ---------- bucle compartido basado en timestamp ---------- */
  var subs = [], loopId = 0, lastTs = 0;
  function loop(ts) {
    loopId = 0;
    if (!subs.length) return;
    var dt = lastTs ? (ts - lastTs) / 1000 : 0;
    lastTs = ts;
    if (dt > 0.1) dt = 0.1; /* tras pausa: evita saltos */
    if (dt < 0) dt = 0;
    var dead = false;
    for (var i = 0; i < subs.length; i++) {
      var s = subs[i];
      if (!s.on) { dead = true; continue; }
      try { s.cb(dt, ts); } catch (e) { s.on = false; dead = true; }
    }
    if (dead) subs = subs.filter(function (x) { return x.on; });
    if (subs.length && !(doc && doc.hidden)) loopId = raf(loop);
  }
  function kick() {
    if (!loopId && subs.length && !(doc && doc.hidden)) { lastTs = 0; loopId = raf(loop); }
  }
  function frame(cb) {
    var s = { cb: cb, on: true };
    subs.push(s);
    kick();
    return function stop() { s.on = false; };
  }

  /* ---------- suavizado independiente de la tasa ---------- */
  function damp(actual, objetivo, lambda, dt) {
    return objetivo + (actual - objetivo) * Math.exp(-lambda * dt);
  }
  function spring(state, target, k, c, dt) {
    if (typeof state !== 'object' || !state) state = { x: +state || 0, v: 0 };
    k = k == null ? 170 : k; c = c == null ? 26 : c;
    if (!(dt > 0)) return state;
    var n = Math.max(1, Math.ceil(dt * 240)), h = dt / n;
    for (var i = 0; i < n; i++) {
      state.v += (-k * (state.x - target) - c * state.v) * h;
      state.x += state.v * h;
    }
    return state;
  }

  /* ---------- haptico ---------- */
  function tap() {
    try {
      if (nav.vibrate && !reduced()) { nav.vibrate(8); return true; }
    } catch (e) {}
    return false;
  }

  /* ---------- detector de tasa de refresco ---------- */
  var hz = 60, measuring = false, lowAuto = false, lowForced = false;
  function applyHz(v) {
    hz = v;
    w.CALEX_HZ = v;
    if (!root) return;
    var cl = root.classList, rm = [];
    for (var i = 0; i < cl.length; i++) if (cl[i].indexOf('hz-') === 0) rm.push(cl[i]);
    for (var j = 0; j < rm.length; j++) cl.remove(rm[j]);
    cl.add('hz-' + v);
    try { root.style.setProperty('--frame-ms', (1000 / v).toFixed(2) + 'ms'); } catch (e) {}
    try { w.dispatchEvent && w.CustomEvent && w.dispatchEvent(new w.CustomEvent('calex:hz', { detail: v })); } catch (e) {}
  }
  function measure(n, done) {
    n = n || 40;
    if (measuring) return;
    if (doc && doc.hidden) return;
    measuring = true;
    var ts = [];
    function step(t) {
      if (doc && doc.hidden) { measuring = false; return; } /* se repite al volver a ser visible */
      ts.push(t);
      if (ts.length <= n + 2) { raf(step); return; }
      var dts = [];
      for (var i = 3; i < ts.length; i++) dts.push(ts[i] - ts[i - 1]); /* descarta arranque */
      measuring = false;
      var m = median(dts);
      if (m > 0) { applyHz(snapHz(1000 / m)); }
      if (done) done(hz);
    }
    raf(step);
  }

  /* ---------- calidad adaptativa ---------- */
  function setLow(on) {
    if (!root) return;
    root.classList.toggle('lowfx', !!(on || lowForced));
  }
  var win = { t0: 0, total: 0, slow: 0, good: 0, last: 0 };
  var monId = 0;
  function monitor(ts) {
    monId = 0;
    var dt = win.last ? ts - win.last : 0;
    win.last = ts;
    if (dt > 0 && dt < 500 && !(doc && doc.hidden)) {
      win.total++;
      if (dt > 1.5 * (1000 / hz)) win.slow++;
    } else if (dt >= 500) { win.t0 = ts; win.total = 0; win.slow = 0; }
    if (!win.t0) win.t0 = ts;
    if (ts - win.t0 >= 2000) {
      if (win.total >= 10) {
        var r = win.slow / win.total;
        if (r >= 0.9) { lowAuto = true; win.good = 0; setLow(true); }
        else if (lowAuto && r < 0.2) {
          if (++win.good >= 3) { lowAuto = false; win.good = 0; setLow(false); }
        } else if (r >= 0.2) win.good = 0;
      }
      win.t0 = ts; win.total = 0; win.slow = 0;
    }
    if (!(doc && doc.hidden)) monId = raf(monitor);
  }
  function startMonitor() { if (monId) return; win.last = 0; win.t0 = 0; monId = raf(monitor); }

  function particles(n) { return root && root.classList.contains('lowfx') ? Math.max(1, Math.ceil(n / 3)) : n; }

  /* ---------- iconos animados ---------- */
  var ICONS = {
    spark: '<path class="a" d="M12 3c.6 4.6 2.4 6.4 7 7-4.6.6-6.4 2.4-7 7-.6-4.6-2.4-6.4-7-7 4.6-.6 6.4-2.4 7-7z"/><path class="b" d="M19 16v4M17 18h4"/>',
    dots: '<circle class="a" cx="5.5" cy="12" r="1.8"/><circle class="b" cx="12" cy="12" r="1.8"/><circle class="c" cx="18.5" cy="12" r="1.8"/>',
    wave: '<path class="w1" d="M4 10v4"/><path class="w2" d="M8 7v10"/><path class="w3" d="M12 4v16"/><path class="w4" d="M16 7v10"/><path class="w5" d="M20 10v4"/>',
    mic: '<circle class="r" cx="12" cy="8.5" r="6"/><rect class="a" x="9" y="3" width="6" height="11" rx="3"/><path d="M5.5 11a6.5 6.5 0 0013 0M12 17.5V21"/>',
    check: '<circle class="c" cx="12" cy="12" r="9"/><path class="a" pathLength="1" d="M7.5 12.5l3 3 6-6.5"/>',
    heart: '<path class="a" d="M12 20s-7-4.4-7-10a4 4 0 017-2.6A4 4 0 0119 10c0 5.6-7 10-7 10z"/>',
    sun: '<circle class="b" cx="12" cy="12" r="4"/><g class="a"><path d="M12 2.5v2.5M12 19v2.5M2.5 12H5M19 12h2.5M5.3 5.3l1.8 1.8M16.9 16.9l1.8 1.8M18.7 5.3l-1.8 1.8M7.1 16.9l-1.8 1.8"/></g>',
    cloud: '<path class="a" d="M7 18a4 4 0 01-.5-8A5.5 5.5 0 0117 8.5 4.5 4.5 0 0117.5 18z"/>',
    leaf: '<g class="a"><path d="M5 19C5 10 10 5 20 4c0 10-5 15-13 15"/><path d="M5 19c3-5 6-8 10-10"/></g>',
    star: '<path class="a" d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9 6.8 19.6l1-5.8L3.5 9.7l5.9-.9z"/>',
    bell: '<path class="a" d="M6 16v-5a6 6 0 0112 0v5l1.5 2h-15z"/><path class="b" d="M10 20.5a2 2 0 004 0"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path class="h" d="M12 12V8"/><path class="m" d="M12 12V6"/>',
    book: '<path d="M12 6v13"/><path d="M12 6C10 4.8 7 4.5 4 5v13c3-.5 6-.2 8 1"/><g class="a"><path d="M12 6c2-1.2 5-1.5 8-1v13c-3-.5-6-.2-8 1"/></g>',
    cross: '<circle class="g" cx="12" cy="12" r="9"/><path class="a" d="M12 5.5v13M8 9.5h8"/>',
    dove: '<g class="a"><path d="M3.5 14c4 1.5 8.5.5 10.5-4l4.5 2c-.5 5-4.500 8-9 7.500-2-.2-4-1.500-6-5.500z"/><path class="w" d="M13 10c0-3.500 2-6 6.500-7-.2 4-2 6.500-5.500 7.500"/></g>',
    flame: '<path class="a" d="M12 3c1 3.500 5 5.500 5 10a5 5 0 01-10 0c0-2 1-3.500 2-4.500.3 1.500 1 2.300 2 2.500C10.500 8 10.500 5 12 3z"/>',
    drop: '<path class="a" d="M12 3.500s6 6.200 6 10.500a6 6 0 01-12 0c0-4.300 6-10.500 6-10.500z"/><path class="b" d="M9.500 14.500a2.500 2.500 0 002.200 2.400"/>',
    gear: '<circle cx="12" cy="12" r="3"/><g class="a"><circle cx="12" cy="12" r="6"/><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.600 5.600l2.100 2.100M16.300 16.300l2.100 2.100M18.400 5.600l-2.100 2.100M7.700 16.300l-2.100 2.100"/></g>',
    bolt: '<path class="a" d="M13 2.500L5 13.500h6l-1 8 8-11h-6z"/>',
    lock: '<rect x="5" y="11" width="14" height="9.500" rx="2.500"/><path class="a" d="M8 11V8a4 4 0 018 0v3"/>',
    search: '<g class="a"><circle cx="10.500" cy="10.500" r="6"/><path d="M15 15l5.500 5.500"/></g>',
    mail: '<rect x="3" y="5.500" width="18" height="13" rx="2.500"/><path class="a" d="M3.500 7l8.500 6 8.500-6"/>',
    note: '<g class="a"><path d="M9 18V5l10-2v13"/><circle cx="6.500" cy="18" r="2.500"/><circle cx="16.500" cy="16" r="2.500"/></g>',
    play: '<path class="a" d="M8 5.500v13l11-6.500z"/>',
    pause: '<path class="a" d="M8.500 5.500v13M15.500 5.500v13"/>',
    moon: '<path class="a" d="M20 14.500A8.500 8.500 0 019.500 4 8.500 8.500 0 1020 14.500z"/><path class="b" d="M17 4v3M15.500 5.500h3"/>'
  };
  var iconNames = Object.keys(ICONS);
  function hasIcon(name) { return typeof name === 'string' && Object.prototype.hasOwnProperty.call(ICONS, name); }
  function cleanSize(size) {
    size = Math.round(+size);
    if (!(size > 0)) return 24;
    return Math.min(256, Math.max(8, size));
  }
  function iconSvg(name, size) {
    if (!hasIcon(name)) return '';
    var body = ICONS[name];
    size = cleanSize(size);
    return '<svg class="ai ai-' + name + '" viewBox="0 0 24 24" width="' + size + '" height="' + size +
      '" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' + body + '</svg>';
  }
  var io = null;
  try {
    if (w.IntersectionObserver) {
      io = new w.IntersectionObserver(function (es) {
        for (var i = 0; i < es.length; i++) {
          if (es[i].isIntersecting) es[i].target.removeAttribute('data-off');
          else es[i].target.setAttribute('data-off', '');
        }
      });
    }
  } catch (e) { io = null; }
  function resolve(el) {
    if (typeof el === 'string') { try { return doc && doc.querySelector(el); } catch (e) { return null; } }
    return el;
  }
  function mount(el, name, size) {
    el = resolve(el);
    if (!el || el.nodeType !== 1 || !hasIcon(name)) return el || null;
    var sz = cleanSize(size || (el.getAttribute && el.getAttribute('data-aicon-size')));
    var fc = el.firstElementChild;
    if (el.__aiName === name && el.__aiSize === sz && fc && fc.classList && fc.classList.contains('ai')) return el;
    el.__aiName = name; el.__aiSize = sz;
    el.innerHTML = iconSvg(name, sz);
    el.classList.add('aicon');
    if (io) { try { io.observe(el); } catch (e) {} }
    return el;
  }
  function hydrate(node) {
    if (!node || node.nodeType !== 1) return;
    if (node.hasAttribute('data-aicon')) mount(node, node.getAttribute('data-aicon'));
    if (node.firstElementChild) {
      var list = node.querySelectorAll('[data-aicon]');
      for (var i = 0; i < list.length; i++) mount(list[i], list[i].getAttribute('data-aicon'));
    }
  }

  /* ---------- observadores ligeros ---------- */
  var pending = [], flushing = false, ovObs = null;
  function watchOverlay(el) {
    if (!el || el.__fxW) return;
    el.__fxW = 1;
    if (el.classList.contains('on')) el.setAttribute('data-fx-sheet', '');
    if (ovObs) ovObs.observe(el, { attributes: true, attributeFilter: ['class'] });
  }
  function scanOverlays(node) {
    if (!node || node.nodeType !== 1) return;
    try {
      if (node.matches && node.matches(OV)) watchOverlay(node);
      if (node.firstElementChild) {
        var l = node.querySelectorAll(OV);
        for (var i = 0; i < l.length; i++) watchOverlay(l[i]);
      }
    } catch (e) {}
  }
  function flush() {
    flushing = false;
    var list = pending; pending = [];
    var msgs = 0, i, n;
    for (i = 0; i < list.length; i++) {
      n = list[i];
      if (n.nodeType !== 1) continue;
      hydrate(n);
      scanOverlays(n);
      if (n.parentNode && n.parentNode.id === 'log' && n.classList.contains('m')) msgs++;
    }
    /* entrada solo si llegan pocos mensajes a la vez (no al cargar el historial) */
    if (msgs > 0 && msgs <= 4 && !(doc && doc.hidden)) {
      for (i = 0; i < list.length; i++) {
        n = list[i];
        if (n.nodeType === 1 && n.parentNode && n.parentNode.id === 'log' && n.classList.contains('m')) n.classList.add('fx-in');
      }
    }
  }
  function enqueue(n) {
    pending.push(n);
    if (!flushing) { flushing = true; raf(flush); }
  }
  function startObservers() {
    if (!doc.body) return;
    if (!w.MutationObserver) { hydrate(doc.body); return; }
    try {
      ovObs = new w.MutationObserver(function (ms) {
        for (var i = 0; i < ms.length; i++) {
          var t = ms[i].target;
          if (t.classList && t.classList.contains('on')) t.setAttribute('data-fx-sheet', '');
        }
      });
    } catch (e) { ovObs = null; }
    var mo = new w.MutationObserver(function (ms) {
      for (var i = 0; i < ms.length; i++) {
        var m = ms[i];
        if (m.type === 'attributes') { enqueue(m.target); continue; }
        for (var j = 0; j < m.addedNodes.length; j++) {
          var n = m.addedNodes[j];
          if (n.nodeType === 1) enqueue(n);
        }
      }
    });
    mo.observe(doc.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['data-aicon'] });
    /* pasada inicial */
    hydrate(doc.body);
    scanOverlays(doc.body);
  }

  /* ---------- will-change solo durante la animacion + haptico ---------- */
  var pressed = null;
  function wcOn(el) { el.classList.add('fx-wc'); }
  function wcOff(el) { if (el && el.classList) el.classList.remove('fx-wc'); }
  function bindEvents() {
    var opt = { passive: true, capture: true };
    doc.addEventListener('animationstart', function (e) {
      if (e.animationName && e.animationName.indexOf('fx-') === 0 && e.target.classList && !e.target.closest('.ai')) wcOn(e.target);
    }, opt);
    var endA = function (e) {
      if (e.animationName && e.animationName.indexOf('fx-') === 0 && e.target.classList) {
        wcOff(e.target);
        if (e.target.classList.contains('fx-in')) e.target.classList.remove('fx-in');
      }
    };
    doc.addEventListener('animationend', endA, opt);
    doc.addEventListener('animationcancel', endA, opt);
    doc.addEventListener('transitionend', function (e) {
      if (e.propertyName === 'transform' && e.target !== pressed) wcOff(e.target);
    }, opt);
    doc.addEventListener('pointerdown', function (e) {
      var t = e.target, b = t && t.closest ? t.closest('button,.cnc,.pill,.chip,[role=button]') : null;
      if (!b) return;
      pressed = b; wcOn(b);
      if (b.classList.contains('hap')) tap();
    }, opt);
    var up = function () {
      var b = pressed; pressed = null;
      if (b) w.setTimeout(function () { wcOff(b); }, 500); /* respaldo si no llega transitionend */
    };
    doc.addEventListener('pointerup', up, opt);
    doc.addEventListener('pointercancel', up, opt);
    doc.addEventListener('visibilitychange', function () {
      if (doc.hidden) { root.classList.add('fx-hidden'); if (loopId) { caf(loopId); loopId = 0; } }
      else {
        root.classList.remove('fx-hidden');
        kick();
        win.last = 0; win.t0 = 0;
        w.setTimeout(function () { measure(40, startMonitor); startMonitor(); }, 250);
      }
    });
  }

  /* ---------- arranque ---------- */
  function boot() {
    injectCss();
    try {
      if (nav.connection && nav.connection.saveData) lowForced = true;
      if (nav.hardwareConcurrency && nav.hardwareConcurrency <= 4) lowForced = true;
    } catch (e) {}
    if (lowForced) setLow(true);
    applyHz(60);
    bindEvents();
    measure(40, function () { startMonitor(); });
    if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', startObservers, { once: true });
    else startObservers();
  }

  w.CalexMotion = {
    version: 1,
    frame: frame,
    damp: damp,
    spring: spring,
    tap: tap,
    measure: function (n, cb) { measure(n, cb); },
    snap: snapHz,
    particles: particles,
    get hz() { return hz; },
    get budget() { return 1000 / hz; },
    get reduced() { return reduced(); }
  };
  w.AnimIcons = {
    names: iconNames,
    svg: iconSvg,
    mount: mount,
    hydrate: hydrate
  };

  if (doc && root) boot();
})();
