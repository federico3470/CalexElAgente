// Calex Cloud · Cloudflare Worker (plan gratis): API + inicio de sesión (Google y Apple) + IA (Workers AI) + datos (D1).
// Mantiene la MISMA API que el Calex local, para reutilizar la misma interfaz.
import { LEGAL } from "./legal.js";
import { normalizeSpec, buildSite, SPEC_SCHEMA } from "./studio.js";
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
  "CREATE TABLE IF NOT EXISTS strikes(user_id TEXT PRIMARY KEY, n INTEGER, blocked INTEGER DEFAULT 0, reason TEXT, last INTEGER, blocked_at INTEGER)", // moderación: avisos y sesiones bloqueadas hasta que el responsable las reactive
  "CREATE TABLE IF NOT EXISTS passkeys(id TEXT PRIMARY KEY, user_id TEXT NOT NULL, pub TEXT NOT NULL, alg INTEGER NOT NULL, counter INTEGER NOT NULL DEFAULT 0, name TEXT, created INTEGER)", // llaves de acceso (Face ID, Touch ID): solo la clave PÚBLICA
  "CREATE INDEX IF NOT EXISTS pk_u ON passkeys(user_id)",
  "CREATE TABLE IF NOT EXISTS pk_challenges(k TEXT PRIMARY KEY, challenge TEXT NOT NULL, user_id TEXT, kind TEXT NOT NULL, exp INTEGER NOT NULL)",
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
const MODES = { general: ["", "Todo en uno", ""] }; // un solo modo: Calex detecta si hay que charlar, traducir, explicar, redactar, cocinar, motivar o programar
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

// ---------- llaves de acceso (passkeys / WebAuthn): Face ID, Touch ID, Windows Hello… sin dependencias, solo WebCrypto ----------
const PK_ALGS = [-7, -257], PK_MAX = 10, PK_TTL = 5 * 60000;
const fromB64u = (s, max = 4096) => { s = String(s ?? ""); if (!s || s.length > max || !/^[A-Za-z0-9_-]+$/.test(s) || s.length % 4 === 1) return null;
  try { const bin = atob(s.replace(/-/g, "+").replace(/_/g, "/")); return Uint8Array.from(bin, (c) => c.charCodeAt(0)); } catch { return null; } };
const timingEq = (a, b) => { a = a instanceof Uint8Array ? a : enc.encode(String(a)); b = b instanceof Uint8Array ? b : enc.encode(String(b)); let d = a.length ^ b.length; const n = Math.max(a.length, b.length); for (let i = 0; i < n; i++) d |= (a[i % (a.length || 1)] ?? 0) ^ (b[i % (b.length || 1)] ?? 0); return d === 0; };
// CBOR mínimo y estricto: enteros, bytes, texto, listas y mapas de longitud definida (sin etiquetas, flotantes ni indefinidos)
function cborAt(u, o = 0, depth = 0) {
  if (depth > 8 || o >= u.length) throw new Error("cbor");
  const ib = u[o++], mt = ib >> 5, ai = ib & 31; let n;
  if (ai < 24) n = ai; else if (ai === 24) { if (o + 1 > u.length) throw new Error("cbor"); n = u[o++]; if (n < 24) throw new Error("cbor"); }
  else if (ai === 25) { if (o + 2 > u.length) throw new Error("cbor"); n = (u[o] << 8) | u[o + 1]; o += 2; if (n < 256) throw new Error("cbor"); }
  else if (ai === 26) { if (o + 4 > u.length) throw new Error("cbor"); n = ((u[o] << 24) >>> 0) + (u[o + 1] << 16) + (u[o + 2] << 8) + u[o + 3]; o += 4; if (n < 65536) throw new Error("cbor"); }
  else throw new Error("cbor");
  if (mt === 0) return [n, o]; if (mt === 1) return [-1 - n, o];
  if (mt === 2 || mt === 3) { if (o + n > u.length) throw new Error("cbor"); const s = u.slice(o, o + n); return [mt === 2 ? s : new TextDecoder("utf-8", { fatal: true }).decode(s), o + n]; }
  if (n > 256) throw new Error("cbor");
  if (mt === 4) { const a = []; for (let i = 0; i < n; i++) { const [v, p] = cborAt(u, o, depth + 1); a.push(v); o = p; } return [a, o]; }
  if (mt === 5) { const m = new Map(); for (let i = 0; i < n; i++) { const [k, p] = cborAt(u, o, depth + 1); if (typeof k !== "string" && typeof k !== "number") throw new Error("cbor"); const [v, p2] = cborAt(u, p, depth + 1); if (m.has(k)) throw new Error("cbor"); m.set(k, v); o = p2; } return [m, o]; }
  throw new Error("cbor");
}
const cborDecode = (u) => { const [v, o] = cborAt(u); if (o !== u.length) throw new Error("cbor"); return v; };
const concatU8 = (...a) => { const r = new Uint8Array(a.reduce((n, x) => n + x.length, 0)); let o = 0; for (const x of a) { r.set(x, o); o += x.length; } return r; };
const rpHash = async (host) => new Uint8Array(await crypto.subtle.digest("SHA-256", enc.encode(host)));
// firma ECDSA en DER → r||s de 64 bytes
function derToRaw(d) {
  if (d.length < 8 || d.length > 80 || d[0] !== 0x30 || d[1] !== d.length - 2 || d[2] !== 0x02) throw new Error("der");
  let o = 3; const rl = d[o++]; if (rl < 1 || rl > 33 || o + rl + 2 > d.length) throw new Error("der"); const r = d.slice(o, o + rl); o += rl;
  if (d[o++] !== 0x02) throw new Error("der"); const sl = d[o++]; if (sl < 1 || sl > 33 || o + sl !== d.length) throw new Error("der"); const s = d.slice(o, o + sl);
  const fit = (x) => { while (x.length > 32 && x[0] === 0) x = x.slice(1); if (x.length > 32) throw new Error("der"); const out = new Uint8Array(32); out.set(x, 32 - x.length); return out; };
  return concatU8(fit(r), fit(s));
}
const pkImport = (alg, spki, usage) => alg === -7 ? crypto.subtle.importKey("spki", spki, { name: "ECDSA", namedCurve: "P-256" }, false, [usage]) : crypto.subtle.importKey("spki", spki, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, [usage]);
// clientDataJSON común: tipo, challenge (tiempo constante), origen exacto y sin crossOrigin
function pkClient(raw, type, chal, origin) {
  const cd = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(raw));
  if (!cd || cd.type !== type || typeof cd.challenge !== "string" || !timingEq(cd.challenge, chal) || cd.origin !== origin || cd.crossOrigin === true) throw new Error("cd");
}
async function takeChallenge(env, k, kind, userId) { // un solo uso y atómico: solo quien logra borrar la fila puede usarla (sin carreras)
  const row = await q(env, "SELECT * FROM pk_challenges WHERE k=? AND kind=?", k, kind).first(); if (!row) return null;
  const del = await q(env, "DELETE FROM pk_challenges WHERE k=? AND kind=?", k, kind).run(); if ((del?.meta?.changes ?? 1) < 1) return null;
  if (row.exp < Date.now() || (userId !== undefined && row.user_id !== userId)) return null; return row.challenge;
}
const hasSub = (h, n) => { outer: for (let i = 0; i + n.length <= h.length; i++) { for (let j = 0; j < n.length; j++) if (h[i + j] !== n[j]) continue outer; return true; } return false; };
// la clave COSE firmada dentro de authData debe ser EXACTAMENTE la clave SPKI que se guardará (si no, el cliente podría declarar una cosa y guardar otra)
function coseMatchesSpki(cose, alg, spki) {
  if (alg === -7) { const x = cose.get(-2), y = cose.get(-3); if (cose.get(1) !== 2 || cose.get(-1) !== 1 || !(x instanceof Uint8Array) || !(y instanceof Uint8Array) || x.length !== 32 || y.length !== 32 || spki.length !== 91) return false;
    return timingEq(spki.slice(26), concatU8(Uint8Array.of(4), x, y)); }
  const n = cose.get(-1), e = cose.get(-2); if (cose.get(1) !== 3 || !(n instanceof Uint8Array) || !(e instanceof Uint8Array) || n.length < 256 || n.length > 512 || !n[0] || e.length < 1 || e.length > 4) return false; // RSA ≥ 2048 bits
  return hasSub(spki, n) && hasSub(spki, e);
}
async function passkeyRoutes(req, env, url, user) {
  const P = url.pathname, ip = req.headers.get("cf-connecting-ip") || "x", host = url.hostname, FAIL = () => json({ error: "No se pudo verificar la llave de acceso" }, 401);
  if (req.method === "GET" && P === "/auth/passkey/list") {
    if (!user) return json({ error: "Inicia sesión primero" }, 401);
    return json({ passkeys: (await q(env, "SELECT id,name,created FROM passkeys WHERE user_id=? ORDER BY created", user.id).all()).results.map((r) => ({ id: r.id, name: r.name || "", created: r.created })) }, 200, { "Cache-Control": "no-store" });
  }
  if (req.method !== "POST") return json({}, 404);
  if (+req.headers.get("content-length") > 24000) return json({ error: "Solicitud demasiado grande" }, 413);
  const rawBody = await req.text(); if (rawBody.length > 24000) return json({ error: "Solicitud demasiado grande" }, 413);
  let b; try { b = rawBody ? JSON.parse(rawBody) : {}; } catch { return json({ error: "Solicitud no válida" }, 400); } if (!b || typeof b !== "object" || Array.isArray(b)) return json({ error: "Solicitud no válida" }, 400);
  const purge = () => q(env, "DELETE FROM pk_challenges WHERE exp<?", Date.now()).run();
  if (P === "/auth/passkey/register/options") {
    if (!user) return json({ error: "Inicia sesión primero" }, 401);
    if (!(await hit(env, "pkro:" + user.id, 30, 600))) return json({ error: "Demasiados intentos, espera un rato" }, 429);
    await purge(); const chal = rnd(32); await q(env, "INSERT INTO pk_challenges(k,challenge,user_id,kind,exp) VALUES(?,?,?,?,?)", "r." + chal, chal, user.id, "reg", Date.now() + PK_TTL).run();
    const have = (await q(env, "SELECT id FROM passkeys WHERE user_id=?", user.id).all()).results.map((r) => ({ type: "public-key", id: r.id }));
    return json({ publicKey: { challenge: chal, rp: { id: host, name: "Calex" }, user: { id: b64u(enc.encode(user.id)), name: user.email || user.name || "calex", displayName: user.name || "Calex" },
      pubKeyCredParams: PK_ALGS.map((alg) => ({ type: "public-key", alg })), authenticatorSelection: { residentKey: "required", requireResidentKey: true, userVerification: "required" }, excludeCredentials: have, timeout: 60000, attestation: "none" } }, 200, { "Cache-Control": "no-store" });
  }
  if (P === "/auth/passkey/register/verify") {
    if (!user) return json({ error: "Inicia sesión primero" }, 401);
    if (!(await hit(env, "pkrv:" + user.id, 30, 600))) return json({ error: "Demasiados intentos, espera un rato" }, 429);
    const bad = () => json({ error: "No se pudo registrar la llave de acceso" }, 400), r = b.response;
    try {
      if (b.type !== "public-key" || !r || typeof r !== "object") return bad();
      const cdj = fromB64u(r.clientDataJSON, 3000), ao = fromB64u(r.attestationObject, 12000), spki = fromB64u(r.publicKey, 1400), id = String(b.id || ""), idb = fromB64u(id, 1400), alg = Number(r.publicKeyAlgorithm);
      if (!cdj || !ao || !spki || !idb || !PK_ALGS.includes(alg) || (b.rawId !== undefined && b.rawId !== id)) return bad();
      let cd; try { cd = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(cdj)); } catch { return bad(); }
      const chal = await takeChallenge(env, "r." + String(cd?.challenge || "").slice(0, 100), "reg", user.id); if (!chal) return bad(); // se consume siempre
      pkClient(cdj, "webauthn.create", chal, url.origin);
      const att = cborDecode(ao), ad = att instanceof Map ? att.get("authData") : null; if (!(ad instanceof Uint8Array) || ad.length < 55 || ad.length > 8192) return bad();
      if (!timingEq(ad.slice(0, 32), await rpHash(host))) return bad();
      const fl = ad[32]; if (!(fl & 0x01) || !(fl & 0x04) || !(fl & 0x40)) return bad(); // UP + UV + AT
      const cl = (ad[53] << 8) | ad[54]; if (cl < 1 || cl > 1023 || 55 + cl > ad.length || !timingEq(ad.slice(55, 55 + cl), idb)) return bad();
      const cose = cborAt(ad, 55 + cl)[0]; if (!(cose instanceof Map) || cose.get(3) !== alg || !coseMatchesSpki(cose, alg, spki)) return bad(); // la clave COSE de authData debe coincidir con el algoritmo y con la clave pública enviada
      await pkImport(alg, spki, "verify"); // la clave pública debe ser válida
      if (await q(env, "SELECT 1 x FROM passkeys WHERE id=?", id).first()) return bad();
      const ins = await q(env, "INSERT INTO passkeys(id,user_id,pub,alg,counter,name,created) SELECT ?,?,?,?,?,?,? WHERE (SELECT COUNT(*) FROM passkeys WHERE user_id=?)<?", id, user.id, b64u(spki), alg, ((ad[33] << 24) >>> 0) + (ad[34] << 16) + (ad[35] << 8) + ad[36], String(b.name || "").replace(/[ -<>]/g, "").trim().slice(0, 40) || "Llave de acceso", Date.now(), user.id, PK_MAX).run(); // el límite se aplica dentro del propio INSERT (sin carreras)
      if ((ins?.meta?.changes ?? 1) < 1) return json({ error: "Ya tienes el máximo de 10 llaves de acceso" }, 400);
      return json({ ok: true, id });
    } catch { return bad(); }
  }
  if (P === "/auth/passkey/login/options") {
    if (!(await hit(env, "pklo:" + ip, 30, 600))) return json({ error: "Demasiados intentos, espera un rato" }, 429);
    await purge(); const chal = rnd(32), cid = rnd(24); await q(env, "INSERT INTO pk_challenges(k,challenge,user_id,kind,exp) VALUES(?,?,?,?,?)", cid, chal, null, "auth", Date.now() + PK_TTL).run();
    return json({ cid, publicKey: { challenge: chal, rpId: host, timeout: 60000, userVerification: "required", allowCredentials: [] } }, 200, { "Cache-Control": "no-store" });
  }
  if (P === "/auth/passkey/login/verify") {
    if (!(await hit(env, "pklv:" + ip, 30, 600))) return json({ error: "Demasiados intentos, espera un rato" }, 429);
    const r = b.response;
    try {
      const chal = await takeChallenge(env, String(b.cid || "").slice(0, 100), "auth"); if (!chal) return FAIL();
      if (b.type !== "public-key" || !r || typeof r !== "object") return FAIL();
      const id = String(b.id || ""), cdj = fromB64u(r.clientDataJSON, 3000), ad = fromB64u(r.authenticatorData, 4000), sig = fromB64u(r.signature, 1400);
      if (!fromB64u(id, 1400) || !cdj || !ad || !sig || ad.length < 37 || (b.rawId !== undefined && b.rawId !== id)) return FAIL();
      const row = await q(env, "SELECT * FROM passkeys WHERE id=?", id).first(); if (!row) return FAIL();
      pkClient(cdj, "webauthn.get", chal, url.origin);
      if (!timingEq(ad.slice(0, 32), await rpHash(host))) return FAIL();
      if (!(ad[32] & 0x01) || !(ad[32] & 0x04)) return FAIL(); // UP + UV
      const cnt = ((ad[33] << 24) >>> 0) + (ad[34] << 16) + (ad[35] << 8) + ad[36];
      if ((row.counter > 0 || cnt > 0) && cnt <= row.counter) return FAIL();
      if (r.userHandle !== undefined && r.userHandle !== null && r.userHandle !== "") { const uh = fromB64u(r.userHandle, 200); if (!uh || !timingEq(uh, enc.encode(row.user_id))) return FAIL(); }
      const signed = concatU8(ad, new Uint8Array(await crypto.subtle.digest("SHA-256", cdj))), key = await pkImport(row.alg, fromB64u(row.pub, 2000), "verify");
      const ok = row.alg === -7 ? await crypto.subtle.verify({ name: "ECDSA", hash: "SHA-256" }, key, derToRaw(sig), signed) : await crypto.subtle.verify({ name: "RSASSA-PKCS1-v1_5" }, key, sig, signed);
      if (!ok) return FAIL();
      const up = await q(env, "UPDATE passkeys SET counter=? WHERE id=? AND counter=?", cnt, id, row.counter).run(); if ((up?.meta?.changes ?? 1) < 1) return FAIL(); // carrera: otra petición ya usó este contador
      const u = await q(env, "SELECT id FROM users WHERE id=?", row.user_id).first(); if (!u) return FAIL();
      return json({ ok: true }, 200, { "Set-Cookie": await newSession(env, u.id) });
    } catch { return FAIL(); }
  }
  if (P === "/auth/passkey/delete") {
    if (!user) return json({ error: "Inicia sesión primero" }, 401);
    await q(env, "DELETE FROM passkeys WHERE id=? AND user_id=?", String(b.id || "").slice(0, 1400), user.id).run(); return json({ ok: true });
  }
  return json({}, 404);
}

async function authRoutes(req, env, url, user) {
  const P = url.pathname;
  if (P.startsWith("/auth/passkey/")) return await passkeyRoutes(req, env, url, user);
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
  { id: "@cf/qwen/qwen2.5-coder-32b-instruct", label: "Código · Qwen Coder · 32B", w: 3, coder: true }, // hecho para programar (el plan gratis no permite GLM-5.3; con plan de pago: variable CODER_MODEL)
];
const catalog = (env) => { try { const m = env.MODELS ? JSON.parse(env.MODELS) : null; if (Array.isArray(m) && m.length) return m.filter((x) => x && /^@cf\/[\w-]+\/[\w.-]+$/.test(String(x.id)) && !String(x.id).includes("..")).slice(0, 12).map((x) => ({ id: x.id, label: String(x.label || x.id.split("/").pop()).slice(0, 60), w: Math.max(1, Math.min(10, +x.w || 1)), def: !!x.def, vision: !!x.vision })); } catch {} return DEFAULT_MODELS; };
const pickModels = (env) => { const cat = catalog(env), coderFree = cat.find((m) => m.coder), coder = env.CODER_MODEL && (!isOR(env.CODER_MODEL) || orReady(env, env.CODER_MODEL)) ? { id: env.CODER_MODEL, w: 3 } : coderFree, text = cat.filter((m) => !m.vision && !m.coder), def = env.CHAT_MODEL ? { id: env.CHAT_MODEL, w: 1 } : text.find((m) => m.def) || text[0], vis = cat.find((m) => m.vision) || { id: env.VISION_MODEL || "@cf/mistralai/mistral-small-3.1-24b-instruct", w: 2 }; return { cat, text, def, vis, coder, coderFree }; };
const sse = (o) => enc.encode(`data: ${JSON.stringify(o)}\n\n`);
// ---------- intención: ¿pide una página, un cambio a la última página, o código? ----------
// \b de JavaScript no entiende las tildes («hacé»), por eso los límites de palabra se arman con lookarounds de letras Unicode
const W = (alts) => new RegExp("(?<![\\p{L}\\d])(?:" + alts + ")(?![\\p{L}\\d])", "iu");
const MAKE_RE = W("(?<!qu[eé] )hac[eé]|haz|hacer|hac[eé]me|hazme|cre[aá]|crea|crear|cre[aá]me|arm[aá]|arma|armar|arm[aá]me|gener[aá]|genera|program[aá]|programa|programame|dise[nñ][aá]|dise[nñ]a|dise[nñ]ar|constru[ií]|construye|desarroll[aá]|desarrolla|quiero|necesito|dame|mostrame|escrib[ií]|escribe|codific[aá]");
const SITE_RE = W("p[aá]gina|landing|sitio|web ?site|portfolio|portafolio|tienda ?(?:online|virtual)?|e-?commerce|home ?page|blog|men[uú] digital");
const CODE_RE = W("c[oó]digo|programa|script|funci[oó]n|algoritmo|html|css|javascript|python|java|c\\+\\+|sql|api|juego|animaci[oó]n|calculadora|app|aplicaci[oó]n|bot|extensi[oó]n|componente|react|shader|canvas|three\\.?js|scroll\\w*|simulador|dashboard");
const EDIT_RE = W("cambi[aá]\\w*|agreg[aá]\\w*|sac[aá]\\w*|quit[aá]\\w*|pon[eé]\\w*|modific[aá]\\w*|m[aá]s|menos|otro|otra|reemplaz[aá]\\w*|actualiz[aá]\\w*|color\\w*|t[ií]tulo|texto|secci[oó]n|fondo|tipograf[ií]a|fuente|oscuro|claro|precios?|testimonios?|contacto");
const lvlOf = (b) => { const n = Math.round(+b.level); return Number.isFinite(n) ? Math.max(0, Math.min(100, n)) : 50; };
const SPEC_SYS = (n) => `Eres director creativo y redactor de una agencia web premium. Devuelve SOLO un objeto JSON válido (sin markdown ni comentarios) con este esquema:\n${SPEC_SCHEMA}\nReglas: español rioplatense natural y específico del rubro (nada de lorem ipsum ni frases genéricas); titulares potentes y cortos; elige "preset" y "font" que combinen con el rubro y la personalidad de la marca; usa ${n} secciones variadas (siempre features, split y gallery, y al final cta y contact); en "texture" y "tag" usa los valores del esquema; los datos de contacto deben ser ficticios de ejemplo (dominio .example); cada "items" con 3 elementos salvo pricing (3) y faq (4). PALETA según el rubro: comida, café, restaurante, artesanal, bodega → ember, gold o sand; tecnología, software, startups, finanzas → ocean, royal o mono; naturaleza, salud, bienestar, deporte → forest o sky; lujo, joyería, moda, eventos → gold, royal o mono; educación, servicios locales → sky o sand. TÍTULOS: creativos, concretos y propios de la marca; evita arrancar con «Nuestro», «Nuestra», «Lo que dicen» o «Preguntas frecuentes» (usa por ejemplo «Del grano a tu taza» o «Dudas, resueltas»). El titular del hero debe ser una promesa o imagen potente, no una descripción. Los textos de cada ítem deben tener datos o detalles concretos del rubro.`;
async function makeSpec(env, user, modelIds, ask, level, current) {
  const n = level < 34 ? 5 : level < 67 ? 7 : 9;
  const ask2 = current ? "Spec actual de la página:\n" + JSON.stringify(current) + "\n\nCambio pedido por el usuario: " + ask + "\n\nDevuelve el spec COMPLETO actualizado con ese cambio (conserva todo lo demás)." : "Pedido del usuario: " + ask;
  const TEMPS = [0.8, 0.5, 0.2]; // si el JSON sale mal, se reintenta con menos «creatividad»
  for (const modelId of [...new Set([].concat(modelIds).filter(Boolean))]) for (let k = 0; k < TEMPS.length; k++) {
    try { const out = await aiRun(env, modelId, { messages: [{ role: "system", content: SPEC_SYS(n) }, { role: "user", content: ask2 + (k ? "\n\nIMPORTANTE: responde únicamente con el JSON, bien formado, sin comas sobrantes ni comentarios." : "") }], max_tokens: 3800, temperature: TEMPS[k] });
      const t = JSON.stringify(out?.response ?? out?.result?.response ?? ""), j = aiJSON(out);
      if (j && Array.isArray(j.sections) && j.sections.length >= 2) return normalizeSpec(j, ask, level);
      console.error("spec inválido de", modelId, "intento", k + 1, "largo", t.length, "inicio:", t.slice(0, 120).split("\n").join(" "), "fin:", t.slice(-100).split("\n").join(" "));
    } catch (e) { if (env.NOFALLBACK) throw e; console.error("modelo no disponible", modelId, String(e.message).slice(0, 100)); break; } // el modelo no está disponible (p. ej. plan gratis): se prueba con el siguiente
  }
  return null;
}
const aiJSON = (out) => { const r = out?.response ?? out?.result?.response; return r && typeof r === "object" ? r : extractJSONObj(String(r ?? "")); };
function extractJSONObj(t) { t = String(t).replace(/```(?:json)?/gi, ""); const a = t.indexOf("{"), b = t.lastIndexOf("}"); if (a < 0 || b < a) return null; const raw = t.slice(a, b + 1); try { return JSON.parse(raw); } catch {} try { return JSON.parse(raw.replace(/,\s*([}\]])/g, "$1")); } catch { return null; } }
const CODE_SYS = `Eres un ingeniero de software senior y diseñador front-end de nivel agencia. Entrega código COMPLETO y listo para usar, nunca esqueletos. Si piden algo visual o interactivo (juego, animación, herramienta, simulador), entrega UN SOLO archivo HTML autónomo dentro de UN ÚNICO bloque \`\`\`html con CSS en <style> y JavaScript en <script>, que funcione al abrirlo sin descargar nada y sin imágenes externas. Calidad de producto real: diseño moderno y cuidado (tipografía, espaciado, paleta coherente, modo oscuro elegante), responsive, animaciones suaves, accesible, y sin errores de consola. Para fondos, texturas y efectos usa WebGL con shaders (ruido fractal fbm, dominio deformado) o canvas, generados proceduralmente: texturas de alta resolución (hasta 4096 px cuando el dispositivo lo permita; reduce en celulares), partículas, parallax y animaciones al hacer scroll con IntersectionObserver. No uses lorem ipsum. Para código que no es visual, usa el lenguaje pedido con bloques \`\`\`lenguaje, comentarios útiles y manejo de errores. Después del código, máximo tres líneas de explicación. Responde en español.`;
const ARCHIVOS_SYS = ` ENTREGA DE ARCHIVOS: puedes entregar archivos descargables. Cuando te pidan un PDF, Word, Excel, PowerPoint, TXT, CSV, HTML, JSON, Markdown, SVG, calendario (.ics), XML o un ZIP con varios archivos, responde con una breve introducción y UN bloque de código cuyo encabezado sea exactamente \`\`\`archivo:TIPO:Nombre_del_archivo (TIPO = pdf, docx, xlsx, pptx, txt, csv, html, json, md, svg, ics, xml o zip; el nombre sin extensión), y cuyo contenido siga este formato: pdf y docx = Markdown (#, ##, ###, párrafos, **negrita**, *cursiva*, listas con - y 1., tablas con |, > citas, --- regla, <<<pagina>>> salto de página); xlsx = una tabla con barras | (una hoja por cada línea «## Hoja: Nombre»), la primera fila es el encabezado, y puedes usar fórmulas simples como =SUM(B2:B10); pptx = diapositivas separadas por una línea --- (la primera con # Título; el resto viñetas con -); zip = varios archivos, cada uno iniciado por una línea «=== archivo: ruta/nombre.ext ===»; los demás tipos llevan el contenido tal cual. El contenido debe ser completo y de calidad profesional, sin explicaciones dentro del bloque. La interfaz mostrará botones para descargarlo. Si piden varios formatos del mismo contenido, entrega un bloque por formato. APK, EXE y otros ejecutables NO se pueden compilar aquí: ofrece el código fuente, un ZIP con el proyecto y las instrucciones para compilarlo, o una aplicación web instalable (HTML, manifest y service worker en un ZIP).`;
const ALLINONE = (level, live) => `Eres Calex, el asistente todo en uno de la familia: charlas, explicas como un profe paciente, traduces, resumes, redactas, ayudas a cocinar, motivas como un coach, resuelves tareas y programas. Detecta solo lo que te piden y hazlo bien, sin pedir que cambien de modo. Responde SIEMPRE en el idioma del usuario (normalmente español). Estilo: registro formal y profesional pero cercano, claro y sobrio; sin emojis, sin exclamaciones y sin muletillas de asistente; trato neutro y respetuoso (de usted o en infinitivo), sin voseo; no sermonees ni moralices sin motivo: responde con naturalidad a las preguntas inocentes, hipotéticas, de ficción, historia, noticias, salud o seguridad, y solo cuando alguien busque causar daño a otras personas niégate con una frase breve y formal, recordando que Calex no debe usarse para eso; no menciones que eres una IA salvo que te lo pregunten. No tienes acceso al dispositivo del usuario: si te pide abrir, instalar o hacer algo en su equipo, di en una frase que no puedes y entrega de inmediato pasos numerados y cortos. Según lo pedido: traducir = devuelve solo la traducción (si no dice idioma: español a inglés); explicar o enseñar = paso a paso con ejemplos sencillos y comprobando que se entiende; resumir = puntos claros y breves; redactar = buen estilo y listo para usar; cocina = recetas con pasos cortos según lo que tenga; ánimo y metas = empatía y metas pequeñas y concretas; programar = código completo en bloques con el lenguaje, explicando solo lo esencial. Las páginas web completas las arma Calex Studio automáticamente cuando las piden.${level < 34 ? " Modo rápido: responde en una a tres frases, directo al grano." : level >= 67 ? " Modo profundo: piensa con calma antes de responder, verifica cálculos y datos, considera casos límite y da una respuesta completa y bien estructurada (con títulos o pasos cuando ayude)." : ""}${live ? " Estás en una conversación por voz: responde en 1 o 2 frases cortas, sin markdown ni emojis." : ""}`;

// Los modelos con prefijo «or:» (ej. or:z-ai/glm-5.3) se piden a OpenRouter. Cada proveedor puede tener su PROPIA clave con su tope de gasto en OpenRouter.
const isOR = (m) => typeof m === "string" && m.startsWith("or:");
const orKey = (env, m) => { const id = m.slice(3); return (/^z-ai\//.test(id) && env.OPENROUTER_KEY_ZAI) || (/^deepseek\//.test(id) && env.OPENROUTER_KEY_DEEPSEEK) || (/^anthropic\//.test(id) && env.OPENROUTER_KEY_ANTHROPIC) || env.OPENROUTER_KEY || ""; };
const orReady = (env, m) => isOR(m) && !!orKey(env, m);
async function orRun(env, model, payload) {
  const key = orKey(env, model); if (!key) throw new Error("OpenRouter sin clave");
  const body = { model: model.slice(3), messages: payload.messages, max_tokens: payload.max_tokens, stream: !!payload.stream, ...(payload.temperature != null && { temperature: payload.temperature }) };
  const r = await fetch("https://openrouter.ai/api/v1/chat/completions", { method: "POST", headers: { Authorization: "Bearer " + key, "Content-Type": "application/json", "HTTP-Referer": "https://calex.federicoreta773.workers.dev", "X-Title": "Calex" }, body: JSON.stringify(body) });
  if (!r.ok) { const t = await r.text().catch(() => ""); throw new Error("OpenRouter " + r.status + ": " + t.slice(0, 160)); }
  if (payload.stream) return r.body;
  const j = await r.json(), c = j.choices?.[0]?.message?.content; return { response: typeof c === "string" ? c : Array.isArray(c) ? c.map((x) => x.text || "").join("") : "" };
}
const aiRun = (env, model, payload) => (isOR(model) ? orRun(env, model, payload) : env.AI.run(model, payload));
const PRESETS_OK = ["ember", "ocean", "forest", "royal", "gold", "sand", "sky", "mono"];
const withTimeout = (p, ms) => Promise.race([p, new Promise((_, rj) => setTimeout(() => rj(new Error("tiempo agotado")), ms))]);
async function lookAtPage(env, html) {
  const puppeteer = (await import("@cloudflare/puppeteer")).default, browser = await puppeteer.launch(env.BROWSER);
  try {
    const page = await browser.newPage(); await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
    await page.setContent(html, { waitUntil: "load", timeout: 15000 }); await new Promise((r) => setTimeout(r, 2500));
    const h = await page.evaluate(() => document.documentElement.scrollHeight), shots = [];
    for (const y of [0, Math.round(h * 0.33), Math.round(h * 0.66)]) { await page.evaluate((yy) => window.scrollTo(0, yy), y); await new Promise((r) => setTimeout(r, 1300)); shots.push("data:image/jpeg;base64," + (await page.screenshot({ type: "jpeg", quality: 55, encoding: "base64" }))); }
    const info = await page.evaluate(() => ({ webgl: !!document.createElement("canvas").getContext("webgl"), tex: [...document.querySelectorAll("canvas.tex")].filter((c) => c.dataset.res).length, texTotal: document.querySelectorAll("canvas.tex").length }));
    return { shots, info, height: h };
  } finally { try { await browser.close(); } catch {} }
}
const CRIT_SYS = "Eres director de arte senior. Recibes 3 capturas de una misma página web (parte de arriba, del medio y de abajo). Evalúa SOLO lo visual: contraste y legibilidad del texto, cosas cortadas o desbordadas, espacios vacíos raros, jerarquía, armonía de colores y si la paleta y la tipografía encajan con el rubro. Responde ÚNICAMENTE con un JSON: {\"score\":1-10,\"problems\":[{\"where\":\"arriba|medio|abajo\",\"issue\":\"...\",\"severity\":1-3}],\"fixes\":{\"preset\":\"ember|ocean|forest|royal|gold|sand|sky|mono o vacío\",\"shader\":\"warp|aurora|nebula o vacío\",\"font\":\"serif|sans|grotesk|mono|rounded o vacío\"},\"summary\":\"una frase en español con lo mejor de la página y, si corresponde, lo que mejorarías; NO digas que ajustaste o corregiste nada\"}.";
async function critiquePage(env, PM, ask, look) {
  const nota = !look.info.webgl || look.info.tex < look.info.texTotal ? " Nota: el navegador de captura no tiene tarjeta gráfica, así que el fondo animado y las texturas pueden verse vacíos u oscuros en estas capturas; ignora eso y no lo cuentes como problema." : "";
  const payload = { messages: [{ role: "system", content: CRIT_SYS }, { role: "user", content: [{ type: "text", text: "Pedido original del cliente: " + ask.slice(0, 300) + "." + nota + " Devuelve solo el JSON." }, ...look.shots.map((u) => ({ type: "image_url", image_url: { url: u } }))] }], max_tokens: 700 };
  if (orReady(env, env.EYES_MODEL)) { try { const j = aiJSON(await aiRun(env, env.EYES_MODEL, payload)); if (j) return j; } catch (e) { console.error("ojos premium:", String(e.message).slice(0, 120)); } }
  return aiJSON(await env.AI.run(PM.vis.id, payload));
}

// ---------- moderación: detecta INTENCIÓN OPERATIVA de causar daño real (cómo planear o ejecutar), no preguntas informativas, ficción ni historia ----------
const G = (n) => String.raw`[^.!?\n]{0,${n}}?`;
// entre «cómo / quiero…» y el verbo no puede haber frases que hablen de terceros («quieren estafar», «saber si me van a robar», «los ladrones…»)
const MG = String.raw`(?:(?!dejar de\b|deje de\b|dejo de\b|evitar\b|evite\b|para no\b|sin\b|no\s+(?:matar|golpear|lastimar|herir|agredir|pegar|maltratar|acosar|robar|estafar|envenenar|drogar|secuestrar|hacer(?:le)?\s+da[nñ]o)|quieren\b|quiere\b|intentan\b|intenta\b|van a\b|saber si|si me\b|si alguien|que no me\b|para que no\b|por qu[eé]|ladron\w*|delincuent\w*|criminal\w*|estafador\w*|hacker\w*|terrorist\w*|los que\b|quienes\b|quien\b|alguien\b|gente que|personas que)[^.!?\n]){0,45}?`;
const L_HOW = String.raw`c[oó]mo|formas? de|maneras? de|manera de|m[eé]todos? (?:para|de)|paso a paso|pasos? para|instrucciones|tutorial|gu[ií]a|dime|d[ií]me|dec[ií]me|dame|d[aá]me|ens[eé][nñ]\w*|expl[ií]c\w*|ay[uú]d\w*|consejos? para|ideas? para|tips? para|plan(?:es)? para|estrategias? para|recetas? (?:para|de)|se puede|puedo|podr[ií]a|puedes|podr[eé]|qu[eé] necesito para`;
const L_WANT = String.raw`quiero|queremos|necesito|necesitamos|me gustar[ií]a|tengo que|hay que|busco`;
const L_INT = String.raw`voy a|vamos a|pienso|planeo|planeamos|estoy planeando|estoy pensando en`;
const LEAD = `(?:${L_HOW}|${L_WANT}|${L_INT})`, LEAD_NW = `(?:${L_HOW}|${L_INT})`;
const PN = String.raw`(?:ex|pareja|espos[ao]|marid[oa]|novi[oa]|vecin[oa]s?|compa[nñ]er[oa]s?|jef[ae]|profesor\w*|maestr[oa]|ni[nñ][oa]s?|chic[oa]s?|mujer|hombre|persona|hermano|hermana|madre|padre|suegr[oa]|amig[oa]|hij[oa]s?|abuel[oa]s?|beb[eé]|gente|polic[ií]a|testigo|socio|cu[nñ]ad[oa]|t[ií][oa]|mam[aá]|pap[aá]|alguien|empresari\w*|ejecutiv\w*|pol[ií]tic\w*|turistas?|extranjer\w*|perr[oa]s?|gat[oa]s?|mascotas?)`;
const DET = String.raw`(?:(?:mi|su|tu|un|una|el|la|mis|sus|otra|otro)\s+)?`;
const TO = String.raw`(?:a\s+${DET}|al\s+)${PN}`, OWNER = String.raw`(?:ajen\w*|de\s+${DET}${PN}|sin\s+(?:su\s+)?(?:permiso|autorizaci[oó]n|que\s+(?:se\s+entere|lo\s+sepa|se\s+d[eé]\s+cuenta|se\s+note|lo\s+note|sepa)))`;
// lead + (verbo fuerte con hasta 22 caracteres hasta el objeto | verbo débil como «hacer» pegado al objeto) + objeto
const RR = (lead, strong, weak, obj) => W(`${lead}${MG}(?:(?:${strong})${G(22)}|(?:${weak})${G(8)})(?:${obj})`);
const RW = (lead, weak, obj) => W(`${lead}${MG}(?:${weak})${G(8)}(?:${obj})`);
const R1 = (lead, v, obj, g = 22) => W(`${lead}${MG}(?:${v})${obj ? G(g) + "(?:" + obj + ")" : ""}`);
const NOUN_DELITO = String.raw`asalto|atraco|robo|secuestro|atentado|masacre|tiroteo|homicidio|asesinato|crimen|fraude|estafa|extorsi[oó]n|chantaje|ataque terrorista|atentado terrorista|ataque armado`;
const TARGET = String.raw`cuentas?|instagram|facebook|whatsapp|gmail|hotmail|correos?|e-?mails?|wi-?fi|contrase[nñ]as?|celular(?:es)?|tel[eé]fonos?|computador\w*|pc|servidores?|p[aá]ginas? web|sitios? web|c[aá]maras?|redes? sociales|tiktok|snapchat|telegram|paypal|home banking|billeteras?`;
const EXPL = String.raw`bombas?(?!\s+de\s)|explosivos?|granadas? (?:de mano|explosivas?|caseras?)|molotov|dinamita|napalm|c-?4|tnt|ant[ií]ntrax|ricina|sar[ií]n|gas (?:mostaza|sar[ií]n|venenoso)|(?:cintur[oó]n|chaleco) explosivo|detonador(?:es)?|artefactos? explosivos?|armas? (?:qu[ií]micas?|biol[oó]gicas?|nucleares?)`;
const ARMS = String.raw`armas?|pistolas?(?!\s+de\s+(?:agua|juguete|pintura|silicona|pegamento|burbujas))|rev[oó]lver(?:es)?|rifles?|escopetas?|fusil(?:es)?|ametralladoras?|silenciador(?:es)?|subfusiles?`;
const DRUG = String.raw`metanfetaminas?|coca[ií]na|fentanilo|hero[ií]na|lsd|[eé]xtasis|mdma|pasta base(?!\s+de\s)|paco|ketamina|anfetaminas?|drogas?|narc[oó]ticos|opioides`;
const MINOR = String.raw`ni[nñ][oa]s?|ni[nñ]it[oa]s?|menor(?:es)?(?: de edad)?|adolescentes?|chiquit[oa]s?|beb[eé]s?|colegial\w*`;

const MIS = [
  { cat: "menores", always: true, re: [
    W(`${LEAD}${MG}(?:abusar|violar|seducir|manosear|groomear|tener sexo con|tener relaciones sexuales con|acostarme con)${G(10)}(?:de\\s+|a\\s+|con\\s+)?(?:${DET})(?:${MINOR})`),
    W(`(?:conseguir|descargar|ver|encontrar|comprar|vender|buscar|enlaces? (?:a|de)|links? (?:a|de))${G(25)}(?:pornograf[ií]a infantil|porno infantil|porno de menores|pornograf[ií]a de menores|csam|material de abuso sexual infantil)`)] },
  { cat: "autolesion", re: [
    W(`(?:c[oó]mo|formas? de|maneras? de|m[eé]todos? (?:para|de)|quiero|voy a|necesito|pienso|ay[uú]dame a|mejor (?:forma|manera) de)${G(30)}(?:suicidarme|quitarme la vida|matarme(?!\\s+(?:de|trabajando|estudiando|entrenando|corriendo|haciendo))|acabar con mi vida|terminar con mi vida|cortarme (?:las venas|los brazos|las mu[nñ]ecas)|autolesionarme|ahorcarme|morirme sin dolor)`),
    W(`cu[aá]ntas?\\s+(?:pastillas?|p[ií]ldoras?|comprimidos?)${G(30)}(?:morir|matarme|morirme|suicid\\w+)`)] },
  { cat: "explosivos", strict: true, re: [
    RR(LEAD, "fabricar|construir|preparar|elaborar|sintetizar|extraer|ensamblar|imprimir", "hacer|armar|crear|montar", EXPL),
    R1(LEAD, "plantar|colocar|poner", String.raw`bombas?(?!\s+de\s)|explosivos?|molotov`, 12)] },
  { cat: "armas", re: [
    RR(LEAD, "fabricar|construir|elaborar|ensamblar|imprimir", "hacer|armar|crear|montar", ARMS),
    W(`${LEAD}${MG}(?:conseguir|comprar|adquirir|obtener|vender|traficar)${G(22)}(?:${ARMS}|explosivos?)${G(22)}(?:sin\\s+(?:papeles|licencia|registro|permiso|antecedentes)|ilegal\\w*|clandestin\\w*|mercado negro|contrabando)`)] },
  { cat: "veneno", strict: true, re: [
    R1(LEAD, "envenenar|intoxicar", TO, 6),
    R1(LEAD, "drogar|narcotizar", String.raw`(?:a\s+${DET}|al\s+)(?!(?:perr|gat)[oa]s?\b|mascotas?\b)${PN}`, 6),
    R1(LEAD, "venenos?", String.raw`indetectables?|que no (?:deja|se (?:detecte|note))|para (?:matar|envenenar|alguien|una persona|mi (?:ex|pareja|suegr[oa]|jef[ae]|vecin[oa]|espos[ao]|marid[oa]|novi[oa]))`, 22)] },
  { cat: "violencia", strict: true, re: [
    R1(LEAD_NW, "matar|asesinar|estrangular|apu[nñ]alar|ahorcar|degollar|dispararle|disparar|golpear|lastimar|herir|atropellar|torturar|agredir|mutilar|descuartizar", TO, 6),
    R1(LEAD, "ocultar|esconder|enterrar|deshacerme de|disolver|hacer desaparecer|descuartizar", String.raw`cad[aá]ver(?:es)?|un muerto|cuerpo sin vida|restos humanos`, 14),
    RW(LEAD, "hacer|lograr|conseguir", String.raw`que\s+parezca\s+(?:un\s+)?(?:accidente|suicidio|muerte natural)`)] },
  { cat: "secuestro", strict: true, re: [R1(LEAD, "secuestrar|raptar|privar de (?:su )?libertad", TO, 6)] },
  { cat: "acoso", re: [
    R1(LEAD, "acosar|acechar|stalkear|hostigar|intimidar|humillar|difamar|doxxear|doxear|chantajear|extorsionar", TO, 6),
    W(`${LEAD}${MG}(?:espiar|rastrear|seguir|vigilar|localizar)\\s+${TO}${G(40)}(?:sin que|a escondidas|en secreto|sin su (?:permiso|conocimiento))`),
    RW(LEAD, "hacer|lograr|conseguir", String.raw`que\s+(?:alguien|${DET}${PN})\s+(?:se\s+suicide|se\s+mate|se\s+haga\s+da[nñ]o)`)] },
  { cat: "robo", re: [
    W(`${LEAD}${MG}(?:asaltar|atracar|robar|saquear|desvalijar|hurtar|dar (?:el )?golpe a)${G(20)}(?:bancos?|cajeros?|joyer[ií]as?|casas?|tiendas?|negocios?|locales?|supermercados?|farmacias?|kioscos?|blindados?|cami[oó]n(?:es)?|caja fuerte|museos?|empresas?|autos?|coches?|carros?|motos?|celulares?|carteras?|billeteras?|personas?|gente|turistas?|ancian\\w+|vecin\\w+|comercios?|casinos?|dinero|tarjetas?|iglesias?|escuelas?|colegios?|hospitales?)`),
    W(`(?:plan(?:es)?|planear|planificar|organizar|coordinar|ejecutar|cometer|llevar a cabo|dise[nñ]ar|armar|realizar|preparar)(?:(?!evitar|prevenir|contra|ante\\b|frente a|protocolo|seguridad|respuesta|emergencia|simulacro|sobrevivir)[^.!?\\n]){0,22}?(?:${NOUN_DELITO})`)] },
  { cat: "fraude", re: [
    R1(LEAD, "estafar|timar|defraudar|extorsionar|chantajear", ""),
    W(`${LEAD}${MG}(?:clonar)${G(22)}(?:tarjetas?(?!\\s+(?:sim|sd|micro|de\\s+memoria|gr[aá]fica))|chips?)`),
    W(`${LEAD}${MG}(?:falsificar)${G(22)}(?:documentos?|firmas?|billetes|dinero|recetas?|cheques?|certificados?|t[ií]tulos?|pasaportes?|dni|facturas?|identidad|sellos?)`),
    W(`${LEAD}${MG}(?:suplantar)${G(14)}(?:identidad|a\\s+${DET}${PN})`),
    W(`${LEAD}${MG}(?:lavar|blanquear)${G(10)}(?:dinero|plata|capitales|activos)`),
    W(`${LEAD}${MG}robar${G(12)}(?:contrase[nñ]as|datos bancarios|datos personales|tarjetas|identidad)`),
    RW(LEAD, "hacer|montar|armar|lanzar|crear|dise[nñ]ar|enviar|organizar|realizar", String.raw`estafas?|phishing|pishing|skimming|esquema ponzi|pir[aá]mide|p[aá]ginas? falsas?|correos? falsos?|fraude`)] },
  { cat: "hackeo", re: [
    W(`${LEAD}${MG}(?:hackear|hakear|hackearle|crackear|vulnerar|jaquear)${G(25)}(?:${TARGET})`),
    W(`${LEAD}${MG}(?:espiar|rastrear|interceptar|clonar|robar|entrar a|entrar en|acceder a|meterme en|meterme a)${G(25)}(?:${TARGET})${G(40)}(?:${OWNER})`),
    W(`(?:instal\\w+|poner|colocar|meter|esconder)${G(30)}(?:keylogger|spyware|stalkerware|esp[ií]a|troyano|rastreador)${G(40)}(?:${OWNER})`),
    RW(LEAD, "hacer|crear|programar|desarrollar|armar|dise[nñ]ar", String.raw`ransomware|keylogger|troyano|botnet|malware|virus inform[aá]tico`)] },
  { cat: "ingles", re: [
    /\b(?:how (?:to|do i|can i|could i)|ways to|help me|teach me|i want to|i need to)\b[^.!?\n]{0,25}?\b(?:make|build|create|construct|assemble)\b[^.!?\n]{0,15}?\b(?:a |an |some )?(?:bombs?|explosives?|pipe bombs?|molotov|nerve agent|ransomware|keylogger|untraceable gun|ghost gun)\b/i,
    /\b(?:how (?:to|do i|can i)|ways to|help me|i want to|i('m| am) going to)\b[^.!?\n]{0,25}?\b(?:kill|murder|poison|kidnap|stalk|torture)\b[^.!?\n]{0,6}?\b(?:my|a|an|the|him|her|them|someone|somebody)\b/i,
    /\b(?:how (?:to|do i|can i)|ways to)\b[^.!?\n]{0,20}?\b(?:hack|break into)\b[^.!?\n]{0,15}?\b(?:my (?:ex|girlfriend|boyfriend|wife|husband|neighbou?r)|someone|somebody)\b/i,
    /\b(?:how (?:to|do i|can i)|ways to)\b[^.!?\n]{0,20}?\b(?:rob|burgle|hold up)\b[^.!?\n]{0,6}?\b(?:a |an |the )?(?:banks?|stores?|houses?|people)\b/i] },
  { cat: "drogas", strict: true, re: [
    RR(LEAD, "fabricar|producir|sintetizar|cocinar|elaborar|preparar|extraer|refinar|destilar|manufacturar|cultivar", "hacer|armar|montar", DRUG + "|laboratorio de drogas|narcolaboratorio"),
    R1(LEAD, "vender|traficar|distribuir|comercializar|contrabandear", DRUG + "|marihuana|cannabis", 16)] },
];
const CTX = W("novela|cuento|relato|gui[oó]n|pel[ií]cula|serie|libro|personaje|ficci[oó]n|documental|videojuego|juego|jefe final|jefes finales|boss|elden ring|dark souls|zelda|mario|pok[eé]mon|among us|call of duty|skyrim|nivel|misi[oó]n|partida|gta|minecraft|fortnite|roblox|cosplay|disfraz|juguete|airsoft|nerf|madera|espadas?|cart[oó]n|r[eé]plica|utiler[ií]a|noticias?|historia|hist[oó]ric\\w*|investigaci[oó]n|tesis|ensayo|curso|clase|prevenir|prevenci[oó]n|proteg\\w*|defend\\w*|detectar|denunci\\w*|recuperar|ciberseguridad|ctf|pentest|laboratorio|autorizad\\w*|mi propi[oa]|partido|f[uú]tbol|ajedrez|boxeo|deport\\w*|simulacro|protocolo|campa[nñ]a|combatir|lucha|adicci\\w*|rehabilit\\w*|hipot[eé]tic\\w*|supongamos|imagina\\w*");
const HYP = W("qu[eé] (?:pasa|pasar[ií]a|ocurre|ocurrir[ií]a|sucede|suceder[ií]a|pasar[aá]) si");
// evasiones simples: «m4tar», «b0mba», «b o m b a»
const LEET = { 0: "o", 1: "i", 3: "e", 4: "a", 5: "s", 7: "t", "@": "a", "$": "s" };
const norm = (t) => t.replace(/(?<=\p{L})[013457@$](?=\p{L})/gu, (c) => LEET[c]).replace(/(?<![\p{L}\d])(?:\p{L}[ .\-_*]){3,}\p{L}(?![\p{L}\d])/gu, (m) => m.replace(/[ .\-_*]/g, ""));
const RANK = { none: 0, warn: 1, severe: 2 };
const LEGIT_DRUG = W(String.raw`medicinal\w*|reprocann|legalmente|legal|con receta|farmac\w*|cient[ií]fic\w*`);
// devuelve {level:'none'|'warn'|'severe', cat, soft?}. «soft»: aviso por contexto (ficción, juego…) que no suma strikes. Función pura: no toca la base de datos.
function misuseOne(t) {
  if (t.length < 8) return { level: "none", cat: "" };
  for (const m of MIS) { if (!m.re.some((r) => r.test(t))) continue;
    if (m.cat === "autolesion") return { level: "warn", cat: m.cat }; // se acompaña, no se castiga
    if (m.always) return { level: "severe", cat: m.cat };
    if (m.cat === "drogas" && LEGIT_DRUG.test(t)) return { level: "warn", cat: m.cat, soft: true };
    if (CTX.test(t)) return m.strict ? { level: "warn", cat: m.cat, soft: true } : { level: "none", cat: "" };
    if (HYP.test(t)) return { level: "warn", cat: m.cat };
    return { level: "severe", cat: m.cat }; }
  return { level: "none", cat: "" };
}
function misuseCheck(text) {
  const all = norm(String(text || "").normalize("NFC").replace(/\s+/g, " ")); let best = { level: "none", cat: "" };
  // se revisa TODO el mensaje por tramos solapados (rellenar con texto al inicio no debe ocultar el pedido)
  for (let i = 0; i < all.length && i < 24000; i += 4500) { const r = misuseOne(all.slice(i, i + 6000)); if (RANK[r.level] > RANK[best.level]) best = r; if (best.level === "severe") break; }
  return best;
}
export { misuseCheck };
const MSG_BLOCKED = "Su sesión está bloqueada por uso indebido. Solo el administrador puede reactivarla.";
const MSG_NEWBLOCK = "Calex no debe utilizarse para planear ni cometer actos que causen daño a otras personas. Por este motivo, su sesión ha sido bloqueada. Solo el administrador puede reactivarla.";
const NOTE_WARN = " AVISO DE SEGURIDAD: el último mensaje del usuario se acerca a un uso que podría causar daño. Responda con formalidad y brevedad: no entregue instrucciones operativas que permitan causar daño, ofrezca la parte legítima o informativa si la hay, y recuerde en una sola frase que Calex no debe usarse para causar daño. No moralice más de lo necesario.";
const NOTE_SELF = " AVISO: el usuario podría estar atravesando un momento muy difícil. Responda con calidez y sobriedad, sin entregar ningún método ni detalle que facilite hacerse daño. Exprese que su vida importa, anímelo a hablar con una persona de confianza y a contactar de inmediato un servicio de ayuda (en Argentina, la línea 135, o el 107 en una emergencia). No lo regañe ni lo derive de forma fría.";
const oneShot = (events) => new Response(new ReadableStream({ start(c) { for (const e of events) c.enqueue(sse(e)); c.close(); } }), { headers: { "Content-Type": "text/event-stream; charset=utf-8", "Cache-Control": "no-cache", ...SEC } });
const blockUser = (env, uid, reason) => q(env, "INSERT INTO strikes(user_id,n,blocked,reason,last,blocked_at) VALUES(?,1,1,?,?,?) ON CONFLICT(user_id) DO UPDATE SET n=n+1, blocked=1, reason=excluded.reason, last=excluded.last, blocked_at=excluded.blocked_at", uid, reason, Date.now(), Date.now()).run();
async function addStrike(env, uid, reason) { await q(env, "INSERT INTO strikes(user_id,n,blocked,reason,last) VALUES(?,1,0,?,?) ON CONFLICT(user_id) DO UPDATE SET n=CASE WHEN strikes.last < ? THEN 1 ELSE strikes.n+1 END, reason=excluded.reason, last=excluded.last", uid, reason, Date.now(), Date.now() - 7 * 864e5).run(); return (await q(env, "SELECT n FROM strikes WHERE user_id=?", uid).first())?.n || 1; }
// clave del responsable (la misma de /owner/paises), comparada en tiempo constante
function ownerOk(url, env) { const k = String(url.searchParams.get("key") || ""), want = String(env.STATS_KEY || "");
  let same = want.length >= 8 && k.length === want.length; if (same) { let d = 0; for (let i = 0; i < k.length; i++) d |= k.charCodeAt(i) ^ want.charCodeAt(i); same = d === 0; } return same; }


// ---------- búsqueda en la web (DuckDuckGo, sin clave): Calex muestra en qué páginas busca ----------
/* Calex siempre sabe qué día es y, para lo que pueda haber cambiado desde que se entrenó el modelo, consulta internet */
function nowLine() { try { const d = new Date(), f = (o) => new Intl.DateTimeFormat("es-AR", { timeZone: "America/Argentina/Buenos_Aires", ...o }).format(d); return `HOY ES ${f({ weekday: "long", day: "numeric", month: "long", year: "numeric" })}, ${f({ hour: "2-digit", minute: "2-digit", hour12: false })} (hora de Argentina). Tu conocimiento de entrenamiento termina en una fecha anterior a hoy: no asumas que lo que sabes es lo más reciente. Para personas, cargos, precios, noticias, resultados, productos o versiones que puedan haber cambiado, usa los resultados de búsqueda web que se te entreguen; si no los hay, aclara que no puedes confirmar lo más reciente.`; } catch { return ""; } }
const FACT_RE = /(qui[eé]n(es)? (es|son|fue|fueron|gan[oó]|est[aá]|era)|qu[eé] (pas[oó]|hay|es|son|significa|dijo|hizo|tal)|cu[aá]nd[oó] (es|fue|se|sale|juega|empieza|termina|muri[oó]|naci[oó])|d[oó]nde (queda|est[aá]|se|puedo)|cu[aá]nto (cuesta|vale|sale|mide|pesa|falta|hace)|cu[aá]l (es|fue|ser[aá]|son) (el|la|los|las|mejor|ultim|actual|nuevo)|es verdad que|existe (un|una|el|la)|actualmente|actual|reciente|nuevo|nueva|este (mes|a[nñ]o|lunes|martes|mi[eé]rcoles|jueves|viernes|s[aá]bado|domingo)|20(2[3-9]|3\d)|presidente|campe[oó]n|ganador|versi[oó]n|lanzamiento|estreno|temporada|elecciones|ley |decreto|mundial|liga|\bvs\b)/i;
const SKIP_RE = /^\s*(escrib[ei]|redact[ae]|traduc[ei]|resum[ei]|corrig[ei]|gener[ae]|cre[ae]|programa|haz(me)?|dame un (poema|cuento|chiste)|cu[eé]ntame un|expl[ií]came|ayúdame|ay[uú]dame)\b/i;
const WEB_RE = /(busc[aáoe]|investig|googlea|en internet|en la web|noticia|actualidad|[uú]ltim[oa]s? (noticia|dato|version|versión|partido)|precio|cotizaci|d[oó]lar|clima|pron[oó]stico|qui[eé]n (es|gan[oó]|fue)|cu[aá]ndo (es|juega|sale|empieza)|resultado|partido|estreno|este a[nñ]o|hoy en|horario de|d[oó]nde (queda|puedo comprar))/i;
const decEnt = (t) => String(t).replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#x27;|&#39;/g, "'").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();
const MES = { ene: 0, feb: 1, mar: 2, abr: 3, may: 4, jun: 5, jul: 6, ago: 7, sep: 8, set: 8, oct: 9, nov: 10, dic: 11 };
function parseFecha(t) { t = String(t || "").trim(); let d = Date.parse(t); if (d) return d; const m = /(\d{1,2})\s+([a-záéíóú]{3})[a-z.]*\s+(\d{4})(?:\s+(\d{1,2}):(\d{2}))?/i.exec(t); return m && MES[m[2].toLowerCase().slice(0, 3)] !== undefined ? Date.UTC(+m[3], MES[m[2].toLowerCase().slice(0, 3)], +m[1], +(m[4] || 0), +(m[5] || 0)) : 0; }
const rssTag = (x, t) => { const m = new RegExp("<" + t + "(?:\\s[^>]*)?>([\\s\\S]*?)</" + t + ">", "i").exec(x); return m ? decEnt(m[1].replace(/^<!\[CDATA\[|\]\]>$/g, "")) : ""; };
async function rssItems(url, kind) {
  const r = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0 (compatible; CalexBot/1.0)", "Accept-Language": "es" }, signal: AbortSignal.timeout(6500) });
  if (!r.ok) return [];
  const xml = await r.text(), out = []; let m; const re = /<item>([\s\S]*?)<\/item>/g;
  while ((m = re.exec(xml)) && out.length < 8) {
    const it = m[1], title = rssTag(it, "title"), link = rssTag(it, "link"), desc = rssTag(it, "description");
    let host = "", su = /<source[^>]+url="([^"]+)"/i.exec(it), bsrc = rssTag(it, "News:Source"); try { host = new URL(su ? su[1] : link).hostname.replace(/^www\./, ""); } catch { continue; } if (/(^|\.)bing\.com$/.test(host) && bsrc) host = bsrc.slice(0, 60);
    if (!/^https?:\/\//i.test(link)) continue;
    const pdt = parseFecha(rssTag(it, "pubDate"));
    out.push({ date: pdt, title: (kind === "news" ? title.replace(/\s+-\s+[^-]{2,40}$/, "") : title).slice(0, 140), url: link.slice(0, 600), host, snippet: kind === "news" ? (su ? rssTag(it, "source") + " · " : "") + (rssTag(it, "pubDate") || "").slice(0, 22) : desc.slice(0, 260) });
  }
  return out;
}
// FAMOSOS: los medios y sitios más conocidos van primero (por dominio o por el nombre que informa Bing Noticias)
const FAMOSOS = [
  [3, /(infobae|clar[ií]n|la naci[oó]n|lanacion|bbc|cnn|reuters|ap news|apnews|associated press|el pa[ií]s|elpais|new york times|nytimes|wikipedia|ambito|[aá]mbito|cronista|tn\.com|todo noticias|perfil|p[aá]gina\/?12|pagina12|france ?24|dw\.com|deutsche welle|bloomberg|the guardian|washington post|el mundo|elmundo|\.gob\.ar|\.gov|argentina\.gob)/i],
  [2, /(la voz|lavoz|cadena ?3|ol[eé]\b|ole\.com|tyc ?sports|tycsports|espn|marca|as\.com|el dia|eldia|los andes|losandes|rosario3|la capital|uno\.com|diario uno|el litoral|eltribuno|ellitoral|telam|t[eé]lam|noticias argentinas|minutouno|mdz|iprofesional|infocampo|canal 13|c5n|a24|el destape|eldestape|diario registrado|el once|lanueva|la gaceta|lagaceta|msn|yahoo|google|youtube)/i],
  [1, /\.(com|com\.ar|ar|org|net|es)$/i],
];
const famoso = (host) => { const h = String(host || ""); for (const [t, re] of FAMOSOS) if (re.test(h)) return t; return 0; };
async function webSearch(env, query) {
  if (String(env.WEB_SEARCH || "") === "off") return [];
  const clean = String(query).replace(/^(busc[aá]|investig[aá]|googlea)\s+(en internet|en la web|en google)?\s*/i, "").slice(0, 200), year = new Date().getFullYear(), hasYear = /20\d\d/.test(clean);
  const news = /noticia|actualidad|[uú]ltim|hoy|ahora|partido|resultado|estreno|pol[ií]tica|d[oó]lar|cotizaci|esta semana|este mes|recient/i.test(query), enc = encodeURIComponent;
  const gn = (w) => rssItems("https://news.google.com/rss/search?hl=es-419&gl=AR&ceid=AR:es-419&q=" + enc(clean + " when:" + w), "news");
  const bing = (q, f) => rssItems("https://www.bing.com/search?format=rss&setlang=es&cc=AR" + (f ? "&filters=" + enc('ex1:"' + f + '"') : "") + "&q=" + enc(q), "web");
  // siempre se piden primero las fuentes más recientes (último día, última semana, último mes) y después las generales
  const bn = (srt) => rssItems("https://www.bing.com/news/search?format=rss&setlang=es&cc=AR" + (srt ? "&qft=" + enc('sortbydate="1"') : "") + "&q=" + enc(clean), "news");
  const jobs = news ? [gn("1d"), gn("7d"), bn(false), bn(true), bing(clean, "ez1"), bing(clean + (hasYear ? "" : " " + year), "ez2")] : [bing(clean + (hasYear ? "" : " " + year), "ez3"), bing(clean), wikiItems(enc(clean))];
  const res = (await Promise.all(jobs.map((j) => j.catch(() => [])))).flat(), now = Date.now(), seen = new Set(), uniq = [];
  for (const it of res) { const k = it.url.replace(/[?#].*$/, ""); if (seen.has(k)) continue; seen.add(k); if (it.date > now + 864e5) it.date = 0; uniq.push(it); }
  // más recientes primero; lo que no trae fecha (por ejemplo Wikipedia) va después de lo fechado de esta semana
  // para noticias, solo lo de los últimos 7 días si hay suficiente; después, primero lo más famoso y, a igual fama, lo más reciente
  const week = now - 7 * 864e5, pool = news && uniq.filter((x) => x.date >= week).length >= 3 ? uniq.filter((x) => x.date >= week) : uniq;
  const fresh = (x) => (x.date >= now - 36 * 36e5 ? 6 : x.date >= now - 3 * 864e5 ? 4 : x.date >= week ? 2 : x.date > 0 ? 0 : 1), score = (x) => famoso(x.host) * 10 + fresh(x);
  const sorted = [...pool].sort((x, y) => score(y) - score(x) || y.date - x.date);
  uniq.length = 0; uniq.push(...sorted);
  const out = [], hosts = new Set();
  for (const it of uniq) { if (hosts.has(it.host) && out.length >= 3) continue; hosts.add(it.host); out.push(it); if (out.length >= 6) break; }
  // lee el contenido de las dos primeras páginas (no de Google Noticias, que redirige) para responder con más detalle
  await Promise.all(out.filter((o) => !/news\.google\.com/.test(o.url) && o.host !== "es.wikipedia.org").slice(0, 2).map(async (o) => { try { const r = await fetch(o.url, { headers: { "User-Agent": "Mozilla/5.0 (compatible; CalexBot/1.0)", "Accept-Language": "es" }, signal: AbortSignal.timeout(3500), redirect: "follow" }); if (!r.ok || !/text\/html/i.test(r.headers.get("content-type") || "")) return; const h = (await r.text()).slice(0, 200000), txt = decEnt(h.replace(/<(script|style|noscript|svg|nav|footer|header)[\s\S]*?<\/\1>/gi, " ")).slice(0, 1100); if (txt.length > 200) o.text = txt; } catch {} }));
  return out;
}
async function wikiItems(qq) {
  const r = await fetch("https://es.wikipedia.org/w/api.php?action=query&format=json&origin=*&generator=search&gsrlimit=2&gsrsearch=" + qq + "&prop=extracts&exintro=1&explaintext=1&exlimit=2&exchars=700", { headers: { "User-Agent": "CalexBot/1.0" }, signal: AbortSignal.timeout(4000) });
  if (!r.ok) return []; const j = await r.json().catch(() => null), pages = j && j.query && j.query.pages ? Object.values(j.query.pages).sort((a, b) => (a.index || 0) - (b.index || 0)) : [];
  return pages.filter((p) => p.extract).slice(0, 1).map((p) => ({ title: String(p.title).slice(0, 140), url: "https://es.wikipedia.org/wiki/" + encodeURIComponent(String(p.title).replace(/ /g, "_")), host: "es.wikipedia.org", snippet: String(p.extract).replace(/\s+/g, " ").slice(0, 400) }));
}

async function chatRoute(req, env, user, ctx) {
  const b = await req.json().catch(() => ({})), message = String(b.message || "").trim().slice(0, 24000);
  if (!message) return json({ error: "Mensaje vacío" }, 400);
  // 1) sesión bloqueada por uso indebido: solo el responsable puede reactivarla
  if ((await q(env, "SELECT blocked FROM strikes WHERE user_id=?", user.id).first())?.blocked) return oneShot([{ type: "error", text: MSG_BLOCKED }, { type: "done" }]);
  // 2) anti-abuso silencioso: 40 mensajes por minuto y por usuario
  if (!(await hit(env, "chat:" + user.id, 40, 60))) return oneShot([{ type: "error", text: "Está enviando mensajes con demasiada rapidez. Por favor, aguarde unos segundos e inténtelo nuevamente." }, { type: "done" }]);
  // 3) moderación: intención operativa de causar daño
  const mis = misuseCheck(message); let modNote = "";
  if (mis.level === "severe") { await blockUser(env, user.id, mis.cat + ": " + message.slice(0, 140).replace(/\s+/g, " ")); return oneShot([{ type: "error", text: MSG_NEWBLOCK }, { type: "done" }]); }
  if (mis.level === "warn") {
    if (mis.cat === "autolesion") modNote = NOTE_SELF; // se acompaña, no se suma ningún aviso
    else if (mis.soft) modNote = NOTE_WARN; // contexto de ficción, juego o uso legítimo: se responde con cautela, sin sumar avisos
    else { const n = await addStrike(env, user.id, mis.cat + ": " + message.slice(0, 140).replace(/\s+/g, " "));
      if (n >= 3) { await blockUser(env, user.id, "reincidencia (" + mis.cat + "): " + message.slice(0, 140).replace(/\s+/g, " ")); return oneShot([{ type: "error", text: MSG_NEWBLOCK }, { type: "done" }]); }
      modNote = NOTE_WARN; } }
  const calm = !!modNote; // con un aviso activo se responde solo en modo charla (sin Studio ni modelo de código)
  const day = new Date().toISOString().slice(0, 10), limit = +env.DAILY_LIMIT > 0 ? +env.DAILY_LIMIT : Infinity, level = lvlOf(b); // sin DAILY_LIMIT (o en 0) el uso es ilimitado
  const PM = pickModels(env), userPick = PM.text.find((m) => m.id === b.model) || PM.def;
  const hasImg = Array.isArray(b.images) && b.images.some((x) => typeof x === "string" && /^data:image\//.test(x));
  const profile = user.profile ? JSON.parse(user.profile) : null;
  let chat = b.chatId ? await q(env, "SELECT * FROM chats WHERE id=? AND user_id=?", String(b.chatId), user.id).first() : null;
  const id = chat?.id || crypto.randomUUID(), msgs = chat ? JSON.parse(chat.messages) : [], title = chat?.title || message.slice(0, 44);
  const images = (Array.isArray(b.images) ? b.images : []).slice(0, 8).map(String).filter((s) => s.length < 1.6e6 && /^data:image\//.test(s));
  const docs = (Array.isArray(b.docs) ? b.docs : []).slice(0, 12).map((d) => ({ name: String(d?.name || "documento").replace(/[\r\n]/g, " ").slice(0, 80), text: String(d?.text || "").slice(0, 14000) })).filter((d) => d.text.trim());
  { const perDoc = Math.max(2500, Math.floor(42000 / Math.max(1, docs.length))); docs.forEach((d) => { d.text = d.text.slice(0, perDoc); }); } // con muchos documentos, cada uno se lee más resumido para que quepan en el contexto
  const lastSpec = [...msgs].reverse().find((m) => m.spec)?.spec;
  // qué hay que hacer: una página (Calex Studio), cambiarla, programar (modelo de código) o conversar
  const wantsSite = !calm && !hasImg && !b.live && !docs.length && SITE_RE.test(message) && MAKE_RE.test(message);
  const wantsEdit = !calm && !wantsSite && !hasImg && !b.live && !!lastSpec && message.length < 500 && EDIT_RE.test(message);
  const wantsCode = !calm && !wantsSite && !wantsEdit && !hasImg && !b.live && !docs.length && PM.coder && CODE_RE.test(message) && (MAKE_RE.test(message) || /```/.test(message));
  const route = wantsSite ? "site" : wantsEdit ? "edit" : wantsCode ? "code" : "chat";
  // esfuerzo: Rápido usa el modelo más liviano, Profundo asegura un modelo grande
  const light = [...PM.text].sort((x, y) => x.w - y.w)[0], big = [...PM.text].sort((x, y) => y.w - x.w)[0];
  const picked = level < 34 && !hasImg ? light : level >= 67 && userPick.w < big.w ? big : userPick;
  const premChat = route === "chat" && !hasImg && level >= 34 && orReady(env, env.OR_CHAT_MODEL) ? env.OR_CHAT_MODEL : "";
  const chosen = hasImg ? PM.vis : route === "code" ? PM.coder : picked, model = premChat || chosen.id;
  const weight = route === "site" ? 12 : route === "edit" ? 6 : route === "code" ? (PM.coder.w || 3) + (level >= 67 ? 2 : 0) : chosen.w || 1;
  await q(env, "INSERT INTO usage(user_id,day,n) VALUES(?,?,?) ON CONFLICT(user_id,day) DO UPDATE SET n=n+?", user.id, day, weight, weight).run();
  const used = (await q(env, "SELECT n FROM usage WHERE user_id=? AND day=?", user.id, day).first())?.n || 1;
  msgs.push({ role: "user", content: message, ...(docs.length && { docs: docs.map((d) => ({ name: d.name, text: d.text.slice(0, 9000) })) }) });
  const cids = (await q(env, "SELECT id FROM connections WHERE user_id=?", user.id).all()).results.map((r) => r.id);
  const sys = `${ALLINONE(level, b.live)}${b.live ? "" : ARCHIVOS_SYS} ${nowLine()} ${persona(profile)}${FAMILY}${CN.promptFor(cids, { music: b.music === true })}${modNote}`.trim();
  const hist = msgs.filter((m) => m.content).slice(-20).map((m) => ({ role: m.role, content: m.spec ? `[Se generó la página «${m.spec.title}» con Calex Studio]` : m.docs?.length ? m.docs.map((d) => `[Documento adjunto: ${d.name}]\n${d.text}`).join("\n\n") + "\n\n" + m.content : m.content }));
  if (images.length) hist[hist.length - 1].content = [{ type: "text", text: message }, ...images.map((u) => ({ type: "image_url", image_url: { url: u } }))];
  const stream = new ReadableStream({ async start(ctrl) {
    const send = (o) => ctrl.enqueue(sse(o)); let text = "", spec = null, sources = null;
    // transmite una respuesta del modelo; si el modelo elegido falla, vuelve al estándar
    const run = async (mdl, messages, maxTok) => {
      const payload = { messages, stream: true, max_tokens: maxTok }; let out;
      try { out = await aiRun(env, mdl, payload); } catch (e1) { if (env.NOFALLBACK || /license|agree/i.test(String(e1.message)) || mdl === PM.def.id || images.length) throw e1; const fb = route === "code" && PM.coderFree && mdl !== PM.coderFree.id ? PM.coderFree.id : PM.def.id; out = await env.AI.run(fb, payload); send({ type: "model", model: "" + fb.split("/").pop() }); }
      let got = "";
      if (out && typeof out.getReader === "function") {
        const rd = out.getReader(), dec = new TextDecoder(); let buf = "";
        for (;;) { const { done, value } = await rd.read(); if (done) break; buf += dec.decode(value, { stream: true }); let i;
          while ((i = buf.indexOf("\n")) >= 0) { const line = buf.slice(0, i).trim(); buf = buf.slice(i + 1); if (!line.startsWith("data:")) continue; const d = line.slice(5).trim(); if (d === "[DONE]") continue;
            try { const j = JSON.parse(d), t = j.response ?? j.choices?.[0]?.delta?.content; if (t) { got += t; text += t; send({ type: "token", text: t }); } } catch {} } }
      } else { const t = out?.response || out?.result?.response || ""; if (t) { got = t; text += t; send({ type: "token", text: t }); } }
      return got;
    };
    send({ type: "chat", id }); send({ type: "model", model: route === "site" || route === "edit" ? "Calex Studio" : "" + model.replace(/^or:/, "").split("/").pop() });
    try {
      if (used > limit) throw Object.assign(new Error("limit"), { limit: true });
      if (route === "site" || route === "edit") {
        send({ type: "progress", text: route === "edit" ? "Aplicando tu cambio…" : "Pensando la dirección creativa y los textos…" });
        spec = await makeSpec(env, user, [env.STUDIO_MODEL && (!isOR(env.STUDIO_MODEL) || orReady(env, env.STUDIO_MODEL)) ? env.STUDIO_MODEL : "", PM.def.id], message, level, route === "edit" ? lastSpec : null);
        if (!spec) throw new Error("no pude armar el diseño; inténtalo de nuevo");
        send({ type: "progress", text: "Armando secciones, shaders y texturas…" });
        let html = buildSite(spec), review = "";
        if (env.BROWSER && level >= 34 && !env.NO_EYES) { // la revisa con capturas de pantalla (si el navegador de Cloudflare no está disponible o falla, se entrega igual)
          try { send({ type: "progress", text: "Mirando cómo quedó la página…" }); const look = await withTimeout(lookAtPage(env, html), 50000), cr = await withTimeout(critiquePage(env, PM, message, look), 40000);
            if (cr && typeof cr === "object") { const bad = (cr.problems || []).some((p) => +p.severity >= 2), f = cr.fixes || {}, before = JSON.stringify(spec.theme);
              if (+cr.score <= 6 && bad) { if (f.preset && PRESETS_OK.includes(f.preset) && /contraste|legib|ilegible|oscur|claro/i.test(JSON.stringify(cr.problems))) { spec.theme.preset = f.preset; for (const k of ["bg", "sf", "tx", "mu", "ac", "ac2"]) delete spec.theme[k]; }
                if (f.shader && ["warp", "aurora", "nebula"].includes(f.shader) && +cr.score <= 5) spec.theme.shader = f.shader; if (f.font && ["serif", "sans", "grotesk", "mono", "rounded"].includes(f.font) && +cr.score <= 5) spec.theme.font = f.font; }
              if (JSON.stringify(spec.theme) !== before) html = buildSite(spec);
              review = String(cr.summary || "").slice(0, 300).replace(/\s+/g, " "); if (review && +cr.score) { const changed = JSON.stringify(spec.theme) !== before; review += " Nota visual: " + Math.round(+cr.score) + "/10." + (changed ? " Ajusté la paleta o el estilo según lo que vi." : "") + (!look.info.webgl || look.info.tex < look.info.texTotal ? " (El navegador de captura no tiene tarjeta gráfica: no evalué el fondo animado ni las texturas.)" : ""); } } } catch (e) { console.error("revisión visual:", e && e.message); } }
        const intro = `Listo: armé «${spec.title}» con diseño propio, fondo animado y texturas procedurales (hasta 4K en pantallas capaces).\n\n`, outro = (review ? "\n\nRevisión visual: " + review : "") + "\n\nToca «Vista previa» para verla o «Descargar» para guardarla. Pídeme cambios (colores, secciones, textos, estilo) y la ajusto.";
        const full = intro + "```html\n" + html + "\n```" + outro; for (let i = 0; i < full.length; i += 900) { const t = full.slice(i, i + 900); text += t; send({ type: "token", text: t }); }
      } else if (route === "code") {
        const promptTok = Math.ceil(JSON.stringify([CODE_SYS, ...hist]).length / 3), cap = Math.max(1500, Math.min(level < 34 ? 3500 : level < 67 ? 7000 : 11000, 30000 - promptTok));
        let part = await run(model, [{ role: "system", content: CODE_SYS }, ...hist], cap);
        for (let k = 0; k < 2 && /```html/i.test(part) && !/<\/html>\s*(```|$)/i.test(part.slice(-400)) && part.length > 2500; k++) { // si se cortó a la mitad, continúa
          send({ type: "progress", text: "Continuando el código…" }); part = await run(model, [{ role: "system", content: CODE_SYS }, ...hist, { role: "assistant", content: text.slice(-9000) }, { role: "user", content: "Continúa exactamente donde quedaste, sin repetir nada y sin volver a abrir el bloque de código; cierra el archivo y el bloque ```." }], cap); }
      } else {
        const outCap = b.live ? 220 : level < 34 ? 450 : level < 67 ? 1000 : 1900;
        let webCtx = "";
        if (route === "chat" && !images.length && !docs.length && message.length <= 500 && (WEB_RE.test(message) || (FACT_RE.test(message) && !SKIP_RE.test(message)))) {
          send({ type: "search", state: "start" });
          const found = await webSearch(env, message);
          if (found.length) { sources = found; send({ type: "sources", items: found }); webCtx = "\n\nRESULTADOS DE BÚSQUEDA WEB (acabas de consultar internet; úsalos para dar información actual y nunca digas que no puedes buscar):\n" + found.map((f, i) => "[" + (i + 1) + "] " + (f.date ? "(" + new Intl.DateTimeFormat("es-AR", { timeZone: "America/Argentina/Buenos_Aires", day: "numeric", month: "long", year: "numeric" }).format(new Date(f.date)) + ") " : "(sin fecha) ") + f.title + " (" + f.host + "): " + f.snippet + (f.text ? "\nContenido de la página: " + f.text : "")).join("\n") + "\nLas fuentes están ordenadas de las más conocidas y prestigiosas a las menos conocidas, priorizando las más recientes, y cada una indica su fecha: da prioridad a las primeras y a las de hoy y de los últimos días sobre las antiguas, menciona la fecha de la fuente cuando importe y avisa si lo más reciente que encontraste tiene más de unos días o semanas. Responde con esos datos, menciona entre corchetes el número de la fuente ([1], [2]) y no inventes lo que no aparezca en los resultados."; }
          else send({ type: "search", state: "none" });
        }
        await run(model, [{ role: "system", content: sys + webCtx }, ...hist], outCap);
      }
      if (!text) throw new Error("respuesta vacía");
    } catch (e) {
      send({ type: "error", text: e.limit ? `Llegaste al límite diario gratuito. Las páginas y los modelos grandes gastan más cupo: prueba con esfuerzo Rápido o vuelve mañana.` : /license|agree/i.test(e.message) ? "El modelo de imágenes necesita aceptar su licencia una vez en el panel de Cloudflare (AI → Workers AI)." : `La IA no respondió (${String(e.message).slice(0, 120)}). Puede que se haya agotado el cupo gratuito de hoy.` }); }
    if (text) { msgs.push({ role: "assistant", content: text, ...(spec && { spec }), ...(sources && { sources }) }); await q(env, "INSERT INTO chats(id,user_id,title,pinned,updated,messages) VALUES(?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET messages=excluded.messages, updated=excluded.updated",
      id, user.id, title, chat?.pinned || 0, Date.now(), JSON.stringify(msgs.slice(-24))).run(); }
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
    await env.DB.batch(["DELETE FROM chats WHERE user_id=?", "DELETE FROM sessions WHERE user_id=?", "DELETE FROM usage WHERE user_id=?", "DELETE FROM passkeys WHERE user_id=?", "DELETE FROM pk_challenges WHERE user_id=?", "DELETE FROM strikes WHERE user_id=? AND blocked=0", "DELETE FROM users WHERE id=?"].map((s) => q(env, s, user.id)));
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
      // iPhone: Apple no deja instalar apps fuera de la App Store sin cuenta de desarrollador; este perfil agrega Calex a la pantalla de inicio como una app a pantalla completa (Web Clip).
      if (url.pathname === "/Calex-iPhone.mobileconfig") {
        const ic = await env.ASSETS.fetch(new Request(new URL("/icon-180.png", url))), bytes = new Uint8Array(await ic.arrayBuffer()); let bin = ""; for (let i = 0; i < bytes.length; i += 8192) bin += String.fromCharCode(...bytes.subarray(i, i + 8192));
        const home = url.origin + "/", plist = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
<key>PayloadContent</key><array><dict>
<key>FullScreen</key><true/><key>IsRemovable</key><true/><key>Precomposed</key><true/><key>Label</key><string>Calex</string>
<key>Icon</key><data>${btoa(bin)}</data><key>URL</key><string>${home}</string>
<key>PayloadDescription</key><string>Agrega Calex a tu pantalla de inicio</string><key>PayloadDisplayName</key><string>Calex</string>
<key>PayloadIdentifier</key><string>com.calex.webclip.app</string><key>PayloadType</key><string>com.apple.webClip.managed</string>
<key>PayloadUUID</key><string>7B1D5C0E-3F7A-4B8E-9C21-5A6E0D4F1A01</string><key>PayloadVersion</key><integer>1</integer>
</dict></array>
<key>PayloadDescription</key><string>Instala Calex en tu pantalla de inicio. No cambia ningún ajuste de tu iPhone.</string>
<key>PayloadDisplayName</key><string>Calex</string><key>PayloadIdentifier</key><string>com.calex.webclip</string>
<key>PayloadOrganization</key><string>Calex</string><key>PayloadRemovalDisallowed</key><false/><key>PayloadType</key><string>Configuration</string>
<key>PayloadUUID</key><string>2E9A64B7-0C3D-4F15-8A7B-91D3E5C6B802</string><key>PayloadVersion</key><integer>1</integer>
</dict></plist>`;
        return new Response(plist, { headers: { "Content-Type": "application/x-apple-aspen-config", "Content-Disposition": 'attachment; filename="Calex-iPhone.mobileconfig"', "Cache-Control": "no-store", ...SEC } });
      }
      if (url.pathname === "/.well-known/apple-developer-domain-association.txt") return env.APPLE_DOMAIN_ASSOCIATION ? new Response(String(env.APPLE_DOMAIN_ASSOCIATION), { headers: { "Content-Type": "text/plain; charset=utf-8", ...SEC } }) : json({}, 404); // verificación de dominio de Apple (se guarda como secreto)
      // estadística privada del responsable: solo el PAÍS aproximado de cada visita, agregado por día (sin IP, sin ciudad, sin cuenta). Nada de esto aparece en la interfaz.
      if (url.pathname === "/owner/paises") {
        if (!ownerOk(url, env)) return json({}, 404); // sin clave correcta ni siquiera se sabe que existe
        const since = new Date(Date.now() - 30 * 864e5).toISOString().slice(0, 10), rows = (await q(env, "SELECT country, SUM(n) n FROM visits WHERE day>=? GROUP BY country ORDER BY n DESC", since).all()).results;
        return json({ desde: since, total: rows.reduce((a, r) => a + r.n, 0), paises: rows.map((r) => ({ pais: r.country, visitas: r.n })) }, 200, { "Cache-Control": "no-store" });
      }
      // moderación: lista de sesiones bloqueadas y reactivación (misma clave que /owner/paises)
      if (url.pathname === "/owner/bloqueos") {
        if (!ownerOk(url, env)) return json({}, 404);
        const rows = (await q(env, "SELECT s.user_id id, s.n n, s.reason reason, s.blocked_at at, u.name name, u.email email FROM strikes s LEFT JOIN users u ON u.id=s.user_id WHERE s.blocked=1 ORDER BY s.blocked_at DESC LIMIT 200").all()).results;
        return json({ total: rows.length, bloqueados: rows.map((r) => ({ id: r.id, nombre: r.name || "", correo: r.email || "", motivo: r.reason || "", avisos: r.n || 0, fecha: r.at ? new Date(r.at).toISOString() : "" })) }, 200, { "Cache-Control": "no-store" });
      }
      if (url.pathname === "/owner/desbloquear" && (req.method === "GET" || req.method === "POST")) {
        if (!ownerOk(url, env)) return json({}, 404);
        const id = String(url.searchParams.get("id") || "").slice(0, 100); if (!id) return json({ error: "Falta el id" }, 400);
        const r = await q(env, "UPDATE strikes SET blocked=0, n=0, reason=NULL, blocked_at=NULL WHERE user_id=?", id).run();
        return json({ ok: true, id, desbloqueado: (r?.meta?.changes ?? 0) > 0 }, 200, { "Cache-Control": "no-store" });
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
