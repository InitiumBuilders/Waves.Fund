import { useEffect, useRef } from "react";
import type { ReactNode } from "react";
import { BEAT, clock, still } from "./cadence";
import { sound } from "./sound";
import "./circuit.css";

/* The circuit. Energy flows from one card to the next along a trace, the way current runs along a printed
   circuit: out of the foot of a card at its centre, across, and into the top of the next (two rounded corners
   when the cards are offset; side to side when they sit in a row). A trace is a hairline until the next card
   arrives. Then, on the next beat, one pulse leaves the lit card, travels the trace in whole beats and lands:
   the pad lights, the card's rim lights once, and the trace stays live. One light moves at a time, and it
   always moves forward; a card reached before its pulse has landed waits its turn. Nothing drips, splashes or
   weaves. Motion off: cards light as they are reached and traces go live between lit cards, with no pulse.

   Usage: <Circuit><ol className="cascade">…</ol></Circuit>. The cards are the children of the one list inside. */

const NS = "http://www.w3.org/2000/svg";
type Rect = { left: number; top: number; right: number; bottom: number; cx: number; cy: number };
type Trace = { d: string; len: number; path: SVGPathElement; live: SVGPathElement; from: SVGCircleElement; to: SVGCircleElement };

// Out of one card, into the next, with two rounded corners where the cards are offset.
function route(a: Rect, b: Rect): { d: string; from: [number, number]; to: [number, number] } {
  if (b.top >= a.bottom - 1) {
    const x0 = a.cx, x1 = b.cx, y0 = a.bottom, y1 = b.top, ym = (y0 + y1) / 2;
    if (Math.abs(x1 - x0) < 2) return { d: `M${x0} ${y0} L${x0} ${y1}`, from: [x0, y0], to: [x0, y1] };
    const r = Math.max(0, Math.min(16, Math.abs(x1 - x0) / 2, (y1 - y0) / 2 - 1)), s = Math.sign(x1 - x0);
    return { d: `M${x0} ${y0} L${x0} ${ym - r} Q${x0} ${ym} ${x0 + s * r} ${ym} L${x1 - s * r} ${ym} Q${x1} ${ym} ${x1} ${ym + r} L${x1} ${y1}`, from: [x0, y0], to: [x1, y1] };
  }
  const y0 = a.cy, y1 = b.cy, x0 = a.right, x1 = b.left, xm = (x0 + x1) / 2;
  if (Math.abs(y1 - y0) < 2) return { d: `M${x0} ${y0} L${x1} ${y0}`, from: [x0, y0], to: [x1, y0] };
  const r = Math.max(0, Math.min(16, Math.abs(y1 - y0) / 2, (x1 - x0) / 2 - 1)), s = Math.sign(y1 - y0);
  return { d: `M${x0} ${y0} L${xm - r} ${y0} Q${xm} ${y0} ${xm} ${y0 + s * r} L${xm} ${y1 - s * r} Q${xm} ${y1} ${xm + r} ${y1} L${x1} ${y1}`, from: [x0, y0], to: [x1, y1] };
}

export function Circuit({ children, className = "" }: { children: ReactNode; className?: string }) {
  const host = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = host.current;
    const list = root?.firstElementChild;
    if (!root || !list) return;
    const cards = [...list.children].filter((el): el is HTMLElement => el instanceof HTMLElement);
    if (cards.length < 2) return;

    const svg = document.createElementNS(NS, "svg");
    svg.setAttribute("class", "circuit-layer");
    svg.setAttribute("aria-hidden", "true");
    svg.setAttribute("preserveAspectRatio", "none");
    root.appendChild(svg);
    const el = <K extends keyof SVGElementTagNameMap>(tag: K, cls: string) => { const e = document.createElementNS(NS, tag); e.setAttribute("class", cls); svg.appendChild(e); return e; };
    const traces: Trace[] = cards.slice(1).map(() => ({ d: "", len: 0, path: el("path", "trace"), live: el("path", "trace-live"), from: el("circle", "pad"), to: el("circle", "pad") }));
    for (const t of traces) { t.from.setAttribute("r", "3.5"); t.to.setAttribute("r", "3.5"); }

    const lit = cards.map(() => false), sent = traces.map(() => false), pending = new Set<number>();
    const timers = new Set<number>(), pulses = new Set<Animation>();

    // Positions are read with the scroll-driven arrivals switched off, so a card mid-rise does not bend its trace.
    const measure = () => {
      document.documentElement.classList.add("mind-measuring");
      const R = root.getBoundingClientRect();
      const rects: Rect[] = cards.map((c) => { const r = c.getBoundingClientRect(); return { left: r.left - R.left, top: r.top - R.top, right: r.right - R.left, bottom: r.bottom - R.top, cx: (r.left + r.right) / 2 - R.left, cy: (r.top + r.bottom) / 2 - R.top }; });
      document.documentElement.classList.remove("mind-measuring");
      svg.setAttribute("viewBox", `0 0 ${Math.max(1, R.width)} ${Math.max(1, R.height)}`);
      traces.forEach((t, i) => {
        const { d, from, to } = route(rects[i], rects[i + 1]);
        t.d = d; t.path.setAttribute("d", d); t.live.setAttribute("d", d);
        t.from.setAttribute("cx", String(from[0])); t.from.setAttribute("cy", String(from[1]));
        t.to.setAttribute("cx", String(to[0])); t.to.setAttribute("cy", String(to[1]));
        t.len = t.path.getTotalLength();
      });
    };

    const lightCard = (k: number, fed: boolean) => {
      if (lit[k]) return;
      lit[k] = true;
      cards[k].classList.add("is-lit");
      if (fed) { cards[k].classList.add("is-fed"); timers.add(window.setTimeout(() => cards[k].classList.remove("is-fed"), 1300)); sound("land", k); }
      if (k < traces.length) traces[k].from.classList.add("is-lit");
      if (k > 0) { traces[k - 1].to.classList.add("is-lit"); traces[k - 1].live.classList.add("is-live"); }
      if (pending.has(k)) { pending.delete(k); send(k); }
    };
    // One pulse down the trace from card i into card i + 1, starting on the next beat and lasting whole beats.
    const send = (i: number) => {
      if (sent[i]) return;
      if (!lit[i]) { pending.add(i); return; }
      sent[i] = true;
      const t = traces[i];
      if (still() || typeof HTMLElement.prototype.animate !== "function") { lightCard(i + 1, false); return; }
      const fire = () => {
        if (document.hidden) { lightCard(i + 1, false); return; }
        const p = document.createElement("span");
        p.className = "circuit-pulse";
        p.style.setProperty("offset-path", `path('${t.d}')`);
        root.appendChild(p);
        const beats = Math.max(1, Math.round(t.len / 300));
        const a = p.animate([{ offsetDistance: "0%" }, { offsetDistance: "100%" }], { duration: beats * BEAT * 1000, easing: "cubic-bezier(0.45, 0, 0.2, 1)", fill: "forwards" });
        pulses.add(a);
        a.onfinish = () => { pulses.delete(a); p.remove(); lightCard(i + 1, true); };
        a.oncancel = () => { pulses.delete(a); p.remove(); };
      };
      timers.add(window.setTimeout(fire, (BEAT - (clock() % BEAT)) * 1000));
    };
    // A card has come into view. Everything behind the reader is already lit; a pulse in flight finishes on its own.
    const reach = (k: number) => {
      if (lit[k]) return;
      for (let j = 0; j < k; j++) if (!lit[j] && !(j > 0 && sent[j - 1])) { if (j > 0) sent[j - 1] = true; lightCard(j, false); }
      if (k === 0) lightCard(0, false); else send(k - 1);
    };

    measure();
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) if (e.isIntersecting) { reach(cards.indexOf(e.target as HTMLElement)); io.unobserve(e.target); }
    }, { threshold: 0.4, rootMargin: "0px 0px -10% 0px" });
    cards.forEach((c) => io.observe(c));
    let raf = 0;
    const ro = new ResizeObserver(() => { cancelAnimationFrame(raf); raf = requestAnimationFrame(measure); });
    ro.observe(root);
    const later = window.setTimeout(measure, 1200);
    return () => {
      io.disconnect(); ro.disconnect(); cancelAnimationFrame(raf); clearTimeout(later);
      timers.forEach((t) => clearTimeout(t)); pulses.forEach((a) => a.cancel());
      svg.remove();
      for (const c of cards) c.classList.remove("is-lit", "is-fed");
    };
  }, []);

  return <div ref={host} className={`circuit ${className}`}>{children}</div>;
}
