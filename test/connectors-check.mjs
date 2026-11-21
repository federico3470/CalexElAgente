// Prueba de los conectores del Worker (Gmail, Spotify, Telegram…) con servicios simulados.   node test/connectors-check.mjs
import { DatabaseSync } from "node:sqlite";
import worker from "../src/worker.js";
const B = "https://dot.example.workers.dev";
let pass = 0, bad = 0; const t = (n, ok, x = "") => { ok ? pass++ : bad++; console.log((ok ? "PASS " : "FAIL ") + n + (ok ? "" : "  <- " + x)); };
// ---- D1 simulado ----
const db = new DatabaseSync(":memory:");
const DB = { prepare(sql) { const st = () => db.prepare(sql); let a = []; const o = { bind: (...x) => { a = x; return o; }, run: () => ({ success: true, meta: { changes: st().run(...a).changes } }), first: () => st().get(...a) ?? null, all: () => ({ results: st().all(...a) }) }; return o; },
  async batch(s) { const out = []; for (const x of s) out.push(await x.run()); return out; } }; // como D1: se prepara al ejecutar, y el lote va en orden
const AI = { async run(model, input) { lastAI = { model, input }; return new ReadableStream({ start(c) { c.enqueue(new TextEncoder().encode('data: {"response":"ok"}\n\ndata: [DONE]\n\n')); c.close(); } }); } };
let lastAI = null;
const ASSETS = { fetch: async () => new Response("<html></html>", { headers: { "content-type": "text/html" } }) };
const env = { DB, AI, ASSETS, DAILY_LIMIT: "50", GOOGLE_CLIENT_ID: "gid", GOOGLE_CLIENT_SECRET: "gsec", SPOTIFY_CLIENT_ID: "spid", STATS_KEY: "clave-de-prueba-123" };

// ---- servicios externos simulados ----
const realFetch = globalThis.fetch, seen = []; let gTokens = 0, spotifyPremium = false, failRefresh = false;
const J = (v, s = 200) => new Response(JSON.stringify(v), { status: s, headers: { "Content-Type": "application/json" } });
globalThis.fetch = async (u, o = {}) => { const s = String(u), url = new URL(s), body = o.body ? String(o.body) : ""; const auth = o.headers?.Authorization || "";
  seen.push({ s, method: o.method || "GET", auth, body });
  if (url.host === "oauth2.googleapis.com") { const f = new URLSearchParams(body);
    if (f.get("grant_type") === "refresh_token") return failRefresh ? J({ error: "invalid_grant" }, 400) : J({ access_token: "ya29.refreshed", expires_in: 3600 });
    if (f.get("code") !== "G-OK" || f.get("client_secret") !== "gsec" || !f.get("code_verifier")) return J({ error: "invalid_grant" }, 400);
    gTokens++; return J({ access_token: "ya29.first", refresh_token: "1//refresh", expires_in: 30 }); } // caduca pronto: la siguiente llamada debe refrescar
  if (url.host === "accounts.spotify.com") { const f = new URLSearchParams(body); if (f.get("code") !== "S-OK" || f.get("client_secret") || !f.get("code_verifier")) return J({ error: "invalid_grant" }, 400); return J({ access_token: "BQ-spotify", refresh_token: "sp-refresh", expires_in: 3600 }); }
  if (url.host === "gmail.googleapis.com") {
    if (url.pathname.endsWith("/messages/send")) return J({ id: "sent1" });
    if (url.pathname.endsWith("/messages")) return J({ messages: [{ id: "m1" }, { id: "m2" }] });
    const id = url.pathname.split("/").pop(); return J({ id, snippet: "hola " + id, payload: { headers: [{ name: "From", value: "Ana <ana@x.com>" }, { name: "Subject", value: "Asunto " + id }, { name: "Date", value: "hoy" }] } }); }
  if (url.host === "api.spotify.com") {
    if (url.pathname === "/v1/me/player" && (o.method || "GET") === "GET") return J({ is_playing: true, progress_ms: 5000, item: { name: "Canción", duration_ms: 200000, artists: [{ name: "Artista" }], album: { name: "Disco", images: [{ url: "https://i.scdn.co/a" }, { url: "https://i.scdn.co/b" }] } }, device: { name: "Cel", volume_percent: 40 } });
    if (!spotifyPremium) return J({ error: { status: 403, message: "Premium", reason: "PREMIUM_REQUIRED" } }, 403); return new Response(null, { status: 204 }); }
  if (url.host === "api.telegram.org") return J({ ok: true }); if (url.host === "ntfy.sh") return new Response("ok");
  return realFetch(u, o); };

const call = (p, o = {}, ck) => worker.fetch(new Request(B + p, { ...o, headers: { ...(o.headers || {}), ...(ck ? { cookie: ck } : {}) } }), env, {});
const post = (p, b, ck) => call(p, { method: "POST", body: JSON.stringify(b), headers: { "Content-Type": "application/json" } }, ck);
const sess = (r) => (r.headers.get("set-cookie") || "").split(";")[0];
const guest = async () => sess(await post("/auth/guest", {}));
const connect = async (ck, id, code) => { const j = await (await post("/connectors/connect", { id }, ck)).json(); const st = new URL(j.url).searchParams.get("state"); const r = await call(`/connectors/callback?state=${st}&code=${code}`, {}, ck); return { j, st, r }; };

try {
  const a = await guest(), b = await guest();
  t("sin sesión no hay conectores", (await call("/connectors")).status === 401);
  let r = await call("/connectors", {}, a), j = await r.json();
  t("catálogo con 10 conectores y 'listo' según lo configurado", j.list.length === 10 && j.list.find((c) => c.id === "gmail").ready && j.list.find((c) => c.id === "spotify").ready && !j.list.find((c) => c.id === "github").ready && j.list.find((c) => c.id === "telegram").ready, JSON.stringify(j.list.map((c) => [c.id, c.ready])));
  // Gmail (OAuth con PKCE y cliente secreto)
  let c = await connect(a, "gmail", "G-OK"); const u = new URL(c.j.url);
  t("la URL de Google lleva PKCE, scopes de Gmail y retorno a /connectors/callback", u.host === "accounts.google.com" && u.searchParams.get("code_challenge_method") === "S256" && /gmail\.readonly/.test(u.searchParams.get("scope")) && u.searchParams.get("redirect_uri") === B + "/connectors/callback" && u.searchParams.get("access_type") === "offline", c.j.url);
  t("al volver vuelve a la app con ?conn=ok", c.r.status === 302 && c.r.headers.get("location") === "/?conn=ok&c=gmail", c.r.headers.get("location"));
  const raw = db.prepare("SELECT data FROM connections").all().map((x) => x.data).join("|");
  t("los tokens se guardan cifrados (no aparecen en claro)", raw.length > 40 && !/ya29|refresh/.test(raw));
  t("el estado no se puede reutilizar", (await call(`/connectors/callback?state=${c.st}&code=G-OK`, {}, a)).headers.get("location")?.startsWith("/?conn=err"));
  t("un código falso no vincula nada", (await call(`/connectors/callback?state=zzz&code=nope`, {}, a)).headers.get("location")?.startsWith("/?conn=err"));
  t("otro usuario no ve ni usa mi Gmail", !(await (await call("/connectors", {}, b)).json()).list.find((x) => x.id === "gmail").connected && !(await (await post("/connectors/run", { action: "gmail.list", args: {} }, b)).json()).ok);
  r = await (await post("/connectors/run", { action: "gmail.list", args: { max: 2 } }, a)).json();
  t("gmail.list devuelve los correos y refresca el token caducado", r.ok && r.data.length === 2 && r.data[0].asunto === "Asunto m1" && seen.some((x) => x.auth === "Bearer ya29.refreshed"), JSON.stringify(r));
  r = await (await post("/connectors/run", { action: "gmail.send", args: { to: "lorenzo@example.com", subject: "Hola", body: "Cuerpo" } }, a)).json();
  t("enviar un correo sin confirmación se rechaza", !r.ok && /confirmación/.test(r.error), JSON.stringify(r));
  r = await (await post("/connectors/run", { action: "gmail.send", confirm: true, args: { to: "lorenzo@example.com", subject: "Cumple\r\nBcc: espia@x.com", body: "Feliz cumple ñandú" } }, a)).json();
  const sent = seen.filter((x) => x.s.endsWith("/messages/send")).at(-1), mime = Buffer.from(JSON.parse(sent.body).raw, "base64url").toString();
  t("con confirmación se envía; destinatario correcto y sin inyección de cabeceras", r.ok && /^To: lorenzo@example\.com/m.test(mime) && !/^Bcc:/m.test(mime) && /=\?UTF-8\?B\?/.test(mime), mime);
  t("un destinatario inválido se rechaza", !(await (await post("/connectors/run", { action: "gmail.send", confirm: true, args: { to: "no-es-correo", subject: "a", body: "b" } }, a)).json()).ok);
  failRefresh = true; db.prepare("UPDATE connections SET updated=updated").run();
  // Telegram (token pegado por el usuario)
  r = await (await post("/connectors/save", { id: "telegram", fields: { bot_token: "malo", chat_id: "1" } }, a)).json(); t("un token de Telegram inválido se rechaza", !r.ok);
  r = await (await post("/connectors/save", { id: "telegram", fields: { bot_token: "123456789:AAH-abcdefghijklmnopqrstuvwxyz012345", chat_id: "98765" } }, a)).json(); t("se guarda un token de Telegram válido", r.ok);
  r = await (await post("/connectors/run", { action: "telegram.send", confirm: true, args: { text: "Hola desde Calex" } }, a)).json();
  t("telegram.send llama al bot con el chat correcto", r.ok && seen.some((x) => x.s.includes("api.telegram.org/bot123456789:") && /98765/.test(x.body)), JSON.stringify(r));
  t("las acciones de escritura no se ejecutan por GET ni sin sesión", (await call("/connectors/run")).status === 401);
  // Spotify (PKCE sin secreto)
  c = await connect(a, "spotify", "S-OK"); t("Spotify se vincula con PKCE sin secreto", c.r.headers.get("location") === "/?conn=ok&c=spotify" && !new URL(c.j.url).searchParams.has("client_secret"));
  r = await (await call("/connectors/music", {}, a)).json();
  t("la isla recibe la canción actual", r.provider === "spotify" && r.titulo === "Canción" && r.artista === "Artista" && r.sonando && r.imagen.startsWith("https://i.scdn.co/") && r.duracion === 200000, JSON.stringify(r));
  r = await (await post("/connectors/run", { action: "spotify.next", args: {} }, a)).json();
  t("sin Premium el error es claro", !r.ok && /Premium/.test(r.error), JSON.stringify(r));
  spotifyPremium = true; r = await (await post("/connectors/run", { action: "spotify.next", args: {} }, a)).json(); t("con Premium adelanta la canción", r.ok && seen.some((x) => x.s.endsWith("/me/player/next") && x.method === "POST"));
  r = await (await post("/connectors/run", { action: "spotify.volume", args: { percent: 250 } }, a)).json(); t("el volumen se limita a 0-100", r.ok && seen.some((x) => x.s.endsWith("volume_percent=100")));
  // la IA conoce los conectores vinculados
  await post("/profile", { name: "Zoe", tone: "friendly", avatar: { kind: "valen" }, consent: { terms: "2026-11", over13: true } }, a);
  await post("/chat", { message: "hola", music: true }, a);
  const sys = lastAI.input.messages[0].content;
  t("el prompt de la IA incluye los conectores vinculados y la música", /gmail\.list/.test(sys) && /telegram\.send/.test(sys) && /music\.next/.test(sys) && /calex-action/.test(sys) && !/spotify\.next/.test(sys));
  await post("/profile", { name: "Ana", tone: "friendly", avatar: { kind: "valen" }, consent: { terms: "2026-11", over13: true } }, b); await post("/chat", { message: "hola" }, b);
  t("quien no vinculó nada no ve conectores en su prompt", !/CONECTORES/.test(lastAI.input.messages[0].content));
  await post("/connectors/disconnect", { id: "gmail" }, a); t("desvincular borra la conexión", !(await (await call("/connectors", {}, a)).json()).list.find((x) => x.id === "gmail").connected);
} catch (e) { bad++; console.log("FALLÓ:", e.stack || e); }
console.log(`\n${pass} correctas, ${bad} fallidas.`); process.exit(bad ? 1 : 0);
