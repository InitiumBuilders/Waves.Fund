import { useLayoutEffect, type RefObject } from "react";

/* The phone's tab bar is fixed to the foot of the screen (94px, with a fade 72px above it). A first button half under
   it looks broken; wholly below it reads as "more below". Everything here measures by layout alone (offsetTop
   chains): words rise into place with a transform as a page opens, and a measure that counted it would place a
   button where it is passing, not where it will stand. */

/** Where an element stands in the page by layout alone, ignoring transforms. */
export const laidAt = (el: HTMLElement) => { let y = 0; for (let e: HTMLElement | null = el; e; e = e.offsetParent as HTMLElement | null) y += e.offsetTop; return y; };

/** How far the first thing to press must rise to clear the bar, or fall to stand wholly below it, with the page at its
    top. Null when there is no bar (it is hidden from 800px wide) or nothing is cut. */
export function cutByTheBar(first: HTMLElement | null) {
  const bar = document.querySelector<HTMLElement>(".bottom-nav");
  if (!first || !bar || !bar.offsetHeight) return null;
  // The bar is fixed to the foot of what the screen shows, so its place on screen is its place with the page at its top.
  const barTop = bar.getBoundingClientRect().top;
  const top = laidAt(first), bottom = top + first.offsetHeight;
  // Clear of the bar, or wholly below it (1px either way is layout rounding).
  if (bottom <= barTop + 1 || top >= barTop - 1) return null;
  return { up: Math.ceil(bottom - barTop), down: Math.ceil(barTop - top) };
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
