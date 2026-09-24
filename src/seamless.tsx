import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import type { NavigateFunction } from "react-router-dom";
import { arriveOnScroll, startCadence, still, waveOnArrival } from "./cadence";
import { mindWave } from "./mind/WaveMind";

type Transitioning = Document & { startViewTransition?: (update: () => Promise<void>) => unknown };

/** Goes to a page as one motion: a wave from the point you touched, the old page dissolving into the new. */
export function go(navigate: NavigateFunction, to: string, point?: { x: number; y: number }) {
  const doc = document as Transitioning;
  if (point) mindWave(point, 0.9);
  if (typeof doc.startViewTransition !== "function" || still()) { navigate(to); return; }
  const from = document.getElementById("content");
  const hash = to.includes("#");
  doc.startViewTransition(() => new Promise<void>((resolve) => {
    let finished = false;
    const done = () => {
      if (finished) return;
      finished = true;
      mo.disconnect();
      clearTimeout(timer);
      if (!hash) window.scrollTo({ top: 0, behavior: "instant" });
      resolve();
    };
    // The new page is ready when its content has replaced the old one and a lazy page has finished loading.
    const mo = new MutationObserver(() => { const now = document.getElementById("content"); if (now && now !== from && !now.querySelector(".route-loading")) done(); });
    mo.observe(document.body, { childList: true, subtree: true });
    const timer = setTimeout(done, 1500);
    navigate(to);
  }));
}

/* Moving between pages is one motion, not a cut. The page you leave dissolves while the next one rises
   through the same ground, and your tap sends a wave through the dots from where you touched. The header
   and the tab bar stay where they are. This uses the View Transitions API where the browser has it, and
   falls back to the page's own arrival where it does not. */
export function Seamless() {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  useEffect(() => startCadence(), []);

  // The pages behind the Guide tab, the Teachback and the Praxis load quietly once this page is idle, so moving
  // to them is instant. (The Give app is left to load on demand: it brings the sign-in library.)
  useEffect(() => {
    const warm = () => { void import("./guide-library"); void import("./teachback"); void import("./begin"); };
    const idle = (window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number }).requestIdleCallback;
    if (idle) idle(warm, { timeout: 5000 }); else setTimeout(warm, 3000);
  }, []);

  // Blocks below the first screen arrive as they are scrolled to. Pages fill in after data loads, so look twice.
  useEffect(() => {
    const first = setTimeout(arriveOnScroll, 60);
    const later = setTimeout(arriveOnScroll, 1400);
    const waves = waveOnArrival((x, y) => mindWave({ x, y }, 0.6));
    return () => { clearTimeout(first); clearTimeout(later); waves(); };
  }, [pathname]);

  useEffect(() => {
    const doc = document as Transitioning;
    if (typeof doc.startViewTransition !== "function") return;
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!a || (a.target && a.target !== "_self") || a.hasAttribute("download")) return;
      // Holding Grow opens Waves with its own pulse; that press must not also open Grow.
      if (a.closest("[data-seamless='off'], .waves-opening, .holding")) return;
      const url = new URL(a.href, location.href);
      if (url.origin !== location.origin || url.pathname === location.pathname || url.pathname.startsWith("/api/")) return;
      if (still()) return;
      e.preventDefault();
      const r = a.getBoundingClientRect();
      const keyboard = e.detail === 0;
      go(navigate, url.pathname + url.search + url.hash, { x: keyboard ? r.left + r.width / 2 : e.clientX, y: keyboard ? r.top + r.height / 2 : e.clientY });
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [navigate]);

  return null;
}
