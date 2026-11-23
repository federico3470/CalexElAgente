/* Calex · Material You. Presentación al estilo de Material 3: color tonal generado a partir de un color base, formas grandes,
   barra superior, cajón de navegación, chips, botón de enviar cuadrado redondeado, ondas al tocar y movimiento enfático.
   Se activa con html[data-ui="material"]. */
(function () {
  if (window.CalexMaterial) return;
  var H = 'html[data-ui="material"]', M = H + ' body:not(.assist):not(.tv)';
  var svg = function (inner, fill) { return "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='" + (fill ? 'black' : 'none') + "' stroke='" + (fill ? 'none' : 'black') + "' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'>" + inner + "</svg>\")"; };
  var IC = {
    menu: svg("<path d='M4 6h16M4 12h16M4 18h16'/>"),
    more: svg("<circle cx='12' cy='5' r='1.8' fill='black'/><circle cx='12' cy='12' r='1.8' fill='black'/><circle cx='12' cy='19' r='1.8' fill='black'/>", 1),
    share: svg("<circle cx='18' cy='5.5' r='2.6'/><circle cx='6' cy='12' r='2.6'/><circle cx='18' cy='18.5' r='2.6'/><path d='M8.3 10.8l7.4-4.1M8.3 13.2l7.4 4.1'/>"),
    send: svg("<path d='M3.5 20.5l17-8.5-17-8.5v6.6l11 1.9-11 1.9z' fill='black'/>", 1),
    stop: svg("<rect x='6.5' y='6.5' width='11' height='11' rx='2.4' fill='black'/>", 1),
    plus: svg("<path d='M12 5v14M5 12h14' stroke-width='2.4'/>"),
    pen: svg("<path d='M4 20h4L19.5 8.5a2.1 2.1 0 0 0-3-3L5 17z'/>")
  };
  /*EXPRESSIVE*/ /* Formas de Material 3 Expresivo: galleta, sol, flor y trébol, como polígonos de 72 puntos que se transforman unos en otros */
  function poly(n, amp, rot) { var pts = [], N = 72, i, a, r, x, y; for (i = 0; i < N; i++) { a = (i / N) * Math.PI * 2; r = 1 - amp + amp * Math.cos(n * a + (rot || 0)); x = 50 + 50 * r * Math.cos(a - Math.PI / 2); y = 50 + 50 * r * Math.sin(a - Math.PI / 2); pts.push(x.toFixed(2) + '% ' + y.toFixed(2) + '%'); } return 'polygon(' + pts.join(',') + ')'; }
  var SHAPES = { cookie: poly(9, .07), sunny: poly(8, .1), flower: poly(6, .13), clover: poly(4, .17), soft: poly(5, .08), circle: poly(1, 0) };
  var SHAPECSS = ':root{--sh-cookie:' + SHAPES.cookie + ';--sh-sunny:' + SHAPES.sunny + ';--sh-flower:' + SHAPES.flower + ';--sh-clover:' + SHAPES.clover + ';--sh-soft:' + SHAPES.soft + '}' +
    '@keyframes mmorph{0%{clip-path:' + SHAPES.cookie + ';background:var(--acc)}25%{clip-path:' + SHAPES.clover + ';background:var(--m-t,var(--acc))}50%{clip-path:' + SHAPES.sunny + ';background:var(--acc)}75%{clip-path:' + SHAPES.flower + ';background:var(--m-t,var(--acc))}100%{clip-path:' + SHAPES.cookie + ';background:var(--acc)}}' +
    '@keyframes mspin{to{transform:rotate(360deg)}}';
  var CSS = [
    H + '{--roboto:"Google Sans Text","Google Sans",Roboto,"Segoe UI Variable Text","Segoe UI Variable","Segoe UI",system-ui,sans-serif;--emp:cubic-bezier(.2,0,0,1);--empd:cubic-bezier(.3,0,0,1)}',
    M + '{display:flex!important;padding:0!important;gap:0!important;font-family:var(--roboto)!important;font-size:16px;line-height:1.5;letter-spacing:.01em!important;font-weight:400;background:var(--bg)!important;background-image:none!important;overflow:hidden;-webkit-font-smoothing:antialiased}',
    M + '::before,' + M + '::after{display:none!important}',
    M + ' .card,' + M + ' .legal,' + M + ' .t,' + M + ' details.think,' + M + ' #oas details,' + M + ' .sug,' + M + ' .stepcard,' + M + ' .tile,' + M + ' .cnk div{background:var(--m-s2,var(--panel))!important;background-image:none!important;border:0!important;border-radius:16px!important;box-shadow:none!important;-webkit-backdrop-filter:none!important;backdrop-filter:none!important}',
    /* botones tonales con onda */
    M + ' button,' + M + ' select{font-family:var(--roboto)!important;font-size:14px;font-weight:500;letter-spacing:.1px;color:var(--m-osc,var(--txt))!important;background:var(--m-sc,color-mix(in srgb,var(--acc) 22%,transparent))!important;background-image:none!important;border:0!important;border-radius:999px!important;box-shadow:none!important;padding:10px 20px;position:relative;overflow:hidden;-webkit-backdrop-filter:none!important;backdrop-filter:none!important;transition:box-shadow .3s var(--emp),background .3s var(--emp),transform .3s var(--emp),opacity .3s!important}',
    M + ' button:hover{box-shadow:0 1px 3px 1px rgba(0,0,0,.18)!important;transform:none!important}',
    M + ' button:active{transform:scale(.985)!important}',
    M + ' button.pri{background:var(--acc)!important;color:var(--onacc,#fff)!important}',
    M + ' select{appearance:none;-webkit-appearance:none;font-weight:400;padding:10px 16px;border-radius:12px!important;max-width:210px;text-overflow:ellipsis;background:transparent!important;box-shadow:inset 0 0 0 1px var(--m-ol,var(--line))!important}',
    M + ' input[type=text],' + M + ' input[type=search],' + M + ' input[type=number],' + M + ' input[type=password],' + M + ' input[type=email],' + M + ' textarea{font-family:var(--roboto)!important;background:var(--m-s3,var(--panel))!important;background-image:none!important;border:0!important;border-bottom:1px solid var(--m-ol,var(--line))!important;border-radius:12px 12px 0 0!important;box-shadow:none!important;color:var(--txt)!important;padding:12px 16px;-webkit-backdrop-filter:none!important;backdrop-filter:none!important}',
    M + ' input:focus,' + M + ' textarea:focus{border-bottom:2px solid var(--acc)!important;outline:none}',
    M + ' ::placeholder{color:var(--mut)!important;opacity:1}',
    M + ' :focus-visible{outline:2px solid var(--acc)!important;outline-offset:2px!important}',
    '.mripple{position:absolute;border-radius:50%;background:currentColor;opacity:.18;transform:scale(0);animation:mrip .65s var(--emp) forwards;pointer-events:none}@keyframes mrip{to{transform:scale(1);opacity:0}}',
    /* barra superior */
    M + ' #main{flex:1;min-width:0;height:100vh;height:100dvh;display:flex;flex-direction:column;margin:0!important}',
    M + ' header{position:relative;z-index:5;display:flex;flex-wrap:wrap;align-items:center;gap:4px 8px;padding:8px 12px 8px 8px!important;min-height:64px;margin:0!important;background:var(--m-s1,var(--side))!important;border:0!important;border-radius:0!important;box-shadow:none!important;-webkit-backdrop-filter:none!important;backdrop-filter:none!important;transition:background .3s var(--emp),box-shadow .3s var(--emp)!important}',
    M + ' header.sc{background:var(--m-s3,var(--panel))!important;box-shadow:0 2px 6px rgba(0,0,0,.18)!important}',
    M + ' header>svg{width:32px!important;height:32px!important;border-radius:10px;order:1;margin-left:4px}',
    M + ' header .brand{order:1;line-height:1.2}',
    M + ' header .name{font:400 22px/28px var(--roboto)!important;letter-spacing:0!important;color:var(--txt)!important;background:none!important;-webkit-text-fill-color:currentColor!important;text-transform:none}',
    M + ' header .tag{display:none!important}',
    M + ' header #bt,' + M + ' header #hm,' + M + ' header #exp{font-size:0!important;width:48px;height:48px;padding:0;border-radius:50%!important;background:transparent!important;color:var(--txt)!important;flex:none;position:relative;order:0}',
    M + ' header #hm,' + M + ' header #exp{order:3}',
    M + ' header #bt::before,' + M + ' header #hm::before,' + M + ' header #exp::before{content:"";position:absolute;inset:12px;background:currentColor;-webkit-mask:' + IC.menu + ' center/contain no-repeat;mask:' + IC.menu + ' center/contain no-repeat}',
    M + ' header #hm::before{-webkit-mask-image:' + IC.more + ';mask-image:' + IC.more + '}',
    M + ' header #exp::before{-webkit-mask-image:' + IC.share + ';mask-image:' + IC.share + '}',
    M + ' header .sp{order:2;flex:1}',
    M + ' header .avb{order:4;width:40px!important;height:40px!important;padding:0!important;border-radius:50%!important;overflow:hidden;line-height:0;background:var(--m-pc,var(--accd))!important}',
    M + ' header #sm,' + M + ' header #eb,' + M + ' header #wake{order:5;font-size:13px;padding:6px 12px;height:auto!important;border-radius:8px!important;background:transparent!important;box-shadow:inset 0 0 0 1px var(--m-ol,var(--line))!important}',
    /* conversación */
    M + ' #log{width:100%;max-width:840px!important;margin:0 auto!important;padding:16px 16px 12px!important;gap:6px!important}',
    M + ' .m{max-width:82%!important;padding:12px 16px!important;font-size:16px;line-height:1.5;border:0!important;border-radius:20px!important;background-image:none!important;box-shadow:none!important;-webkit-backdrop-filter:none!important;backdrop-filter:none!important;animation:mpop .5s var(--empd) both!important}',
    M + ' .m.u{align-self:flex-end!important;background:var(--m-pc,var(--accd))!important;color:var(--m-opc,#fff)!important;border-bottom-right-radius:6px!important;margin-top:10px;transform-origin:100% 100%}',
    M + ' .m.a{align-self:flex-start!important;background:var(--m-s3,var(--panel))!important;color:var(--txt)!important;border-bottom-left-radius:6px!important;margin-top:10px;transform-origin:0 100%}',
    M + ' .m a{color:var(--acc)!important}',
    M + ' .m code{font-family:ui-monospace,"Roboto Mono",Consolas,monospace;font-size:.88em;background:color-mix(in srgb,var(--txt) 10%,transparent)!important;border-radius:6px!important;padding:1px 6px}',
    M + ' pre{border:0!important;border-radius:16px!important;background:var(--m-s1,var(--bg))!important;box-shadow:none!important}',
    M + ' .acts button{background:transparent!important;color:var(--mut)!important;font-size:12px;padding:4px 10px;box-shadow:none!important}',
    M + ' .m img,' + M + ' .u img{border-radius:12px!important}',
    /* bienvenida */
    M + ' .empty{max-width:700px;margin:0 auto!important;padding:20px 8px 0;text-align:left!important;color:var(--mut)!important;font-size:16px;animation:mpop .6s var(--empd) both!important}',
    M + ' .empty .gav{width:88px!important;height:88px!important;margin:0 0 20px!important;border:4px solid var(--m-pc,var(--accd))!important;border-radius:50%!important;box-shadow:none!important;animation:none!important;overflow:hidden}',
    M + ' .empty b{font:400 clamp(30px,6vw,40px)/1.2 var(--roboto)!important;letter-spacing:0!important;color:var(--txt)!important;margin:0 0 8px!important;display:block}',
    M + ' .empty small{display:block;font-size:14px;margin-top:8px;line-height:1.5;color:var(--mut)!important}',
    M + ' .sugs{display:flex!important;flex-direction:row!important;flex-wrap:wrap;justify-content:flex-start;align-items:flex-start;gap:8px!important;margin-top:28px}',
    M + ' .sugs .sg{border:0!important;box-shadow:inset 0 0 0 1px var(--m-ol,var(--line))!important;background:transparent!important;color:var(--txt)!important;border-radius:8px!important;padding:8px 14px!important;font:500 14px/20px var(--roboto)!important;text-align:left;transition:background .3s var(--emp)!important}',
    M + ' .sugs .sg:hover{background:var(--m-sc)!important;box-shadow:none!important}',
    /* escritura */
    M + ' #comp{width:100%;max-width:840px;margin:0 auto;padding:6px 16px calc(14px + env(safe-area-inset-bottom,0px))!important;background:transparent!important;border:0!important;box-shadow:none!important;border-radius:0!important}',
    M + ' #row{display:flex;align-items:flex-end;gap:6px;padding:6px 6px 6px 8px!important;background:var(--m-s3,var(--panel))!important;background-image:none!important;border:0!important;border-radius:28px!important;box-shadow:0 1px 3px rgba(0,0,0,.22)!important;-webkit-backdrop-filter:none!important;backdrop-filter:none!important;transition:box-shadow .3s var(--emp)!important}',
    M + ' #row:focus-within{box-shadow:0 2px 8px rgba(0,0,0,.3),inset 0 0 0 2px var(--acc)!important}',
    M + ' #row textarea{flex:1;background:transparent!important;border:0!important;border-radius:0!important;padding:11px 6px!important;font-size:16px;line-height:1.45;min-height:42px;max-height:180px;resize:none}',
    M + ' #row .tb{width:44px;height:44px;padding:0;border-radius:50%!important;display:grid;place-items:center;background:transparent!important;color:var(--mut)!important;flex:none}',
    M + ' #row #go{width:52px;height:48px;padding:0;border-radius:16px!important;font-size:0!important;flex:none;background:var(--acc)!important;color:var(--onacc,#fff)!important;position:relative}',
    M + ' #row #go::before{content:"";position:absolute;inset:12px 14px;background:currentColor;-webkit-mask:' + IC.send + ' center/contain no-repeat;mask:' + IC.send + ' center/contain no-repeat}',
    M + ' #row #go.stop{background:var(--m-err,#b3261e)!important;color:#fff!important}',
    M + ' #row #go.stop::before{-webkit-mask-image:' + IC.stop + ';mask-image:' + IC.stop + '}',
    M + ' #row #liv{height:44px;padding:0 14px;flex:none}',
    M + ' #bar{justify-content:center;gap:14px;padding:6px 0 0;font-size:11px;color:var(--mut);opacity:.7}',
    M + ' #bar span{background:none!important;border:0!important;padding:0!important;box-shadow:none!important}',
    /* cajón de navegación */
    M + ' #side{display:flex;flex-direction:column;width:340px!important;margin:0!important;padding:16px 12px 12px!important;background:var(--m-s1,var(--side))!important;border:0!important;border-radius:0 28px 28px 0!important;box-shadow:none!important;-webkit-backdrop-filter:none!important;backdrop-filter:none!important;transition:transform .5s var(--empd),margin .5s var(--empd)!important}',
    M + ' #side.hide{margin-left:-340px!important}',
    M + ' #side .sh{padding:4px 4px!important}',
    M + ' #side .sh button{width:100%;text-align:left;border-radius:999px!important;padding:14px 20px;height:52px;background:transparent!important;box-shadow:none!important}',
    M + ' #side #bn{height:56px;border-radius:16px!important;background:var(--m-pc,var(--accd))!important;color:var(--m-opc,#fff)!important;box-shadow:0 1px 3px rgba(0,0,0,.25)!important;padding-left:20px;font-size:14px}',
    M + ' #side .hl{font:500 14px/20px var(--roboto)!important;text-transform:none!important;letter-spacing:.1px!important;color:var(--mut)!important;padding:16px 16px 6px!important}',
    M + ' #hs{border-radius:28px!important;border:0!important;background:var(--m-s3,var(--panel))!important;margin:0 4px;padding:14px 20px!important}',
    M + ' #hist{padding:4px 0!important}',
    M + ' .h{height:56px;padding:0 20px!important;border-radius:999px!important;color:var(--txt)!important;background:transparent!important;align-items:center;transition:background .3s var(--emp)!important}',
    M + ' .h:hover{background:color-mix(in srgb,var(--txt) 8%,transparent)!important}',
    M + ' .h.on{background:var(--m-sc,color-mix(in srgb,var(--acc) 22%,transparent))!important;color:var(--m-osc,var(--txt))!important}',
    M + ' .h span{font-size:14px;font-weight:500}',
    M + ' #credit{color:var(--mut);text-align:center;font-size:12px;padding:10px 0 0}',
    /* diálogos */
    M + ' #ov,' + M + ' #cnov,' + M + ' #wb{background:rgba(0,0,0,.4)!important;-webkit-backdrop-filter:none!important;backdrop-filter:none!important}',
    M + ' #set,' + M + ' #cnp,' + M + ' .pmb,' + M + ' #wbc,' + M + ' #obc,' + M + ' #lgc{background:var(--m-s2,var(--panel))!important;background-image:none!important;border:0!important;border-radius:28px!important;box-shadow:0 8px 28px rgba(0,0,0,.4)!important;padding:24px!important;-webkit-backdrop-filter:none!important;backdrop-filter:none!important;animation:mdlg .5s var(--empd) both!important}',
    M + ' #set h3,' + M + ' #cnp h3,' + M + ' #obc h2,' + M + ' #lgc h2{font:400 24px/32px var(--roboto)!important;letter-spacing:0!important;margin:0 0 8px}',
    M + ' #set h4,' + M + ' #cnp h4{font:500 14px/20px var(--roboto)!important;letter-spacing:.1px!important;text-transform:none!important;color:var(--acc)!important;margin:24px 0 6px!important}',
    M + ' #set .r{padding:12px 0!important;border-bottom:1px solid var(--m-ol,var(--line))}',
    M + ' .cnc{background:var(--m-s3,var(--panel))!important;border:0!important;border-radius:16px!important;box-shadow:none!important}',
    M + ' #ob,' + M + ' #lg{background:var(--bg)!important;background-image:none!important}',
    M + ' #ob::before,' + M + ' #lg::before,' + M + ' #ob::after,' + M + ' #lg::after{display:none!important}',
    M + ' .th{border-radius:12px!important}',
    M + ' #strow{display:none!important}',
    M + ' #srcbar{border-radius:8px;background:var(--m-sc,color-mix(in srgb,var(--acc) 20%,transparent))}',
    M + ' #isl .islp,' + M + ' #isl .islb{border-radius:28px!important}',
    /* Material 3 Expresivo: formas, resorte y tipografía enfática */
    M + ' header>svg{clip-path:var(--sh-sunny);border-radius:0!important;width:36px!important;height:36px!important}',
    M + ' header .avb{clip-path:var(--sh-flower);border-radius:0!important;width:44px!important;height:44px!important;background:var(--m-tc,var(--m-pc))!important}',
    M + ' .empty .gav{clip-path:var(--sh-cookie);border:0!important;border-radius:0!important;width:104px!important;height:104px!important;background:var(--m-pc,var(--accd))!important;padding:5px;box-sizing:border-box}',
    M + ' .empty .gav svg{clip-path:var(--sh-cookie);width:100%!important;height:100%!important}',
    M + ' .empty b{font-weight:700!important;letter-spacing:-.02em!important}',
    M + ' #row #go{transition:border-radius .5s var(--spr,var(--empd)),transform .4s var(--empd),background .3s!important}',
    M + ' #row #go:active{border-radius:50%!important;transform:scale(.94)!important}',
    M + ' .sugs .sg:first-child{background:var(--m-tc,var(--m-sc))!important;color:var(--m-otc,var(--txt))!important;box-shadow:none!important}',
    M + ' .m.a:empty{min-height:56px;min-width:70px;position:relative}',
    M + ' .m.a:empty::after{content:"";position:absolute;left:50%;top:50%;width:30px;height:30px;margin:-15px 0 0 -15px;background:var(--acc);clip-path:var(--sh-cookie);animation:mmorph 2.4s ease-in-out infinite,mspin 4.8s linear infinite}',
    M + ' #srcbar .sa i{clip-path:var(--sh-soft);border-radius:0;box-shadow:none}',
    M + ' #side #bn{clip-path:none}',
    H + '{--spr:linear(0,.009,.035 2.1%,.141 4.4%,.723 15%,.937 21%,1.022 26%,1.057 30%,1.063 33%,1.053 37%,1.012 46%,.993 53%,.992 60%,1 72%,1)}',
    '@supports not (transition-timing-function:linear(0,1)){' + H + '{--spr:cubic-bezier(.34,1.56,.64,1)}}',
    M + ' .m{animation:mpop .6s var(--spr,var(--empd)) both!important}',
    '@keyframes mpop{from{opacity:0;transform:scale(.92) translateY(8px)}to{opacity:1;transform:none}}',
    '@keyframes mdlg{from{opacity:0;transform:scale(.88)}to{opacity:1;transform:none}}',
    '@media(max-width:899px){' + M + ' #side{position:fixed!important;left:0;top:0;bottom:0;z-index:30;width:min(340px,86vw)!important;margin:0!important;box-shadow:0 8px 28px rgba(0,0,0,.4)!important}' + M + ' #side.hide{transform:translateX(-104%)!important;margin:0!important;box-shadow:none!important}' + M + ' .m{max-width:86%!important}}',
    '@media(prefers-reduced-motion:reduce){' + M + ' .m,' + M + ' .empty,' + M + ' #set,' + M + ' #cnp{animation:none!important}.mripple{display:none}}'
  ].join('\n');
  /* color tonal a partir de un color base (matiz); si cambia el modo claro u oscuro del teléfono, se regenera */
  var SEEDS = [['Violeta', 265], ['Azul', 215], ['Turquesa', 182], ['Verde', 145], ['Naranja', 25], ['Rojo', 355], ['Rosa', 325]];
  function hsl(h, s, l) { s /= 100; l /= 100; var k = function (n) { return (n + h / 30) % 12; }, a = s * Math.min(l, 1 - l), f = function (n) { return l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1))); }, x = function (v) { return Math.round(v * 255).toString(16).padStart(2, '0'); }; return '#' + x(f(0)) + x(f(8)) + x(f(4)); }
  function seed() { try { var raw = localStorage.getItem('calex-mseed'); if (raw === null) return 265; var v = +raw; return isFinite(v) && v >= 0 ? v : 265; } catch (e) { return 265; } }
  function dark() { return !(window.matchMedia && matchMedia('(prefers-color-scheme: light)').matches); }
  function palette(h, d) {
    return d ? { bg: hsl(h, 12, 8), side: hsl(h, 12, 10), panel: hsl(h, 14, 14), line: hsl(h, 10, 30), txt: hsl(h, 15, 90), mut: hsl(h, 10, 72), acc: hsl(h, 70, 80), accd: hsl(h, 48, 30), onacc: hsl(h, 60, 14), s1: hsl(h, 12, 10), s2: hsl(h, 14, 15), s3: hsl(h, 14, 19), pc: hsl(h, 48, 30), opc: hsl(h, 80, 92), sc: hsl(h, 22, 28), osc: hsl(h, 40, 90), err: '#f2b8b5', tc: hsl((h + 60) % 360, 55, 32), otc: hsl((h + 60) % 360, 80, 92), t: hsl((h + 60) % 360, 70, 78) }
      : { bg: hsl(h, 30, 98), side: hsl(h, 26, 95), panel: hsl(h, 26, 92), line: hsl(h, 14, 74), txt: hsl(h, 22, 12), mut: hsl(h, 10, 38), acc: hsl(h, 52, 40), accd: hsl(h, 70, 90), onacc: '#ffffff', s1: hsl(h, 26, 95), s2: hsl(h, 28, 93), s3: hsl(h, 28, 90), pc: hsl(h, 70, 90), opc: hsl(h, 70, 14), sc: hsl(h, 40, 88), osc: hsl(h, 30, 16), err: '#b3261e', tc: hsl((h + 60) % 360, 75, 88), otc: hsl((h + 60) % 360, 70, 16), t: hsl((h + 60) % 360, 55, 42) };
  }
  function apply(h) {
    if (h === undefined) h = seed(); var p = palette(h, dark()), r = document.documentElement.style;
    try { if (typeof THEMES !== 'undefined' && typeof T !== 'undefined') { for (var i = THEMES.length - 1; i >= 0; i--) if (THEMES[i].id === 'm-dyn') THEMES.splice(i, 1); THEMES.unshift(T('m-dyn', 'Material You', p.bg, p.side, p.panel, p.line, p.txt, p.mut, p.acc, p.accd, p.onacc, '')); applyTheme('m-dyn', true); } } catch (e) { }
    r.setProperty('--m-s1', p.s1); r.setProperty('--m-s2', p.s2); r.setProperty('--m-s3', p.s3); r.setProperty('--m-pc', p.pc); r.setProperty('--m-opc', p.opc); r.setProperty('--m-sc', p.sc); r.setProperty('--m-osc', p.osc); r.setProperty('--m-ol', p.line); r.setProperty('--m-err', p.err); r.setProperty('--m-tc', p.tc); r.setProperty('--m-otc', p.otc); r.setProperty('--m-t', p.t);
  }
  function setSeed(h) { try { localStorage.setItem('calex-mseed', String(h)); } catch (e) { } if (document.documentElement.getAttribute('data-ui') === 'material') apply(h); }
  function boot() {
    var st = document.createElement('style'); st.id = 'calex-material'; st.textContent = SHAPECSS + CSS; document.head.appendChild(st);
    var on = function () { return document.documentElement.getAttribute('data-ui') === 'material'; };
    // onda al tocar
    document.addEventListener('pointerdown', function (e) { if (!on()) return; var b = e.target.closest && e.target.closest('button,.h,.sg'); if (!b || b.disabled || (b.className && /cxf-/.test(b.className))) return; var r = b.getBoundingClientRect(), d = Math.max(r.width, r.height) * 2, s = document.createElement('span'); s.className = 'mripple'; s.style.cssText = 'width:' + d + 'px;height:' + d + 'px;left:' + (e.clientX - r.left - d / 2) + 'px;top:' + (e.clientY - r.top - d / 2) + 'px'; if (getComputedStyle(b).position === 'static') b.style.position = 'relative'; b.style.overflow = 'hidden'; b.appendChild(s); setTimeout(function () { s.remove(); }, 700); }, { passive: true });
    // barra superior con elevación al desplazarse
    var lg = document.getElementById('log'), hd = document.querySelector('header'); if (lg && hd) lg.addEventListener('scroll', function () { hd.classList.toggle('sc', lg.scrollTop > 4); }, { passive: true });
    // el color sigue al modo claro u oscuro del teléfono
    if (window.matchMedia) { var mq = matchMedia('(prefers-color-scheme: light)'); var ch = function () { if (on()) apply(); }; mq.addEventListener ? mq.addEventListener('change', ch) : mq.addListener(ch); }
  }
  window.CalexMaterial = { apply: apply, setSeed: setSeed, seed: seed, SEEDS: SEEDS };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
