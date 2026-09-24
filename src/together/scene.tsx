import { useEffect, useRef } from "react";
import type { PointerEvent } from "react";
import { Ripple, ease, hash, mix } from "./ripple";
import type { RippleHandle, RippleModel, Source } from "./ripple";

/* The Give Together scene, drawn with the same wave physics as the Give page.
   You are a light sending out ripples. Your Give Guides ripple in step with you, so bright bands of
   reinforcement run between you. People who share something with you are distant lights whose ripples stay
   close to them, not yet in step. Choose one and their ripples reach toward yours and fall into step: a
   preview of giving together. Someone who invited you glows violet.

   "field" draws real people only (the page passes them in). "moment" plays one connection: two lights, the
   second falling into step, then a ring of light spreading from where they meet. */

export type SceneNode = { key: string; state: "candidate" | "invited" | "incoming" | "guide"; weight: number };
type Placed = { key: string; x: number; y: number };

const TARGET: Record<SceneNode["state"], { a: number; reach: number; lock: number; hue: number; size: number }> = {
  guide: { a: 0.92, reach: 0.62, lock: 1, hue: 0.22, size: 3.8 },
  invited: { a: 0.42, reach: 0.34, lock: 0.7, hue: 0.4, size: 3.2 },
  incoming: { a: 0.4, reach: 0.26, lock: 0, hue: 0.9, size: 3.4 },
  candidate: { a: 0.2, reach: 0.13, lock: 0, hue: 0.55, size: 2.6 },
};

export function GiveScene({ variant, nodes = [], selected = null, onSelect, className = "", paused = false }: {
  variant: "field" | "moment"; nodes?: SceneNode[]; selected?: string | null; onSelect?: (key: string) => void; className?: string; paused?: boolean;
}) {
  const live = useRef({ nodes, selected });
  live.current = { nodes, selected };
  const placed = useRef<Placed[]>([]);
  const handle = useRef<RippleHandle | null>(null);
  const model = useRef<RippleModel>(variant === "moment" ? momentModel() : fieldModel(live, placed));
  useEffect(() => { handle.current?.redraw(); }, [nodes, selected, paused]);

  const pick = (e: PointerEvent<HTMLDivElement>) => {
    if (!onSelect) return;
    const r = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - r.left, y = e.clientY - r.top;
    let best: Placed | null = null, bestD = 36;
    for (const p of placed.current) { const d = Math.hypot(p.x - x, p.y - y); if (d < bestD) { best = p; bestD = d; } }
    if (best) onSelect(best.key);
  };
  if (paused) return <div className={`ripple gt-scene gt-scene-${variant} ${className}`} aria-hidden="true" />;
  return <Ripple model={model} handle={handle} className={`gt-scene gt-scene-${variant} ${className}`} onPointerDown={onSelect ? pick : undefined} maxDpr={1.25} still={5} aria-hidden="true" />;
}

function fieldModel(live: { current: { nodes: SceneNode[]; selected: string | null } }, placed: { current: Placed[] }): RippleModel {
  // Each person eases toward their state, so a choice or a new connection changes the water gently.
  const now = new Map<string, { a: number; reach: number; lock: number; hue: number; size: number }>();
  let last = 0;
  return (t, w, h) => {
    const dt = Math.min(0.1, Math.max(0, t - last)); last = t;
    const k = 1 - Math.exp(-dt * 2.4);
    const R = Math.min(w, h), stretch = w > h ? Math.min(w / h, 1.8) : 1;
    const lambda = Math.max(40, Math.min(110, R * 0.15));
    const you = { x: w / 2, y: h / 2 };
    const { nodes, selected } = live.current;
    const sources: Source[] = [{ ...you, a: 1, phase: 0, hue: 0.05, size: 4.6, born: -100, reach: 0.62 }];
    const spots: Placed[] = [];
    nodes.slice(0, 11).forEach((n, i) => {
      const seed = hash(n.key);
      const angle = i * 2.39996 + seed * 0.9 - 1.2;
      const dist = R * (0.2 + 0.26 * (1 - Math.min(1, Math.max(0, n.weight))));
      let x = Math.min(w - 24, Math.max(24, you.x + Math.cos(angle) * dist * stretch));
      let y = Math.min(h - 24, Math.max(24, you.y + Math.sin(angle) * dist));
      // A slow drift so the lights feel alive; the hit test uses the same positions.
      x += Math.sin(t * 0.21 + seed * 40) * 3.5; y += Math.cos(t * 0.17 + seed * 30) * 3;
      const want = { ...TARGET[n.state] };
      if (n.key === selected && n.state === "candidate") { want.a = 0.62; want.reach = 0.5; want.lock = 1; }
      const cur = now.get(n.key) ?? { ...want, a: 0 };
      for (const key of Object.keys(want) as (keyof typeof want)[]) cur[key] = mix(cur[key], want[key], k);
      now.set(n.key, cur);
      const free = seed * Math.PI * 2 + t * 0.35 * (1 - cur.lock);
      sources.push({ x, y, a: cur.a, phase: mix(free % (Math.PI * 2), 0, ease(cur.lock)), hue: cur.hue, size: cur.size, born: -100, reach: cur.reach });
      spots.push({ key: n.key, x, y });
    });
    placed.current = spots;
    const chosen = spots.find((s) => s.key === selected);
    return { sources, lambda, speed: lambda * 0.7, gain: 1.1, dots: 14, ground: 0.86, select: chosen ? [chosen.x, chosen.y, 1] : undefined };
  };
}

function momentModel(): RippleModel {
  return (t, w, h) => {
    const wide = w > h;
    const R = Math.min(w, h);
    const lambda = Math.max(44, Math.min(120, R * 0.16));
    const gap = lambda * (wide ? 2.2 : 1.8);
    const cy = wide ? h * 0.4 : h * 0.3;
    const a = { x: w / 2 - gap, y: cy }, b = { x: w / 2 + gap, y: cy };
    // Your Give Guide falls into step over the first two seconds, then a ring spreads from where you meet.
    const lock = ease(t / 2);
    const ringP = (t - 1.6) / 2.8;
    return {
      lambda, speed: lambda * 0.7, gain: 1.2, dots: 15, ground: 0.95,
      sources: [
        { ...a, a: 1, phase: 0, hue: 0.05, size: 4.8, born: -100, reach: 0.62 },
        { ...b, a: mix(0.5, 1, lock), phase: mix(Math.PI, 0, lock), hue: 0.3, size: 4.8, born: 0, reach: mix(0.3, 0.62, lock) },
      ],
      ring: ringP >= 0 && ringP <= 1 ? [w / 2, cy, ringP] : undefined,
    };
  };
}
