import { useEffect, useRef } from "react";
import type { MutableRefObject } from "react";
import { BEAT } from "../cadence";
import { Ripple, ease, hash, mix } from "./ripple";
import type { RippleHandle, RippleModel, Source } from "./ripple";

/* The Give page's first scene, in three chapters that follow the scroll:
   1. Find Your People. You are one light sending out ripples. Around you, other people are faint lights,
      each with their own ripples, not yet in step with yours.
   2. Give Together. One of them comes near and falls into step. Where your crests meet, the water rises
      twice as high: bright bands of reinforcement appear between you.
   3. Build a Wave. Everyone lines up in step, and the separate ripples merge into one straight wavefront that
      moves forward, away from the words. While people are still finding their place in the line, the water
      is quieter, so the move reads as people gathering, not as noise. */

const PEOPLE = Array.from({ length: 7 }, (_, i) => ({ angle: i * 0.9 + hash(`a${i}`) * 0.6 - 0.9, dist: 0.3 + hash(`d${i}`) * 0.14, phase: hash(`p${i}`) * Math.PI * 2 }));
const SLOTS = 11;
// Where each light stands in the line at the end: you in the middle, your Give Guide beside you, the rest outward.
const LINE = { you: 5, people: [6, 4, 7, 3, 8, 2, 9], newcomers: [1, 10, 0] };

function tankModel(progress: MutableRefObject<number>): RippleModel {
  // Each source's waves start fresh when it first appears, so new people arrive as a growing ring.
  const born = new Map<number, number>();
  const bornAt = (i: number, a: number, t: number) => {
    if (a > 0.03) { if (!born.has(i)) born.set(i, t); } else born.delete(i);
    return born.get(i) ?? t;
  };
  return (t, w, h) => {
    const p = progress.current;
    const wide = w > h * 1.15;
    const R = Math.min(w, h);
    const lambda = Math.max(44, Math.min(120, R * 0.16));
    const c2 = ease((p - 0.75) / 0.9), c3 = ease((p - 1.75) / 0.9);
    const cx = wide ? w * 0.68 : w * 0.5, cy = wide ? h * 0.5 : h * 0.46;
    const sep = lambda * (wide ? 1.75 : 2.1);
    // Where the line of people stands in the last chapter.
    const slot = (k: number) => wide
      ? { x: w * 0.54, y: h * (0.1 + 0.8 * (k + 0.5) / SLOTS) }
      : { x: w * (0.04 + 0.92 * (k + 0.5) / SLOTS), y: h * 0.56 };
    const out: Source[] = [];
    // You.
    const you0 = { x: cx, y: cy }, you1 = { x: cx - sep, y: cy }, youS = slot(LINE.you);
    const youP = c3 > 0 ? { x: mix(you1.x, youS.x, c3), y: mix(you1.y, youS.y, c3) } : { x: mix(you0.x, you1.x, c2), y: mix(you0.y, you1.y, c2) };
    out.push({ ...youP, a: 1, phase: 0, hue: 0.05, size: 4.2, born: bornAt(0, 1, t) });
    // Your people, and the one who becomes your Give Guide.
    PEOPLE.forEach((q, i) => {
      const home = {
        x: Math.min(w - 26, Math.max(26, cx + Math.cos(q.angle) * R * q.dist * (wide ? 1.5 : 1.15))),
        y: Math.min(h - 26, Math.max(26, cy + Math.sin(q.angle) * R * q.dist * (wide ? 1.1 : 1.25))),
      };
      const s = slot(LINE.people[i]);
      let x = home.x, y = home.y, a = 0.2, phase = q.phase;
      if (i === 0) {
        const near = { x: cx + sep, y: cy };
        x = mix(home.x, near.x, c2); y = mix(home.y, near.y, c2);
        a = mix(0.2, 1, c2);
        phase = mix(q.phase, 0, ease((p - 1.0) / 0.6));
        if (c3 > 0) { x = mix(near.x, s.x, c3); y = mix(near.y, s.y, c3); }
      } else {
        a = mix(mix(0.2, 0.08, c2), 0.85, c3);
        phase = mix(q.phase, 0, c3);
        x = mix(home.x, s.x, c3); y = mix(home.y, s.y, c3);
      }
      // Until they are in step with you, their ripples stay close to them.
      const reach = i === 0 ? mix(0.14, 0.62, c2) : mix(0.13, 0.62, c3);
      out.push({ x, y, a, phase, hue: 0.35 + i * 0.08, size: 2.6 + a * 1.4, born: bornAt(1 + i, a, t), reach });
    });
    // Newcomers who join the line only at the end.
    LINE.newcomers.forEach((k, j) => {
      const a = ease((c3 - 0.35 - j * 0.12) / 0.5) * 0.85;
      if (a <= 0.01) { born.delete(20 + j); return; }
      out.push({ ...slot(k), a, phase: 0, hue: 0.6, size: 3.2, born: bornAt(20 + j, a, t) });
    });
    // Quieter while the line forms; once it has formed, the wave moves forward (right on a wide screen, up on a phone).
    const moving = c3 > 0 && c3 < 1 ? Math.sin(Math.PI * c3) : 0;
    // Each moving light keeps its ripples close, so the move reads as people walking into place.
    for (const s of out) { s.a *= 1 - 0.5 * moving; s.reach = (s.reach ?? 0.62) * (1 - 0.8 * moving); }
    const line = slot(LINE.you);
    const front: [number, number, number, number] = [line.x, line.y, wide ? 0 : -Math.PI / 2, ease((c3 - 0.55) / 0.45)];
    return { sources: out, lambda, speed: lambda / BEAT, gain: 1.15, dots: wide ? 15 : 13, ground: 0.94, front };
  };
}

/** The scene alone; the words around it live in the page so they paint before this loads. */
export function TankScene({ progress, handle }: { progress: MutableRefObject<number>; handle: MutableRefObject<RippleHandle | null> }) {
  const model = useRef<RippleModel>(tankModel(progress));
  return <Ripple model={model} handle={handle} tappable className="gt-tank-scene" maxDpr={1.25} still={7.5} aria-hidden="true" />;
}

/* Two people meeting. As the section is scrolled into view, the second light arrives and falls into step
   with the first, and the bands between them brighten. Scrolling back reverses it. No controls or labels. */
export function PairScene() {
  const wrap = useRef<HTMLDivElement>(null);
  const progress = useRef(0);
  const handle = useRef<RippleHandle | null>(null);
  useEffect(() => {
    const onScroll = () => {
      const el = wrap.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      progress.current = Math.min(1, Math.max(0, (innerHeight - r.top) / (innerHeight * 0.5 + r.height * 0.5)));
      handle.current?.redraw();
    };
    onScroll();
    addEventListener("scroll", onScroll, { passive: true });
    addEventListener("resize", onScroll);
    return () => { removeEventListener("scroll", onScroll); removeEventListener("resize", onScroll); };
  }, []);
  const model = useRef<RippleModel>((_t, w, h) => {
    const wide = w > h;
    const lambda = Math.max(44, Math.min(110, Math.min(w, h) * 0.2));
    const sep = lambda * 1.5;
    const cx = w / 2, cy = h / 2;
    const [a, b] = wide ? [{ x: cx - sep, y: cy }, { x: cx + sep, y: cy }] : [{ x: cx, y: cy - sep }, { x: cx, y: cy + sep }];
    const lock = ease((progress.current - 0.2) / 0.65);
    return {
      lambda, speed: lambda / BEAT, gain: 1.15, dots: 13, ground: 0.9,
      sources: [
        { ...a, a: 1, phase: 0, hue: 0.05, size: 4, born: -100 },
        { ...b, a: mix(0.35, 1, lock), phase: mix(Math.PI, 0, lock), hue: 0.7, size: mix(3, 4, lock), born: -100, reach: mix(0.3, 0.62, lock) },
      ],
    };
  });
  return <div ref={wrap} className="gt-study"><Ripple model={model} handle={handle} tappable className="gt-study-scene" maxDpr={1.25} still={4} aria-hidden="true" /></div>;
}
