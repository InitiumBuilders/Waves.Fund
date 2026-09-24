import { lazy, Suspense } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, BadgeCheck, HandHeart, Lock, MapPin, ShieldCheck, UserCheck, Users } from "lucide-react";
import { DONATE, External } from "./ui";
import { Stock } from "./mind/WaveMind";
import "./together/give-landing.css";

const GiveScene = lazy(() => import("./together/scene").then((m) => ({ default: m.GiveScene })));

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
const SAFE: [typeof Users, string][] = [
  [UserCheck, "Adults only, 18 and over."],
  [Lock, "No messages until you both accept."],
  [MapPin, "Only your town is shown, never an address."],
  [ShieldCheck, "Report or block anyone, any time."],
  [Users, "Meet first at a staffed public place."],
  [BadgeCheck, "Listings the team has checked are marked verified."],
];
const member = () => { try { return localStorage.getItem("give-member") === "1"; } catch { return false; } };

/* Give: Give Together. Find people who care about the same things, connect by mutual consent, and give
   your time together. Everything past this page lives under /give/ (src/together). */
export function Give() {
  const returning = member();
  return (
    <div className="give-together document-page">
      <header className="page-intro has-mind gt-hero">
        <div className="intro-text">
          <p className="eyebrow">GIVE</p>
          <h1>Give <span>Together</span></h1>
          <div className="intro-description"><p>Find Your People. Give Together. Build a Wave.</p></div>
          <div className="button-row intro-actions">
            {returning
              ? <Link className="glow-button" to="/give/guide">Open Give Together<ArrowRight size={18} /></Link>
              : <Link className="glow-button" to="/give/profile">Start Your Give Profile<ArrowRight size={18} /></Link>}
            <Link className="text-button" to="/give/guide">Find Your Give Guide<ArrowRight size={17} /></Link>
          </div>
        </div>
        <Suspense fallback={<div className="gt-scene gt-hero-scene" aria-hidden="true" />}>
          <GiveScene variant="hero" className="gt-hero-scene" />
        </Suspense>
      </header>

      <section className="section gt-flow-section" aria-labelledby="gt-flow-title">
        <p className="eyebrow">HOW IT WORKS</p>
        <h2 id="gt-flow-title">From Your Give Profile<br /><span>To Your Next Wave</span></h2>
        <ol className="gt-flow">
          {FLOW.map(([title, text], i) => (
            <li key={title}>
              <span className="step-number">{String(i + 1).padStart(2, "0")}</span>
              <h3>{title}</h3>
              <p>{text}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="section gt-guide-explain" aria-labelledby="gt-what-title">
        <div className="panel gt-explain">
          <p className="eyebrow">A GIVE GUIDE</p>
          <h2 id="gt-what-title">A Friend You Give With</h2>
          <p>A Give Guide is someone who cares about the same things you do and is free when you are. You find each other here, both say yes, and give your time together.</p>
          <p>A Give Guide is not a Wave Guide. A <Link to="/guide">Wave Guide</Link> works with a builder on their Wave. A Give Guide is a peer, and you choose each other.</p>
          <Link className="glow-button" to="/give/guide">Find Your Give Guide<ArrowRight size={18} /></Link>
          <Stock level={0.22} />
        </div>
      </section>

      <section className="section gt-teachback-callout" aria-labelledby="gt-tb-title">
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
          {SAFE.map(([Icon, text]) => <li key={text}><Icon size={20} strokeWidth={1.7} aria-hidden="true" /><span>{text}</span></li>)}
        </ul>
        <p className="fine-print">Hours you log together are peer-confirmed, not verified by a host organization. Gratus points are private thanks with no money value. There are no public scores or rankings. <Link to="/privacy">Privacy & Participation</Link></p>
      </section>

      <section className="section gt-principle" aria-label="Principle">
        <HandHeart size={26} strokeWidth={1.5} aria-hidden="true" />
        <p>Build The Difference. Give Together.</p>
        <Link className="glow-button" to={returning ? "/give/guide" : "/give/profile"}>{returning ? "Open Give Together" : "Start Your Give Profile"}<ArrowRight size={18} /></Link>
      </section>
    </div>
  );
}
