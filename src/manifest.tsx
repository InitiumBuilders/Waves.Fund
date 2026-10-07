import { useRef } from "react";
import type { ComponentType } from "react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { ButtonLink } from "./ui";
import { SeaHero } from "./sea-hero";
import { Circuit } from "./circuit";
import { Echo, Growing, Guided, Pair, Resonance, StandingString, Travel } from "./symbols";
import { startTour } from "./tour-launch";
import { sound } from "./sound";
import { BEAT } from "./cadence";
import type { RippleModel, Source } from "./together/ripple";
import "./manifest.css";

/* The Manifest: all of Waves.Fund on one page, read top to bottom in about five minutes.

   Whose words: August's lines are kept exactly as he wrote them (his mantra, taglines, practice names, button labels,
   the Praxis principles). Every other sentence on this page is mine, written at his request on 2026-10-07; each one
   is marked `mine` below so he can strike or replace it. */

/* One light far out on the water, the vision. Then, a beat or two apart, others come up beside it, all in step, so
   the water between them adds up and the swell grows: people joining one vision. Every eight beats a wave rises
   from the horizon and comes all the way to you. With sound on, each light rings as it comes up (one D major
   chord, a note a light). */
const together = (): RippleModel => {
  let t0: number | null = null;
  const rung = new Set<number>();
  return (t, w, h) => {
    if (t0 === null) t0 = t;
    for (let k = 0; k < 5; k++) if (!rung.has(k) && t >= t0 + (k ? k * 2 * BEAT : BEAT)) { rung.add(k); sound("land", k); }
    const lambda = Math.max(46, Math.min(116, Math.min(w, h) * 0.17));
    const at = (u: number, v: number, k: number, a: number): Source => ({ x: w * u, y: h * v, a, phase: 0, hue: 0.1 + 0.07 * k, size: 2.6 + a, born: k ? (t0 as number) + k * 2 * BEAT : -100, reach: 0.4 + 0.3 * a });
    return {
      sources: [at(0.6, 0.16, 0, 0.85), at(0.42, 0.24, 1, 0.55), at(0.78, 0.27, 2, 0.5), at(0.3, 0.34, 3, 0.45), at(0.66, 0.36, 4, 0.45)],
      lambda, speed: lambda / BEAT, gain: 1.05, dots: 14, ground: 0.92, roll: [8 * BEAT, 1],
    };
  };
};

type Chapter = { n: string; label: string; Symbol?: ComponentType<{ className?: string }> };
const Mark = ({ n, Symbol }: Omit<Chapter, "label">) => (
  <div className="mf-mark" aria-hidden="true">
    {Symbol && <Symbol className="mf-symbol" />}
    <span className="mf-number">{n}</span>
  </div>
);
const Head = ({ n, label, Symbol }: Chapter) => (
  <>
    <Mark n={n} Symbol={Symbol} />
    <p className="eyebrow">{label}</p>
  </>
);

// Practice names are his (the four tabs); the lines are mine.
const PRACTICES = [
  { title: "Learn", to: "/learn", Icon: Travel, line: "See the mission, the need, and who it serves." },
  { title: "Guide", to: "/guide", Icon: Guided, line: "Shape the work with a Wave Guide, one clear milestone at a time." },
  { title: "Give", to: "/give", Icon: ({ className }: { className?: string }) => <Pair className={className} at={[30, 130]} />, line: "Bring time, skills, your voice, or funding. Find your people and give together." },
  { title: "Grow", to: "/grow", Icon: Growing, line: "Show what changed, learn from it, and choose the next move." },
];

// mine
const LOOP = [
  "Trust someone with a real part of the work.",
  "They do it in the open, where people can see.",
  "Everyone sees what changed.",
  "More people trust, and more people join. The loop turns again, a little larger.",
];

// His: the first principles of the Wave Praxis (docs/WAVE-PRAXIS.md), titles only, word for word.
const PRINCIPLES = [
  "The builder owns the direction.",
  "Human first, adaptive by design.",
  "One home, many paths.",
  "Movement is visible when people consent.",
  "Credit follows evidence.",
  "Support does not buy control.",
  "Portable means the builder can leave.",
  "Trust is practiced, not claimed.",
];

// mine
const FIRST_MOVES = [
  "Name one thing someone could help with this week.",
  "Ask one person, by name.",
  "When it’s done, say what changed and thank them.",
  "Then choose the next move.",
];

export default function Manifest() {
  const model = useRef<RippleModel>(together());
  return (
    <div className="manifest-page">
      <SeaHero
        eyebrow="THE MANIFEST"
        model={model}
        title={<>Trust People.<br /><span>And They Become Trustworthy.</span></>}
        actions={<>
          <ButtonLink to="/apply">What’s Your Vision?</ButtonLink>
          <button type="button" className="text-button" onClick={() => startTour()}>Take The Tour <ArrowRight size={17} /></button>
        </>}
      >
        <p>Waves.Fund on one page. Read it in five minutes, then make your first move.</p>{/* mine */}
      </SeaHero>

      <div className="document-page sea-after manifest-body">
        <section className="mf-chapter arrive" aria-labelledby="mf-1">
          <Head n="01" label="THE PROBLEM" Symbol={StandingString} />
          <h2 id="mf-1">Most good ideas <span>never move.</span></h2>{/* mine */}
          <p>{/* mine */}
            A vision usually starts with one person who can see it clearly. The people who could help can’t see it yet.
            They don’t know the story, what is needed, or what changed the last time someone helped. So the idea waits.
          </p>
        </section>

        <section className="mf-chapter arrive" aria-labelledby="mf-2">
          <Head n="02" label="THE WAVE" Symbol={Travel} />
          <h2 id="mf-2">Give the vision a shape <span>people can help.</span></h2>{/* mine */}
          <p>On Waves.Fund that shape is a Wave: one home for your mission, holding three things.</p>{/* mine */}
          <ul className="mf-three">{/* the three lines of the Praxis page */}
            <li>A story people can understand.</li>
            <li>A next move people can help.</li>
            <li>An outcome people can see.</li>
          </ul>
          <p>A Wave is yours. It changes as the work changes, and it can travel.</p>{/* mine */}
        </section>

        <section className="mf-chapter arrive" aria-labelledby="mf-3">
          <Head n="03" label="WHY A WAVE" Symbol={Resonance} />
          <h2 id="mf-3">In a wave, the water stays. <span>The energy moves.</span></h2>{/* mine */}
          <p>{/* mine */}
            Watch a wave cross the sea. Each bit of water turns in a small circle, almost in place, and hands its energy
            to the next. Nothing has to travel the whole way for the wave to arrive.
          </p>
          <p>A Wave on Waves.Fund works the same way. Nobody carries all of it. Each person takes the next move and passes it on.</p>{/* mine */}
        </section>

        <section className="mf-chapter arrive" aria-labelledby="mf-4">
          <Head n="04" label="THE WAVE GUIDE" Symbol={Guided} />
          <h2 id="mf-4">A real person <span>beside you.</span></h2>{/* mine */}
          <p>{/* mine */}
            A Wave Guide builds your Wave with you. You bring the vision. Your Guide helps you shape it, build it, and
            choose the next move. In physics, a waveguide keeps a wave on course so it arrives with its strength. Our
            Guides do that for the work.
          </p>
          <Link className="text-button" to="/guide">Wave Guides <ArrowRight size={17} /></Link>
        </section>

        <section className="mf-chapter mf-wide arrive" aria-labelledby="mf-5">
          <Head n="05" label="THE PRACTICE" Symbol={Growing} />
          <h2 id="mf-5">Futures, Founded, Forged <span>And Funded Together</span></h2>
          <Circuit>
            <ol className="mf-practices">
              {PRACTICES.map(({ title, to, Icon, line }) => (
                <li className="panel" key={title}>
                  <Icon className="practice-symbol" />
                  <h3><Link to={to}>{title}</Link></h3>
                  <p>{line}</p>
                </li>
              ))}
            </ol>
          </Circuit>
        </section>

        <section className="mf-chapter arrive" aria-labelledby="mf-6">
          <Head n="06" label="GIVE TOGETHER" Symbol={({ className }) => <Pair className={className} />} />
          <h2 id="mf-6">Find Your People.<br />Give Together.<br />Build a Wave.</h2>
          <p>{/* mine */}
            Giving time counts. On Give Together you find someone who cares about what you care about. You both say yes,
            then you go and do it side by side.
          </p>
          <p className="mf-his">Give Together. Teach Together.</p>
          <p>{/* mine */}
            At a Teachback, two people teach something they know, and everyone who learns it explains it back. Then each
            of them teaches one more person.
          </p>
          <Link className="text-button" to="/give">Give Together <ArrowRight size={17} /></Link>
        </section>

        <section className="mf-chapter arrive" aria-labelledby="mf-7">
          <Head n="07" label="THE LOOP" Symbol={Echo} />
          <h2 id="mf-7">How trust <span>grows.</span></h2>{/* mine */}
          <Circuit>
            <ol className="mf-loop">
              {LOOP.map((line, i) => <li className="panel" key={line}><span className="step-number">0{i + 1}</span><p>{line}</p></li>)}
            </ol>
          </Circuit>
          <p className="mf-after">{/* mine */}
            A loop like this needs two things to keep turning: a quick answer and a result people can see. When either
            one stalls, the whole loop slows. So every Wave names its next move and shows what changed.
          </p>
        </section>

        <section className="mf-chapter arrive" aria-labelledby="mf-8">
          <Head n="08" label="WHAT WE HOLD TO" Symbol={({ className }) => <StandingString className={className} halves={1} />} />
          <h2 id="mf-8">The Wave Praxis, <span>in eight lines.</span></h2>{/* mine */}
          <ul className="mf-principles">{PRINCIPLES.map((p) => <li key={p}>{p}</li>)}</ul>
          <Link className="text-button" to="/now-lets-begin#praxis">Read The Wave Praxis <ArrowRight size={17} /></Link>
        </section>

        <section className="mf-chapter arrive" aria-labelledby="mf-9">
          <Head n="09" label="YOUR FIRST MOVE" Symbol={Travel} />
          <h2 id="mf-9">Start with <span>one move.</span></h2>{/* mine */}
          <ol className="mf-moves">{FIRST_MOVES.map((m) => <li key={m}>{m}</li>)}</ol>
        </section>

        <section className="mf-chapter arrive" aria-labelledby="mf-10">
          <Head n="10" label="WAVE ONE" Symbol={Resonance} />
          <h2 id="mf-10">The first Wave <span>is our own.</span></h2>
          <p>Waves.Fund is Wave One. We are building it in public, with the same practice we ask of every builder.</p>{/* mine */}
          <Link className="text-button" to="/now-lets-begin#wave-one">Meet Wave One <ArrowRight size={17} /></Link>
        </section>

        <section className="mf-close arrive" aria-labelledby="mf-close">
          <h2 id="mf-close">When Humanity Builds Together,<br /><span>We Change The World.</span></h2>
          <p>Built For All Lifelong Learners And Leaders Building Waves For Humanity</p>
          <div className="button-row">
            <ButtonLink to="/apply">What’s Your Vision?</ButtonLink>
            <ButtonLink to="/guide/apply" secondary>Become A Wave Guide</ButtonLink>
            <ButtonLink to="/give" secondary>Give Together</ButtonLink>
          </div>
        </section>
      </div>
    </div>
  );
}
