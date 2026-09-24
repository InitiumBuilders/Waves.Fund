import { useEffect, useRef } from "react";
import type { PointerEvent } from "react";
import { useStateStore } from "../state";

/* The Give Together scene. You are a soft cyan light with currents moving around you. People you could
   give with are distant points of light: nearer the more you have in common. A Give Guide is joined to
   you by a flowing strand. When two people both say yes, the strand grows between them and a wave of
   light spreads out from where they meet.

   "field" draws real people only (the page passes them in). "moment" plays one connection. "hero" is an
   illustration on the landing page and is never presented as real people. */

export type SceneNode = { key: string; state: "candidate" | "invited" | "incoming" | "guide"; weight: number };

const VS = `#version 300 es
in vec2 aPos; void main() { gl_Position = vec4(aPos, 0.0, 1.0); }`;
const FS = `#version 300 es
precision highp float;
uniform vec2 uRes;
uniform float uDpr, uTime, uCurrent;
uniform vec2 uYou;
uniform int uCount;
uniform vec4 uNode[16];   // x, y, size, kind (0 candidate, 1 invited, 2 incoming, 3 guide)
uniform vec4 uLink[16];   // selected, strand progress, seed, strand strength
uniform vec3 uWave;       // x, y, progress (negative when there is no wave)
out vec4 o;
const float PI = 3.14159265;
const vec3 CYAN = vec3(0.37, 0.91, 1.0), BLUE = vec3(0.2, 0.52, 1.0), VIOLET = vec3(0.64, 0.55, 1.0), WHITE = vec3(0.94, 0.99, 1.0);

// Distance to a gently curved strand from a to b, drawn only up to progress. Returns the glow; "along" is 0 at a, 1 at b.
float strand(vec2 p, vec2 a, vec2 b, float progress, float seed, out float along, out float len) {
  vec2 ab = b - a; float L = max(length(ab), 1.0); vec2 dir = ab / L; vec2 n = vec2(-dir.y, dir.x);
  vec2 q = p - a; float u = dot(q, dir) / L; float v = dot(q, n);
  float uc = clamp(u, 0.0, 1.0);
  float bend = sin(uc * PI) * L * 0.1 * (seed > 0.5 ? 1.0 : -1.0);
  float ripple = sin(uc * PI * 5.0 - uTime * 1.4 + seed * 6.0) * 1.5 * sin(uc * PI);
  float d = abs(v - bend - ripple);
  float drawn = smoothstep(-0.004, 0.004, u) * (1.0 - smoothstep(progress - 0.01, progress + 0.004, u));
  along = uc; len = L;
  return exp(-d * d / 0.8) * drawn + exp(-d * d / 14.0) * drawn * 0.18;
}

void main() {
  vec2 p = vec2(gl_FragCoord.x, uRes.y * uDpr - gl_FragCoord.y) / uDpr;
  vec3 col = vec3(0.0); float a = 0.0;
  float R = min(uRes.x, uRes.y);

  // Currents: slow contour lines of a moving flow around your light.
  vec2 dv = p - uYou; float r = length(dv); float th = atan(dv.y, dv.x);
  float psi = r / (R * 0.075) + 0.55 * sin(th * 2.0 + r / (R * 0.11) - uTime * 0.26) + 0.24 * sin(th * 5.0 - r / (R * 0.06) + uTime * 0.18);
  float di = abs(psi - floor(psi + 0.5));
  float line = 1.0 - smoothstep(0.0, fwidth(psi) * 2.0, di);
  float travel = pow(0.5 + 0.5 * sin(th - uTime * 0.55 + floor(psi + 0.5) * 2.1), 3.0);
  float reach = exp(-r / (R * 0.4)) * smoothstep(R * 0.03, R * 0.1, r);
  float cur = line * (0.3 + 0.7 * travel) * reach * uCurrent * 0.5;
  col += mix(BLUE, CYAN, travel) * cur; a += cur * 0.85;

  // Your light.
  float breathe = 0.86 + 0.14 * sin(uTime * 1.2);
  float core = exp(-r * r / 26.0);
  float halo = exp(-r / 15.0) * 0.5 * breathe + exp(-r / 52.0) * 0.16 * smoothstep(R * 0.42, R * 0.18, r);
  col += WHITE * core + CYAN * halo; a += core + halo * 0.9;

  for (int i = 0; i < 16; i++) {
    if (i >= uCount) break;
    vec4 nd = uNode[i]; vec4 ln = uLink[i];
    float dq = length(p - nd.xy);
    float kind = nd.w, size = nd.z;
    vec3 tint = kind > 2.5 ? CYAN : kind > 1.5 ? VIOLET : kind > 0.5 ? mix(CYAN, BLUE, 0.4) : vec3(0.7, 0.83, 1.0);
    float tw = 0.78 + 0.22 * sin(uTime * (0.9 + ln.z) + ln.z * 9.0);
    if (kind > 1.5 && kind < 2.5) tw = 0.72 + 0.28 * sin(uTime * 2.2);
    float c = exp(-dq * dq / (size * size)) * tw;
    float h = exp(-dq / (size * 3.0)) * 0.3 * tw;
    col += WHITE * c * 0.85 + tint * (c * 0.4 + h); a += c + h * 0.8;

    float along, len;
    if (ln.x > 0.0) {
      // The one you are looking at: a ring, and a faint dashed line back to you.
      float ring = exp(-pow((dq - size * 4.0) / 1.1, 2.0)) * 0.75 * ln.x;
      float s = strand(p, uYou, nd.xy, 1.0, ln.z, along, len);
      float dash = smoothstep(0.35, 0.5, fract(along * len / 9.0 - uTime * 0.6));
      float faint = s * dash * 0.32 * ln.x * smoothstep(0.04, 0.12, along) * (1.0 - smoothstep(0.86, 0.95, along));
      col += CYAN * (ring + faint); a += ring + faint;
    }
    if (ln.y > 0.001) {
      float s = strand(p, uYou, nd.xy, ln.y, ln.z, along, len);
      float bead = exp(-pow((fract(along * 2.0 - uTime * 0.28 + ln.z) - 0.5) * 8.0, 2.0));
      float head = ln.y < 0.995 ? exp(-pow((along - ln.y) * len / 5.0, 2.0)) * 2.4 : 0.0;
      float st = s * (0.32 + 0.68 * bead + head) * ln.w;
      col += mix(CYAN, WHITE, bead * 0.6) * st; a += st;
    }
  }

  if (uWave.z >= 0.0) {
    float pr = uWave.z;
    float dw = length(p - uWave.xy);
    float rad = pr * R * 1.05;
    float width = 5.0 + pr * 24.0;
    float fade = (1.0 - pr) * (1.0 - pr);
    float ring = exp(-pow((dw - rad) / width, 2.0)) * fade * 0.95;
    float inner = exp(-pow((dw - rad * 0.7) / (width * 0.7), 2.0)) * fade * 0.32;
    float glow = exp(-dw / (R * 0.12)) * fade * 0.25;
    col += mix(WHITE, CYAN, pr) * ring + VIOLET * inner + CYAN * glow; a += ring + inner * 0.8 + glow;
  }

  // Fade to nothing well inside the frame, so no edge of the canvas ever shows over the dots.
  float edge = smoothstep(0.0, 28.0, min(min(p.x, uRes.x - p.x), min(p.y, uRes.y - p.y)));
  col *= edge; a = clamp(a * edge, 0.0, 1.0);
  if (a < 0.004) discard;
  o = vec4(min(col, vec3(1.0)), a);
}`;

const KIND = { candidate: 0, invited: 1, incoming: 2, guide: 3 } as const;
const hash = (s: string) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0) / 4294967296; };
const ease = (x: number) => 1 - Math.pow(1 - Math.min(1, Math.max(0, x)), 3);

// Illustration for the landing page: seven lights, joined to you one at a time.
const HERO: SceneNode[] = Array.from({ length: 7 }, (_, i) => ({ key: `hero-${i}`, state: "candidate", weight: [0.9, 0.55, 0.75, 0.35, 0.65, 0.45, 0.8][i] }));

type Placed = { key: string; x: number; y: number; state: SceneNode["state"]; seed: number };

export function GiveScene({ variant, nodes = [], selected = null, onSelect, className = "", paused = false }: {
  variant: "field" | "moment" | "hero"; nodes?: SceneNode[]; selected?: string | null; onSelect?: (key: string) => void; className?: string; paused?: boolean;
}) {
  const box = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const { motion } = useStateStore();
  const live = useRef({ nodes, selected, paused });
  live.current = { nodes, selected, paused };
  const placed = useRef<Placed[]>([]);
  const redraw = useRef<() => void>(() => {});

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
    const loc = { res: U("uRes"), dpr: U("uDpr"), time: U("uTime"), current: U("uCurrent"), you: U("uYou"), count: U("uCount"), node: U("uNode"), link: U("uLink"), wave: U("uWave") };
    const nodeData = new Float32Array(64), linkData = new Float32Array(64);
    const progress = new Map<string, number>(), select = new Map<string, number>();
    let w = 1, h = 1, dpr = 1, raf = 0, visible = true, last = performance.now();
    const t0 = performance.now();

    const resize = () => {
      const r = b.getBoundingClientRect();
      w = Math.max(1, r.width); h = Math.max(1, r.height);
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      // Keep the pixel count sane on very large screens.
      while (w * h * dpr * dpr > 2600000 && dpr > 1) dpr -= 0.25;
      c.width = Math.round(w * dpr); c.height = Math.round(h * dpr);
      draw(performance.now());
    };

    const layout = (list: SceneNode[], you: { x: number; y: number }) => {
      const R = Math.min(w, h), stretch = w > h ? Math.min(w / h, 1.9) : 1;
      return list.slice(0, 16).map((n, i): Placed => {
        const seed = hash(n.key);
        const angle = i * 2.39996 + seed * 0.9 - 1.2;
        const dist = R * (0.2 + 0.25 * (1 - Math.min(1, Math.max(0, n.weight))));
        return {
          key: n.key, state: n.state, seed,
          x: Math.min(w - 22, Math.max(22, you.x + Math.cos(angle) * dist * stretch)),
          y: Math.min(h - 22, Math.max(22, you.y + Math.sin(angle) * dist)),
        };
      });
    };

    const draw = (now: number) => {
      const t = motion ? (now - t0) / 1000 : 0;
      const dt = Math.min(0.1, (now - last) / 1000); last = now;
      const { nodes: list, selected: chosen } = live.current;
      let you = { x: w / 2, y: h / 2 };
      let wave: [number, number, number] = [0, 0, -1];
      let current = 1;
      let items: Placed[];
      const targets = new Map<string, number>();

      if (variant === "moment") {
        // Two lights: the strand grows for 1.6s, then a wave spreads from where it meets.
        const wide = w > h;
        you = wide ? { x: w * 0.36, y: h * 0.42 } : { x: w * 0.3, y: h * 0.3 };
        items = [{ key: "guide", x: wide ? w * 0.64 : w * 0.7, y: wide ? h * 0.42 : h * 0.3, state: "guide", seed: 0.3 }];
        const grow = motion ? ease(t / 1.6) : 1;
        progress.set("guide", grow);
        const wp = motion ? (t - 1.5) / 2.6 : -1;
        if (wp >= 0 && wp <= 1) wave = [(you.x + items[0].x) / 2, (you.y + items[0].y) / 2, wp];
      } else if (variant === "hero") {
        items = layout(HERO, you);
        // Every 5s the next light joins you. After three, the strands let go and it begins again.
        const cycle = motion ? t / 5 : 2.9;
        const round = Math.floor(cycle / 4), step = cycle % 4;
        items.forEach((it, i) => {
          const order = (i * 3 + round * 2) % items.length;
          let p = 0;
          if (order < 3) p = step < 3 ? ease((step - order) * 1.6) * (step >= order ? 1 : 0) : Math.max(0, 1 - (step - 3) * 1.4);
          progress.set(it.key, p);
          if (order < 3 && step >= order && step < order + 1.2 && motion) {
            const wp = (step - order - 0.35) / 0.85;
            if (wp >= 0 && wp <= 1) wave = [(you.x + it.x) / 2, (you.y + it.y) / 2, wp];
          }
          it.state = p > 0.05 ? "guide" : "candidate";
        });
        current = 0.9;
      } else {
        items = layout(list, you);
        for (const it of items) targets.set(it.key, it.state === "guide" ? 1 : it.state === "invited" ? 0.34 : 0);
        for (const it of items) {
          const target = targets.get(it.key) || 0;
          const was = progress.has(it.key) ? progress.get(it.key)! : motion ? 0 : target;
          progress.set(it.key, motion ? was + (target - was) * (1 - Math.exp(-dt * 2.6)) : target);
          const s = select.get(it.key) || 0, st = it.key === chosen ? 1 : 0;
          select.set(it.key, motion ? s + (st - s) * (1 - Math.exp(-dt * 8)) : st);
        }
      }
      // Gentle drift so the lights feel alive; the hit test uses the same positions.
      if (motion) for (const it of items) { it.x += Math.sin(t * 0.21 + it.seed * 40) * 3.5; it.y += Math.cos(t * 0.17 + it.seed * 30) * 3; }
      placed.current = items;

      nodeData.fill(0); linkData.fill(0);
      items.forEach((it, i) => {
        nodeData.set([it.x, it.y, it.state === "guide" ? 3.4 : 2.6 + (variant === "moment" ? 1.2 : 0), KIND[it.state]], i * 4);
        linkData.set([select.get(it.key) || 0, progress.get(it.key) || 0, it.seed, it.state === "invited" ? 0.55 : 1], i * 4);
      });

      gl.viewport(0, 0, c.width, c.height);
      gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
      gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
      gl.useProgram(prog);
      gl.uniform2f(loc.res, w, h);
      gl.uniform1f(loc.dpr, dpr);
      gl.uniform1f(loc.time, motion ? t : 4.2);
      gl.uniform1f(loc.current, current);
      gl.uniform2f(loc.you, you.x, you.y);
      gl.uniform1i(loc.count, items.length);
      gl.uniform4fv(loc.node, nodeData);
      gl.uniform4fv(loc.link, linkData);
      gl.uniform3f(loc.wave, wave[0], wave[1], wave[2]);
      gl.bindVertexArray(vao);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };
    redraw.current = () => { if (!raf) draw(performance.now()); };

    const loop = (now: number) => {
      draw(now);
      raf = motion && visible && !document.hidden && !live.current.paused ? requestAnimationFrame(loop) : 0;
    };
    const start = () => { if (!raf && motion && visible && !live.current.paused) { last = performance.now(); raf = requestAnimationFrame(loop); } };
    const ro = new ResizeObserver(resize);
    ro.observe(b);
    const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible) start(); });
    io.observe(b);
    const onVis = () => { if (!document.hidden) start(); };
    document.addEventListener("visibilitychange", onVis);
    const lost = (e: Event) => { e.preventDefault(); cancelAnimationFrame(raf); raf = 0; b.dataset.still = "on"; };
    c.addEventListener("webglcontextlost", lost);
    resize();
    start();
    (b as HTMLDivElement & { wake?: () => void }).wake = start;
    return () => {
      cancelAnimationFrame(raf); ro.disconnect(); io.disconnect();
      document.removeEventListener("visibilitychange", onVis); c.removeEventListener("webglcontextlost", lost);
      gl.deleteBuffer(buf); gl.deleteVertexArray(vao); gl.deleteProgram(prog);
    };
  }, [motion, variant]);

  // With motion off there is no loop, so a change of people or selection draws one new frame.
  useEffect(() => {
    redraw.current();
    if (!paused) (box.current as (HTMLDivElement & { wake?: () => void }) | null)?.wake?.();
  }, [nodes, selected, paused]);

  const pick = (e: PointerEvent<HTMLDivElement>) => {
    if (!onSelect) return;
    const r = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - r.left, y = e.clientY - r.top;
    let best: Placed | null = null, bestD = 34;
    for (const p of placed.current) { const d = Math.hypot(p.x - x, p.y - y); if (d < bestD) { best = p; bestD = d; } }
    if (best) onSelect(best.key);
  };

  return (
    <div ref={box} className={`gt-scene gt-scene-${variant} ${className}`} onPointerDown={onSelect ? pick : undefined} aria-hidden="true" data-quiet>
      <canvas ref={canvas} />
    </div>
  );
}
