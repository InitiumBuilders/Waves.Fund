import { FIELD_MODES, type FieldMode } from "./modes";

/** An anchor rectangle in document pixels, where a mode of the field takes place. */
export type Anchor = { name: FieldMode; left: number; top: number; width: number; height: number };

/* The Field: one steady lattice of dots under the whole site. The dots never leave their places.
   Energy moves through them instead: a wave rolling across, gravity bending the grid toward whatever
   has weight, pulses from a touch, and links lighting between neighbours only where both are active.
   Everything is computed on the GPU from one field function; the frame loop writes a few numbers. */

const FIELD = `
uniform vec2 uRes;
uniform float uTime, uMix, uVisA, uVisB, uGrow, uAmb, uTrust, uScrollP;
uniform int uModeA, uModeB;
uniform vec4 uRectA, uRectB;
uniform vec3 uPointer, uMover;
uniform vec4 uPulses[4];
struct F { float a; vec2 d; };
float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
// Gravity: the grid leans toward a mass. The pull peaks one radius out (18px for a unit mass), so the lattice visibly curves, and the dots near it wake.
void well(inout F f, vec2 p, vec2 c, float R, float s) {
  vec2 d = c - p; float r = length(d) + 0.001;
  f.d += d / r * s * 18.0 * (2.0 * R * r / (r * r + R * R));
  f.a += s * exp(-r * r / (2.0 * R * R));
}
float seg(vec2 p, vec2 a, vec2 b) { vec2 pa = p - a, ba = b - a; float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0); return length(pa - ba * h); }
// A signal travelling a path between two points: the path glows faintly, the signal brightly.
void route(inout F f, vec2 p, vec2 a, vec2 b, float t, float s, float speed) {
  float d = seg(p, a, b);
  float along = clamp(dot(p - a, b - a) / dot(b - a, b - a), 0.0, 1.0);
  float lane = exp(-d * d / (s * s * 0.0035));
  f.a += lane * (0.45 + 1.3 * exp(-pow((along - fract(t * speed)) * 6.0, 2.0)));
}
F mode(int m, vec2 p, vec4 rect, float t) {
  F f = F(0.0, vec2(0.0));
  vec2 c = rect.xy, h = max(rect.zw, vec2(40.0));
  vec2 q = (p - c) / h;
  float s = min(h.x, h.y);
  float env = 1.0 - smoothstep(1.0, 1.6, max(abs(q.x), abs(q.y)));
  if (env <= 0.0) return f;
  if (m == 0) {                                   // vision
    float r = length(p - c);
    well(f, p, c, s * 0.5, 1.0);
    f.a += (0.5 + 0.5 * sin(r / s * 9.0 - t * 1.6)) * exp(-r / (s * 1.05)) * 0.6;
  } else if (m == 1) {                            // layers: a forward pass
    float phase = fract(t * 0.24) * 5.0;
    for (int i = 0; i < 4; i++) {
      float xi = -0.75 + float(i) * 0.5;
      float col = exp(-pow((q.x - xi) / 0.075, 2.0));
      float neurons = pow(0.5 + 0.5 * cos(q.y * 3.14159 * ((i == 0 || i == 3) ? 4.0 : 6.0)), 8.0);
      float lit = exp(-pow(phase - float(i), 2.0) * 2.5);
      f.a += col * (0.4 + neurons * 1.4) * (0.55 + lit * 1.1) * step(abs(q.y), 0.92);
    }
    float k = floor((q.x + 0.75) / 0.5), x0 = -0.75 + k * 0.5, u = (q.x - x0) / 0.5;
    if (k >= 0.0 && k < 3.0) {
      float rows = pow(0.5 + 0.5 * cos(q.y * 3.14159 * 5.0 + k * 1.3), 12.0);
      f.a += rows * exp(-pow((u - (phase - k)) * 4.5, 2.0)) * 1.2 * step(abs(q.y), 0.9);
    }
  } else if (m == 2) {                            // orbit: two masses
    float w = t * 0.42;
    vec2 o = vec2(cos(w), sin(w) * 0.55) * s * 0.52;
    well(f, p, c + o, s * 0.22, 1.35);
    well(f, p, c - o, s * 0.22, 1.35);
    // The path each travels round the other: a ring that brightens where they pass.
    float r = length(p - c) / s;
    f.a += exp(-pow((r - 0.62) * 11.0, 2.0)) * (0.45 + 0.45 * cos(atan(q.y, q.x) - w));
    f.a += exp(-pow((r - 0.62) * 11.0, 2.0)) * (0.45 + 0.45 * cos(atan(q.y, q.x) - w - 3.14159));
  } else if (m == 3) {                            // vortex: drawn inward
    vec2 d = p - c; float r = length(d) + 0.001, th = atan(d.y, d.x);
    float arms = 0.5 + 0.5 * cos(th * 3.0 - log(r / s + 0.05) * 5.0 + t * 1.05);
    float fall = exp(-r / (s * 0.8));
    f.a += pow(arms, 2.2) * fall * 1.9 + fall * 0.45;
    f.d += (vec2(-d.y, d.x) / r * 12.0 - d / r * 7.0) * fall;
  } else if (m == 4) {                            // rise
    float up = smoothstep(1.2, -1.2, q.y);
    f.a += up * (0.28 + 0.55 * pow(0.5 + 0.5 * sin(q.y * 7.0 + t * 1.25), 4.0));
    f.d.y -= up * 4.0 * (0.5 + 0.5 * sin(q.x * 3.0 + t));
  } else if (m == 5 || m == 6) {                  // gather and hubs: masses and the paths between them
    vec2 P[5];
    int n;
    if (m == 5) { P[0] = vec2(-0.62, 0.42); P[1] = vec2(-0.12, -0.5); P[2] = vec2(0.34, 0.3); P[3] = vec2(0.72, -0.38); P[4] = vec2(0.02, 0.72); n = 5; }
    else { P[0] = vec2(-0.6, 0.38); P[1] = vec2(0.6, 0.38); P[2] = vec2(0.0, -0.5); P[3] = P[0]; P[4] = P[0]; n = 3; }
    for (int i = 0; i < 5; i++) {
      if (i >= n) break;
      vec2 a = c + P[i] * h;
      well(f, p, a, s * 0.17, 1.25);
      vec2 b = c + P[(i + 1) % n] * h;
      route(f, p, a, b, t + float(i) * 0.37, s, 0.3);
    }
  } else if (m == 7) {                            // ocean: three waves travel through the lattice, like the strokes of the mark
    for (int i = 0; i < 3; i++) {
      float fi = float(i);
      float line = -0.42 + fi * 0.42 + 0.2 * sin(q.x * 2.3 - t * 1.0 + fi * 0.8);
      float d = (q.y - line) * h.y / s;
      float near = exp(-d * d * 55.0);
      f.a += near * (0.55 + 0.6 * pow(0.5 + 0.5 * sin(q.x * 3.2 - t * 2.1 + fi * 1.7), 3.0)) * step(abs(q.x), 1.05);
      f.d.y -= d * s * near * 0.35;
    }
  } else if (m == 8 || m == 9) {                  // path and timeline: stations, and one pulse moving forward
    int n = m == 8 ? 6 : 5;
    float y = m == 8 ? 0.36 * sin(q.x * 3.14159 * 1.25) : 0.0;
    float d = abs(q.y - y) * h.y / s;
    float head = fract(t * 0.16) * 2.6 - 1.3;
    f.a += exp(-d * d * 70.0) * (0.3 + 1.2 * exp(-pow((q.x - head) * 3.2, 2.0))) * step(abs(q.x), 1.02);
    for (int i = 0; i < 6; i++) {
      if (i >= n) break;
      float xs = -0.9 + float(i) * (1.8 / float(n - 1));
      float ys = m == 8 ? 0.36 * sin(xs * 3.14159 * 1.25) : 0.0;
      well(f, p, c + vec2(xs, ys) * h, s * 0.1, 0.7 + 0.6 * step(xs, head));
    }
  } else if (m == 10) {                           // seed: grows with the form
    float R = s * (0.16 + 0.72 * uGrow);
    well(f, p, c, max(28.0, R * 0.55), 0.9 + uGrow * 0.7);
    f.a += exp(-pow((length(p - c) - R) / (s * 0.05), 2.0)) * (0.4 + 0.6 * uGrow);
  } else if (m == 11) {                           // bond: nodes stay soft; links carry it
    f.a += 0.18;
  } else if (m == 12) {                           // still
    f.a -= 0.25;
  } else if (m == 13) {                           // noise
    f.a += step(0.9, hash(floor(p / 9.0) + floor(t * 5.0))) * 0.9;
  }
  f.a *= env; f.d *= env;
  return f;
}
F field(vec2 p, float t) {
  F f = F(0.0, vec2(0.0));
  // The brand wave: it rolls across the whole field, always.
  float w = sin(dot(p, vec2(0.0102, -0.0034)) - t * 0.72 + sin(p.y * 0.0042 + t * 0.2) * 1.4);
  f.a += smoothstep(0.4, 1.0, w) * 0.34 * uAmb;
  f.d.y += w * 1.8 * uAmb;
  F a = mode(uModeA, p, uRectA, t), b = mode(uModeB, p, uRectB, t);
  f.a += a.a * (1.0 - uMix) * uVisA + b.a * uMix * uVisB;
  f.d += a.d * (1.0 - uMix) * uVisA + b.d * uMix * uVisB;
  if (uPointer.z > 0.001) well(f, p, uPointer.xy, 120.0, uPointer.z * 0.85);
  if (uMover.z > 0.001) well(f, p, uMover.xy, uRes.x < 800.0 ? 34.0 : 60.0, uMover.z * 0.8);
  for (int k = 0; k < 4; k++) {
    float age = uTime - uPulses[k].z;
    if (age > 0.0 && age < 3.2 && uPulses[k].w > 0.0) {
      vec2 d = p - uPulses[k].xy; float r = length(d) + 0.001;
      float band = exp(-pow((r - age * 560.0) / 48.0, 2.0)) * uPulses[k].w * exp(-age * 1.1);
      f.a += band * 1.6;
      f.d += d / r * band * 8.0;
    }
  }
  return f;
}
`;

const DOT_VS = `#version 300 es
precision highp float;
${FIELD}
uniform int uCols;
uniform vec2 uOrigin;
uniform float uSpacing, uBase, uGrowR, uLayerA, uDispK, uActK, uDpr;
uniform vec3 uHue, uTintHue;
uniform vec4 uTint;
out vec3 vColor; out float vA; out float vEdge;
void main() {
  int i = gl_VertexID;
  vec2 base = uOrigin + vec2(float(i % uCols), float(i / uCols)) * uSpacing;
  F f = field(base, uTime);
  float act = clamp(f.a * uActK, 0.0, 2.6);
  vec2 pos = base + f.d * uDispK;
  float r = (uBase + act * uGrowR) * (1.0 + uScrollP * 0.4);
  gl_PointSize = r * 2.0 * 1.5 * uDpr;
  vEdge = 1.0 / 1.5;
  gl_Position = vec4(pos / uRes * 2.0 - 1.0, 0.0, 1.0) * vec4(1.0, -1.0, 1.0, 1.0);
  vec3 dim = vec3(0.26, 0.4, 0.7);
  float tint = uTint.w * exp(-pow(length(base - uTint.xy) / uTint.z, 2.0));
  vec3 hue = mix(uHue, uTintHue, clamp(tint, 0.0, 1.0));
  vColor = mix(dim, hue, clamp(act * 0.85 + tint * 0.5, 0.0, 1.0));
  vColor = mix(vColor, vec3(0.93, 0.99, 1.0), clamp((act - 1.15) * 0.7, 0.0, 0.8));
  vA = uLayerA * clamp(0.3 + act * 0.9 + uTrust * 0.08, 0.0, 1.0);
}`;
const DOT_FS = `#version 300 es
precision highp float;
in vec3 vColor; in float vA; in float vEdge;
out vec4 o;
void main() {
  float d = length(gl_PointCoord * 2.0 - 1.0);
  // A crisp dot with a faint halo: graph paper, lit from inside.
  float disc = 1.0 - smoothstep(vEdge - 0.12, vEdge, d);
  float halo = exp(-d * d * 4.0) * 0.22;
  float a = (disc + halo) * vA;
  o = vec4(vColor * a, a);
}`;
const LINK_VS = `#version 300 es
precision highp float;
${FIELD}
uniform int uCols, uRows, uBond;
uniform vec2 uOrigin;
uniform float uSpacing, uDispK, uActK;
uniform vec3 uHue;
out float vA; out vec3 vColor;
void main() {
  int e = gl_VertexID / 2, end = gl_VertexID % 2;
  int node = e / 2, dir = e % 2;
  int col = node % uCols, row = node / uCols;
  if ((dir == 0 && col >= uCols - 1) || (dir == 1 && row >= uRows - 1)) { gl_Position = vec4(2.0, 2.0, 0.0, 1.0); vA = 0.0; vColor = vec3(0.0); return; }
  vec2 a = uOrigin + vec2(float(col), float(row)) * uSpacing;
  vec2 b = a + (dir == 0 ? vec2(uSpacing, 0.0) : vec2(0.0, uSpacing));
  F fa = field(a, uTime), fb = field(b, uTime);
  vec2 pos = end == 0 ? a + fa.d * uDispK : b + fb.d * uDispK;
  // A link lights only where both neighbours are active together: coordination made visible.
  float both = min(fa.a, fb.a) * uActK;
  float lit = smoothstep(0.5, 1.15, both);
  if (uBond == 1) {
    // The mantra: links form between neighbours who act together, and grow brighter as trust is used.
    float k = hash(vec2(float(e), floor(uTime * 0.35 + hash(vec2(float(e), 3.0)) * 7.0)));
    float inside = smoothstep(1.3, 0.8, max(abs(a.x - uRectB.x) / uRectB.z, abs(a.y - uRectB.y) / uRectB.w));
    lit = max(lit, step(0.955, k) * inside * uMix * uVisB * (0.7 + uTrust * 0.3));
  }
  gl_Position = vec4(pos / uRes * 2.0 - 1.0, 0.0, 1.0) * vec4(1.0, -1.0, 1.0, 1.0);
  vA = lit * 0.62;
  vColor = mix(uHue, vec3(0.9, 0.98, 1.0), clamp(both - 1.2, 0.0, 0.6));
}`;
const LINK_FS = `#version 300 es
precision highp float;
in float vA; in vec3 vColor;
out vec4 o;
void main() { o = vec4(vColor * vA, vA); }`;

function compile(gl: WebGL2RenderingContext, vs: string, fs: string) {
  const make = (type: number, src: string) => {
    const s = gl.createShader(type)!;
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw Error(gl.getShaderInfoLog(s) || "shader");
    return s;
  };
  const p = gl.createProgram()!;
  gl.attachShader(p, make(gl.VERTEX_SHADER, vs));
  gl.attachShader(p, make(gl.FRAGMENT_SHADER, fs));
  gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw Error(gl.getProgramInfoLog(p) || "link");
  const cache = new Map<string, WebGLUniformLocation | null>();
  return { p, u: (name: string) => { if (!cache.has(name)) cache.set(name, gl.getUniformLocation(p, name)); return cache.get(name)!; } };
}
type Prog = ReturnType<typeof compile>;

const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const approach = (v: number, target: number, k: number, dt: number) => v + (target - v) * (1 - Math.exp(-k * dt));
const mix3 = (a: number[], b: number[], k: number) => a.map((v, i) => v + (b[i] - v) * k);

type Layer = { spacing: number; parallax: number; base: number; grow: number; alpha: number; disp: number; act: number; cols: number; rows: number };

export class Field {
  private gl: WebGL2RenderingContext;
  private dot: Prog; private link: Prog;
  private vao: WebGLVertexArrayObject;
  private layers: Layer[];
  private a: Anchor | null = null;
  private b: Anchor | null = null;
  private morphStart = -1; private mix = 1; private raf = 0; private running = false;
  private stirred = 0; private odd = false;
  private t0 = performance.now(); private last = 0;
  private dpr = 1; private w = 0; private h = 0;
  private pointer = { x: 0, y: 0, s: 0, target: 0, moved: 0 };
  private mover = { x: 0, y: 0, s: 0 };
  private pulses = new Float32Array(16); private slot = 0;
  private visA = 0; private visB = 0;
  private hue = [0.36, 0.86, 1.0]; private hueTarget = [0.36, 0.86, 1.0];
  private tint = { x: 0, y: 0, r: 160, s: 0, target: 0, hue: [0.36, 0.86, 1.0] };
  motion = true;
  trust = 0;
  grow = 1;
  docHeight = 0;

  constructor(private canvas: HTMLCanvasElement, private mobile: boolean) {
    const gl = canvas.getContext("webgl2", { alpha: true, premultipliedAlpha: true, antialias: true, powerPreference: "high-performance" });
    if (!gl) throw Error("webgl2 unavailable");
    this.gl = gl;
    this.dot = compile(gl, DOT_VS, DOT_FS);
    this.link = compile(gl, LINK_VS, LINK_FS);
    this.vao = gl.createVertexArray()!;
    const s = mobile ? 26 : 30;
    // Back to front: the dense matrix behind, the offset middle, and the front dots that carry the field.
    this.layers = [
      { spacing: s / 2, parallax: 0.08, base: 0.7, grow: 1.1, alpha: 0.2, disp: 0.35, act: 0.6, cols: 0, rows: 0 },
      { spacing: s, parallax: 0.16, base: 1.0, grow: 1.6, alpha: 0.34, disp: 0.6, act: 0.8, cols: 0, rows: 0 },
      { spacing: s, parallax: 0.3, base: mobile ? 2.3 : 2.2, grow: mobile ? 4 : 4.8, alpha: 0.9, disp: 1, act: 1, cols: 0, rows: 0 },
    ];
    this.resize();
  }

  resize() {
    this.dpr = Math.min(window.devicePixelRatio || 1, this.mobile ? 2 : 1.75);
    this.w = window.innerWidth; this.h = window.innerHeight;
    this.canvas.width = Math.round(this.w * this.dpr);
    this.canvas.height = Math.round(this.h * this.dpr);
    for (const l of this.layers) { l.cols = Math.ceil(this.w / l.spacing) + 3; l.rows = Math.ceil(this.h / l.spacing) + 3; }
    this.wake();
  }

  /** Move the field's focus to an anchor. The modes crossfade; the dots stay where they are. */
  focus(anchor: Anchor | null) {
    if (sameRect(anchor, this.b)) return;
    this.a = this.b; this.visA = this.visB;
    this.b = anchor;
    if (!this.motion) { this.a = anchor; this.mix = 1; this.morphStart = -1; this.wake(); return; }
    this.mix = 0; this.morphStart = this.now();
    this.wake();
  }
  track(anchor: Anchor) {
    if (this.b && this.b.name === anchor.name) { this.b = anchor; this.wake(); }
  }
  /** A pulse through the field from a point on screen (CSS pixels). */
  wave(x: number, y: number, strength = 1) {
    if (!this.motion) return;
    this.pulses.set([x, y, this.now(), strength], this.slot * 4);
    this.slot = (this.slot + 1) % 4;
    this.wake();
  }
  point(x: number, y: number, active = true) {
    this.pointer.x = x; this.pointer.y = y; this.pointer.target = active ? 1 : 0; this.pointer.moved = this.now();
    this.wake();
  }
  /** The travelling mark is a small mass moving down through the field. */
  move(x: number, y: number, strength: number) { this.mover.x = x; this.mover.y = y; this.mover.s = strength; this.wake(); }
  setHue(rgb: number[]) { this.hueTarget = rgb; this.wake(); }
  /** What you touch colours the field around it. */
  touchTint(x: number, y: number, rgb: number[] | null) {
    if (rgb) { this.tint.x = x; this.tint.y = y; this.tint.hue = rgb; this.tint.target = 1; } else this.tint.target = 0;
    this.wake();
  }
  setMotion(on: boolean) { this.motion = on; if (!on) { this.a = this.b; this.mix = 1; this.morphStart = -1; } this.wake(); }
  invalidate() { this.wake(); }
  wake() { this.stirred = this.now(); if (this.running) return; this.running = true; this.raf = requestAnimationFrame(this.frame); }
  stop() { cancelAnimationFrame(this.raf); this.running = false; }
  destroy() { this.stop(); }
  private now() { return (performance.now() - this.t0) / 1000; }

  private rect(a: Anchor | null): [number, number, number, number] {
    if (!a) return [0, 0, 1, 1];
    const top = a.top - window.scrollY;
    return [a.left + a.width / 2, top + a.height / 2, a.width / 2, a.height / 2];
  }
  private visible(a: Anchor | null) {
    if (!a) return 0;
    const top = a.top - window.scrollY, bottom = top + a.height;
    const overlap = Math.min(bottom, this.h) - Math.max(top, 0);
    return Math.max(0, Math.min(1, overlap / Math.min(a.height, this.h * 0.5)));
  }

  private frame = () => {
    const t0 = this.now();
    // At rest the field breathes at half rate; anything that stirs it brings it back to full rate.
    const resting = this.motion && this.morphStart < 0 && t0 - this.stirred > 1.5 && this.pointer.s < 0.01 && this.pulses.every((v, i) => i % 4 !== 2 || t0 - v > 3.2);
    this.odd = !this.odd;
    if (resting && this.odd && !document.hidden) { this.raf = requestAnimationFrame(this.frame); return; }
    const gl = this.gl, t = t0, dt = Math.min(0.05, Math.max(0.001, t - (this.last || t)));
    this.last = t;
    let animating = this.motion;
    if (this.morphStart >= 0) {
      const k = Math.min(1, (t - this.morphStart) / 1.3);
      this.mix = ease(k);
      if (k >= 1) { this.a = this.b; this.mix = 1; this.morphStart = -1; }
      animating = true;
    }
    const va = this.visible(this.a), vb = this.visible(this.b);
    this.visA = this.motion ? approach(this.visA, va, 5, dt) : va;
    this.visB = this.motion ? approach(this.visB, vb, 5, dt) : vb;
    if (this.pointer.target && t - this.pointer.moved > 3) this.pointer.target = 0;
    this.pointer.s = this.motion ? approach(this.pointer.s, this.pointer.target, 4, dt) : 0;
    this.tint.s = approach(this.tint.s, this.tint.target, 4, dt);
    this.hue = mix3(this.hue, this.hueTarget, this.motion ? 1 - Math.exp(-2 * dt) : 1);
    if (Math.abs(this.visB - vb) > 0.002 || this.pointer.s > 0.002 || this.tint.s > 0.002) animating = true;
    const scrollMax = Math.max(1, (this.docHeight || document.documentElement.scrollHeight) - this.h);
    const scrollP = Math.min(1, window.scrollY / scrollMax);
    const time = this.motion ? t : 12;

    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    gl.bindVertexArray(this.vao);
    const ra = this.rect(this.a), rb = this.rect(this.b);
    const modeIndex = (x: Anchor | null) => (x ? FIELD_MODES.indexOf(x.name) : 12);
    const shared = (p: Prog) => {
      gl.useProgram(p.p);
      gl.uniform2f(p.u("uRes"), this.w, this.h);
      gl.uniform1f(p.u("uTime"), time);
      gl.uniform1f(p.u("uMix"), this.mix);
      gl.uniform1f(p.u("uVisA"), this.a ? this.visA : 0);
      gl.uniform1f(p.u("uVisB"), this.b ? this.visB : 0);
      gl.uniform1f(p.u("uGrow"), this.grow);
      gl.uniform1f(p.u("uAmb"), this.motion ? 1 : 0.6);
      gl.uniform1f(p.u("uTrust"), this.trust);
      gl.uniform1f(p.u("uScrollP"), scrollP);
      gl.uniform1i(p.u("uModeA"), modeIndex(this.a));
      gl.uniform1i(p.u("uModeB"), modeIndex(this.b));
      gl.uniform4f(p.u("uRectA"), ra[0], ra[1], ra[2], ra[3]);
      gl.uniform4f(p.u("uRectB"), rb[0], rb[1], rb[2], rb[3]);
      gl.uniform3f(p.u("uPointer"), this.pointer.x, this.pointer.y, this.pointer.s);
      gl.uniform3f(p.u("uMover"), this.mover.x, this.mover.y, this.motion ? this.mover.s : 0);
      gl.uniform4fv(p.u("uPulses[0]"), this.pulses);
      gl.uniform3f(p.u("uHue"), this.hue[0], this.hue[1], this.hue[2]);
    };
    const origin = (l: Layer) => {
      const shift = (window.scrollY * l.parallax) % l.spacing;
      return [((this.w % l.spacing) / 2) - l.spacing, -shift - l.spacing];
    };
    // Links under the front dots: only where neighbours are active together.
    const front = this.layers[2], fo = origin(front);
    shared(this.link);
    gl.uniform1i(this.link.u("uCols"), front.cols);
    gl.uniform1i(this.link.u("uRows"), front.rows);
    gl.uniform1i(this.link.u("uBond"), this.b && this.b.name === "bond" ? 1 : 0);
    gl.uniform2f(this.link.u("uOrigin"), fo[0], fo[1]);
    gl.uniform1f(this.link.u("uSpacing"), front.spacing);
    gl.uniform1f(this.link.u("uDispK"), front.disp);
    gl.uniform1f(this.link.u("uActK"), front.act);
    gl.drawArrays(gl.LINES, 0, front.cols * front.rows * 4);
    shared(this.dot);
    gl.uniform1f(this.dot.u("uDpr"), this.dpr);
    gl.uniform3f(this.dot.u("uTintHue"), this.tint.hue[0], this.tint.hue[1], this.tint.hue[2]);
    gl.uniform4f(this.dot.u("uTint"), this.tint.x, this.tint.y, this.tint.r, this.tint.s);
    for (const l of this.layers) {
      const o = origin(l);
      gl.uniform1i(this.dot.u("uCols"), l.cols);
      gl.uniform2f(this.dot.u("uOrigin"), o[0], o[1]);
      gl.uniform1f(this.dot.u("uSpacing"), l.spacing);
      gl.uniform1f(this.dot.u("uBase"), l.base);
      gl.uniform1f(this.dot.u("uGrowR"), l.grow);
      gl.uniform1f(this.dot.u("uLayerA"), l.alpha);
      gl.uniform1f(this.dot.u("uDispK"), l.disp);
      gl.uniform1f(this.dot.u("uActK"), l.act);
      gl.drawArrays(gl.POINTS, 0, l.cols * l.rows);
    }
    gl.bindVertexArray(null);
    for (let k = 0; k < 4; k++) if (this.pulses[k * 4 + 3] > 0 && t - this.pulses[k * 4 + 2] < 3.2) animating = true;
    if (animating && !document.hidden) this.raf = requestAnimationFrame(this.frame);
    else this.running = false;
  };
}

function sameRect(a: Anchor | null, b: Anchor | null) {
  if (!a || !b) return a === b;
  return a.name === b.name && Math.abs(a.top - b.top) < 1 && Math.abs(a.left - b.left) < 1 && Math.abs(a.width - b.width) < 1 && Math.abs(a.height - b.height) < 1;
}
