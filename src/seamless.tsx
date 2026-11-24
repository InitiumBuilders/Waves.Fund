import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import type { NavigateFunction } from "react-router-dom";
import { arriveOnScroll, startCadence, still, waveOnArrival } from "./cadence";
import { mindWave } from "./mind/WaveMind";
import { sound } from "./sound";

type Transitioning = Document & { startViewTransition?: (update: () => Promise<void>) => { finished?: Promise<void>; ready?: Promise<void> } | undefined };

/* Which way a move goes. The four practices sit side by side like their tabs, so moving between them is sideways;
   a page inside a practice opens into it, and coming back out is the reverse. The home stands before them all. */
const PRACTICE: Record<string, number> = { learn: 0, manifest: 0, film: 0, "now-lets-begin": 0, guide: 1, give: 2, contribute: 2, grow: 3, waves: 3, projects: 3, apply: 3, workspace: 3 };
function wayBetween(from: string, to: string) {
  const parts = (p: string) => p.split(/[?#]/)[0].split("/").filter(Boolean);
  const a = parts(from), b = parts(to);
  const pa = a.length ? PRACTICE[a[0]] : -1, pb = b.length ? PRACTICE[b[0]] : -1;
  if (pa === undefined || pb === undefined) return "";
  if (pa !== pb) return pa === -1 ? "in" : pb === -1 ? "out" : pb > pa ? "right" : "left";
  return b.length > a.length ? "in" : b.length < a.length ? "out" : "";
}
// The pages that open on the sea (SeaHero). In WebKit a move from one of them to another crashed the page while a
// view transition ran: Playwright's WebKit did it on the live build too, every time, and never without the transition
// (2026-11-24). Until a real iPhone shows otherwise, that one move changes page plainly in WebKit.
const SEA = (path: string) => path === "/learn" || path === "/manifest" || path === "/waves" || path.startsWith("/waves/");
const appleEngine = () => navigator.vendor.startsWith("Apple");

// The way of the move in progress, read once by the page it opens.
let arriving: { to: string; way: string } | null = null;

/** A page's <main>. It reads the way of the move that opened it once, when it mounts (App keys it by path), so a
    later render can never change it and the page being left never replays its arrival. */
export function PageMain({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  const [way] = useState(() => (arriving && arriving.to === pathname ? arriving.way : ""));
  return <main id="content" data-way={way || undefined}>{children}</main>;
}

/** Goes to a page as one motion: a wave from the point you touched, the old page dissolving into the new. */
export function go(navigate: NavigateFunction, to: string, point?: { x: number; y: number }) {
  const doc = document as Transitioning;
  if (point) mindWave(point, 0.9);
  sound("page");
  if (typeof doc.startViewTransition !== "function" || still() || (appleEngine() && SEA(location.pathname) && SEA(to.split(/[?#]/)[0]))) { navigate(to); return; }
  const from = document.getElementById("content");
  const hash = to.includes("#");
  arriving = { to: to.split(/[?#]/)[0], way: wayBetween(location.pathname, to) };
  // The water carries over when the page you leave shows its sea: it holds while the next page's sea gets ready.
  // Only a sea on screen is carried, or it would fly in from where it was scrolled to.
  const sea = document.querySelector(".sea-hero-stage > .sea-hero-scene")?.getBoundingClientRect();
  const html = document.documentElement;
  if (sea && sea.bottom > 80 && sea.top < innerHeight) html.dataset.seaCarry = "";
  const moving = doc.startViewTransition(() => new Promise<void>((resolve) => {
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
  const settle = () => { delete html.dataset.seaCarry; };
  if (moving?.finished) moving.finished.then(settle, settle); else settle();
  // If the browser abandons the motion, the page still changes; nothing to report.
  moving?.ready?.catch(() => {});
}

/* Moving between pages is one motion, not a cut. The page you leave dissolves while the next one rises
   through the same ground, and your tap sends a wave through the dots from where you touched. The header
   and the tab bar stay where they are. This uses the View Transitions API where the browser has it, and
   falls back to the page's own arrival where it does not. */
export function Seamless() {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  useEffect(() => startCadence(), []);

  // The pages behind the Guide tab, the Teachback, the Praxis and the sea load quietly once this page is idle, so
  // moving to them is instant. (The Give app is left to load on demand: it brings the sign-in library.)
  useEffect(() => {
    const warm = () => { void import("./guide-library"); void import("./teachback"); void import("./begin"); void import("./together/sea"); };
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
