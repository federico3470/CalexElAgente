/* Calex · motor de diseños. Un diseño es un conjunto de valores (forma, vidrio, desenfoque, sombras, tipografía, espaciado, movimiento);
   los colores siguen siendo los del tema elegido. Datos en window.CALEX_STYLES (estilos-data.js). */
(function () {
  if (window.CalexStyles) return;
  var FF = {
    sys: 'system-ui,-apple-system,"Segoe UI Variable","Segoe UI",Roboto,sans-serif',
    rounded: 'ui-rounded,"SF Pro Rounded","Segoe UI Variable Display","Nunito","Trebuchet MS",system-ui,sans-serif',
    serif: '"Iowan Old Style","Palatino Linotype",Palatino,Georgia,"Times New Roman",serif',
    humanist: '"Avenir Next",Avenir,"Segoe UI",Candara,"Gill Sans","Trebuchet MS",sans-serif',
    mono: 'ui-monospace,"SF Mono","Cascadia Mono",Consolas,"Liberation Mono",monospace',
    geo: '"Century Gothic","Futura","Avenir Next","Segoe UI",system-ui,sans-serif'
  };
  var MOT = {
    ios: ['cubic-bezier(.32,.72,0,1)', '.42s', '.22s'],
    spring: ['cubic-bezier(.2,.9,.3,1.25)', '.5s', '.26s'],
    smooth: ['cubic-bezier(.4,0,.2,1)', '.38s', '.2s'],
    crisp: ['cubic-bezier(.3,0,0,1)', '.2s', '.12s'],
    none: ['linear', '.01s', '.01s']
  };
  var STATIC = [
    'html[data-st] body{font-family:var(--s-ff)!important;font-weight:var(--s-fw);letter-spacing:var(--s-ls)}',
    'html[data-st] #side{border-radius:var(--s-rad)!important}',
    'html[data-st] header,html[data-st] #row{border-radius:calc(var(--s-rad)*.92)!important}',
    'html[data-st] #set,html[data-st] .pmb,html[data-st] #obc,html[data-st] #lgc,html[data-st] #wbc,html[data-st] .stepcard,html[data-st] .card,html[data-st] .legal,html[data-st] .tile,html[data-st] details.think{border-radius:var(--s-rad)!important}',
    'html[data-st] .m{border-radius:var(--s-radm)!important;padding:var(--s-pad) calc(var(--s-pad)*1.45)!important;animation-duration:var(--s-dur)!important;animation-timing-function:var(--s-ease)!important}',
    'html[data-st][data-tail="1"] .m.u{border-bottom-right-radius:calc(var(--s-radm)*.3)!important}html[data-st][data-tail="1"] .m.a{border-bottom-left-radius:calc(var(--s-radm)*.3)!important}',
    'html[data-st] #log{gap:var(--s-gap)!important}',
    'html[data-st] button,html[data-st] select,html[data-st] input[type=text],html[data-st] input[type=search],html[data-st] input[type=number],html[data-st] input[type=password],html[data-st] input[type=email]{border-radius:var(--s-radc)!important}',
    'html[data-st] textarea{border-radius:min(var(--s-radc),24px)!important}html[data-st] #row textarea{border-radius:min(var(--s-radc),22px)!important}',
    'html[data-st] button,html[data-st] select,html[data-st] input,html[data-st] textarea,html[data-st] .card,html[data-st] .th{transition-duration:var(--s-tdur)!important;transition-timing-function:var(--s-ease)!important}',
    'html[data-st] #side,html[data-st] header,html[data-st] #row,html[data-st] .pmb,html[data-st] #set,html[data-st] #obc,html[data-st] #lgc,html[data-st] .card,html[data-st] .legal,html[data-st] .m.a,html[data-st] .t,html[data-st] details.think,html[data-st] #lvs,html[data-st] #oas details,html[data-st] .sug,html[data-st] .stepcard,html[data-st] .tile{-webkit-backdrop-filter:blur(var(--blur)) saturate(var(--s-sat))!important;backdrop-filter:blur(var(--blur)) saturate(var(--s-sat))!important;border-width:var(--s-bw)!important}',
    /* barra lateral: flotante (con margen y esquinas) o a ras del borde */
    'html[data-st][data-side="flush"] body{padding:0!important;gap:0!important}html[data-st][data-side="flush"] #side{margin:0!important;border-radius:0!important;border-top:0!important;border-bottom:0!important;border-left:0!important}html[data-st][data-side="flush"] header{border-radius:0!important;margin:0!important;border-top:0!important;border-left:0!important;border-right:0!important}',
    /* burbuja del usuario */
    'html[data-st][data-bubble="glass"] .m.u{background:color-mix(in srgb,var(--acc) 26%,transparent)!important;background-image:none!important;color:var(--txt)!important;border:1px solid color-mix(in srgb,var(--acc) 55%,transparent)!important;-webkit-backdrop-filter:blur(var(--blur));backdrop-filter:blur(var(--blur))}',
    'html[data-st][data-bubble="outline"] .m.u{background:transparent!important;background-image:none!important;color:var(--txt)!important;border:1.5px solid var(--acc)!important;box-shadow:none!important}',
    'html[data-st][data-bubble="solid"] .m.u{background:var(--accd)!important;background-image:none!important;color:var(--onacc,#fff)!important;border:0!important}',
    'html[data-st][data-bubble="gradient"] .m.u{background:linear-gradient(135deg,color-mix(in srgb,var(--acc) 88%,#fff),var(--accd))!important;color:var(--onacc,#fff)!important}',
    /* fondo */
    'html[data-st][data-bg="none"] body::before{display:none!important}html[data-st][data-bg="calm"] body::before{opacity:.35!important;animation:none!important}html[data-st][data-bg="mesh"] body::before{opacity:1!important;filter:blur(60px)!important;inset:-35%!important}html[data-st][data-bg="aurora"] body::before{opacity:.9!important}',
    '@media (prefers-reduced-motion:reduce){html[data-st] body::before{animation:none!important}}'
  ].join('\n');
  var a = function (x) { return Math.max(0, Math.min(1, +x || 0)); };
  function vars(t) {
    var dark = (document.documentElement.dataset.mode || '') !== 'light', base = dark ? '255,255,255' : '255,255,255', sh = dark ? '0,0,0' : '30,40,90';
    var g1 = a(t.glass), g2 = a(t.glass2), bda = a(t.bda), sp = a(t.spec), sh1 = a(t.sh), m = MOT[t.mot] || MOT.ios;
    var sg = dark ? g1 * .22 : g1; /* en tema oscuro el vidrio es un velo claro, más tenue */
    var sg2 = dark ? g2 * .30 : g2;
    return {
      '--gl': 'rgba(' + base + ',' + sg.toFixed(3) + ')', '--gl2': 'rgba(' + base + ',' + sg2.toFixed(3) + ')',
      '--glb': 'rgba(' + base + ',' + (dark ? bda * .5 : bda).toFixed(3) + ')',
      '--spec': 'inset 0 1px 0 rgba(255,255,255,' + (sp * (dark ? .45 : 1)).toFixed(3) + '),inset 0 -1px 0 rgba(' + (dark ? '255,255,255' : '0,0,0') + ',' + (sp * .1).toFixed(3) + ')',
      '--sh': '0 ' + (+t.shy || 0) + 'px ' + (+t.shb || 0) + 'px rgba(' + sh + ',' + (sh1 * (dark ? 1.6 : 1) * .5).toFixed(3) + ')',
      '--blur': (+t.blur || 0) + 'px', '--s-sat': (+t.sat || 100) + '%', '--s-rad': (+t.rad || 0) + 'px', '--s-radm': (+t.radm || 0) + 'px', '--s-radc': (+t.radc || 0) + 'px',
      '--s-bw': (+t.bd || 0) + 'px', '--s-ff': FF[t.ff] || FF.sys, '--s-fw': +t.fw || 400, '--s-ls': (+t.ls || 0) + 'em', '--s-gap': (+t.gap || 12) + 'px', '--s-pad': (+t.pad || 10) + 'px',
      '--s-ease': m[0], '--s-dur': m[1], '--s-tdur': m[2], '--spring': m[0]
    };
  }
  function css() { var s = document.getElementById('calex-st'); if (!s) { s = document.createElement('style'); s.id = 'calex-st'; s.textContent = STATIC; document.head.appendChild(s); } return s; }
  function list() { return window.CALEX_STYLES || []; }
  function apply(id, save) {
    var t = list().filter(function (x) { return x.id === id; })[0], h = document.documentElement;
    if (!t) { h.removeAttribute('data-st'); ['--gl', '--gl2', '--glb', '--spec', '--sh', '--blur', '--s-sat', '--s-rad', '--s-radm', '--s-radc', '--s-bw', '--s-ff', '--s-fw', '--s-ls', '--s-gap', '--s-pad', '--s-ease', '--s-dur', '--s-tdur', '--spring'].forEach(function (k) { h.style.removeProperty(k); }); ['data-side', 'data-bubble', 'data-bg', 'data-tail'].forEach(function (k) { h.removeAttribute(k); }); if (save) try { localStorage.removeItem('calex-style'); } catch (e) { } return; }
    css(); var v = vars(t); for (var k in v) h.style.setProperty(k, v[k], 'important');
    h.setAttribute('data-st', t.id); h.setAttribute('data-side', t.side === 'flush' ? 'flush' : 'float'); h.setAttribute('data-bubble', t.bubble || 'gradient'); h.setAttribute('data-bg', t.bg || 'aurora'); h.setAttribute('data-tail', t.tail ? '1' : '0');
    if (save) try { localStorage.setItem('calex-style', id); } catch (e) { }
  }
  window.CalexStyles = { apply: apply, list: list, FF: FF, MOT: MOT, vars: vars, STATIC: STATIC };
  function boot() { var id = null; try { id = localStorage.getItem('calex-style'); } catch (e) { } if (id) apply(id, false); }
  boot();
})();
