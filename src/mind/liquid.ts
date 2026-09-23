/* Liquid energy: neon liquid that gathers out of the dots, beads, necks, drips from one card to the next and
   pools in each card's stock. It follows the two supplied films: a ribbon pours into a glass vessel, the
   surface sways and carries bubbles, a bead necks from the bottom and lets go, and where it lands a ring
   spreads and a few droplets leap and fall back.

   The liquid is a metaball field. Drops add a compact kernel, a pour adds a ribbon, pools add a surface that
   rises and sways. Where the field passes 1 there is liquid, so a drop meeting a pool merges with it and a
   bead leaving a vessel necks and snaps by itself. It draws on its own canvas above the page, only inside
   stock zones, in the gaps between cards and along card edges, never over text. Positions are document
   pixels, so the liquid belongs to the page and scrolls with it. */

/** A stock: a liquid zone in a card ("pool"), or a surface drops land on ("land"). Document pixels, measured on layout changes only. */
export type Stock = {
  el: HTMLElement; kind: "pool" | "land";
  top: number; left: number; width: number; height: number; radius: number;
  cardTop: number; cardBottom: number; cardLeft: number; cardRight: number;
  /** Open space above the card where dots can gather into a bead, if there is any. */
  src: { x: number; y: number } | null;
  /** The vessel directly above, with nothing but open space between: it can drip into this one. */
  aboveEl: HTMLElement | null;
  base: number; level: number; target: number; vel: number; slosh: number; fed: number; seen: boolean;
};
type Drop = {
  x: number; y: number; vx: number; vy: number; r: number; grow: number; life: number;
  state: "bead" | "fall" | "spray" | "run"; from: Stock | null; to: Stock | null; hold: number;
  floor: number; neckY: number; path: number[][]; leg: number; trail: number[][];
};
type Ripple = { x: number; y: number; t0: number; s: number; clip: boolean };
type Pour = { to: Stock; x0: number; y0: number; t0: number; head: number; hold: number; tail: number; amp: number; fill: number; lastSpray: number };

const MAX_DROPS = 44, MAX_POOLS = 8, MAX_RIPPLES = 6, STREAM = 24;

const VS = `#version 300 es
in vec2 aPos; void main() { gl_Position = vec4(aPos, 0.0, 1.0); }`;
const FS = `#version 300 es
precision highp float;
uniform vec2 uRes;
uniform float uDpr, uTime;
uniform vec4 uDrops[${MAX_DROPS}];
uniform int uDropN;
uniform vec4 uPools[${MAX_POOLS}];   // x0, y0, x1, y1 of the zone (viewport px)
uniform vec4 uLevels[${MAX_POOLS}];  // surface y, slosh, level, seed
uniform vec4 uShape[${MAX_POOLS}];   // corner radius
uniform int uPoolN;
uniform vec4 uRipples[${MAX_RIPPLES}];
uniform vec4 uStream[${STREAM}];
uniform int uStreamN;
uniform vec3 uHue;
out vec4 o;
float h1(float n) { return fract(sin(n * 91.3458) * 47453.5453); }
// Compact metaball: 1 at the radius, 0 beyond 2.2 radii, so distant drops never pull at each other.
float bump(float d2, float r) {
  float R = r * 2.2; float q = d2 / (R * R);
  if (q >= 1.0) return 0.0;
  float k = 1.0 - q, k0 = 1.0 - 1.0 / 4.84;
  return (k * k * k) / (k0 * k0 * k0);
}
float sdBox(vec2 p, vec2 c, vec2 h, float r) { vec2 q = abs(p - c) - h + r; return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r; }
float surfaceY(vec4 pool, vec4 lv, float x) {
  x = clamp(x, pool.x, pool.z);
  float w = (x - pool.x) / max(1.0, pool.z - pool.x);
  float sway = sin(w * 6.2 + uTime * 1.7 + lv.w) * (1.6 + lv.y * 5.0) + sin(w * 13.0 - uTime * 2.3 + lv.w * 2.0) * (0.6 + lv.y * 2.2);
  // The meniscus climbs the walls, the bright rounded ends in the films.
  float men = 4.5 * (exp(-(x - pool.x) / 8.0) + exp(-(pool.z - x) / 8.0));
  return lv.x + sway - men;
}
void main() {
  vec2 p = vec2(gl_FragCoord.x, uRes.y * uDpr - gl_FragCoord.y) / uDpr;
  float F = 0.0, spray = 0.0, pool = -1.0, inPool = 0.0;
  for (int i = 0; i < ${MAX_DROPS}; i++) {
    if (i >= uDropN) break;
    vec2 d = p - uDrops[i].xy;
    float k = bump(dot(d, d), uDrops[i].z);
    F += k; spray = max(spray, k * uDrops[i].w);
  }
  // The pour: one ribbon, the field of its nearest segment, so it stays smooth along its length.
  float S = 0.0;
  for (int i = 0; i < ${STREAM - 1}; i++) {
    if (i >= uStreamN - 1) break;
    vec4 a = uStream[i], b = uStream[i + 1];
    vec2 pa = p - a.xy, ba = b.xy - a.xy;
    float h = clamp(dot(pa, ba) / max(dot(ba, ba), 0.001), 0.0, 1.0);
    vec2 d = pa - ba * h;
    S = max(S, bump(dot(d, d), mix(a.z, b.z, h)));
  }
  F += S;
  for (int i = 0; i < ${MAX_POOLS}; i++) {
    if (i >= uPoolN) break;
    vec4 z = uPools[i];
    if (p.x < z.x - 2.0 || p.x > z.z + 2.0) continue;
    float box = sdBox(p, (z.xy + z.zw) * 0.5, (z.zw - z.xy) * 0.5, uShape[i].x);
    float inside = clamp(-box / 1.5, 0.0, 1.0);
    if (inside <= 0.0 && p.y > z.y) continue;
    float sd = p.y - surfaceY(z, uLevels[i], p.x);
    // Above the vessel the surface still glows a little, so drops can merge into it from above.
    float f = exp(clamp(sd / 12.0, -40.0, 12.0)) * (p.y < z.y ? step(z.x, p.x) * step(p.x, z.z) : inside);
    if (f > 0.05) { pool = float(i); inPool = inside; }
    F += f;
  }
  float aa = max(fwidth(F), 0.0005) * 1.2;
  float body = smoothstep(1.0 - aa, 1.0 + aa, F);
  float halo = smoothstep(0.3, 1.0, F) * (1.0 - body);
  // Ripples: flattened rings. On a card's rim they stay at the rim; on a surface like Surge they cross it.
  float ring = 0.0;
  for (int i = 0; i < ${MAX_RIPPLES}; i++) {
    vec4 r = uRipples[i];
    float age = uTime - r.z, s = abs(r.w);
    if (age > 0.0 && age < 1.6 && s > 0.0) {
      vec2 d = (p - r.xy) * vec2(1.0, 3.4);
      float rr = length(d), rad = age * 118.0, fade = (1.0 - age / 1.6) * s;
      float k = exp(-pow((rr - rad) / 2.6, 2.0)) + 0.6 * exp(-pow((rr - rad * 0.62) / 2.2, 2.0));
      if (r.w < 0.0) k *= smoothstep(r.y + 13.0, r.y + 3.0, p.y);
      ring += k * fade;
    }
  }
  if (body + halo + ring < 0.003) discard;
  float depth = clamp((F - 1.0) / 2.2, 0.0, 1.0);
  vec3 n = normalize(vec3(-dFdx(F), -dFdy(F), 0.05));
  float spec = pow(max(dot(n, normalize(vec3(-0.4, -0.7, 0.6))), 0.0), 30.0);
  float fres = pow(1.0 - depth, 2.0);
  vec3 cyan = mix(vec3(0.36, 0.9, 1.0), uHue, 0.3);
  vec3 deep = vec3(0.05, 0.22, 0.72);
  vec3 col = mix(deep, cyan, 0.35 + 0.65 * fres);
  // Light moving through the body, and violet in its depths, as in the films.
  float caust = pow(abs(sin(p.x * 0.061 + uTime * 0.9 + sin(p.y * 0.11 - uTime * 0.7) * 1.9) * sin(p.x * 0.023 - p.y * 0.05 + uTime * 0.6)), 6.0);
  col += cyan * caust * 0.28 * depth;
  col = mix(col, vec3(0.5, 0.36, 1.0), 0.28 * depth * (0.5 + 0.5 * sin(p.x * 0.013 + uTime * 0.5)));
  col += vec3(0.92, 0.99, 1.0) * spec;
  if (pool >= 0.0 && body > 0.5 && inPool > 0.0) {
    int pi = int(pool); vec4 z = uPools[pi]; vec4 lv = uLevels[pi];
    // The surface line catches the light.
    float sd = p.y - surfaceY(z, lv, p.x);
    col += vec3(0.8, 0.98, 1.0) * exp(-pow((sd - 2.0) / 2.2, 2.0)) * 0.7;
    // Bubbles rise through the pool.
    for (int b = 0; b < 8; b++) {
      float fb = float(b) + lv.w * 3.1;
      float bx = z.x + 10.0 + h1(fb) * (z.z - z.x - 20.0);
      float travel = z.w - surfaceY(z, lv, bx);
      if (travel < 8.0) break;
      float by = z.w - 3.0 - fract(uTime * (0.1 + h1(fb + 5.0) * 0.22) + h1(fb + 9.0)) * travel;
      float br = 1.3 + h1(fb + 2.0) * min(3.0, travel * 0.12);
      float d = length(p - vec2(bx + sin(uTime * 1.3 + fb) * 2.5, by));
      col = mix(col, deep * 0.5, smoothstep(br, br - 1.0, d) * 0.5);
      col += vec3(0.75, 0.98, 1.0) * exp(-pow((d - br) / 0.6, 2.0)) * 0.9;
    }
  }
  float a = body * (0.78 + 0.22 * fres) + halo * 0.34 + ring * 0.8;
  vec3 c = col * body + cyan * halo * 0.95 + vec3(0.78, 0.97, 1.0) * ring;
  o = vec4(c * a, a);
}`;

function compile(gl: WebGL2RenderingContext) {
  const make = (type: number, src: string) => {
    const s = gl.createShader(type)!;
    gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw Error(gl.getShaderInfoLog(s) || "liquid shader");
    return s;
  };
  const p = gl.createProgram()!;
  gl.attachShader(p, make(gl.VERTEX_SHADER, VS)); gl.attachShader(p, make(gl.FRAGMENT_SHADER, FS));
  gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw Error(gl.getProgramInfoLog(p) || "liquid link");
  const cache = new Map<string, WebGLUniformLocation | null>();
  return { p, u: (n: string) => { if (!cache.has(n)) cache.set(n, gl.getUniformLocation(p, n)); return cache.get(n)!; } };
}

const smooth = (t: number) => t * t * (3 - 2 * t);

export class Liquid {
  private gl: WebGL2RenderingContext;
  private prog; private vao: WebGLVertexArrayObject;
  stocks: Stock[] = [];
  private drops: Drop[] = [];
  private ripples: Ripple[] = [];
  private pours: Pour[] = [];
  private dropData = new Float32Array(MAX_DROPS * 4);
  private poolData = new Float32Array(MAX_POOLS * 4);
  private levelData = new Float32Array(MAX_POOLS * 4);
  private shapeData = new Float32Array(MAX_POOLS * 4);
  private rippleData = new Float32Array(MAX_RIPPLES * 4);
  private streamData = new Float32Array(STREAM * 4);
  private dirty = false;
  private w = 0; private h = 0; private dpr = 1;
  /** A bead starts gathering out of the dots at this point (document pixels): the field pulls its dots in. */
  onCondense: (x: number, y: number) => void = () => {};
  /** A drop reached a card or a surface. */
  onLand: (stock: Stock) => void = () => {};

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
    this.dirty = true;
  }

  /** Drops on their way somewhere: beads, falls and runners. */
  get inFlight() { return this.drops.filter(d => d.state !== "spray").length + this.pours.length; }
  /** Something is moving: drops, rings or a pour. */
  get busy() { return this.drops.length > 0 || this.ripples.length > 0 || this.pours.length > 0; }
  /** Something is on screen: a pool in view sways and bubbles. */
  get active() { return this.busy || this.stocks.some(s => s.seen && s.kind === "pool"); }

  setStocks(list: Stock[]) {
    const old = new Map(this.stocks.map(s => [s.el, s]));
    // Keep the same objects, so drops already on their way still know where they are going.
    this.stocks = list.map(s => {
      const o = old.get(s.el);
      if (!o) return s;
      if (o.base !== s.base) o.target = s.base;
      return Object.assign(o, { aboveEl: s.aboveEl, kind: s.kind, top: s.top, left: s.left, width: s.width, height: s.height, radius: s.radius, cardTop: s.cardTop, cardBottom: s.cardBottom, cardLeft: s.cardLeft, cardRight: s.cardRight, src: s.src, base: s.base });
    });
    const live = new Set(this.stocks);
    this.drops = this.drops.filter(d => (!d.from || live.has(d.from)) && (!d.to || live.has(d.to)));
    this.pours = this.pours.filter(p => live.has(p.to));
  }

  /** Without motion every stock simply shows its level. */
  settle() { for (const s of this.stocks) { s.level = s.target = s.base; s.vel = 0; s.slosh = 0; } this.drops = []; this.ripples = []; this.pours = []; }

  /** Energy arrives at a stock: from a charged stock above it, or gathered out of the dots over it. */
  feed(to: Stock, now: number) {
    if (now - to.fed < 5 || this.drops.length > MAX_DROPS - 14) return false;
    const above = to.aboveEl ? this.stocks.find(s => s.el === to.aboveEl) : undefined;
    if (above && above.level > 0.2) {
      // A bead forms under the vessel above, necks, and lets go.
      const x0 = Math.max(above.left + 16, to.cardLeft + 26), x1 = Math.min(above.left + above.width - 16, to.cardRight - 26);
      if (x1 <= x0) return false;
      const x = to.kind === "land" ? (x0 + x1) / 2 : x0 + (x1 - x0) * (0.25 + Math.random() * 0.5);
      const y = above.top + above.height;
      this.drops.push(this.drop({ x, y: y + 1, r: 2.5, grow: 8.5, state: "bead", from: above, to, hold: 1.25, neckY: y - 2 }));
      above.target = Math.max(0.08, above.target - 0.1);
    } else if (to.src) {
      // Nothing above: the dots in the open space over the card flow together into a bead.
      this.drops.push(this.drop({ x: to.src.x, y: to.src.y, r: 0.4, grow: 9, state: "bead", to, hold: 1.5 }));
      this.onCondense(to.src.x, to.src.y);
    } else return false;
    to.fed = now;
    return true;
  }

  /** A ribbon pours from a point into a vessel, as in the Surge film. */
  pour(to: Stock, from: { x: number; y: number }, now: number, fill = 0.55) {
    if (this.pours.some(p => p.to === to)) return;
    this.pours.push({ to, x0: from.x, y0: from.y, t0: now, head: 0.95, hold: 0.55, tail: 0.6, amp: Math.min(120, to.width * 0.3), fill, lastSpray: 0 });
  }

  /** Surge: the energy erupts off the button, rings spread across it, and droplets fall back. */
  burst(x: number, y: number, now: number) {
    for (let k = 0; k < 14; k++) {
      const a = -Math.PI / 2 + (k / 13 - 0.5) * 1.9;
      const v = 260 + (k % 4) * 70;
      this.drops.push(this.drop({ x, y: y - 2, vx: Math.cos(a) * v * 0.9, vy: Math.sin(a) * v, r: 2.2 + (k % 3), state: "spray", floor: y + 6 }));
    }
    this.ripples.push({ x, y, t0: now, s: 1, clip: false }, { x, y, t0: now + 0.22, s: 0.7, clip: false });
  }

  private drop(o: Partial<Drop>): Drop {
    return { x: 0, y: 0, vx: 0, vy: 0, r: 2, grow: 0, life: 0, state: "fall", from: null, to: null, hold: 0, floor: Infinity, neckY: NaN, path: [], leg: 0, trail: [], ...o };
  }

  private land(d: Drop, to: Stock, now: number) {
    this.onLand(to);
    if (to.kind === "land") {
      // Surge: the drop lands on the face of the button and rings cross it.
      this.ripples.push({ x: d.x, y: to.cardTop, t0: now, s: 1, clip: false });
      for (let k = 0; k < 5; k++) this.drops.push(this.drop({ x: d.x, y: to.cardTop - 2, vx: (k - 2) * 48, vy: -(150 + (k % 3) * 55), r: 1.8 + (k % 2), state: "spray", floor: to.cardTop + 2 }));
      d.life = 99;
      return;
    }
    // A card: a ring at the rim, a few droplets leap and fall back, then a runner slides down the card's edge into its stock.
    const y = to.cardTop;
    this.ripples.push({ x: d.x, y, t0: now, s: 0.9, clip: true });
    for (let k = 0; k < 6; k++) this.drops.push(this.drop({ x: d.x, y: y - 2, vx: (k - 2.5) * 50, vy: -(160 + (k % 3) * 55), r: 1.8 + (k % 2), state: "spray", floor: y + 1 }));
    const leftSide = d.x - to.cardLeft < to.cardRight - d.x;
    const edge = leftSide ? to.cardLeft + 8 : to.cardRight - 8;
    const into = leftSide ? to.left + 10 : to.left + to.width - 10;
    const poolY = to.top + to.height * 0.5;
    d.state = "run"; d.vx = 0; d.vy = 0; d.r = 3.4; d.leg = 0; d.life = 0;
    d.path = [[d.x, y + 1], [edge + (leftSide ? 7 : -7), y + 4], [edge, y + 16], [edge, poolY - 4], [into, poolY]];
    d.x = d.path[0][0]; d.y = d.path[0][1];
  }

  step(dt: number, now: number) {
    for (const s of this.stocks) {
      // A skin with weight: the level eases toward its target and sloshes when something lands.
      s.target += (s.base - s.target) * Math.min(1, dt / 30);
      s.vel += ((s.target - s.level) * 16 - s.vel * 5.2) * dt;
      s.level += s.vel * dt;
      s.slosh = Math.max(0, s.slosh - dt * 0.55);
    }
    for (const p of this.pours) {
      const t = now - p.t0;
      if (t > p.head * 0.9 && t < p.head + p.hold + p.tail * 0.5) {
        p.to.target = Math.min(0.92, p.to.target + dt * 0.5 * p.fill);
        p.to.slosh = Math.max(p.to.slosh, 0.7);
        if (now - p.lastSpray > 0.16 && this.drops.length < MAX_DROPS - 4) {
          p.lastSpray = now;
          const [x, y] = this.streamEnd(p);
          this.drops.push(this.drop({ x, y: y - 3, vx: (Math.random() - 0.5) * 160, vy: -(120 + Math.random() * 120), r: 1.6 + Math.random() * 1.4, state: "spray", floor: y + 2 }));
        }
      }
    }
    this.pours = this.pours.filter(p => now - p.t0 < p.head + p.hold + p.tail);
    for (const d of this.drops) {
      d.life += dt;
      if (d.state === "bead") {
        d.r += (d.grow - d.r) * Math.min(1, dt * 2.2);
        if (!isNaN(d.neckY)) d.y += 9 * dt; // the neck stretches as the bead fills
        if (d.life > d.hold) { d.state = "fall"; d.vy = 30; d.neckY = NaN; }
      } else if (d.state === "run") {
        // Down the edge like a bead on glass: slow at the rim, quicker down the side, then into the stock.
        const target = d.path[d.leg + 1];
        if (!target) { d.life = 99; continue; }
        const speed = d.leg === 2 ? Math.min(520, 60 + d.life * 900) : 180;
        const dx = target[0] - d.x, dy = target[1] - d.y, dist = Math.hypot(dx, dy);
        const stepLen = speed * dt;
        d.trail.unshift([d.x, d.y]); if (d.trail.length > 5) d.trail.pop();
        if (dist <= stepLen) {
          d.x = target[0]; d.y = target[1]; d.leg++;
          if (d.leg >= d.path.length - 1 && d.to) {
            d.to.target = Math.min(0.92, d.to.target + 0.22);
            d.to.slosh = 1;
            d.life = 99;
          }
        } else { d.x += (dx / dist) * stepLen; d.y += (dy / dist) * stepLen; }
      } else {
        d.vy = Math.min(d.vy + 1500 * dt, 1500);
        d.x += d.vx * dt; d.y += d.vy * dt;
        if (d.state === "spray") d.r = Math.max(0, d.r - dt * 2.4);
        if (d.y > d.floor && d.vy > 0) d.life = 99;
      }
      if (d.state === "fall" && d.to && d.y + d.r * 0.6 >= d.to.cardTop) this.land(d, d.to, now);
    }
    this.drops = this.drops.filter(d => d.life < 8 && d.r > 0.3);
    this.ripples = this.ripples.filter(r => now - r.t0 < 1.6);
  }

  private streamEnd(p: Pour) {
    const s = p.to;
    return [s.left + s.width * 0.5, s.top + s.height - 4 - (s.height - 8) * Math.max(0.1, s.level)];
  }

  /** The pour's ribbon as a polyline: a snaking S, thick at the source, with bulges travelling down it. */
  private stream(p: Pour, now: number, sy: number) {
    const t = now - p.t0;
    const uh = smooth(Math.min(1, t / p.head));
    const ut = smooth(Math.max(0, Math.min(1, (t - p.head - p.hold) / p.tail)));
    if (uh - ut < 0.01) return 0;
    const [x1, y1] = this.streamEnd(p);
    let n = 0;
    for (let i = 0; i < STREAM; i++) {
      const u = ut + (uh - ut) * (i / (STREAM - 1));
      const env = Math.sin(u * Math.PI);
      const x = p.x0 + (x1 - p.x0) * smooth(u) + p.amp * Math.sin(u * 5.2 - now * 2.1) * env;
      const y = p.y0 + (y1 + 6 - p.y0) * u;
      let r = (9.5 - 4.2 * u) * (0.8 + 0.2 * Math.sin(u * 22 - now * 9));
      r *= 1 + 0.35 * Math.exp(-Math.pow((uh - u) * 14, 2)); // the leading blob
      if (ut > 0) r *= smooth(Math.min(1, (u - ut) / 0.08 + 0.2)); // the tail thins as it lets go
      this.streamData.set([x, y - sy, Math.max(0.5, r), 0], n++ * 4);
    }
    return n;
  }

  render(time: number, now: number, hue: number[], sy: number) {
    const gl = this.gl, top = sy - 80, bottom = sy + this.h + 80;
    let dn = 0;
    const push = (x: number, y: number, r: number, spray: number) => { if (dn < MAX_DROPS && y > top && y < bottom) this.dropData.set([x, y - sy, r, spray], dn++ * 4); };
    for (const d of this.drops) {
      push(d.x, d.y, d.r, d.state === "spray" ? 1 : 0);
      if (d.state === "bead" && !isNaN(d.neckY)) push(d.x, (d.neckY + d.y) / 2, Math.max(1.6, d.r * 0.42), 0);
      if (d.state === "run") d.trail.forEach((q, i) => { if (i % 2 === 1) push(q[0], q[1], d.r * (0.7 - i * 0.1), 0); });
    }
    let pn = 0;
    for (const s of this.stocks) {
      if (s.kind !== "pool" || pn >= MAX_POOLS || s.top > bottom || s.top + s.height < top || (s.level < 0.015 && s.target < 0.015)) continue;
      const surface = s.top + s.height - 3 - (s.height - 6) * Math.max(0.04, s.level);
      this.poolData.set([s.left, s.top - sy, s.left + s.width, s.top + s.height - sy], pn * 4);
      this.levelData.set([surface - sy, s.slosh, s.level, (s.left * 0.013 + s.top * 0.007) % 6.28], pn * 4);
      this.shapeData.set([s.radius, 0, 0, 0], pn * 4);
      pn++;
    }
    let rn = 0;
    for (const r of this.ripples) if (rn < MAX_RIPPLES) this.rippleData.set([r.x, r.y - sy, r.t0, r.clip ? -r.s : r.s], rn++ * 4);
    for (let i = rn; i < MAX_RIPPLES; i++) this.rippleData[i * 4 + 3] = 0;
    const pour = this.pours[0];
    const sn = pour ? this.stream(pour, now, sy) : 0;

    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    if (!dn && !pn && !rn && !sn) {
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
    gl.uniform4fv(p.u("uDrops[0]"), this.dropData);
    gl.uniform1i(p.u("uDropN"), dn);
    gl.uniform4fv(p.u("uPools[0]"), this.poolData);
    gl.uniform4fv(p.u("uLevels[0]"), this.levelData);
    gl.uniform4fv(p.u("uShape[0]"), this.shapeData);
    gl.uniform1i(p.u("uPoolN"), pn);
    gl.uniform4fv(p.u("uRipples[0]"), this.rippleData);
    gl.uniform4fv(p.u("uStream[0]"), this.streamData);
    gl.uniform1i(p.u("uStreamN"), sn);
    gl.uniform3f(p.u("uHue"), hue[0], hue[1], hue[2]);
    gl.bindVertexArray(this.vao);
    // Shade only where liquid can be: a box round each drop, pool, ring and the pour, merged where they touch.
    const boxes: number[][] = [];
    for (let i = 0; i < dn; i++) { const x = this.dropData[i * 4], y = this.dropData[i * 4 + 1], r = this.dropData[i * 4 + 2] * 2.4 + 8; boxes.push([x - r, y - r, x + r, y + r]); }
    for (let i = 0; i < pn; i++) boxes.push([this.poolData[i * 4] - 4, this.poolData[i * 4 + 1] - 30, this.poolData[i * 4 + 2] + 4, this.poolData[i * 4 + 3] + 4]);
    for (let i = 0; i < rn; i++) { const x = this.rippleData[i * 4], y = this.rippleData[i * 4 + 1]; boxes.push([x - 196, y - 60, x + 196, y + 60]); }
    if (sn) {
      let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
      for (let i = 0; i < sn; i++) { const x = this.streamData[i * 4], y = this.streamData[i * 4 + 1], r = this.streamData[i * 4 + 2] * 2.4 + 8; x0 = Math.min(x0, x - r); y0 = Math.min(y0, y - r); x1 = Math.max(x1, x + r); y1 = Math.max(y1, y + r); }
      boxes.push([x0, y0, x1, y1]);
    }
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
