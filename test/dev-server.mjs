// Vista previa LOCAL de Dot Cloud (imita Cloudflare: D1 en memoria + IA de mentira). No necesita cuenta ni internet.
//   node test/dev-server.mjs   →   http://localhost:8787
// Solo sirve para ver y probar la interfaz; la IA real y el inicio de sesión con Google/Facebook/Huawei solo funcionan ya desplegado.
import http from "node:http"; import { DatabaseSync } from "node:sqlite"; import fs from "node:fs"; import path from "node:path";
import worker from "../src/worker.js";
const ROOT = path.resolve(import.meta.dirname, ".."), db = new DatabaseSync(":memory:");
const DB = { prepare(sql) { const st = () => db.prepare(sql); let a = []; const o = { bind: (...x) => { a = x; return o; }, run: () => ({ success: true, meta: { changes: st().run(...a).changes } }), first: () => st().get(...a) ?? null, all: () => ({ results: st().all(...a) }) }; return o; }, async batch(s) { const out = []; for (const x of s) out.push(await x.run()); return out; } };
const AI = { async run(model, input) { const last = input.messages.at(-1), img = Array.isArray(last.content) ? " (vi tu imagen)" : "", txt = `Hola, soy una respuesta de PRUEBA${img}. La IA real de Cloudflare solo responde cuando subas Dot a Cloudflare. `;
  return new ReadableStream({ async start(c) { for (const w of txt.split(" ")) { c.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ response: w + " " })}\n\n`)); await new Promise((r) => setTimeout(r, 40)); } c.enqueue(new TextEncoder().encode("data: [DONE]\n\n")); c.close(); } }); } };
const MIME = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".json": "application/json", ".svg": "image/svg+xml" };
const ASSETS = { fetch: async (req) => { const p = new URL(req.url).pathname, f = path.join(ROOT, "public", p === "/" ? "index.html" : p.slice(1)); return fs.existsSync(f) && fs.statSync(f).isFile() ? new Response(fs.readFileSync(f), { headers: { "Content-Type": MIME[path.extname(f)] || "application/octet-stream" } }) : new Response("no encontrado", { status: 404 }); } };
const env = { DB, AI, ASSETS, DAILY_LIMIT: "500", LEGAL_OWNER: "(vista previa)", LEGAL_EMAIL: "tu@correo.com", LEGAL_COUNTRY: "(tu país)", STATS_KEY: "vista-previa-clave-1", SPOTIFY_CLIENT_ID: "demo", GOOGLE_CLIENT_ID: "demo", GOOGLE_CLIENT_SECRET: "demo" };
http.createServer(async (rq, rs) => {
  const chunks = []; for await (const c of rq) chunks.push(c); const body = Buffer.concat(chunks);
  const url = `http://${rq.headers.host}${rq.url}`, req = new Request(url, { method: rq.method, headers: rq.headers, body: ["GET", "HEAD"].includes(rq.method) ? undefined : body });
  const r = await worker.fetch(req, env, {}); const h = {}; r.headers.forEach((v, k) => { h[k] = v; }); const sc = r.headers.getSetCookie?.(); if (sc?.length) h["set-cookie"] = sc.map((c) => c.replace(/;\s*Secure/i, "")); // en http local la cookie no puede ser Secure
  rs.writeHead(r.status, h); if (!r.body) return rs.end(); for await (const c of r.body) rs.write(c); rs.end();
}).listen(8787, () => console.log("Dot Cloud (vista previa) en http://localhost:8787"));
