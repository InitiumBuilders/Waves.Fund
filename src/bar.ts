import { useLayoutEffect, type RefObject } from "react";

/* The phone's tab bar is fixed to the foot of the screen (94px). It also darkens the 72px above it, so words
   scrolling under it fade out before they reach the labels, and that fade is already 90% dark where the bar begins.
   A first button in the fade looks switched off, and one half under the bar looks broken; wholly below the bar reads
   as "more below". So a first button ends CLEAR px above the bar (where the fade is under 40% dark), or starts wholly
   below it. Until 2026-11-24 this measured to the bar's own top, and first buttons on Learn and Give stood in the fade.
   Everything here measures by layout alone (offsetTop chains): words rise into place with a transform as a page
   opens, and a measure that counted it would place a button where it is passing, not where it will stand. */

/** How far above the bar's top a first button must end to stand clear of its fade. */
export const CLEAR = 40;

/** Where an element stands in the page by layout alone, ignoring transforms. */
export const laidAt = (el: HTMLElement) => { let y = 0; for (let e: HTMLElement | null = el; e; e = e.offsetParent as HTMLElement | null) y += e.offsetTop; return y; };

/** How far the first thing to press must rise to clear the bar's fade, or fall to stand wholly below the bar, with the
    page at its top. Null when there is no bar (it is hidden from 800px wide) or nothing is in the way. */
export function cutByTheBar(first: HTMLElement | null) {
  const bar = document.querySelector<HTMLElement>(".bottom-nav");
  if (!first || !bar || !bar.offsetHeight) return null;
  // The bar is fixed to the foot of what the screen shows, so its place on screen is its place with the page at its top.
  const barTop = bar.getBoundingClientRect().top, edge = barTop - CLEAR;
  const top = laidAt(first), bottom = top + first.offsetHeight;
  // Clear of the fade, or wholly below the bar (1px either way is layout rounding).
  if (bottom <= edge + 1 || top >= barTop - 1) return null;
  return { up: Math.ceil(bottom - edge), down: Math.ceil(barTop - top) };
}

/** Keeps a row of buttons from being cut by the tab bar: if the bar would cut its first button, the row moves down
    until that button stands wholly below the bar. It is measured again only when something above the row changes
    size (a font arriving, a line chosen later), never on resize, so Safari's bars sliding never move it. */
export function useBelowTheBar(row: RefObject<HTMLElement | null>) {
  useLayoutEffect(() => {
    const r = row.current;
    if (!r) return;
    const fit = () => {
      r.style.removeProperty("margin-top");
      const cut = cutByTheBar(r.querySelector<HTMLElement>("a, button"));
      if (cut) r.style.marginTop = `${(parseFloat(getComputedStyle(r).marginTop) || 0) + cut.down}px`;
    };
    fit();
    // What stands above the row decides where it falls; the row's own margin changes nothing above it.
    const ro = new ResizeObserver(fit);
    for (let e = r.previousElementSibling; e; e = e.previousElementSibling) ro.observe(e);
    document.fonts?.ready.then(fit);
    return () => ro.disconnect();
  }, [row]);
}
