import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { useStateStore } from "../state";
import { Field as Engine, type Anchor } from "./field";
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

/** Where the network gathers on a page. The canvas never covers content; this only marks the place. */
export function MindAnchor({ name, className = "" }: { name: FieldMode; className?: string }) {
  return <div className={"mind-anchor " + className} data-mind={name} aria-hidden="true" />;
}

const rectOf = (el: Element, name: FieldMode): Anchor => {
  const r = el.getBoundingClientRect();
  return { name, left: r.left, top: r.top + window.scrollY, width: r.width, height: r.height };
};

export function WaveMind() {
  const canvas = useRef<HTMLCanvasElement>(null);
  const { motion } = useStateStore();
  const { pathname } = useLocation();
  const [failed, setFailed] = useState(false);
  const visited = useRef(new Set<string>());

  useEffect(() => {
    if (!canvas.current) return;
    try {
      engine = new Engine(canvas.current, matchMedia("(max-width: 760px), (pointer: coarse)").matches);
      document.documentElement.dataset.mind = "on";
    } catch (error) {
      if (import.meta.env.DEV) console.error("Wave Mind unavailable:", error);
      setFailed(true);
      document.documentElement.dataset.mind = "off";
      return;
    }
    const onResize = () => engine?.resize();
    const onPointer = (e: PointerEvent) => { if (e.pointerType === "mouse") engine?.point(e.clientX, e.clientY); };
    const onDown = (e: PointerEvent) => { if (e.pointerType !== "mouse") engine?.wave(e.clientX, e.clientY, 0.55); };
    const onLeave = () => engine?.point(0, 0, false);
    const onScroll = () => engine?.invalidate();
    // What you reach for colours the field around it.
    const onOver = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      const el = (e.target as Element).closest?.("a, button, summary, input, textarea, select");
      if (!el) { engine?.touchTint(0, 0, null); return; }
      const r = el.getBoundingClientRect();
      const key = (el.closest("[data-hue]") as HTMLElement | null)?.dataset.hue;
      engine?.touchTint(r.left + r.width / 2, r.top + r.height / 2, (key && HUES[key]) || [0.78, 0.96, 1.0]);
    };
    const ro = new ResizeObserver(() => { if (engine) engine.docHeight = document.documentElement.scrollHeight; });
    ro.observe(document.body);
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
      ro.disconnect();
      document.removeEventListener("visibilitychange", onVisible);
      engine?.destroy();
      engine = null;
    };
  }, []);

  useEffect(() => { engine?.setMotion(motion); }, [motion]);

  // Trust grows as the visitor moves through the site.
  useEffect(() => {
    visited.current.add(pathname.split("/").slice(0, 3).join("/"));
    engine?.setHue(hueFor(pathname));
    if (engine) { engine.trust = Math.min(1, (visited.current.size - 1) / 6); engine.invalidate(); }
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
      for (const el of found) if (!seen.has(el)) { seen.set(el, { visible: 0, anchor: rectOf(el, el.dataset.mind as FieldMode) }); io.observe(el); ro.observe(el); }
      for (const el of [...seen.keys()]) if (!el.isConnected) { seen.delete(el); io.unobserve(el); ro.unobserve(el); }
      if (!found.length) { current = null; engine?.focus(null); }
    };
    scan();
    const main = document.querySelector("main");
    let t: ReturnType<typeof setTimeout> | null = null;
    const mo = new MutationObserver(() => { if (t) clearTimeout(t); t = setTimeout(scan, 120); });
    if (main) mo.observe(main, { childList: true, subtree: true });
    return () => { io.disconnect(); ro.disconnect(); mo.disconnect(); if (t) clearTimeout(t); if (pending) clearTimeout(pending); };
  }, [pathname]);

  return failed
    ? <div className="mind-fallback" aria-hidden="true"><img src="/media/neural-still.webp" alt="" /></div>
    : <canvas ref={canvas} className="mind-canvas" aria-hidden="true" />;
}
