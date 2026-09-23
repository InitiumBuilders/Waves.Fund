import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { useStateStore } from "../state";
import { Field as Engine, type Anchor, type Clear } from "./field";
import type { Stock as StockZone } from "./liquid";
import { hueFor, HUES, type FieldMode } from "./modes";
import "./mind.css";

let engine: Engine | null = null;

/** A ripple through the network from the centre of an element, or from a point. */
export function mindWave(target: Element | { x: number; y: number }, strength = 1) {
  if (!engine) return;
  if (target instanceof Element) {
    const r = target.getBoundingClientRect();
    engine.wave(r.left + r.width / 2, r.top + r.height / 2, strength);
  } else engine.wave(target.x, target.y, strength);
}
/** The travelling mark moves through the field as a small mass. */
export function mindMove(x: number, y: number, strength: number) { engine?.move(x, y, strength); }
/** Grows the Seed (0 to 1), used by the application form. */
export function mindGrow(value: number) {
  if (!engine) return;
  engine.grow = Math.max(0.04, Math.min(1, value));
  engine.invalidate();
}

/** True when the liquid can run: WebGL is up and motion is on. Otherwise callers use their fallback. */
export function liquidReady() { return !!engine && engine.motion; }
const zoneOf = (el: Element | null) => (el && engine ? engine.liquid.stocks.find(s => s.el === el) : undefined);
/** A ribbon of liquid pours into a stock from above, as in the Surge film. */
export function liquidPour(el: Element | null, fill = 0.5) {
  const s = zoneOf(el);
  if (!s || !engine) return false;
  const from = { x: s.left + s.width * (innerWidth > 900 ? 0.72 : 0.62), y: scrollY - 30 };
  engine.pour(s, from, fill);
  return true;
}
/** A drop falls into a stock or onto a surface from the vessel above it. */
export function liquidDrip(el: Element | null) {
  const s = zoneOf(el);
  if (!s || !engine) return false;
  s.fed = -99;
  return engine.feed(s);
}
/** Surge: energy erupts off the top of an element. */
export function liquidBurst(el: Element | null) {
  if (!el || !engine) return;
  const r = el.getBoundingClientRect();
  engine.burst(r.left + r.width / 2, r.top + scrollY + r.height * 0.42);
}

/** Where the network gathers on a page. The canvas never covers content; this only marks the place. */
export function MindAnchor({ name, className = "" }: { name: FieldMode; className?: string }) {
  return <div className={"mind-anchor " + className} data-mind={name} aria-hidden="true" />;
}
/** A stock: the vessel at the foot of a card. Liquid energy drips into it and its level is what the card holds. */
export function Stock({ level = 0.2, className = "" }: { level?: number; className?: string }) {
  return <div className={"stock " + className} data-stock="pool" data-level={level.toFixed(3)} style={{ "--level": level } as React.CSSProperties} aria-hidden="true" />;
}

const rectOf = (el: Element, name: FieldMode): Anchor => {
  const r = el.getBoundingClientRect();
  return { name, left: r.left, top: r.top + window.scrollY, width: r.width, height: r.height };
};

/* What the dots must frame and never cover: text, controls, media and cards. Decorative things, anchors and
   stocks are open. A block holding an anchor opens up and only its own contents are framed. */
const OPEN = ".mind-anchor, [data-window], [aria-hidden='true'], canvas, .stock, script, style, template, .sr-only";
const SOLID = "a, button, input, textarea, select, summary, label, img, video, svg, picture, figure, table, iframe, hr, h1, h2, h3, h4, h5, h6, p, li, dt, dd, blockquote";
type Box = { left: number; top: number; width: number; height: number };
function isSolid(el: Element) {
  if (el.matches(SOLID)) return true;
  for (const n of el.childNodes) if (n.nodeType === 3 && n.textContent!.trim()) return true;
  const cs = getComputedStyle(el);
  if (cs.backgroundImage !== "none") return true;
  const bg = cs.backgroundColor.match(/[\d.]+/g);
  if (bg && bg.length === 4 && +bg[3] > 0.04) return true;
  if (bg && bg.length === 3) return true;
  return parseFloat(cs.borderTopWidth) > 0 && parseFloat(cs.borderLeftWidth) > 0;
}
function collectContent(root: Element, sy: number, out: Box[]) {
  const vh = innerHeight;
  const walk = (el: Element) => {
    for (const child of el.children) {
      if (child.matches(OPEN)) continue;
      const r = child.getBoundingClientRect();
      if (r.width < 2 || r.height < 2) { if (child.children.length) walk(child); continue; }
      const open = child.querySelector(".mind-anchor, [data-window]");
      if (!open && r.height < vh * 1.4 && isSolid(child)) out.push({ left: r.left, top: r.top + sy, width: r.width, height: r.height });
      else walk(child);
    }
  };
  walk(root);
}
/** Neighbouring blocks in one column become one clearing, so a card or a paragraph run reads as one quiet place. */
function merge(list: Box[]) {
  const boxes = list.map(b => [b.left, b.top, b.left + b.width, b.top + b.height]);
  const out: number[][] = [];
  for (const b of boxes) {
    let m = b, changed = true;
    while (changed) {
      changed = false;
      for (let k = out.length - 1; k >= 0; k--) {
        const o = out[k], g = 22;
        if (m[0] - g < o[2] && m[2] + g > o[0] && m[1] - g < o[3] && m[3] + g > o[1]) {
          const u = [Math.min(m[0], o[0]), Math.min(m[1], o[1]), Math.max(m[2], o[2]), Math.max(m[3], o[3])];
          const area = (x: number[]) => (x[2] - x[0]) * (x[3] - x[1]);
          if (area(u) <= (area(m) + area(o)) * 1.45) { m = u; out.splice(k, 1); changed = true; }
        }
      }
    }
    out.push(m);
  }
  return out.map(([l, t, r, b]) => ({ left: l, top: t, width: r - l, height: b - t })).sort((a, b) => a.top - b.top);
}
/** Open space above a card, where dots can flow together into a bead and fall straight onto it. */
function openAbove(cardTop: number, cardLeft: number, cardRight: number, content: Box[]) {
  const w = cardRight - cardLeft;
  for (const f of [0.5, 0.32, 0.68, 0.18, 0.82]) {
    const x = cardLeft + w * f;
    let ceiling = 96;
    for (const b of content) if (b.left < x + 28 && b.left + b.width > x - 28 && b.top + b.height <= cardTop + 1) ceiling = Math.max(ceiling, b.top + b.height);
    const gap = cardTop - ceiling;
    if (gap >= 84) return { x, y: cardTop - Math.min(gap * 0.52, 150) };
  }
  return null;
}
/** Nothing stands in the column between two cards. */
function clearColumn(x0: number, x1: number, top: number, bottom: number, content: Box[]) {
  return !content.some(b => b.left < x1 && b.left + b.width > x0 && b.top < bottom - 1 && b.top + b.height > top + 1);
}

function measure() {
  if (!engine) return;
  const sy = scrollY;
  engine.sy = sy;
  const main = document.querySelector("main");
  const content: Box[] = [];
  if (main) collectContent(main, sy, content);
  const clears: Clear[] = merge(content).map(b => ({ ...b, fixed: false }));
  for (const sel of [".app-header", ".bottom-nav"]) {
    const el = document.querySelector(sel);
    const r = el?.getBoundingClientRect();
    if (r && r.height > 0 && r.width > 0) clears.push({ left: r.left, top: r.top, width: r.width, height: r.height, fixed: true });
  }
  engine.setClears(clears);

  const zones: StockZone[] = [];
  for (const el of document.querySelectorAll<HTMLElement>("main [data-stock]")) {
    const r = el.getBoundingClientRect();
    if (r.width < 8 || r.height < 2) continue;
    const kind = el.dataset.stock === "land" ? "land" : "pool";
    const card = kind === "land" ? el : el.closest<HTMLElement>("[data-stock-card]") ?? el.parentElement!;
    const c = card.getBoundingClientRect();
    const base = Math.max(0, Math.min(0.92, parseFloat(el.dataset.level ?? "0.2") || 0));
    const radius = Math.min(r.height / 2, parseFloat(getComputedStyle(el).borderTopLeftRadius) || 12);
    const zone: StockZone = {
      el, kind, top: r.top + sy, left: r.left, width: r.width, height: r.height, radius,
      cardTop: kind === "land" ? r.top + sy + r.height * 0.42 : c.top + sy, cardBottom: c.bottom + sy, cardLeft: c.left, cardRight: c.right,
      src: null, aboveEl: null, base, level: 0, target: base, vel: 0, slosh: 0, fed: -99, seen: false,
    };
    zones.push(zone);
  }
  zones.sort((a, b) => a.top - b.top);
  for (const z of zones) {
    // The vessel above: the nearest pool in line, with nothing but open space between its card and this one.
    const zoneTop = z.kind === "land" ? z.top : z.cardTop;
    for (let i = zones.indexOf(z) - 1; i >= 0; i--) {
      const a = zones[i];
      if (a.kind !== "pool" || a.top + a.height > zoneTop - 6) continue;
      const x0 = Math.max(a.left + 16, z.cardLeft + 26), x1 = Math.min(a.left + a.width - 16, z.cardRight - 26);
      if (x1 - x0 < 16) continue;
      if (clearColumn(x0, x1, a.cardBottom, zoneTop, content)) z.aboveEl = a.el;
      break;
    }
    if (z.kind === "pool") z.src = openAbove(z.cardTop, z.cardLeft, z.cardRight, content);
  }
  engine.setStocks(zones);
}

export function WaveMind() {
  const canvas = useRef<HTMLCanvasElement>(null);
  const liquid = useRef<HTMLCanvasElement>(null);
  const { motion } = useStateStore();
  const { pathname } = useLocation();
  const [failed, setFailed] = useState(false);
  const visited = useRef(new Set<string>());

  useEffect(() => {
    if (!canvas.current || !liquid.current) return;
    try {
      engine = new Engine(canvas.current, liquid.current, matchMedia("(max-width: 760px), (pointer: coarse)").matches);
      document.documentElement.dataset.mind = "on";
      if (import.meta.env.DEV) (window as unknown as { __mind: Engine }).__mind = engine;
    } catch (error) {
      if (import.meta.env.DEV) console.error("Wave Mind unavailable:", error);
      setFailed(true);
      document.documentElement.dataset.mind = "off";
      return;
    }
    // A drop reached a card or Surge: its rim answers with light.
    const lit = new Map<Element, ReturnType<typeof setTimeout>>();
    engine.liquid.onLand = s => {
      const el = s.kind === "land" ? s.el : s.el.closest("[data-stock-card]") ?? s.el.parentElement;
      if (!el) return;
      const old = lit.get(el);
      if (old) clearTimeout(old);
      el.classList.remove("stock-landed");
      void (el as HTMLElement).offsetWidth;
      el.classList.add("stock-landed");
      lit.set(el, setTimeout(() => el.classList.remove("stock-landed"), 1100));
    };
    const onResize = () => { if (engine) { engine.sy = scrollY; engine.resize(); } };
    const onPointer = (e: PointerEvent) => { if (e.pointerType === "mouse") engine?.point(e.clientX, e.clientY); };
    const onDown = (e: PointerEvent) => { if (e.pointerType !== "mouse") engine?.wave(e.clientX, e.clientY, 0.55); };
    const onLeave = () => engine?.point(0, 0, false);
    const onScroll = () => { if (engine) { engine.sy = scrollY; engine.invalidate(); } };
    // What you reach for colours the field around it.
    const onOver = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      const el = (e.target as Element).closest?.("a, button, summary, input, textarea, select");
      if (!el) { engine?.touchTint(0, 0, null); return; }
      const r = el.getBoundingClientRect();
      const key = (el.closest("[data-hue]") as HTMLElement | null)?.dataset.hue;
      engine?.touchTint(r.left + r.width / 2, r.top + r.height / 2, (key && HUES[key]) || [0.78, 0.96, 1.0]);
    };
    addEventListener("pointerover", onOver, { passive: true });
    const onVisible = () => { if (!document.hidden) engine?.wake(); };
    addEventListener("resize", onResize);
    addEventListener("pointermove", onPointer, { passive: true });
    addEventListener("pointerdown", onDown, { passive: true });
    document.documentElement.addEventListener("pointerleave", onLeave);
    addEventListener("scroll", onScroll, { passive: true });
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      removeEventListener("resize", onResize);
      removeEventListener("pointermove", onPointer);
      removeEventListener("pointerdown", onDown);
      document.documentElement.removeEventListener("pointerleave", onLeave);
      removeEventListener("scroll", onScroll);
      removeEventListener("pointerover", onOver);
      document.removeEventListener("visibilitychange", onVisible);
      lit.forEach(t => clearTimeout(t));
      engine?.destroy();
      engine = null;
    };
  }, []);

  useEffect(() => { engine?.setMotion(motion); }, [motion]);

  // Trust grows as the visitor moves through the site. Grow keeps its whale film in front, so the field steps back there.
  useEffect(() => {
    visited.current.add(pathname.split("/").slice(0, 3).join("/"));
    engine?.setHue(hueFor(pathname));
    if (engine) {
      engine.trust = Math.min(1, (visited.current.size - 1) / 6);
      engine.opacity = pathname.toLowerCase().startsWith("/grow") ? 0.34 : 1;
      engine.invalidate();
    }
  }, [pathname]);

  // Measure what the dots frame and where the stocks are, only when the layout changes.
  useEffect(() => {
    if (!engine) return;
    let frame = 0;
    const schedule = () => { cancelAnimationFrame(frame); frame = requestAnimationFrame(() => { measure(); if (engine) engine.docHeight = document.documentElement.scrollHeight; }); };
    schedule();
    const ro = new ResizeObserver(schedule);
    ro.observe(document.body);
    const main = document.querySelector("main");
    if (main) ro.observe(main);
    const mo = new MutationObserver(schedule);
    if (main) mo.observe(main, { childList: true, subtree: true, attributes: true, attributeFilter: ["data-level", "data-stock", "open", "hidden"] });
    addEventListener("resize", schedule);
    document.fonts?.ready.then(schedule);
    const late = setTimeout(schedule, 1200);
    // Pools in view sway and bubble; out of view they rest.
    const io = new IntersectionObserver(entries => {
      for (const e of entries) { const s = zoneOf(e.target); if (s) s.seen = e.isIntersecting; }
      engine?.wake();
    });
    const watch = setInterval(() => { for (const el of document.querySelectorAll("main [data-stock]")) io.observe(el); }, 1000);
    // Energy arrives at the cards in view: first as each one comes in, then now and then, one or two at a time.
    const tick = setInterval(() => {
      if (!engine || !engine.motion || document.hidden || engine.liquid.inFlight >= 2) return;
      const now = engine.now(), sy = scrollY, h = innerHeight;
      const ready = engine.liquid.stocks.filter(s => {
        const y = s.cardTop - sy;
        return y > h * 0.14 && y < h * 0.8 && (s.fed < 0 || now - s.fed > 7 + (s.top % 5));
      });
      // Cards not yet reached come first; a card with no way for energy to reach it is simply passed over.
      ready.sort((a, b) => (a.fed < 0 ? 0 : 1) - (b.fed < 0 ? 0 : 1) || Math.random() - 0.5);
      for (const s of ready) if (engine.feed(s)) break;
    }, 700);
    return () => { cancelAnimationFrame(frame); ro.disconnect(); mo.disconnect(); io.disconnect(); removeEventListener("resize", schedule); clearTimeout(late); clearInterval(watch); clearInterval(tick); };
  }, [pathname]);

  // Find this page's anchors and follow the one most in view.
  useEffect(() => {
    if (!engine) return;
    const seen = new Map<Element, { visible: number; anchor: Anchor }>();
    let current: Element | null = null, pending: ReturnType<typeof setTimeout> | null = null;
    const choose = () => {
      let best: Element | null = null, bestV = 0;
      for (const [el, s] of seen) if (s.visible > bestV) { bestV = s.visible; best = el; }
      if (!best) { if (!seen.size) { current = null; engine?.focus(null); } return; }
      if (best === current) { engine?.track(seen.get(best)!.anchor); return; }
      if (pending) clearTimeout(pending);
      const target = best;
      pending = setTimeout(() => { current = target; const s = seen.get(target); if (s) engine?.focus(s.anchor); }, current ? 180 : 0);
    };
    const io = new IntersectionObserver(entries => {
      for (const e of entries) {
        const name = (e.target as HTMLElement).dataset.mind as FieldMode;
        const r = e.boundingClientRect;
        seen.set(e.target, { visible: e.isIntersecting ? e.intersectionRect.height : 0, anchor: { name, left: r.left, top: r.top + window.scrollY, width: r.width, height: r.height } });
      }
      choose();
    }, { threshold: Array.from({ length: 11 }, (_, i) => i / 10) });
    const ro = new ResizeObserver(entries => {
      for (const e of entries) { const s = seen.get(e.target); if (s) s.anchor = rectOf(e.target, s.anchor.name); }
      if (current) { const s = seen.get(current); if (s) engine?.track(s.anchor); }
    });
    const scan = () => {
      const found = [...document.querySelectorAll<HTMLElement>("main [data-mind]")];
      for (const el of found) {
        const name = el.dataset.mind as FieldMode, s = seen.get(el);
        if (!s) { seen.set(el, { visible: 0, anchor: rectOf(el, name) }); io.observe(el); ro.observe(el); }
        // React can keep the same element across routes and only change its mode.
        else if (s.anchor.name !== name) { s.anchor = rectOf(el, name); if (current === el) engine?.focus(s.anchor); }
      }
      for (const el of [...seen.keys()]) if (!el.isConnected) { seen.delete(el); io.unobserve(el); ro.unobserve(el); }
      if (!found.length) { current = null; engine?.focus(null); }
    };
    scan();
    const main = document.querySelector("main");
    let t: ReturnType<typeof setTimeout> | null = null;
    const mo = new MutationObserver(() => { if (t) clearTimeout(t); t = setTimeout(scan, 120); });
    if (main) mo.observe(main, { childList: true, subtree: true, attributes: true, attributeFilter: ["data-mind"] });
    return () => { io.disconnect(); ro.disconnect(); mo.disconnect(); if (t) clearTimeout(t); if (pending) clearTimeout(pending); };
  }, [pathname]);

  return failed
    ? <div className="mind-fallback" aria-hidden="true"><img src="/media/neural-still.webp" alt="" /></div>
    : <>
        <canvas ref={canvas} className="mind-canvas" aria-hidden="true" />
        <canvas ref={liquid} className="mind-liquid" aria-hidden="true" />
      </>;
}
