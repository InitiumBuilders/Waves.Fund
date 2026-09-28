import { useEffect, useRef } from "react";
import type { HTMLAttributes, MutableRefObject, PointerEvent, ReactNode } from "react";
import { useStateStore } from "../state";
import { BEAT, clock as shared } from "../cadence";
import type { RippleHandle, RippleModel } from "./ripple";

/* The sea: the same waves as ripple.tsx (each light sends out circular waves, and where they arrive in step
   they add up), drawn as a surface seen from just above the water. The lattice of dots is the surface: every
   dot rises with the summed wave, a wireframe joins neighbours, and the lights standing on the water light
   the slopes that face them and lay a streak toward you. Crests that are truly in step go white.

   A scene is the same model as ripple.tsx: (t, w, h) => sources in plane pixels, x across and y from the far
   edge (0) to the near edge (h). The plane is the canvas size; a camera above the near edge looks toward the
   horizon. Motion off draws one still frame. */

const MAX = 12;
const VS = `#version 300 es
precision highp float;
uniform mat4 uVP;
uniform vec3 uEye;
uniform vec2 uPlane, uRes;
uniform float uDpr, uTime, uWave, uK, uW, uHeight, uDot, uLines, uDepth;
uniform int uCount, uCols, uRows;
uniform vec4 uA[${MAX}];   // x, y, amplitude, phase
uniform vec4 uB[${MAX}];   // born, hue, size, reach
uniform vec4 uFront;       // x, y, direction, strength
out vec3 vColor; out float vA;
const vec3 CYAN = vec3(0.37, 0.91, 1.0), BLUE = vec3(0.2, 0.52, 1.0), VIOLET = vec3(0.64, 0.55, 1.0), WHITE = vec3(0.94, 0.99, 1.0);
void main() {
  int col, row;
  if (uLines > 0.5) {
    int e = gl_VertexID / 2, end = gl_VertexID % 2, node = e / 2, dir = e % 2;
    col = node % uCols; row = node / uCols;
    if ((dir == 0 && col >= uCols - 1) || (dir == 1 && row >= uRows - 1)) { gl_Position = vec4(2.0, 2.0, 0.0, 1.0); vA = 0.0; vColor = vec3(0.0); return; }
    if (end == 1) { if (dir == 0) col += 1; else row += 1; }
  } else { col = gl_VertexID % uCols; row = gl_VertexID / uCols; }
  // The water runs on past the scene's own plane, out toward the horizon.
  vec2 p = vec2((float(col) + 0.5) / float(uCols) * uPlane.x, (float(row) + 0.5) / float(uRows) * uDepth - (uDepth - uPlane.y));
  float R = min(uPlane.x, uPlane.y);
  float c = uW / uK;
  float A = 0.0, E = 0.0, hue = 0.0, streak = 0.0;
  vec2 g = vec2(0.0);
  vec3 streakCol = vec3(0.0);
  for (int i = 0; i < ${MAX}; i++) {
    if (i >= uCount) break;
    vec4 s = uA[i]; vec4 b = uB[i];
    vec2 d = p - s.xy; float r = length(d) + 0.001;
    float front = max(uTime - b.x, 0.0) * c;
    float env = smoothstep(front + 2.0, front - 40.0, r) * exp(-r / (R * max(b.w, 0.05)));
    float amp = s.z * env * inversesqrt(1.0 + r / 36.0);
    float ph = uK * r - uW * uWave + s.w;
    A += amp * cos(ph); E += amp; hue += amp * b.y;
    g += -amp * sin(ph) * uK * (d / r);
    // The light's reflection: a streak on the water between the light and you.
    float sx = exp(-(d.x * d.x) / (2.0 * pow(uPlane.x * 0.035, 2.0)));
    float sy = d.y > 0.0 ? exp(-d.y / (uPlane.y * 0.3)) : 0.0;
    float st = sx * sy * min(s.z * 1.4, 1.0) * (0.5 + 0.5 * smoothstep(0.0, 1.0, 1.0 - r / (R * 0.7)));
    streak += st; streakCol += mix(CYAN, VIOLET, b.y * 0.45) * st;
  }
  // Many lights in a row do not stack their streaks into a bar: one light's worth at most.
  vec3 sCol = streak > 0.0 ? streakCol / streak : vec3(0.0);
  streak = min(streak, 1.0); streakCol = sCol * streak;
  float kq = 1.0;
  if (uFront.w > 0.0) {
    float ahead = dot(p - uFront.xy, vec2(cos(uFront.z), sin(uFront.z)));
    float keep = mix(1.0, smoothstep(-0.6, 1.4, ahead * uK / 6.2831853), uFront.w);
    A *= keep; E *= keep; g *= keep; kq = keep;
  }
  float hm = E > 0.0005 ? hue / E : 0.0;
  // A slow swell under everything, on the beat, so the sea is never flat.
  float swell = sin(p.x * 0.011 + uWave * 4.1887902 * 0.5) * cos(p.y * 0.017 - uWave * 4.1887902 * 0.25);
  float z = (A + swell * 0.22) * uHeight;
  vec2 gz = vec2(g.x + 0.011 * 0.22 * cos(p.x * 0.011 + uWave * 2.0944) * cos(p.y * 0.017 - uWave * 1.0472), g.y) * uHeight;
  vec3 P = vec3(p.x - uPlane.x * 0.5, uPlane.y - p.y, z);
  vec3 n = normalize(vec3(-gz.x, gz.y, 1.0));
  vec3 L = normalize(vec3(-0.22, -0.5, 0.82));
  vec3 V = normalize(uEye - P);
  float diff = max(dot(n, L), 0.0);
  float spec = pow(max(dot(reflect(-L, n), V), 0.0), 28.0);
  // A crest is in step only where it is also high: the ratio alone would light still water behind a row of lights.
  float ridge = smoothstep(0.86, 1.0, A / max(E, 0.0005)) * min(E * 1.8, 1.3) * kq * min(abs(A) * 0.9, 1.0);
  float low = clamp(-A, 0.0, 1.0);   // a trough tints violet a little, never a bar
  vec3 tint = mix(mix(BLUE, CYAN, 0.7), VIOLET, hm);
  vec4 clip = uVP * vec4(P, 1.0);
  gl_Position = clip;
  vec2 ndc = clip.xy / max(clip.w, 0.001);
  float depth = P.y / uDepth;
  // Fades: the horizon, the near edge, the sides, the canvas edge, and quieter water under the words
  // (the left on a wide screen, the bottom on a tall one).
  float words = uRes.x >= uRes.y ? smoothstep(-0.9, -0.1, ndc.x) : smoothstep(-1.0, -0.2, ndc.y);
  float fade = smoothstep(1.0, 0.7, depth) * smoothstep(0.0, 0.03, depth) * smoothstep(0.5, 0.4, abs(P.x) / uPlane.x)
             * smoothstep(1.0, 0.86, max(abs(ndc.x), abs(ndc.y))) * (0.12 + 0.88 * words);
  float lit = 0.14 + 0.95 * diff * diff;
  vec3 shade = tint * lit + WHITE * spec * 0.9 + mix(tint, WHITE, 0.55) * ridge * 0.95 + VIOLET * low * 0.12 + streakCol * (0.35 + 0.65 * diff) * 0.8;
  float a = lit * 0.75 + spec * 0.8 + ridge * 0.9 + streak * 0.5;
  if (uLines > 0.5) { a *= 0.42; shade *= 0.9; }
  vA = clamp(a, 0.0, 1.0) * fade;
  vColor = min(shade, vec3(1.2));
  float px = uDot * uDpr * clamp(uPlane.y * 0.75 / max(clip.w, 1.0), 0.3, 2.4);
  gl_PointSize = uLines > 0.5 ? 1.0 : px * (1.0 + ridge * 0.5);
}`;
const FS = `#version 300 es
precision highp float;
uniform float uLines;
in vec3 vColor; in float vA;
out vec4 o;
void main() {
  float a = vA;
  if (uLines < 0.5) { float d = length(gl_PointCoord - 0.5); a *= smoothstep(0.5, 0.22, d); }
  if (a < 0.004) discard;
  o = vec4(vColor * a, a);
}`;
// The lights themselves: a white core, a coloured glow, drawn as sprites on the surface.
const LIGHT_VS = `#version 300 es
precision highp float;
uniform mat4 uVP;
uniform vec2 uPlane;
uniform float uDpr, uHalo;
uniform vec4 uA[${MAX}];
uniform vec4 uB[${MAX}];
out vec3 vCol; out float vA;
const vec3 CYAN = vec3(0.37, 0.91, 1.0), VIOLET = vec3(0.64, 0.55, 1.0), WHITE = vec3(0.94, 0.99, 1.0);
void main() {
  vec4 s = uA[gl_VertexID]; vec4 b = uB[gl_VertexID];
  vec3 P = vec3(s.x - uPlane.x * 0.5, uPlane.y - s.y, 2.0);
  vec4 clip = uVP * vec4(P, 1.0);
  gl_Position = clip;
  float scale = clamp(uPlane.y * 0.75 / max(clip.w, 1.0), 0.35, 2.2);
  gl_PointSize = (uHalo > 0.5 ? 18.0 : 9.0) * b.z * uDpr * scale;
  vA = min(s.z * 1.6, 1.0) * (uHalo > 0.5 ? 0.3 : 1.0);
  vCol = uHalo > 0.5 ? mix(CYAN, VIOLET, b.y * 0.5) : WHITE;
}`;
const LIGHT_FS = `#version 300 es
precision highp float;
uniform float uHalo;
in vec3 vCol; in float vA;
out vec4 o;
void main() {
  float d = length(gl_PointCoord - 0.5) * 2.0;
  float a = uHalo > 0.5 ? exp(-d * d * 3.2) * (1.0 - d) : exp(-d * d * 6.0);
  a *= vA;
  if (a < 0.004) discard;
  o = vec4(vCol * a, a);
}`;
const GROUND_VS = `#version 300 es
in vec2 aPos; void main() { gl_Position = vec4(aPos, 0.0, 1.0); }`;
const GROUND_FS = `#version 300 es
precision highp float;
uniform vec2 uRes; uniform float uDpr, uGround;
out vec4 o;
void main() {
  vec2 p = vec2(gl_FragCoord.x, uRes.y * uDpr - gl_FragCoord.y) / uDpr;
  vec2 q = (p - uRes * 0.5) / (uRes * 0.5);
  float a = uGround * smoothstep(1.02, 0.6, length(q * vec2(0.92, 0.96)));
  o = vec4(vec3(0.004, 0.02, 0.075) * a, a);
}`;

// Small matrix helpers: a camera above the near edge, looking toward the horizon.
type M4 = Float32Array;
const perspective = (fovy: number, aspect: number, near: number, far: number): M4 => {
  const f = 1 / Math.tan(fovy / 2), nf = 1 / (near - far);
  return new Float32Array([f / aspect, 0, 0, 0, 0, f, 0, 0, 0, 0, (far + near) * nf, -1, 0, 0, 2 * far * near * nf, 0]);
};
const lookAt = (e: number[], t: number[], up: number[]): M4 => {
  const z = norm([e[0] - t[0], e[1] - t[1], e[2] - t[2]]), x = norm(cross(up, z)), y = cross(z, x);
  return new Float32Array([x[0], y[0], z[0], 0, x[1], y[1], z[1], 0, x[2], y[2], z[2], 0, -dot(x, e), -dot(y, e), -dot(z, e), 1]);
};
const norm = (v: number[]) => { const l = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / l, v[1] / l, v[2] / l]; };
const cross = (a: number[], b: number[]) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const dot = (a: number[], b: number[]) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const mul = (a: M4, b: M4): M4 => { const o = new Float32Array(16); for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) { let s = 0; for (let k = 0; k < 4; k++) s += a[k * 4 + j] * b[i * 4 + k]; o[i * 4 + j] = s; } return o; };
const invert = (m: M4): M4 | null => {
  const a = m, o = new Float32Array(16);
  const b00 = a[0] * a[5] - a[1] * a[4], b01 = a[0] * a[6] - a[2] * a[4], b02 = a[0] * a[7] - a[3] * a[4], b03 = a[1] * a[6] - a[2] * a[5], b04 = a[1] * a[7] - a[3] * a[5], b05 = a[2] * a[7] - a[3] * a[6];
  const b06 = a[8] * a[13] - a[9] * a[12], b07 = a[8] * a[14] - a[10] * a[12], b08 = a[8] * a[15] - a[11] * a[12], b09 = a[9] * a[14] - a[10] * a[13], b10 = a[9] * a[15] - a[11] * a[13], b11 = a[10] * a[15] - a[11] * a[14];
  let det = b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06;
  if (!det) return null; det = 1 / det;
  o[0] = (a[5] * b11 - a[6] * b10 + a[7] * b09) * det; o[1] = (a[2] * b10 - a[1] * b11 - a[3] * b09) * det; o[2] = (a[13] * b05 - a[14] * b04 + a[15] * b03) * det; o[3] = (a[10] * b04 - a[9] * b05 - a[11] * b03) * det;
  o[4] = (a[6] * b08 - a[4] * b11 - a[7] * b07) * det; o[5] = (a[0] * b11 - a[2] * b08 + a[3] * b07) * det; o[6] = (a[14] * b02 - a[12] * b05 - a[15] * b01) * det; o[7] = (a[8] * b05 - a[10] * b02 + a[11] * b01) * det;
  o[8] = (a[4] * b10 - a[5] * b08 + a[7] * b06) * det; o[9] = (a[1] * b08 - a[0] * b10 - a[3] * b06) * det; o[10] = (a[12] * b04 - a[13] * b02 + a[15] * b00) * det; o[11] = (a[9] * b02 - a[8] * b04 - a[11] * b00) * det;
  o[12] = (a[5] * b07 - a[4] * b09 - a[6] * b06) * det; o[13] = (a[0] * b09 - a[1] * b07 + a[2] * b06) * det; o[14] = (a[13] * b01 - a[12] * b03 - a[14] * b00) * det; o[15] = (a[8] * b03 - a[9] * b01 + a[10] * b00) * det;
  return o;
};

type Tap = { x: number; y: number; born: number };

export function Sea({ model, className = "", handle, tappable = false, maxDpr = 1.25, still = 6, children, onPointerDown, ...rest }: {
  model: MutableRefObject<RippleModel>; className?: string; handle?: MutableRefObject<RippleHandle | null>; tappable?: boolean; maxDpr?: number; still?: number;
  children?: ReactNode;
} & Omit<HTMLAttributes<HTMLDivElement>, "className" | "children">) {
  const box = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const taps = useRef<Tap[]>([]);
  const clockRef = useRef<() => number>(() => 0);
  const unproject = useRef<(x: number, y: number) => [number, number] | null>(() => null);
  const { motion } = useStateStore();

  useEffect(() => {
    const c = canvas.current, b = box.current;
    if (!c || !b) return;
    const gl = c.getContext("webgl2", { alpha: true, premultipliedAlpha: true, antialias: false });
    if (!gl) { b.dataset.still = "on"; return; }
    const make = (type: number, src: string) => {
      const s = gl.createShader(type)!; gl.shaderSource(s, src); gl.compileShader(s);
      if (import.meta.env.DEV && !gl.getShaderParameter(s, gl.COMPILE_STATUS)) console.error(gl.getShaderInfoLog(s));
      return s;
    };
    const link = (vs: string, fs: string, attr?: string) => {
      const p = gl.createProgram()!;
      gl.attachShader(p, make(gl.VERTEX_SHADER, vs)); gl.attachShader(p, make(gl.FRAGMENT_SHADER, fs));
      if (attr) gl.bindAttribLocation(p, 0, attr);
      gl.linkProgram(p);
      if (!gl.getProgramParameter(p, gl.LINK_STATUS)) { if (import.meta.env.DEV) console.error(gl.getProgramInfoLog(p)); return null; }
      return p;
    };
    const sea = link(VS, FS), light = link(LIGHT_VS, LIGHT_FS), ground = link(GROUND_VS, GROUND_FS, "aPos");
    if (!sea || !light || !ground) { b.dataset.still = "on"; return; }
    const vao = gl.createVertexArray()!;
    gl.bindVertexArray(vao);
    const buf = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    const emptyVao = gl.createVertexArray()!;
    const U = (p: WebGLProgram, n: string) => gl.getUniformLocation(p, n);
    const A = new Float32Array(MAX * 4), B = new Float32Array(MAX * 4);
    // A box narrower than 1.6:1 gets water wider than itself, so it reads as a sea and not a strip.
    let w = 1, h = 1, pw = 1, pd = 1, dpr = 1, raf = 0, visible = true, cols = 120, rows = 80, vp: M4 = perspective(1, 1, 1, 10), inv: M4 | null = null, eye = [0, 0, 0];
    const t0 = performance.now();
    clockRef.current = () => (motion ? (performance.now() - t0) / 1000 : still);
    const camera = () => {
      // Just above the near edge, looking out toward the far edge, which sits a little below the top.
      pw = Math.max(w, Math.min(h * 1.6, w * 1.6)); pd = h * 1.8;
      eye = [0, -h * 0.25, h * 0.42];
      const view = lookAt(eye, [0, h * 0.7, 0], [0, 0, 1]);
      const proj = perspective(0.95, w / h, h * 0.05, h * 4);
      vp = mul(proj, view); inv = invert(vp);
      cols = Math.round(Math.min(200, Math.max(90, pw / 8.5)));
      rows = Math.round(Math.min(190, Math.max(80, pd / 7)));
    };
    unproject.current = (sx, sy) => {
      if (!inv) return null;
      const nx = (sx / w) * 2 - 1, ny = 1 - (sy / h) * 2;
      const pt = (z: number) => { const v = [nx, ny, z, 1]; const o = [0, 0, 0, 0]; for (let i = 0; i < 4; i++) o[i] = inv![i] * v[0] + inv![4 + i] * v[1] + inv![8 + i] * v[2] + inv![12 + i] * v[3]; return [o[0] / o[3], o[1] / o[3], o[2] / o[3]]; };
      const a = pt(-1), d = pt(1);
      const dz = d[2] - a[2]; if (Math.abs(dz) < 1e-6) return null;
      const k = -a[2] / dz; if (k < 0) return null;
      const X = a[0] + (d[0] - a[0]) * k, Y = a[1] + (d[1] - a[1]) * k;
      return [X + pw * 0.5, h - Y];
    };
    const draw = () => {
      const t = clockRef.current();
      const f = model.current(t, pw, h);
      const list = [...f.sources];
      taps.current = taps.current.filter((x) => t - x.born < 4);
      for (const x of taps.current) if (list.length < MAX) list.push({ x: x.x, y: x.y, a: 0.9 * (1 - (t - x.born) / 4), phase: 0, hue: 0.2, size: 3, born: x.born });
      A.fill(0); B.fill(0);
      list.slice(0, MAX).forEach((s, i) => { A.set([s.x, s.y, s.a, s.phase], i * 4); B.set([s.born ?? -100, s.hue, s.size, s.reach ?? 0.62], i * 4); });
      const n = Math.min(MAX, list.length);
      const k = (Math.PI * 2) / Math.max(8, f.lambda);
      const wave = motion ? shared() % BEAT : t;
      gl.viewport(0, 0, c.width, c.height);
      gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
      gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
      // The pool of dark ground the sea lies in.
      gl.useProgram(ground); gl.bindVertexArray(vao);
      gl.uniform2f(U(ground, "uRes"), w, h); gl.uniform1f(U(ground, "uDpr"), dpr); gl.uniform1f(U(ground, "uGround"), f.ground ?? 0.94);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      // The surface: lines, then dots.
      gl.useProgram(sea); gl.bindVertexArray(emptyVao);
      gl.uniformMatrix4fv(U(sea, "uVP"), false, vp); gl.uniform3f(U(sea, "uEye"), eye[0], eye[1], eye[2]);
      gl.uniform2f(U(sea, "uPlane"), pw, h); gl.uniform2f(U(sea, "uRes"), w, h); gl.uniform1f(U(sea, "uDpr"), dpr);
      gl.uniform1f(U(sea, "uTime"), t); gl.uniform1f(U(sea, "uWave"), wave);
      gl.uniform1f(U(sea, "uK"), k); gl.uniform1f(U(sea, "uW"), k * f.speed);
      gl.uniform1f(U(sea, "uHeight"), f.lambda * 0.2); gl.uniform1f(U(sea, "uDot"), 2.4); gl.uniform1f(U(sea, "uDepth"), pd);
      gl.uniform1i(U(sea, "uCount"), n); gl.uniform1i(U(sea, "uCols"), cols); gl.uniform1i(U(sea, "uRows"), rows);
      gl.uniform4fv(U(sea, "uA"), A); gl.uniform4fv(U(sea, "uB"), B);
      gl.uniform4f(U(sea, "uFront"), ...(f.front || [0, 0, 0, 0] as [number, number, number, number]));
      gl.uniform1f(U(sea, "uLines"), 1); gl.drawArrays(gl.LINES, 0, cols * rows * 4);
      gl.uniform1f(U(sea, "uLines"), 0); gl.drawArrays(gl.POINTS, 0, cols * rows);
      // The lights on the water: halo, then core.
      if (n) {
        gl.useProgram(light);
        gl.uniformMatrix4fv(U(light, "uVP"), false, vp); gl.uniform2f(U(light, "uPlane"), pw, h); gl.uniform1f(U(light, "uDpr"), dpr);
        gl.uniform4fv(U(light, "uA"), A); gl.uniform4fv(U(light, "uB"), B);
        gl.uniform1f(U(light, "uHalo"), 1); gl.drawArrays(gl.POINTS, 0, n);
        gl.uniform1f(U(light, "uHalo"), 0); gl.drawArrays(gl.POINTS, 0, n);
      }
    };
    const resize = () => {
      const r = b.getBoundingClientRect();
      w = Math.max(1, r.width); h = Math.max(1, r.height);
      dpr = Math.min(window.devicePixelRatio || 1, maxDpr);
      c.width = Math.round(w * dpr); c.height = Math.round(h * dpr);
      camera(); draw();
    };
    const loop = () => { draw(); raf = motion && visible && !document.hidden ? requestAnimationFrame(loop) : 0; };
    const start = () => { if (!raf && motion && visible) raf = requestAnimationFrame(loop); };
    const ro = new ResizeObserver(resize); ro.observe(b);
    const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible) start(); }); io.observe(b);
    const onVis = () => { if (!document.hidden) start(); };
    document.addEventListener("visibilitychange", onVis);
    const lost = (e: Event) => { e.preventDefault(); cancelAnimationFrame(raf); raf = 0; b.dataset.still = "on"; };
    c.addEventListener("webglcontextlost", lost);
    resize(); start();
    if (handle) handle.current = { redraw: () => { if (!raf) draw(); else start(); } };
    return () => {
      cancelAnimationFrame(raf); ro.disconnect(); io.disconnect();
      document.removeEventListener("visibilitychange", onVis); c.removeEventListener("webglcontextlost", lost);
      gl.deleteBuffer(buf); gl.deleteVertexArray(vao); gl.deleteVertexArray(emptyVao);
      gl.deleteProgram(sea); gl.deleteProgram(light); gl.deleteProgram(ground);
      if (handle) handle.current = null;
    };
  }, [motion, model, handle, maxDpr, still]);

  const tap = (e: PointerEvent<HTMLDivElement>) => {
    if (!tappable || !motion) return;
    const r = e.currentTarget.getBoundingClientRect();
    const at = unproject.current(e.clientX - r.left, e.clientY - r.top);
    if (!at) return;
    taps.current.push({ x: at[0], y: at[1], born: clockRef.current() });
    if (taps.current.length > 4) taps.current.shift();
  };
  return (
    <div ref={box} className={`ripple sea ${className}`} data-quiet onPointerDown={(e) => { tap(e); onPointerDown?.(e); }} {...rest}>
      <canvas ref={canvas} aria-hidden="true" />
      {children}
    </div>
  );
}
