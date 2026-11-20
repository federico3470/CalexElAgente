// Plantilla probada de «scrollytelling» (una sola página): el modo Programador se la da al modelo para que la adapte al tema pedido.
// Así el resultado funciona siempre: fondo de estrellas en canvas, textura con SVG, secciones de pantalla completa y animación al hacer scroll.
export const SCROLLY = String.raw`<!DOCTYPE html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>El Universo</title>
<style>
:root{--ink:#e9e4d8;--accent:#ffb86b}
*{box-sizing:border-box}html{scroll-behavior:smooth}
body{margin:0;background:#05060d;color:var(--ink);font:18px/1.7 Georgia,serif}
#stars{position:fixed;inset:0;width:100%;height:100%;z-index:-2}
.grain{position:fixed;inset:0;z-index:-1;pointer-events:none;opacity:.16;mix-blend-mode:overlay}
#bar{position:fixed;top:0;left:0;height:3px;width:0;background:var(--accent);z-index:5}
header.hero,section.scene{min-height:100vh;display:grid;place-items:center;padding:12vh 8vw;text-align:center}
h1{font-size:clamp(2.4rem,7vw,5.5rem);letter-spacing:.06em;margin:0 0 .4em}
h2{font-size:clamp(1.8rem,4.5vw,3.2rem);margin:0 0 .5em;color:var(--accent)}
p{max-width:34em;margin:0 auto}
.planet{width:min(46vmin,360px);aspect-ratio:1;border-radius:50%;margin:0 auto 6vh;background:radial-gradient(circle at 32% 30%,var(--c1),var(--c2) 62%,#000 100%);box-shadow:0 0 90px -10px var(--c1);transform:scale(var(--s,.6))}
.reveal{opacity:0;transform:translateY(40px);transition:opacity .9s,transform .9s}.reveal.in{opacity:1;transform:none}
</style></head><body>
<canvas id="stars"></canvas>
<svg class="grain" width="100%" height="100%"><filter id="n"><feTurbulence type="fractalNoise" baseFrequency=".8" numOctaves="3" stitchTiles="stitch"/></filter><rect width="100%" height="100%" filter="url(#n)"/></svg>
<div id="bar"></div>
<header class="hero"><div class="reveal"><h1>El Universo</h1><p>Un viaje por la historia del cosmos. Baja para empezar.</p></div></header>
<section class="scene"><div><div class="planet" style="--c1:#ffb86b;--c2:#7a2f10"></div><div class="reveal"><h2>El comienzo</h2><p>Hace unos 13.800 millones de años todo lo que existe cabía en un punto mucho más pequeño que un átomo.</p></div></div></section>
<section class="scene"><div><div class="planet" style="--c1:#7cc4ff;--c2:#0d2a6b"></div><div class="reveal"><h2>Las primeras estrellas</h2><p>Tras unos cientos de millones de años, el gas se condensó y se encendieron las primeras estrellas.</p></div></div></section>
<section class="scene"><div><div class="planet" style="--c1:#b6f3a4;--c2:#1c5a2a"></div><div class="reveal"><h2>Un mundo con vida</h2><p>En un planeta pequeño, alrededor de una estrella común, el agua y el tiempo hicieron lo demás.</p></div></div></section>
<script>
const cv=document.getElementById('stars'),cx=cv.getContext('2d');let W,H,stars=[];
function size(){W=cv.width=innerWidth;H=cv.height=innerHeight;stars=Array.from({length:240},()=>({x:Math.random()*W,y:Math.random()*H,z:Math.random()*.9+.1,t:Math.random()*6}))}
addEventListener('resize',size);size();
function draw(t){cx.clearRect(0,0,W,H);for(const s of stars){const y=((s.y-scrollY*s.z*.4)%H+H)%H;cx.globalAlpha=.4+.6*Math.abs(Math.sin(t/900+s.t));cx.fillStyle='#fff';cx.fillRect(s.x,y,s.z*2.2,s.z*2.2)}requestAnimationFrame(draw)}requestAnimationFrame(draw);
const io=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting)e.target.classList.add('in')}),{threshold:.3});document.querySelectorAll('.reveal').forEach(el=>io.observe(el));
addEventListener('scroll',()=>{document.getElementById('bar').style.width=(scrollY/(document.documentElement.scrollHeight-innerHeight)*100)+'%';
 document.querySelectorAll('.planet').forEach(pl=>{const r=pl.getBoundingClientRect(),c=1-Math.abs((r.top+r.height/2-innerHeight/2)/innerHeight);pl.style.setProperty('--s',(.55+.55*Math.max(0,c)).toFixed(3))})},{passive:true});dispatchEvent(new Event('scroll'));
</script></body></html>`;
