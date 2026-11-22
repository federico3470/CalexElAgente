// Calex Cloud · Cloudflare Worker (plan gratis): API + inicio de sesión (Google y Apple) + IA (Workers AI) + datos (D1).
// Mantiene la MISMA API que el Calex local, para reutilizar la misma interfaz.
import { LEGAL } from "./legal.js";
import { SCROLLY } from "./templates.js";
import * as CN from "./connectors.js";

const LEGAL_VERSION = "2026-11";
const enc = new TextEncoder();
const b64u = (u8) => btoa(String.fromCharCode(...new Uint8Array(u8))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const rnd = (n = 32) => b64u(crypto.getRandomValues(new Uint8Array(n)));
const sha = async (s) => [...new Uint8Array(await crypto.subtle.digest("SHA-256", enc.encode(s)))].map((b) => b.toString(16).padStart(2, "0")).join("");
const json = (v, code = 200, headers = {}) => new Response(JSON.stringify(v), { status: code, headers: { "Content-Type": "application/json; charset=utf-8", ...headers } });
const cookie = (req, k) => (req.headers.get("cookie") || "").split(/;\s*/).map((s) => s.split("=")).find(([n]) => n === k)?.[1];
const esc = (s, d = "") => String(s || d).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const SEC = { "X-Content-Type-Options": "nosniff", "Referrer-Policy": "same-origin", "X-Frame-Options": "DENY",
  "Content-Security-Policy": "default-src 'self'; img-src 'self' data: blob: https://i.scdn.co; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com; connect-src 'self' https://cdnjs.cloudflare.com https://api.github.com; worker-src 'self' blob:; media-src 'self' blob:; frame-ancestors 'none'" };

// ---------- base de datos (se crea sola la primera vez) ----------
const SCHEMA = [
  "CREATE TABLE IF NOT EXISTS users(id TEXT PRIMARY KEY, provider TEXT, sub TEXT, email TEXT, name TEXT, profile TEXT, facts TEXT, created INTEGER)",
  "CREATE UNIQUE INDEX IF NOT EXISTS u_ps ON users(provider, sub)",
  "CREATE TABLE IF NOT EXISTS sessions(h TEXT PRIMARY KEY, user_id TEXT, exp INTEGER)",
  "CREATE TABLE IF NOT EXISTS chats(id TEXT PRIMARY KEY, user_id TEXT, title TEXT, pinned INTEGER DEFAULT 0, updated INTEGER, messages TEXT)",
  "CREATE INDEX IF NOT EXISTS c_u ON chats(user_id, updated)",
  "CREATE TABLE IF NOT EXISTS oauth_states(state TEXT PRIMARY KEY, provider TEXT, verifier TEXT, exp INTEGER)",
  "CREATE TABLE IF NOT EXISTS usage(user_id TEXT, day TEXT, n INTEGER, PRIMARY KEY(user_id, day))",
  "CREATE TABLE IF NOT EXISTS hits(k TEXT, bucket INTEGER, n INTEGER, PRIMARY KEY(k, bucket))",
  "CREATE TABLE IF NOT EXISTS connections(user_id TEXT, id TEXT, data TEXT, updated INTEGER, PRIMARY KEY(user_id, id))", // conectores vinculados (tokens cifrados)
  "CREATE TABLE IF NOT EXISTS visits(day TEXT, country TEXT, n INTEGER, PRIMARY KEY(day, country))", // recuento de visitas por día y país: sin IP, sin ciudad y sin relación con ninguna cuenta
];
let ready = false;
const init = async (env) => { if (ready) return; await env.DB.batch(SCHEMA.map((s) => env.DB.prepare(s))); ready = true; };
const q = (env, sql, ...a) => env.DB.prepare(sql).bind(...a);
// límite por clave y ventana de tiempo (protege el plan gratis)
async function hit(env, k, limit, windowSec) { const bucket = Math.floor(Date.now() / 1000 / windowSec);
  await q(env, "INSERT INTO hits(k,bucket,n) VALUES(?,?,1) ON CONFLICT(k,bucket) DO UPDATE SET n=n+1", k, bucket).run();
  const r = await q(env, "SELECT n FROM hits WHERE k=? AND bucket=?", k, bucket).first(); return (r?.n || 1) <= limit; }

// ---------- conectores (Gmail, Spotify…): los tokens se guardan cifrados con una clave derivada de STATS_KEY ----------
async function connCtx(env, user, req) {
  const secret = String(env.STATS_KEY || ""); if (secret.length < 8) return null;
  const vault = await CN.makeVault(secret);
  const store = { async all(uid) { const o = {}; for (const r of (await q(env, "SELECT id,data FROM connections WHERE user_id=?", uid).all()).results) { try { o[r.id] = await vault.open(r.data); } catch {} } return o; },
    async put(uid, id, obj) { await q(env, "INSERT INTO connections(user_id,id,data,updated) VALUES(?,?,?,?) ON CONFLICT(user_id,id) DO UPDATE SET data=excluded.data, updated=excluded.updated", uid, id, await vault.seal(obj), Date.now()).run(); },
    async del(uid, id) { await q(env, "DELETE FROM connections WHERE user_id=? AND id=?", uid, id).run(); },
    async putState(k, o, ttl) { await q(env, "DELETE FROM oauth_states WHERE exp<?", Date.now()).run(); await q(env, "INSERT INTO oauth_states(state,provider,verifier,exp) VALUES(?,?,?,?)", "cn." + k, "conn", JSON.stringify(o), Date.now() + ttl).run(); },
    async takeState(k) { const r = await q(env, "SELECT * FROM oauth_states WHERE state=? AND provider='conn'", "cn." + k).first(); await q(env, "DELETE FROM oauth_states WHERE state=?", "cn." + k).run(); return r && r.exp > Date.now() ? JSON.parse(r.verifier) : null; } };
  return { env, uid: user?.id || null, store, base: baseUrl(req, env), limit: (k, n, s) => hit(env, k, n, s) };
}

// ---------- perfil, modos, tonos ----------
const TONES = { friendly: ["Amigable", "Tono cercano, cálido y natural."], formal: ["Formal", "Tono formal y profesional, trato respetuoso, sin bromas."],
  funny: ["Divertido", "Tono divertido: humor ligero y alguna broma corta, sin pasarte ni alargar la respuesta."], direct: ["Directo", "Tono muy directo y escueto: solo lo esencial."] };
const MODES = { general: ["✨", "General", ""], translator: ["🌐", "Traductor", "MODO TRADUCTOR: traduce lo que te escriba al idioma que pida (si no dice cuál: español↔inglés). Devuelve solo la traducción."],
  coder: ["💻", "Programador", "MODO PROGRAMADOR: ayuda a programar con código claro y explica lo esencial en pocas líneas. Si te piden una página web, una animación o un juego, entrega UN SOLO archivo HTML completo y autónomo dentro de UN ÚNICO bloque ```html (con el CSS en <style> y el JavaScript en <script> dentro del mismo archivo), que funcione al abrirlo sin descargar nada. No dividas el código en varios bloques ni dejes partes por completar. No uses imágenes externas ni enlaces a fotos: no puedes generar imágenes 4K; para texturas, fondos y efectos usa CSS (degradados), SVG (feTurbulence) o canvas, y dilo en una frase. El código debe ser COMPLETO y ELABORADO (varias secciones, animaciones y detalles, de 150 a 400 líneas), nunca un esqueleto ni un ejemplo mínimo: aquí NO se te pide ser breve con el código. Para «scrollytelling»: secciones de 100vh, position:sticky y un IntersectionObserver que anime cada sección al entrar; fondo de estrellas con <canvas> y Math.random, nebulosas con radial-gradient y texturas con SVG feTurbulence. Si piden una página muy pesada, de muchos MB o GB, o con texturas 4K u 8K: el peso y la belleza se consiguen generando las texturas en el navegador (canvas de 2048 a 4096 px con ruido fractal, WebGL con shaders, SVG con filtros) y con muchas secciones; el archivo sigue siendo texto y no puedes crear gigabytes de datos. Si el código no cabe en una respuesta, termínala en un punto limpio; cuando te digan «continúa», sigue desde la siguiente línea en un nuevo bloque ```html, sin repetir nada. Después del bloque, máximo tres líneas de explicación."], teacher: ["🎓", "Profe", "MODO PROFE: explica paso a paso con ejemplos sencillos y comprueba que se entiende."],
  summary: ["📝", "Resumen", "MODO RESUMEN: resume lo que te den en puntos claros y breves."], writer: ["✍️", "Escritor", "MODO ESCRITOR: ayuda a redactar y mejorar textos con buen estilo."],
  chef: ["🍳", "Cocina", "MODO COCINA: propón recetas y menús con lo que el usuario tenga, con pasos cortos."], coach: ["💪", "Coach", "MODO COACH: motiva con empatía y ayuda a fijar metas pequeñas y concretas."] };
const AVK = ["mateo", "lucas", "tomas", "raul", "sofia", "valen", "camila", "nora"];
const hex = (v, d) => (/^#[0-9a-f]{6}$/i.test(v) ? v : d);
const ageGuide = (a) => a < 13 ? "Usa palabras muy simples y un tono amable, explica paso a paso y mantén todo apto para niños." : a < 18 ? "Usa un lenguaje cercano y claro para un adolescente y mantén el contenido apto para menores." : a >= 65 ? "Sé paciente y claro, evita la jerga técnica." : "Trátalo como a un adulto.";
function cleanProfile(b, old) {
  const age = !b.anonymous && Number.isInteger(+b.age) && +b.age >= 5 && +b.age <= 120 ? +b.age : null;
  return { anonymous: !!b.anonymous, name: b.anonymous ? "" : String(b.name || "").trim().slice(0, 30), member: String(b.member || "").replace(/[^\w-]/g, "").slice(0, 20), title: String(b.title || "").trim().slice(0, 40), age, device: { os: "", brand: "" },
    tone: TONES[b.tone] || b.tone === "custom" ? b.tone : "friendly", customTone: String(b.customTone || "").slice(0, 200),
    avatar: { kind: AVK.includes(b.avatar?.kind) ? b.avatar.kind : "mateo", color: hex(b.avatar?.color || b.avatar?.shirt, "#4fc3f7"), acc: Number.isInteger(b.avatar?.acc) && b.avatar.acc >= 0 && b.avatar.acc <= 4 ? b.avatar.acc : 0, gender: ["hombre", "mujer"].includes(b.avatar?.gender) ? b.avatar.gender : "", skin: /^#[0-9a-f]{6}$/i.test(b.avatar?.skin || "") ? b.avatar.skin : "" },
    consent: b.consent?.terms ? { terms: String(b.consent.terms).slice(0, 20), ts: Date.now(), over13: !!b.consent.over13, guardian: !!b.consent.guardian } : old?.consent || null, created: old?.created || Date.now() };
}
// Lo que Calex sabe de la familia (se aplica a todas las charlas, salvo al traducir)
const FAMILY = " Contexto de la familia: es argentina y cristiana evangélica. Usa un español rioplatense natural, sin forzar la jerga: «celular», «computadora», «colectivo», «auto»; precios en pesos argentinos (ARS), horario de Argentina (UTC−3), fechas día/mes/año, sistema métrico y feriados argentinos. Respeta su fe: no te burles de ella ni la cuestiones, y no prediques ni la menciones si no viene al caso; en temas de ciencia o de hechos sigue siendo honesto y preciso. Si preguntan por la Biblia, cita con fidelidad (versión Reina-Valera 1960, salvo que pidan otra) y distingue lo que dice el texto de lo que es interpretación. Mantén un lenguaje sano, sin vulgaridades.";
const persona = (p) => { if (!p) return ""; const tone = p.tone === "custom" ? p.customTone : (TONES[p.tone] || TONES.friendly)[1];
  if (p.anonymous) return `El usuario eligió ser ANÓNIMO: no le pidas ni uses su nombre, edad ni datos personales. Adapta tu nivel y vocabulario a cómo escribe. ${tone}`;
  return `${p.name ? `El usuario se llama ${p.name}${p.title ? ` (${p.title})` : ""}: llámalo por su nombre con naturalidad, sin repetirlo en cada frase. ` : ""}${p.age ? `Tiene ${p.age} años: ${ageGuide(p.age)} ` : ""}${tone}`; };

// ---------- sesiones ----------
const publicUser = (u) => u && { id: u.id, name: u.name || "", email: u.email || "", provider: u.provider };
async function newSession(env, userId) { const t = rnd(); await q(env, "INSERT INTO sessions(h,user_id,exp) VALUES(?,?,?)", await sha(t), userId, Date.now() + 30 * 864e5).run();
  return `dot_session=${t}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${30 * 86400}`; }
async function getUser(req, env) { const t = cookie(req, "dot_session"); if (!t) return null;
  return await q(env, "SELECT u.* FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.h=? AND s.exp>?", await sha(t), Date.now()).first(); }

// ---------- inicio de sesión con terceros ----------
const PROV = {
  google: { label: "Google", idv: "GOOGLE_CLIENT_ID", secv: "GOOGLE_CLIENT_SECRET", auth: "https://accounts.google.com/o/oauth2/v2/auth", token: "https://oauth2.googleapis.com/token", user: "https://openidconnect.googleapis.com/v1/userinfo", scope: "openid email profile", pkce: true, map: (j) => ({ sub: j.sub, name: j.name, email: j.email }) },
  apple: { label: "Apple", idv: "APPLE_CLIENT_ID", secv: "APPLE_PRIVATE_KEY", extra: ["APPLE_TEAM_ID", "APPLE_KEY_ID"], auth: "https://appleid.apple.com/auth/authorize", token: "https://appleid.apple.com/auth/token", scope: "name email", formPost: true, apple: true, map: () => ({}) },
};
const provCfg = (p, env) => ({ ...PROV[p], ...(env["OVERRIDE_" + p.toUpperCase()] ? JSON.parse(env["OVERRIDE_" + p.toUpperCase()]) : {}) });
const provReady = (p, env) => !!(env[PROV[p].idv] && env[PROV[p].secv] && (PROV[p].extra || []).every((k) => env[k]));
// Apple exige que el «secreto de cliente» sea un JWT firmado (ES256) con tu clave .p8; se genera en cada intercambio y caduca en 10 minutos
async function appleSecret(env) {
  const der = Uint8Array.from(atob(String(env.APPLE_PRIVATE_KEY).replace(/\\n/g, "\n").replace(/-----[^-]+-----|\s/g, "")), (c) => c.charCodeAt(0));
  const key = await crypto.subtle.importKey("pkcs8", der, { name: "ECDSA", namedCurve: "P-256" }, false, ["sign"]), now = Math.floor(Date.now() / 1000);
  const h = b64u(enc.encode(JSON.stringify({ alg: "ES256", kid: env.APPLE_KEY_ID, typ: "JWT" }))), pl = b64u(enc.encode(JSON.stringify({ iss: env.APPLE_TEAM_ID, iat: now, exp: now + 600, aud: "https://appleid.apple.com", sub: env.APPLE_CLIENT_ID })));
  return h + "." + pl + "." + b64u(await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, key, enc.encode(h + "." + pl)));
}
const baseUrl = (req, env) => (env.PUBLIC_URL || new URL(req.url).origin).replace(/\/$/, "");
const jwtPayload = (t) => { try { return JSON.parse(atob(t.split(".")[1].replace(/-/g, "+").replace(/_/g, "/"))); } catch { return {}; } };
const redirect = (loc, headers = {}) => new Response(null, { status: 302, headers: { Location: loc, ...headers } });

async function authRoutes(req, env, url, user) {
  const P = url.pathname;
  if (req.method === "GET" && P === "/auth/status")
    return json({ user: publicUser(user), providers: Object.fromEntries(Object.entries(PROV).map(([k, v]) => [k, { label: v.label, configured: provReady(k, env) }])),
      redirects: Object.fromEntries(Object.keys(PROV).map((k) => [k, `${baseUrl(req, env)}/auth/callback/${k}`])) });
  if (req.method === "POST" && P === "/auth/guest") { // entrar como invitado (cuenta anónima en este navegador)
    if (!(await hit(env, "guest:" + (req.headers.get("cf-connecting-ip") || "x"), 10, 3600))) return json({ error: "Demasiados intentos, espera un rato" }, 429);
    const id = crypto.randomUUID(); await q(env, "INSERT INTO users(id,provider,sub,email,name,profile,facts,created) VALUES(?,?,?,?,?,?,?,?)", id, "guest", rnd(12), "", "", null, "[]", Date.now()).run();
    return json({ user: { id, provider: "guest", name: "", email: "" } }, 200, { "Set-Cookie": await newSession(env, id) });
  }
  // --- vincular una TV: la TV muestra un código de 6 letras; en el celu (con Google iniciado) se escribe y la TV entra con esa cuenta ---
  if (req.method === "POST" && P === "/auth/tv/start") {
    if (!(await hit(env, "tvstart:" + (req.headers.get("cf-connecting-ip") || "x"), 20, 3600))) return json({ error: "Demasiados intentos, espera un rato" }, 429);
    const al = "ABCDEFGHJKMNPQRSTUVWXYZ23456789", rb = crypto.getRandomValues(new Uint8Array(6)), code = [...rb].map((n) => al[n % al.length]).join(""), poll = rnd(24);
    await q(env, "DELETE FROM oauth_states WHERE exp<?", Date.now()).run();
    await q(env, "INSERT INTO oauth_states(state,provider,verifier,exp) VALUES(?,?,?,?)", "tv." + code, "tvcode", poll, Date.now() + 600000).run();
    return json({ code, poll, expires: 600 });
  }
  if (req.method === "GET" && P === "/auth/tv/poll") {
    const poll = url.searchParams.get("poll") || "", ok = await q(env, "SELECT * FROM oauth_states WHERE state=? AND provider='tvok'", "tvok." + poll).first();
    if (!ok || ok.exp < Date.now()) { const alive = await q(env, "SELECT 1 x FROM oauth_states WHERE provider='tvcode' AND verifier=? AND exp>?", poll, Date.now()).first(); return json({ status: alive ? "pending" : "expired" }); }
    await q(env, "DELETE FROM oauth_states WHERE state=?", "tvok." + poll).run();
    return json({ status: "ok" }, 200, { "Set-Cookie": await newSession(env, ok.verifier) });
  }
  if (req.method === "POST" && P === "/auth/tv/link") {
    if (!user || user.provider === "guest") return json({ error: "Inicia sesión con Google para vincular la TV" }, 401);
    if (!(await hit(env, "tvlink:" + user.id, 10, 600))) return json({ error: "Demasiados intentos, espera un rato" }, 429);
    const b = await req.json().catch(() => ({})), code = String(b.code || "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8);
    const row = await q(env, "SELECT * FROM oauth_states WHERE state=? AND provider='tvcode'", "tv." + code).first();
    if (!row || row.exp < Date.now()) return json({ error: "Código no válido o caducado" }, 400);
    await q(env, "DELETE FROM oauth_states WHERE state=?", "tv." + code).run();
    await q(env, "INSERT INTO oauth_states(state,provider,verifier,exp) VALUES(?,?,?,?)", "tvok." + row.verifier, "tvok", user.id, Date.now() + 120000).run();
    return json({ ok: true });
  }
  if (req.method === "POST" && P === "/auth/logout") { const t = cookie(req, "dot_session"); if (t) await q(env, "DELETE FROM sessions WHERE h=?", await sha(t)).run();
    return json("ok", 200, { "Set-Cookie": "dot_session=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0" }); }
  let m = /^\/auth\/start\/(\w+)$/.exec(P);
  if (m && req.method === "GET") {
    const p = m[1]; if (!PROV[p] || !provReady(p, env)) return redirect("/?auth_error=" + encodeURIComponent("Ese inicio de sesión aún no está disponible"));
    const o = provCfg(p, env), state = (url.searchParams.get("app") === "1" ? "a." : "") + rnd(16); // «a.» = viene de la app: al terminar se vuelve a ella
    const qs = new URLSearchParams({ client_id: env[o.idv], redirect_uri: `${baseUrl(req, env)}/auth/callback/${p}`, response_type: "code", scope: o.scope, state });
    if (o.formPost) qs.set("response_mode", "form_post");
    let verifier = null; if (o.pkce) { verifier = rnd(32); qs.set("code_challenge", b64u(await crypto.subtle.digest("SHA-256", enc.encode(verifier)))); qs.set("code_challenge_method", "S256"); }
    await q(env, "DELETE FROM oauth_states WHERE exp<?", Date.now()).run();
    await q(env, "INSERT INTO oauth_states(state,provider,verifier,exp) VALUES(?,?,?,?)", state, p, verifier, Date.now() + 600000).run();
    return redirect(o.auth + "?" + qs);
  }
  if (req.method === "GET" && P === "/auth/app") { // la app canjea el código por una sesión dentro de su WebView
    const code = url.searchParams.get("code") || "", row = await q(env, "SELECT * FROM oauth_states WHERE state=? AND provider='appcode'", "c." + code).first(); await q(env, "DELETE FROM oauth_states WHERE state=?", "c." + code).run();
    if (!row || row.exp < Date.now()) return redirect("/?auth_error=" + encodeURIComponent("El inicio de sesión caducó. Inténtalo de nuevo."));
    return redirect("/", { "Set-Cookie": await newSession(env, row.verifier) });
  }
  m = /^\/auth\/callback\/(\w+)$/.exec(P);
  if (m && (req.method === "GET" || req.method === "POST")) {
    const p = m[1], params = req.method === "POST" ? new URLSearchParams(await req.text()) : url.searchParams, fail = (msg) => redirect("/?auth_error=" + encodeURIComponent(msg));
    const st = await q(env, "SELECT * FROM oauth_states WHERE state=?", params.get("state") || "").first(); await q(env, "DELETE FROM oauth_states WHERE state=?", params.get("state") || "").run();
    if (!PROV[p] || !st || st.provider !== p || st.exp < Date.now()) return fail("El inicio de sesión caducó. Inténtalo de nuevo.");
    if (params.get("error")) return fail(`Se canceló el inicio de sesión (${params.get("error")})`);
    try {
      const o = provCfg(p, env);
      const tr = await fetch(o.token, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
        body: new URLSearchParams({ grant_type: "authorization_code", code: params.get("code") || "", redirect_uri: `${baseUrl(req, env)}/auth/callback/${p}`, client_id: env[o.idv], client_secret: o.apple ? await appleSecret(env) : env[o.secv], ...(st.verifier && { code_verifier: st.verifier }) }) });
      const tok = await tr.json();
      if (!tr.ok || tok.error || !(tok.access_token || tok.id_token)) throw new Error(tok.error_description || tok.error || "el proveedor rechazó el código");
      let info = {}; if (tok.id_token) { const c = jwtPayload(tok.id_token); info = { sub: c.sub, name: c.name, email: c.email }; }
      if (p === "apple") { try { const u = JSON.parse(params.get("user") || "{}"), nm = [u.name?.firstName, u.name?.lastName].filter(Boolean).join(" "); if (nm) info.name = nm; } catch {} } // Apple solo envía el nombre la primera vez
      if (!info.sub && o.user) {
        const ur = o.userPost ? await fetch(o.user, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ access_token: tok.access_token, getNickName: "1" }) })
          : o.userQuery ? await fetch(o.user + (o.user.includes("?") ? "&" : "?") + "access_token=" + encodeURIComponent(tok.access_token)) : await fetch(o.user, { headers: { Authorization: "Bearer " + tok.access_token } });
        info = o.map(await ur.json());
      }
      if (!info.sub) throw new Error("el proveedor no devolvió tu identificador");
      let u = await q(env, "SELECT * FROM users WHERE provider=? AND sub=?", p, String(info.sub)).first();
      if (!u) { const id = crypto.randomUUID(); await q(env, "INSERT INTO users(id,provider,sub,email,name,profile,facts,created) VALUES(?,?,?,?,?,?,?,?)", id, p, String(info.sub), info.email || "", String(info.name || "").slice(0, 30), null, "[]", Date.now()).run(); u = { id }; }
      if (String(params.get("state") || "").startsWith("a.")) { // app Android: se entrega un código de un solo uso por el esquema calex://
        const code = rnd(24); await q(env, "INSERT INTO oauth_states(state,provider,verifier,exp) VALUES(?,?,?,?)", "c." + code, "appcode", u.id, Date.now() + 120000).run();
        return new Response(`<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Volver a Calex</title><body style="font:18px system-ui;background:#15140f;color:#ece7db;display:grid;place-items:center;height:100vh;margin:0;text-align:center"><div><p>Listo. Vuelve a Calex.</p><p><a href="calex://login?code=${code}" style="color:#15140f;background:#d4a35f;padding:12px 22px;border-radius:999px;text-decoration:none">Abrir Calex</a></p></div><script>location.href="calex://login?code=${code}"</script>`, { headers: { "Content-Type": "text/html; charset=utf-8", ...SEC } });
      }
      return redirect("/", { "Set-Cookie": await newSession(env, u.id) });
    } catch (e) { return fail(`No se pudo iniciar sesión con ${PROV[p].label}: ${e.message}`); }
  }
  return json({}, 404);
}

// ---------- chat con IA (Workers AI) ----------
// Modelos de Workers AI que se ofrecen (se pueden cambiar con la variable MODELS, una lista JSON; los nombres cambian con el tiempo: confírmalos en el panel de Cloudflare).
// w = peso en el límite diario: los modelos grandes gastan más cupo.
const DEFAULT_MODELS = [
  // Probados en Cloudflare real el 20/11/2026 (varios modelos se retiraron ese día: Llama 3.1 8B, Qwen3 30B, Nemotron, Kimi).
  { id: "@cf/meta/llama-3.2-3b-instruct", label: "Rápido · Llama 3.2 · 3B", w: 1 },
  { id: "@cf/mistralai/mistral-small-3.1-24b-instruct", label: "Equilibrado · Mistral Small · 24B", w: 2 },
  { id: "@cf/meta/llama-3.3-70b-instruct-fp8-fast", label: "Potente · Llama 3.3 · 70B", w: 3, def: true },
  { id: "@cf/mistralai/mistral-small-3.1-24b-instruct", label: "Imágenes · Mistral Small · 24B", w: 2, vision: true },
];
const catalog = (env) => { try { const m = env.MODELS ? JSON.parse(env.MODELS) : null; if (Array.isArray(m) && m.length) return m.filter((x) => x && /^@cf\/[\w-]+\/[\w.-]+$/.test(String(x.id)) && !String(x.id).includes("..")).slice(0, 12).map((x) => ({ id: x.id, label: String(x.label || x.id.split("/").pop()).slice(0, 60), w: Math.max(1, Math.min(10, +x.w || 1)), def: !!x.def, vision: !!x.vision })); } catch {} return DEFAULT_MODELS; };
const pickModels = (env) => { const cat = catalog(env), text = cat.filter((m) => !m.vision), def = env.CHAT_MODEL ? { id: env.CHAT_MODEL, w: 1 } : text.find((m) => m.def) || text[0], vis = cat.find((m) => m.vision) || { id: env.VISION_MODEL || "@cf/mistralai/mistral-small-3.1-24b-instruct", w: 2 }; return { cat, text, def, vis }; };
const sse = (o) => enc.encode(`data: ${JSON.stringify(o)}\n\n`);
async function chatRoute(req, env, user) {
  const b = await req.json().catch(() => ({})), message = String(b.message || "").trim().slice(0, 4000);
  if (!message) return json({ error: "Mensaje vacío" }, 400);
  const day = new Date().toISOString().slice(0, 10), limit = +env.DAILY_LIMIT || 80;
  const PM = pickModels(env), picked = PM.text.find((m) => m.id === b.model) || PM.def; // el modelo elegido en el selector (solo los del catálogo)
  const hasImg = Array.isArray(b.images) && b.images.some((x) => typeof x === "string" && /^data:image\//.test(x)), chosen = hasImg ? PM.vis : picked, weight = chosen.w || 1;
  await q(env, "INSERT INTO usage(user_id,day,n) VALUES(?,?,?) ON CONFLICT(user_id,day) DO UPDATE SET n=n+?", user.id, day, weight, weight).run();
  const used = (await q(env, "SELECT n FROM usage WHERE user_id=? AND day=?", user.id, day).first())?.n || 1;
  const profile = user.profile ? JSON.parse(user.profile) : null;
  let chat = b.chatId ? await q(env, "SELECT * FROM chats WHERE id=? AND user_id=?", String(b.chatId), user.id).first() : null;
  const id = chat?.id || crypto.randomUUID(), msgs = chat ? JSON.parse(chat.messages) : [], title = chat?.title || message.slice(0, 44);
  const images = (Array.isArray(b.images) ? b.images : []).slice(0, 3).map(String).filter((s) => s.length < 1.6e6 && /^data:image\//.test(s));
  const docs = (Array.isArray(b.docs) ? b.docs : []).slice(0, 3).map((d) => ({ name: String(d?.name || "documento").replace(/[\r\n]/g, " ").slice(0, 80), text: String(d?.text || "").slice(0, 14000) })).filter((d) => d.text.trim());
  msgs.push({ role: "user", content: message, ...(docs.length && { docs: docs.map((d) => ({ name: d.name, text: d.text.slice(0, 9000) })) }) });
  const model = images.length ? PM.vis.id : picked.id;
  const cids = (await q(env, "SELECT id FROM connections WHERE user_id=?", user.id).all()).results.map((r) => r.id);
  const sys = `Eres Calex, un asistente personal. Responde SIEMPRE en el idioma del usuario (normalmente español), breve y directo, sin relleno. Estilo: registro formal y profesional, claro y sobrio; sin emojis, sin exclamaciones y sin muletillas de asistente; no menciones que eres una IA salvo que te lo pregunten. No tienes acceso al dispositivo del usuario: si te pide abrir, instalar o hacer algo en su equipo, di en una frase que no puedes hacerlo tú y entrega de inmediato los pasos numerados y cortos para que los haga él, sin preguntarle si los quiere. ${persona(profile)}${b.mode === "translator" ? "" : FAMILY}${MODES[b.mode]?.[2] ? " " + MODES[b.mode][2] : ""}${b.mode === "coder" && /scroll|historia visual|universo|animad|p[aá]gina|web\b|landing|sitio/i.test(message) ? "\n\nPLANTILLA PROBADA (funciona): adáptala al tema pedido cambiando título, textos, colores y número de secciones, y respeta su estructura; entrégala completa en UN solo bloque ```html:\n```html\n" + SCROLLY + "\n```" : ""}${b.mode === "coder" && /\bgb\b|giga|mega|enorme|gigante|pesad|muy grande|hiperreal|\b[48]k\b/i.test(message) ? " PÁGINA GRANDE: el usuario quiere algo enorme y espectacular. Escribe como mínimo 8 secciones, un fondo con WebGL (fragment shader con ruido fractal fbm), texturas procedurales de 2048 px en canvas, parallax, partículas y animaciones al hacer scroll. Usa todo el espacio de respuesta que necesites (más de 6000 tokens) y no preguntes si quieres que continúe: escribe la página completa." : ""}${CN.promptFor(cids, { music: b.music === true })}${b.live ? " Estás en una conversación por voz: responde en 1 o 2 frases cortas, sin markdown ni emojis." : ""}`.trim();
  const hist = msgs.filter((m) => m.content).slice(-20).map((m) => ({ role: m.role, content: m.docs?.length ? m.docs.map((d) => `[Documento adjunto: ${d.name}]\n${d.text}`).join("\n\n") + "\n\n" + m.content : m.content }));
  if (images.length) hist[hist.length - 1].content = [{ type: "text", text: message }, ...images.map((u) => ({ type: "image_url", image_url: { url: u } }))];
  const stream = new ReadableStream({ async start(ctrl) {
    const send = (o) => ctrl.enqueue(sse(o)); let text = "";
    send({ type: "chat", id }); send({ type: "model", model: "☁ " + model.split("/").pop() });
    try {
      if (used > limit) throw Object.assign(new Error("limit"), { limit: true });
      // el límite de respuesta se adapta a lo pedido: en modo Programador llega al máximo que cabe en el contexto del modelo (24 000 tokens menos lo que ya se envía)
      const bigAsk = /\bgb\b|giga|mega|enorme|gigante|pesad|sin l[ií]mite|muy grande|hiperreal|\b[48]k\b/i.test(message), promptTok = Math.ceil(JSON.stringify([sys, ...hist]).length / 3);
      const outCap = b.live ? 220 : b.mode === "coder" ? Math.max(1200, Math.min(bigAsk ? 16000 : 7000, 23000 - promptTok)) : 900;
      const payload = { messages: [{ role: "system", content: sys }, ...hist], stream: true, max_tokens: outCap };
      let out; try { out = await env.AI.run(model, payload); } catch (e1) { if (env.NOFALLBACK || /license|agree/i.test(String(e1.message)) || model === PM.def.id || images.length) throw e1; out = await env.AI.run(PM.def.id, payload); send({ type: "model", model: "☁ " + PM.def.id.split("/").pop() }); } // si el modelo elegido no existe o falla: vuelve al equilibrado
      if (out && typeof out.getReader === "function") {
        const rd = out.getReader(), dec = new TextDecoder(); let buf = "";
        for (;;) { const { done, value } = await rd.read(); if (done) break; buf += dec.decode(value, { stream: true }); let i;
          while ((i = buf.indexOf("\n")) >= 0) { const line = buf.slice(0, i).trim(); buf = buf.slice(i + 1); if (!line.startsWith("data:")) continue; const d = line.slice(5).trim(); if (d === "[DONE]") continue;
            try { const j = JSON.parse(d), t = j.response ?? j.choices?.[0]?.delta?.content; if (t) { text += t; send({ type: "token", text: t }); } } catch {} } }
      } else { const t = out?.response || out?.result?.response || ""; if (t) { text = t; send({ type: "token", text: t }); } }
      if (!text) throw new Error("respuesta vacía");
    } catch (e) {
      send({ type: "error", text: e.limit ? `Llegaste al límite diario gratuito. Los modelos grandes gastan más cupo: prueba uno más ligero o vuelve mañana.` : /license|agree/i.test(e.message) ? "El modelo de imágenes necesita aceptar su licencia una vez en el panel de Cloudflare (AI → Workers AI)." : `La IA no respondió (${String(e.message).slice(0, 120)}). Puede que se haya agotado el cupo gratuito de hoy.` }); }
    if (text) { msgs.push({ role: "assistant", content: text }); await q(env, "INSERT INTO chats(id,user_id,title,pinned,updated,messages) VALUES(?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET messages=excluded.messages, updated=excluded.updated",
      id, user.id, title, chat?.pinned || 0, Date.now(), JSON.stringify(msgs.slice(-40))).run(); }
    send({ type: "done" }); ctrl.close(); } });
  return new Response(stream, { headers: { "Content-Type": "text/event-stream; charset=utf-8", "Cache-Control": "no-cache", ...SEC } });
}

// ---------- API compatible con la interfaz local ----------
async function api(req, env, url, user) {
  const P = url.pathname, M = req.method, need = () => json({ error: "Inicia sesión" }, 401);
  const cfgStub = () => ({ safetyChosen: true, safetyLevel: "balanced", perms: {}, tools: {}, zones: [], legal: { owner: env.LEGAL_OWNER || "", email: env.LEGAL_EMAIL || "", country: env.LEGAL_COUNTRY || "" },
    oauth: {}, cloudPresets: {}, cloud: { provider: "gemini", hasKey: false }, lan: { enabled: false, pin: "", ips: [], port: 0 }, remoteTools: false, remote: { host: "", user: "dot", port: 22, key: "" },
    researchSources: 40, extraPrompt: "", model: "", effort: "balanced", isLocal: true, publicUrl: "" }); // «local» = puede editar sus propios ajustes (en la web cada usuario edita los suyos)
  if (P === "/config") return M === "GET" ? json(cfgStub()) : json("ok");
  if (P === "/warm" || P === "/remote/test" || P === "/cloud/test") return json({ ok: true });
  if (P === "/gpu") return json({ gpu: null });
  if (P === "/modes") return json(Object.fromEntries(Object.entries(MODES).map(([k, v]) => [k, { icon: v[0], label: v[1] }])));
  if (P === "/models") { const PM = pickModels(env); return json({ caps: Object.fromEntries(PM.text.map((m) => [m.id, []])), labels: Object.fromEntries(PM.text.map((m) => [m.id, m.label || m.id.split("/").pop()])), vision: true, models: PM.text.map((m) => m.id), current: PM.def.id, efforts: { balanced: "Normal" }, effort: "balanced" }); }
  if (P === "/profile" && M === "GET") return json({ profile: user?.profile ? JSON.parse(user.profile) : null, legalVersion: LEGAL_VERSION, host: { name: "Cloudflare" }, osList: [], tones: Object.fromEntries(Object.entries(TONES).map(([k, v]) => [k, v[0]])) });
  if (P === "/chats" && M === "GET") return json(user ? (await q(env, "SELECT id,title,updated,pinned FROM chats WHERE user_id=? ORDER BY pinned DESC, updated DESC LIMIT 200", user.id).all()).results.map((c) => ({ ...c, pinned: !!c.pinned })) : []);
  if (P === "/memory" && M === "GET") return json({ facts: user ? JSON.parse(user.facts || "[]") : [] });
  if (!user) return need();
  if (P === "/profile" && M === "POST") { const p = cleanProfile(await req.json().catch(() => ({})), user.profile ? JSON.parse(user.profile) : null);
    if (!p.anonymous && !p.name) return json({ error: "Falta el nombre (o elige modo anónimo)" }, 400);
    if (!p.consent) return json({ error: "Hace falta aceptar los términos y la política de privacidad" }, 400);
    await q(env, "UPDATE users SET profile=? WHERE id=?", JSON.stringify(p), user.id).run(); return json({ profile: p }); }
  if (P === "/memory" && M === "DELETE") { const i = url.searchParams.get("i"), f = JSON.parse(user.facts || "[]"); if (i !== null) f.splice(+i, 1); else f.length = 0; await q(env, "UPDATE users SET facts=? WHERE id=?", JSON.stringify(f), user.id).run(); return json("ok"); }
  if (P === "/chat" && M === "POST") return chatRoute(req, env, user);
  let m = /^\/chats\/([\w-]+)(\/export)?$/.exec(P);
  if (m) { const c = await q(env, "SELECT * FROM chats WHERE id=? AND user_id=?", m[1], user.id).first(); if (!c) return json({}, 404);
    const ms = JSON.parse(c.messages).filter((x) => x.content);
    if (m[2] && M === "GET") return new Response(`# ${c.title}\n\n` + ms.map((x) => `**${x.role === "user" ? "Tú" : "Calex"}:** ${x.content}`).join("\n\n"), { headers: { "Content-Type": "text/markdown; charset=utf-8", "Content-Disposition": `attachment; filename="${c.title.replace(/[^\p{L}\p{N} _-]/gu, "").slice(0, 40) || "charla"}.md"` } });
    if (M === "GET") return json({ id: c.id, title: c.title, messages: ms });
    if (M === "DELETE") { await q(env, "DELETE FROM chats WHERE id=?", c.id).run(); return json("ok"); }
    if (M === "PATCH") { const b = await req.json().catch(() => ({})); await q(env, "UPDATE chats SET title=?, pinned=? WHERE id=?", typeof b.title === "string" && b.title.trim() ? b.title.trim().slice(0, 60) : c.title, typeof b.pinned === "boolean" ? +b.pinned : c.pinned, c.id).run(); return json("ok"); } }
  if (P === "/account/export" && M === "GET") { const chats = (await q(env, "SELECT id,title,updated,messages FROM chats WHERE user_id=?", user.id).all()).results.map((c) => ({ id: c.id, title: c.title, updated: c.updated, messages: JSON.parse(c.messages) }));
    return new Response(JSON.stringify({ exportadoEl: new Date().toISOString(), cuenta: publicUser(user), perfil: user.profile ? JSON.parse(user.profile) : null, memoria: JSON.parse(user.facts || "[]"), chats }, null, 2), { headers: { "Content-Type": "application/json; charset=utf-8", "Content-Disposition": 'attachment; filename="mis-datos-dot.json"' } }); }
  if (P === "/account/delete" && M === "POST") { const b = await req.json().catch(() => ({})); if (b.confirm !== "BORRAR") return json({ error: "Escribe BORRAR para confirmar" }, 400);
    await env.DB.batch(["DELETE FROM chats WHERE user_id=?", "DELETE FROM sessions WHERE user_id=?", "DELETE FROM usage WHERE user_id=?", "DELETE FROM users WHERE id=?"].map((s) => q(env, s, user.id)));
    return json("ok", 200, { "Set-Cookie": "dot_session=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0" }); }
  return json({}, 404);
}

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    try {
      await init(env);
      // protección CSRF: las peticiones que cambian datos deben venir de esta misma web
      if (!["GET", "HEAD"].includes(req.method)) { const o = req.headers.get("origin"); if (o && new URL(o).host !== url.host && !url.pathname.startsWith("/auth/callback/")) return json({ error: "Origen no permitido" }, 403); }
      const lg = /^\/legal\/(terminos|privacidad)$/.exec(url.pathname);
      if (lg) return new Response(LEGAL[lg[1]].replace(/\{\{VERSION\}\}/g, LEGAL_VERSION).replace(/\{\{OWNER\}\}/g, esc(env.LEGAL_OWNER, "(sin completar)")).replace(/\{\{EMAIL\}\}/g, esc(env.LEGAL_EMAIL, "(sin completar)")).replace(/\{\{COUNTRY\}\}/g, esc(env.LEGAL_COUNTRY, "(sin completar)")), { headers: { "Content-Type": "text/html; charset=utf-8", ...SEC } });
      if (url.pathname === "/.well-known/apple-developer-domain-association.txt") return env.APPLE_DOMAIN_ASSOCIATION ? new Response(String(env.APPLE_DOMAIN_ASSOCIATION), { headers: { "Content-Type": "text/plain; charset=utf-8", ...SEC } }) : json({}, 404); // verificación de dominio de Apple (se guarda como secreto)
      // estadística privada del responsable: solo el PAÍS aproximado de cada visita, agregado por día (sin IP, sin ciudad, sin cuenta). Nada de esto aparece en la interfaz.
      if (url.pathname === "/owner/paises") {
        const k = String(url.searchParams.get("key") || ""), want = String(env.STATS_KEY || "");
        let same = want.length >= 8 && k.length === want.length; if (same) { let d = 0; for (let i = 0; i < k.length; i++) d |= k.charCodeAt(i) ^ want.charCodeAt(i); same = d === 0; }
        if (!same) return json({}, 404); // sin clave correcta ni siquiera se sabe que existe
        const since = new Date(Date.now() - 30 * 864e5).toISOString().slice(0, 10), rows = (await q(env, "SELECT country, SUM(n) n FROM visits WHERE day>=? GROUP BY country ORDER BY n DESC", since).all()).results;
        return json({ desde: since, total: rows.reduce((a, r) => a + r.n, 0), paises: rows.map((r) => ({ pais: r.country, visitas: r.n })) }, 200, { "Cache-Control": "no-store" });
      }
      if (req.method === "GET" && url.pathname === "/auth/status") { try { await q(env, "INSERT INTO visits(day,country,n) VALUES(?,?,1) ON CONFLICT(day,country) DO UPDATE SET n=n+1", new Date().toISOString().slice(0, 10), String(req.cf?.country || "??").slice(0, 2)).run(); } catch {} }
      const user = await getUser(req, env);
      if (url.pathname.startsWith("/auth/")) return await authRoutes(req, env, url, user);
      if (url.pathname.startsWith("/connectors")) { const cc = await connCtx(env, user, req); if (!cc) return json({ error: "Los conectores no están activados en este servidor" }, 503); const r = await CN.handle(req, url, cc, SEC); if (r) return r; }
      const apiPaths = /^\/(config|warm|gpu|modes|models|profile|chats|memory|chat|account|remote|cloud)(\/|$)/;
      if (apiPaths.test(url.pathname)) return await api(req, env, url, user);
      const r = await env.ASSETS.fetch(req); const h = new Headers(r.headers); for (const [k, v] of Object.entries(SEC)) h.set(k, v);
      return new Response(r.body, { status: r.status, headers: h });
    } catch (e) { console.error("dot error:", e && e.stack ? e.stack : e); return json({ error: "Error del servidor" }, 500); }
  },
};
