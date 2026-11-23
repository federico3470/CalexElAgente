/* Calex · modo aplicación. Cuando Calex está instalado (pantalla de inicio de iPhone o Android, o la app nativa), la interfaz cambia respecto de la web:
   barra de pestañas inferior como una app nativa, pantalla de inicio con el logo, sin rebote de página ni selección accidental de texto y márgenes seguros.
   En el navegador normal se mantiene la interfaz web. */
(function () {
  if (window.CalexApp) return;
  var ua = navigator.userAgent, standalone = false;
  try { standalone = (window.matchMedia && matchMedia('(display-mode: standalone)').matches) || navigator.standalone === true || /CalexApp/.test(ua) || /[?&]app=1/.test(location.search); } catch (e) { }
  if (!standalone || /CalexTV/.test(ua) || /[?&](tv|assist|auto)=/.test(location.search)) { window.CalexApp = { on: false }; return; }
  var root = document.documentElement; root.classList.add('app');
  var svg = function (inner) { return "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='1.9' stroke-linecap='round' stroke-linejoin='round'>" + inner + "</svg>\")"; };
  var IC = {
    chat: svg("<path d='M4 5.5h16a1 1 0 0 1 1 1V16a1 1 0 0 1-1 1H10l-4.5 3.5V17H4a1 1 0 0 1-1-1V6.5a1 1 0 0 1 1-1z'/>"),
    arch: svg("<rect x='3' y='4.5' width='18' height='15' rx='3.5'/><path d='M9.5 4.5v15'/>"),
    fun: svg("<rect x='4' y='4' width='7' height='7' rx='2'/><rect x='13' y='4' width='7' height='7' rx='2'/><rect x='4' y='13' width='7' height='7' rx='2'/><rect x='13' y='13' width='7' height='7' rx='2'/>"),
    set: svg("<path d='M4 7h9M17 7h3M4 17h3M11 17h9'/><circle cx='15' cy='7' r='2'/><circle cx='9' cy='17' r='2'/>")
  };
  var TB = 56, N = 'html.app body:not(.assist):not(.tv)';
  var CSS = [
    'html.app,html.app body{overscroll-behavior:none;-webkit-touch-callout:none;-webkit-user-select:none;user-select:none;touch-action:manipulation}',
    'html.app .m,html.app .m *,html.app textarea,html.app input,html.app pre,html.app .srcp{-webkit-user-select:text;user-select:text}',
    N + ' #comp{margin-bottom:calc(' + TB + 'px + env(safe-area-inset-bottom,0px))}',
    '#tabbar{display:none}',
    N + ' #tabbar{display:flex;position:fixed;left:0;right:0;bottom:0;z-index:25;justify-content:space-around;align-items:stretch;height:calc(' + TB + 'px + env(safe-area-inset-bottom,0px));padding:0 6px env(safe-area-inset-bottom,0px);background:color-mix(in srgb,var(--bg) 80%,transparent);-webkit-backdrop-filter:saturate(180%) blur(24px);backdrop-filter:saturate(180%) blur(24px);box-shadow:0 -.5px 0 color-mix(in srgb,var(--txt) 14%,transparent);transition:transform .45s cubic-bezier(.32,.72,0,1)}',
    'html.app.kb body #tabbar{transform:translateY(110%)}html.app.kb ' + N.replace('html.app ', '') + ' #comp{margin-bottom:0}',
    '#tabbar button{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;border:0!important;background:transparent!important;box-shadow:none!important;border-radius:0!important;padding:4px 0!important;color:var(--mut)!important;font-size:10.5px!important;font-weight:500;letter-spacing:.01em!important;font-variant-caps:normal!important;text-transform:none;transition:color .25s!important;overflow:visible!important}',
    '#tabbar button i{display:block;width:25px;height:25px;background:currentColor;-webkit-mask:var(--ti) center/contain no-repeat;mask:var(--ti) center/contain no-repeat;transition:transform .45s cubic-bezier(.34,1.56,.64,1)}',
    '#tabbar button.on{color:var(--acc)!important}#tabbar button.on i{transform:scale(1.12)}#tabbar button:active i{transform:scale(.88)}',
    '#tabbar button[data-t="chat"]{--ti:' + IC.chat + '}#tabbar button[data-t="arch"]{--ti:' + IC.arch + '}#tabbar button[data-t="fun"]{--ti:' + IC.fun + '}#tabbar button[data-t="set"]{--ti:' + IC.set + '}',
    'html[data-ui="material"].app body #tabbar{background:var(--m-s2,var(--panel));-webkit-backdrop-filter:none;backdrop-filter:none;box-shadow:none}',
    'html[data-ui="material"].app #tabbar button{position:relative;font-size:12px!important}',
    'html[data-ui="material"].app #tabbar button.on{color:var(--m-osc,var(--txt))!important}',
    'html[data-ui="material"].app #tabbar button.on::before{content:"";position:absolute;top:6px;width:62px;height:32px;border-radius:16px;background:var(--m-sc,var(--panel));z-index:-1}',
    'html[data-ui="atelier"].app body #tabbar{background:var(--bg);-webkit-backdrop-filter:none;backdrop-filter:none;box-shadow:0 -1px 0 var(--hair)}',
    'html[data-ui="atelier"].app #tabbar button{font-family:var(--serif)!important;font-variant-caps:all-small-caps!important;letter-spacing:.18em!important;font-size:12.5px!important}',
    'html[data-ui="atelier"].app #tabbar button i{display:none}',
    '#appsplash{position:fixed;inset:0;z-index:999;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:18px;background:var(--bg,#000);transition:opacity .5s cubic-bezier(.32,.72,0,1),visibility .5s}#appsplash.out{opacity:0;visibility:hidden}',
    '#appsplash img{width:96px;height:96px;border-radius:24%;box-shadow:0 14px 44px rgba(60,110,255,.45);animation:splashpop .9s cubic-bezier(.34,1.56,.64,1) both}',
    '#appsplash b{font:600 15px/1 system-ui,sans-serif;letter-spacing:.38em;padding-left:.38em;color:var(--txt,#fff);opacity:.85}',
    '@keyframes splashpop{from{opacity:0;transform:scale(.6)}to{opacity:1;transform:none}}',
    '@media (prefers-reduced-motion:reduce){#appsplash img{animation:none}}'
  ].join('\n');
  function boot() {
    var st = document.createElement('style'); st.id = 'calex-app'; st.textContent = CSS; document.head.appendChild(st);
    var vp = document.querySelector('meta[name=viewport]'); if (vp) vp.setAttribute('content', 'width=device-width,initial-scale=1,viewport-fit=cover,maximum-scale=1,user-scalable=no');
    var q = function (id) { return document.getElementById(id); };
    var tb = document.createElement('nav'); tb.id = 'tabbar'; tb.setAttribute('aria-label', 'Secciones');
    tb.innerHTML = '<button type="button" data-t="chat" class="on"><i></i><span>Chat</span></button><button type="button" data-t="arch"><i></i><span>Archivo</span></button><button type="button" data-t="fun"><i></i><span>Funciones</span></button><button type="button" data-t="set"><i></i><span>Ajustes</span></button>';
    document.body.appendChild(tb);
    var cur = function () { var b = tb.querySelector('.on'); return b ? b.dataset.t : 'chat'; };
    var on = function (t) { tb.querySelectorAll('button').forEach(function (b) { b.classList.toggle('on', b.dataset.t === t); }); };
    var dlg = function () { return !!document.querySelector('.fn-ov.on,#fn-ov.on,[data-funciones].on,[role=dialog][aria-modal=true]'); };
    tb.addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (!b) return; var t = b.dataset.t, side = q('side');
      if (t === 'chat') { if (side) side.classList.add('hide'); var ov = q('ov'); if (ov) ov.classList.remove('on'); var cn = q('cnov'); if (cn) cn.classList.remove('on'); if (window.closeFunciones) closeFunciones(); on('chat'); }
      else if (t === 'arch') { if (side) side.classList.toggle('hide'); on(side && !side.classList.contains('hide') ? 'arch' : 'chat'); }
      else if (t === 'fun') { if (side) side.classList.add('hide'); if (window.openFunciones) openFunciones(); on('fun'); }
      else if (t === 'set') { if (side) side.classList.add('hide'); var bs = q('bs'); if (bs) bs.click(); on('set'); }
    });
    setInterval(function () { var ov = q('ov'), side = q('side'), t = cur(), open = (ov && ov.classList.contains('on')) || dlg(); if (!open && (t === 'set' || t === 'fun')) on('chat'); else if (t === 'arch' && side && side.classList.contains('hide')) on('chat'); else if (t === 'chat' && side && !side.classList.contains('hide') && innerWidth < 900) on('arch'); }, 500);
    if (window.visualViewport) { var base = visualViewport.height; visualViewport.addEventListener('resize', function () { var kb = visualViewport.height < base * .75; root.classList.toggle('kb', kb); if (!kb) base = Math.max(base, visualViewport.height); }); }
    var sp = document.createElement('div'); sp.id = 'appsplash'; sp.innerHTML = '<img src="/icon-192.png" alt=""><b>CALEX</b>'; document.body.appendChild(sp);
    var hide = function () { sp.classList.add('out'); setTimeout(function () { sp.remove(); }, 700); };
    if (document.readyState === 'complete') setTimeout(hide, 700); else addEventListener('load', function () { setTimeout(hide, 700); });
    setTimeout(hide, 4000);
  }
  window.CalexApp = { on: true };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
