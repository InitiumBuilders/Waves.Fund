import { useEffect, useRef, useState } from "react";
import type { MutableRefObject } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, X } from "lucide-react";
import { useStateStore } from "./state";
import { useCommunity } from "./community";
import type { Project } from "./community";
import { go } from "./seamless";
import { mindWave } from "./mind/WaveMind";
import { BEAT, clock } from "./cadence";
import { sound } from "./sound";
import "./tour.css";

/* The tour. One question first (what brings you here), then a path through the pages that answer it. Each step
   goes to its page the way any link does (the page dissolves into the next and a wave leaves from where you
   were), brings the part that matters into view, lights it with a ring, and sends a wave through the dots from it
   on the beat. On Give it flies through the three chapters of the sea by itself. A card in the corner says what
   you are looking at; the page under it stays live, so you can scroll, tap, or leave at any time.

   It uses what the site already knows, and only that: the vision you typed on this device, the receipts you saved,
   whether you have joined Give Together, and the live counts the Grow page shows. Titles and lines are the site's
   own words (August's lines and the pages' headings). Lines marked PLACEHOLDER are mine, waiting for his. */

type Ctx = { vision: string; projects: Project[]; guides: number; receipts: number; member: boolean };
type Text = string | ((c: Ctx) => string | null);
type Step = { route: string; target: string; practice: string; title: Text; line?: Text; live?: Text; mine?: Text; fly?: number };
type Path = { id: string; label: string; note: string; steps: Step[]; end: (c: Ctx) => { label: string; to: string } };

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
const quote = (s: string) => `“${s.length > 110 ? s.slice(0, 107).trimEnd() + "…" : s}”`;
const text = (t: Text | undefined, c: Ctx) => (typeof t === "function" ? t(c) : t) || null;

const S: Record<string, Step> = {
  home: { route: "/", target: ".home-identity", practice: "Waves.Fund", title: "Raise Capital In A Whole New Way. Raise Waves.", line: "Start with your vision, or look around first." }, // line: PLACEHOLDER
  vision: {
    route: "/", target: ".vision-workspace", practice: "Your Vision", title: "What’s Your Vision?",
    line: "Type what you want to build. It stays on this device until you send it.", // PLACEHOLDER
    mine: (c) => (c.vision ? `Your draft: ${quote(c.vision)}` : null), // "Your draft:" is a PLACEHOLDER
  },
  pitch: { route: "/learn", target: ".learn-pitch", practice: "Learn", title: "We match builders with Wave Guides.", line: "Read how a builder and a Wave Guide work together." }, // line: PLACEHOLDER
  practices: { route: "/learn", target: ".cascade", practice: "Learn", title: "Futures, Founded, Forged And Funded Together", line: "How a project moves through Waves.Fund, one step into the next." }, // line: PLACEHOLDER
  waves: {
    route: "/waves", target: ".sea-hero", practice: "Grow", title: "Waves In Motion",
    line: (c) => (c.projects.length ? "Every light on the water is a Wave. Tap one to open it." : "The light near the shore is yours, still to come. Tap it to bring your vision."), // PLACEHOLDER
    live: (c) => (c.projects.length ? `${plural(c.projects.length, "Wave", "Waves")} in community review right now` : null), // PLACEHOLDER
  },
  firstWave: {
    route: "/waves", target: ".wave-card", practice: "Grow",
    title: (c) => c.projects[0]?.title || "Waves In Motion", line: (c) => c.projects[0]?.category || null,
    live: (c) => (c.projects[0] ? plural(c.projects[0].signals, "support signal", "support signals") : null),
  },
  apply: {
    route: "/apply", target: ".application-form", practice: "Your Vision", title: "Submit A Project",
    line: "Tell the team what you are building and who it serves. You keep a private receipt to follow it.", // PLACEHOLDER
    mine: (c) => (c.vision ? "Your vision is already in the form." : null), // PLACEHOLDER
  },
  guideHero: { route: "/guide", target: ".guide-pitch-hero", practice: "Guide", title: "Your vision. Your Wave. A Guide beside you.", line: "Wave Guides build Waves with builders. This is what that work looks like." }, // line: PLACEHOLDER
  guideSteps: { route: "/guide", target: ".guide-cascade", practice: "Guide", title: "Build it. Move it. See what changes.", line: "What a Guide does with a builder, step by step." }, // line: PLACEHOLDER
  lessons: { route: "/guide/library", target: ".guide-lesson-grid", practice: "Guide", title: "The Wave Guide Library", line: "Six lessons and seven templates you can download and use." }, // line: PLACEHOLDER
  teachback: { route: "/guide/teachback", target: ".tb-hero", practice: "Guide", title: "The Teachback", line: "Learn it. Teach it together. Hear it taught back." },
  guideApply: {
    route: "/guide/apply", target: ".application-form", practice: "Guide", title: "Apply To Be A Wave Guide",
    line: "Share what you can do, what you are learning, and the work you want to help move forward.",
    live: (c) => (c.guides ? `${plural(c.guides, "accepted Wave Guide", "accepted Wave Guides")} so far` : null), // PLACEHOLDER
  },
  giveSea: { route: "/give", target: ".gt-tank", practice: "Give", title: "Find Your People. Give Together. Build a Wave.", fly: 9 },
  giveFlow: { route: "/give", target: ".gt-flow-section", practice: "Give", title: "From Your Give Profile To Your Next Wave", line: "Seven steps, from your profile to a day given together." }, // line: PLACEHOLDER
  partner: { route: "/give", target: ".gt-partner-card", practice: "Give", title: "Wave Partner of the month", line: "This month’s partner. You can give to them directly through Benevity." }, // line: PLACEHOLDER
  safe: { route: "/give", target: ".gt-safe", practice: "Give", title: "How We Keep It Safe", line: "Six rules that keep giving together safe." }, // line: PLACEHOLDER
  grow: {
    route: "/grow", target: ".growth-stats", practice: "Grow", title: "Measure what moves.", line: "Live counts for the whole fund: Waves, Wave Guides and support signals.", // PLACEHOLDER
    mine: (c) => (c.receipts ? `You have ${plural(c.receipts, "application receipt", "application receipts")} saved on this device.` : null), // PLACEHOLDER
  },
  begin: { route: "/now-lets-begin", target: ".begin-hero", practice: "Learn", title: "Now, Let’s Begin.", line: "Meet Wave One and read the full Wave Praxis." }, // line: PLACEHOLDER
};

// The four paths use the site's own button labels. Their notes are PLACEHOLDERS.
const PATHS: Path[] = [
  { id: "vision", label: "What’s Your Vision?", note: "Start a Wave of your own", steps: [S.vision, S.pitch, S.practices, S.waves, S.apply], end: () => ({ label: "Bring Your Vision", to: "/apply" }) },
  { id: "guide", label: "Become A Wave Guide", note: "Help builders make their Waves", steps: [S.guideHero, S.guideSteps, S.lessons, S.teachback, S.guideApply], end: () => ({ label: "Apply To Be A Wave Guide", to: "/guide/apply" }) },
  { id: "give", label: "Give Together", note: "Find people to give your time with", steps: [S.giveSea, S.giveFlow, S.partner, S.safe], end: (c) => (c.member ? { label: "Open Give Together", to: "/give/guide" } : { label: "Start Your Give Profile", to: "/give/profile" }) },
  { id: "waves", label: "Explore Waves", note: "See the Waves in community review", steps: [S.waves, S.firstWave, S.grow, S.begin], end: () => ({ label: "Bring Your Vision", to: "/apply" }) },
  { id: "all", label: "Show me everything", note: "", steps: [S.home, S.pitch, S.guideHero, S.giveSea, S.waves, S.grow], end: () => ({ label: "What’s Your Vision?", to: "/" }) },
];

const receipts = () => { try { const r = JSON.parse(localStorage.getItem("waves-receipts") || "[]"); return Array.isArray(r) ? r.length : 0; } catch { return 0; } };
const member = () => { try { return localStorage.getItem("give-member") === "1"; } catch { return false; } };

// The step's own part of the page, once its page has arrived and finished loading.
function waitFor(route: string, selector: string, cancelled: () => boolean) {
  return new Promise<Element | null>((resolve) => {
    const t0 = performance.now();
    const tick = () => {
      if (cancelled()) return resolve(null);
      let moving = false;
      try { moving = document.documentElement.matches(":active-view-transition"); } catch { /* older browsers: no transition */ }
      const el = location.pathname === route && !moving ? document.querySelector(`main ${selector}`) : null;
      if (el && !document.querySelector("main .route-loading") && el.getBoundingClientRect().height > 0) return resolve(el);
      if (performance.now() - t0 > 9000) return resolve(null);
      setTimeout(tick, 120);
    };
    tick();
  });
}
// Resolves when the page has stopped scrolling.
function settle() {
  return new Promise<void>((resolve) => {
    let last = -1, same = 0;
    const t0 = performance.now();
    const tick = () => {
      if (scrollY === last) same++; else { same = 0; last = scrollY; }
      if (same > 6 || performance.now() - t0 > 1800) resolve(); else requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
}
// Brings a part of the page into view, high enough that the card never covers it.
async function bring(el: Element, smooth: boolean) {
  const r = el.getBoundingClientRect();
  const phone = innerWidth < 800;
  const room = phone ? innerHeight * 0.5 : innerHeight * 0.8;
  const top = phone ? 76 : 104;
  const want = r.height < room - top ? top + (room - top - r.height) * 0.35 : top;
  scrollTo({ top: Math.max(0, scrollY + r.top - want), behavior: smooth ? "smooth" : "auto" });
  await settle();
}
// Flies through a scene that plays as the page scrolls (Give's three chapters), then rests on the last one. Any
// wheel or touch hands the scroll back to you.
function flyThrough(el: Element, seconds: number, smooth: boolean, cancelled: () => boolean, raf: MutableRefObject<number>) {
  const from = el.getBoundingClientRect().top + scrollY;
  const to = from + Math.max(0, (el as HTMLElement).offsetHeight - innerHeight) * 0.93;
  if (!smooth) { scrollTo(0, to); return Promise.resolve(); }
  return new Promise<void>((resolve) => {
    const t0 = performance.now(), dur = seconds * 1000;
    const stop = () => { removeEventListener("wheel", stop); removeEventListener("touchstart", stop); cancelAnimationFrame(raf.current); resolve(); };
    addEventListener("wheel", stop, { passive: true }); addEventListener("touchstart", stop, { passive: true });
    const tick = (now: number) => {
      if (cancelled()) return stop();
      const k = Math.min(1, (now - t0) / dur);
      const e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
      scrollTo(0, from + (to - from) * e);
      if (k < 1) raf.current = requestAnimationFrame(tick); else stop();
    };
    raf.current = requestAnimationFrame(tick);
  });
}

export default function Tour({ path: initial, onEnd }: { path?: string; onEnd: () => void }) {
  const navigate = useNavigate();
  const { state, motion } = useStateStore();
  const { projects, guides } = useCommunity();
  const ctx: Ctx = { vision: state.vision.trim(), projects, guides, receipts: receipts(), member: member() };
  const [pathId, setPathId] = useState<string | null>(PATHS.some((p) => p.id === initial) ? initial! : null);
  const [i, setI] = useState(0);
  const [ready, setReady] = useState(false);
  const [lit, setLit] = useState(false);
  const [side, setSide] = useState<"right" | "left">("right");
  const ring = useRef<HTMLDivElement>(null);
  const card = useRef<HTMLDivElement>(null);
  const next = useRef<HTMLButtonElement>(null);
  const target = useRef<Element | null>(null);
  const flight = useRef(0);

  const path = PATHS.find((p) => p.id === pathId) || null;
  const steps = path?.steps || [];
  const step = path && i < steps.length ? steps[i] : null;
  const suggested = ctx.vision ? "vision" : ctx.member ? "give" : ctx.receipts ? "waves" : null;

  // The ring follows its part of the page as you scroll. Scenes that fill the screen get no ring: they are the view.
  const place = () => {
    const el = target.current, rg = ring.current;
    if (!el || !rg || !el.isConnected) return false;
    const r = el.getBoundingClientRect();
    if (r.width > innerWidth * 0.92 && Math.min(r.height, innerHeight) > innerHeight * 0.8) return false;
    const pad = innerWidth < 800 ? 8 : 14;
    rg.style.transform = `translate3d(${Math.round(r.left - pad)}px, ${Math.round(r.top - pad)}px, 0)`;
    rg.style.width = `${Math.round(r.width + pad * 2)}px`;
    rg.style.height = `${Math.round(r.height + pad * 2)}px`;
    return true;
  };

  useEffect(() => {
    setLit(false);
    if (!step) { target.current = null; setReady(true); return; }
    let cancelled = false;
    setReady(false);
    (async () => {
      if (location.pathname !== step.route) {
        const r = card.current?.getBoundingClientRect();
        go(navigate, step.route, r ? { x: r.left + r.width / 2, y: r.top + 20 } : undefined);
        await new Promise((res) => setTimeout(res, 350));   // the page change scrolls to the top as it lands
      }
      const el = await waitFor(step.route, step.target, () => cancelled);
      if (cancelled) return;
      if (!el) { setI((n) => n + 1); return; }   // nothing to show for this step here: go on
      target.current = el;
      // On the home page the intro types its own sample line; the tour asks it to stop so your draft shows.
      if (step.route === "/") dispatchEvent(new CustomEvent("waves:quiet-intro"));
      if (step.fly) { setReady(true); await flyThrough(el, step.fly, motion, () => cancelled, flight); }
      else await bring(el, motion);
      if (cancelled) return;
      sound("tour", i);
      setReady(true);
      setLit(place());
      // The card never covers what it points at: if it would, it moves to the other corner.
      const r = el.getBoundingClientRect(), c = card.current?.getBoundingClientRect();
      if (c && innerWidth >= 800) {
        const covers = (x0: number, x1: number) => Math.max(0, Math.min(r.right, x1) - Math.max(r.left, x0)) * Math.max(0, Math.min(r.bottom, innerHeight) - Math.max(r.top, innerHeight - c.height - 28));
        setSide(covers(innerWidth - 28 - c.width, innerWidth - 28) > covers(28, 28 + c.width) ? "left" : "right");
      }
      if (motion) {
        const wait = (BEAT - (clock() % BEAT)) * 1000;
        setTimeout(() => {
          if (cancelled || !el.isConnected) return;
          const r = el.getBoundingClientRect();
          mindWave({ x: r.left + Math.min(48, r.width / 2), y: Math.max(40, r.top + Math.min(48, r.height / 2)) }, 0.7);
        }, wait);
      }
    })();
    return () => { cancelled = true; cancelAnimationFrame(flight.current); };
  }, [step, navigate, motion]);

  useEffect(() => {
    if (!lit) return;
    let raf = 0;
    const update = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(() => { if (!place()) setLit(false); }); };
    addEventListener("scroll", update, { passive: true });
    addEventListener("resize", update);
    return () => { removeEventListener("scroll", update); removeEventListener("resize", update); cancelAnimationFrame(raf); };
  }, [lit]);

  // Escape ends the tour from anywhere. The arrow keys move it only while you are in the card, so they never
  // take over a gallery or a form on the page.
  useEffect(() => {
    const key = (e: KeyboardEvent) => { if (e.key === "Escape") { e.preventDefault(); onEnd(); } };
    addEventListener("keydown", key);
    return () => removeEventListener("keydown", key);
  }, [onEnd]);
  useEffect(() => { if (ready) (next.current || card.current)?.focus({ preventScroll: true }); }, [ready, i, pathId]);

  const forward = () => setI((n) => Math.min(n + 1, steps.length));
  const back = () => { if (i === 0) { setPathId(null); setI(0); } else setI((n) => n - 1); };
  const choose = (id: string) => { setPathId(id); setI(0); };
  const cardKeys = (e: React.KeyboardEvent) => {
    if (!path) return;
    if (e.key === "ArrowRight" && i < steps.length) { e.preventDefault(); forward(); }
    if (e.key === "ArrowLeft") { e.preventDefault(); back(); }
  };

  const veil = !path || !step;   // the first question and the last card dim the page; a step dims all but its part
  const title = step ? text(step.title, ctx) : null;
  const echoes = Boolean(ready && title && target.current?.textContent?.replace(/\s+/g, "").includes(title.replace(/\s+/g, "")));
  const end = path && !step ? path.end(ctx) : null;

  return (
    <div className="tour" data-veil={veil ? "on" : undefined}>
      <div ref={ring} className="tour-ring" data-on={lit && ready ? "on" : undefined} aria-hidden="true" />
      <div ref={card} tabIndex={-1} className={"tour-card" + (!path ? " is-choice" : !step ? " is-end" : "")} data-side={step ? side : undefined} role="dialog" aria-modal="false" aria-labelledby="tour-title" onKeyDown={cardKeys}>
        <button type="button" className="tour-close" aria-label="End the tour" onClick={onEnd}><X size={18} /></button>
        {!path && (
          <div className="tour-body" key="choice">
            <p className="eyebrow">Waves.Fund</p>
            <h2 id="tour-title">Where would you like to start?</h2>{/* PLACEHOLDER */}
            {ctx.vision && <p className="tour-mine">Your draft vision is saved on this device.</p>}{/* PLACEHOLDER */}
            <div className="tour-paths">
              {PATHS.filter((p) => p.id !== "all").map((p) => (
                <button type="button" key={p.id} className={"tour-path" + (p.id === suggested ? " is-suggested" : "")} onClick={() => choose(p.id)} ref={p.id === suggested ? next : undefined}>
                  <span className="tour-path-text"><b>{p.label}</b><small>{p.note}</small></span>
                  <ArrowRight size={18} aria-hidden="true" />
                </button>
              ))}
            </div>
            <button type="button" className="text-button tour-all" onClick={() => choose("all")}>Show me everything<ArrowRight size={16} /></button>{/* PLACEHOLDER */}
          </div>
        )}
        {step && (
          <div className="tour-body" key={`${pathId}-${i}`}>
            <p className="eyebrow tour-practice">{step.practice}</p>
            {echoes && text(step.line, ctx)
              ? <h2 id="tour-title" className="tour-lead">{text(step.line, ctx)}</h2>
              : <><h2 id="tour-title">{title}</h2>{text(step.line, ctx) && <p className="tour-line">{text(step.line, ctx)}</p>}</>}
            {text(step.live, ctx) && <p className="tour-live"><i aria-hidden="true" />{text(step.live, ctx)}</p>}
            {text(step.mine, ctx) && <p className="tour-mine">{text(step.mine, ctx)}</p>}
            <div className="tour-foot">
              <span className="tour-dots" role="img" aria-label={`Step ${i + 1} of ${steps.length}`}>
                {steps.map((_, k) => <i key={k} className={k === i ? "on" : k < i ? "past" : undefined} />)}
              </span>
              <span className="tour-nav">
                <button type="button" className="text-button tour-back" onClick={back}>Back</button>
                <button type="button" ref={next} className="glow-button tour-next" onClick={forward} disabled={!ready}>
                  {i === steps.length - 1 ? "Finish" : "Next"}<ArrowRight size={17} />
                </button>
              </span>
            </div>
          </div>
        )}
        {end && (
          <div className="tour-body" key="end">
            <p className="eyebrow">Waves.Fund</p>
            <h2 id="tour-title" className="tour-mantra">Trust People.<br />And They Become Trustworthy.</h2>
            <div className="tour-end">
              <button type="button" ref={next} className="glow-button" onClick={() => { onEnd(); go(navigate, end.to); }}>{end.label}<ArrowRight size={17} /></button>
              <button type="button" className="text-button" onClick={() => { setPathId(null); setI(0); }}>Take another path</button>{/* PLACEHOLDER */}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
