import { lazy, Suspense, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, ArrowUpRight, BadgeCheck, Lock, MapPin, ShieldCheck, UserCheck, Users } from "lucide-react";
import { DONATE, External } from "./ui";
import { Stock } from "./mind/WaveMind";
import { StandingString, WaveList } from "./symbols";
import { useStateStore } from "./state";
import type { RippleHandle } from "./together/ripple";
import "./together/give-landing.css";

const TankScene = lazy(() => import("./together/tank").then((m) => ({ default: m.TankScene })));
const PairScene = lazy(() => import("./together/tank").then((m) => ({ default: m.PairScene })));

// Step names are August's. The one-line descriptions are placeholders for his review.
const FLOW = [
  ["Give Profile", "Say what you want to give, what you care about, and when you are free."],
  ["Find Your Give Guide", "See people who share your causes and your time, and what you have in common."],
  ["Mutual Connection", "You both say yes. Only then can you message each other."],
  ["Shared Opportunity", "Choose something to do together: volunteering, an event, or a Teachback."],
  ["Volunteer Together", "Go and do it together."],
  ["Confirm Participation", "You each log the day. When both logs match, it is peer-confirmed."],
  ["Build Another Wave", "Thank each other with Gratus, then choose the next one."],
];
// The lines are August's statement. The smaller line under each is plain placeholder wording for his review.
const CHAPTERS = [
  { line: "Find Your People.", note: "Make a Give Profile. The people who care about what you care about appear around you." },
  { line: "Give Together.", note: "Choose one of them and both say yes." },
  { line: "Build a Wave.", note: "Choose something to do together." },
];
const SAFE: [typeof Users, string][] = [
  [UserCheck, "Adults only, 18 and over."],
  [Lock, "No messages until you both accept."],
  [MapPin, "Only your town is shown, never an address."],
  [ShieldCheck, "Report or block anyone, any time."],
  [Users, "Meet first at a staffed public place."],
  [BadgeCheck, "Listings the team has checked are marked verified."],
];
const member = () => { try { return localStorage.getItem("give-member") === "1"; } catch { return false; } };

/* Give: Give Together. The page is drawn with real wave physics. One person makes ripples; two people in
   step reinforce each other; many in step become one wave. Everything past this page is under /give/. */
export function Give() {
  const returning = member();
  const start = returning ? { to: "/give/guide", label: "Open Give Together" } : { to: "/give/profile", label: "Start Your Give Profile" };
  return (
    <div className="give-together">
      <Chapters actions={<>
        <Link className="glow-button" to={start.to}>{start.label}<ArrowRight size={18} /></Link>
        <Link className="text-button" to="/give/guide">Find Your Give Guide<ArrowRight size={17} /></Link>
      </>} />

      <div className="document-page gt-after">
        <section className="section gt-flow-section" aria-labelledby="gt-flow-title">
          <p className="eyebrow">HOW IT WORKS</p>
          <h2 id="gt-flow-title">From Your Give Profile<br /><span>To Your Next Wave</span></h2>
          <WaveList className="gt-flow" items={FLOW.map(([title, text]) => ({ title, text }))} />
        </section>

        <section className="section gt-pair" aria-labelledby="gt-what-title">
          <div className="gt-pair-text">
            <p className="eyebrow">A GIVE GUIDE</p>
            <h2 id="gt-what-title">A Friend<br /><span>You Give With</span></h2>
            <p>A Give Guide is someone who cares about the same things you do and is free when you are. You find each other here, both say yes, and give your time together.</p>
            <p>A Give Guide is not a Wave Guide. A <Link to="/guide">Wave Guide</Link> works with a builder on their Wave. A Give Guide is a peer, and you choose each other.</p>
            <Link className="glow-button" to="/give/guide">Find Your Give Guide<ArrowRight size={18} /></Link>
          </div>
          <Suspense fallback={<div className="gt-study" aria-hidden="true" />}><PairScene /></Suspense>
        </section>

        <section className="section gt-teachback-callout" aria-labelledby="gt-tb-title">
          <StandingString className="gt-tb-string" halves={3} />
          <p className="eyebrow">THE TEACHBACK</p>
          <h2 id="gt-tb-title">Give Together. Teach Together.<br /><span>Organize a teachback.</span></h2>
          <p>Teach something with your Give Guide. The people who learn it teach it back, then pass it on.</p>
          <div className="button-row">
            <Link className="glow-button" to="/give/opportunities/new?kind=teachback">Organize A Teachback<ArrowRight size={18} /></Link>
            <Link className="text-button" to="/guide/teachback">Read The Teachback<ArrowRight size={17} /></Link>
          </div>
        </section>

        <section className="section gt-partner" aria-labelledby="gt-partner-title">
          <div className="panel gt-partner-card">
            <p className="eyebrow gt-partner-label">Wave Partner of the month</p>
            <h2 id="gt-partner-title">The Green Reef Foundation</h2>
            <img className="giving-logo" src="/media/green-reef-logo.webp" alt="The Green Reef Foundation" />
            <p>Give directly to The Green Reef Foundation through its Benevity donation page.</p>
            <div className="button-row">
              <External href={DONATE} className="glow-button">Give To Green Reef</External>
              <Link className="text-button" to="/guide/partners/green-reef">About The Foundation<ArrowRight size={17} /></Link>
            </div>
            <p className="fine-print">
              You will continue to Benevity. The Foundation and its giving provider handle your donation and receipt.
              This supports the Foundation’s mission; project-specific awards require a separate agreement.
            </p>
            <Stock level={0.34} />
          </div>
        </section>

        <section className="section gt-safe" aria-labelledby="gt-safe-title">
          <p className="eyebrow">PRIVACY, SAFETY & SIMPLICITY</p>
          <h2 id="gt-safe-title">How We Keep It Safe</h2>
          <ul className="gt-safe-list">
            {SAFE.map(([Icon, text]) => <li key={text}><span className="gt-safe-icon"><Icon size={19} strokeWidth={1.7} aria-hidden="true" /></span><span>{text}</span></li>)}
          </ul>
          <p className="fine-print">Hours you log together are peer-confirmed, not verified by a host organization. Gratus points are private thanks with no money value. There are no public scores or rankings. <Link to="/privacy">Privacy & Participation<ArrowUpRight size={13} aria-hidden="true" /></Link></p>
        </section>

        <section className="section gt-principle" aria-label="Principle">
          <div className="gt-front" aria-hidden="true"><i /><i /><i /></div>
          <p>Build The Difference. Give Together.</p>
          <Link className="glow-button" to={start.to}>{start.label}<ArrowRight size={18} /></Link>
        </section>
      </div>
    </div>
  );
}

/* The first scene, in three chapters that follow the scroll. The words are here so they paint at once;
   the ripples load a moment later. */
function Chapters({ actions }: { actions: ReactNode }) {
  const section = useRef<HTMLElement>(null);
  const progress = useRef(0);
  const handle = useRef<RippleHandle | null>(null);
  const [chapter, setChapter] = useState(0);
  const { motion } = useStateStore();
  useEffect(() => {
    let current = -1;
    const onScroll = () => {
      const el = section.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const run = Math.max(1, r.height - innerHeight);
      progress.current = Math.min(2.999, Math.min(1, Math.max(0, -r.top / run)) * 3);
      const ch = Math.min(2, Math.floor(progress.current + 0.2));
      if (ch !== current) { current = ch; setChapter(ch); }
      if (!motion) handle.current?.redraw();
    };
    onScroll();
    addEventListener("scroll", onScroll, { passive: true });
    addEventListener("resize", onScroll);
    return () => { removeEventListener("scroll", onScroll); removeEventListener("resize", onScroll); };
  }, [motion]);
  return (
    <section ref={section} className="gt-tank" aria-label="Find Your People. Give Together. Build a Wave.">
      <div className="gt-tank-stage" data-window>
        <Suspense fallback={<div className="ripple gt-tank-scene" aria-hidden="true" />}><TankScene progress={progress} handle={handle} /></Suspense>
        <div className="gt-tank-copy">
          <p className="eyebrow">GIVE</p>
          <h1>Give Together</h1>
          <ol className="gt-chapters">
            {CHAPTERS.map((c, i) => (
              <li key={c.line} className={i === chapter ? "is-now" : i < chapter ? "is-past" : ""} aria-current={i === chapter ? "step" : undefined}>
                <span className="gt-chapter-line">{c.line}</span>
                <span className="gt-chapter-note">{c.note}</span>
              </li>
            ))}
          </ol>
          <div className="gt-tank-actions">{actions}</div>
        </div>
        <div className="gt-chapter-dots" aria-hidden="true">{CHAPTERS.map((c, i) => <i key={c.line} className={i === chapter ? "on" : i < chapter ? "past" : ""} />)}</div>
      </div>
    </section>
  );
}
