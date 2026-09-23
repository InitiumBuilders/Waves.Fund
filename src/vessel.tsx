import { useEffect, useRef } from "react";

/* The Motus Trax vessel, ported from motus.love (DuoZone src/components/TraxKit.jsx).
   Every stat is a stock: a tank of dark ferrofluid filled toward its next Motus milestone
   (11, 111, 1111). The liquid is one height field with Rosensweig spikes, a drifting body
   under the surface and a drop that leaps and falls home. It sleeps off screen and when hidden. */

export const milestone = (v: number) => {
  let m = 11;
  while ((v || 0) >= m) m = m * 10 + 1;
  return m;
};

const HUES = {
  cy: "94, 233, 255",
  bl: "110, 170, 255",
  vi: "169, 155, 255",
} as const;
type Hue = keyof typeof HUES;

function Ferro({ level, hue, still }: { level: number; hue: Hue; still: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const lv = useRef(level);
  lv.current = level;

  useEffect(() => {
    const cv = ref.current;
    const ctx = cv?.getContext("2d");
    if (!cv || !ctx) return;
    const rim = HUES[hue];
    const mobile = matchMedia("(max-width: 780px)").matches;
    const STEP = mobile ? 5 : 3, AIR = 30;
    let W = 0, Ht = 0, cols = 0;
    let h = new Float32Array(0), hv = new Float32Array(0);
    const size = () => {
      const r = cv.getBoundingClientRect(), dpr = Math.min(2, devicePixelRatio || 1);
      W = Math.max(60, Math.round(r.width)); Ht = Math.max(60, Math.round(r.height));
      cv.width = Math.round(W * dpr); cv.height = Math.round(Ht * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      cols = Math.max(12, Math.ceil(W / STEP) + 1);
      h = new Float32Array(cols).fill(AIR + (1 - Math.max(0.22, lv.current)) * (Ht - AIR));
      hv = new Float32Array(cols);
    };
    size();
    const count = mobile ? 4 : 6;
    const bubbles = Array.from({ length: count }, (_, i) => ({ x: (0.14 + 0.72 * ((i + 0.5) / count)) * W, r: 8 + (i % 3) * 4, ph: i * 1.9, vx: (i % 2 ? 1 : -1) * (7 + i * 2) }));
    let drop: { x: number; y: number; vy: number; r: number } | null = null;
    let nextDrop = 1.2, raf = 0, last = performance.now(), seen = true, t = 0, frame = 0;
    const spikeAt = (x: number) => {
      const p5 = (v: number) => { const c = v > 0 ? v : 0, q = c * c; return q * q * c; };
      const env = 0.6 + 0.4 * Math.sin(x * 0.019 + t * 0.36);
      return (p5(Math.sin(x * 0.098 - t * 0.95)) * 17 + p5(Math.sin(x * 0.061 + t * 0.6)) * 11 + p5(Math.sin(x * 0.168 - t * 1.45)) * 7) * env;
    };
    const surf = (i: number) => h[i] - spikeAt(i * STEP);
    const trace = () => {
      ctx.moveTo(0, surf(0));
      for (let i = 1; i < cols; i++) {
        const x0 = (i - 1) * STEP, x1 = i * STEP;
        ctx.quadraticCurveTo(x0, surf(i - 1), (x0 + x1) / 2, (surf(i - 1) + surf(i)) / 2);
      }
      ctx.lineTo(W, surf(cols - 1));
    };
    const paint = () => {
      ctx.clearRect(0, 0, W, Ht);
      ctx.beginPath(); ctx.moveTo(0, Ht); ctx.lineTo(0, surf(0)); trace(); ctx.lineTo(W, Ht); ctx.closePath();
      let top = surf(0);
      for (let i = 1; i < cols; i++) top = Math.min(top, surf(i));
      const g = ctx.createLinearGradient(0, Math.max(0, top - 6), 0, Ht);
      // Light gathers just under the meniscus and falls away fast: that gradient is the depth.
      g.addColorStop(0, "#2d5fc4"); g.addColorStop(0.07, "#173a86"); g.addColorStop(0.3, "#0a1c4a"); g.addColorStop(1, "#020714");
      ctx.fillStyle = g; ctx.fill();
      ctx.save();
      ctx.strokeStyle = `rgba(${rim},0.95)`; ctx.lineWidth = 1.6; ctx.shadowColor = `rgba(${rim},0.9)`; ctx.shadowBlur = 12;
      ctx.beginPath(); trace(); ctx.stroke(); ctx.restore();
      if (drop && drop.r > 0.6) {
        ctx.save(); ctx.shadowColor = `rgba(${rim},0.85)`; ctx.shadowBlur = 9;
        const dg = ctx.createRadialGradient(drop.x - drop.r * 0.35, drop.y - drop.r * 0.4, drop.r * 0.1, drop.x, drop.y, drop.r);
        dg.addColorStop(0, "#1f4aa0"); dg.addColorStop(0.7, "#0a1c4a"); dg.addColorStop(1, "#020714");
        ctx.fillStyle = dg; ctx.beginPath();
        ctx.ellipse(drop.x, drop.y, drop.r, drop.r * Math.min(1.9, 1 + Math.abs(drop.vy) / 190), 0, 0, 7); ctx.fill(); ctx.restore();
      }
    };
    const io = new IntersectionObserver(es => { seen = es[0].isIntersecting; if (seen && !raf && !document.hidden && !still) { last = performance.now(); raf = requestAnimationFrame(step); } }, { threshold: 0.04 });
    const wake = () => { last = performance.now(); if (seen && !raf && !document.hidden && !still) raf = requestAnimationFrame(step); };
    const step = (now: number) => {
      if (!seen || document.hidden) { raf = 0; last = now; return; }
      raf = requestAnimationFrame(step);
      frame += 1;
      if (mobile && frame % 2) return;
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now; t += dt;
      const rest = AIR + (1 - Math.max(0.22, Math.min(1, lv.current))) * (Ht - AIR);
      for (const b of bubbles) { b.ph += dt; b.x += b.vx * dt; if (b.x < 14) { b.x = 14; b.vx = Math.abs(b.vx); } if (b.x > W - 14) { b.x = W - 14; b.vx = -Math.abs(b.vx); } }
      nextDrop -= dt;
      if (!drop && nextDrop <= 0) {
        drop = { x: W * (0.18 + 0.64 * ((Math.sin(t * 2.7) + 1) / 2)), y: rest - 2, vy: -(60 + 28 * ((Math.sin(t * 1.9) + 1) / 2)), r: 4.2 };
        nextDrop = 2.4 + 2.4 * ((Math.cos(t * 1.3) + 1) / 2);
      }
      if (drop) {
        drop.vy += 190 * dt; drop.y += drop.vy * dt;
        const ci = Math.max(0, Math.min(cols - 1, Math.round(drop.x / STEP)));
        if (drop.vy > 0 && drop.y + drop.r >= surf(ci)) {
          for (let i = 0; i < cols; i++) { const d = Math.abs(i * STEP - drop.x); if (d < 46) hv[i] += (1 - d / 46) * 200; }
          drop = null;
        } else if (drop.y > Ht + 20) drop = null;
      }
      for (let i = 0; i < cols; i++) {
        const x = i * STEP;
        let lift = 0;
        for (const b of bubbles) { const d = (x - b.x) / (b.r * 1.9); lift += b.r * 0.9 * (0.72 + 0.28 * Math.sin(b.ph * 1.35)) * Math.exp(-d * d); }
        if (drop) { const gap = Math.max(1, surf(i) - drop.y), dx = (x - drop.x) / 9; lift += 24 * Math.exp(-dx * dx) * Math.exp(-gap / 26); }
        hv[i] += (rest - lift - h[i]) * 26 * dt;
        hv[i] *= 1 - Math.min(1, dt * 3.4);
        h[i] += hv[i] * dt;
      }
      const prev = h.slice();
      for (let i = 1; i < cols - 1; i++) h[i] += ((prev[i - 1] + prev[i + 1]) * 0.5 - prev[i]) * 0.16;
      h[0] = h[1]; h[cols - 1] = h[cols - 2];
      paint();
    };
    io.observe(cv);
    document.addEventListener("visibilitychange", wake);
    addEventListener("resize", size);
    if (still) paint(); else raf = requestAnimationFrame(step);
    return () => { cancelAnimationFrame(raf); io.disconnect(); document.removeEventListener("visibilitychange", wake); removeEventListener("resize", size); };
  }, [hue, still]);

  return <canvas ref={ref} className="vessel-ferro" aria-hidden="true" />;
}

/** One stock, drawn: the count, and a tank filling toward the next Motus milestone. */
export function Vessel({ label, value, hue = "cy", still = false }: { label: string; value: number | null; hue?: Hue; still?: boolean }) {
  const v = value ?? 0, goal = milestone(v);
  const level = Math.max(0.055, Math.min(1, v / goal));
  return (
    <article className={"vessel vessel-" + hue}>
      <div className="vessel-reading"><strong>{value === null ? "—" : v.toLocaleString()}</strong><span>{label}</span></div>
      <div className="vessel-glass">
        <Ferro level={level} hue={hue} still={still} />
        <span className="vessel-ticks" aria-hidden="true" />
      </div>
      <p className="vessel-goal">Filling toward <b>{goal.toLocaleString()}</b></p>
    </article>
  );
}
