import { useEffect, useRef } from "react";
import type { PointerEvent } from "react";
import { useStateStore } from "./state";

/* A string held at both ends, simulated with the wave equation. It starts by itself when it is scrolled into
   view: one end moves in time with the string's third harmonic, each pulse runs to the far end, reflects and
   comes back, and the next push meets it, so a steady standing wave builds. Scrolled away, it slowly settles.
   A touch on the string sends one pulse. No labels or controls: it is a picture of teaching back. */

const N = 150;               // segments
const HARMONIC = 3;          // the shape it settles into: three loops
const TRANSIT = 0.62;        // seconds for a pulse to cross once
const DAMPING = 0.16;        // per second while it is driven
const RELEASE = 0.34;        // per second once it is not

export function StringScene() {
  const box = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const driving = useRef(false);
  const plucks = useRef<number[]>([]);
  const { motion } = useStateStore();

  useEffect(() => {
    const b = box.current, c = canvas.current, ctx = c?.getContext("2d");
    if (!b || !c || !ctx) return;
    let w = 1, h = 1, dpr = 1, raf = 0, visible = false, last = performance.now(), t = 0;
    let y = new Float32Array(N + 1), prev = new Float32Array(N + 1), next = new Float32Array(N + 1);
    const pad = () => Math.max(26, w * 0.07);
    const step = (dt: number) => {
      const L = w - pad() * 2, dx = L / N, speed = L / TRANSIT;
      const sub = Math.max(1, Math.ceil(dt / ((0.9 * dx) / speed)));
      const k = dt / sub, r2 = ((speed * k) / dx) ** 2, damp = (driving.current ? DAMPING : RELEASE) * k;
      const omega = (HARMONIC * Math.PI * speed) / L;
      for (let s = 0; s < sub; s++) {
        t += k;
        for (let i = 1; i < N; i++) next[i] = (2 * y[i] - prev[i] * (1 - damp) + r2 * (y[i + 1] - 2 * y[i] + y[i - 1])) / (1 + damp);
        next[0] = driving.current ? Math.sin(omega * t) * Math.min(h * 0.06, 11) : next[0] * 0.9;
        next[N] = 0;
        const tmp = prev; prev = y; y = next; next = tmp;
      }
      for (const at of plucks.current.splice(0)) {
        const ci = Math.round(at * N);
        for (let i = 1; i < N; i++) { const d = (i - ci) / 5; const bump = Math.exp(-d * d) * h * 0.2; y[i] += bump; prev[i] += bump; }
      }
    };
    const draw = () => {
      const P = pad(), L = w - P * 2, mid = h / 2;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      const path = new Path2D();
      for (let i = 0; i <= N; i++) {
        const v = motion ? Math.max(-h * 0.44, Math.min(h * 0.44, y[i])) : Math.sin((HARMONIC * Math.PI * i) / N) * h * 0.2;
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
      for (const [x, col] of [[P, "94, 233, 255"], [P + L, "170, 150, 255"]] as const) {
        const g = ctx.createRadialGradient(x, mid, 0, x, mid, 26);
        g.addColorStop(0, `rgba(${col}, 0.9)`); g.addColorStop(0.25, `rgba(${col}, 0.35)`); g.addColorStop(1, `rgba(${col}, 0)`);
        ctx.fillStyle = g; ctx.fillRect(x - 26, mid - 26, 52, 52);
        ctx.fillStyle = "#f2feff"; ctx.beginPath(); ctx.arc(x, mid, 4.5, 0, Math.PI * 2); ctx.fill();
      }
      ctx.globalCompositeOperation = "source-over";
    };
    const resize = () => {
      const r = b.getBoundingClientRect(); w = Math.max(1, r.width); h = Math.max(1, r.height);
      dpr = Math.min(devicePixelRatio || 1, 2); c.width = Math.round(w * dpr); c.height = Math.round(h * dpr);
      draw();
    };
    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      step(dt); draw();
      raf = visible && !document.hidden ? requestAnimationFrame(loop) : 0;
    };
    const start = () => { if (!raf && motion && visible) { last = performance.now(); raf = requestAnimationFrame(loop); } };
    const ro = new ResizeObserver(resize); ro.observe(b);
    // Scrolled into view, it starts; scrolled away, it settles.
    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      driving.current = e.intersectionRatio >= 0.35;
      if (visible) start();
    }, { threshold: [0, 0.35, 0.6, 1] });
    io.observe(b);
    resize(); start();
    return () => { cancelAnimationFrame(raf); ro.disconnect(); io.disconnect(); };
  }, [motion]);

  const pluck = (e: PointerEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const P = Math.max(26, r.width * 0.07);
    plucks.current.push(Math.min(0.95, Math.max(0.05, (e.clientX - r.left - P) / (r.width - P * 2))));
  };
  return <div ref={box} className="tb-string" onPointerDown={motion ? pluck : undefined} aria-hidden="true" data-quiet><canvas ref={canvas} /></div>;
}
