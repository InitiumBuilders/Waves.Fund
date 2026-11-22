import { lazy, Suspense, useEffect, useLayoutEffect, useRef, useState } from "react";
import type { MutableRefObject, ReactNode, RefObject } from "react";
import type { RippleHandle, RippleModel } from "./together/ripple";
import "./sea-hero.css";

const Sea = lazy(() => import("./together/sea").then((m) => ({ default: m.Sea })));

// The width at which sea-hero.css moves the words from the foot to the left.
const WIDE = "(min-width: 900px)";
function useWide() {
  const [wide, setWide] = useState(() => matchMedia(WIDE).matches);
  useEffect(() => {
    const m = matchMedia(WIDE), on = () => setWide(m.matches);
    m.addEventListener("change", on);
    return () => m.removeEventListener("change", on);
  }, []);
  return wide;
}

// The least water a phone keeps above the words when the band gives way to a button.
const LEAST = 110;

/* On a phone the first thing to press stands either clear of the tab bar or wholly below it, never half under it.
   CSS cannot know where a page's words end, so once they are laid out this measures the first button against the
   bar, with the page at its top. If the bar would cut it, the water's band gives up the difference, down to LEAST;
   if that is not enough, the band grows instead and the button waits below the bar for the first scroll. It is
   measured again only when the words change size (a font arriving, a line chosen later, a turn of the phone), so
   Safari's bars sliding during a scroll never move anything. */
// Where an element stands in the page by layout alone. The words rise into place with a transform as a page opens,
// and a page itself may arrive with one; a measure that counted those would place the button where it is passing,
// not where it will stand.
const laidAt = (el: HTMLElement) => { let y = 0; for (let e: HTMLElement | null = el; e; e = e.offsetParent as HTMLElement | null) y += e.offsetTop; return y; };

function useClearOfTheBar(hero: RefObject<HTMLElement | null>) {
  useLayoutEffect(() => {
    const h = hero.current, copy = h?.querySelector<HTMLElement>(".sea-hero-copy"), stage = h?.querySelector<HTMLElement>(".sea-hero-stage");
    if (!h || !copy || !stage) return;
    const fit = () => {
      h.style.removeProperty("--sea-fit");
      const bar = document.querySelector<HTMLElement>(".bottom-nav");
      const first = copy.querySelector<HTMLElement>(".intro-actions > *");
      // No bar from 800px wide, and no band from 900px.
      if (!bar || !bar.offsetHeight || !first || matchMedia(WIDE).matches) return;
      // The bar is fixed to the foot of what the screen shows, so its place on screen is its place with the page at
      // its top.
      const barTop = bar.getBoundingClientRect().top;
      const top = laidAt(first), bottom = top + first.offsetHeight;
      // Clear of the bar, or wholly below it (1px either way is layout rounding).
      if (bottom <= barTop + 1 || top >= barTop - 1) return;
      const band = laidAt(copy) - laidAt(stage);
      const up = Math.ceil(bottom - barTop), down = Math.ceil(barTop - top);
      h.style.setProperty("--sea-fit", `${band - up >= LEAST ? band - up : band + down}px`);
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(copy);
    return () => ro.disconnect();
  }, [hero]);
}

/* A page that opens on the sea. The first screen is water, drawn by the same renderer as the Give page; the
   words stand on the quiet side of it (the left on a wide screen, the foot on a phone). The words are in the
   page from the start so they paint at once; the sea arrives a moment later.

   On a phone the water keeps a band of its own above the words (sea-hero.css), and the sea is told the words are
   at its foot, so it frames itself in that band whatever the band's shape. With Safari's bars showing, an iPhone's
   first screen is about 659px tall; before 2026-11-21 the words covered nearly all of the water at that height. */
export function SeaHero({ eyebrow, title, children, actions, model, handle, onLight, still = 4.5, className = "" }: {
  eyebrow: string;
  title: ReactNode;
  children?: ReactNode;
  actions?: ReactNode;
  model: MutableRefObject<RippleModel>;
  handle?: MutableRefObject<RippleHandle | null>;
  onLight?: (index: number, at: { x: number; y: number }) => void;
  still?: number;
  className?: string;
}) {
  const wide = useWide();
  const hero = useRef<HTMLElement>(null);
  useClearOfTheBar(hero);
  return (
    <header ref={hero} className={`sea-hero ${className}`}>
      <div className="sea-hero-stage" data-window>
        <Suspense fallback={<div className="ripple sea-hero-scene" aria-hidden="true" />}>
          <Sea model={model} handle={handle} tappable onLight={onLight} className="sea-hero-scene" maxDpr={1.25} still={still} side={wide ? "left" : "bottom"} aria-hidden="true" />
        </Suspense>
        <div className="sea-hero-copy">
          <p className="eyebrow">{eyebrow}</p>
          <h1>{title}</h1>
          {children && <div className="intro-description">{children}</div>}
          {actions && <div className="button-row intro-actions">{actions}</div>}
        </div>
      </div>
    </header>
  );
}
