/* A day in the TrustBase opening into its moves and closing back into the day (2026-11-25): the zoom between the
   fund's map and a Wave (src/zoom.ts), one level further in. Closed, a day shows its date, its first move and its
   ground, one fine line for each move. Opening it, the first move stays where it is and each other move unfolds out
   of its own line and spreads to its place, while the ground and everything under it slide down to make room, so
   nothing jumps. Closing it, the moves fold back into their lines and the page closes up over them. Transforms and
   opacity only; with motion off a day opens and closes at once. */
import { still } from "./cadence";

const OPEN_MS = 560, CLOSE_MS = 480;
const EASE = "cubic-bezier(0.16, 1, 0.3, 1)"; // --ease-out in motus.css
type Run = { anims: Animation[]; end: () => void };
const runs = new WeakMap<HTMLDetailsElement, Run>();

/** Ends a day's zoom at once, in its final state. */
function settle(d: HTMLDetailsElement) {
  const run = runs.get(d);
  if (!run) return;
  runs.delete(d);
  run.end();
  for (const a of run.anims) a.cancel();
}

const box = (e: Element) => { const r = e.getBoundingClientRect(); return { top: r.top + scrollY, h: r.height }; };

/** Everything after the day on the page, in reading order, except what is fixed to the screen. */
function after(day: Element) {
  const out: HTMLElement[] = [];
  const stop = day.closest("main") ?? document.body;
  for (let n: Element | null = day; n && n !== stop; n = n.parentElement)
    for (let s = n.nextElementSibling; s; s = s.nextElementSibling)
      if (s instanceof HTMLElement && !/fixed|sticky/.test(getComputedStyle(s).position)) out.push(s);
  return out;
}

/** Opens a closed day or closes an open one, as a zoom. `d` is the day's <details>. */
export function toggleDay(d: HTMLDetailsElement) {
  settle(d);
  const opening = !d.open;
  const day = d.closest(".tb-day");
  const ground = day?.querySelector<HTMLElement>(".tb-ground");
  if (still() || !day || !ground || typeof d.animate !== "function") { d.open = opening; return; }
  const first = d.querySelector<HTMLElement>("summary .tb-first");
  const lines = ground.querySelector<HTMLElement>(".tb-lines");
  const gap = parseFloat(getComputedStyle(ground).getPropertyValue("--gap")) || 5;
  const below = after(day);

  // Both states, read in one go before anything is drawn: closed, then open.
  d.open = false;
  const c = { ground: box(ground).top, first: first ? box(first).top : 0, below: below.map((e) => box(e).top) };
  d.open = true;
  const rows = [...d.querySelectorAll<HTMLElement>(".tb-moves > li")];
  const o = { ground: box(ground).top, rows: rows.map((r) => box(r).top), below: below.map(box) };
  // Where a move's line lies in the closed day's ground.
  const line = (k: number) => c.ground + (lines?.offsetTop ?? 14) + k * gap;
  // Only what a visitor could see move is moved; the rest of the page is already where it ends.
  const near = (i: number) => {
    const a = c.below[i], b = o.below[i].top, h = o.below[i].h, y0 = scrollY - 40, y1 = scrollY + innerHeight + 40;
    return (a < y1 && a + h > y0) || (b < y1 && b + h > y0);
  };
  // Like a camera's zoom, every layer spreads at once and at one pace: moves that set off one after another overlap
  // while they travel, and in step none of them can before it shows.
  const ms = opening ? OPEN_MS : CLOSE_MS;
  const at = (dy: number) => `translate3d(0, ${dy.toFixed(1)}px, 0)`;
  const anims: Animation[] = [];
  // A slide is added to whatever an element already shows (a section still arriving keeps its own rise).
  const slide = (e: HTMLElement, dy: number) => {
    const frames = [{ transform: at(opening ? dy : 0) }, { transform: at(opening ? 0 : dy) }];
    anims.push(e.animate(frames, { duration: ms, easing: EASE, fill: opening ? "backwards" : "forwards", composite: "add" }));
  };
  slide(ground, c.ground - o.ground);
  below.forEach((e, i) => { if (near(i)) slide(e, c.below[i] - o.below[i].top); });
  rows.forEach((r, k) => {
    if (k === 0 && first) { slide(r, c.first - o.rows[0]); return; }
    const folded = { transform: `${at(line(k) - o.rows[k])} scaleY(0.2)`, transformOrigin: "0 0", opacity: 0 };
    const open = { transform: `${at(0)} scaleY(1)`, transformOrigin: "0 0", opacity: 1 };
    // A move shows only once it has spread from the others, and is gone before it folds back among them, so the
    // words never pile up over each other near the ground.
    const frames = opening
      ? [folded, { opacity: 0, offset: 0.25 }, { opacity: 1, offset: 0.8 }, open]
      : [open, { opacity: 0, offset: 0.45 }, folded];
    anims.push(r.animate(frames, { duration: ms, easing: EASE, fill: opening ? "backwards" : "forwards" }));
  });
  // Closing, the day stays open until its moves are back in their lines; its arrow turns at once.
  if (!opening) d.classList.add("tb-closing");
  const run: Run = { anims, end: opening ? () => {} : () => { d.open = false; d.classList.remove("tb-closing"); } };
  runs.set(d, run);
  Promise.all(anims.map((a) => a.finished)).then(() => { if (runs.get(d) === run) settle(d); }, () => {});
}
