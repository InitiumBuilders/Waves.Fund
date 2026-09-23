import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { useStateStore } from "../state";
import { mindMove, mindWave } from "./WaveMind";

/** Your Wave travels down the page with you and touches each chapter as it passes. */
export function Current() {
  const ref = useRef<HTMLButtonElement>(null);
  const { pathname } = useLocation();
  const { motion } = useStateStore();
  const [long, setLong] = useState(false);

  useEffect(() => {
    const measure = () => setLong(document.documentElement.scrollHeight > innerHeight * 2.4);
    measure();
    const t = setTimeout(measure, 900);
    const ro = new ResizeObserver(measure);
    ro.observe(document.body);
    return () => { clearTimeout(t); ro.disconnect(); };
  }, [pathname]);

  useEffect(() => {
    if (!long) return;
    let raf = 0;
    const update = () => {
      raf = 0;
      const el = ref.current;
      if (!el) return;
      const max = document.documentElement.scrollHeight - innerHeight;
      const p = max > 0 ? Math.min(1, Math.max(0, scrollY / max)) : 0;
      const top = innerHeight * 0.18, bottom = innerHeight - (innerWidth < 800 ? 150 : 110);
      const y = top + (bottom - top) * p;
      const sway = motion ? Math.sin(p * Math.PI * 7) * 6 : 0;
      el.style.transform = `translate3d(${sway.toFixed(1)}px, ${y.toFixed(1)}px, 0)`;
      const shown = scrollY > innerHeight * 0.45;
      el.style.opacity = shown ? "1" : "0";
      // The mark is a small mass: the lattice bends around it as it travels.
      mindMove(innerWidth - (innerWidth < 800 ? 18 : 48) + sway, y + 22, shown ? 1 : 0);
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(update); };
    update();
    addEventListener("scroll", onScroll, { passive: true });
    addEventListener("resize", onScroll);
    // As it passes each chapter it sends a pulse into the network.
    const io = new IntersectionObserver(entries => {
      if (!motion) return;
      for (const e of entries) if (e.isIntersecting && ref.current && ref.current.style.opacity === "1") mindWave(ref.current, 0.55);
    }, { rootMargin: "-48% 0px -48% 0px" });
    document.querySelectorAll("main .section, main .guide-section, main .chapter-mind").forEach(el => io.observe(el));
    return () => { removeEventListener("scroll", onScroll); removeEventListener("resize", onScroll); io.disconnect(); if (raf) cancelAnimationFrame(raf); mindMove(0, 0, 0); };
  }, [long, motion, pathname]);

  if (!long) return null;
  return (
    <button
      ref={ref}
      type="button"
      className="current"
      aria-label="Back to the top"
      onClick={() => { scrollTo({ top: 0, behavior: motion ? "smooth" : "instant" }); if (ref.current) mindWave(ref.current, 1); }}
    >
      <img src="/media/nav-waves.png" alt="" width="64" height="64" />
    </button>
  );
}
