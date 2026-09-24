import { useEffect, useRef, useState } from "react";
import type { PointerEvent } from "react";
import { useStateStore } from "./state";

/* A string between a teacher and a learner, simulated with the wave equation.
   Hold "Teach" and the teacher's end moves in time with the string's third harmonic: each pulse runs to the
   learner, reflects (a fixed end flips it) and comes back, and because the next push arrives in step with the
   echo, the two add up into a standing wave that holds its shape (resonance). Let go and it fades slowly.
   Touch the string anywhere to pluck it once and watch a single pulse go out and come back. */

const N = 150;               // segments
const HARMONIC = 3;          // the shape it settles into: three loops
const TRANSIT = 0.62;        // seconds for a pulse to cross once
const DAMPING = 0.16;        // per second while teaching
const RELEASE = 0.34;        // per second once you let go: it fades, slowly

export function StringLab() {
  const box = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const holding = useRef(false);
  const plucks = useRef<number[]>([]);
  const [held, setHeld] = useState(false);
  const [state, setState] = useState<"rest" | "sending" | "holding" | "fading">("rest");
  const { motion } = useStateStore();

  useEffect(() => {
    const b = box.current, c = canvas.current, ctx = c?.getContext("2d");
    if (!b || !c || !ctx) return;
    let w = 1, h = 1, dpr = 1, raf = 0, visible = true, last = performance.now(), t = 0, shown = "rest", envelope = 0;
    let y = new Float32Array(N + 1), prev = new Float32Array(N + 1), next = new Float32Array(N + 1);
    const resize = () => {
      const r = b.getBoundingClientRect(); w = Math.max(1, r.width); h = Math.max(1, r.height);
      dpr = Math.min(devicePixelRatio || 1, 2); c.width = Math.round(w * dpr); c.height = Math.round(h * dpr);
      draw();
    };
    const pad = () => Math.max(26, w * 0.07);
    const step = (dt: number) => {
      const L = w - pad() * 2, dx = L / N, speed = L / TRANSIT;
      const sub = Math.max(1, Math.ceil(dt / ((0.9 * dx) / speed)));
      const k = dt / sub, r2 = ((speed * k) / dx) ** 2, damp = (holding.current ? DAMPING : RELEASE) * k;
      const omega = (HARMONIC * Math.PI * speed) / L;
      for (let s = 0; s < sub; s++) {
        t += k;
        for (let i = 1; i < N; i++) next[i] = (2 * y[i] - prev[i] * (1 - damp) + r2 * (y[i + 1] - 2 * y[i] + y[i - 1])) / (1 + damp);
        // The teacher's end moves only while someone is teaching; the learner's end is held still.
        next[0] = holding.current ? Math.sin(omega * t) * Math.min(h * 0.06, 11) : next[0] * 0.9;
        next[N] = 0;
        const tmp = prev; prev = y; y = next; next = tmp;
      }
      for (const at of plucks.current.splice(0)) {
        const ci = Math.round(at * N);
        for (let i = 1; i < N; i++) { const d = (i - ci) / 5; const bump = Math.exp(-d * d) * h * 0.22; y[i] += bump; prev[i] += bump; }
      }
    };
    const draw = () => {
      const P = pad(), L = w - P * 2, mid = h / 2;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      let peak = 0;
      const path = new Path2D();
      for (let i = 0; i <= N; i++) {
        const v = motion ? Math.max(-h * 0.44, Math.min(h * 0.44, y[i])) : Math.sin((HARMONIC * Math.PI * i) / N) * h * 0.2;
        peak = Math.max(peak, Math.abs(v));
        const x = P + (i / N) * L;
        if (i) path.lineTo(x, mid - v); else path.moveTo(x, mid - v);
      }
      const grad = ctx.createLinearGradient(P, 0, P + L, 0);
      grad.addColorStop(0, "#9ff5ff"); grad.addColorStop(0.5, "#79c8ff"); grad.addColorStop(1, "#b9a8ff");
      ctx.globalCompositeOperation = "lighter";
      ctx.lineCap = "round"; ctx.lineJoin = "round";
      ctx.strokeStyle = "rgba(94, 233, 255, 0.12)"; ctx.lineWidth = 12; ctx.stroke(path);
      ctx.strokeStyle = "rgba(94, 233, 255, 0.22)"; ctx.lineWidth = 5; ctx.stroke(path);
      ctx.strokeStyle = grad; ctx.lineWidth = 2.2; ctx.stroke(path);
      // The two ends: the teacher who sends and the learner who returns.
      for (const [x, col] of [[P, "94, 233, 255"], [P + L, "170, 150, 255"]] as const) {
        const g = ctx.createRadialGradient(x, mid, 0, x, mid, 26);
        g.addColorStop(0, `rgba(${col}, 0.9)`); g.addColorStop(0.25, `rgba(${col}, 0.35)`); g.addColorStop(1, `rgba(${col}, 0)`);
        ctx.fillStyle = g; ctx.fillRect(x - 26, mid - 26, 52, 52);
        ctx.fillStyle = "#f2feff"; ctx.beginPath(); ctx.arc(x, mid, 4.5, 0, Math.PI * 2); ctx.fill();
      }
      ctx.globalCompositeOperation = "source-over";
      // Say what the string is doing, but only when it changes. The envelope follows the height of the swing,
      // not the instant, which passes through zero twice a swing.
      envelope = Math.max(envelope * 0.985, peak);
      const now = !motion ? "holding" : holding.current ? (envelope > h * 0.15 ? "holding" : "sending") : envelope > h * 0.04 ? "fading" : "rest";
      if (now !== shown) { shown = now; setState(now as typeof state); }
    };
    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      step(dt); draw();
      raf = visible && !document.hidden ? requestAnimationFrame(loop) : 0;
    };
    const start = () => { if (!raf && motion && visible) { last = performance.now(); raf = requestAnimationFrame(loop); } };
    const ro = new ResizeObserver(resize); ro.observe(b);
    const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible) start(); }); io.observe(b);
    resize(); start();
    return () => { cancelAnimationFrame(raf); ro.disconnect(); io.disconnect(); };
  }, [motion]);

  const hold = (on: boolean) => { holding.current = on; setHeld(on); };
  const pluck = (e: PointerEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const P = Math.max(26, r.width * 0.07);
    plucks.current.push(Math.min(0.95, Math.max(0.05, (e.clientX - r.left - P) / (r.width - P * 2))));
  };
  const words = {
    rest: "Hold to teach, or touch the string to send one pulse.",
    sending: "Each push runs to the learner and comes back. The next push meets it in step.",
    holding: "Sent out and returned in step, the wave now keeps one shape. This is a standing wave.",
    fading: "Without new pushes it fades slowly. Hold the button again to keep it going.",
  }[state];
  return (
    <figure className="tb-lab">
      <div ref={box} className="tb-lab-string" onPointerDown={motion ? pluck : undefined} aria-hidden="true" data-quiet><canvas ref={canvas} /></div>
      <div className="tb-lab-ends" aria-hidden="true"><span>Teacher</span><span>Learner</span></div>
      <figcaption className="tb-lab-caption">
        <button
          type="button" className={"glow-button tb-lab-hold" + (held ? " is-held" : "")} aria-pressed={held} disabled={!motion}
          onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); hold(true); }}
          onPointerUp={() => hold(false)} onPointerCancel={() => hold(false)} onLostPointerCapture={() => hold(false)}
          onKeyDown={(e) => { if ((e.key === " " || e.key === "Enter") && !e.repeat) { e.preventDefault(); hold(true); } }}
          onKeyUp={(e) => { if (e.key === " " || e.key === "Enter") hold(false); }}
          onBlur={() => hold(false)}
        >{held ? "Teaching…" : "Hold To Teach"}</button>
        <span className="tb-lab-words" role="status">{motion ? words : "A standing wave. Sent out and returned in step, it keeps one shape."}</span>
      </figcaption>
    </figure>
  );
}
