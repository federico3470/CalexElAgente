// Calex Studio: motor de diseño de páginas web. La IA decide la dirección creativa y los textos (un «spec» JSON) y este motor arma una página
// completa con componentes premium, fondo animado con shaders WebGL y texturas procedurales de hasta 4K generadas en la GPU de quien la abre.
// Así la calidad visual no depende de que un modelo gratuito escriba 1000 líneas de CSS sin errores.
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const str = (v, n, d = "") => String(v ?? d).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, "").trim().slice(0, n);
const hexOk = (v, d) => (/^#[0-9a-f]{6}$/i.test(String(v || "")) ? v : d);

// ---------- paletas, tipografías y texturas ----------
export const PRESETS = {
  ember: { dark: 1, bg: "#0e0a08", sf: "#1a120e", tx: "#f6ede2", mu: "#b9a898", ac: "#e8743b", ac2: "#f4b86a", c3: "#7a2e12" },
  ocean: { dark: 1, bg: "#050d1a", sf: "#0c1a2e", tx: "#e8f1fb", mu: "#8fa6c2", ac: "#35a0ff", ac2: "#7ee0ff", c3: "#0b3a73" },
  forest: { dark: 1, bg: "#07110c", sf: "#0f1f16", tx: "#e9f3ea", mu: "#93ab98", ac: "#4cd08a", ac2: "#c6f06b", c3: "#134d2c" },
  royal: { dark: 1, bg: "#0b0714", sf: "#150e26", tx: "#f1ebfb", mu: "#a597c2", ac: "#9b6bff", ac2: "#ff7ad9", c3: "#3a1a7a" },
  gold: { dark: 1, bg: "#0c0b09", sf: "#17150f", tx: "#f5f0e4", mu: "#b4ad9a", ac: "#d4a74f", ac2: "#f3dc9a", c3: "#6b5217" },
  sand: { dark: 0, bg: "#f6f0e6", sf: "#ffffff", tx: "#1d1a15", mu: "#6e655a", ac: "#c4572a", ac2: "#e8a15b", c3: "#e6d2b4" },
  sky: { dark: 0, bg: "#f2f7fc", sf: "#ffffff", tx: "#10202f", mu: "#5d7186", ac: "#1f7ae0", ac2: "#46c1f2", c3: "#cfe3f7" },
  mono: { dark: 1, bg: "#060606", sf: "#111111", tx: "#f2f2f2", mu: "#9a9a9a", ac: "#ffffff", ac2: "#bdbdbd", c3: "#333333" },
};
const FONTS = {
  serif: { disp: '"Iowan Old Style","Palatino Linotype",Palatino,"Book Antiqua",Georgia,serif', body: '"Inter","SF Pro Text","Segoe UI",system-ui,-apple-system,Roboto,sans-serif' },
  sans: { disp: '"Inter","SF Pro Display","Segoe UI",system-ui,-apple-system,Roboto,sans-serif', body: '"Inter","SF Pro Text","Segoe UI",system-ui,-apple-system,Roboto,sans-serif' },
  grotesk: { disp: '"Space Grotesk","Helvetica Neue","Arial Black",Arial,sans-serif', body: '"Inter","Segoe UI",system-ui,sans-serif' },
  mono: { disp: 'ui-monospace,"SF Mono","Cascadia Code",Menlo,Consolas,monospace', body: '"Inter","Segoe UI",system-ui,sans-serif' },
  rounded: { disp: 'ui-rounded,"SF Pro Rounded","Nunito","Segoe UI",system-ui,sans-serif', body: 'ui-rounded,"Nunito","Segoe UI",system-ui,sans-serif' },
};
const TEX = { marble: 0, wood: 1, paper: 2, metal: 3, stone: 4, clouds: 5, tech: 6 };
const SHADER = { warp: 0, aurora: 1, nebula: 2 };
const SECTION_TYPES = ["features", "split", "gallery", "timeline", "stats", "pricing", "testimonials", "faq", "cta", "contact"];

// ---------- el spec que pide la IA ----------
export const SPEC_SCHEMA = `{
 "title": "nombre de la marca o página (corto)",
 "tagline": "frase de una línea",
 "theme": { "preset": "ember|ocean|forest|royal|gold|sand|sky|mono", "font": "serif|sans|grotesk|mono|rounded", "shader": "warp|aurora|nebula" },
 "hero": { "kicker": "texto corto en mayúsculas", "headline": "titular potente (3 a 8 palabras)", "sub": "una o dos frases", "cta": "texto del botón", "cta2": "texto del botón secundario",
           "stats": [ { "n": "12", "suffix": "+", "label": "texto" } ] },
 "marquee": ["palabra", "palabra", "palabra", "palabra"],
 "sections": [
  { "type": "features", "nav": "Menú corto", "title": "", "intro": "", "items": [ { "icon": "un emoji", "title": "", "text": "" } ] },
  { "type": "split", "nav": "", "title": "", "text": "", "bullets": [ "" ], "texture": "marble|wood|paper|metal|stone|clouds|tech", "reverse": false },
  { "type": "gallery", "nav": "", "title": "", "intro": "", "items": [ { "title": "", "text": "", "tag": "", "texture": "marble|wood|paper|metal|stone|clouds|tech" } ] },
  { "type": "timeline", "nav": "", "title": "", "items": [ { "when": "", "title": "", "text": "" } ] },
  { "type": "stats", "nav": "", "title": "", "items": [ { "n": "100", "suffix": "%", "label": "" } ] },
  { "type": "pricing", "nav": "", "title": "", "intro": "", "items": [ { "name": "", "price": "", "per": "/mes", "features": [ "" ], "highlight": false } ] },
  { "type": "testimonials", "nav": "", "title": "", "items": [ { "quote": "", "who": "nombre, rol" } ] },
  { "type": "faq", "nav": "", "title": "", "items": [ { "q": "", "a": "" } ] },
  { "type": "cta", "nav": "", "title": "", "text": "", "button": "" },
  { "type": "contact", "nav": "Contacto", "title": "", "lines": [ "dato de contacto de ejemplo" ] }
 ],
 "footer": "texto del pie"
}`;

export function normalizeSpec(raw, ask = "", level = 50) {
  const r = raw && typeof raw === "object" ? raw : {}, th = r.theme || {}, hr = r.hero || {};
  const preset = PRESETS[th.preset] ? th.preset : "ember", title = str(r.title, 40) || str(ask, 30) || "Mi proyecto";
  const items = (a, n, f) => (Array.isArray(a) ? a : []).slice(0, n).map(f).filter(Boolean);
  const secs = items(r.sections, level < 34 ? 5 : level < 67 ? 8 : 10, (s) => {
    const type = SECTION_TYPES.includes(s?.type) ? s.type : null; if (!type) return null; const base = { type, nav: str(s.nav, 18), title: str(s.title, 90), intro: str(s.intro, 260), text: str(s.text, 520) };
    const tex = (v) => (v in TEX ? v : ["marble", "stone", "metal", "paper", "clouds", "wood", "tech"][Math.floor(Math.random() * 7)]);
    if (type === "features") base.items = items(s.items, 6, (i) => ({ icon: str(i?.icon, 4, "✦"), title: str(i?.title, 50), text: str(i?.text, 200) }));
    if (type === "split") { base.bullets = items(s.bullets, 5, (b) => str(b, 120) || null); base.texture = tex(s.texture); base.reverse = !!s.reverse; }
    if (type === "gallery") base.items = items(s.items, 6, (i) => ({ title: str(i?.title, 50), text: str(i?.text, 160), tag: str(i?.tag, 24), texture: tex(i?.texture) }));
    if (type === "timeline") base.items = items(s.items, 6, (i) => ({ when: str(i?.when, 24), title: str(i?.title, 50), text: str(i?.text, 200) }));
    if (type === "stats") base.items = items(s.items, 4, (i) => ({ n: str(i?.n, 8), suffix: str(i?.suffix, 4), label: str(i?.label, 40) }));
    if (type === "pricing") base.items = items(s.items, 3, (i) => ({ name: str(i?.name, 30), price: str(i?.price, 14), per: str(i?.per, 12), features: items(i?.features, 6, (f) => str(f, 80) || null), highlight: !!i?.highlight }));
    if (type === "testimonials") base.items = items(s.items, 3, (i) => ({ quote: str(i?.quote, 240), who: str(i?.who, 60) }));
    if (type === "faq") base.items = items(s.items, 6, (i) => ({ q: str(i?.q, 120), a: str(i?.a, 320) }));
    if (type === "cta") base.button = str(s.button, 30, "Empezar");
    if (type === "contact") base.lines = items(s.lines, 5, (l) => str(l, 100) || null);
    if (base.items && !base.items.length) return null; return base;
  });
  return { title, tagline: str(r.tagline, 120), theme: { preset, font: FONTS[th.font] ? th.font : "sans", shader: th.shader in SHADER ? th.shader : "warp",
      ...(["bg", "sf", "tx", "mu", "ac", "ac2"].reduce((o, k) => (/^#[0-9a-f]{6}$/i.test(th[k] || "") ? { ...o, [k]: th[k] } : o, {}))) },
    hero: { kicker: str(hr.kicker, 40), headline: str(hr.headline, 80) || title, sub: str(hr.sub, 260) || str(r.tagline, 200), cta: str(hr.cta, 28, "Descubrir"), cta2: str(hr.cta2, 28),
      stats: items(hr.stats, 3, (s) => ({ n: str(s?.n, 8), suffix: str(s?.suffix, 4), label: str(s?.label, 30) })) },
    marquee: items(r.marquee, 8, (m) => str(m, 24) || null), sections: secs, footer: str(r.footer, 160) || title + " · Hecho con Calex" };
}

// ---------- componentes ----------
const rv = (i = 0) => ` class="rv" style="--d:${(i * 0.08).toFixed(2)}s"`;
const slug = (s, i) => "s" + i;
const texAttr = (k, p, c) => `<canvas class="tex" data-k="${TEX[k] ?? 0}" data-p="${p}" data-c="${c}" aria-hidden="true"></canvas>`;
const R = {
  features: (s, i) => `<section id="${slug(s, i)}" class="sec"><div class="wrap"><header class="hd"${rv()}><h2>${esc(s.title)}</h2>${s.intro ? `<p>${esc(s.intro)}</p>` : ""}</header><div class="grid g3">${s.items.map((it, j) => `<article class="card tilt"${rv(j)}><span class="ic">${esc(it.icon)}</span><h3>${esc(it.title)}</h3><p>${esc(it.text)}</p></article>`).join("")}</div></div></section>`,
  split: (s, i) => `<section id="${slug(s, i)}" class="sec"><div class="wrap split${s.reverse ? " rev" : ""}"><div class="txt"${rv()}><h2>${esc(s.title)}</h2><p>${esc(s.text)}</p>${s.bullets?.length ? `<ul class="bul">${s.bullets.map((b) => `<li>${esc(b)}</li>`).join("")}</ul>` : ""}</div><div class="vis tilt"${rv(2)}>${texAttr(s.texture, i < 4 ? 1 : 0, i % 3)}<div class="gl"></div></div></div></section>`,
  gallery: (s, i) => `<section id="${slug(s, i)}" class="sec"><div class="wrap"><header class="hd"${rv()}><h2>${esc(s.title)}</h2>${s.intro ? `<p>${esc(s.intro)}</p>` : ""}</header><div class="grid g3 gal">${s.items.map((it, j) => `<article class="tile tilt"${rv(j)}>${texAttr(it.texture, 0, j % 3)}<div class="shade"></div><div class="cap">${it.tag ? `<em>${esc(it.tag)}</em>` : ""}<h3>${esc(it.title)}</h3><p>${esc(it.text)}</p></div></article>`).join("")}</div></div></section>`,
  timeline: (s, i) => `<section id="${slug(s, i)}" class="sec"><div class="wrap narrow"><header class="hd"${rv()}><h2>${esc(s.title)}</h2></header><ol class="tl">${s.items.map((it, j) => `<li${rv(j)}><span class="dot"></span><time>${esc(it.when)}</time><h3>${esc(it.title)}</h3><p>${esc(it.text)}</p></li>`).join("")}</ol></div></section>`,
  stats: (s, i) => `<section id="${slug(s, i)}" class="sec"><div class="wrap"><header class="hd"${rv()}><h2>${esc(s.title)}</h2></header><div class="grid g4 stats">${s.items.map((it, j) => `<div class="stat"${rv(j)}><b><span data-count="${esc(it.n)}">${esc(it.n)}</span>${esc(it.suffix)}</b><span>${esc(it.label)}</span></div>`).join("")}</div></div></section>`,
  pricing: (s, i) => `<section id="${slug(s, i)}" class="sec"><div class="wrap"><header class="hd"${rv()}><h2>${esc(s.title)}</h2>${s.intro ? `<p>${esc(s.intro)}</p>` : ""}</header><div class="grid g3 price">${s.items.map((it, j) => `<article class="card tilt${it.highlight ? " hot" : ""}"${rv(j)}><h3>${esc(it.name)}</h3><div class="pr"><b>${esc(it.price)}</b><span>${esc(it.per)}</span></div><ul class="bul">${it.features.map((f) => `<li>${esc(f)}</li>`).join("")}</ul><a class="btn${it.highlight ? " pri" : ""}" href="#contacto">Elegir</a></article>`).join("")}</div></div></section>`,
  testimonials: (s, i) => `<section id="${slug(s, i)}" class="sec"><div class="wrap"><header class="hd"${rv()}><h2>${esc(s.title)}</h2></header><div class="grid g3">${s.items.map((it, j) => `<figure class="card quote"${rv(j)}><blockquote>“${esc(it.quote)}”</blockquote><figcaption>${esc(it.who)}</figcaption></figure>`).join("")}</div></div></section>`,
  faq: (s, i) => `<section id="${slug(s, i)}" class="sec"><div class="wrap narrow"><header class="hd"${rv()}><h2>${esc(s.title)}</h2></header>${s.items.map((it, j) => `<details class="faq"${rv(j)}><summary>${esc(it.q)}</summary><p>${esc(it.a)}</p></details>`).join("")}</div></section>`,
  cta: (s, i) => `<section id="${slug(s, i)}" class="sec"><div class="wrap"><div class="cta"${rv()}>${texAttr("clouds", 0, 2)}<div class="shade"></div><div class="in"><h2>${esc(s.title)}</h2><p>${esc(s.text)}</p><a class="btn pri big" href="#contacto">${esc(s.button)}</a></div></div></div></section>`,
  contact: (s, i) => `<section id="contacto" class="sec"><div class="wrap narrow"><header class="hd"${rv()}><h2>${esc(s.title)}</h2></header><div class="card contact"${rv(1)}>${s.lines.map((l) => `<p>${esc(l)}</p>`).join("")}<a class="btn pri" href="#top">Volver arriba ↑</a></div></div></section>`,
};

const CSS = String.raw`*{box-sizing:border-box;margin:0;padding:0}html{scroll-behavior:smooth}
body{background:var(--bg);color:var(--tx);font:17px/1.65 var(--body);-webkit-font-smoothing:antialiased;overflow-x:hidden}
::selection{background:var(--ac);color:var(--bg)}a{color:inherit}
.prog{position:fixed;top:0;left:0;height:3px;width:0;background:linear-gradient(90deg,var(--ac),var(--ac2));z-index:60}
nav{position:fixed;top:14px;left:50%;transform:translateX(-50%);z-index:50;display:flex;align-items:center;gap:4px;padding:7px 8px 7px 20px;border-radius:999px;max-width:calc(100vw - 20px);background:color-mix(in srgb,var(--sf) 58%,transparent);-webkit-backdrop-filter:blur(20px) saturate(170%);backdrop-filter:blur(20px) saturate(170%);border:1px solid color-mix(in srgb,var(--tx) 12%,transparent);box-shadow:0 14px 50px rgba(0,0,0,.35)}
nav b{font:800 18px var(--disp);letter-spacing:-.01em;margin-right:12px;white-space:nowrap}nav a{color:var(--mu);text-decoration:none;font-size:14px;padding:8px 13px;border-radius:999px;transition:.25s;white-space:nowrap}nav a:hover{color:var(--tx);background:color-mix(in srgb,var(--tx) 10%,transparent)}nav a.go{background:var(--ac);color:var(--bg);font-weight:700}
@media(max-width:760px){nav a:not(.go){display:none}nav{padding-left:16px}}
.hero{position:relative;min-height:100svh;display:grid;place-items:center;text-align:center;padding:130px 24px 90px;overflow:hidden;isolation:isolate}
.hero canvas.bg{position:absolute;inset:0;width:100%;height:100%;z-index:-3}.hero .grain{position:absolute;inset:0;z-index:-2;mix-blend-mode:overlay;opacity:.5;width:100%;height:100%}
.hero::after{content:"";position:absolute;inset:0;background:radial-gradient(110% 75% at 50% 0%,transparent 30%,var(--bg) 96%);z-index:-1}
.hero .in{max-width:1100px;will-change:transform}.kick{letter-spacing:.3em;text-transform:uppercase;font-size:13px;color:var(--ac2);margin-bottom:26px;font-weight:600}
h1{font:800 clamp(46px,10vw,136px)/.94 var(--disp);letter-spacing:-.035em;background:linear-gradient(180deg,var(--tx) 30%,color-mix(in srgb,var(--tx) 40%,var(--ac)));-webkit-background-clip:text;background-clip:text;color:transparent;text-wrap:balance}
.hero p.sub{font-size:clamp(17px,2.2vw,24px);color:var(--mu);max-width:720px;margin:28px auto 0;text-wrap:balance}
.cta-row{display:flex;gap:14px;justify-content:center;flex-wrap:wrap;margin-top:40px}
.btn{display:inline-flex;align-items:center;gap:10px;padding:15px 28px;border-radius:999px;font-weight:700;font-size:16px;text-decoration:none;border:1px solid color-mix(in srgb,var(--tx) 22%,transparent);background:color-mix(in srgb,var(--sf) 50%,transparent);-webkit-backdrop-filter:blur(12px);backdrop-filter:blur(12px);transition:transform .3s cubic-bezier(.2,.9,.3,1.3),box-shadow .3s,background .3s;cursor:pointer}
.btn:hover{transform:translateY(-3px) scale(1.03);box-shadow:0 14px 40px color-mix(in srgb,var(--ac) 40%,transparent)}.btn.pri{background:linear-gradient(135deg,var(--ac),var(--ac2));color:var(--bg);border-color:transparent}.btn.big{padding:19px 38px;font-size:18px}
.hstats{display:flex;gap:clamp(24px,6vw,70px);justify-content:center;flex-wrap:wrap;margin-top:64px}.hstats div{text-align:center}.hstats b{display:block;font:800 clamp(30px,4vw,50px) var(--disp);color:var(--tx)}.hstats span{font-size:13px;letter-spacing:.14em;text-transform:uppercase;color:var(--mu)}
.scroll{position:absolute;bottom:26px;left:50%;width:26px;height:42px;border:2px solid color-mix(in srgb,var(--tx) 35%,transparent);border-radius:20px;transform:translateX(-50%)}.scroll::after{content:"";position:absolute;top:8px;left:50%;width:4px;height:8px;margin-left:-2px;border-radius:4px;background:var(--ac2);animation:sc 1.8s infinite}@keyframes sc{0%{opacity:1;transform:translateY(0)}100%{opacity:0;transform:translateY(16px)}}
.mq{overflow:hidden;border-block:1px solid color-mix(in srgb,var(--tx) 10%,transparent);padding:20px 0;background:color-mix(in srgb,var(--sf) 60%,transparent)}.mq div{display:flex;gap:48px;width:max-content;animation:mq 34s linear infinite}.mq span{font:800 clamp(22px,3.4vw,44px) var(--disp);letter-spacing:-.02em;white-space:nowrap;color:transparent;-webkit-text-stroke:1px color-mix(in srgb,var(--tx) 50%,transparent)}.mq span:nth-child(even){color:var(--ac);-webkit-text-stroke:0}@keyframes mq{to{transform:translateX(-50%)}}
.sec{padding:clamp(70px,11vw,150px) 0;position:relative}.wrap{width:min(1180px,calc(100% - 44px));margin:0 auto}.wrap.narrow{width:min(820px,calc(100% - 44px))}
.hd{max-width:760px;margin-bottom:54px}.hd h2,.txt h2,.cta h2{font:800 clamp(32px,5.4vw,66px)/1.02 var(--disp);letter-spacing:-.03em;text-wrap:balance}.hd p{color:var(--mu);margin-top:16px;font-size:19px}
.grid{display:grid;gap:22px}.g3{grid-template-columns:repeat(auto-fit,minmax(280px,1fr))}.g4{grid-template-columns:repeat(auto-fit,minmax(200px,1fr))}
.card{padding:34px 30px;border-radius:var(--rad);background:linear-gradient(160deg,color-mix(in srgb,var(--sf) 92%,var(--tx)),var(--sf));border:1px solid color-mix(in srgb,var(--tx) 10%,transparent);box-shadow:0 20px 60px rgba(0,0,0,.18),inset 0 1px 0 color-mix(in srgb,var(--tx) 14%,transparent);transition:box-shadow .4s,border-color .4s}
.card:hover{border-color:color-mix(in srgb,var(--ac) 55%,transparent);box-shadow:0 30px 80px color-mix(in srgb,var(--ac) 22%,transparent)}.card h3{font:700 22px var(--disp);margin:14px 0 8px;letter-spacing:-.01em}.card p{color:var(--mu)}
.ic{display:grid;place-items:center;width:58px;height:58px;border-radius:18px;font-size:28px;background:linear-gradient(135deg,color-mix(in srgb,var(--ac) 30%,transparent),color-mix(in srgb,var(--ac2) 18%,transparent));border:1px solid color-mix(in srgb,var(--ac) 40%,transparent)}
.split{display:grid;grid-template-columns:1fr 1fr;gap:clamp(30px,6vw,90px);align-items:center}.split.rev .vis{order:-1}@media(max-width:860px){.split{grid-template-columns:1fr}.split.rev .vis{order:0}}
.txt p{color:var(--mu);font-size:19px;margin-top:20px}.bul{list-style:none;margin-top:24px;display:grid;gap:12px}.bul li{position:relative;padding-left:34px}.bul li::before{content:"";position:absolute;left:0;top:.5em;width:18px;height:18px;border-radius:6px;background:linear-gradient(135deg,var(--ac),var(--ac2));transform:rotate(45deg) scale(.7)}
.vis,.tile,.cta{position:relative;overflow:hidden;border-radius:calc(var(--rad) + 8px);isolation:isolate}.vis{aspect-ratio:4/5;box-shadow:0 40px 100px rgba(0,0,0,.4),0 0 0 1px color-mix(in srgb,var(--tx) 12%,transparent)}
canvas.tex{position:absolute;inset:0;width:100%;height:100%;z-index:-2;background:linear-gradient(135deg,var(--c3),var(--sf))}.vis .gl,.shade{position:absolute;inset:0;z-index:-1}.vis .gl{background:radial-gradient(80% 60% at 25% 15%,rgba(255,255,255,.28),transparent 60%),linear-gradient(200deg,transparent 50%,rgba(0,0,0,.45))}
.gal .tile{aspect-ratio:3/4;display:flex;align-items:flex-end;box-shadow:0 24px 70px rgba(0,0,0,.35)}.shade{background:linear-gradient(180deg,transparent 35%,rgba(0,0,0,.78))}.cap{padding:26px;color:#fff}.cap em{font-style:normal;font-size:12px;letter-spacing:.18em;text-transform:uppercase;background:rgba(255,255,255,.16);-webkit-backdrop-filter:blur(8px);backdrop-filter:blur(8px);padding:5px 11px;border-radius:999px}.cap h3{font:700 24px var(--disp);margin:12px 0 6px}.cap p{color:rgba(255,255,255,.8);font-size:15px}
.tilt{transform-style:preserve-3d;transition:transform .25s ease-out}
.tl{list-style:none;position:relative;padding-left:34px}.tl::before{content:"";position:absolute;left:8px;top:6px;bottom:6px;width:2px;background:linear-gradient(var(--ac),var(--ac2),transparent)}.tl li{position:relative;margin-bottom:40px}.tl .dot{position:absolute;left:-34px;top:6px;width:18px;height:18px;border-radius:50%;background:var(--bg);border:3px solid var(--ac);box-shadow:0 0 0 6px color-mix(in srgb,var(--ac) 22%,transparent)}
.tl time{font-size:13px;letter-spacing:.16em;text-transform:uppercase;color:var(--ac2);font-weight:700}.tl h3{font:700 24px var(--disp);margin:6px 0}.tl p{color:var(--mu)}
.stat{padding:34px 20px;text-align:center;border-radius:var(--rad);background:color-mix(in srgb,var(--sf) 85%,transparent);border:1px solid color-mix(in srgb,var(--tx) 9%,transparent)}.stat b{display:block;font:800 clamp(40px,6vw,72px) var(--disp);background:linear-gradient(135deg,var(--ac),var(--ac2));-webkit-background-clip:text;background-clip:text;color:transparent}.stat span{color:var(--mu);font-size:15px}
.price .card{display:flex;flex-direction:column}.price .pr{margin:10px 0 6px}.price .pr b{font:800 52px var(--disp)}.price .pr span{color:var(--mu);margin-left:6px}.price .bul{margin:20px 0 28px;flex:1}.price .card.hot{background:linear-gradient(160deg,color-mix(in srgb,var(--ac) 24%,var(--sf)),var(--sf));border-color:var(--ac);transform:scale(1.03)}.price .btn{justify-content:center}
.quote blockquote{font:500 20px/1.5 var(--disp);letter-spacing:-.01em}.quote figcaption{margin-top:20px;color:var(--ac2);font-weight:700;font-size:14px;letter-spacing:.06em}
.faq{border-bottom:1px solid color-mix(in srgb,var(--tx) 14%,transparent);padding:6px 0}.faq summary{cursor:pointer;list-style:none;padding:22px 40px 22px 0;font:700 20px var(--disp);position:relative}.faq summary::-webkit-details-marker{display:none}.faq summary::after{content:"+";position:absolute;right:6px;top:50%;transform:translateY(-50%);font-size:32px;color:var(--ac);transition:.3s}.faq[open] summary::after{transform:translateY(-50%) rotate(45deg)}.faq p{color:var(--mu);padding:0 0 24px}
.cta{padding:clamp(56px,9vw,120px) clamp(24px,6vw,80px);text-align:center;box-shadow:0 40px 120px color-mix(in srgb,var(--ac) 25%,transparent)}.cta .in{max-width:720px;margin:0 auto}.cta p{margin:18px 0 34px;font-size:20px;color:rgba(255,255,255,.85)}.cta h2{color:#fff}.cta .shade{background:linear-gradient(135deg,color-mix(in srgb,var(--ac) 55%,rgba(0,0,0,.6)),rgba(0,0,0,.55))}
.contact{text-align:center}.contact p{font-size:20px;margin:10px 0;color:var(--tx)}.contact .btn{margin-top:26px}
footer{padding:48px 22px 60px;text-align:center;color:var(--mu);border-top:1px solid color-mix(in srgb,var(--tx) 10%,transparent);font-size:15px}
[data-count]{font:inherit!important;letter-spacing:inherit!important;text-transform:none!important;color:inherit!important;-webkit-text-fill-color:inherit}
.rv{opacity:0;transform:translateY(40px) scale(.985);transition:opacity 1s cubic-bezier(.2,.7,.2,1) var(--d,0s),transform 1s cubic-bezier(.2,.7,.2,1) var(--d,0s)}.rv.in{opacity:1;transform:none}
.glow{position:fixed;left:0;top:0;width:520px;height:520px;margin:-260px 0 0 -260px;border-radius:50%;pointer-events:none;z-index:1;background:radial-gradient(circle,color-mix(in srgb,var(--ac) 16%,transparent),transparent 62%);mix-blend-mode:screen;transition:opacity .4s}
@media(hover:none){.glow{display:none}}
@media(prefers-reduced-motion:reduce){html{scroll-behavior:auto}.rv{opacity:1;transform:none;transition:none}.mq div,.scroll::after{animation:none}}`;

// GLSL: fondo animado del hero y generador de texturas (se ejecutan en la GPU de quien abre la página)
const JS = String.raw`(function(){
var $=function(s,r){return(r||document).querySelector(s)},$$=function(s,r){return[].slice.call((r||document).querySelectorAll(s))};
var reduce=matchMedia('(prefers-reduced-motion:reduce)').matches;
function rgb(h){var n=parseInt(h.slice(1),16);return[(n>>16&255)/255,(n>>8&255)/255,(n&255)/255]}
var cs=getComputedStyle(document.documentElement);function cv(n){return cs.getPropertyValue(n).trim()}
var NOISE='float h(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}float n(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x),f.y);}float fbm(vec2 p){float v=0.,a=.5;for(int i=0;i<6;i++){v+=a*n(p);p=p*2.03+vec2(1.7,9.2);a*=.5;}return v;}';
var VS='attribute vec2 a;void main(){gl_Position=vec4(a,0.,1.);}';
function prog(g,fs){function sh(t,s){var o=g.createShader(t);g.shaderSource(o,s);g.compileShader(o);if(!g.getShaderParameter(o,g.COMPILE_STATUS))console.warn('shader:',g.getShaderInfoLog(o));return o}var p=g.createProgram();g.attachShader(p,sh(g.VERTEX_SHADER,VS));g.attachShader(p,sh(g.FRAGMENT_SHADER,fs));g.linkProgram(p);if(!g.getProgramParameter(p,g.LINK_STATUS))return null;
 g.useProgram(p);var b=g.createBuffer();g.bindBuffer(g.ARRAY_BUFFER,b);g.bufferData(g.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),g.STATIC_DRAW);var l=g.getAttribLocation(p,'a');g.enableVertexAttribArray(l);g.vertexAttribPointer(l,2,g.FLOAT,false,0,0);return p}
function U(g,p,n){return g.getUniformLocation(p,n)}
/* --- fondo animado del hero (WebGL) --- */
var HERO='precision highp float;uniform vec2 R;uniform float T;uniform vec3 A,B,C;uniform int K;'+NOISE+
'void main(){vec2 p=(gl_FragCoord.xy-.5*R)/R.y;float t=T*.05;vec3 col;'+
'if(K==1){float y=p.y+.15*sin(p.x*3.+t*6.)+.08*fbm(p*3.+t);float band=0.;for(int i=0;i<3;i++){float fi=float(i);band+=smoothstep(.25,0.,abs(y-.1*fi+.2*sin(p.x*2.+fi+t*4.)));}col=mix(A,B,clamp(band*.7,0.,1.));col=mix(col,C,fbm(p*2.+t)*.6*band);col+=.5*B*pow(max(0.,1.-length(p-vec2(0.,.35))),3.)*.5;}'+
'else{vec2 q=vec2(fbm(p*1.7+t),fbm(p*1.7+vec2(5.2,1.3)-t));vec2 r=vec2(fbm(p*1.7+3.*q+vec2(1.7,9.2)+t*1.2),fbm(p*1.7+3.*q+vec2(8.3,2.8)-t));float f=fbm(p*1.7+3.*r);col=mix(A,B,clamp(f*f*3.2,0.,1.));col=mix(col,C,clamp(length(q)*.9,0.,1.)*.6);col*=.5+1.0*f;'+
'if(K==2){vec2 s=floor((p+3.)*70.);float st=step(.985,h(s));col+=st*(.5+.5*sin(T*2.+h(s)*30.))*B;}}'+
'col+=.05*(h(gl_FragCoord.xy+T)-.5);gl_FragColor=vec4(col,1.);}';
(function(){var c=$('canvas.bg');if(!c)return;var g=c.getContext('webgl',{antialias:false,powerPreference:'low-power'});if(!g)return;var p=prog(g,HERO);if(!p)return;
 var u={R:U(g,p,'R'),T:U(g,p,'T'),A:U(g,p,'A'),B:U(g,p,'B'),C:U(g,p,'C'),K:U(g,p,'K')};var A=rgb(cv('--bg')),B=rgb(cv('--ac')),C=rgb(cv('--c3'));
 var dpr=Math.min(devicePixelRatio||1,1.5)*.65,vis=true,t0=performance.now();new IntersectionObserver(function(e){vis=e[0].isIntersecting}).observe(c);
 function size(){var w=Math.max(2,Math.round(c.clientWidth*dpr)),h=Math.max(2,Math.round(c.clientHeight*dpr));if(c.width!==w||c.height!==h){c.width=w;c.height=h;g.viewport(0,0,w,h)}}
 function draw(now){size();g.uniform2f(u.R,c.width,c.height);g.uniform1f(u.T,(now-t0)/1000);g.uniform3fv(u.A,A);g.uniform3fv(u.B,B);g.uniform3fv(u.C,C);g.uniform1i(u.K,+c.dataset.k||0);g.drawArrays(g.TRIANGLES,0,3)}
 function loop(now){if(vis)draw(now);if(!reduce)requestAnimationFrame(loop)}draw(performance.now());requestAnimationFrame(loop)})();
/* --- texturas procedurales de alta resolución (hasta 4096 px) --- */
var TEXFS='precision highp float;uniform vec2 R;uniform float S;uniform vec3 A,B,C;uniform int K;'+NOISE+
'void main(){vec2 p=gl_FragCoord.xy/R.y*3.+S;float v;'+
'if(K==0){float w=fbm(p*1.1);float m=abs(sin((p.x*1.3+p.y*.7+w*5.5)*3.14159));v=smoothstep(0.,.95,pow(m,.32));v=mix(v,fbm(p*7.),.2);}'+
'else if(K==1){float r=length(vec2(p.x*.22,p.y))+fbm(p*vec2(.7,3.))*.9;v=fract(r*7.);v=smoothstep(.05,.95,v)*.62+fbm(p*vec2(.9,26.))*.38;}'+
'else if(K==2){v=.55+.3*fbm(p*9.)+.12*fbm(p*60.)-.1*pow(fbm(p*3.),2.);}'+
'else if(K==3){v=.5+.32*fbm(vec2(p.x*.4,p.y*140.))+.18*fbm(p*3.5)+.12*sin(p.y*18.+fbm(p)*6.);}'+
'else if(K==4){v=fbm(p*3.)*.55+fbm(p*15.)*.3+fbm(p*60.)*.15;v=pow(v,1.25);}'+
'else if(K==5){v=fbm(p*1.6+fbm(p*1.6+S));}'+
'else{vec2 g2=abs(fract(p*5.)-.5);float line=smoothstep(.47,.5,max(g2.x,g2.y));v=.25+.5*fbm(p*2.)+.4*line*fbm(p*9.);}'+
'vec3 col=mix(A,B,clamp(v,0.,1.));col=mix(col,C,smoothstep(.72,1.,v)*.4);col*=.9+.18*h(gl_FragCoord.xy);gl_FragColor=vec4(col,1.);}';
var HI=Math.min(screen.width,screen.height)*(devicePixelRatio||1)>=1000&&(navigator.deviceMemory||8)>=6;
var tg=document.createElement('canvas'),gl=null,tp=null,tu={};
function initTex(){if(gl)return gl;gl=tg.getContext('webgl',{preserveDrawingBuffer:true,antialias:false});if(!gl)return null;tp=prog(gl,TEXFS);if(!tp){gl=null;return null}['R','S','A','B','C','K'].forEach(function(k){tu[k]=U(gl,tp,k)});return gl}
var maxT=2048;(function(){var t=document.createElement('canvas').getContext('webgl');if(t)maxT=Math.min(4096,t.getParameter(t.MAX_RENDERBUFFER_SIZE)||2048)})();
function bake(c){if(c.dataset.done||!initTex())return;c.dataset.done=1;var big=c.dataset.p==='1'&&HI,size=Math.min(maxT,big?4096:HI?2048:1024);
 var p=[cv('--c3'),cv('--ac'),cv('--ac2')],k=+c.dataset.k||0,ci=+c.dataset.c||0,dark=rgb(cv('--bg')).map(function(x){return x*.9+.02}),col=[rgb(cv('--c3')),rgb(cv('--ac')),rgb(cv('--ac2'))],cc=col[ci];
 tg.width=tg.height=size;gl.viewport(0,0,size,size);gl.uniform2f(tu.R,size,size);gl.uniform1f(tu.S,Math.random()*40);gl.uniform3fv(tu.A,dark.map(function(x,i){return x*.55+cc[i]*.18}));gl.uniform3fv(tu.B,cc.map(function(x){return Math.min(1,x*1.15+.08)}));gl.uniform3fv(tu.C,rgb(cv('--ac2')));gl.uniform1i(tu.K,k);gl.drawArrays(gl.TRIANGLES,0,3);
 c.width=c.height=size;c.getContext('2d').drawImage(tg,0,0);c.dataset.res=size}
var io=new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting){bake(e.target);io.unobserve(e.target)}})},{rootMargin:'400px'});$$('canvas.tex').forEach(function(c){io.observe(c)});
/* grano fino sobre el hero (textura 4K cuando el aparato aguanta) */
(function(){var c=$('canvas.grain');if(!c||!initTex())return;var size=Math.min(maxT,HI?4096:1024);c.dataset.k=5;c.dataset.p=1;c.dataset.c=0;bake(c)})();
/* --- aparición al hacer scroll, contadores, barra de progreso, parallax, inclinación y luz del cursor --- */
var ro=new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting){e.target.classList.add('in');ro.unobserve(e.target)}})},{threshold:.12});$$('.rv').forEach(function(x){ro.observe(x)});
$$('[data-count]').forEach(function(el){var to=parseFloat(el.dataset.count);if(isNaN(to))return;var done=false;new IntersectionObserver(function(es,o){if(es[0].isIntersecting&&!done){done=true;var t0=performance.now();(function f(now){var k=Math.min(1,(now-t0)/1600),e=1-Math.pow(1-k,3);el.textContent=Math.round(to*e);if(k<1)requestAnimationFrame(f)})(t0);o.disconnect()}}).observe(el)});
var bar=$('.prog'),hin=$('.hero .in');function onScroll(){var y=scrollY,h=document.documentElement.scrollHeight-innerHeight;if(bar)bar.style.width=(h>0?y/h*100:0)+'%';if(hin&&!reduce&&y<innerHeight*1.2){hin.style.transform='translateY('+y*.22+'px)';hin.style.opacity=Math.max(0,1-y/(innerHeight*.9))}}addEventListener('scroll',onScroll,{passive:true});onScroll();
if(matchMedia('(hover:hover)').matches&&!reduce){$$('.tilt').forEach(function(el){el.addEventListener('mousemove',function(e){var r=el.getBoundingClientRect(),x=(e.clientX-r.left)/r.width-.5,y=(e.clientY-r.top)/r.height-.5;el.style.transform='perspective(900px) rotateY('+x*9+'deg) rotateX('+(-y*9)+'deg) translateZ(0)'});el.addEventListener('mouseleave',function(){el.style.transform=''})});
 var gw=$('.glow');addEventListener('pointermove',function(e){if(gw)gw.style.transform='translate('+e.clientX+'px,'+e.clientY+'px)'},{passive:true})}
})();`;

export function buildSite(spec) {
  const pr = PRESETS[spec.theme.preset] || PRESETS.ember, th = { ...pr, ...Object.fromEntries(Object.entries(spec.theme).filter(([k, v]) => ["bg", "sf", "tx", "mu", "ac", "ac2"].includes(k) && /^#[0-9a-f]{6}$/i.test(v))) }, f = FONTS[spec.theme.font] || FONTS.sans;
  const vars = `:root{--bg:${th.bg};--sf:${th.sf};--tx:${th.tx};--mu:${th.mu};--ac:${th.ac};--ac2:${th.ac2};--c3:${th.c3};--rad:22px;--disp:${f.disp};--body:${f.body};color-scheme:${th.dark ? "dark" : "light"}}`;
  const secs = spec.sections.map((s, i) => R[s.type](s, i)).join("\n");
  const nav = spec.sections.filter((s) => s.nav).slice(0, 4).map((s) => `<a href="#${slug(s, spec.sections.indexOf(s))}">${esc(s.nav)}</a>`).join("");
  const hr = spec.hero, stats = hr.stats?.length ? `<div class="hstats">${hr.stats.map((x) => `<div><b><span data-count="${esc(x.n)}">${esc(x.n)}</span>${esc(x.suffix)}</b><span>${esc(x.label)}</span></div>`).join("")}</div>` : "";
  const mq = spec.marquee.length >= 3 ? `<div class="mq" aria-hidden="true"><div>${[...spec.marquee, ...spec.marquee, ...spec.marquee, ...spec.marquee].map((w) => `<span>${esc(w)}</span>`).join("")}</div></div>` : "";
  return `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(spec.title)}</title><meta name="description" content="${esc(spec.tagline)}"><meta name="theme-color" content="${th.bg}">
<style>${vars}
${CSS}</style></head><body id="top">
<div class="prog"></div><div class="glow"></div>
<nav><b>${esc(spec.title)}</b>${nav}<a class="go" href="#contacto">${esc(hr.cta)}</a></nav>
<header class="hero"><canvas class="bg" data-k="${SHADER[spec.theme.shader] ?? 0}"></canvas><canvas class="grain" aria-hidden="true"></canvas>
<div class="in">${hr.kicker ? `<div class="kick">${esc(hr.kicker)}</div>` : ""}<h1>${esc(hr.headline)}</h1><p class="sub">${esc(hr.sub)}</p>
<div class="cta-row"><a class="btn pri big" href="#${spec.sections[0] ? "s0" : "contacto"}">${esc(hr.cta)}</a>${hr.cta2 ? `<a class="btn big" href="#contacto">${esc(hr.cta2)}</a>` : ""}</div>${stats}</div><div class="scroll" aria-hidden="true"></div></header>
${mq}
<main>
${secs}
</main>
<footer>${esc(spec.footer)}</footer>
<script>${JS}</script>
</body></html>`;
}
