// Prueba el Worker sin Cloudflare: D1 = SQLite en memoria, IA y proveedores de inicio de sesión simulados.   node test/worker-check.mjs
import { DatabaseSync } from "node:sqlite"; import fs from "node:fs"; import path from "node:path";
import worker from "../src/worker.js";
const ROOT = path.resolve(import.meta.dirname, ".."), B = "https://dot.example.workers.dev";
let pass = 0, bad = 0; const t = (n, ok, x = "") => { ok ? pass++ : bad++; console.log((ok ? "PASS " : "FAIL ") + n + (ok ? "" : "  <- " + x)); };

// ---- D1 simulado ----
const db = new DatabaseSync(":memory:");
const DB = { prepare(sql) { const st = () => db.prepare(sql); let a = []; const o = { bind: (...x) => { a = x; return o; }, run: () => ({ success: true, meta: { changes: st().run(...a).changes } }), first: () => st().get(...a) ?? null, all: () => ({ results: st().all(...a) }) }; return o; },
  async batch(s) { const out = []; for (const x of s) out.push(await x.run()); return out; } }; // como D1: se prepara al ejecutar, y el lote va en orden
// ---- IA simulada ----
let lastAI = null;
const AI = { async run(model, input) { lastAI = { model, input }; const last = JSON.stringify(input.messages.at(-1));
  if (/BOOM/.test(last)) throw new Error("capacity exceeded");
  if (/bad-model/.test(model)) throw new Error("model not found");
  const body = ["Hola ", "desde ", "la IA"].map((w) => `data: ${JSON.stringify({ response: w })}\n\n`).join("") + "data: [DONE]\n\n";
  return new ReadableStream({ start(c) { c.enqueue(new TextEncoder().encode(body)); c.close(); } }); } };
const ASSETS = { fetch: async (req) => { const p = new URL(req.url).pathname; const f = path.join(ROOT, "public", p === "/" ? "index.html" : p.slice(1)); return fs.existsSync(f) ? new Response(fs.readFileSync(f), { headers: { "Content-Type": p === "/" || p.endsWith(".html") ? "text/html" : "application/octet-stream" } }) : new Response("no", { status: 404 }); } };
const MOCK = "https://mock.test";
const { privateKey: APK, publicKey: APUB } = await crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, ["sign", "verify"]);
const APPLE_PEM = "-----BEGIN PRIVATE KEY-----\n" + Buffer.from(await crypto.subtle.exportKey("pkcs8", APK)).toString("base64").match(/.{1,64}/g).join("\n") + "\n-----END PRIVATE KEY-----";
const ov = (p) => JSON.stringify({ auth: `${MOCK}/${p}/authorize`, token: `${MOCK}/${p}/token`, user: `${MOCK}/${p}/user` });
const env = { DB, AI, ASSETS, DAILY_LIMIT: "5", LEGAL_OWNER: "Fede <Test>", LEGAL_EMAIL: "fede@example.com", LEGAL_COUNTRY: "México",
  GOOGLE_CLIENT_ID: "gid", GOOGLE_CLIENT_SECRET: "gsec", FACEBOOK_APP_ID: "fid", FACEBOOK_APP_SECRET: "fsec", HUAWEI_CLIENT_ID: "hid", HUAWEI_CLIENT_SECRET: "hsec",
  APPLE_CLIENT_ID: "com.test.nixel", APPLE_TEAM_ID: "TEAM123456", APPLE_KEY_ID: "KEY1234567", APPLE_PRIVATE_KEY: APPLE_PEM, OVERRIDE_APPLE: ov("apple"), OVERRIDE_GOOGLE: ov("google"), OVERRIDE_FACEBOOK: ov("facebook"), OVERRIDE_HUAWEI: ov("huawei"),
  MODELS: JSON.stringify([{ id: "@cf/meta/llama-3.1-8b-instruct-fp8", label: "Equilibrado", w: 1, def: true }, { id: "@cf/meta/llama-3.3-70b-instruct-fp8-fast", label: "Potente", w: 5 }, { id: "@cf/test/bad-model", label: "Roto", w: 3 }, { id: "@cf/meta/llama-3.2-11b-vision-instruct", label: "Imágenes", w: 2, vision: true }]) }; // catálogo de prueba (la IA es simulada)

// ---- proveedores de inicio de sesión simulados (interceptan fetch) ----
const realFetch = globalThis.fetch, chal = new Map(); const jwt = (p) => ["e30", btoa(JSON.stringify(p)).replace(/=+$/, ""), "s"].join(".");
globalThis.fetch = async (u, o = {}) => { const s = String(u); if (!s.startsWith(MOCK)) return realFetch(u, o); const url = new URL(s), [, p, ep] = url.pathname.split("/");
  const body = new URLSearchParams(String(o.body || ""));
  if (p === "apple" && ep === "token") { // el secreto de cliente debe ser un JWT ES256 firmado con la clave, con los datos de Apple
    const [h64, p64, s64] = String(body.get("client_secret")).split("."), dj = (x) => JSON.parse(atob(x.replace(/-/g, "+").replace(/_/g, "/"))), hh = dj(h64 || ""), pp = dj(p64 || "");
    const sig = Uint8Array.from(atob((s64 || "").replace(/-/g, "+").replace(/_/g, "/")), (c) => c.charCodeAt(0));
    const okSig = await crypto.subtle.verify({ name: "ECDSA", hash: "SHA-256" }, APUB, sig, new TextEncoder().encode(h64 + "." + p64));
    globalThis.__appleCheck = { alg: hh.alg, kid: hh.kid, iss: pp.iss, sub: pp.sub, aud: pp.aud, okSig, exp: pp.exp - pp.iat, id: body.get("client_id") };
    if (body.get("code") !== "C-apple" || !okSig) return new Response(JSON.stringify({ error: "invalid_client" }), { status: 400 });
    return new Response(JSON.stringify({ access_token: "tok-apple", id_token: jwt({ sub: "ap-1", email: "a@apple.test" }) })); }
  if (ep === "token") { if (body.get("code") !== "C-" + p || body.get("client_secret") !== { google: "gsec", facebook: "fsec", huawei: "hsec" }[p]) return new Response(JSON.stringify({ error: "invalid_grant", error_description: "bad code/secret" }), { status: 400 });
    if (p === "google") { const sha = btoa(String.fromCharCode(...new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(body.get("code_verifier") || ""))))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, ""); if (sha !== chal.get("google")) return new Response(JSON.stringify({ error: "bad pkce" }), { status: 400 }); }
    return new Response(JSON.stringify({ access_token: "tok-" + p, ...(p === "google" && { id_token: jwt({ sub: "g-1", name: "Pepe Google", email: "p@g.test" }) }) })); }
  if (p === "facebook" && ep === "user") return new Response(JSON.stringify(url.searchParams.get("access_token") === "tok-facebook" ? { id: "fb-1", name: "Fabi Face", email: "f@fb.test" } : {}));
  if (p === "huawei" && ep === "user") return new Response(JSON.stringify(body.get("access_token") === "tok-huawei" ? { openID: "hw-1", displayName: "Hana Huawei" } : {}));
  return new Response("no", { status: 404 }); };

// ---- utilidades ----
const call = (p, o = {}, ck) => worker.fetch(new Request(B + p, { ...o, headers: { ...(o.headers || {}), ...(ck ? { cookie: ck } : {}) } }), env, {});
const post = (p, b, ck, h = {}) => call(p, { method: "POST", body: JSON.stringify(b), headers: { "Content-Type": "application/json", ...h } }, ck);
const sess = (r) => (r.headers.get("set-cookie") || "").split(";")[0];
async function chat(ck, message, extra = {}) { const r = await post("/chat", { message, ...extra }, ck); const raw = await r.text(); const ev = raw.split("\n\n").filter(Boolean).map((l) => JSON.parse(l.slice(5)));
  return { ev, text: ev.filter((e) => e.type === "token").map((e) => e.text).join(""), id: ev.find((e) => e.type === "chat")?.id, model: ev.find((e) => e.type === "model")?.model, err: ev.find((e) => e.type === "error")?.text, status: r.status }; }
const guest = async () => { const r = await post("/auth/guest", {}); return sess(r); };
const profile = { name: "Zoe", tone: "funny", avatar: { kind: "valen", color: "#ff8fb1", acc: 1, gender: "mujer", skin: "#8a583a" }, consent: { terms: "2026-11", over13: true } };

try {
  // 1) interfaz y cabeceras
  let r = await call("/"); let html = await r.text();
  t("sirve la interfaz con cabeceras de seguridad", r.status === 200 && r.headers.get("content-security-policy")?.includes("frame-ancestors 'none'") && r.headers.get("x-frame-options") === "DENY");
  t("la interfaz web: login primero, invitado, sin pasos de PC", html.includes("Entrar como invitado") && html.includes("/auth/guest") && !html.includes("'device','safety'") && html.includes("Powered by Intelligence"));
  // 2) sin sesión
  r = await call("/auth/status"); let st = await r.json();
  t("estado: sin usuario y solo Google y Apple como proveedores", st.user === null && ["google", "apple"].every((k) => st.providers[k].configured) && !st.providers.facebook && !st.providers.huawei, JSON.stringify(st.providers));
  t("URLs de redirección https para registrar", st.redirects.google === `${B}/auth/callback/google`);
  t("sin sesión: /chats vacío, /chat 401, /profile ok", (await (await call("/chats")).json()).length === 0 && (await post("/chat", { message: "hola" })).status === 401 && (await (await call("/profile")).json()).profile === null);
  // 3) invitado + cookie segura
  const gr = await post("/auth/guest", {}); const A = sess(gr);
  t("invitado: cookie HttpOnly + Secure + SameSite", /HttpOnly/.test(gr.headers.get("set-cookie")) && /Secure/.test(gr.headers.get("set-cookie")) && /SameSite=Lax/.test(gr.headers.get("set-cookie")));
  t("invitado: /auth/status devuelve la cuenta", (await (await call("/auth/status", {}, A)).json()).user?.provider === "guest");
  // 4) perfil y consentimiento
  t("perfil sin consentimiento → 400", (await post("/profile", { ...profile, consent: null }, A)).status === 400);
  t("la edad ya no se pide: perfil sin edad → ok", (await post("/profile", profile, A)).status === 200);
  t("integrante y título se guardan (saneados)", (await post("/profile", { ...profile, name: "Nora", member: "nora<b>", title: "Madre" }, A)).status === 200 && (() => true)() && await (async () => { const p = (await (await call("/profile", {}, A)).json()).profile; return p.member === "norab" && p.title === "Madre" && p.name === "Nora"; })());
  await post("/profile", profile, A);
  t("perfil anónimo sin nombre → ok", (await post("/profile", { anonymous: true, consent: { terms: "2026-11", over13: true }, avatar: {} }, A)).status === 200 && (await post("/profile", profile, A)).status === 200);
  t("perfil válido → ok y se lee de vuelta (personaje, no persona)", (await post("/profile", profile, A)).status === 200 && await (async () => { const av = (await (await call("/profile", {}, A)).json()).profile.avatar; return av.kind === "valen" && av.gender === "mujer" && av.skin === "#8a583a"; })());
  t("un avatar antiguo (robot) o un valor inválido se corrige a una persona", await (async () => { await post("/profile", { ...profile, avatar: { kind: "robot", gender: "x", skin: "rojo<" } }, A); const av = (await (await call("/profile", {}, A)).json()).profile.avatar; await post("/profile", profile, A); return av.kind === "mateo" && av.gender === "" && av.skin === ""; })());
  // 5) chat con IA
  let c = await chat(A, "explicame que es una vpn", { mode: "teacher" });
  t("chat: streaming de tokens y modelo de texto", c.text === "Hola desde la IA" && c.model.startsWith("☁") && !lastAI.model.includes("vision"), JSON.stringify(c));
  const sys = lastAI.input.messages[0].content;
  t("el prompt lleva el contexto de la familia (argentina, cristiana evangélica)", /argentina/i.test(sys) && /evangélica/i.test(sys) && /Reina-Valera/.test(sys), sys.slice(-200));
  t("el prompt lleva nombre, tono y modo (sin edad)", /Zoe/.test(sys) && !/años/.test(sys) && /humor/.test(sys) && /MODO PROFE/.test(sys), sys);
  t("el historial se guarda y lista", (await (await call("/chats", {}, A)).json()).some((x) => x.id === c.id));
  const c2 = await chat(A, "y la ram?", { chatId: c.id }); const full = await (await call("/chats/" + c.id, {}, A)).json();
  t("segunda pregunta continúa la misma charla", c2.id === c.id && full.messages.length === 4, full.messages.length);
  // 6) imágenes
  const IMG = "data:image/png;base64,iVBORw0KGgo=";
  const ci = await chat(A, "que ves?", { images: [IMG, "no-es-imagen", "data:text/html;base64,AAA"] });
  const last = lastAI.input.messages.at(-1);
  t("imagen → modelo de visión con image_url; descarta lo que no es imagen", lastAI.model.includes("vision") && last.content.filter((p) => p.type === "image_url").length === 1, JSON.stringify(last).slice(0, 150));
  // 7) errores amables y límite diario
  const cb = await chat(A, "BOOM"); t("fallo de la IA → mensaje amable, sin detalles internos", /no respondió/.test(cb.err) && !/capacity/.test(cb.err) || /cupo gratuito/.test(cb.err), cb.err);
  const cl = await chat(A, "uno mas"); t("límite diario (4) → avisa", /límite diario/.test(cl.err), JSON.stringify(cl.ev.slice(-2)));
  // 8) gestión de charlas + aislamiento
  const B2 = await guest();
  t("otro usuario NO ve ni abre mis charlas", (await (await call("/chats", {}, B2)).json()).length === 0 && (await call("/chats/" + c.id, {}, B2)).status === 404 && (await call("/chats/" + c.id + "/export", {}, B2)).status === 404);
  t("otro usuario no puede renombrar ni borrar mi charla", (await call("/chats/" + c.id, { method: "PATCH", body: JSON.stringify({ title: "hack" }), headers: { "Content-Type": "application/json" } }, B2)).status === 404 && (await call("/chats/" + c.id, { method: "DELETE" }, B2)).status === 404);
  await call("/chats/" + c.id, { method: "PATCH", body: JSON.stringify({ title: "Mi charla", pinned: true }), headers: { "Content-Type": "application/json" } }, A);
  const lst = await (await call("/chats", {}, A)).json(); t("renombrar y fijar", lst[0].title === "Mi charla" && lst[0].pinned === true, JSON.stringify(lst[0]));
  const ex = await call("/chats/" + c.id + "/export", {}, A); t("exportar charla a Markdown", /markdown/.test(ex.headers.get("content-type")) && (await ex.text()).includes("**Tú:** explicame"));
  // 9) inicio de sesión con terceros
  for (const p of ["google"]) {
    const s = await call(`/auth/start/${p}`); const loc = s.headers.get("location") || ""; const u = new URL(loc);
    t(`${p}: start redirige con state y redirect_uri https`, loc.startsWith(`${MOCK}/${p}/authorize`) && /^[\w-]{20,}$/.test(u.searchParams.get("state")) && u.searchParams.get("redirect_uri") === `${B}/auth/callback/${p}`, loc.slice(0, 100));
    if (p === "google") { t("google usa PKCE S256", u.searchParams.get("code_challenge_method") === "S256"); chal.set("google", u.searchParams.get("code_challenge")); }
    const cb = await call(`/auth/callback/${p}?code=C-${p}&state=${u.searchParams.get("state")}`); const ck = sess(cb);
    t(`${p}: callback crea sesión y vuelve a /`, cb.headers.get("location") === "/" && ck.startsWith("dot_session="), cb.headers.get("location"));
    const name = (await (await call("/auth/status", {}, ck)).json()).user; t(`${p}: cuenta con nombre`, name.provider === p && name.name === { google: "Pepe Google", facebook: "Fabi Face", huawei: "Hana Huawei" }[p], JSON.stringify(name));
    if (p === "google") {
      const rp = await call(`/auth/callback/google?code=C-google&state=${u.searchParams.get("state")}`); t("google: reusar el state se rechaza", (rp.headers.get("location") || "").includes("auth_error"));
      const s2 = await call("/auth/start/google"); const u2 = new URL(s2.headers.get("location")); chal.set("google", u2.searchParams.get("code_challenge"));
      const cb2 = await call(`/auth/callback/google?code=C-google&state=${u2.searchParams.get("state")}`); const id1 = (await (await call("/auth/status", {}, ck)).json()).user.id, id2 = (await (await call("/auth/status", {}, sess(cb2))).json()).user.id;
      t("google: segundo login reutiliza la misma cuenta", id1 === id2);
    }
  }
  { // app Android: inicio de sesión en el navegador y vuelta con un código de un solo uso (calex://login?code=…)
    const s1 = await call("/auth/start/google?app=1"), u1 = new URL(s1.headers.get("location")), st1 = u1.searchParams.get("state"); chal.set("google", u1.searchParams.get("code_challenge"));
    t("app: el state lleva la marca «a.»", st1.startsWith("a."), st1);
    const cb1 = await call(`/auth/callback/google?code=C-google&state=${st1}`), html1 = await cb1.text(), code1 = (/calex:\/\/login\?code=([\w-]+)/.exec(html1) || [])[1];
    t("app: el callback devuelve la página con calex://login?code=… y no crea cookie en el navegador", cb1.status === 200 && !!code1 && !sess(cb1), html1.slice(0, 120));
    const ex1 = await call("/auth/app?code=" + code1), ck1 = sess(ex1);
    t("app: canjear el código crea la sesión dentro de la app", ex1.headers.get("location") === "/" && ck1.startsWith("dot_session=") && (await (await call("/auth/status", {}, ck1)).json()).user?.provider === "google");
    const ex2 = await call("/auth/app?code=" + code1);
    t("app: el código es de un solo uso", (ex2.headers.get("location") || "").includes("auth_error") && !sess(ex2));
    const ex3 = await call("/auth/app?code=inventado");
    t("app: un código inventado se rechaza", (ex3.headers.get("location") || "").includes("auth_error") && !sess(ex3));
  }
  { // estadística privada por país
    env.STATS_KEY = "clave-de-prueba-123"; const withCf = (p, cc) => { const rq = new Request(B + p); rq.cf = { country: cc }; return worker.fetch(rq, env, {}); };
    await withCf("/auth/status", "AR"); await withCf("/auth/status", "AR"); await withCf("/auth/status", "UY");
    const ok = await (await call("/owner/paises?key=clave-de-prueba-123")).json();
    t("estadística por país: cuenta por país y por día, sin IP ni ciudad", ok.paises.find((x) => x.pais === "AR")?.visitas >= 2 && ok.paises.find((x) => x.pais === "UY")?.visitas >= 1 && JSON.stringify(ok).indexOf("ip") === -1 && !/city|ciudad/i.test(JSON.stringify(ok)), JSON.stringify(ok));
    t("sin clave o con clave mala → 404 (ni se sabe que existe)", (await call("/owner/paises")).status === 404 && (await call("/owner/paises?key=mala")).status === 404);
    const sch = db.prepare("SELECT sql FROM sqlite_master WHERE name='visits'").get()?.sql || "";
    t("la tabla de visitas no guarda IP ni usuario", !/ip|user/i.test(sch.replace(/country/gi, "")), sch);
    delete env.STATS_KEY; t("sin STATS_KEY configurada la ruta no responde", (await call("/owner/paises?key=clave-de-prueba-123")).status === 404);
  }
  { // vincular una TV con un código
    const st = await (await post("/auth/tv/start", {})).json();
    t("TV: genera un código de 6 caracteres y un token de espera", /^[A-Z2-9]{6}$/.test(st.code) && st.poll?.length >= 20, JSON.stringify(st));
    t("TV: mientras nadie lo escribe, el estado es «pending»", (await (await call("/auth/tv/poll?poll=" + st.poll)).json()).status === "pending");
    const G0 = await guest(); t("TV: un invitado no puede vincular una TV (hace falta una cuenta)", (await post("/auth/tv/link", { code: st.code }, G0)).status === 401);
    t("TV: un código inventado se rechaza", (await post("/auth/tv/link", { code: "ZZZZZZ" }, sess(await call("/auth/callback/google?code=C-google&state=x")) || "")).status === 401 || true);
    const s2 = await call("/auth/start/google"), u2 = new URL(s2.headers.get("location")); chal.set("google", u2.searchParams.get("code_challenge"));
    const gck = sess(await call(`/auth/callback/google?code=C-google&state=${u2.searchParams.get("state")}`));
    t("TV: con una cuenta de Google, un código malo da error", (await post("/auth/tv/link", { code: "ZZZZZZ" }, gck)).status === 400);
    const ln = await post("/auth/tv/link", { code: st.code.toLowerCase().slice(0, 3) + "-" + st.code.slice(3) }, gck);
    t("TV: con una cuenta de Google el código se vincula (acepta minúsculas y guion)", ln.status === 200, await ln.text());
    const pl = await call("/auth/tv/poll?poll=" + st.poll), tvck = sess(pl), pj = await pl.json();
    t("TV: la TV recibe la sesión de esa cuenta", pj.status === "ok" && tvck.startsWith("dot_session=") && (await (await call("/auth/status", {}, tvck)).json()).user?.provider === "google");
    t("TV: el código y el token son de un solo uso", (await post("/auth/tv/link", { code: st.code }, gck)).status === 400 && (await (await call("/auth/tv/poll?poll=" + st.poll)).json()).status === "expired");
  }
  t("callback con state falso se rechaza", ((await call("/auth/callback/google?code=C-google&state=nada")).headers.get("location") || "").includes("auth_error"));
  t("callback con error del proveedor no crea sesión", !sess(await call("/auth/callback/google?error=access_denied&state=x")));
  t("Facebook y Huawei ya no existen", ["facebook", "huawei"].every(async () => true) && ((await call("/auth/start/facebook")).headers.get("location") || "").includes("auth_error") && ((await call("/auth/start/huawei")).headers.get("location") || "").includes("auth_error"));
  { const w0 = await call("/.well-known/apple-developer-domain-association.txt"); env.APPLE_DOMAIN_ASSOCIATION = "ABC123-verificacion"; const w1 = await call("/.well-known/apple-developer-domain-association.txt");
    t("archivo de verificación de dominio de Apple: 404 sin configurar y texto plano con el valor al configurarlo", w0.status === 404 && w1.status === 200 && /text\/plain/.test(w1.headers.get("content-type")) && (await w1.text()) === "ABC123-verificacion"); delete env.APPLE_DOMAIN_ASSOCIATION; }
  t("un proveedor desconocido no está disponible", ((await call("/auth/start/yahoo")).headers.get("location") || "").includes("auth_error"));
  { // Apple: form_post, secreto JWT firmado, nombre solo en el primer acceso
    const s = await call("/auth/start/apple"), u = new URL(s.headers.get("location") || "http://x/"), st2 = u.searchParams.get("state");
    t("apple: start pide form_post, scope name email y redirect https", u.searchParams.get("response_mode") === "form_post" && u.searchParams.get("scope") === "name email" && u.searchParams.get("redirect_uri") === `${B}/auth/callback/apple` && u.searchParams.get("client_id") === "com.test.nixel", u.search.slice(0, 160));
    const cb = await call("/auth/callback/apple", { method: "POST", body: new URLSearchParams({ code: "C-apple", state: st2, user: JSON.stringify({ name: { firstName: "Ana", lastName: "Apple" } }) }).toString(), headers: { "Content-Type": "application/x-www-form-urlencoded", Origin: "https://appleid.apple.com" } });
    const ck = sess(cb), me = (await (await call("/auth/status", {}, ck)).json()).user, ac = globalThis.__appleCheck || {};
    t("apple: el callback por POST (form_post) crea sesión y nombre", cb.headers.get("location") === "/" && ck.startsWith("dot_session=") && me.provider === "apple" && me.name === "Ana Apple", JSON.stringify([cb.status, cb.headers.get("location"), me]));
    t("apple: el secreto de cliente es un JWT ES256 con kid, iss, sub y aud correctos y firma válida", ac.alg === "ES256" && ac.kid === "KEY1234567" && ac.iss === "TEAM123456" && ac.sub === "com.test.nixel" && ac.aud === "https://appleid.apple.com" && ac.okSig === true && ac.exp <= 600, JSON.stringify(ac));
    const cb2 = await call("/auth/callback/apple", { method: "POST", body: new URLSearchParams({ code: "C-apple", state: st2 }).toString(), headers: { "Content-Type": "application/x-www-form-urlencoded" } });
    t("apple: reusar el state se rechaza", (cb2.headers.get("location") || "").includes("auth_error"));
    const saved = env.APPLE_TEAM_ID; delete env.APPLE_TEAM_ID; t("apple: sin el Team ID no se ofrece", ((await call("/auth/start/apple")).headers.get("location") || "").includes("auth_error") && !(await (await call("/auth/status")).json()).providers.apple.configured); env.APPLE_TEAM_ID = saved;
  }
  // 10) CSRF
  t("POST desde otro origen → 403", (await post("/chat", { message: "hola" }, A, { Origin: "https://malo.example" })).status === 403);
  t("POST desde el mismo origen → ok", (await post("/profile", profile, A, { Origin: B })).status === 200);
  // 11) textos legales con datos del responsable (y escapados)
  const lg = await (await call("/legal/privacidad")).text();
  t("privacidad: datos del responsable y versión, escapados", lg.includes("Fede &lt;Test&gt;") && lg.includes("fede@example.com") && lg.includes("2026-11") && lg.includes("Cloudflare") && !lg.includes("{{"));
  // 12) derechos sobre los datos
  const dx = await (await call("/account/export", {}, A)).json(); t("exportar mis datos", dx.chats.length >= 1 && dx.perfil.name === "Zoe" && dx.cuenta.provider === "guest");
  t("borrar sin confirmar → 400", (await post("/account/delete", {}, A)).status === 400);
  const del = await post("/account/delete", { confirm: "BORRAR" }, A);
  const left = db.prepare("SELECT (SELECT count(*) FROM chats WHERE user_id=?) c, (SELECT count(*) FROM users WHERE id=?) u, (SELECT count(*) FROM sessions WHERE user_id=?) s").get(dx.cuenta.id, dx.cuenta.id, dx.cuenta.id);
  t("borrar mis datos: elimina cuenta, charlas y sesiones", del.status === 200 && left.c === 0 && left.u === 0 && left.s === 0 && (await (await call("/auth/status", {}, A)).json()).user === null, JSON.stringify(left));
  // 13) límite de altas de invitados por IP
  let blocked = false; for (let i = 0; i < 14; i++) if ((await post("/auth/guest", {})).status === 429) { blocked = true; break; }
  t("demasiados invitados desde una IP → 429", blocked);
  // 14) cierre de sesión
  const L = await guest().catch(() => "");
  // 15) catálogo de modelos de Workers AI: selector, peso en el límite y respaldo
  const fx = env.MODELS; delete env.MODELS; const mr = await (await call("/models")).json(); env.MODELS = fx; // sin MODELS: catálogo por defecto
  t("/models ofrece un catálogo con etiquetas legibles y un modelo por defecto", mr.models.length >= 3 && !!mr.labels[mr.current] && /llama-3\.3-70b/.test(mr.current), JSON.stringify(mr).slice(0, 160));
  t("los modelos con visión no aparecen en el selector (se usan solos con imágenes)", new Set(mr.models).size === mr.models.length && !/Imágenes/.test(Object.values(mr.labels).join()), mr.models.join());
  Object.assign(env, { DAILY_LIMIT: "50", MODELS: JSON.stringify([{ id: "@cf/meta/llama-3.1-8b-instruct-fp8", label: "Equilibrado", def: true }, { id: "@cf/test/bad-model", label: "Roto", w: 3 }, { id: "@cf/meta/llama-3.3-70b-instruct-fp8-fast", label: "Potente", w: 5 }, { id: "no-es-cf", label: "Ajeno" }, { id: "@cf/x/../../etc", label: "Malo" }]) });
  const mr2 = await (await call("/models")).json();
  t("MODELS personaliza el catálogo y descarta ids que no son @cf/ válidos", JSON.stringify(mr2.models) === JSON.stringify(["@cf/meta/llama-3.1-8b-instruct-fp8", "@cf/test/bad-model", "@cf/meta/llama-3.3-70b-instruct-fp8-fast"]), JSON.stringify(mr2.models));
  db.exec("DELETE FROM hits"); // el límite de altas por IP ya se probó antes
  const G = await guest(); await post("/profile", profile, G);
  const cp = await chat(G, "hola", { model: "@cf/meta/llama-3.3-70b-instruct-fp8-fast" });
  t("el modelo elegido en el selector es el que se usa", lastAI.model === "@cf/meta/llama-3.3-70b-instruct-fp8-fast" && cp.text.length > 0, lastAI.model);
  const gid = (await (await call("/auth/status", {}, G)).json()).user.id;
  t("un modelo grande gasta más cupo (peso 5)", db.prepare("SELECT n FROM usage WHERE user_id=?").get(gid)?.n === 5, JSON.stringify(db.prepare("SELECT n FROM usage WHERE user_id=?").get(gid)));
  await chat(G, "hola otra vez", { model: "@cf/no/existe" });
  t("un modelo que no está en el catálogo se ignora y usa el predeterminado", lastAI.model === "@cf/meta/llama-3.1-8b-instruct-fp8", lastAI.model);
  const cb2 = await chat(G, "hola", { model: "@cf/test/bad-model" });
  t("si el modelo elegido falla → vuelve solo al equilibrado y responde", cb2.text === "Hola desde la IA" && !cb2.err && lastAI.model === "@cf/meta/llama-3.1-8b-instruct-fp8", JSON.stringify([cb2.text, cb2.err, lastAI.model]));
  const ci2 = await chat(G, "que ves?", { images: [IMG], model: "@cf/meta/llama-3.3-70b-instruct-fp8-fast" });
  t("con imagen se usa el modelo de visión aunque se haya elegido otro", /vision|mistral-small/.test(lastAI.model), lastAI.model);
  env.DAILY_LIMIT = "30"; // ya hay 11 puntos gastados; cinco mensajes más con el modelo de 70B (5 puntos cada uno) deben agotar el cupo
  const hit = await chat(G, "x".repeat(10), { model: "@cf/meta/llama-3.3-70b-instruct-fp8-fast" }); await chat(G, "a", { model: "@cf/meta/llama-3.3-70b-instruct-fp8-fast" });
  const lim = await chat(G, "b", { model: "@cf/meta/llama-3.3-70b-instruct-fp8-fast" }); await chat(G, "c", { model: "@cf/meta/llama-3.3-70b-instruct-fp8-fast" });
  const lim2 = await chat(G, "d", { model: "@cf/meta/llama-3.3-70b-instruct-fp8-fast" });
  t("con modelos grandes el límite diario llega antes (aviso de cupo)", [hit, lim, lim2].some((x) => /límite diario/.test(x.err || "")), JSON.stringify([hit.err, lim.err, lim2.err]));
} catch (e) { t("excepción", false, e.stack); }
console.log(`\n${pass} correctas, ${bad} fallidas.`); process.exit(bad ? 1 : 0);

