import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { useStateStore } from "../state";
import { Field as Engine, type Anchor, type Clear, type Topology } from "./field";
import { pathOf, rounded, type Guide, type Vessel } from "./energy";
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
/** A network organises itself in the open space around an element. */
export function mindEmerge(el: Element | null, topology: Topology = "web") {
  if (!engine || !el) return false;
  const r = el.getBoundingClientRect();
  const region = engine.openRegion({ x: r.left - 40, y: r.top - 40, w: r.width + 80, h: r.height + 80 });
  return region ? engine.emerge(region, topology) : false;
}
/** Energy runs through every guide that ends in this vessel. */
export function energyFlow(vessel: Element | null, amount = 0.3) {
  if (!engine || !vessel) return false;
  let sent = false;
  for (const g of engine.energy.guides) if (g.to && g.to.el === vessel) { g.done = false; sent = engine.energy.flow(g, engine.now(), amount) || sent; }
  if (sent) engine.invalidate();
  return sent;
}

/** Where the network gathers on a page. The canvas never covers content; this only marks the place. */
export function MindAnchor({ name, className = "" }: { name: FieldMode; className?: string }) {
  return <div className={"mind-anchor " + className} data-mind={name} aria-hidden="true" />;
}
/** A stock: the vessel at the foot of a card. Energy arrives through a guide or wells up; its level is what the card holds. */
export function Stock({ level = 0.2, className = "", feed }: { level?: number; className?: string; feed?: string }) {
  return <div className={"stock " + className} data-stock="pool" data-level={level.toFixed(3)} data-feed={feed} style={{ "--level": level } as React.CSSProperties} aria-hidden="true" />;
}

const rectOf = (el: Element, name: FieldMode): Anchor => {
  const r = el.getBoundingClientRect();
  return { name, left: r.left, top: r.top + window.scrollY, width: r.width, height: r.height };
};

/* What the dots frame and never cover. Words are measured line by line, so a clearing follows a ragged edge
   instead of a whole column; controls, media and cards are measured whole. Decorative things, anchors and
   stocks stay open, and a block holding an anchor opens up so only its own contents are framed. */
const OPEN = ".mind-anchor, [data-window], [aria-hidden='true'], canvas, .stock, script, style, template, .sr-only, br";
const CONTROL = "a.glow-button, a.text-button, button, input, textarea, select, img, video, svg, picture, iframe, hr, table, .external";
type Box = { left: number; top: number; width: number; height: number; radius: number; el: Element; card: boolean };
function isCard(cs: CSSStyleDeclaration) {
  if (cs.backgroundImage !== "none") return true;
  const bg = cs.backgroundColor.match(/[\d.]+/g);
  if (bg && ((bg.length === 4 && +bg[3] > 0.04) || bg.length === 3)) return true;
  return parseFloat(cs.borderTopWidth) > 0 && parseFloat(cs.borderLeftWidth) > 0 && parseFloat(cs.borderRightWidth) > 0;
}
function ownText(el: Element) {
  for (const n of el.childNodes) if (n.nodeType === 3 && n.textContent!.trim()) return true;
  return false;
}
function lines(el: Element, sy: number, out: Box[]) {
  const range = document.createRange();
  range.selectNodeContents(el);
  const rows: number[][] = [];
  for (const r of range.getClientRects()) {
    if (r.width < 1 || r.height < 1) continue;
    const row = rows.find(x => r.top < x[3] - 2 && r.bottom > x[1] + 2);
    if (row) { row[0] = Math.min(row[0], r.left); row[1] = Math.min(row[1], r.top); row[2] = Math.max(row[2], r.right); row[3] = Math.max(row[3], r.bottom); }
    else rows.push([r.left, r.top, r.right, r.bottom]);
  }
  for (const [l, t, r, b] of rows) out.push({ left: l - 2, top: t + sy, width: r - l + 4, height: b - t, radius: 6, el, card: false });
}
function collectContent(root: Element, sy: number, out: Box[]) {
  const walk = (el: Element) => {
    for (const child of el.children) {
      if (child.matches("[data-clear]")) {
        const r = child.getBoundingClientRect();
        if (r.width > 2 && r.height > 2) out.push({ left: r.left, top: r.top + sy, width: r.width, height: r.height, radius: child.getAttribute("data-clear") === "round" ? Math.min(r.width, r.height) / 2 : 24, el: child, card: false });
        continue;
      }
      if (child.matches(OPEN)) continue;
      const cs = getComputedStyle(child);
      if (cs.display === "none" || cs.visibility === "hidden") continue;
      const r = child.getBoundingClientRect();
      if (r.width < 2 || r.height < 2) { if (child.children.length) walk(child); continue; }
      const open = child.querySelector(".mind-anchor, [data-window]");
      if (child.matches(CONTROL)) { out.push({ left: r.left, top: r.top + sy, width: r.width, height: r.height, radius: parseFloat(cs.borderTopLeftRadius) || 8, el: child, card: false }); continue; }
      if (!open && isCard(cs)) { out.push({ left: r.left, top: r.top + sy, width: r.width, height: r.height, radius: Math.min(40, parseFloat(cs.borderTopLeftRadius) || 0), el: child, card: true }); continue; }
      if (ownText(child)) { lines(child, sy, out); continue; }
      walk(child);
    }
  };
  walk(root);
}
/** Does a segment pass through a rectangle? (Liang-Barsky clipping.) */
function crosses(x0: number, y0: number, x1: number, y1: number, l: number, t: number, r: number, b: number) {
  const dx = x1 - x0, dy = y1 - y0;
  let lo = 0, hi = 1;
  for (const [p, q] of [[-dx, x0 - l], [dx, r - x0], [-dy, y0 - t], [dy, b - y0]]) {
    if (p === 0) { if (q < 0) return false; continue; }
    const u = q / p;
    if (p < 0) { if (u > hi) return false; if (u > lo) lo = u; }
    else { if (u < lo) return false; if (u < hi) hi = u; }
  }
  return true;
}
/** A guide may cross only its own two cards; every other word, control and card is in the way. */
function clearPath(pts: number[][], content: Box[], own: Element[], pad = 6) {
  for (let i = 0; i < pts.length - 1; i++) {
    const [x0, y0] = pts[i], [x1, y1] = pts[i + 1];
    for (const c of content) {
      if (own.some(o => o === c.el || o.contains(c.el))) continue;
      if (crosses(x0, y0, x1, y1, c.left - pad, c.top - pad, c.left + c.width + pad, c.top + c.height + pad)) return false;
    }
  }
  return true;
}

function measure() {
  if (!engine) return;
  const sy = scrollY, vw = document.documentElement.clientWidth;
  engine.sy = sy;
  const main = document.querySelector("main");
  const content: Box[] = [];
  if (main) collectContent(main, sy, content);
  const clears: Clear[] = content.map(b => ({ left: b.left, top: b.top, width: b.width, height: b.height, fixed: false, radius: b.radius }));
  for (const sel of [".app-header", ".bottom-nav"]) {
    const el = document.querySelector(sel);
    const r = el?.getBoundingClientRect();
    if (r && r.height > 0 && r.width > 0) clears.push({ left: r.left, top: r.top, width: r.width, height: r.height, fixed: true, radius: 0 });
  }
  engine.setClears(clears);
  engine.setQuiet([...document.querySelectorAll("main [data-quiet]")].map(el => { const r = el.getBoundingClientRect(); return { left: r.left, top: r.top + sy, width: r.width, height: r.height, fixed: false, radius: 0 }; }));

  // Vessels.
  const vessels: Vessel[] = [];
  const cardOf = new Map<Vessel, Element>();
  for (const el of document.querySelectorAll<HTMLElement>("main [data-stock]")) {
    const r = el.getBoundingClientRect();
    if (r.width < 8 || r.height < 2) continue;
    const card = el.closest<HTMLElement>("[data-stock-card]") ?? el.parentElement!;
    const c = card.getBoundingClientRect();
    const base = Math.max(0, Math.min(0.92, parseFloat(el.dataset.level ?? "0.2") || 0));
    const radius = Math.min(r.height / 2, parseFloat(getComputedStyle(el).borderTopLeftRadius) || 12);
    const v: Vessel = {
      el, top: r.top + sy, left: r.left, width: r.width, height: r.height, radius,
      cardTop: c.top + sy, cardBottom: c.bottom + sy, cardLeft: c.left, cardRight: c.right,
      base, level: 0, target: 0, vel: 0, slosh: 0, seen: false, filled: false, fed: false,
      impactX: 0, impactT: 0, impactS: 0,
    };
    vessels.push(v); cardOf.set(v, card);
  }
  // Guides: each step of a cascade feeds the next; a vessel with data-feed is fed from that element.
  const guides: Guide[] = [];
  const tube = vw < 700 ? 4.2 : 6;
  const addGuide = (id: string, from: Vessel | null, to: Vessel, candidates: number[][][], own: Element[]) => {
    for (const pts of candidates) {
      if (!clearPath(pts, content, own)) continue;
      const path = rounded(pts, 18);
      const { cum, len } = pathOf(path);
      guides.push({ id, from, to, pts: path, cum, len, flow: null, done: false, light: 1 });
      to.fed = true;
      return;
    }
  };
  for (const list of document.querySelectorAll("main .cascade")) {
    const vs = vessels.filter(v => list.contains(v.el)).sort((a, b) => a.top - b.top);
    for (let i = 1; i < vs.length; i++) {
      const a = vs[i - 1], b = vs[i];
      const yA = a.top + a.height * 0.55, yB = b.top + b.height * 0.55;
      const right = Math.max(a.cardRight, b.cardRight), room = vw - right;
      const left = Math.min(a.cardLeft, b.cardLeft);
      const cands: number[][][] = [];
      if (room >= 8 + tube) { const xg = right + Math.min(22, room / 2); cands.push([[a.left + a.width - 12, yA], [xg, yA], [xg, yB], [b.left + b.width - 12, yB]]); }
      if (left >= 8 + tube) { const xg = left - Math.min(22, left / 2); cands.push([[a.left + 12, yA], [xg, yA], [xg, yB], [b.left + 12, yB]]); }
      addGuide(`cascade:${i}:${Math.round(a.top)}`, a, b, cands, [cardOf.get(a)!, cardOf.get(b)!]);
    }
  }
  for (const v of vessels) {
    const sel = v.el.dataset.feed;
    const src = sel ? document.querySelector(sel) : null;
    if (!src) continue;
    const s = src.getBoundingClientRect();
    const sx = s.left + s.width / 2, sy0 = s.top + sy + s.height / 2;
    const yV = v.top + v.height * 0.55;
    // Leave the source diagonally, into the quiet quadrant between its neighbours, then turn for the vessel.
    const box = (src.closest("[data-feed-source]") ?? src).getBoundingClientRect();
    const d = Math.min(box.width, box.height) * 0.3;
    const dx = sx + d, dy = sy0 + d;
    const cands: number[][][] = [];
    const card = cardOf.get(v)!;
    const start = [sx + 16, sy0 + 16];
    if (v.cardLeft > dx + 24) { const xg = v.cardLeft - 18; cands.push([start, [dx, dy], [xg, dy], [xg, yV], [v.left + 12, yV]]); }
    const room = vw - v.cardRight;
    if (room >= 8 + tube) { const xg = v.cardRight + Math.min(22, room / 2); cands.push([start, [dx, dy], [xg, dy], [xg, yV], [v.left + v.width - 12, yV]]); }
    const own = [card, src, ...content.filter(c => src.contains(c.el)).map(c => c.el)];
    addGuide(`feed:${sel}`, null, v, cands, own);
  }
  // Beams: straight guides of light from a core to each choice around it; the chosen one burns brighter.
  document.querySelectorAll<HTMLElement>("main [data-beam-from]").forEach((el, i) => {
    const src = document.querySelector(el.dataset.beamFrom!);
    if (!src) return;
    const a = src.getBoundingClientRect(), b = (el.querySelector("svg") ?? el).getBoundingClientRect();
    const ax = a.left + a.width / 2, ay = a.top + a.height / 2 + sy, bx = b.left + b.width / 2, by = b.top + b.height / 2 + sy;
    const L = Math.hypot(bx - ax, by - ay);
    if (L < 80) return;
    const ux = (bx - ax) / L, uy = (by - ay) / L;
    const pts = [[ax + ux * 40, ay + uy * 40], [bx - ux * 30, by - uy * 30]];
    const { cum, len } = pathOf(pts);
    guides.push({ id: `beam:${i}`, from: null, to: null, pts, cum, len, flow: null, done: true, light: el.dataset.beamOn === "on" ? 2.1 : 0.45 });
  });
  engine.energy.setLayout(vessels, guides);
  engine.docHeight = document.documentElement.scrollHeight;
}

const TOPOLOGY: Partial<Record<FieldMode, Topology>> = {
  vision: "star", layers: "layers", orbit: "hubs", rise: "chain", gather: "hubs", hubs: "hubs",
  ocean: "chain", path: "chain", timeline: "chain", seed: "star", bond: "web",
};

export function WaveMind() {
  const canvas = useRef<HTMLCanvasElement>(null);
  const layer = useRef<HTMLCanvasElement>(null);
  const { motion } = useStateStore();
  const { pathname } = useLocation();
  const [failed, setFailed] = useState(false);
  const visited = useRef(new Set<string>());

  useEffect(() => {
    if (!canvas.current || !layer.current) return;
    try {
      engine = new Engine(canvas.current, layer.current, matchMedia("(max-width: 760px), (pointer: coarse)").matches);
      document.documentElement.dataset.mind = "on";
      if (import.meta.env.DEV) Object.assign(window, { __mind: engine, __measure: measure, __engine: () => engine });
    } catch (error) {
      if (import.meta.env.DEV) console.error("Wave Mind unavailable:", error);
      setFailed(true);
      document.documentElement.dataset.mind = "off";
      return;
    }
    // Energy arrived in a card: its rim answers with light.
    const lit = new Map<Element, ReturnType<typeof setTimeout>>();
    engine.energy.onArrive = v => {
      const el = v.el.closest("[data-stock-card]") ?? v.el.parentElement;
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

  // Measure what the dots frame, the vessels and their guides, only when the layout changes. Then let energy move.
  useEffect(() => {
    if (!engine) return;
    let frame = 0;
    const schedule = () => { cancelAnimationFrame(frame); frame = requestAnimationFrame(measure); };
    schedule();
    const ro = new ResizeObserver(schedule);
    ro.observe(document.body);
    const main = document.querySelector("main");
    if (main) ro.observe(main);
    const mo = new MutationObserver(schedule);
    if (main) mo.observe(main, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ["data-level", "data-stock", "data-feed", "data-beam-on", "open", "hidden"] });
    addEventListener("resize", schedule);
    document.fonts?.ready.then(schedule);
    const late = setTimeout(schedule, 1200);
    const vesselOf = (el: Element) => engine?.energy.vessels.find(v => v.el === el);
    // A vessel in view sways and bubbles; a card that comes into view receives its energy.
    const io = new IntersectionObserver(entries => {
      for (const e of entries) { const v = vesselOf(e.target); if (v) v.seen = e.isIntersecting; }
      engine?.wake();
    });
    const watch = setInterval(() => { for (const el of document.querySelectorAll("main [data-stock]")) io.observe(el); }, 800);
    const tick = setInterval(() => {
      if (!engine || document.hidden || !engine.motion) return;
      const now = engine.now(), sy = engine.sy, h = innerHeight;
      for (const v of engine.energy.vessels) {
        const inView = v.cardTop - sy < h * 0.72 && v.cardBottom - sy > h * 0.1;
        if (!inView) continue;
        const incoming = engine.energy.guides.find(g => g.to === v && g.from);
        const fed = engine.energy.guides.find(g => g.to === v && !g.from);
        if (!incoming && !v.fed) engine.energy.fill(v, now);
        else if (incoming && !incoming.done && !incoming.flow && incoming.from?.filled && Math.abs(incoming.from.vel) < 0.3) engine.energy.flow(incoming, now);
        // A vessel fed from a source fills through its guide the first time it is seen.
        else if (!incoming && fed && !v.filled && !fed.flow && !fed.done) engine.energy.flow(fed, now);
      }
      engine.invalidate();
    }, 320);
    return () => { cancelAnimationFrame(frame); ro.disconnect(); mo.disconnect(); io.disconnect(); removeEventListener("resize", schedule); clearTimeout(late); clearInterval(watch); clearInterval(tick); };
  }, [pathname]);

  // Find this page's anchors and follow the one most in view. Reaching one lets a network organise itself there.
  useEffect(() => {
    if (!engine) return;
    const seen = new Map<Element, { visible: number; anchor: Anchor }>();
    let current: Element | null = null, pending: ReturnType<typeof setTimeout> | null = null, later: ReturnType<typeof setTimeout> | null = null;
    const emergeAt = (el: Element, name: FieldMode) => {
      const topo = TOPOLOGY[name];
      if (!engine || !topo || !el.isConnected) return;
      const r = el.getBoundingClientRect();
      const region = engine.openRegion({ x: r.left - 30, y: r.top - 30, w: r.width + 60, h: r.height + 60 });
      if (region) engine.emerge(region, topo);
    };
    const choose = () => {
      let best: Element | null = null, bestV = 0;
      for (const [el, s] of seen) if (s.visible > bestV) { bestV = s.visible; best = el; }
      if (!best) { if (!seen.size) { current = null; engine?.focus(null); } return; }
      if (best === current) { engine?.track(seen.get(best)!.anchor); return; }
      if (pending) clearTimeout(pending);
      const target = best;
      pending = setTimeout(() => {
        current = target;
        const s = seen.get(target);
        if (!s) return;
        engine?.focus(s.anchor);
        if (later) clearTimeout(later);
        later = setTimeout(() => emergeAt(target, s.anchor.name), 450);
      }, current ? 180 : 0);
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
    // Now and then, while someone reads, a network forms in whatever open space is in view.
    const ambient = setInterval(() => {
      if (!engine || !engine.motion || document.hidden || engine.networks) return;
      const region = engine.openRegion();
      if (!region) return;
      const kinds: Topology[] = region.h < 170 ? ["chain"] : ["web", "layers", "star", "hubs"];
      engine.emerge(region, kinds[Math.floor(Math.random() * kinds.length)]);
    }, 12000);
    return () => { io.disconnect(); ro.disconnect(); mo.disconnect(); clearInterval(ambient); if (t) clearTimeout(t); if (pending) clearTimeout(pending); if (later) clearTimeout(later); };
  }, [pathname]);

  return failed
    ? <div className="mind-fallback" aria-hidden="true"><img src="/media/neural-still.webp" alt="" /></div>
    : <>
        <canvas ref={canvas} className="mind-canvas" aria-hidden="true" />
        <canvas ref={layer} className="mind-liquid" aria-hidden="true" />
      </>;
}
