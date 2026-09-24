/* One beat for the whole site: 1.5 seconds.
   Every loop lasts a whole number of beats and runs on the same clock (the document timeline). The dot
   field, the ripples, the wave symbols and the energy in the vessels all share it, so everything on a page
   moves in step. This is the Give Together idea applied to the site itself: things in step add up. */

export const BEAT = 1.5;

/** Seconds since the page opened, on the clock every loop shares. */
export const clock = () => performance.now() / 1000;

export const still = () =>
  document.documentElement.dataset.motion === "off" || matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Puts a looping CSS animation on the shared clock: its first cycle began when the page opened. */
function align(a: Animation) {
  if (a.playState !== "running") return;
  const timing = a.effect?.getTiming();
  if (!timing || timing.iterations !== Infinity) return;
  a.startTime = 0;
}

/** Keeps every looping CSS animation in step, including the ones that start later. The wave symbols are
    SVG, whose animations run on the main thread even off screen, so a symbol rests while it is out of view
    and rejoins the beat, in phase, when it comes back. */
export function startCadence() {
  if (typeof document.getAnimations !== "function") return () => {};
  for (const a of document.getAnimations()) align(a);
  const onStart = (e: AnimationEvent) => {
    const el = e.target as Element;
    for (const a of el.getAnimations({ subtree: Boolean(e.pseudoElement) })) {
      if ((a as CSSAnimation).animationName === e.animationName) align(a);
    }
  };
  document.addEventListener("animationstart", onStart, true);
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      for (const a of e.target.getAnimations({ subtree: true })) {
        if (a.effect?.getTiming().iterations !== Infinity) continue;
        if (e.isIntersecting) { if (a.playState === "paused") a.play(); a.startTime = 0; } else a.pause();
      }
    }
  }, { rootMargin: "160px 0px" });
  const watch = () => { for (const el of document.querySelectorAll(".sym")) io.observe(el); };
  let pending = 0;
  const mo = new MutationObserver(() => { clearTimeout(pending); pending = window.setTimeout(watch, 250); });
  mo.observe(document.body, { childList: true, subtree: true });
  watch();
  return () => { document.removeEventListener("animationstart", onStart, true); io.disconnect(); mo.disconnect(); clearTimeout(pending); };
}

/* As you scroll, each block of a section rises into place, and scrolling back lowers it again. The scroll
   position drives it (CSS scroll-driven animations), so it runs off the main thread. Cards in one row
   arrive one after another. Only blocks below the first screen take part, so nothing you can already see
   is ever faded. */
// Items of a list or grid first, then the other blocks of each section; a block that already holds
// arriving items stays put, so nothing fades twice.
const ARRIVE = [
  "main :is(.cascade, .three-grid, .tb-steps, .tb-mind-list, .gt-safe-list, .growth-stats, .guide-cards, .card-grid, .flow-list, .roadmap) > *",
  "main section:not(.page-intro):not(.gt-tank) > :not(script):not(style):not([data-window]):not(.gt-front)",
];

export function arriveOnScroll() {
  if (still() || typeof CSS === "undefined" || !CSS.supports("animation-timeline: view()")) return;
  const fold = innerHeight + scrollY;
  const rows = new Map<Element, Map<number, number>>();
  const blocks = ARRIVE.flatMap((q) => [...document.querySelectorAll<HTMLElement>(q)]);
  for (const el of blocks) {
    if (el.classList.contains("arrive") || el.closest(".page-intro, dialog, [data-window], .gt-tank")) continue;
    if (el.querySelector(".arrive") || el.parentElement?.closest(".arrive")) continue;
    const r = el.getBoundingClientRect();
    if (r.height === 0 || r.top + scrollY < fold) continue;
    if (getComputedStyle(el).animationName !== "none") continue;
    // Siblings that share a top line arrive one after another.
    const parent = el.parentElement!;
    const tops = rows.get(parent) ?? new Map<number, number>();
    rows.set(parent, tops);
    const top = Math.round(r.top);
    const i = tops.get(top) ?? 0;
    tops.set(top, i + 1);
    if (i) el.style.setProperty("--arrive-i", String(Math.min(i, 5)));
    el.classList.add("arrive");
  }
}

/* Each chapter arrives with a wave. When a section's heading reaches the middle of the screen for the first
   time, one soft ring goes out through the dot field from where the heading starts, on the next beat. */
export function waveOnArrival(send: (x: number, y: number) => void) {
  if (still() || typeof IntersectionObserver === "undefined") return () => {};
  const timers = new Set<number>();
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (!e.isIntersecting) continue;
      io.unobserve(e.target);
      const wait = (BEAT - (clock() % BEAT)) * 1000;
      const id = window.setTimeout(() => {
        timers.delete(id);
        const r = e.target.getBoundingClientRect();
        if (r.bottom > 0 && r.top < innerHeight) send(r.left + Math.min(40, r.width / 2), r.top + r.height / 2);
      }, wait);
      timers.add(id);
    }
  }, { rootMargin: "-38% 0px -38% 0px" });
  const watch = () => {
    for (const h of document.querySelectorAll("main section h2")) {
      if (!h.closest(".page-intro, .gt-tank, dialog")) io.observe(h);
    }
  };
  watch();
  const later = window.setTimeout(watch, 1400);
  return () => { io.disconnect(); clearTimeout(later); timers.forEach((t) => clearTimeout(t)); };
}
