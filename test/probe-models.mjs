// Prueba, en el Calex real, cómo programa cada modelo una misma página. Guarda cada resultado en test/out-probe/<modelo>.html
//   node test/probe-models.mjs  [id-de-modelo ...]
import fs from "node:fs"; import path from "node:path";
const U = "https://calex.federicoreta773.workers.dev", OUT = path.join(import.meta.dirname, "out-probe"); fs.mkdirSync(OUT, { recursive: true });
const ids = process.argv.slice(2).length ? process.argv.slice(2) : ["@cf/zai-org/glm-5.3", "@cf/deepseek-ai/deepseek-v4.1-flash-1017", "@cf/qwen/qwen3.8-27b", "@cf/qwen/qwen2.5-coder-32b-instruct", "@cf/meta/llama-4-scout-17b-16e-instruct", "@cf/meta/llama-3.3-70b-instruct-fp8-fast"];
const ASK = process.env.ASK || "Hacé una landing page espectacular para una cafetería de especialidad llamada «Brasa». Que se vea de agencia premium: hero a pantalla completa con fondo animado, secciones de menú, historia y contacto, animaciones al hacer scroll, texturas procedurales de alta resolución y tipografía elegante.";
async function session() { const r = await fetch(U + "/auth/guest", { method: "POST" }); const ck = (r.headers.get("set-cookie") || "").split(";")[0];
  await fetch(U + "/profile", { method: "POST", headers: { cookie: ck, "Content-Type": "application/json" }, body: JSON.stringify({ name: "Prueba", tone: "friendly", avatar: { kind: "mateo" }, consent: { terms: "2026-11", over13: true } }) }); return ck; }
for (const id of ids) {
  const ck = await session(), t0 = Date.now(); let text = "", model = "", err = "", first = 0;
  try { const r = await fetch(U + "/chat", { method: "POST", headers: { cookie: ck, "Content-Type": "application/json" }, body: JSON.stringify({ message: ASK, model: id, mode: process.env.MODE || "coder" }), signal: AbortSignal.timeout(280000) });
    const raw = await r.text(); for (const l of raw.split("\n\n").filter(Boolean)) { try { const e = JSON.parse(l.slice(5)); if (e.type === "token") { if (!first) first = Date.now() - t0; text += e.text; } else if (e.type === "model") model = e.model; else if (e.type === "error") err = e.text; } catch {} } } catch (e) { err = String(e.message || e); }
  const m = /```html\s*([\s\S]*?)(?:```|$)/i.exec(text), html = m ? m[1] : "", name = id.split("/").pop().replace(/[^\w.-]/g, "_");
  if (html) fs.writeFileSync(path.join(OUT, name + ".html"), html);
  console.log(`${id.padEnd(48)} usó=${model.padEnd(34)} ${((Date.now() - t0) / 1000).toFixed(0).padStart(3)}s primer-token=${(first / 1000).toFixed(0)}s  texto=${text.length}  html=${html.length}  <script>=${(html.match(/<script/g) || []).length} canvas/webgl=${/canvas|webgl/i.test(html)}  ${err ? "ERROR: " + err.slice(0, 260) : ""}`);
}
