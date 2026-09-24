import { useEffect, useRef } from "react";
import type { HTMLAttributes, MutableRefObject, PointerEvent, ReactNode } from "react";
import { useStateStore } from "../state";
import { BEAT, clock as shared } from "../cadence";

/* Ripples of light, summed the way real waves sum. Each source sends out circular waves; where two crests
   arrive together they add up and glow brighter (constructive interference), where a crest meets a trough
   they cancel and the water goes dark. Many sources in step, side by side, merge into one straight front
   (the Huygens principle). Give Together is drawn with this: one person makes ripples, two people in step
   reinforce each other, and many in step become one wave.

   A scene is described by a model: a function of time and size that returns the sources. The caller keeps
   its own state (scroll progress, a slider, the people on the page) and the model reads it every frame. */

export type Source = { x: number; y: number; a: number; phase: number; hue: number; size: number; born?: number; reach?: number };
export type RippleFrame = {
  sources: Source[];
  lambda: number;            // wavelength in px
  speed: number;             // px per second
  gain?: number;
  dots?: number;             // spacing of the lattice of points the water lights (0 for none)
  ground?: number;           // how much of the page's own ground the pool covers (0 to 1), fading to its edges
  select?: [number, number, number];   // a ring around the chosen light: x, y, strength
  ring?: [number, number, number];     // one expanding ring of light: x, y, progress 0..1
  front?: [number, number, number, number]; // a line the wave moves forward from: x, y, direction (radians), strength 0..1
};
export type RippleModel = (t: number, w: number, h: number) => RippleFrame;
export type RippleHandle = { redraw: () => void };

const MAX = 12;
const VS = `#version 300 es
in vec2 aPos; void main() { gl_Position = vec4(aPos, 0.0, 1.0); }`;
const FS = `#version 300 es
precision highp float;
uniform vec2 uRes;
uniform float uDpr, uTime, uWave, uK, uW, uGain, uDots, uGround;
uniform int uCount;
uniform vec4 uA[${MAX}];   // x, y, amplitude, phase
uniform vec4 uB[${MAX}];   // born, hue, size, reach (how far its ripples carry, as a share of the scene)
uniform vec3 uSel;
uniform vec3 uRing;
uniform vec4 uFront;
out vec4 o;
const vec3 CYAN = vec3(0.37, 0.91, 1.0), BLUE = vec3(0.2, 0.52, 1.0), VIOLET = vec3(0.64, 0.55, 1.0), WHITE = vec3(0.94, 0.99, 1.0);
void main() {
  vec2 p = vec2(gl_FragCoord.x, uRes.y * uDpr - gl_FragCoord.y) / uDpr;
  float R = min(uRes.x, uRes.y);
  float c = uW / uK;
  float A = 0.0, E = 0.0, hue = 0.0, core = 0.0;
  vec3 light = vec3(0.0);
  for (int i = 0; i < ${MAX}; i++) {
    if (i >= uCount) break;
    vec4 s = uA[i]; vec4 b = uB[i];
    float r = length(p - s.xy);
    // A new source's waves only reach as far as they have had time to travel.
    float front = max(uTime - b.x, 0.0) * c;
    float env = smoothstep(front + 2.0, front - 40.0, r) * exp(-r / (R * max(b.w, 0.05)));
    float amp = s.z * env * inversesqrt(1.0 + r / 36.0);
    A += amp * cos(uK * r - uW * uWave + s.w);
    E += amp;
    hue += amp * b.y;
    // The source itself: a point of light.
    float sz = b.z;
    if (r < sz * 14.0) {
      float g = exp(-r * r / (sz * sz)) * min(s.z * 1.6, 1.0);
      float h = exp(-r / (sz * 3.0)) * 0.34 * min(s.z * 1.6, 1.0);
      core += g + h * 0.8;
      light += WHITE * g * 0.9 + mix(CYAN, VIOLET, b.y) * (g * 0.3 + h);
    }
  }
  float hm = E > 0.0005 ? hue / E : 0.0;
  // A wave that has formed moves forward from its line: the water behind the line goes quiet.
  if (uFront.w > 0.0) {
    float ahead = dot(p - uFront.xy, vec2(cos(uFront.z), sin(uFront.z)));
    float keep = mix(1.0, smoothstep(-0.6, 1.4, ahead * uK / 6.2831853), uFront.w);
    A *= keep; E *= keep;
  }
  // Crests glow; troughs keep a faint violet so the water has depth; a thin bright line runs along every
  // crest that is truly in step.
  float crest = max(A, 0.0), trough = max(-A, 0.0);
  float band = 1.0 - exp(-crest * crest * uGain * 2.4);
  float low = (1.0 - exp(-trough * trough * uGain * 2.4)) * 0.4;
  float ridge = smoothstep(0.9, 1.0, A / max(E, 0.0005)) * min(E * 1.8, 1.3);
  vec3 tint = mix(mix(BLUE, CYAN, 0.7), VIOLET, hm);
  // The ground is a lattice of points, and the water lights them.
  float dots = 0.0;
  if (uDots > 0.0) {
    vec2 g = (fract(p / uDots) - 0.5) * uDots;
    dots = smoothstep(1.55, 0.35, length(g)) * (0.1 + band * 1.5 + ridge * 1.1 + low * 1.2);
  }
  vec3 col = tint * band * 0.62 + VIOLET * low * 0.55 + mix(tint, WHITE, 0.5) * ridge * 0.95 + WHITE * pow(band, 4.0) * 0.45 + mix(tint, WHITE, 0.35) * dots;
  float a = band * 0.52 + low * 0.4 + ridge * 0.8 + dots;
  col += light; a += core;
  // A pool of the page's own dark ground, round-edged, so the water is not drawn over other dots.
  if (uGround > 0.0) {
    vec2 q = (p - uRes * 0.5) / (uRes * 0.5);
    a += uGround * smoothstep(1.02, 0.62, length(q * vec2(0.92, 0.96)));
  }
  if (uSel.z > 0.0) {
    float d = length(p - uSel.xy);
    float ring = exp(-pow((d - 15.0) / 1.2, 2.0)) * uSel.z * 0.85;
    col += CYAN * ring; a += ring;
  }
  if (uRing.z >= 0.0 && uRing.z <= 1.0) {
    float pr = uRing.z, dw = length(p - uRing.xy);
    float rad = pr * R * 1.1, width = 5.0 + pr * 26.0, fade = (1.0 - pr) * (1.0 - pr);
    float ring = exp(-pow((dw - rad) / width, 2.0)) * fade * 0.95;
    float glow = exp(-dw / (R * 0.12)) * fade * 0.22;
    col += mix(WHITE, CYAN, pr) * ring + VIOLET * glow; a += ring + glow;
  }
  // Nothing reaches the edge of the canvas, so no frame ever shows over the dots.
  float edge = smoothstep(0.0, 30.0, min(min(p.x, uRes.x - p.x), min(p.y, uRes.y - p.y)));
  col *= edge; a = clamp(a * edge, 0.0, 1.0);
  if (a < 0.004) discard;
  o = vec4(min(col, vec3(1.0)), a);
}`;

/** Ease out, cubic. */
export const ease = (x: number) => 1 - Math.pow(1 - Math.min(1, Math.max(0, x)), 3);
export const mix = (a: number, b: number, t: number) => a + (b - a) * t;
export const hash = (s: string | number) => { const str = String(s); let h = 2166136261; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0) / 4294967296; };

type Tap = { x: number; y: number; born: number };

export function Ripple({ model, className = "", handle, tappable = false, maxDpr = 1.25, still = 6, children, onPointerDown, ...rest }: {
  model: MutableRefObject<RippleModel>; className?: string; handle?: MutableRefObject<RippleHandle | null>; tappable?: boolean; maxDpr?: number; still?: number;
  children?: ReactNode;
} & Omit<HTMLAttributes<HTMLDivElement>, "className" | "children">) {
  const box = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const taps = useRef<Tap[]>([]);
  const clock = useRef<() => number>(() => 0);
  const { motion } = useStateStore();

  useEffect(() => {
    const c = canvas.current, b = box.current;
    if (!c || !b) return;
    const gl = c.getContext("webgl2", { alpha: true, premultipliedAlpha: true, antialias: false });
    if (!gl) { b.dataset.still = "on"; return; }
    const make = (type: number, src: string) => { const s = gl.createShader(type)!; gl.shaderSource(s, src); gl.compileShader(s); return s; };
    const prog = gl.createProgram()!;
    gl.attachShader(prog, make(gl.VERTEX_SHADER, VS)); gl.attachShader(prog, make(gl.FRAGMENT_SHADER, FS));
    gl.bindAttribLocation(prog, 0, "aPos");
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) { if (import.meta.env.DEV) console.error(gl.getProgramInfoLog(prog)); b.dataset.still = "on"; return; }
    const vao = gl.createVertexArray()!;
    gl.bindVertexArray(vao);
    const buf = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    const U = (n: string) => gl.getUniformLocation(prog, n);
    const loc = { res: U("uRes"), dpr: U("uDpr"), time: U("uTime"), wave: U("uWave"), k: U("uK"), w: U("uW"), gain: U("uGain"), dots: U("uDots"), ground: U("uGround"), count: U("uCount"), a: U("uA"), b: U("uB"), sel: U("uSel"), ring: U("uRing"), front: U("uFront") };
    const A = new Float32Array(MAX * 4), B = new Float32Array(MAX * 4);
    let w = 1, h = 1, dpr = 1, raf = 0, visible = true;
    const t0 = performance.now();
    clock.current = () => (motion ? (performance.now() - t0) / 1000 : still);

    const draw = () => {
      const t = clock.current();
      const f = model.current(t, w, h);
      const list = [...f.sources];
      // A tap adds a short-lived source in step with everything else: your ripple joins the wave.
      taps.current = taps.current.filter((x) => t - x.born < 4);
      for (const x of taps.current) if (list.length < MAX) list.push({ x: x.x, y: x.y, a: 0.9 * (1 - (t - x.born) / 4), phase: 0, hue: 0.2, size: 3, born: x.born });
      A.fill(0); B.fill(0);
      list.slice(0, MAX).forEach((s, i) => { A.set([s.x, s.y, s.a, s.phase], i * 4); B.set([s.born ?? -100, s.hue, s.size, s.reach ?? 0.62], i * 4); });
      gl.viewport(0, 0, c.width, c.height);
      gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
      gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
      gl.useProgram(prog);
      const k = (Math.PI * 2) / Math.max(8, f.lambda);
      gl.uniform2f(loc.res, w, h); gl.uniform1f(loc.dpr, dpr); gl.uniform1f(loc.time, t);
      // Crests pass once a beat on the clock the whole page shares, so every scene ripples in step.
      gl.uniform1f(loc.wave, motion ? shared() % BEAT : t);
      gl.uniform1f(loc.k, k); gl.uniform1f(loc.w, k * f.speed); gl.uniform1f(loc.gain, f.gain ?? 1); gl.uniform1f(loc.dots, f.dots ?? 0); gl.uniform1f(loc.ground, f.ground ?? 0);
      gl.uniform1i(loc.count, Math.min(MAX, list.length));
      gl.uniform4fv(loc.a, A); gl.uniform4fv(loc.b, B);
      gl.uniform3f(loc.sel, ...(f.select || [0, 0, 0] as [number, number, number]));
      gl.uniform3f(loc.ring, ...(f.ring || [0, 0, -1] as [number, number, number]));
      gl.uniform4f(loc.front, ...(f.front || [0, 0, 0, 0] as [number, number, number, number]));
      gl.bindVertexArray(vao);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };
    const resize = () => {
      const r = b.getBoundingClientRect();
      w = Math.max(1, r.width); h = Math.max(1, r.height);
      dpr = Math.min(window.devicePixelRatio || 1, maxDpr);
      c.width = Math.round(w * dpr); c.height = Math.round(h * dpr);
      draw();
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
      gl.deleteBuffer(buf); gl.deleteVertexArray(vao); gl.deleteProgram(prog);
      if (handle) handle.current = null;
    };
  }, [motion, model, handle, maxDpr, still]);

  const tap = (e: PointerEvent<HTMLDivElement>) => {
    if (!tappable || !motion) return;
    const r = e.currentTarget.getBoundingClientRect();
    taps.current.push({ x: e.clientX - r.left, y: e.clientY - r.top, born: clock.current() });
    if (taps.current.length > 4) taps.current.shift();
  };
  return (
    <div ref={box} className={`ripple ${className}`} data-quiet onPointerDown={(e) => { tap(e); onPointerDown?.(e); }} {...rest}>
      <canvas ref={canvas} aria-hidden="true" />
      {children}
    </div>
  );
}
