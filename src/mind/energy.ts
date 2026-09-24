/* The energy layer: liquid light that moves through the site the way a waveguide moves a wave.

   Vessels (stocks) sit at the foot of cards and hold liquid energy; their level is what the card holds.
   Guides are glass channels between them. Light travels inside every guide all the time, bouncing off its
   walls the way light stays inside an optical fibre (total internal reflection). When energy moves, a slug
   of liquid runs through the guide and pours into the next vessel: its surface takes the impact, a few
   droplets leap and fall back, and bubbles rise. A vessel with no guide into it wells up from below.

   Positions are document pixels, so everything belongs to the page and scrolls with it. It is drawn on its
   own canvas above the page, only inside vessels and along guides, which run through gutters and the
   empty foot of cards and never over words. */

export type Vessel = {
  el: HTMLElement; top: number; left: number; width: number; height: number; radius: number;
  cardTop: number; cardBottom: number; cardLeft: number; cardRight: number;
  base: number; level: number; target: number; vel: number; slosh: number;
  seen: boolean; filled: boolean; fed: boolean;
  impactX: number; impactT: number; impactS: number;
};
export type Guide = {
  id: string; from: Vessel | null; to: Vessel | null;
  pts: number[][]; cum: number[]; len: number;
  flow: { t0: number; dur: number; amount: number; arrived: boolean } | null;
  done: boolean;
  /** How much light runs through it: a chosen path burns brighter. */
  light: number;
};
type Drop = { x: number; y: number; vx: number; vy: number; r: number; life: number; max: number; floor: number };

const MAX_POOLS = 8, MAX_SEG = 64, MAX_GUIDES = 10, MAX_DROPS = 24;

const VS = `#version 300 es
in vec2 aPos; void main() { gl_Position = vec4(aPos, 0.0, 1.0); }`;
const FS = `#version 300 es
precision highp float;
uniform vec2 uRes;
uniform float uDpr, uTime;
uniform vec4 uPools[${MAX_POOLS}];   // x0, y0, x1, y1 (viewport px)
uniform vec4 uLevels[${MAX_POOLS}];  // surface y, slosh, activity, seed
uniform vec4 uShape[${MAX_POOLS}];   // corner radius
uniform vec4 uImpact[${MAX_POOLS}];  // x, age, strength
uniform int uPoolN;
uniform vec4 uSeg[${MAX_SEG}];       // x0, y0, x1, y1
uniform vec4 uSegK[${MAX_SEG}];      // arc length at start, guide index, tube radius
uniform int uSegN;
uniform vec4 uGuide[${MAX_GUIDES}];  // slug tail, slug head, length, light
uniform vec4 uDrops[${MAX_DROPS}];   // x, y, r, alpha
uniform int uDropN;
uniform vec3 uHue;
out vec4 o;
float h1(float n) { return fract(sin(n * 91.3458) * 47453.5453); }
float bump(float d2, float r) {
  float R = r * 2.2; float q = d2 / (R * R);
  if (q >= 1.0) return 0.0;
  float k = 1.0 - q, k0 = 1.0 - 1.0 / 4.84;
  return (k * k * k) / (k0 * k0 * k0);
}
float sdBox(vec2 p, vec2 c, vec2 h, float r) { vec2 q = abs(p - c) - h + r; return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r; }
float surfaceY(vec4 pool, vec4 lv, vec4 im, float x) {
  x = clamp(x, pool.x, pool.z);
  float w = (x - pool.x) / max(1.0, pool.z - pool.x);
  float sway = sin(w * 6.2 + uTime * 1.7 + lv.w) * (1.4 + lv.y * 5.0) + sin(w * 13.0 - uTime * 2.3 + lv.w * 2.0) * (0.5 + lv.y * 2.2);
  // The meniscus climbs the walls: the bright rounded ends in the films.
  float men = 4.0 * (exp(-(x - pool.x) / 7.0) + exp(-(pool.z - x) / 7.0));
  // Where energy landed, rings run out across the surface and settle.
  float dx = abs(x - im.x), age = im.y;
  float ring = age >= 0.0 && age < 3.0 ? im.z * 7.0 * exp(-age * 1.5) * sin(dx * 0.17 - age * 10.0) * exp(-dx / 110.0) : 0.0;
  return lv.x + sway - men + ring;
}
vec3 liquid(vec2 p, float depth, float fres, vec3 cyan) {
  vec3 deep = vec3(0.05, 0.22, 0.72);
  vec3 col = mix(deep, cyan, 0.35 + 0.65 * fres);
  float caust = pow(abs(sin(p.x * 0.061 + uTime * 0.9 + sin(p.y * 0.11 - uTime * 0.7) * 1.9) * sin(p.x * 0.023 - p.y * 0.05 + uTime * 0.6)), 6.0);
  col += cyan * caust * 0.3 * depth;
  col = mix(col, vec3(0.5, 0.36, 1.0), 0.28 * depth * (0.5 + 0.5 * sin(p.x * 0.013 + uTime * 0.5)));
  return col;
}
float tri(float x) { return abs(fract(x) * 2.0 - 1.0) * 2.0 - 1.0; }
void main() {
  vec2 p = vec2(gl_FragCoord.x, uRes.y * uDpr - gl_FragCoord.y) / uDpr;
  vec3 cyan = mix(vec3(0.36, 0.9, 1.0), uHue, 0.3);
  vec3 col = vec3(0.0); float alpha = 0.0;

  // ---- Guides: glass channels, light bouncing inside them, and liquid running through them.
  float best = 1e9, bs = 0.0, bside = 0.0; int bi = -1; float br = 4.0;
  for (int i = 0; i < ${MAX_SEG}; i++) {
    if (i >= uSegN) break;
    vec4 sg = uSeg[i];
    vec2 pa = p - sg.xy, ba = sg.zw - sg.xy;
    float L = max(length(ba), 0.001);
    float h = clamp(dot(pa, ba) / (L * L), 0.0, 1.0);
    vec2 q = pa - ba * h;
    float d = length(q);
    if (d < best) { best = d; bs = uSegK[i].x + h * L; bi = int(uSegK[i].y); br = uSegK[i].z; bside = sign(ba.x * pa.y - ba.y * pa.x) * d; }
  }
  if (bi >= 0 && best < br * 3.2 + 8.0) {
    vec4 gd = uGuide[bi];
    float r = br, d = best;
    // Where liquid is running, the whole channel is energised around it.
    float live = 0.0;
    if (gd.y > gd.x + 0.5) live = exp(-pow(max(max(gd.x - bs, bs - gd.y), 0.0) / 60.0, 2.0));
    // The channel: a luminous core, a faint glass edge and a soft outer glow.
    float core = exp(-pow(d / (r * 0.42), 2.0)) * (0.26 + live * 0.4);
    float glass = exp(-pow((d - r) / 0.75, 2.0)) * 0.1;
    float glow = exp(-pow(d / (r * 2.8), 2.0)) * (0.06 + live * 0.26);
    vec3 c = cyan * (core + glow) + vec3(0.7, 0.94, 1.0) * glass;
    float a = core + glass + glow;
    // Light inside: pulses travel from source to target, weaving wall to wall the way light stays in a fibre.
    for (int k = 0; k < 3; k++) {
      float sp = fract(uTime * 0.14 + float(k) / 3.0 + float(bi) * 0.37) * (gd.z + 80.0) - 40.0;
      float ds = bs - sp;
      float head = exp(-ds * ds / 70.0);
      float trail = ds < 0.0 ? exp(ds / 70.0) * 0.5 : 0.0;
      // A smooth weave between the walls: light staying inside by reflecting, drawn gently.
      float yb = r * 0.3 * sin(bs / (r * 2.6) * 3.14159) / (0.6 + 0.4 * gd.w);
      float across = exp(-pow((bside - yb) / (1.5 + trail * 2.2), 2.0));
      float ph = (head * 1.6 + trail) * across * gd.w;
      c += mix(cyan, vec3(0.95, 1.0, 1.0), head) * ph; a += ph * 0.85;
    }
    // Liquid: a slug with a rounded, bright head, filling the channel.
    if (gd.y > gd.x + 0.5) {
      float mid = (gd.x + gd.y) * 0.5, half_ = (gd.y - gd.x) * 0.5;
      vec2 cap = vec2(max(abs(bs - mid) - half_, 0.0), d);
      float sdf = length(cap) - r * 0.95;
      float body = smoothstep(1.0, -1.0, sdf);
      if (body > 0.0) {
        float toHead = clamp((bs - gd.x) / max(1.0, gd.y - gd.x), 0.0, 1.0);
        float inner = exp(-pow(d / (r * 0.5), 2.0));
        // Bands of light run forward through the liquid, and the head burns brightest.
        float bands = 0.5 + 0.5 * sin((bs - uTime * 150.0) * 0.11);
        vec3 lc = mix(vec3(0.06, 0.26, 0.8), cyan, 0.45 + 0.55 * inner) * (0.7 + 0.5 * toHead);
        lc += vec3(0.85, 0.98, 1.0) * inner * (0.2 + 0.3 * bands) * toHead;
        lc += vec3(0.5, 0.36, 1.0) * (1.0 - inner) * 0.25;
        lc += vec3(0.95, 1.0, 1.0) * exp(-pow((bs - gd.y) / 9.0, 2.0)) * 1.2;
        c = mix(c, lc, body); a = max(a, body * 0.96);
      }
    }
    col += c; alpha = max(alpha, clamp(a, 0.0, 1.0));
  }

  // ---- Vessels, splashes.
  float F = 0.0; float pool = -1.0, inPool = 0.0;
  for (int i = 0; i < ${MAX_DROPS}; i++) {
    if (i >= uDropN) break;
    vec2 d = p - uDrops[i].xy;
    F += bump(dot(d, d), uDrops[i].z) * uDrops[i].w;
  }
  for (int i = 0; i < ${MAX_POOLS}; i++) {
    if (i >= uPoolN) break;
    vec4 z = uPools[i];
    if (p.x < z.x - 2.0 || p.x > z.z + 2.0) continue;
    float box = sdBox(p, (z.xy + z.zw) * 0.5, (z.zw - z.xy) * 0.5, uShape[i].x);
    float inside = clamp(-box / 1.5, 0.0, 1.0);
    if (inside <= 0.0 && p.y > z.y) continue;
    float sd = p.y - surfaceY(z, uLevels[i], uImpact[i], p.x);
    float f = exp(clamp(sd / 12.0, -40.0, 12.0)) * (p.y < z.y ? 1.0 : inside);
    if (f > 0.05) { pool = float(i); inPool = inside; }
    F += f;
  }
  float aa = max(fwidth(F), 0.0005) * 1.2;
  float body = smoothstep(1.0 - aa, 1.0 + aa, F);
  float halo = smoothstep(0.3, 1.0, F) * (1.0 - body);
  if (body + halo > 0.003) {
    float depth = clamp((F - 1.0) / 2.2, 0.0, 1.0);
    vec3 n = normalize(vec3(-dFdx(F), -dFdy(F), 0.05));
    float spec = pow(max(dot(n, normalize(vec3(-0.4, -0.7, 0.6))), 0.0), 30.0);
    float fres = pow(1.0 - depth, 2.0);
    vec3 c = liquid(p, depth, fres, cyan) + vec3(0.92, 0.99, 1.0) * spec;
    if (pool >= 0.0 && body > 0.5 && inPool > 0.0) {
      int pi = int(pool); vec4 z = uPools[pi]; vec4 lv = uLevels[pi]; vec4 im = uImpact[pi];
      float sd = p.y - surfaceY(z, lv, im, p.x);
      c += vec3(0.8, 0.98, 1.0) * exp(-pow((sd - 2.0) / 2.2, 2.0)) * 0.75;
      // Bubbles rise through the pool, faster and brighter while it fills.
      float busy = 1.0 + lv.z * 3.0;
      for (int b = 0; b < 9; b++) {
        float fb = float(b) + lv.w * 3.1;
        float bx = z.x + 10.0 + h1(fb) * (z.z - z.x - 20.0);
        float travel = z.w - surfaceY(z, lv, im, bx);
        if (travel < 8.0) break;
        float by = z.w - 3.0 - fract(uTime * (0.1 + h1(fb + 5.0) * 0.22) * busy + h1(fb + 9.0)) * travel;
        float brr = 1.2 + h1(fb + 2.0) * min(3.0, travel * 0.12);
        float d = length(p - vec2(bx + sin(uTime * 1.3 + fb) * 2.5, by));
        c = mix(c, vec3(0.02, 0.1, 0.36), smoothstep(brr, brr - 1.0, d) * 0.5);
        c += vec3(0.75, 0.98, 1.0) * exp(-pow((d - brr) / 0.6, 2.0)) * (0.8 + lv.z * 0.6);
      }
    }
    float a = body * (0.8 + 0.2 * fres) + halo * 0.34;
    vec3 pc = c * body + cyan * halo * 0.95;
    col = col * (1.0 - a) + pc * a; alpha = alpha * (1.0 - a) + a;
  }
  if (alpha < 0.003) discard;
  o = vec4(col * min(alpha, 1.0), min(alpha, 1.0));
}`;

function compile(gl: WebGL2RenderingContext) {
  const make = (type: number, src: string) => {
    const s = gl.createShader(type)!;
    gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw Error(gl.getShaderInfoLog(s) || "energy shader");
    return s;
  };
  const p = gl.createProgram()!;
  gl.attachShader(p, make(gl.VERTEX_SHADER, VS)); gl.attachShader(p, make(gl.FRAGMENT_SHADER, FS));
  gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw Error(gl.getProgramInfoLog(p) || "energy link");
  const cache = new Map<string, WebGLUniformLocation | null>();
  return { p, u: (n: string) => { if (!cache.has(n)) cache.set(n, gl.getUniformLocation(p, n)); return cache.get(n)!; } };
}

const easeInOut = (t: number) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);

/** Round each corner of a guide into an arc, so light and liquid turn smoothly. */
export function rounded(pts: number[][], radius = 16) {
  if (pts.length < 3) return pts;
  const out = [pts[0]];
  for (let i = 1; i < pts.length - 1; i++) {
    const [px, py] = pts[i - 1], [cx, cy] = pts[i], [nx, ny] = pts[i + 1];
    const l1 = Math.hypot(cx - px, cy - py), l2 = Math.hypot(nx - cx, ny - cy);
    const r = Math.min(radius, l1 / 2, l2 / 2);
    if (r < 2) { out.push(pts[i]); continue; }
    const ax = cx + ((px - cx) / l1) * r, ay = cy + ((py - cy) / l1) * r;
    const bx = cx + ((nx - cx) / l2) * r, by = cy + ((ny - cy) / l2) * r;
    for (let k = 0; k <= 4; k++) {
      const t = k / 4, u = 1 - t;
      out.push([u * u * ax + 2 * u * t * cx + t * t * bx, u * u * ay + 2 * u * t * cy + t * t * by]);
    }
  }
  out.push(pts[pts.length - 1]);
  return out;
}

export function pathOf(pts: number[][]) {
  const cum = [0];
  for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  return { cum, len: cum[cum.length - 1] };
}

export class Energy {
  private gl: WebGL2RenderingContext;
  private prog; private vao: WebGLVertexArrayObject;
  vessels: Vessel[] = [];
  guides: Guide[] = [];
  private drops: Drop[] = [];
  private poolData = new Float32Array(MAX_POOLS * 4);
  private levelData = new Float32Array(MAX_POOLS * 4);
  private shapeData = new Float32Array(MAX_POOLS * 4);
  private impactData = new Float32Array(MAX_POOLS * 4);
  private segData = new Float32Array(MAX_SEG * 4);
  private segK = new Float32Array(MAX_SEG * 4);
  private guideData = new Float32Array(MAX_GUIDES * 4);
  private dropData = new Float32Array(MAX_DROPS * 4);
  private dirty = false;
  private guidesInView = 0;
  private w = 0; private h = 0; private dpr = 1;
  tube = 5;
  /** Energy arrived in a vessel. */
  onArrive: (v: Vessel) => void = () => {};

  constructor(private canvas: HTMLCanvasElement) {
    const gl = canvas.getContext("webgl2", { alpha: true, premultipliedAlpha: true, antialias: false });
    if (!gl) throw Error("webgl2 unavailable");
    this.gl = gl;
    this.prog = compile(gl);
    this.vao = gl.createVertexArray()!;
    const buf = gl.createBuffer()!;
    gl.bindVertexArray(this.vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(this.prog.p, "aPos");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    gl.bindVertexArray(null);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
  }

  resize(w: number, h: number, dpr: number) {
    this.w = w; this.h = h; this.dpr = dpr;
    this.canvas.width = Math.round(w * dpr); this.canvas.height = Math.round(h * dpr);
    this.tube = w < 700 ? 4.2 : 6;
    this.dirty = true;
  }

  /** Something is moving: a flow, a splash or a surface still settling. */
  get busy() { return this.drops.length > 0 || this.guides.some(g => g.flow) || this.vessels.some(v => v.seen && (Math.abs(v.vel) > 0.004 || v.slosh > 0.05)); }
  /** Something is on screen: pools sway and light runs through guides. */
  get active() { return this.busy || this.vessels.some(v => v.seen) || this.guidesInView > 0; }

  /** New measurements. Existing vessels and guides keep their state, so energy already moving keeps going. */
  setLayout(vessels: Vessel[], guides: Guide[]) {
    const oldV = new Map(this.vessels.map(v => [v.el, v]));
    this.vessels = vessels.map(v => {
      const o = oldV.get(v.el);
      if (!o) return v;
      if (o.base !== v.base && o.filled) o.target = v.base;
      return Object.assign(o, { top: v.top, left: v.left, width: v.width, height: v.height, radius: v.radius, cardTop: v.cardTop, cardBottom: v.cardBottom, cardLeft: v.cardLeft, cardRight: v.cardRight, base: v.base });
    });
    const byEl = new Map(this.vessels.map(v => [v.el, v]));
    const oldG = new Map(this.guides.map(g => [g.id, g]));
    this.guides = guides.map(g => {
      const from = g.from ? byEl.get(g.from.el) ?? null : null, to = g.to ? byEl.get(g.to.el) ?? null : null;
      const o = oldG.get(g.id);
      return o ? Object.assign(o, { from, to, pts: g.pts, cum: g.cum, len: g.len, light: g.light }) : { ...g, from, to };
    });
    this.dirty = true;
  }

  /** A vessel wells up from below the first time it is seen. */
  fill(v: Vessel, now: number) {
    if (v.filled) return;
    v.filled = true;
    v.target = v.base;
    v.slosh = 0.8;
    v.impactX = v.left + v.width * 0.5; v.impactT = now; v.impactS = 0.5;
  }

  /** Energy leaves one vessel and runs through a guide into the next. */
  flow(g: Guide, now: number, amount = 0.26) {
    if (g.flow || g.done || !g.to) return false;
    g.flow = { t0: now, dur: Math.min(2.4, Math.max(1.0, g.len / 340)), amount, arrived: false };
    if (g.from) { g.from.target = Math.max(0.08, g.from.target - amount * 0.4); g.from.slosh = Math.max(g.from.slosh, 0.4); }
    return true;
  }

  private slug(g: Guide, now: number) {
    if (!g.flow) return [0, 0];
    const t = (now - g.flow.t0) / g.flow.dur;
    const slugLen = Math.min(140, g.len * 0.45);
    const head = g.len * easeInOut(Math.min(1, t));
    // The tail leaves the source once the slug has formed, and drains into the target after the head lands.
    const tail = t < 1 ? Math.max(0, head - slugLen) : Math.min(g.len, g.len - slugLen + (t - 1) * g.flow.dur * 340);
    return [tail, head];
  }

  step(dt: number, now: number) {
    for (const v of this.vessels) {
      // A skin with weight: the level eases toward its target and sloshes when something lands.
      if (v.filled) v.target += (v.base - v.target) * Math.min(1, dt / 40);
      v.vel += ((v.target - v.level) * 14 - v.vel * 4.6) * dt;
      v.level += v.vel * dt;
      v.slosh = Math.max(0, v.slosh - dt * 0.5);
    }
    for (const g of this.guides) {
      if (!g.flow) continue;
      const t = (now - g.flow.t0) / g.flow.dur;
      if (t >= 1 && !g.flow.arrived && g.to) {
        g.flow.arrived = true;
        const v = g.to;
        v.filled = true;
        v.target = Math.min(0.94, Math.max(v.target, v.base) + g.flow.amount);
        v.slosh = 1;
        const end = g.pts[g.pts.length - 1];
        v.impactX = end[0]; v.impactT = now; v.impactS = 1;
        const surface = v.top + v.height - 3 - (v.height - 6) * Math.max(0.05, v.level);
        for (let k = 0; k < 7; k++) {
          const a = -Math.PI / 2 + (k / 6 - 0.5) * 1.6;
          const sp = 90 + (k % 3) * 45;
          this.drops.push({ x: end[0] - 8, y: surface - 2, vx: Math.cos(a) * sp * 0.8, vy: Math.sin(a) * sp, r: 1.8 + (k % 2), life: 0, max: 0.9, floor: surface + 2 });
        }
        if (this.drops.length > MAX_DROPS) this.drops.splice(0, this.drops.length - MAX_DROPS);
        this.onArrive(v);
      }
      const slugLen = Math.min(140, g.len * 0.45);
      if (t >= 1 + slugLen / (g.flow.dur * 340) + 0.05) { g.flow = null; g.done = true; }
    }
    for (const d of this.drops) {
      d.life += dt;
      d.vy += 900 * dt;
      d.x += d.vx * dt; d.y += d.vy * dt;
    }
    this.drops = this.drops.filter(d => d.life < d.max && !(d.vy > 0 && d.y > d.floor));
  }

  settle() { for (const v of this.vessels) { v.level = v.target = v.base; v.vel = 0; v.slosh = 0; v.filled = true; } this.drops = []; for (const g of this.guides) g.flow = null; }

  render(time: number, now: number, hue: number[], sy: number) {
    const gl = this.gl, top = sy - 80, bottom = sy + this.h + 80;
    let pn = 0;
    const boxes: number[][] = [];
    for (const v of this.vessels) {
      if (pn >= MAX_POOLS || v.top > bottom || v.top + v.height < top || (v.level < 0.012 && v.target < 0.012)) continue;
      const surface = v.top + v.height - 3 - (v.height - 6) * Math.max(0.03, v.level);
      this.poolData.set([v.left, v.top - sy, v.left + v.width, v.top + v.height - sy], pn * 4);
      this.levelData.set([surface - sy, v.slosh, Math.min(1, Math.abs(v.vel) * 3 + v.slosh * 0.4), (v.left * 0.013 + v.top * 0.007) % 6.28], pn * 4);
      this.shapeData.set([v.radius, 0, 0, 0], pn * 4);
      this.impactData.set([v.impactX, v.impactT ? now - v.impactT : -1, v.impactS, 0], pn * 4);
      boxes.push([v.left - 4, v.top - sy - 26, v.left + v.width + 4, v.top + v.height - sy + 4]);
      pn++;
    }
    let sn = 0, gn = 0;
    for (const g of this.guides) {
      if (gn >= MAX_GUIDES) break;
      let y0 = Infinity, y1 = -Infinity, x0 = Infinity, x1 = -Infinity;
      for (const p of g.pts) { x0 = Math.min(x0, p[0]); x1 = Math.max(x1, p[0]); y0 = Math.min(y0, p[1]); y1 = Math.max(y1, p[1]); }
      if (y0 > bottom || y1 < top || sn + g.pts.length - 1 > MAX_SEG) continue;
      const [tail, head] = this.slug(g, now);
      this.guideData.set([tail, head, g.len, g.light], gn * 4);
      for (let i = 0; i < g.pts.length - 1; i++) {
        this.segData.set([g.pts[i][0], g.pts[i][1] - sy, g.pts[i + 1][0], g.pts[i + 1][1] - sy], sn * 4);
        this.segK.set([g.cum[i], gn, this.tube, 0], sn * 4);
        sn++;
      }
      boxes.push([x0 - this.tube - 10, y0 - sy - this.tube - 10, x1 + this.tube + 10, y1 - sy + this.tube + 10]);
      gn++;
    }
    let dn = 0;
    for (const d of this.drops) {
      if (dn >= MAX_DROPS) break;
      const a = 1 - Math.max(0, (d.life - d.max * 0.6) / (d.max * 0.4));
      this.dropData.set([d.x, d.y - sy, d.r, a], dn++ * 4);
      boxes.push([d.x - d.r * 2.4 - 6, d.y - sy - d.r * 2.4 - 6, d.x + d.r * 2.4 + 6, d.y - sy + d.r * 2.4 + 6]);
    }
    this.guidesInView = gn;
    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    if (!pn && !sn && !dn) {
      if (this.dirty) { gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT); this.dirty = false; }
      return;
    }
    gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
    this.dirty = true;
    const p = this.prog;
    gl.useProgram(p.p);
    gl.uniform2f(p.u("uRes"), this.w, this.h);
    gl.uniform1f(p.u("uDpr"), this.dpr);
    gl.uniform1f(p.u("uTime"), time);
    gl.uniform4fv(p.u("uPools[0]"), this.poolData);
    gl.uniform4fv(p.u("uLevels[0]"), this.levelData);
    gl.uniform4fv(p.u("uShape[0]"), this.shapeData);
    gl.uniform4fv(p.u("uImpact[0]"), this.impactData);
    gl.uniform1i(p.u("uPoolN"), pn);
    gl.uniform4fv(p.u("uSeg[0]"), this.segData);
    gl.uniform4fv(p.u("uSegK[0]"), this.segK);
    gl.uniform1i(p.u("uSegN"), sn);
    gl.uniform4fv(p.u("uGuide[0]"), this.guideData);
    gl.uniform4fv(p.u("uDrops[0]"), this.dropData);
    gl.uniform1i(p.u("uDropN"), dn);
    gl.uniform3f(p.u("uHue"), hue[0], hue[1], hue[2]);
    gl.bindVertexArray(this.vao);
    // Shade only where energy can be: boxes round each vessel, guide and droplet, merged where they touch.
    const merged: number[][] = [];
    for (const b of boxes) {
      let m = b, changed = true;
      while (changed) {
        changed = false;
        for (let k = merged.length - 1; k >= 0; k--) {
          const o = merged[k];
          if (m[0] < o[2] && m[2] > o[0] && m[1] < o[3] && m[3] > o[1]) { m = [Math.min(m[0], o[0]), Math.min(m[1], o[1]), Math.max(m[2], o[2]), Math.max(m[3], o[3])]; merged.splice(k, 1); changed = true; }
        }
      }
      merged.push(m);
    }
    const dpr = this.dpr, W = this.canvas.width, H = this.canvas.height;
    gl.enable(gl.SCISSOR_TEST);
    for (const [x0, y0, x1, y1] of merged) {
      const L = Math.max(0, Math.floor(x0 * dpr)), R = Math.min(W, Math.ceil(x1 * dpr));
      const T = Math.max(0, Math.floor(y0 * dpr)), B = Math.min(H, Math.ceil(y1 * dpr));
      if (R <= L || B <= T) continue;
      gl.scissor(L, H - B, R - L, B - T);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }
    gl.disable(gl.SCISSOR_TEST);
    gl.bindVertexArray(null);
  }
}
