/* Calex · iOS. Presentación al estilo de iOS: tipografía del sistema, barra superior translúcida, listas agrupadas con esquinas muy redondeadas,
   burbujas tipo mensajes, campo de escritura en cápsula con botón circular, hojas con asa y animaciones de resorte. Se activa con html[data-ui="ios"]. */
(function () {
  if (window.CalexIOS) return;
  var H = 'html[data-ui="ios"]', I = H + ' body:not(.assist):not(.tv)';
  var svg = function (inner, extra) { return "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='1.9' stroke-linecap='round' stroke-linejoin='round' " + (extra || '') + ">" + inner + "</svg>\")"; };
  var IC = {
    side: svg("<rect x='3' y='4.5' width='18' height='15' rx='3.8'/><path d='M9.5 4.5v15'/>"),
    more: svg("<circle cx='12' cy='12' r='9'/><path d='M8 12h.01M12 12h.01M16 12h.01' stroke-width='2.8'/>"),
    share: svg("<path d='M12 14V3.5M8.2 7.2L12 3.5l3.8 3.7'/><path d='M7 10H6a3 3 0 0 0-3 3v5a3 3 0 0 0 3 3h12a3 3 0 0 0 3-3v-5a3 3 0 0 0-3-3h-1'/>"),
    up: svg("<path d='M12 19.5V5M5.8 11.2L12 5l6.2 6.2' stroke-width='2.8'/>"),
    stop: svg("<rect x='6.5' y='6.5' width='11' height='11' rx='2.6' fill='black' stroke='none'/>"),
    chev: svg("<path d='M9 5l7 7-7 7' stroke-width='2.4'/>"),
    new: svg("<path d='M12 4H7a3.5 3.5 0 0 0-3.5 3.5v9A3.5 3.5 0 0 0 7 20h9a3.5 3.5 0 0 0 3.5-3.5V12'/><path d='M17.5 3.2a2 2 0 0 1 2.8 2.8L12 14.3 8.5 15.5l1.2-3.5z'/>"),
    s1: svg("<path d='M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z' fill='black' stroke='none'/>"),
    s2: svg("<path d='M7 3.5h7.5L19 8v12.5H7z'/><path d='M14 3.5V8.5h5M10 13h6M10 16.5h6'/>"),
    s3: svg("<circle cx='12' cy='12' r='9'/><path d='M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18'/>"),
    s4: svg("<rect x='3.5' y='5' width='17' height='14' rx='3'/><circle cx='9' cy='10' r='1.6' fill='black' stroke='none'/><path d='M4 17l5-4.5 3.5 3 3-2.5 5 4'/>"),
    s5: svg("<path d='M14.5 6.5l3 3M4 20l1-4 10.5-10.5 3 3L8 19z'/>"),
    s6: svg("<path d='M13 2.5L5 13.5h6L10 21.5l9-12h-6.2z' fill='black' stroke='none'/>")
  };
  var CSS = [
    H + '{--sf:-apple-system,BlinkMacSystemFont,"SF Pro Text","SF Pro Display","Segoe UI Variable Text","Segoe UI Variable","Segoe UI",Roboto,system-ui,sans-serif;--spr:cubic-bezier(.34,1.56,.64,1);--eio:cubic-bezier(.32,.72,0,1);--fill:color-mix(in srgb,var(--txt) 12%,transparent);--sep:color-mix(in srgb,var(--txt) 14%,transparent);--bub:color-mix(in srgb,var(--txt) 10%,var(--panel))}',
    I + '{display:flex!important;padding:0!important;gap:0!important;font-family:var(--sf)!important;font-size:17px;line-height:1.4;letter-spacing:-.012em!important;font-weight:400;background:var(--bg)!important;background-image:none!important;-webkit-font-smoothing:antialiased;overflow:hidden}',
    I + '::before,' + I + '::after{display:none!important}',
    /* superficies: sin vidrio decorativo; la translucidez queda solo en barras y hojas */
    I + ' .card,' + I + ' .legal,' + I + ' .t,' + I + ' details.think,' + I + ' #oas details,' + I + ' .sug,' + I + ' .stepcard,' + I + ' .tile,' + I + ' .cnk div{background:var(--panel)!important;background-image:none!important;box-shadow:none!important;border:0!important;border-radius:20px!important;-webkit-backdrop-filter:none!important;backdrop-filter:none!important}',
    /* controles: cápsulas tintadas */
    I + ' button,' + I + ' select{font-family:var(--sf)!important;font-size:15px;font-weight:600;letter-spacing:-.01em;color:var(--acc)!important;background:color-mix(in srgb,var(--acc) 14%,transparent)!important;background-image:none!important;border:0!important;border-radius:999px!important;box-shadow:none!important;padding:8px 16px;-webkit-backdrop-filter:none!important;backdrop-filter:none!important;transition:transform .5s var(--spr),background .3s var(--eio),opacity .3s!important}',
    I + ' button:hover{background:color-mix(in srgb,var(--acc) 22%,transparent)!important;transform:none!important}',
    I + ' button:active{transform:scale(.94)!important;transition-duration:.12s!important}',
    I + ' button.pri{background:var(--acc)!important;color:#fff!important}',
    I + ' button.pri:hover{background:color-mix(in srgb,var(--acc) 88%,#000)!important}',
    I + ' select{appearance:none;-webkit-appearance:none;padding:8px 14px;font-weight:500;max-width:210px;text-overflow:ellipsis}',
    I + ' input[type=text],' + I + ' input[type=search],' + I + ' input[type=number],' + I + ' input[type=password],' + I + ' input[type=email],' + I + ' textarea{font-family:var(--sf)!important;background:var(--fill)!important;background-image:none!important;border:0!important;border-radius:14px!important;box-shadow:none!important;color:var(--txt)!important;padding:10px 14px;-webkit-backdrop-filter:none!important;backdrop-filter:none!important}',
    I + ' input[type=search]{border-radius:12px!important}',
    I + ' ::placeholder{color:var(--mut)!important;opacity:1}',
    I + ' :focus-visible{outline:3px solid color-mix(in srgb,var(--acc) 45%,transparent)!important;outline-offset:2px!important}',
    /* barra de navegación translúcida */
    I + ' #main{flex:1;min-width:0;height:100vh;height:100dvh;display:flex;flex-direction:column;margin:0!important}',
    I + ' header{position:relative;z-index:5;display:flex;flex-wrap:wrap;align-items:center;gap:8px 8px;padding:10px 16px 8px!important;margin:0!important;border:0!important;border-radius:0!important;background:color-mix(in srgb,var(--bg) 74%,transparent)!important;-webkit-backdrop-filter:saturate(180%) blur(24px)!important;backdrop-filter:saturate(180%) blur(24px)!important;box-shadow:0 .5px 0 var(--sep)!important}',
    I + ' header>svg{width:30px!important;height:30px!important;border-radius:8px;order:1}',
    I + ' header .brand{order:1;line-height:1.1}',
    I + ' header .name{font:700 19px/1.1 var(--sf)!important;letter-spacing:-.02em!important;color:var(--txt)!important;background:none!important;-webkit-text-fill-color:currentColor!important;text-transform:none}',
    I + ' header .tag{display:none!important}',
    I + ' header #bt{order:0;font-size:0!important;width:36px;height:36px;padding:0;position:relative;flex:none}',
    I + ' header #bt::before,' + I + ' header #hm::before,' + I + ' header #exp::before{content:"";position:absolute;inset:6px;background:currentColor;-webkit-mask:' + IC.side + ' center/contain no-repeat;mask:' + IC.side + ' center/contain no-repeat}',
    I + ' header #hm,' + I + ' header #exp{font-size:0!important;width:36px;height:36px;padding:0;position:relative;flex:none;order:3}',
    I + ' header #hm::before{-webkit-mask-image:' + IC.more + ';mask-image:' + IC.more + '}',
    I + ' header #exp::before{-webkit-mask-image:' + IC.share + ';mask-image:' + IC.share + '}',
    I + ' header .sp{order:2;flex:1}',
    I + ' header .avb{order:4;width:34px!important;height:34px!important;padding:0!important;border-radius:50%!important;overflow:hidden;box-shadow:0 0 0 2px var(--panel)!important}',
    I + ' header #sm,' + I + ' header #eb,' + I + ' header #wake{order:5;font-size:13.5px;padding:6px 13px;height:auto!important}',
    /* conversación */
    I + ' #log{width:100%;max-width:820px!important;margin:0 auto!important;padding:18px 16px 14px!important;gap:3px!important;display:flex;flex-direction:column}',
    I + ' .m{max-width:78%!important;width:auto;padding:9px 15px!important;border:0!important;border-radius:21px!important;box-shadow:none!important;font-size:17px;line-height:1.38;-webkit-backdrop-filter:none!important;backdrop-filter:none!important;animation:iospop .6s var(--eio) both!important;background-image:none!important}',
    I + ' .m.u{align-self:flex-end!important;background:var(--acc)!important;color:#fff!important;border-bottom-right-radius:7px!important;margin-top:8px;transform-origin:100% 100%}',
    I + ' .m.a{align-self:flex-start!important;background:var(--bub)!important;color:var(--txt)!important;border-bottom-left-radius:7px!important;margin-top:8px;transform-origin:0 100%}',
    I + ' .m.u+.m.u,' + I + ' .m.a+.m.a{margin-top:2px}',
    I + ' .m a{color:inherit!important;text-decoration:underline;text-underline-offset:3px}',
    I + ' .m.a a{color:var(--acc)!important}',
    I + ' .m code{font-family:ui-monospace,"SF Mono",Menlo,Consolas,monospace;font-size:.86em;background:color-mix(in srgb,var(--txt) 10%,transparent)!important;border-radius:7px!important;padding:1px 6px}',
    I + ' pre{border:0!important;border-radius:16px!important;background:color-mix(in srgb,var(--txt) 7%,var(--bg))!important;box-shadow:none!important}',
    I + ' .acts button{background:transparent!important;color:var(--mut)!important;font-size:13px;padding:4px 10px;font-weight:500}',
    I + ' .m img,' + I + ' .u img{border-radius:14px!important}',
    I + ' .t,' + I + ' details.think{font-size:14.5px;color:var(--mut)!important;border-radius:16px!important;padding:8px 14px!important}',
    /* bienvenida: título grande y lista agrupada */
    I + ' .empty{max-width:640px;margin:2vh auto 0!important;text-align:left!important;color:var(--mut)!important;font-size:17px;line-height:1.4;animation:iosrise .7s var(--eio) both!important}',
    I + ' .empty .gav{width:84px!important;height:84px!important;margin:0 0 18px!important;border-radius:22px!important;box-shadow:0 10px 30px color-mix(in srgb,var(--acc) 30%,transparent)!important;animation:none!important}',
    I + ' .empty b{font:700 clamp(32px,6vw,44px)/1.08 var(--sf)!important;letter-spacing:-.03em!important;color:var(--txt)!important;margin:0 0 8px!important;display:block}',
    I + ' .empty small{display:block;font-size:15px;margin-top:10px;line-height:1.45;color:var(--mut)!important}',
    I + ' .sugs{display:flex!important;flex-direction:column;gap:0!important;margin-top:28px;background:var(--panel);border-radius:22px;overflow:hidden;counter-reset:sg}',
    I + ' .sugs .sg{counter-increment:sg;position:relative;display:flex;align-items:center;gap:14px;width:100%;text-align:left;border-radius:0!important;background:transparent!important;color:var(--txt)!important;font:400 17px/1.3 var(--sf)!important;padding:13px 40px 13px 14px!important;box-shadow:none!important;transition:background .25s var(--eio),transform .4s var(--spr)!important}',
    I + ' .sugs .sg+.sg{box-shadow:inset 0 .5px 0 var(--sep)!important}',
    I + ' .sugs .sg::before{content:"";flex:none;width:32px;height:32px;border-radius:9px;background-color:var(--c,#0a84ff);-webkit-mask:none;mask:none}',
    I + ' .sugs .sg::after{content:"";position:absolute;right:14px;top:50%;width:14px;height:14px;margin-top:-7px;background:var(--mut);opacity:.7;-webkit-mask:' + IC.chev + ' center/contain no-repeat;mask:' + IC.chev + ' center/contain no-repeat}',
    I + ' .sugs .sg:hover{background:var(--fill)!important}',
    I + ' .sugs .sg:active{transform:scale(.985)!important}',
    I + ' .sugs .sg:nth-child(1)::before{--c:#0a84ff;background-image:' + IC.s1.replace("stroke='black'", "stroke='white'").replace("fill='black'", "fill='white'") + ';background-size:62%;background-repeat:no-repeat;background-position:center}',
    I + ' .sugs .sg:nth-child(2)::before{--c:#30b0c7;background-image:' + IC.s2.replace("stroke='black'", "stroke='white'") + ';background-size:62%;background-repeat:no-repeat;background-position:center}',
    I + ' .sugs .sg:nth-child(3)::before{--c:#34c759;background-image:' + IC.s3.replace("stroke='black'", "stroke='white'") + ';background-size:62%;background-repeat:no-repeat;background-position:center}',
    I + ' .sugs .sg:nth-child(4)::before{--c:#ff9f0a;background-image:' + IC.s4.replace("stroke='black'", "stroke='white'").replace("fill='black'", "fill='white'") + ';background-size:62%;background-repeat:no-repeat;background-position:center}',
    I + ' .sugs .sg:nth-child(5)::before{--c:#bf5af2;background-image:' + IC.s5.replace("stroke='black'", "stroke='white'") + ';background-size:62%;background-repeat:no-repeat;background-position:center}',
    I + ' .sugs .sg:nth-child(6)::before{--c:#ff453a;background-image:' + IC.s6.replace("stroke='black'", "stroke='white'").replace("fill='black'", "fill='white'") + ';background-size:62%;background-repeat:no-repeat;background-position:center}',
    /* campo de escritura tipo Mensajes */
    I + ' #comp{width:100%;max-width:820px;margin:0 auto;padding:6px 14px calc(12px + env(safe-area-inset-bottom,0px))!important;background:transparent!important;border:0!important;box-shadow:none!important;border-radius:0!important}',
    I + ' #row{display:flex;align-items:flex-end;gap:8px;padding:5px 5px 5px 6px!important;border:1px solid var(--sep)!important;border-radius:26px!important;background:color-mix(in srgb,var(--panel) 82%,transparent)!important;-webkit-backdrop-filter:saturate(180%) blur(20px)!important;backdrop-filter:saturate(180%) blur(20px)!important;box-shadow:none!important;transition:border-color .3s var(--eio),box-shadow .3s var(--eio)!important}',
    I + ' #row:focus-within{border-color:color-mix(in srgb,var(--acc) 60%,transparent)!important;box-shadow:0 0 0 4px color-mix(in srgb,var(--acc) 16%,transparent)!important}',
    I + ' #row textarea{flex:1;background:transparent!important;border-radius:0!important;padding:9px 6px!important;font-size:17px;line-height:1.35;min-height:38px;max-height:180px;resize:none}',
    I + ' #row .tb{width:36px;height:36px;padding:0;border-radius:50%!important;display:grid;place-items:center;background:var(--fill)!important;color:var(--mut)!important;flex:none}',
    I + ' #row #go{width:36px;height:36px;padding:0;border-radius:50%!important;font-size:0!important;flex:none;background:var(--acc)!important;color:#fff!important;position:relative;transition:transform .5s var(--spr),background .3s!important}',
    I + ' #row #go::before{content:"";position:absolute;inset:7px;background:#fff;-webkit-mask:' + IC.up + ' center/contain no-repeat;mask:' + IC.up + ' center/contain no-repeat}',
    I + ' #row #go.stop{background:#ff453a!important}',
    I + ' #row #go.stop::before{-webkit-mask-image:' + IC.stop + ';mask-image:' + IC.stop + '}',
    I + ' #row #liv{height:36px;padding:0 14px;flex:none;font-size:14px}',
    I + ' #bar{justify-content:center;gap:14px;padding:8px 0 0;font-size:11.5px;color:var(--mut);opacity:.7}',
    I + ' #bar span{background:none!important;border:0!important;padding:0!important;box-shadow:none!important}',
    /* barra lateral: lista de iPadOS */
    I + ' #side{display:flex;flex-direction:column;width:300px!important;margin:0!important;padding:14px 0 12px!important;border:0!important;border-radius:0!important;background:color-mix(in srgb,var(--side) 80%,transparent)!important;-webkit-backdrop-filter:saturate(180%) blur(28px)!important;backdrop-filter:saturate(180%) blur(28px)!important;box-shadow:.5px 0 0 var(--sep)!important;transition:transform .55s var(--eio),margin .55s var(--eio)!important}',
    I + ' #side.hide{margin-left:-300px!important}',
    I + ' #side .sh{padding:6px 16px!important}',
    I + ' #side .sh button{width:100%;text-align:left;padding:11px 16px;border-radius:14px!important}',
    I + ' #side #bn{background:var(--acc)!important;color:#fff!important;text-align:center}',
    I + ' #side .hl{font-size:13px!important;font-weight:600;text-transform:none!important;letter-spacing:0!important;color:var(--mut)!important;padding:14px 22px 6px!important}',
    I + ' #hs{border-radius:12px!important;margin:0}',
    I + ' #hist{padding:4px 10px!important}',
    I + ' .h{padding:11px 14px!important;border-radius:14px!important;color:var(--txt)!important;background:transparent!important;transition:background .25s var(--eio),transform .4s var(--spr)!important}',
    I + ' .h:hover{background:var(--fill)!important}',
    I + ' .h.on{background:color-mix(in srgb,var(--acc) 22%,transparent)!important;color:var(--acc)!important}',
    I + ' .h span{font-size:16px}',
    I + ' #credit{color:var(--mut);text-align:center;font-size:12px;padding:10px 0 0}',
    /* hojas: ajustes, conectores, presentación inicial */
    I + ' #ov,' + I + ' #cnov,' + I + ' #wb{background:rgba(0,0,0,.42)!important;-webkit-backdrop-filter:blur(8px)!important;backdrop-filter:blur(8px)!important}',
    I + ' #set,' + I + ' #cnp,' + I + ' .pmb,' + I + ' #wbc,' + I + ' #obc,' + I + ' #lgc{background:color-mix(in srgb,var(--bg) 92%,transparent)!important;background-image:none!important;border:0!important;border-radius:30px!important;box-shadow:0 30px 90px rgba(0,0,0,.45)!important;-webkit-backdrop-filter:saturate(180%) blur(30px)!important;backdrop-filter:saturate(180%) blur(30px)!important;padding:26px 22px 22px!important;animation:iossheet .6s var(--eio) both!important}',
    I + ' #set::before,' + I + ' #cnp::before{content:"";display:block;width:38px;height:5px;border-radius:3px;background:var(--fill);margin:-12px auto 14px}',
    I + ' #set h3,' + I + ' #cnp h3,' + I + ' #obc h2,' + I + ' #lgc h2{font:700 28px/1.12 var(--sf)!important;letter-spacing:-.025em!important;margin:0 0 6px}',
    I + ' #set h4,' + I + ' #cnp h4{font:500 13px/1 var(--sf)!important;letter-spacing:0!important;text-transform:none!important;color:var(--mut)!important;margin:24px 0 8px 14px!important}',
    I + ' #set .r{background:var(--panel);border-radius:16px;padding:12px 14px!important;margin:6px 0!important}',
    I + ' .cnc{background:var(--panel)!important;border:0!important;border-radius:18px!important;box-shadow:none!important}',
    I + ' #ob,' + I + ' #lg{background:var(--bg)!important;background-image:none!important}',
    I + ' #ob::before,' + I + ' #lg::before,' + I + ' #ob::after,' + I + ' #lg::after{display:none!important}',
    I + ' .th{border-radius:14px!important}',
    I + ' #strow{display:none!important}',
    I + ' #isl .islp,' + I + ' #isl .islb{border-radius:30px!important}',
    /* trucos de perfección de iOS */
    H + '{--spr:linear(0,.009,.035 2.1%,.141 4.4%,.723 15%,.937 21%,1.022 26%,1.057 30%,1.063 33%,1.053 37%,1.012 46%,.993 53%,.992 60%,1 72%,1)}',
    '@supports not (transition-timing-function:linear(0,1)){' + H + '{--spr:cubic-bezier(.34,1.56,.64,1)}}',
    '@supports (corner-shape:squircle){' + I + ' #set,' + I + ' #cnp,' + I + ' .pmb,' + I + ' #obc,' + I + ' #lgc,' + I + ' .sugs,' + I + ' .m,' + I + ' #row,' + I + ' button,' + I + ' .cnc,' + I + ' #set .r,' + I + ' pre,' + I + ' header>svg,' + I + ' .empty .gav{corner-shape:squircle}}',
    I + '{text-rendering:optimizeLegibility;font-optical-sizing:auto;-webkit-touch-callout:none;touch-action:manipulation;overscroll-behavior-y:contain}',
    I + ' #side,' + I + ' header,' + I + ' #row button,' + I + ' .sg,' + I + ' .h,' + I + ' .acts{-webkit-user-select:none;user-select:none}',
    I + ' #log{scroll-behavior:smooth;-webkit-overflow-scrolling:touch;scroll-padding-bottom:20px}',
    I + ' header{transition:box-shadow .4s var(--eio),background .4s var(--eio)!important}',
    I + ' header.sc{background:color-mix(in srgb,var(--bg) 62%,transparent)!important;box-shadow:0 .5px 0 var(--sep),0 8px 24px rgba(0,0,0,.14)!important}',
    '@media (hover:none){' + I + ' button:hover,' + I + ' .sugs .sg:hover,' + I + ' .h:hover{background:revert-layer}}',
    I + ' #row #go{transform:scale(1);opacity:1;transition:transform .55s var(--spr),opacity .25s var(--eio),background .3s!important}',
    I + ' #row:not(.has) #go:not(.stop){transform:scale(.4);opacity:0;pointer-events:none;width:0;margin-left:-8px}',
    I + ' #row #go{transition:transform .55s var(--spr),opacity .25s var(--eio),width .3s var(--eio),margin .3s var(--eio),background .3s!important}',
    I + ' .m.a:empty{min-width:62px;min-height:38px;position:relative}',
    I + ' .m.a:empty::after{content:"";position:absolute;left:18px;top:50%;width:28px;height:8px;margin-top:-4px;background:radial-gradient(circle,var(--mut) 3.4px,transparent 4px) 0 50%/10px 8px repeat-x;animation:iosdots 1.3s ease-in-out infinite}',
    '@keyframes iosdots{0%,100%{opacity:.25}50%{opacity:1}}',
    I + ' #set,' + I + ' #cnp{will-change:transform}',
    /*ASISTENTE*/
    'html[data-ui="ios"] body.assist.siri #lvh .tt{padding-right:84px}html[data-ui="ios"] body.assist.siri #lvbars{width:66px!important;right:66px!important}',
    'html[data-ui="ios"] body.assist #lv{font-family:var(--sf);-webkit-font-smoothing:antialiased}',
    'html[data-ui="ios"] body.assist.siri #lvh{border-radius:38px!important;padding:12px 16px 12px 12px!important;background:rgba(10,10,12,.82)!important;border:.5px solid rgba(255,255,255,.18)!important;-webkit-backdrop-filter:saturate(180%) blur(30px)!important;backdrop-filter:saturate(180%) blur(30px)!important;box-shadow:0 18px 60px rgba(0,0,0,.55)!important;transform-origin:50% 0;animation:iosisland .75s var(--spr) both}',
    'html[data-ui="ios"] body.assist #lvh b{font:600 16px/1.2 var(--sf)!important;letter-spacing:-.015em}',
    'html[data-ui="ios"] body.assist #lvst{font:400 13px/1.3 var(--sf)!important;color:rgba(235,235,245,.62)!important}',
    'html[data-ui="ios"] body.assist #lvorb{width:42px!important;height:42px!important;transition:transform .14s linear;transform:scale(calc(1 + var(--lvl,.15)*.2))}',
    'html[data-ui="ios"] body.assist #lvexp{width:34px!important;height:34px!important;border-radius:50%!important;background:rgba(120,120,128,.36)!important;border:0!important;color:#fff;font-size:15px}',
    'html[data-ui="ios"] body.assist.siri #lvs{border-radius:30px!important;padding:16px 20px!important;background:rgba(28,28,30,.74)!important;border:.5px solid rgba(255,255,255,.14)!important;font:400 17px/1.42 var(--sf)!important;letter-spacing:-.012em;color:#fff!important;-webkit-backdrop-filter:saturate(180%) blur(34px)!important;backdrop-filter:saturate(180%) blur(34px)!important;box-shadow:0 14px 48px rgba(0,0,0,.45)!important;animation:iosrise .65s var(--eio) both}',
    'html[data-ui="ios"] body.assist #lvch{gap:8px!important;padding:0 18px 12px!important}',
    'html[data-ui="ios"] body.assist #lvch button{border-radius:999px!important;background:rgba(120,120,128,.34)!important;border:0!important;color:#fff!important;font:600 15px/1 var(--sf)!important;padding:11px 18px!important;-webkit-backdrop-filter:saturate(180%) blur(20px);backdrop-filter:saturate(180%) blur(20px);animation:iosrise .6s var(--spr) both;transition:transform .45s var(--spr),background .25s!important}',
    'html[data-ui="ios"] body.assist #lvch button:nth-child(2){animation-delay:.06s}html[data-ui="ios"] body.assist #lvch button:nth-child(3){animation-delay:.12s}html[data-ui="ios"] body.assist #lvch button:nth-child(4){animation-delay:.18s}',
    'html[data-ui="ios"] body.assist #lvch button:active{transform:scale(.93)!important;background:rgba(120,120,128,.5)!important}',
    'html[data-ui="ios"] body.assist #lvin{position:relative}',
    'html[data-ui="ios"] body.assist #lvq{height:54px;border-radius:27px!important;padding:0 58px 0 22px!important;background:rgba(28,28,30,.8)!important;border:.5px solid rgba(255,255,255,.18)!important;font:400 17px/1 var(--sf)!important;color:#fff!important;-webkit-backdrop-filter:saturate(180%) blur(24px);backdrop-filter:saturate(180%) blur(24px);transition:border-color .3s var(--eio),box-shadow .3s var(--eio)}',
    'html[data-ui="ios"] body.assist #lvq:focus{border-color:rgba(10,132,255,.8)!important;box-shadow:0 0 0 4px rgba(10,132,255,.22)!important}',
    'html[data-ui="ios"] body.assist #lvsend{display:block;position:absolute;right:9px;top:50%;margin-top:-18px;width:36px;height:36px;padding:0;border:0;border-radius:50%;background:#0a84ff;transform:scale(.3);opacity:0;pointer-events:none;transition:transform .55s var(--spr),opacity .2s}',
    'html[data-ui="ios"] body.assist #lvsend::before{content:"";position:absolute;inset:7px;background:#fff;-webkit-mask:url("data:image/svg+xml;utf8,<svg xmlns=%27http://www.w3.org/2000/svg%27 viewBox=%270 0 24 24%27 fill=%27none%27 stroke=%27black%27 stroke-width=%271.9%27 stroke-linecap=%27round%27 stroke-linejoin=%27round%27><path d=%27M12 19.5V5M5.8 11.2L12 5l6.2 6.2%27 stroke-width=%272.8%27/></svg>") center/contain no-repeat;mask:url("data:image/svg+xml;utf8,<svg xmlns=%27http://www.w3.org/2000/svg%27 viewBox=%270 0 24 24%27 fill=%27none%27 stroke=%27black%27 stroke-width=%271.9%27 stroke-linecap=%27round%27 stroke-linejoin=%27round%27><path d=%27M12 19.5V5M5.8 11.2L12 5l6.2 6.2%27 stroke-width=%272.8%27/></svg>") center/contain no-repeat}',
    'html[data-ui="ios"] body.assist #lvin.has #lvsend{transform:scale(1);opacity:1;pointer-events:auto}',
    'html[data-ui="ios"] body.assist #lvsend{display:none}',
    'html[data-ui="ios"] body.assist #lvin.has #lvsend{display:block}',
    'html[data-ui="ios"] body.assist #lvb{gap:22px!important;padding:12px 0 max(env(safe-area-inset-bottom,0px),28px)!important;align-items:center}',
    'html[data-ui="ios"] body.assist #lvb button{width:66px;height:66px;padding:0!important;border-radius:50%!important;font-size:0!important;border:0!important;background:rgba(120,120,128,.38)!important;color:#fff!important;position:relative;-webkit-backdrop-filter:saturate(180%) blur(24px);backdrop-filter:saturate(180%) blur(24px);transition:transform .5s var(--spr),background .25s!important}',
    'html[data-ui="ios"] body.assist #lvb button:active{transform:scale(.9)!important}',
    'html[data-ui="ios"] body.assist #lvb button::before{content:"";position:absolute;inset:19px;background:currentColor}',
    'html[data-ui="ios"] body.assist #lvm{background:#0a84ff!important}',
    'html[data-ui="ios"] body.assist #lvm::before{-webkit-mask:url("data:image/svg+xml;utf8,<svg xmlns=%27http://www.w3.org/2000/svg%27 viewBox=%270 0 24 24%27 fill=%27none%27 stroke=%27black%27 stroke-width=%271.9%27 stroke-linecap=%27round%27 stroke-linejoin=%27round%27><rect x=%279%27 y=%273%27 width=%276%27 height=%2711%27 rx=%273%27/><path d=%27M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21%27/></svg>") center/contain no-repeat;mask:url("data:image/svg+xml;utf8,<svg xmlns=%27http://www.w3.org/2000/svg%27 viewBox=%270 0 24 24%27 fill=%27none%27 stroke=%27black%27 stroke-width=%271.9%27 stroke-linecap=%27round%27 stroke-linejoin=%27round%27><rect x=%279%27 y=%273%27 width=%276%27 height=%2711%27 rx=%273%27/><path d=%27M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21%27/></svg>") center/contain no-repeat}',
    'html[data-ui="ios"] body.assist #lvm.muted{background:#ff453a!important}',
    'html[data-ui="ios"] body.assist #lvx::before{-webkit-mask:url("data:image/svg+xml;utf8,<svg xmlns=%27http://www.w3.org/2000/svg%27 viewBox=%270 0 24 24%27 fill=%27none%27 stroke=%27black%27 stroke-width=%271.9%27 stroke-linecap=%27round%27 stroke-linejoin=%27round%27><path d=%27M6 6l12 12M18 6L6 18%27 stroke-width=%272.6%27/></svg>") center/contain no-repeat;mask:url("data:image/svg+xml;utf8,<svg xmlns=%27http://www.w3.org/2000/svg%27 viewBox=%270 0 24 24%27 fill=%27none%27 stroke=%27black%27 stroke-width=%271.9%27 stroke-linecap=%27round%27 stroke-linejoin=%27round%27><path d=%27M6 6l12 12M18 6L6 18%27 stroke-width=%272.6%27/></svg>") center/contain no-repeat}',
    'html[data-ui="ios"] body.assist #lvx{background:rgba(120,120,128,.38)!important}',
    'html[data-ui="ios"] body.assist:not(.siri) #lv{border-radius:32px!important}',
    'html[data-ui="ios"] body.assist:not(.siri) #lv::before{content:"";position:absolute;left:50%;top:8px;width:38px;height:5px;margin-left:-19px;border-radius:3px;background:rgba(255,255,255,.3);filter:none;animation:none;inset:auto;z-index:5}',
    '@keyframes iosisland{0%{opacity:0;transform:scale(.42,.3) translateY(-12px)}100%{opacity:1;transform:none}}',
    /* animaciones de resorte */
    '@keyframes iospop{0%{opacity:0;transform:scale(.82) translateY(10px)}55%{opacity:1;transform:scale(1.025) translateY(0)}100%{opacity:1;transform:none}}',
    '@keyframes iosrise{from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:none}}',
    '@keyframes iossheet{from{opacity:0;transform:translateY(34px) scale(.96)}to{opacity:1;transform:none}}',
    /* pantallas estrechas: barra lateral como cajón */
    '@media(max-width:899px){' + I + ' #side{position:fixed!important;left:0;top:0;bottom:0;z-index:30;width:min(340px,86vw)!important;margin:0!important;box-shadow:30px 0 90px rgba(0,0,0,.45)!important;border-radius:0 28px 28px 0!important}' + I + ' #side.hide{transform:translateX(-104%)!important;margin:0!important;box-shadow:none!important}' + I + ' header{padding:8px 12px 6px!important}' + I + ' #log{padding:12px 12px 10px!important}' + I + ' .m{max-width:84%!important}}',
    '@media(prefers-reduced-motion:reduce){' + I + ' .m,' + I + ' .empty,' + I + ' #set,' + I + ' #cnp{animation:none!important}}'
  ].join('\n');
  function boot() {
    var st = document.createElement('style'); st.id = 'calex-ios'; st.textContent = CSS; document.head.appendChild(st);
    var q = function (id) { return document.getElementById(id); }, tap = function (ms) { try { if (navigator.vibrate && !matchMedia('(prefers-reduced-motion:reduce)').matches) navigator.vibrate(ms || 6); } catch (e) { } };
    var on = function () { return document.documentElement.getAttribute('data-ui') === 'ios'; };
    // el botón de enviar solo aparece cuando hay texto (como en Mensajes)
    var row = q('row'), ta = q('q'); if (row && ta) { var upd = function () { row.classList.toggle('has', !!ta.value.trim()); }; ta.addEventListener('input', upd); new MutationObserver(upd).observe(ta, { attributes: true }); setInterval(upd, 600); upd(); }
    // barra superior: más opaca y con sombra al desplazarse
    var lg = q('log'), hd = document.querySelector('header'); if (lg && hd) lg.addEventListener('scroll', function () { hd.classList.toggle('sc', lg.scrollTop > 6); }, { passive: true });
    // vibración suave en botones, filas y envío
    document.addEventListener('pointerdown', function (e) { if (on() && e.target.closest && e.target.closest('button,.h,.sg')) tap(5); }, { passive: true });
    // hojas: arrastrar hacia abajo para cerrar
    ['set', 'cnp'].forEach(function (id) {
      var el = q(id); if (!el) return; var y0 = null, dy = 0, raf = 0, ov = el.parentElement;
      el.addEventListener('pointerdown', function (e) { if (!on()) return; var r = el.getBoundingClientRect(); if (e.clientY - r.top > 56) return; y0 = e.clientY; dy = 0; el.setPointerCapture && el.setPointerCapture(e.pointerId); el.style.transition = 'none'; });
      el.addEventListener('pointermove', function (e) { if (y0 === null) return; dy = Math.max(0, e.clientY - y0); if (!raf) raf = requestAnimationFrame(function () { raf = 0; el.style.transform = 'translateY(' + dy + 'px) scale(' + (1 - Math.min(dy, 300) / 4000) + ')'; }); });
      var end = function () { if (y0 === null) return; var close = dy > 110; y0 = null; el.style.transition = 'transform .5s var(--eio)'; el.style.transform = ''; if (close && ov) { ov.classList.remove('on'); tap(10); } setTimeout(function () { el.style.transition = ''; }, 520); };
      el.addEventListener('pointerup', end); el.addEventListener('pointercancel', end);
    });
  }
  window.CalexIOS = { css: CSS };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
