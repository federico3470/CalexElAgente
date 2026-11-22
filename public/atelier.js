/* Calex · Atelier. Presentación editorial: papel y tinta, tipografía con serifa, líneas finas, sin vidrio ni burbujas.
   Se activa con html[data-ui="atelier"]. La presentación anterior sigue disponible en Ajustes (Clásica). */
(function () {
  if (window.CalexAtelier) return;
  var P = 'html[data-ui="atelier"] body:not(.assist):not(.tv)', H = 'html[data-ui="atelier"]';
  var ORN = "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 130 14'><path d='M0 7H52M78 7H130' stroke='black' stroke-width='1'/><path d='M65 1L71 7L65 13L59 7Z' fill='none' stroke='black' stroke-width='1'/></svg>\")";
  var GRAIN = "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='180' height='180'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 .5 0 0 0 0 .5 0 0 0 0 .5 0 0 0 .09 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>\")";
  var CSS = [
    H + '{--serif:"Iowan Old Style","Palatino Linotype",Palatino,"Book Antiqua","Noto Serif",Georgia,serif;--hair:color-mix(in srgb,var(--txt) 17%,transparent);--hair2:color-mix(in srgb,var(--txt) 8%,transparent);--ease:cubic-bezier(.32,.72,0,1)}',
    P + '{display:block!important;padding:0!important;gap:0!important;font-family:var(--serif)!important;font-size:17px;line-height:1.7;letter-spacing:0!important;font-weight:400;background:var(--bg)!important;background-image:none!important;overflow:hidden;scrollbar-width:thin;scrollbar-color:var(--hair) transparent}',
    P + ' *{scrollbar-width:thin;scrollbar-color:var(--hair) transparent}',
    P + '::before{content:""!important;position:fixed!important;inset:0!important;z-index:-1;pointer-events:none;filter:none!important;animation:none!important;transform:none!important;opacity:1!important;background:' + GRAIN + '!important}',
    P + '::after{display:none!important}',
    /* superficies planas: se elimina todo vidrio, desenfoque, sombra y redondeo */
    P + ' #side,' + P + ' header,' + P + ' #row,' + P + ' .pmb,' + P + ' #set,' + P + ' #obc,' + P + ' #lgc,' + P + ' .card,' + P + ' .legal,' + P + ' .t,' + P + ' details.think,' + P + ' #oas details,' + P + ' .sug,' + P + ' .stepcard,' + P + ' .tile,' + P + ' #wbc,' + P + ' #cnp,' + P + ' .cnc,' + P + ' .cnk div,' + P + ' #comp{background:transparent!important;background-image:none!important;-webkit-backdrop-filter:none!important;backdrop-filter:none!important;box-shadow:none!important;border-radius:0!important;border-color:var(--hair)!important}',
    /* controles */
    P + ' button,' + P + ' select,' + P + ' input[type=text],' + P + ' input[type=search],' + P + ' input[type=number],' + P + ' input[type=password],' + P + ' input[type=email],' + P + ' textarea{border-radius:2px!important;background:transparent!important;background-image:none!important;box-shadow:none!important;border:1px solid var(--hair)!important;color:var(--txt)!important;font-family:var(--serif)!important;-webkit-backdrop-filter:none!important;backdrop-filter:none!important;transition:background .35s var(--ease),border-color .35s var(--ease),color .35s var(--ease),transform .35s var(--ease),opacity .35s!important}',
    P + ' button{font-variant-caps:all-small-caps;letter-spacing:.14em;font-size:15px;padding:9px 18px;transform:none!important}',
    P + ' button:hover{border-color:var(--acc)!important;color:var(--acc)!important;background:transparent!important;transform:none!important}',
    P + ' button:active{transform:scale(.985)!important}',
    P + ' button.pri,' + P + ' #go{background:var(--acc)!important;border-color:var(--acc)!important;color:var(--onacc,#111)!important}',
    P + ' button.pri:hover,' + P + ' #go:hover{background:var(--accd)!important;border-color:var(--accd)!important;color:var(--onacc,#111)!important}',
    P + ' #go.stop{background:transparent!important;border-color:var(--bad)!important;color:var(--bad)!important}',
    P + ' select{font-variant-caps:normal;letter-spacing:0;font-size:15px;padding:8px 10px}',
    P + ' ::placeholder{font-style:italic;color:var(--mut)!important;opacity:1}',
    P + ' :focus-visible{outline:1px solid var(--acc)!important;outline-offset:3px!important}',
    /* encabezado: cabecera de periódico */
    P + ' header{position:relative;display:flex;flex-wrap:wrap;align-items:center;gap:4px;padding:26px 32px 8px!important;margin:0!important;border:0!important;border-bottom:1px solid var(--hair)!important}',
    P + ' header>svg,' + P + ' header .tag{display:none!important}',
    P + ' header .brand{order:-1;flex:0 0 100%;position:static;transform:none;align-items:center;text-align:center;margin:0 0 16px;padding-bottom:16px;border-bottom:1px solid var(--hair2)}',
    P + ' header select{max-width:210px;text-overflow:ellipsis}',
    P + ' header .name{font:400 21px/1 var(--serif)!important;letter-spacing:.46em;padding-left:.46em;text-transform:uppercase;color:var(--txt)!important;background:none!important;-webkit-text-fill-color:currentColor!important}',
    P + ' header .brand::after{content:attr(data-folio);display:block;margin-top:7px;font:400 11.5px/1 var(--serif);font-variant-caps:all-small-caps;letter-spacing:.26em;color:var(--mut)}',
    P + ' header button,' + P + ' header select{border-color:transparent!important;font-size:14.5px;padding:7px 10px;height:auto!important;width:auto}',
    P + ' header #bt{font-size:0!important;width:32px;height:32px;padding:0;position:relative}',
    P + ' header #bt::before{content:"";position:absolute;left:6px;right:6px;top:11px;height:1px;background:var(--txt);box-shadow:0 5px 0 var(--txt),0 10px 0 var(--txt)}',
    P + ' header .avb{width:36px!important;height:36px!important;padding:0!important;border-radius:50%!important;border:1px solid var(--hair)!important;overflow:hidden;line-height:0;margin-left:6px}',
    /* archivo (historial) como cajón lateral */
    P + ' #side{position:fixed!important;left:0;top:0;bottom:0;width:min(380px,88vw)!important;z-index:30;margin:0!important;padding:34px 0 20px!important;background:var(--bg)!important;border:0!important;border-right:1px solid var(--hair)!important;transform:none;transition:transform .55s var(--ease),box-shadow .55s!important;box-shadow:50px 0 140px #000a!important;display:flex;flex-direction:column}',
    P + ' #side.hide{transform:translateX(-104%)!important;margin:0!important;box-shadow:none!important}',
    P + ' #side .sh{padding:0 28px 14px!important}',
    P + ' #side .sh button{width:100%;text-align:left;padding:12px 16px}',
    P + ' #side .hl{font-size:0!important;padding:18px 28px 8px!important;border-bottom:1px solid var(--hair)}',
    P + ' #side .hl::after{content:"Archivo de consultas";font:400 12.5px/1 var(--serif);font-variant-caps:all-small-caps;letter-spacing:.26em;color:var(--acc)}',
    P + ' #hs{border:0!important;border-bottom:1px solid var(--hair)!important;border-radius:0!important;padding:12px 0!important;font-size:16px}',
    P + ' #hist{counter-reset:h;padding:6px 0 10px!important}',
    P + ' .h{counter-increment:h;display:flex;align-items:baseline;gap:6px;padding:14px 28px!important;border-radius:0!important;border-bottom:1px solid var(--hair2);background:transparent!important;color:var(--txt)!important;transition:padding .4s var(--ease),color .3s!important}',
    P + ' .h span{font-size:16.5px;line-height:1.35}',
    P + ' .h span::before{content:counter(h,decimal-leading-zero) "  ";font-size:12px;letter-spacing:.12em;color:var(--acc);font-variant-numeric:oldstyle-nums}',
    P + ' .h:hover{padding-left:36px!important}',
    P + ' .h.on{font-style:italic;border-left:2px solid var(--acc);padding-left:26px!important;background:transparent!important}',
    P + ' #credit{font-variant-caps:all-small-caps;letter-spacing:.26em;color:var(--mut);text-align:center;font-size:11.5px;padding:14px 0 0}',
    '#atscrim{position:fixed;inset:0;z-index:29;background:rgba(0,0,0,.5);opacity:0;pointer-events:none;transition:opacity .5s var(--ease)}#atscrim.on{opacity:1;pointer-events:auto}',
    /* conversación: columna de lectura, numerada, sin burbujas */
    P + ' #main{height:100vh;height:100dvh;display:flex;flex-direction:column;width:100%;max-width:none;margin:0!important}',
    P + ' #log{max-width:780px!important;width:100%;margin:0 auto!important;padding:54px 32px 28px!important;gap:0!important;counter-reset:ex}',
    P + ' .m{max-width:100%!important;width:100%;margin:0;padding:0!important;border:0!important;border-radius:0!important;background:transparent!important;background-image:none!important;box-shadow:none!important;-webkit-backdrop-filter:none!important;backdrop-filter:none!important;color:var(--txt)!important;font-size:18px;line-height:1.8;text-align:left;animation:atin .8s var(--ease) both!important}',
    P + ' .m.u{align-self:stretch!important;margin-top:46px;padding-top:28px!important;border-top:1px solid var(--hair)!important;counter-increment:ex;font-style:italic;font-size:19px;line-height:1.65}',
    P + ' .m.u:first-child{margin-top:0;border-top:0!important;padding-top:0!important}',
    P + ' .m.u::before{content:counter(ex,upper-roman) ".   Consulta";display:block;font:normal 12.5px/1 var(--serif);font-variant-caps:all-small-caps;letter-spacing:.28em;color:var(--acc);margin-bottom:14px}',
    P + ' .m.a{align-self:stretch!important;margin-top:22px;padding-left:24px!important;border-left:1px solid var(--acc)!important}',
    P + ' .m.a::before{content:"Respuesta";display:block;font:normal 12.5px/1 var(--serif);font-variant-caps:all-small-caps;letter-spacing:.28em;color:var(--mut);margin-bottom:12px}',
    P + ' .m a{color:var(--acc)!important;text-underline-offset:3px}',
    P + ' .m code{font-family:ui-monospace,Consolas,monospace;font-size:.86em;background:color-mix(in srgb,var(--txt) 7%,transparent)!important;border-radius:2px!important;padding:1px 6px}',
    P + ' pre{border:1px solid var(--hair)!important;border-radius:2px!important;background:color-mix(in srgb,var(--txt) 4%,transparent)!important;box-shadow:none!important}',
    P + ' .acts button{border:0!important;padding:4px 10px 4px 0;font-size:13px;color:var(--mut)!important}',
    P + ' .u img,' + P + ' .m img{border-radius:2px!important}',
    P + ' .t,' + P + ' details.think{font-size:15px;font-style:italic;color:var(--mut)!important;border:0!important;border-left:1px solid var(--hair)!important;padding:4px 14px!important}',
    /* bienvenida: portada editorial */
    P + ' .empty{max-width:660px;margin:7vh auto 0!important;text-align:left!important;color:var(--mut)!important;font-style:italic;font-size:19px;line-height:1.6;animation:atin 1s var(--ease) both!important}',
    P + ' .empty .gav{display:none!important}',
    P + ' .empty::before{content:"";display:block;width:130px;height:14px;background:var(--acc);-webkit-mask:' + ORN + ' left center/contain no-repeat;mask:' + ORN + ' left center/contain no-repeat;margin-bottom:38px}',
    P + ' .empty b{font:400 clamp(40px,6.4vw,64px)/1.05 var(--serif)!important;letter-spacing:-.015em!important;color:var(--txt)!important;margin:0 0 20px!important;font-style:normal;display:block}',
    P + ' .empty small{display:block;font-size:15.5px;font-style:normal;margin-top:16px;max-width:48ch;line-height:1.65;color:var(--mut)!important}',
    P + ' .empty .ttl{font-variant-caps:all-small-caps;letter-spacing:.24em}',
    P + ' .sugs{display:flex!important;flex-direction:column;margin-top:48px;border-top:1px solid var(--hair);counter-reset:sg;gap:0!important}',
    P + ' .sugs .sg{counter-increment:sg;display:flex;gap:20px;align-items:baseline;width:100%;text-align:left;border:0!important;border-bottom:1px solid var(--hair)!important;border-radius:0!important;padding:19px 4px!important;font:400 19.5px/1.4 var(--serif)!important;font-style:normal;font-variant-caps:normal!important;letter-spacing:0!important;color:var(--txt)!important;transition:padding .5s var(--ease),color .3s!important}',
    P + ' .sugs .sg::before{content:counter(sg,upper-roman) ".";flex:none;width:34px;color:var(--acc);font-size:14px;font-variant-caps:all-small-caps;letter-spacing:.12em}',
    P + ' .sugs .sg:hover{padding-left:16px!important;color:var(--acc)!important}',
    /* escritura: una línea de redacción al pie */
    P + ' #comp{width:100%;max-width:780px;margin:0 auto;padding:0 32px 22px!important;border:0!important}',
    P + ' #row{display:flex;align-items:flex-end;gap:10px;padding:14px 0 0!important;border:0!important;border-top:1px solid var(--txt)!important}',
    P + ' #row textarea{flex:1;border:0!important;font:400 19px/1.55 var(--serif)!important;min-height:54px;max-height:200px;padding:11px 2px!important;resize:none;background:transparent!important}',
    P + ' #row .tb{width:42px;height:42px;padding:0;border-radius:50%!important;display:grid;place-items:center;border:1px solid var(--hair)!important}',
    P + ' #row #go{min-width:108px;height:44px;padding:0 22px}',
    P + ' #row #liv{height:44px;padding:0 16px}',
    P + ' #bar{justify-content:center;gap:18px;padding:12px 0 0;font-variant-caps:all-small-caps;letter-spacing:.2em;font-size:11.5px;color:var(--mut);opacity:.75}',
    P + ' #bar span{background:none!important;border:0!important;padding:0!important}',
    /* hojas: ajustes, conectores, presentación inicial */
    P + ' #ov,' + P + ' #cnov,' + P + ' #wb{background:color-mix(in srgb,var(--bg) 86%,transparent)!important;-webkit-backdrop-filter:none!important;backdrop-filter:none!important}',
    P + ' #set,' + P + ' #cnp,' + P + ' .pmb,' + P + ' #wbc,' + P + ' #obc,' + P + ' #lgc{background:var(--bg)!important;border:1px solid var(--hair)!important;box-shadow:0 50px 140px #000b!important;padding:30px 34px!important;animation:atin .7s var(--ease) both!important}',
    P + ' #set h3,' + P + ' #cnp h3,' + P + ' #obc h2,' + P + ' #lgc h2{font:400 30px/1.15 var(--serif)!important;letter-spacing:-.01em;margin:0 0 6px}',
    P + ' #set h4,' + P + ' #cnp h4{font:400 12.5px/1 var(--serif)!important;font-variant-caps:all-small-caps;letter-spacing:.28em;text-transform:none!important;color:var(--acc)!important;border-bottom:1px solid var(--hair);padding-bottom:9px;margin:30px 0 12px!important}',
    P + ' #ob,' + P + ' #lg{background:var(--bg)!important;background-image:none!important}',
    P + ' #ob::before,' + P + ' #lg::before,' + P + ' #ob::after,' + P + ' #lg::after{display:none!important}',
    P + ' .th{border-radius:2px!important}',
    P + ' #strow{display:none!important}',
    P + ' #isl .islp,' + P + ' #isl .islb{border-radius:2px!important;box-shadow:none!important;border:1px solid var(--hair)}',
    '@keyframes atin{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:none}}',
    '@media(max-width:760px){' + P + ' header{padding:14px 14px 12px!important}' + P + ' header .name{font-size:17px;letter-spacing:.36em}' + P + ' #log{padding:34px 20px 18px!important}' + P + ' #comp{padding:0 18px 16px!important}' + P + ' .m.u{font-size:18px}' + P + ' .m{font-size:17px}' + P + ' .empty{margin-top:3vh!important}' + P + ' #row #go{min-width:84px;padding:0 14px}}',
    '@media(prefers-reduced-motion:reduce){' + P + ' .m,' + P + ' .empty,' + P + ' #set{animation:none!important}}'
  ].join('\n');
  var MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'], DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
  function folio() { var d = new Date(); return DIAS[d.getDay()] + ' ' + d.getDate() + ' de ' + MESES[d.getMonth()] + ' de ' + d.getFullYear(); }
  function mode() { try { var v = localStorage.getItem('calex-ui2'); return v === 'atelier' || v === 'classic' || v === 'material' ? v : 'ios'; } catch (e) { return 'ios'; } }
  function themeFor(m) { var light = window.matchMedia && matchMedia('(prefers-color-scheme: light)').matches; return m === 'ios' ? (light ? 'i-claro' : 'i-oscuro') : (light ? 'a-papel' : 'a-tinta'); }
  function setMode(m, userChoice) {
    var h = document.documentElement; if (m === 'classic') h.removeAttribute('data-ui'); else h.setAttribute('data-ui', m);
    try { localStorage.setItem('calex-ui2', m); if (m !== 'classic' && (userChoice || !localStorage.getItem('calex-ui2-t'))) { localStorage.setItem('calex-ui2-t', '1'); if (m === 'material' && window.CalexMaterial) CalexMaterial.apply(); else if (typeof applyTheme === 'function') applyTheme(themeFor(m), true); } } catch (e) { }
    wire();
  }
  var wired = false;
  function ui() { return document.documentElement.getAttribute('data-ui'); }
  function wire() {
    var b = document.querySelector('header .brand'); if (b) b.setAttribute('data-folio', folio());
    var q = document.getElementById('q'); if (q) { if (!q.dataset.ph0) q.dataset.ph0 = q.placeholder; q.placeholder = ui() === 'atelier' ? 'Escriba aquí…' : ui() === 'ios' ? 'Mensaje' : ui() === 'material' ? 'Escribe un mensaje' : q.dataset.ph0; }
    var side = document.getElementById('side'); if (!side) return;
    var sc = document.getElementById('atscrim'); if (!sc) { sc = document.createElement('div'); sc.id = 'atscrim'; document.body.appendChild(sc); sc.addEventListener('click', function () { side.classList.add('hide'); }); }
    var drawer = function () { return ui() === 'atelier' || ((ui() === 'ios' || ui() === 'material') && innerWidth < 900); };
    var sync = function () { sc.classList.toggle('on', !side.classList.contains('hide') && drawer()); };
    if (!wired) {
      wired = true; new MutationObserver(sync).observe(side, { attributes: true, attributeFilter: ['class'] }); addEventListener('resize', sync);
      document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !side.classList.contains('hide') && drawer()) side.classList.add('hide'); });
      side.addEventListener('click', function (e) { if (!drawer()) return; if (e.target.closest('#bn') || e.target.closest('.h span') || e.target.closest('#bs') || e.target.closest('#bcn') || e.target.closest('#bfn')) setTimeout(function () { side.classList.add('hide'); }, 120); });
    }
    if (ui() === 'atelier' && !side.dataset.atInit) { side.dataset.atInit = '1'; side.classList.add('hide'); }
    sync();
    var row = document.getElementById('strow'), old = document.getElementById('uisel');
    if (row && !old) {
      var r = document.createElement('div'); r.className = 'r'; r.innerHTML = '<label>Presentación<small>iOS: esquinas redondeadas y movimiento de resorte. Material You Expressive: color tonal que usted elige y las formas de Material 3 Expresivo. Atelier: papel y tinta, estilo editorial. Clásica: la presentación original.</small></label><select id="uisel"><option value="ios">iOS</option><option value="material">Material You Expressive</option><option value="atelier">Atelier</option><option value="classic">Clásica</option></select>';
      row.parentNode.insertBefore(r, row); var s = r.querySelector('select'); s.value = mode(); s.onchange = function () { setMode(s.value, true); var mr = document.getElementById('matrow'); if (mr) mr.style.display = s.value === 'material' ? '' : 'none'; };
    } else if (old) old.value = mode();
    var ms = document.getElementById('matseed'), uis = document.getElementById('uisel');
    if (uis && !ms && window.CalexMaterial) {
      var rr = document.createElement('div'); rr.className = 'r'; rr.id = 'matrow'; rr.innerHTML = '<label>Color de Material You<small>El color base con el que se genera toda la paleta.</small></label><select id="matseed">' + CalexMaterial.SEEDS.map(function (x) { return '<option value="' + x[1] + '">' + x[0] + '</option>'; }).join('') + '</select>';
      uis.closest('.r').parentNode.insertBefore(rr, uis.closest('.r').nextSibling); var sel = rr.querySelector('select'); sel.value = String(CalexMaterial.seed()); sel.onchange = function () { CalexMaterial.setSeed(+sel.value); };
    }
    var mr = document.getElementById('matrow'); if (mr) mr.style.display = mode() === 'material' ? '' : 'none';
  }
  function boot() {
    var st = document.createElement('style'); st.id = 'calex-atelier'; st.textContent = CSS; document.head.appendChild(st);
    if (document.body && document.body.classList.contains('tv')) return;
    setMode(mode(), false);
  }
  window.CalexAtelier = { setMode: setMode, mode: mode, folio: folio };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
