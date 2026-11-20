// Genera public/ (interfaz web) y src/legal.js a partir de la interfaz local de Dot.
// Uso:  node build.mjs      (cada parche debe encajar exactamente 1 vez; si la interfaz local cambia, avisa en vez de romper)
import fs from "node:fs"; import path from "node:path";
const HERE = import.meta.dirname, LOCAL = path.resolve(HERE, "..", "dot-agent", "public");
let h = fs.readFileSync(path.join(LOCAL, "index.html"), "utf8");
const rep = (name, from, to, all = false) => { const n = h.split(from).length - 1; if (n < 1 || (!all && n !== 1)) throw new Error(`Parche "${name}": encaja ${n} veces (esperaba ${all ? "≥1" : "1"})`); h = h.split(from).join(to); };

// --- sin pasos de PC (dispositivo, seguridad) ---
rep("pasos del asistente", ",'device','safety','tone'", ",'tone'");
rep("paso pendiente", "if(!P.device||!P.device.os)return 'device';if(!SAFEDONE)return 'safety';return null}", "return null}");
rep("resumen final", ", con comandos de <b>${d.device.os||'tu sistema'}</b> y en nivel <b>${SAFE[d.safe][0].split(' ')[0].toLowerCase()}</b>", "");
rep("novedades locales", "else whatsNew()};", "else{}};");
// --- invitado = sesión real en el servidor; el login va primero en la bienvenida ---
rep("invitado", "$('lgg').onclick=()=>{try{localStorage.setItem('dot-guest','1')}catch{}$('lg').classList.remove('on');afterLogin()};",
  "$('lgg').onclick=async()=>{const r=await fetch('/auth/guest',{method:'POST'});if(!r.ok){$('lgerr').textContent='No se pudo entrar como invitado, inténtalo en un rato.';return}location.reload()};");
rep("login primero", "if(err||(!AUTH.user&&!guest()))return showLogin(err);", "if(err||!AUTH.user)return showLogin(err);");
rep("etiqueta proveedor", "apple:'Apple'}[AUTH.user.provider]", "apple:'Apple',guest:'invitado: tus charlas solo están en este navegador; inicia sesión con Google, Facebook o Huawei para verlas en todos tus dispositivos'}[AUTH.user.provider]");
rep("nombre en la cuenta", "(AUTH.user.name||AUTH.user.email||'')", "(AUTH.user.name||AUTH.user.email||(P&&P.name)||'')");
rep("texto invitado", ">Continuar sin cuenta<", ">Entrar como invitado<");
// --- textos: los datos viven en la cuenta (Cloudflare), no en el PC ---
rep("bienvenida", "los términos, tu dispositivo, cuánto puede hacer Dot por su cuenta, su personalidad y tu personaje.<br>Todo se guarda en este Dot; no necesitas una cuenta en la nube.",
  "los términos, su personalidad y tu personaje.<br>Tu perfil y tus charlas se guardan en tu cuenta y las ves desde cualquier dispositivo.");
rep("viñetas legales", "<li>Tus chats, perfil y memoria <b>se guardan en tu equipo</b>. No se venden ni se usan para publicidad.</li><li>Solo actúa en tu equipo con el nivel de permisos que elijas; lo peligroso siempre te lo pregunta.</li>",
  "<li>Tus chats y tu perfil <b>se guardan en tu cuenta</b>, en servidores de Cloudflare. No se venden ni se usan para publicidad.</li><li>Tus mensajes los procesa una IA de Cloudflare (Workers AI).</li>");
rep("consentimiento de cuenta", "<li>Tus chats y tu perfil se guardan en tu equipo.</li>", "<li>Tus chats y tu perfil se guardan en tu cuenta de Dot (Cloudflare).</li>");
rep("sugerencias", "const SUG=['Mi equipo va lento, ¿puede diagnosticarlo?','Genera una imagen de un faro al amanecer','Crea una página web para una cafetería','Resuelve los ejercicios de esta foto','Investiga a fondo la mejor tarjeta gráfica económica','Explícame qué es una VPN en dos frases'];",
  "const SUG=['Explíqueme qué es una VPN en dos frases','Proponga una cena con pollo y arroz','Traduzca «buenos días» a cinco idiomas','Ayúdeme a redactar un correo formal','Resuma las ventajas de ahorrar a diario','Explique la fotosíntesis de forma sencilla'];");
rep("subtítulo vacío", "<small>Puedo gestionar su dispositivo con su autorización, redactar documentos, investigar en la web, diseñar sitios web y crear imágenes.</small>", "<small>Puedo redactar, traducir, explicar y analizar imágenes que usted adjunte, y conversar por voz.</small>");
rep("título", "<title>Dot</title>", "<title>Dot</title>");
// --- oculta en Configuración lo que solo existe en el PC ---
rep("recorte para web", "</body>", `<script>
/* Edición web (Cloudflare): oculta lo que solo tiene sentido en el PC */
(()=>{const stop=n=>!n||n.tagName==='H4'||(n.querySelector&&n.querySelector('#ss'));
 const hide=t=>document.querySelectorAll('#set h4').forEach(h=>{if(h.textContent.trim().startsWith(t)){let n=h;do{n.style.display='none';n=n.nextElementSibling}while(!stop(n))}});
 ['Modelo','Seguridad','Permisos de herramientas','Memoria','Acceso desde otros dispositivos','Cuentas (avanzado)','Nube opcional','PC remota'].forEach(hide);
 document.querySelectorAll('#set details').forEach(d=>d.style.display='none');
 const w=document.getElementById('wbn');if(w&&w.closest('.r'))w.closest('.r').style.display='none';
 const s=document.createElement('style');s.textContent='#eb,#se,#gpuc,#lgf,.or{display:none!important}';document.head.appendChild(s)})();
</script></body>`);

// --- marca pública: la interfaz del PC se llama Dot; las versiones públicas se llaman Nixel ---
{ const mem = JSON.parse(fs.readFileSync(path.resolve(LOCAL, "..", "members-nixel.json"), "utf8")); const re = /\/\*MEMBERS\*\/[\s\S]*?\/\*\/MEMBERS\*\//; if (!re.test(h)) throw new Error("No encuentro la lista de integrantes"); h = h.replace(re, () => "/*MEMBERS*/const MEMBERS=" + JSON.stringify(mem) + ";/*/MEMBERS*/"); } // integrantes de la familia (solo en Nixel)
h = h.replace(/\bDot\b/g, "Nixel").replace(/\bDOT\b/g, "NIXEL");
fs.mkdirSync(path.join(HERE, "public"), { recursive: true });
fs.writeFileSync(path.join(HERE, "public", "index.html"), h);
for (const f of ["sw.js", "icon.svg", "icon-180.png", "icon-192.png", "icon-512.png"]) fs.copyFileSync(path.join(LOCAL, f), path.join(HERE, "public", f));
fs.writeFileSync(path.join(HERE, "public", "manifest.json"), fs.readFileSync(path.join(LOCAL, "manifest.json"), "utf8").replace(/\bDot\b/g, "Nixel")); // la app instalada se llama Nixel
const L = (n) => fs.readFileSync(path.join(HERE, "legal", n + ".html"), "utf8");
fs.writeFileSync(path.join(HERE, "src", "legal.js"), "// Generado por build.mjs desde legal/*.html. No editar a mano.\nexport const LEGAL = " + JSON.stringify({ terminos: L("terminos"), privacidad: L("privacidad") }) + ";\n");
console.log("OK · public/index.html", (h.length / 1024).toFixed(0), "KB · src/legal.js");

