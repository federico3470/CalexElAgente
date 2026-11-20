// Prueba real contra el Worker desplegado: node test/live-check.mjs https://nixel.xxx.workers.dev
const BASE = (process.argv[2] || "").replace(/\/$/, "");
if (!BASE) { console.log("Uso: node test/live-check.mjs <url>"); process.exit(1); }
let cookie = "";
const H = () => ({ "Content-Type": "application/json", Origin: BASE, Cookie: cookie });
const ok = (n, c, x = "") => console.log((c ? "OK  " : "FALLA ") + n + (x ? "  " + x : ""));

let r = await fetch(BASE + "/"); const html = await r.text();
ok("página principal", r.status === 200 && /Calex/.test(html), `${r.status}, ${html.length} bytes`);
r = await fetch(BASE + "/models"); const mj = await r.json();
ok("/models", r.ok && mj.models?.length >= 3, mj.models?.length + " modelos");
r = await fetch(BASE + "/auth/guest", { method: "POST", headers: { "Content-Type": "application/json", Origin: BASE }, body: "{}" });
cookie = (r.headers.get("set-cookie") || "").split(";")[0];
ok("invitado + sesión", r.ok && !!cookie, r.status);
r = await fetch(BASE + "/profile", { method: "POST", headers: H(), body: JSON.stringify({ name: "Prueba", tone: "formal" }) }).catch(() => null);

const prompts = [["corto", "Responde solo con una frase: ¿cuál es la capital de Francia?"], ["largo", "Explica en unas 120 palabras cómo funciona un motor de combustión."]];
const results = [];
for (const m of mj.models) {
  for (const [kind, p] of prompts) {
    const t0 = performance.now(); let first = 0, text = "", err = "", model = "";
    try {
      const res = await fetch(BASE + "/chat", { method: "POST", headers: H(), body: JSON.stringify({ message: p, model: m }) });
      const rd = res.body.getReader(), dec = new TextDecoder(); let buf = "";
      for (;;) { const { done, value } = await rd.read(); if (done) break; buf += dec.decode(value, { stream: true }); let i;
        while ((i = buf.indexOf("\n\n")) >= 0) { const l = buf.slice(0, i); buf = buf.slice(i + 2); if (!l.startsWith("data:")) continue; const j = JSON.parse(l.slice(5));
          if (j.type === "token") { if (!first) first = performance.now() - t0; text += j.text; } if (j.type === "error") err = j.text; if (j.type === "model") model = j.model; if (j.type === "raw" && (globalThis.__r = (globalThis.__r || 0) + 1) <= 6) console.log("   raw:", j.d.slice(0, 160)); } }
    } catch (e) { err = String(e.message); }
    const total = (performance.now() - t0) / 1000, genT = first ? total - first / 1000 : 0, toks = Math.round(text.length / 3.6);
    results.push({ m: m.split("/").pop(), kind, first: first ? Math.round(first) : null, total: +total.toFixed(1), chars: text.length, tps: genT > 0.3 ? +(toks / genT).toFixed(0) : null, err });
    console.log(`${m.split("/").pop().padEnd(32)} ${kind.padEnd(5)} 1er token ${first ? Math.round(first) + " ms" : "—"}  total ${total.toFixed(1)} s  ~${toks} tok  ${genT > 0.3 ? (toks / genT).toFixed(0) + " tok/s" : ""}  ${model ? "[" + model.replace("☁ ","") + "]" : ""} ${err ? "ERROR: " + err.slice(0,110) : ""}`);
  }
}
// imagen
import { readFileSync } from "node:fs"; const px = "data:image/png;base64," + readFileSync(new URL("./red.b64", import.meta.url), "utf8").trim();
{ const t0 = performance.now(); let text = "", err = "";
  const res = await fetch(BASE + "/chat", { method: "POST", headers: H(), body: JSON.stringify({ message: "¿De qué color es esta imagen?", images: [px] }) });
  const rd = res.body.getReader(), dec = new TextDecoder(); let buf = "";
  for (;;) { const { done, value } = await rd.read(); if (done) break; buf += dec.decode(value, { stream: true }); let i;
    while ((i = buf.indexOf("\n\n")) >= 0) { const l = buf.slice(0, i); buf = buf.slice(i + 2); if (!l.startsWith("data:")) continue; const j = JSON.parse(l.slice(5)); if (j.type === "token") text += j.text; if (j.type === "error") err = j.text; } }
  console.log(`visión  ${((performance.now() - t0) / 1000).toFixed(1)} s  ${err ? "ERROR: " + err : "→ " + text.slice(0, 100)}`); }
r = await fetch(BASE + "/chats", { headers: H() }); const ch = await r.json();
ok("chats guardados en D1", Array.isArray(ch) && ch.length > 0, ch.length + " chats");
console.log("\nRESUMEN JSON\n" + JSON.stringify(results));
