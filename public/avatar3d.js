/* Calex · personas 3D realistas (solo en la versión Cloudflare). Un trazador de rayos en WebGL2 sin librerías ni modelos descargados:
   cabeza, ojos con iris, pelo, barba, ropa y accesorios se construyen con formas matemáticas (SDF), con luz suave, sombras y dispersión de piel.
   Cada persona se dibuja UNA vez a una imagen y se guarda en memoria: en el chat, la TV y las listas solo se muestra una imagen (casi gratis).
   Si el aparato no tiene WebGL2, la interfaz usa las personas 2D de siempre. */
(function () {
  var FS = `#version 300 es
precision highp float;
out vec4 O;
uniform vec2 R; uniform float yaw, old, fem, jaw, nos, brw, sweat;
uniform vec3 skin, hairc, shirt, eyec;
uniform int style, beard, acc, mood;
float smin(float a,float b,float k){float h=max(k-abs(a-b),0.)/k;return min(a,b)-h*h*k*.25;}
float smax(float a,float b,float k){return -smin(-a,-b,k);}
float sdE(vec3 p,vec3 r){float k0=length(p/r),k1=length(p/(r*r));return k0*(k0-1.)/max(k1,1e-4);}
float sdCap(vec3 p,vec3 a,vec3 b,float r){vec3 pa=p-a,ba=b-a;float h=clamp(dot(pa,ba)/dot(ba,ba),0.,1.);return length(pa-ba*h)-r;}
float hash(vec3 p){p=fract(p*.3183099+.1);p*=17.;return fract(p.x*p.y*p.z*(p.x+p.y+p.z));}
float noise(vec3 x){vec3 i=floor(x),f=fract(x);f=f*f*(3.-2.*f);return mix(mix(mix(hash(i),hash(i+vec3(1,0,0)),f.x),mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y),f.z);}
vec2 U(vec2 a,vec2 b){return a.x<b.x?a:b;}
mat2 rot(){float c=cos(yaw),s=sin(yaw);return mat2(c,-s,s,c);}
vec3 toObj(vec3 p){p.xz=rot()*p.xz;return p;}
float hairline(float z){return -.35+1.0*smoothstep(-.9,.9,z);}
vec2 map(vec3 w){
  vec3 p=toObj(w); vec3 q=vec3(abs(p.x),p.y,p.z);
  // ---- cabeza ----
  float h=smin(sdE(p-vec3(0,.12,-.05),vec3(.9,.93,.96)),sdE(p-vec3(0,-.36,.08),vec3(.80*jaw,.74,.82)),.4);
  h=smin(h,length(q-vec3(.40*jaw,-.58,.14))-.38,.3);
  h=smin(h,length(p-vec3(0,-.93,.40))-.27*mix(1.,.82,fem)*jaw,.3);
  h=smin(h,length(q-vec3(.5*jaw,-.28,.55))-.3,.35);
  // nariz
  float n=sdCap(p,vec3(0,.05,.78),vec3(0,-.30,.94),.1*nos);
  n=smin(n,length(p-vec3(0,-.37,.97))-.15*nos,.12);
  n=smin(n,length(q-vec3(.14,-.40,.90))-.095*nos,.1);
  h=smin(h,n,.15);
  // cuencas de los ojos y pómulos
  h=smax(h,-(length(q-vec3(.33,.10,.92))-.19),.16);
  // boca: hendidura y abertura según ánimo
  float curve=mood==2?.9:(mood==1?.0:.35);
  vec3 m=p; m.y-=curve*2.4*m.x*m.x;
  float mo=mood==2?.16:(mood==1?.06:.0);
  if(mo>0.){float cut=sdE(m-vec3(0,-.58,.84),vec3(.22,mo*.55+.02,.12)); h=smax(h,-cut,.03);}
  else h=smax(h,-sdE(m-vec3(0,-.575,.88),vec3(.2,.012,.1)),.02);
  // ojos: lids
  float open=mood==2?.02:(mood==1?.05:.08);
  vec3 ec=vec3(.33,.09,.745);
  float lid=max(length(q-ec)-.172,open-abs(q.y-ec.y-(mood==2?.02:.0)));
  h=smin(h,lid,.03);
  // orejas
  h=smin(h,sdE(q-vec3(.9,-.02,-.05),vec3(.09,.25,.17)),.08);
  // cuello
  h=smin(h,sdCap(p,vec3(0,-.75,-.12),vec3(0,-1.7,-.1),.41),.3);
  vec2 r=vec2(h,1.);
  // ojos
  r=U(r,vec2(length(q-ec)-.15,4.));
  // cejas
  float bz=.9, tilt=mood==1?-.09:(mood==2?.07:0.);
  float bw=.038*brw;
  vec3 b0=vec3(.14,.35+tilt,.90),b1=vec3(.52,.39-tilt*.9+(mood==2?.03:0.),.72);
  r=U(r,vec2(sdCap(q,b0,b1,bw)-.0,10.));
  // labios
  float ml=mood==2?.0:0.;
  r=U(r,vec2(sdCap(m,vec3(-.19,-.52,.835),vec3(.19,-.52,.835),.055),6.));
  vec2 lo=vec2(sdCap(m,vec3(-.17,-.625-mo*.3,.83),vec3(.17,-.625-mo*.3,.83),.068),6.);
  r=U(r,lo);
  if(mood!=0){ // interior de la boca y dientes
    r=U(r,vec2(max(sdE(m-vec3(0,-.58,.7),vec3(.21,mo*.55+.01,.14)),-(m.y+.56+mo*.1))*.5,12.));
    r=U(r,vec2(max(sdE(m-vec3(0,-.55,.8),vec3(.19,.04,.08)),-(m.y+.57)),9.));
  }
  // ---- torso ----
  float ts=mix(1.62,1.38,fem);
  float to=smin(sdE(p-vec3(0,-2.4,-.1),vec3(ts,1.0,.78)),sdCap(p,vec3(0,-1.6,-.1),vec3(0,-1.9,-.1),.6),.4);
  to=smax(to,-(length(p-vec3(0,-1.4,.42))-.6),.14);
  r=U(r,vec2(to,3.));
  // ---- pelo ----
  float hs=sdE(p-vec3(0,.18,-.07),vec3(.99,1.04,1.03));
  float hl=hairline(p.z);
  float hd=1e3;
  float disp=.025*noise(p*9.)+.012*noise(p*30.);
  if(style==0||style==5||style==6){hd=smax(hs-disp,-(p.y-hl-.03*noise(p*7.)),.09);}
  else if(style==1){hd=smax(hs-disp+.05*sin(p.x*9.)*sin(p.z*8.+2.),-(p.y-hl-.05),.09);}
  else if(style==2){ hd=max(max(hs-disp,-(p.y+.45)),max(p.y-.2,-max(abs(p.x)-.52,p.z+.38))); }
  else if(style==3){ hd=smax(hs-disp,-(p.y-hl),.09); float cu=sdE(p-vec3(0,-.95,-.42),vec3(1.0,1.45,.55)); cu=max(cu,p.z-.12); hd=smin(hd,cu-disp,.12);
    hd=smin(hd,sdCap(q,vec3(.86,-.1,.02),vec3(.9,-1.35,.05),.15),.1); }
  else if(style==4){ hd=smax(hs+.06-disp,-(p.y-hl+.04),.09); for(int i=0;i<46;i++){float fi=float(i);float yy=1.-2.*(fi+.5)/46.;float a=fi*2.399,rr=sqrt(1.-yy*yy);vec3 c=vec3(sin(a)*1.0*rr,yy*1.0+.2,cos(a)*1.04*rr-.05);if(c.y>hl+.02&&!(c.z>.5&&c.y<.75)&&c.y<1.05){hd=smin(hd,length(p-c)-.21,.1);} } }
  if(style==5)hd=smin(hd,sdCap(p,vec3(0,.45,-.92),vec3(0,-.55,-1.18),.2),.2);
  if(style==6)hd=smin(hd,length(p-vec3(0,.88,-.52))-.34,.2);
  r=U(r,vec2(hd,2.));
  // ---- barba y bigote ----
  if(beard==1){
    float bs=sdE(p-vec3(0,-.5,.1),vec3(.86,.78,.88));
    float bd=max(bs-.02*noise(p*14.),p.y+.22-.28*smoothstep(.3,.9,abs(p.x)));
    bd=max(bd,-(sdE(m-vec3(0,-.66,.92),vec3(.30,.115,.2))));
    r=U(r,vec2(bd,2.));
    r=U(r,vec2(sdCap(m,vec3(-.2,-.52,.93),vec3(.2,-.52,.93),.06),2.));
  }
  // ---- accesorios ----
  if(acc==1){ vec3 g=q-vec3(.34,.1,1.04); float ring=length(vec2(length(g.xy)-.27,g.z))-.028;
    ring=min(ring,sdCap(p,vec3(-.1,.13,1.05),vec3(.1,.13,1.05),.022)); ring=min(ring,sdCap(q,vec3(.6,.12,1.0),vec3(.9,.12,.2),.02));
    r=U(r,vec2(ring,11.)); }
  if(acc==2){    float cp=max(sdE(p-vec3(0,.3,-.04),vec3(1.0,.95,1.04)),-(p.y-.34)); cp=max(cp,p.y-1.2);
    float br=sdE(p-vec3(0,.33,.98),vec3(.66,.055,.56)); r=U(r,vec2(min(cp,br),8.)); }
  if(acc==3){ float bt=min(sdE(q-vec3(.24,-1.64,.55),vec3(.22,.15,.07)),length(p-vec3(0,-1.64,.58))-.09); r=U(r,vec2(bt,13.)); }
  if(acc==4){ vec3 g=p-vec3(0,.12,0.); float ar=length(vec2(length(g.yz)-1.03,g.x))-.055; ar=max(ar,-g.y+.05); r=U(r,vec2(ar,7.));
    float cup=sdE(q-vec3(1.0,-.05,-.02),vec3(.15,.3,.27)); r=U(r,vec2(cup,7.)); r=U(r,vec2(sdE(q-vec3(1.12,-.05,-.02),vec3(.04,.2,.18)),8.)); }
  if(sweat>.5){ r=U(r,vec2(sdE(p-vec3(.62,.62,.74),vec3(.045,.08,.045)),14.)); }
  return r;
}
vec3 nrm(vec3 p){vec2 e=vec2(1,-1)*.0008;return normalize(e.xyy*map(p+e.xyy).x+e.yyx*map(p+e.yyx).x+e.yxy*map(p+e.yxy).x+e.xxx*map(p+e.xxx).x);}
float shadow(vec3 p,vec3 l){float t=.03,res=1.;for(int i=0;i<28;i++){float d=map(p+l*t).x;res=min(res,10.*d/t);t+=clamp(d,.02,.25);if(res<.002||t>3.)break;}return clamp(res,0.,1.);}
float ao(vec3 p,vec3 n){float o=0.,s=1.;for(int i=1;i<6;i++){float h=.03+.11*float(i);o+=(h-map(p+n*h).x)*s;s*=.72;}return clamp(1.-1.6*o,0.,1.);}
vec3 albedo(vec3 w,vec3 n,float id,out float spec,out float shin,out float sss){
  vec3 p=toObj(w); vec3 q=vec3(abs(p.x),p.y,p.z); spec=.25;shin=40.;sss=0.;
  if(id<1.5){ // piel
    vec3 c=skin; float nz=noise(p*38.); c*=.96+.08*nz; sss=.7;spec=.22;shin=26.;
    float ch=smoothstep(.42,.0,length(q-vec3(.52,-.3,.7))); c=mix(c,c*vec3(1.08,.82,.8)+vec3(.05,0,0),ch*.55);
    c*=1.-.18*smoothstep(.2,.0,length(q-vec3(.34,-.06,.84))); // ojeras
    if(old>.5){float f=smoothstep(.1,.0,abs(sin(p.y*34.+nz*2.))*.5-.02)*smoothstep(.55,.9,p.y+.4)*smoothstep(.1,.5,p.z);c*=1.-.12*f;c*=1.-.1*smoothstep(.3,.0,length(vec2(q.x-.5,p.y+.2)))*0.;}
    return c; }
  if(id<2.5){ float st=noise(vec3(p.x*26.,p.y*7.,p.z*26.)+noise(p*5.)*2.); spec=.55;shin=18.; return hairc*(.62+.7*st)*(.8+.2*smoothstep(-.4,.9,p.y)); }
  if(id<3.5){ float wv=.94+.06*sin(p.x*140.)*sin(p.y*140.); spec=.05;shin=8.; return shirt*wv*(.9+.1*noise(p*6.)); }
  if(id<4.5){ // ojo
    spec=1.;shin=160.; float s=sin(yaw),c=cos(yaw); vec3 g=normalize(vec3((p.x<0.?-1.:1.)*s,0.,c)); vec3 e=normalize(q-vec3(.34,.10,.775));
    float ang=acos(clamp(dot(e,g),-1.,1.));
    vec3 col=vec3(.93,.92,.9)*(.85+.15*noise(p*40.)); col*=1.-.35*smoothstep(.0,.9,ang);
    if(ang<.5){float ring=smoothstep(.45,.38,ang);float fib=.7+.5*noise(vec3(atan(e.y,e.x)*5.,ang*18.,1.));vec3 ic=eyec*fib;ic=mix(ic*.35,ic,smoothstep(.0,.3,ang));col=mix(col,ic,ring);col=mix(col,vec3(.02),smoothstep(.2,.17,ang));}
    return col; }
  if(id<6.5){ spec=.5;shin=30.;sss=.4; return mix(skin,vec3(.62,.2,.25),.62-.12*fem*0.); }
  if(id<7.5){ spec=.6;shin=60.; return vec3(.1,.1,.12); }
  if(id<8.5){ spec=.2;shin=20.; return shirt; }
  if(id<9.5){ spec=.6;shin=60.; return vec3(.92,.9,.86); }
  if(id<10.5){ spec=.3;shin=12.; return hairc*.8*(.85+.3*noise(p*50.)); }
  if(id<11.5){ spec=.9;shin=90.; return vec3(.12,.09,.07); }
  if(id<12.5){ return vec3(.22,.04,.06); }
  if(id<13.5){ spec=.3;shin=30.; return vec3(.6,.1,.12); }
  spec=1.;shin=120.; return vec3(.6,.82,1.);
}
void main(){
  vec2 uv=(gl_FragCoord.xy*2.-R)/R.y;
  vec3 bg=mix(vec3(.93,.95,.98),vec3(.74,.8,.88),smoothstep(.0,1.35,length(uv-vec2(-.25,.35))));
  vec3 ro=vec3(0,-.55,7.2),rd=normalize(vec3(uv*1.0,-3.45));
  // esfera envolvente
  float bb=dot(ro-vec3(0,-1.2,0),rd),cc=dot(ro-vec3(0,-1.2,0),ro-vec3(0,-1.2,0))-9.6;float disc=bb*bb-cc;
  vec3 col=bg;
  if(disc>0.){
    float t=-bb-sqrt(disc);float id=0.;bool hit=false;
    for(int i=0;i<96;i++){vec3 p=ro+rd*t;vec2 d=map(p);if(d.x<.0006*t){hit=true;id=d.y;break;}t+=d.x*.9;if(t>12.)break;}
    if(hit){
      vec3 p=ro+rd*t,n=nrm(p),v=-rd;
      float sp,sh,ss;vec3 al=albedo(p,n,id,sp,sh,ss);
      vec3 L1=normalize(vec3(-.55,.75,.95)),L2=normalize(vec3(.85,.1,.55)),L3=normalize(vec3(.5,.35,-.9));
      float s1=shadow(p+n*.01,L1),oc=ao(p,n);
      float w=ss>0.?.45:.0;
      float d1=clamp((dot(n,L1)+w)/(1.+w),0.,1.)*s1,d2=clamp(dot(n,L2)*.5+.5,0.,1.)*.5,d3=pow(clamp(1.-dot(n,v),0.,1.),2.5);
      vec3 lit=vec3(1.0,.95,.88)*d1*1.05+vec3(.55,.66,.85)*d2*.55*oc+vec3(.28,.3,.36)*(.5+.5*n.y)*oc*.5;
      vec3 c=al*lit;
      if(ss>0.){ c+=al*vec3(.9,.3,.18)*ss*.35*smoothstep(.55,.0,abs(dot(n,L1)))*s1*.0 + al*vec3(1.,.38,.25)*ss*.22*pow(clamp(1.-abs(dot(n,L1)),0.,1.),3.)*(.4+.6*s1); }
      vec3 hv=normalize(L1+v);c+=vec3(1.,.97,.92)*sp*pow(clamp(dot(n,hv),0.,1.),sh)*s1*1.2;
      c+=vec3(.7,.8,1.)*sp*.5*pow(clamp(dot(n,normalize(L2+v)),0.,1.),sh)*.5;
      c+=vec3(.8,.85,1.)*d3*clamp(dot(n,L3)+.5,0.,1.)*.35*oc;
      if(id>1.5&&id<2.5)c=max(c,al*.32);
      c*=mix(.65,1.,oc);
      col=c;
    }
  }
  col=pow(col/(1.+col*.12),vec3(1./2.2));
  col*=1.-.22*dot(uv*.5,uv*.5);
  O=vec4(col,1.);
}`;
  var VS = "#version 300 es\nin vec2 a;void main(){gl_Position=vec4(a,0.,1.);}";
  // ---- personas: aspecto de cada una ----
  // st: 0 corto · 1 revuelto · 2 canoso por los lados · 3 largo · 4 rulos · 5 colita · 6 rodete
  var P = {
    mateo: { skin: "#e0ac80", hair: "#2a1c15", st: 0, eye: "#5a3a1e", jaw: 1.0, nos: 1.0, brw: 1.1 },
    lucas: { skin: "#c58b5e", hair: "#3a2a1f", st: 0, beard: 1, eye: "#3b2a1a", jaw: 1.06, nos: 1.1, brw: 1.3 },
    tomas: { skin: "#f3d2b3", hair: "#c8a04a", st: 1, eye: "#4f7fa8", jaw: .96, nos: .95, brw: .9 },
    raul: { skin: "#e6bd98", hair: "#dcdce4", st: 2, old: 1, eye: "#5d7f66", jaw: 1.02, nos: 1.25, brw: 1.5 },
    sofia: { skin: "#eebf9d", hair: "#4a2c1c", st: 3, fem: 1, eye: "#4a6b3a", jaw: .92, nos: .9, brw: .85 },
    valen: { skin: "#8a583a", hair: "#17100d", st: 4, fem: 1, eye: "#2a1a10", jaw: .94, nos: 1.0, brw: .95 },
    camila: { skin: "#cf9a6d", hair: "#2b1b13", st: 5, fem: 1, eye: "#3d2a1a", jaw: .9, nos: .88, brw: .85 },
    nora: { skin: "#f0d0b2", hair: "#d9d9e0", st: 6, fem: 1, old: 1, eye: "#587a99", jaw: .95, nos: 1.05, brw: .8 }
  };
  var A = { ok: false }, cv, gl, pr, U = {}, cache = new Map();
  var rgb = function (h) { var n = parseInt(String(h).slice(1), 16); return [(n >> 16 & 255) / 255, (n >> 8 & 255) / 255, (n & 255) / 255]; };
  var lin = function (h) { return rgb(h).map(function (v) { return Math.pow(v, 2.2); }); }; // el sombreado trabaja en espacio lineal
  function init() {
    try {
      cv = document.createElement("canvas"); cv.width = cv.height = 8;
      gl = cv.getContext("webgl2", { preserveDrawingBuffer: true, antialias: false, powerPreference: "low-power" }); if (!gl) return;
      var sh = function (t, s) { var o = gl.createShader(t); gl.shaderSource(o, s); gl.compileShader(o); if (!gl.getShaderParameter(o, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(o)); return o; };
      pr = gl.createProgram(); gl.attachShader(pr, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, FS)); gl.linkProgram(pr);
      if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(pr));
      gl.useProgram(pr); var b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
      var loc = gl.getAttribLocation(pr, "a"); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
      ["R", "yaw", "old", "fem", "jaw", "nos", "brw", "sweat", "skin", "hairc", "shirt", "eyec", "style", "beard", "acc", "mood"].forEach(function (k) { U[k] = gl.getUniformLocation(pr, k); });
      A.ok = true;
    } catch (e) { A.ok = false; A.err = String(e.message || e); }
  }
  /** Dibuja una persona en un canvas (o en el interno) y devuelve el canvas. a: {kind,skin,color,acc,gender}; mood: normal|effort|funny; yaw en radianes. */
  A.draw = function (a, mood, px, yaw) {
    if (!A.ok) return null; var p = P[a.kind] || P.mateo; cv.width = cv.height = px; gl.viewport(0, 0, px, px);
    var skin = /^#[0-9a-f]{6}$/i.test(a.skin || "") ? a.skin : p.skin, sh = /^#[0-9a-f]{6}$/i.test(a.color || a.shirt || "") ? (a.color || a.shirt) : "#4fc3f7";
    gl.uniform2f(U.R, px, px); gl.uniform1f(U.yaw, yaw || 0); gl.uniform1f(U.old, p.old ? 1 : 0); gl.uniform1f(U.fem, p.fem ? 1 : 0); gl.uniform1f(U.jaw, p.jaw); gl.uniform1f(U.nos, p.nos); gl.uniform1f(U.brw, p.brw);
    gl.uniform1f(U.sweat, mood === "effort" ? 1 : 0); gl.uniform3fv(U.skin, lin(skin)); gl.uniform3fv(U.hairc, lin(p.hair)); gl.uniform3fv(U.shirt, lin(sh)); gl.uniform3fv(U.eyec, lin(p.eye));
    gl.uniform1i(U.style, p.st); gl.uniform1i(U.beard, p.beard || 0); gl.uniform1i(U.acc, +a.acc || 0); gl.uniform1i(U.mood, mood === "funny" ? 2 : mood === "effort" ? 1 : 0);
    gl.drawArrays(gl.TRIANGLES, 0, 3); return cv;
  };
  /** Imagen (data URL) de una persona, guardada en memoria: dibujarla cuesta unos milisegundos una sola vez. */
  A.url = function (a, mood, size) {
    if (!A.ok) return null; mood = mood || "normal"; var px = size <= 64 ? 160 : size <= 140 ? 256 : 384;
    var k = [a.kind, a.skin || "", a.color || a.shirt || "", +a.acc || 0, mood, px].join("|"); var u = cache.get(k);
    if (!u) { var c = A.draw(a, mood, px, -.1); if (!c) return null; u = c.toDataURL("image/jpeg", .88); if (cache.size > 80) cache.delete(cache.keys().next().value); cache.set(k, u); }
    return u;
  };
  /** Prepara el dibujo 3D (compila el sombreador). Es pesado en algunos celulares, así que solo se llama cuando la persona activa la opción. */
  A.init = function () { if (!A.tried) { A.tried = true; init(); } return A.ok; };
  window.A3D = A;
})();
