import { lazy, Suspense } from "react";
import type { MutableRefObject, ReactNode } from "react";
import type { RippleHandle, RippleModel } from "./together/ripple";
import "./sea-hero.css";

const Sea = lazy(() => import("./together/sea").then((m) => ({ default: m.Sea })));

/* A page that opens on the sea. The first screen is water, drawn by the same renderer as the Give page; the
   words stand on the quiet side of it (the left on a wide screen, the foot on a phone). The words are in the
   page from the start so they paint at once; the sea arrives a moment later. */
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
  return (
    <header className={`sea-hero ${className}`}>
      <div className="sea-hero-stage" data-window>
        <Suspense fallback={<div className="ripple sea-hero-scene" aria-hidden="true" />}>
          <Sea model={model} handle={handle} tappable onLight={onLight} className="sea-hero-scene" maxDpr={1.25} still={still} aria-hidden="true" />
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
