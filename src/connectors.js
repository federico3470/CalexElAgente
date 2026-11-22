// Conectores (estilo «apps» de ChatGPT): vincular Gmail, Calendar, Drive, Spotify, GitHub, Telegram… y que la IA los use.
// Un solo archivo para Calex (Cloudflare Worker) y Dot (Node): solo usa fetch y WebCrypto.
// El almacenamiento lo pone quien lo usa («store»); los tokens se guardan CIFRADOS (AES-GCM).
const enc = new TextEncoder(), dec = new TextDecoder();
const b64u = (u8) => btoa(String.fromCharCode(...new Uint8Array(u8))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const unb64u = (s) => Uint8Array.from(atob(String(s).replace(/-/g, "+").replace(/_/g, "/")), (c) => c.charCodeAt(0));
const rnd = (n = 24) => b64u(crypto.getRandomValues(new Uint8Array(n)));
const clip = (s, n) => String(s ?? "").replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, "").slice(0, n);

// ---------- cifrado de tokens ----------
export async function makeVault(secret) {
  const key = await crypto.subtle.importKey("raw", await crypto.subtle.digest("SHA-256", enc.encode("calex-conectores|" + secret)), "AES-GCM", false, ["encrypt", "decrypt"]);
  return {
    async seal(obj) { const iv = crypto.getRandomValues(new Uint8Array(12)); return b64u(iv) + "." + b64u(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, enc.encode(JSON.stringify(obj)))); },
    async open(s) { const [iv, ct] = String(s).split("."); return JSON.parse(dec.decode(await crypto.subtle.decrypt({ name: "AES-GCM", iv: unb64u(iv) }, key, unb64u(ct)))); },
  };
}

// ---------- proveedores OAuth ----------
const PROVIDERS = {
  google: { auth: "https://accounts.google.com/o/oauth2/v2/auth", token: "https://oauth2.googleapis.com/token", id: "GOOGLE_CLIENT_ID", secret: "GOOGLE_CLIENT_SECRET", pkce: true, extra: { access_type: "offline", prompt: "consent", include_granted_scopes: "true" } },
  spotify: { auth: "https://accounts.spotify.com/authorize", token: "https://accounts.spotify.com/api/token", id: "SPOTIFY_CLIENT_ID", secret: null, pkce: true, extra: {} },
  github: { auth: "https://github.com/login/oauth/authorize", token: "https://github.com/login/oauth/access_token", id: "GITHUB_CLIENT_ID", secret: "GITHUB_CLIENT_SECRET", pkce: false, extra: {} },
};
const G = "https://www.googleapis.com/auth/";

// w: 0 = lee (la IA recibe el resultado) · 1 = control (se ejecuta sola, ej. música) · 2 = envía o crea algo (el usuario lo confirma antes)
export const CONNECTORS = {
  gmail: { name: "Gmail", icon: "Gm", cat: "Correo", kind: "oauth", prov: "google", scope: G + "gmail.readonly " + G + "gmail.send", desc: "Lee tus últimos correos y envía mensajes (siempre con tu confirmación).",
    actions: { "gmail.list": { w: 0, d: "lista correos recientes", a: '{"q":"búsqueda opcional como en Gmail","max":5}' }, "gmail.read": { w: 0, d: "lee un correo completo", a: '{"id":"..."}' }, "gmail.send": { w: 2, d: "envía un correo", a: '{"to":"a@b.com","subject":"...","body":"..."}' } } },
  calendar: { name: "Google Calendar", icon: "Ca", cat: "Agenda", kind: "oauth", prov: "google", scope: G + "calendar.events", desc: "Mira tu agenda y crea eventos.",
    actions: { "calendar.list": { w: 0, d: "próximos eventos", a: '{"days":7}' }, "calendar.create": { w: 2, d: "crea un evento", a: '{"title":"...","start":"2026-11-25T18:00","end":"2026-11-25T19:00","description":""}' } } },
  drive: { name: "Google Drive", icon: "Dr", cat: "Archivos", kind: "oauth", prov: "google", scope: G + "drive.readonly", desc: "Busca y lee tus documentos.",
    actions: { "drive.search": { w: 0, d: "busca archivos por nombre", a: '{"q":"texto","max":8}' }, "drive.read": { w: 0, d: "lee el texto de un documento", a: '{"id":"..."}' } } },
  spotify: { name: "Spotify", icon: "Sp", cat: "Música", kind: "oauth", prov: "spotify", scope: "user-read-playback-state user-modify-playback-state user-read-currently-playing", desc: "Controla tu música mientras charlas: pausa, adelanta, sube el volumen o pide una canción. (El control requiere Spotify Premium.)", music: true,
    actions: { "spotify.now": { w: 0, d: "qué suena ahora", a: "{}" }, "spotify.play": { w: 1, d: "reproduce (con query busca esa canción)", a: '{"query":"opcional"}' }, "spotify.pause": { w: 1, d: "pausa", a: "{}" }, "spotify.next": { w: 1, d: "siguiente canción", a: "{}" }, "spotify.prev": { w: 1, d: "canción anterior", a: "{}" }, "spotify.volume": { w: 1, d: "volumen 0-100", a: '{"percent":50}' } } },
  github: { name: "GitHub", icon: "Gh", cat: "Código", kind: "oauth", prov: "github", scope: "read:user repo", desc: "Mira tus repositorios e incidencias y crea incidencias.",
    actions: { "github.repos": { w: 0, d: "tus repositorios recientes", a: "{}" }, "github.issues": { w: 0, d: "incidencias abiertas de un repo", a: '{"repo":"usuario/nombre"}' }, "github.issue_create": { w: 2, d: "crea una incidencia", a: '{"repo":"usuario/nombre","title":"...","body":"..."}' } } },
  telegram: { name: "Telegram", icon: "Tg", cat: "Mensajes", kind: "token", desc: "Envía mensajes a un chat tuyo mediante un bot de Telegram.", fields: [{ k: "bot_token", l: "Token del bot (de @BotFather)", re: /^\d{6,12}:[\w-]{30,50}$/ }, { k: "chat_id", l: "ID del chat", re: /^-?\d{3,20}$/ }],
    actions: { "telegram.send": { w: 2, d: "envía un mensaje", a: '{"text":"..."}' } } },
  discord: { name: "Discord", icon: "Di", cat: "Mensajes", kind: "token", desc: "Publica mensajes en un canal con un webhook.", fields: [{ k: "webhook", l: "URL del webhook", re: /^https:\/\/(discord|discordapp)\.com\/api\/webhooks\/\d+\/[\w-]+$/ }],
    actions: { "discord.send": { w: 2, d: "publica un mensaje", a: '{"text":"..."}' } } },
  slack: { name: "Slack", icon: "Sl", cat: "Mensajes", kind: "token", desc: "Publica mensajes en un canal con un webhook entrante.", fields: [{ k: "webhook", l: "URL del webhook", re: /^https:\/\/hooks\.slack\.com\/services\/[\w/]+$/ }],
    actions: { "slack.send": { w: 2, d: "publica un mensaje", a: '{"text":"..."}' } } },
  ntfy: { name: "Avisos al celular (ntfy)", icon: "Nt", cat: "Avisos", kind: "token", desc: "Te manda avisos al celular con la app gratuita ntfy.", fields: [{ k: "topic", l: "Tu tema secreto (ej. calex-fede-7342)", re: /^[A-Za-z0-9_-]{6,64}$/ }],
    actions: { "ntfy.send": { w: 1, d: "te manda un aviso al celular", a: '{"title":"...","text":"..."}' } } },
  todoist: { name: "Todoist", icon: "To", cat: "Tareas", kind: "token", desc: "Lee y crea tus tareas.", fields: [{ k: "token", l: "Token de API (Todoist → Ajustes → Integraciones)", re: /^[\w]{20,60}$/ }],
    actions: { "todoist.list": { w: 0, d: "tareas pendientes", a: "{}" }, "todoist.add": { w: 1, d: "crea una tarea", a: '{"content":"...","due":"mañana (opcional)"}' } } },
};
export const actionInfo = (name) => { const [c] = String(name).split("."); const a = CONNECTORS[c]?.actions?.[name]; return a ? { connector: c, ...a } : null; };

// ---------- ayuda para el prompt de la IA ----------
const MUSIC_LINES = ['- music.now {}: qué canción suena ahora', '- music.play {"query":"opcional, solo con Spotify"}: reproduce o continúa', "- music.pause {}: pausa", "- music.next {}: siguiente canción", "- music.prev {}: canción anterior", '- music.volume {"percent":50}: volumen 0-100 (solo con Spotify)'];
export function promptFor(ids, { music = false } = {}) {
  const on = ids.filter((i) => CONNECTORS[i]), mus = music || on.includes("spotify"); if (!on.length && !mus) return "";
  const rest = on.filter((i) => i !== "spotify"), lines = rest.flatMap((i) => Object.entries(CONNECTORS[i].actions).map(([n, a]) => "- " + n + " " + a.a + ": " + a.d + (a.w === 2 ? " (pide confirmación al usuario)" : ""))).concat(mus ? MUSIC_LINES : []);
  const names = rest.map((i) => CONNECTORS[i].name).concat(mus ? ["Música"] : []), fence = "```";
  return "\n\nCONECTORES VINCULADOS por el usuario: " + names.join(", ") + ". Para usarlos, responde con una frase breve y UN bloque " + fence + "calex-action que contenga solo este JSON: {\"action\":\"nombre\",\"args\":{...}}. Acciones:\n" + lines.join("\n")
    + "\nReglas: usa un conector solo cuando el usuario lo pida o sea claramente lo que necesita; nunca inventes correos, eventos ni resultados; tras una acción de lectura recibirás un mensaje que empieza con ⟦resultado⟧ con los datos: úsalos para responder (no muestres el JSON crudo); si falta un dato (destinatario, hora…), pregúntalo en vez de adivinar. Las fechas van como AAAA-MM-DDTHH:MM en hora de Argentina; hoy es " + new Date().toISOString().slice(0, 10) + ".";
}

// ---------- OAuth ----------
const ready = (c, env) => { if (c.kind !== "oauth") return true; const p = PROVIDERS[c.prov]; return !!(env[p.id] && (!p.secret || env[p.secret])); };
export async function describe(uid, { env, store }) {
  const mine = await store.all(uid);
  return Object.entries(CONNECTORS).map(([id, c]) => ({ id, name: c.name, icon: c.icon, cat: c.cat, kind: c.kind, desc: c.desc, music: !!c.music, ready: ready(c, env), connected: !!mine[id], at: mine[id]?.at || 0,
    fields: c.fields?.map((f) => ({ k: f.k, l: f.l })), actions: Object.fromEntries(Object.entries(c.actions).map(([k, v]) => [k, v.w])), need: !ready(c, env) ? PROVIDERS[c.prov].id : "" }));
}
export const connectedIds = async (uid, ctx) => Object.keys(await ctx.store.all(uid));

export async function begin(id, { env, uid, store, base, app }) {
  const c = CONNECTORS[id]; if (!c || c.kind !== "oauth") throw new Error("Conector desconocido");
  if (!ready(c, env)) throw new Error("Este conector aún no está activado en el servidor (falta " + PROVIDERS[c.prov].id + ")");
  const p = PROVIDERS[c.prov], state = rnd(18), verifier = p.pkce ? rnd(32) : null;
  const qs = new URLSearchParams({ client_id: env[p.id], redirect_uri: base + "/connectors/callback", response_type: "code", scope: c.scope, state, ...p.extra });
  if (verifier) { qs.set("code_challenge", b64u(await crypto.subtle.digest("SHA-256", enc.encode(verifier)))); qs.set("code_challenge_method", "S256"); }
  await store.putState(state, { uid, id, verifier, app: !!app }, 600000);
  return p.auth + "?" + qs;
}
async function exchange(p, env, body) {
  const form = new URLSearchParams({ client_id: env[p.id], ...body }); if (p.secret) form.set("client_secret", env[p.secret]);
  const r = await fetch(p.token, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" }, body: form }), j = await r.json().catch(() => ({}));
  if (!r.ok || j.error || !j.access_token) throw new Error(j.error_description || j.error || "el proveedor rechazó la petición");
  return j;
}
export async function finish(params, { env, store, base }) {
  const st = await store.takeState(params.get("state") || ""); if (!st) throw Object.assign(new Error("El enlace caducó. Inténtalo de nuevo."), { app: false });
  const fail = (m) => Object.assign(new Error(m), { app: st.app, id: st.id });
  if (params.get("error")) throw fail("Cancelaste la vinculación");
  const c = CONNECTORS[st.id], p = PROVIDERS[c.prov];
  let j; try { j = await exchange(p, env, { grant_type: "authorization_code", code: params.get("code") || "", redirect_uri: base + "/connectors/callback", ...(st.verifier && { code_verifier: st.verifier }) }); } catch (e) { throw fail("No se pudo vincular " + c.name + ": " + e.message); }
  await store.put(st.uid, st.id, { access: j.access_token, refresh: j.refresh_token || "", exp: j.expires_in ? Date.now() + j.expires_in * 1000 : 0, at: Date.now() });
  return { id: st.id, app: st.app };
}
export async function saveToken(id, fields, { uid, store }) {
  const c = CONNECTORS[id]; if (!c || c.kind !== "token") throw new Error("Conector desconocido");
  const d = {}; for (const f of c.fields) { const v = String(fields?.[f.k] ?? "").trim(); if (!f.re.test(v)) throw new Error("Revisa el campo «" + f.l + "»"); d[f.k] = v; }
  await store.put(uid, id, { ...d, at: Date.now() }); return true;
}
export const disconnect = (id, { uid, store }) => store.del(uid, id);

// ---------- ejecutar acciones ----------
const need = (v, what) => { if (v === undefined || v === null || String(v).trim() === "") throw new Error("Falta " + what); return v; };
const mail = (s) => { s = String(s || "").trim(); if (!/^[^\s<>",;]+@[^\s<>",;]+\.[^\s<>",;]+$/.test(s)) throw new Error("Correo no válido: " + clip(s, 40)); return s; };
const b64 = (s) => { const u = enc.encode(s); let r = ""; for (let i = 0; i < u.length; i += 0x8000) r += String.fromCharCode(...u.subarray(i, i + 0x8000)); return btoa(r); };
const hdr = (m, n) => m?.payload?.headers?.find((h) => h.name.toLowerCase() === n)?.value || "";
function bodyText(part) { if (!part) return ""; if (part.mimeType === "text/plain" && part.body?.data) return dec.decode(unb64u(part.body.data)); for (const s of part.parts || []) { const t = bodyText(s); if (t) return t; } if (part.mimeType === "text/html" && part.body?.data) return dec.decode(unb64u(part.body.data)).replace(/<style[\s\S]*?<\/style>|<[^>]+>/g, " ").replace(/\s+/g, " "); return ""; }
const TZ = "America/Argentina/Buenos_Aires";

const IMPL = {
  async "gmail.list"(a, c) { const n = Math.max(1, Math.min(10, +a.max || 5)), l = await c.json(`https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=${n}${a.q ? "&q=" + encodeURIComponent(clip(a.q, 200)) : "&labelIds=INBOX"}`);
    const ms = await Promise.all((l.messages || []).map((m) => c.json(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${m.id}?format=metadata&metadataHeaders=From&metadataHeaders=Subject&metadataHeaders=Date`)));
    return ms.map((m) => ({ id: m.id, de: hdr(m, "from"), asunto: hdr(m, "subject"), fecha: hdr(m, "date"), resumen: clip(m.snippet, 160) })); },
  async "gmail.read"(a, c) { const m = await c.json(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${encodeURIComponent(need(a.id, "el id"))}?format=full`); return { de: hdr(m, "from"), para: hdr(m, "to"), asunto: hdr(m, "subject"), fecha: hdr(m, "date"), texto: clip(bodyText(m.payload), 4000) }; },
  async "gmail.send"(a, c) { const to = mail(a.to), subj = clip(need(a.subject, "el asunto"), 200).replace(/[\r\n]+/g, " "), body = clip(need(a.body, "el texto"), 8000);
    const raw = `To: ${to}\r\nSubject: =?UTF-8?B?${b64(subj)}?=\r\nMIME-Version: 1.0\r\nContent-Type: text/plain; charset=UTF-8\r\nContent-Transfer-Encoding: base64\r\n\r\n${b64(body).replace(/(.{76})/g, "$1\r\n")}`;
    await c.json("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", { method: "POST", body: { raw: b64u(enc.encode(raw)) } }); return { enviado: true, para: to }; },
  async "calendar.list"(a, c) { const d = Math.max(1, Math.min(60, +a.days || 7)), now = new Date(), qs = new URLSearchParams({ timeMin: now.toISOString(), timeMax: new Date(now.getTime() + d * 864e5).toISOString(), singleEvents: "true", orderBy: "startTime", maxResults: "15" });
    const r = await c.json("https://www.googleapis.com/calendar/v3/calendars/primary/events?" + qs); return (r.items || []).map((e) => ({ titulo: e.summary || "(sin título)", inicio: e.start?.dateTime || e.start?.date, fin: e.end?.dateTime || e.end?.date, lugar: e.location || "" })); },
  async "calendar.create"(a, c) { const cl = (v) => String(v || "").replace(/(Z|[+-]dd:dd)$/, "").slice(0, 19), ok = (v) => /^d{4}-dd-ddTdd:dd(:dd)?$/.test(v), plus = (v) => new Date(v + (v.length === 16 ? ":00Z" : "Z")).getTime() + 36e5;
    const st = cl(need(a.start, "la fecha de inicio")); if (!ok(st)) throw new Error("Fecha de inicio no válida (usa AAAA-MM-DDTHH:MM)");
    let en = cl(a.end); if (!ok(en)) en = new Date(plus(st)).toISOString().slice(0, 19);
    const r = await c.json("https://www.googleapis.com/calendar/v3/calendars/primary/events", { method: "POST", body: { summary: clip(need(a.title, "el título"), 150), description: clip(a.description, 1000), start: { dateTime: st, timeZone: TZ }, end: { dateTime: en, timeZone: TZ } } }); return { creado: true, titulo: r.summary, enlace: r.htmlLink }; },
  async "drive.search"(a, c) { const q = clip(need(a.q, "qué buscar"), 100).replace(/['\\]/g, " "), r = await c.json("https://www.googleapis.com/drive/v3/files?" + new URLSearchParams({ q: `name contains '${q}' and trashed=false`, pageSize: String(Math.max(1, Math.min(15, +a.max || 8))), fields: "files(id,name,mimeType,modifiedTime)" }));
    return r.files || []; },
  async "drive.read"(a, c) { const id = encodeURIComponent(need(a.id, "el id")), meta = await c.json(`https://www.googleapis.com/drive/v3/files/${id}?fields=name,mimeType`);
    const u = meta.mimeType.startsWith("application/vnd.google-apps.") ? `https://www.googleapis.com/drive/v3/files/${id}/export?mimeType=text/plain` : /^text\/|json$/.test(meta.mimeType) ? `https://www.googleapis.com/drive/v3/files/${id}?alt=media` : null;
    if (!u) throw new Error("Ese tipo de archivo no se puede leer como texto"); return { nombre: meta.name, texto: clip(await c.text(u), 6000) }; },
  async "spotify.now"(a, c) { const r = await c.raw("https://api.spotify.com/v1/me/player"); if (r.status === 204) return { activo: false }; const j = await r.json().catch(() => ({})); if (!r.ok) throw new Error(j.error?.message || "Spotify no respondió"); const t = j.item || {};
    return { activo: true, sonando: !!j.is_playing, titulo: t.name || "", artista: (t.artists || []).map((x) => x.name).join(", "), album: t.album?.name || "", imagen: t.album?.images?.[1]?.url || t.album?.images?.[0]?.url || "", progreso: j.progress_ms || 0, duracion: t.duration_ms || 0, volumen: j.device?.volume_percent ?? null, dispositivo: j.device?.name || "" }; },
  async "spotify.play"(a, c) { let body; if (a.query) { const s = await c.json("https://api.spotify.com/v1/search?" + new URLSearchParams({ q: clip(a.query, 100), type: "track", limit: "1" })), t = s.tracks?.items?.[0]; if (!t) throw new Error("No encontré esa canción"); body = { uris: [t.uri] }; await c.spot("PUT", "https://api.spotify.com/v1/me/player/play", body); return { reproduciendo: t.name + " — " + t.artists.map((x) => x.name).join(", ") }; }
    await c.spot("PUT", "https://api.spotify.com/v1/me/player/play"); return { ok: true }; },
  async "spotify.pause"(a, c) { await c.spot("PUT", "https://api.spotify.com/v1/me/player/pause"); return { ok: true }; },
  async "spotify.next"(a, c) { await c.spot("POST", "https://api.spotify.com/v1/me/player/next"); return { ok: true }; },
  async "spotify.prev"(a, c) { await c.spot("POST", "https://api.spotify.com/v1/me/player/previous"); return { ok: true }; },
  async "spotify.volume"(a, c) { const v = Math.max(0, Math.min(100, Math.round(+a.percent))); if (isNaN(v)) throw new Error("Falta el volumen"); await c.spot("PUT", "https://api.spotify.com/v1/me/player/volume?volume_percent=" + v); return { volumen: v }; },
  async "github.repos"(a, c) { const r = await c.json("https://api.github.com/user/repos?sort=updated&per_page=10"); return r.map((x) => ({ repo: x.full_name, privado: x.private, descripcion: clip(x.description, 100), actualizado: x.updated_at })); },
  async "github.issues"(a, c) { const r = need(a.repo, "el repositorio"); if (!/^[\w.-]+\/[\w.-]+$/.test(r)) throw new Error("Repositorio no válido"); const j = await c.json(`https://api.github.com/repos/${r}/issues?state=open&per_page=10`); return j.map((x) => ({ n: x.number, titulo: x.title, autor: x.user?.login })); },
  async "github.issue_create"(a, c) { const r = need(a.repo, "el repositorio"); if (!/^[\w.-]+\/[\w.-]+$/.test(r)) throw new Error("Repositorio no válido"); const j = await c.json(`https://api.github.com/repos/${r}/issues`, { method: "POST", body: { title: clip(need(a.title, "el título"), 200), body: clip(a.body, 4000) } }); return { creada: true, n: j.number, enlace: j.html_url }; },
  async "telegram.send"(a, c) { const d = c.data, r = await fetch(`https://api.telegram.org/bot${d.bot_token}/sendMessage`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ chat_id: d.chat_id, text: clip(need(a.text, "el texto"), 3500) }) }); if (!r.ok) throw new Error("Telegram rechazó el mensaje (revisa el token y el ID del chat)"); return { enviado: true }; },
  async "discord.send"(a, c) { const r = await fetch(c.data.webhook, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ content: clip(need(a.text, "el texto"), 1900) }) }); if (!r.ok) throw new Error("Discord rechazó el mensaje"); return { enviado: true }; },
  async "slack.send"(a, c) { const r = await fetch(c.data.webhook, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text: clip(need(a.text, "el texto"), 3000) }) }); if (!r.ok) throw new Error("Slack rechazó el mensaje"); return { enviado: true }; },
  async "ntfy.send"(a, c) { const r = await fetch("https://ntfy.sh/" + c.data.topic, { method: "POST", headers: { Title: encodeURIComponent(clip(a.title || "Calex", 80)), "Content-Type": "text/plain; charset=utf-8" }, body: clip(need(a.text, "el texto"), 800) }); if (!r.ok) throw new Error("ntfy no aceptó el aviso"); return { enviado: true }; },
  async "todoist.list"(a, c) { const r = await c.json("https://api.todoist.com/rest/v2/tasks"); return r.slice(0, 20).map((t) => ({ id: t.id, tarea: t.content, para: t.due?.string || "" })); },
  async "todoist.add"(a, c) { const j = await c.json("https://api.todoist.com/rest/v2/tasks", { method: "POST", body: { content: clip(need(a.content, "la tarea"), 200), ...(a.due && { due_string: clip(a.due, 50), due_lang: "es" }) } }); return { creada: true, tarea: j.content }; },
};

async function freshToken(id, d, { env, uid, store }) {
  if (!d.exp || d.exp - 60000 > Date.now()) return d;
  if (!d.refresh) throw new Error("La vinculación caducó: vuelve a vincular " + CONNECTORS[id].name);
  const p = PROVIDERS[CONNECTORS[id].prov];
  try { const j = await exchange(p, env, { grant_type: "refresh_token", refresh_token: d.refresh }); d = { ...d, access: j.access_token, refresh: j.refresh_token || d.refresh, exp: j.expires_in ? Date.now() + j.expires_in * 1000 : 0 }; await store.put(uid, id, d); return d; }
  catch { throw new Error("La vinculación caducó: vuelve a vincular " + CONNECTORS[id].name); }
}

export async function run(action, args, { env, uid, store, confirm }) {
  const info = actionInfo(action); if (!info || !IMPL[action]) throw new Error("Acción desconocida");
  if (info.w === 2 && !confirm) throw new Error("Esta acción necesita tu confirmación");
  let d = (await store.all(uid))[info.connector]; if (!d) throw new Error(CONNECTORS[info.connector].name + " no está vinculado. Vincúlalo en Configuración → Conectores.");
  const oauth = CONNECTORS[info.connector].kind === "oauth"; if (oauth) d = await freshToken(info.connector, d, { env, uid, store });
  const auth = oauth ? { Authorization: "Bearer " + d.access, Accept: "application/json", ...(info.connector === "github" && { "User-Agent": "Calex", "X-GitHub-Api-Version": "2022-11-28" }) } : info.connector === "todoist" ? { Authorization: "Bearer " + d.token } : {};
  const raw = (url, o = {}) => fetch(url, { ...o, headers: { ...auth, ...(o.body && { "Content-Type": "application/json" }), ...o.headers }, body: o.body ? JSON.stringify(o.body) : undefined });
  const c = { data: d,
    raw,
    async json(url, o) { const r = await raw(url, o); const t = await r.text(); let j; try { j = t ? JSON.parse(t) : {}; } catch { j = {}; } if (!r.ok) throw new Error((j.error?.message || j.message || (typeof j.error === "string" ? j.error : "") || "el servicio respondió " + r.status).toString().slice(0, 160)); return j; },
    async text(url) { const r = await raw(url); if (!r.ok) throw new Error("el servicio respondió " + r.status); return r.text(); },
    async spot(method, url, body) { const r = await raw(url, { method, body }); if (r.ok || r.status === 204) return; const j = await r.json().catch(() => ({})); const m = String(j.error?.reason || ""); throw new Error(m === "PREMIUM_REQUIRED" ? "Spotify solo deja controlar la música con Premium. En el celular puedes usar el control de la app (Configuración → Música del celular)." : m === "NO_ACTIVE_DEVICE" || r.status === 404 ? "No hay ningún Spotify abierto: abre la app y reproduce algo." : j.error?.message || "Spotify respondió " + r.status); } };
  const out = await IMPL[action](args && typeof args === "object" ? args : {}, c);
  return out;
}

// ---------- rutas HTTP (las mismas en Calex y en Dot) ----------
// ctx: { env, uid, store, base, limit?(clave,n,seg)->bool }. Devuelve una Response o null si la ruta no es de conectores.
const J = (v, code = 200, h = {}) => new Response(JSON.stringify(v), { status: code, headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", ...h } });
export async function handle(req, url, ctx, sec = {}) {
  const P = url.pathname; if (!P.startsWith("/connectors")) return null;
  if (P === "/connectors/callback" && req.method === "GET") {
    try { const r = await finish(url.searchParams, ctx);
      if (r.app) return new Response(`<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Listo</title><body style="font:18px system-ui;background:#15140f;color:#ece7db;display:grid;place-items:center;height:100vh;margin:0;text-align:center"><div><p>Listo. Ya puedes volver a Calex.</p><p><a href="calex://connected" style="color:#15140f;background:#d4a35f;padding:12px 22px;border-radius:999px;text-decoration:none">Volver a Calex</a></p></div><script>setTimeout(function(){location.href="calex://connected"},400)</script>`, { headers: { "Content-Type": "text/html; charset=utf-8", ...sec } });
      return new Response(null, { status: 302, headers: { Location: "/?conn=ok&c=" + r.id } });
    } catch (e) { const msg = String(e.message || "No se pudo vincular").slice(0, 200);
      if (e.app) return new Response(`<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><body style="font:18px system-ui;background:#15140f;color:#ece7db;display:grid;place-items:center;height:100vh;margin:0;text-align:center"><div><p>No se pudo vincular.</p><p style="color:#a79f8d;font-size:15px">${msg.replace(/[&<>"]/g, "")}</p></div>`, { headers: { "Content-Type": "text/html; charset=utf-8", ...sec } });
      return new Response(null, { status: 302, headers: { Location: "/?conn=err&msg=" + encodeURIComponent(msg) } }); }
  }
  if (!ctx.uid) return J({ error: "Inicia sesión" }, 401);
  if (req.method === "GET" && P === "/connectors") return J({ list: await describe(ctx.uid, ctx) });
  if (req.method === "GET" && P === "/connectors/music") { const ids = await connectedIds(ctx.uid, ctx); if (!ids.includes("spotify")) return J({ provider: null });
    if (ctx.limit && !(await ctx.limit("conn-music:" + ctx.uid, 40, 60))) return J({ error: "Demasiadas consultas" }, 429);
    try { const n = await run("spotify.now", {}, ctx); return J({ provider: "spotify", ...n }); } catch (e) { return J({ provider: "spotify", activo: false, error: e.message }); } }
  if (req.method !== "POST") return J({ error: "No encontrado" }, 404);
  if (ctx.limit && !(await ctx.limit("conn:" + ctx.uid, 60, 60))) return J({ error: "Demasiadas acciones seguidas, espera un momento" }, 429);
  const b = await req.json().catch(() => ({}));
  try {
    if (P === "/connectors/connect") return J({ url: await begin(String(b.id), { ...ctx, app: !!b.app }) });
    if (P === "/connectors/save") { await saveToken(String(b.id), b.fields, ctx); return J({ ok: true }); }
    if (P === "/connectors/disconnect") { await disconnect(String(b.id), ctx); return J({ ok: true }); }
    if (P === "/connectors/run") { const out = await run(String(b.action), b.args, { ...ctx, confirm: b.confirm === true }); return J({ ok: true, data: out }); }
  } catch (e) { return J({ ok: false, error: String(e.message || e).slice(0, 300) }, 400); }
  return J({ error: "No encontrado" }, 404);
}
