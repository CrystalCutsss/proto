const K=`#version 300 es
in vec2 aPosition;
out vec2 vUv;
void main() {
  vUv = aPosition * 0.5 + 0.5;
  gl_Position = vec4(aPosition, 0.0, 1.0);
}`,W=`#version 300 es
precision highp float;
in vec2 vUv;
out vec4 fragColor;

uniform vec2 uSize;
uniform float uRadius;
uniform float uScale;
uniform mat3 uRotate;
uniform float uView;
uniform float uRough;
uniform float uShine;
uniform float uHalo;
uniform float uHotspot;
uniform float uBevel;
uniform float uRim;
uniform vec3 uDeep;
uniform vec3 uMid;
uniform vec3 uSteel;
uniform vec3 uLight;
uniform float uCap;

const vec3 LUMA = vec3(0.2126, 0.7152, 0.0722);
// Ключевой свет: направление «сверху слева» (y вниз) и полоса софтбокса под −35° (идёт снизу слева вверх
// вправо), её центр в покое — чуть выше и левее центра плиты, полуширина и мягкость края. Единица — половина
// короткой стороны плиты: у широкой и высокой карточки полоса одной толщины и одного вида. Ореол — та же
// полоса, только широкая и слабая (один источник света, не отдельное пятно).
const vec2 LIGHT_DIR = vec2(-0.7071068, -0.7071068);
const vec2 STREAK_DIR = vec2(0.819152, -0.573576);
const vec2 STREAK_AT = vec2(-0.18, -0.22);
const float STREAK_HALF = 0.07;
const float STREAK_SOFT = 0.09;
const float HALO_SOFT = 0.55;

float hash(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

float valueNoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

float erf(float x) {
  float x2 = x * x;
  return sign(x) * sqrt(1.0 - exp(-x2 * (1.2732395 + 0.147 * x2) / (1.0 + 0.147 * x2)));
}

float band(float x, float halfWidth, float sigma) {
  float s = 1.4142136 * max(sigma, 0.0001);
  return 0.5 * (erf((x + halfWidth) / s) - erf((x - halfWidth) / s));
}

vec3 toSrgb(vec3 c) {
  c = clamp(c, 0.0, 1.0);
  return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(0.0031308, c));
}

void main() {
  vec2 p = vec2(vUv.x - 0.5, 0.5 - vUv.y) * uSize;
  vec2 halfSize = uSize * 0.5;
  float r = min(uRadius, min(halfSize.x, halfSize.y));
  vec2 corner = abs(p) - halfSize + r;
  vec2 side = vec2(p.x >= 0.0 ? 1.0 : -1.0, p.y >= 0.0 ? 1.0 : -1.0);
  float d;
  vec2 outward;
  if (corner.x > 0.0 && corner.y > 0.0) {
    d = length(corner) - r;
    outward = normalize(corner) * side;
  } else if (corner.x > corner.y) {
    d = corner.x - r;
    outward = vec2(side.x, 0.0);
  } else {
    d = corner.y - r;
    outward = vec2(0.0, side.y);
  }
  float coverage = clamp(0.5 - d * uScale, 0.0, 1.0);

  float chamferWidth = min(uBevel, max(r, 1.0));
  float chamfer = chamferWidth > 0.01 ? 1.0 - smoothstep(0.0, chamferWidth, -d) : 0.0;
  vec2 slope = outward * chamfer;

  // Шлифовка: тонкая горизонтальная «щётка», слегка колеблет нормаль.
  float grain = valueNoise(vec2(p.x * 0.008, p.y * 0.55)) * 0.6 + valueNoise(vec2(p.x * 0.019 + 3.7, p.y * 0.23)) * 0.4;
  slope.y += (grain - 0.5) * uRough * uRough * 0.004;

  // Отражённый луч: плоская плита без наклона даёт q = p / uView; наклон сдвигает q (вдвое против угла).
  vec3 normal = uRotate * normalize(vec3(slope, 1.0));
  vec3 position = uRotate * vec3(p, 0.0);
  vec3 view = normalize(position - vec3(0.0, 0.0, uView));
  vec3 bounce = reflect(view, normal);
  vec2 q = bounce.xy / max(bounce.z, 0.2);
  // В долях половины короткой стороны: геометрия света одинакова у широкой и высокой карточки.
  float unit = min(halfSize.x, halfSize.y);
  vec2 n = q * uView / unit;
  // Центр полосы в покое — от угла: у широкой карточки сдвигается к левому краю вместе с углом.
  vec2 at = STREAK_AT * vec2(halfSize.x / unit, 1.0);
  float soft = STREAK_SOFT + length(fwidth(n)) * 0.5;

  // (а) Полоса отражения софтбокса.
  vec2 across = vec2(-STREAK_DIR.y, STREAK_DIR.x);
  float offset = dot(n - at, across);
  float streak = band(offset, STREAK_HALF, soft);
  // (б) Ореол той же полосы: широкий мягкий спад света по обе стороны от неё — один источник.
  float halo = exp(-offset * offset / (2.0 * HALO_SOFT * HALO_SOFT));
  // Едва заметное широкое ядро в середине полосы.
  vec2 along = n - at;
  float hotspot = exp(-dot(along, along) * 1.5) * streak;

  vec2 dir = vec2(-0.5, -0.8660254);
  float t = clamp(dot(p, dir) / (abs(uSize.x * dir.x) + abs(uSize.y * dir.y)) + 0.5, 0.0, 1.0);
  vec3 base = t < 0.5 ? mix(uDeep, uMid, t * 2.0) : mix(uMid, uSteel, (t - 0.5) * 2.0);
  vec3 metal = base * mix(0.88, 1.1, halo) * (1.0 + (grain - 0.5) * uRough * 0.12);
  metal *= min(1.0, uCap / max(dot(metal, LUMA), 0.00001));

  // Свет — экранное смешение к --metal-gl-highlight. Яркость screen растёт линейно с непрозрачностью s, поэтому
  // потолок uCap (белый текст ≥ AA в любой точке) ограничивает непрозрачность: s мягко подходит к sMax.
  float s = streak * uShine + halo * uHalo + hotspot * uHotspot;
  float gain = max(dot(LUMA, (1.0 - metal) * uLight), 0.0001);
  float sMax = max(uCap - dot(metal, LUMA), 0.0) / gain;
  float knee = sMax * 0.6;
  s = s <= knee ? s : knee + (sMax - knee) * (1.0 - exp(-(s - knee) / max(sMax - knee, 0.00001)));
  vec3 color = 1.0 - (1.0 - metal) * (1.0 - s * uLight);

  // Фаска — тот же свет: светлая сверху слева, тёмная снизу справа.
  float rim = chamfer * dot(outward, LIGHT_DIR);
  color += uLight * max(rim, 0.0) * uRim;
  color *= 1.0 - max(-rim, 0.0) * 0.75;

  vec3 outColor = toSrgb(color) + (hash(gl_FragCoord.xy) - 0.5) / 255.0;
  outColor = clamp(outColor, 0.0, 1.0);
  fragColor = vec4(outColor * coverage, coverage);
}`;function O(t,e,a){const o=t.createShader(e);return o?(t.shaderSource(o,a),t.compileShader(o),t.getShaderParameter(o,t.COMPILE_STATUS)?o:(t.deleteShader(o),null)):null}function q(t){const e=O(t,t.VERTEX_SHADER,K),a=O(t,t.FRAGMENT_SHADER,W),o=e&&a?t.createProgram():null;if(!e||!a||!o)return e&&t.deleteShader(e),a&&t.deleteShader(a),null;if(t.attachShader(o,e),t.attachShader(o,a),t.bindAttribLocation(o,0,"aPosition"),t.linkProgram(o),t.deleteShader(e),t.deleteShader(a),!t.getProgramParameter(o,t.LINK_STATUS))return t.deleteProgram(o),null;const r={},i=t.getProgramParameter(o,t.ACTIVE_UNIFORMS);for(let n=0;n<i;n++){const c=t.getActiveUniform(o,n);c&&(r[c.name]=t.getUniformLocation(o,c.name))}return{program:o,uniforms:r}}function X(t){const e=t.getContext("webgl2",{alpha:!0,premultipliedAlpha:!0,antialias:!1,depth:!1,stencil:!1,powerPreference:"low-power"});if(!e)return null;const a=q(e);if(!a)return null;const{program:o,uniforms:r}=a,i=e.createVertexArray();e.bindVertexArray(i);const n=e.createBuffer();e.bindBuffer(e.ARRAY_BUFFER,n),e.bufferData(e.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),e.STATIC_DRAW),e.enableVertexAttribArray(0),e.vertexAttribPointer(0,2,e.FLOAT,!1,0,0),e.disable(e.BLEND),e.disable(e.DEPTH_TEST);const c=new Float32Array(9);return{render:(l,u)=>{if(e.isContextLost())return;const d=Math.cos(l.rotateX),v=Math.sin(l.rotateX),p=Math.cos(l.rotateY),x=Math.sin(l.rotateY);c.set([p,v*x,-d*x,0,d,v,x,-v*p,d*p]),e.bindFramebuffer(e.FRAMEBUFFER,null),e.viewport(0,0,t.width,t.height),e.useProgram(o),e.bindVertexArray(i),e.uniform2f(r.uSize,l.width,l.height),e.uniform1f(r.uRadius,u.radius),e.uniform1f(r.uScale,t.width/Math.max(1,l.width)),e.uniformMatrix3fv(r.uRotate,!1,c),e.uniform1f(r.uView,u.view),e.uniform1f(r.uRough,u.rough),e.uniform1f(r.uShine,u.shine),e.uniform1f(r.uHalo,u.halo),e.uniform1f(r.uHotspot,u.hotspot),e.uniform1f(r.uBevel,u.bevel),e.uniform1f(r.uRim,u.rim),e.uniform3fv(r.uDeep,u.deep),e.uniform3fv(r.uMid,u.mid),e.uniform3fv(r.uSteel,u.steel),e.uniform3fv(r.uLight,u.light),e.uniform1f(r.uCap,u.cap),e.drawArrays(e.TRIANGLES,0,3)},dispose:()=>{e.isContextLost()||(e.deleteBuffer(n),e.deleteVertexArray(i),e.deleteProgram(o))}}}const Y=120,G=16,$=1/120,E=-.4,F=-.6,U=5e-4,A=(t,e,a)=>Math.min(a,Math.max(e,t));function j(t,e){t.v+=(Y*(t.target-t.p)-G*t.v)*e,t.p+=t.v*e}const J=t=>Math.abs(t.target-t.p)<U&&Math.abs(t.v)<U,Q=t=>t<=.04045?t/12.92:Math.pow((t+.055)/1.055,2.4);function Z(){const t=document.createElement("canvas");t.width=1,t.height=1;const e=t.getContext("2d",{willReadFrequently:!0});return a=>{if(!e)return[1,1,1];e.clearRect(0,0,1,1),e.fillStyle=a||"transparent",e.fillRect(0,0,1,1);const[o=0,r=0,i=0]=e.getImageData(0,0,1,1).data;return[o,r,i].map(n=>Q(n/255))}}function w(t,e){const a=parseFloat(t);return Number.isNaN(a)?0:t.trim().endsWith("rem")?a*e:a}function V(t,e){const a=getComputedStyle(t),o=f=>a.getPropertyValue(f).trim(),r=f=>parseFloat(o(f))||0,i=parseFloat(getComputedStyle(document.documentElement).fontSize)||16,n=e(o("--primary-foreground")),m=(.2126*n[0]+.7152*n[1]+.0722*n[2]+.05)/r("--metal-gl-contrast")-.05;return{deep:e(o("--metal-deep")),mid:e(o("--metal-mid")),steel:e(o("--metal-steel")),light:e(o("--metal-gl-highlight")),cap:m,radius:parseFloat(a.borderTopLeftRadius)||0,view:w(o("--metal-perspective"),i),shine:r("--metal-gl-shine"),halo:r("--metal-gl-halo"),hotspot:r("--metal-gl-hotspot"),bevel:w(o("--metal-gl-bevel"),i),rim:r("--metal-gl-rim"),rough:r("--metal-gl-rough")}}function T(t,e,a,o,r){let i=0;for(const n of[-1,1])for(const c of[-1,1]){const m=n*t*Math.cos(o),f=-n*t*Math.sin(o),l=c*e*Math.cos(a)-f*Math.sin(a),u=c*e*Math.sin(a)+f*Math.cos(a),d=r/Math.max(1,r-u);i=Math.max(i,Math.abs(m*d)-t,Math.abs(l*d)-e)}return i}function L(t){if(t(1))return 1;let e=0,a=1;for(let o=0;o<24;o++){const r=(e+a)/2;t(r)?e=r:a=r}return e}function ee(t,e,a,o,r){const i=t/2,n=e/2;if(!i||!n||!a||!o)return{ax:0,ay:0};const c=o*L(l=>T(i,n,o*l,0,a)<=r),m=o*L(l=>T(i,n,0,o*l,a)<=r),f=L(l=>T(i,n,c*l,m*l,a)<=r);return{ax:c*f,ay:m*f}}function te(t,e){const a=window.matchMedia("(hover: hover) and (pointer: fine)").matches&&!window.matchMedia("(prefers-reduced-motion: reduce)").matches,o={p:0,v:0,target:0},r={p:0,v:0,target:0},i={p:E,v:0,target:E},n={p:F,v:0,target:F},c={width:t.offsetWidth,height:t.offsetHeight};let m=null,f=null,l=null,u=0,d=0,v=!1;const p={ax:0,ay:0},x=()=>{if(!a)return;const s=getComputedStyle(t),h=parseFloat(getComputedStyle(document.documentElement).fontSize)||16,g=(parseFloat(s.getPropertyValue("--metal-tilt-max"))||0)*(Math.PI/180),S=w(s.getPropertyValue("--metal-perspective").trim(),h),R=w(s.getPropertyValue("--metal-tilt-overshoot").trim(),h);Object.assign(p,ee(c.width,c.height,S,g,R)),t.style.setProperty("--metal-tilt-x",`${(p.ax*180/Math.PI).toFixed(3)}deg`),t.style.setProperty("--metal-tilt-y",`${(p.ay*180/Math.PI).toFixed(3)}deg`)},N=()=>{if(!a)return;const s=t.style;s.setProperty("--metal-rx",A(o.p,-1,1).toFixed(4)),s.setProperty("--metal-ry",A(r.p,-1,1).toFixed(4)),s.setProperty("--metal-x",`${((i.p+1)*50).toFixed(2)}%`),s.setProperty("--metal-y",`${((n.p+1)*50).toFixed(2)}%`)},b=()=>{if(!m||!f)return;const s={width:c.width,height:c.height,rotateX:A(r.p,-1,1)*p.ax,rotateY:-A(o.p,-1,1)*p.ay};m.render(s,f)},P=s=>{u=0;const h=Math.min(.05,(s-d)/1e3||0);d=s;const g=Math.max(1,Math.ceil(h/$)),S=h/g;for(let y=0;y<g;y++)for(const B of[o,r,i,n])j(B,S);const R=![o,r,i,n].every(J);if(!R)for(const y of[o,r,i,n])y.p=y.target,y.v=0;N(),b(),R&&!v&&(u=requestAnimationFrame(P))},z=()=>{u||v||(d=performance.now(),u=requestAnimationFrame(P))},_=()=>{c.width=t.offsetWidth,c.height=t.offsetHeight;const s=Math.min(window.devicePixelRatio||1,2);e.width=Math.max(1,Math.round(c.width*s)),e.height=Math.max(1,Math.round(c.height*s)),l&&(f=V(t,l)),x(),b()},M=s=>{if(s.pointerType!=="mouse")return;const h=t.getBoundingClientRect();if(!h.width||!h.height)return;const g=A((s.clientX-h.left)/h.width*2-1,-1,1),S=A((s.clientY-h.top)/h.height*2-1,-1,1);o.target=g,r.target=S,i.target=g,n.target=S,z()},C=s=>{s.pointerType==="mouse"&&(o.target=0,r.target=0,i.target=E,n.target=F,z())};a&&(t.addEventListener("pointerenter",M),t.addEventListener("pointermove",M),t.addEventListener("pointerleave",C)),x();const I=new ResizeObserver(_);I.observe(t);const k=new MutationObserver(()=>{l&&(f=V(t,l),b())});k.observe(document.documentElement,{attributes:!0,attributeFilter:["class","style","data-theme"]});const H=()=>{m?.dispose(),m=null,delete t.dataset.gl},D=s=>{s.preventDefault(),H()};return e.addEventListener("webglcontextlost",D),m=X(e),m&&(l=Z(),_(),t.dataset.gl="on"),()=>{v=!0,cancelAnimationFrame(u),I.disconnect(),k.disconnect(),e.removeEventListener("webglcontextlost",D),a&&(t.removeEventListener("pointerenter",M),t.removeEventListener("pointermove",M),t.removeEventListener("pointerleave",C)),H()}}export{te as mountMetal};
