import { lazy, Suspense, useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { Compass, X } from "lucide-react";
import "./tour-offer.css";

/* The tour's front door. It lives in the main bundle and stays tiny: it starts the tour when asked (the menu, a
   link with ?tour, or the offer below) and loads the tour itself only then. The tour sits outside the page, so it
   carries on while the pages under it change. */

const Tour = lazy(() => import("./tour"));
const EVENT = "waves:tour";
const OFFERED = "waves-tour-offered";

/** Starts the tour. A path skips the first question: vision, guide, give, waves or all. */
export function startTour(path?: string) {
  window.dispatchEvent(new CustomEvent(EVENT, { detail: path }));
}

const offered = () => { try { return localStorage.getItem(OFFERED) === "1"; } catch { return true; } };
const markOffered = () => { try { localStorage.setItem(OFFERED, "1"); } catch { /* the offer simply returns next visit */ } };

export function TourLauncher() {
  const [run, setRun] = useState<{ path?: string; key: number } | null>(null);
  const [offer, setOffer] = useState(false);
  const { pathname, search } = useLocation();

  useEffect(() => {
    const on = (e: Event) => { markOffered(); setOffer(false); setRun({ path: (e as CustomEvent<string | undefined>).detail, key: Date.now() }); };
    addEventListener(EVENT, on);
    return () => removeEventListener(EVENT, on);
  }, []);

  // A shared link can open the tour: waves.fund/?tour, or ?tour=give for one path.
  useEffect(() => {
    const q = new URLSearchParams(search);
    if (q.has("tour")) startTour(q.get("tour") || undefined);
  }, [search]);

  // A first visit is offered the tour once, quietly, after the page has had time to show itself. Never inside the
  // Give app or team pages, where people come to do something, and never where the first screen already offers it.
  useEffect(() => {
    if (run || offered() || /^\/(give\/|team|workspace|sign-)/.test(pathname) || /^\/(learn|manifest)\/?$/.test(pathname)) return;
    const t = setTimeout(() => setOffer(true), pathname === "/" ? 13000 : 7000);
    return () => clearTimeout(t);
  }, [pathname, run]);

  return (
    <>
      {offer && !run && (
        <div className="tour-offer" role="region" aria-label="Tour">
          <button type="button" className="tour-offer-go" onClick={() => startTour()}>
            <Compass size={17} aria-hidden="true" />Take The Tour
          </button>
          <button type="button" className="tour-offer-close" aria-label="Not now" onClick={() => { markOffered(); setOffer(false); }}>
            <X size={16} />
          </button>
        </div>
      )}
      {run && (
        <Suspense fallback={null}>
          <Tour key={run.key} path={run.path} onEnd={() => setRun(null)} />
        </Suspense>
      )}
    </>
  );
}
