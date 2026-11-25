import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { useParams } from "react-router-dom";
import { ArrowRight, ArrowUpRight, Check, Share2, ShieldCheck } from "lucide-react";
import { ButtonLink } from "./ui";
import { SeaHero } from "./sea-hero";
import { takeZoom } from "./zoom";
import { toggleDay } from "./day-zoom";
import { BEAT, still as stillMotion } from "./cadence";
import { sound } from "./sound";
import { mindWave } from "./mind/WaveMind";
import { PublicWave, waveSea } from "./public-wave";
import { asPublicWave, byDay, commitUrl, foundingWave } from "./founding";
import type { FoundingWave } from "./founding";
import { waveRequest } from "./workspace-client";
import { compareMoves, publicHistory } from "./record-check";
import type { MoveState } from "./record-check";
import type { RippleModel } from "./together/ripple";
import type { PublicWave as PublicWaveRecord } from "./workspace-types";
import "./founding-wave.css";

const WORKSPACE_ON = import.meta.env.VITE_WORKSPACE_ENABLED === "true";

/* /waves/:slug. A founding Wave stands at its address until a Wave published from the workspace takes it. While the
   workspace is on, the list of published Waves says whether one has (asking for the Wave itself would answer 404
   until then, and leave an error in the console of a page that is fine). */
export default function WavePage() {
  const { slug = "" } = useParams();
  const founding = foundingWave(slug);
  const [taken, setTaken] = useState(false);
  useEffect(() => {
    setTaken(false);
    if (!founding || !WORKSPACE_ON) return;
    let active = true;
    waveRequest<{ waves?: PublicWaveRecord[] }>("").then((r) => { if (active) setTaken(Boolean(r.waves?.some((w) => w.slug === slug))); }).catch(() => {});
    return () => { active = false; };
  }, [slug, founding]);
  if (!founding) return <PublicWave />;
  const page = <FoundingWavePage wave={founding} />;
  return taken ? <PublicWave fallback={page} /> : page;
}

const day = (d: string) => new Date(d + "T12:00:00Z").toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
const mail = (to: string, subject: string) => `mailto:${to}?subject=${encodeURIComponent(subject)}`;

function FoundingWavePage({ wave }: { wave: FoundingWave }) {
  const [shared, setShared] = useState(false);
  const current = useRef<PublicWaveRecord | null>(null);
  if (!current.current) current.current = asPublicWave(wave);
  const model = useRef<RippleModel>(waveSea(current));
  const [arriveAt] = useState(() => (takeZoom(`/waves/${wave.slug}`) ? 0 : undefined));
  // Arriving at a part of the page (the Wave One card links to #trustbase): the page is lazy, so go there once it stands.
  useEffect(() => {
    const id = window.location.hash.slice(1);
    if (!id) return;
    const timer = window.setTimeout(() => document.getElementById(id)?.scrollIntoView({ block: "start" }), 450);
    return () => clearTimeout(timer);
  }, []);
  const share = async () => {
    const url = `${window.location.origin}/waves/${wave.slug}`;
    try {
      if (navigator.share) await navigator.share({ title: wave.title, url });
      else { await navigator.clipboard.writeText(url); setShared(true); }
    } catch { setShared(false); }
  };
  return (
    <div className="public-wave fw" data-no-swipe>
      <SeaHero
        eyebrow={wave.number}
        model={model}
        arriveAt={arriveAt}
        title={wave.title}
        actions={<>
          <a className="glow-button" href="#next-move">Offer Your Help <ArrowRight size={18} /></a>
          <button type="button" className="text-button" onClick={share}>{shared ? <Check size={17} /> : <Share2 size={17} />}{shared ? "Link Copied" : "Share This Wave"}</button>
        </>}
      >
        <p>Trust People. And They Become Trustworthy.</p>
      </SeaHero>
      <div className="document-page sea-after pw-body">
        <section className="pw-chapter arrive">
          <p className="eyebrow">THE STORY</p>
          <h2>{wave.story.heading[0]}<br />{wave.story.heading[1]}</h2>
          <p className="pw-story">{wave.story.body}</p>
          <div className="pw-guide">
            <span className="eyebrow">{wave.guide.role.toUpperCase()}</span>
            <h3>{wave.guide.name}</h3>
            <p>{wave.guide.bio}</p>
            <p className="fw-mantra">{wave.guide.mantra}</p>
          </div>
        </section>

        <section className="pw-chapter arrive" id="next-move">
          <p className="eyebrow">THE NEXT MOVE</p>
          <div className="panel pw-move fw-move">
            <span className="workspace-badge">{wave.move.kicker}</span>
            <h2>{wave.move.title[0]}<br />{wave.move.title[1]}</h2>
            <p>{wave.move.body}</p>
            <ul className="fw-ways">
              {wave.move.links.map((link, i) => (
                <li key={link.to}><ButtonLink to={link.to} secondary={i > 0}>{link.label}</ButtonLink><span>{link.note}</span></li>
              ))}
            </ul>
            <p className="fw-detail">{wave.move.detail}</p>
            <a className="text-button" href={mail(wave.contact, "Build My Wave")}>Work With August <ArrowUpRight size={16} /></a>
          </div>
        </section>

        <TrustBase wave={wave} />

        <section className="pw-close arrive">
          <h2>Build Your Own Wave.</h2>
          <p>A Wave Guide works with you to design, build, and evolve the tools and story your mission needs. Begin with your vision, then agree your scope and fee together.</p>
          <div className="button-row"><ButtonLink to="/apply">Bring Your Vision</ButtonLink><ButtonLink to="/guide/library" secondary>Explore The Guide Library</ButtonLink></div>
        </section>
      </div>
    </div>
  );
}

/* The TrustBase: what a Wave can show for itself. Its moves, the people whose help is part of it, and what people
   say about it in their own words.

   Each day's moves rest on a band of fine lines, one line for each move, so the days stack like layers of ground.
   As a day comes into view a wave travels along the top of its band and settles flat into it: a wave that was kept
   becomes ground. Checking asks GitHub for the public history from this browser and the answer comes down through
   the days, a fifth of a beat apart; with sound on each day that matches adds a note, so a changed one is a
   missing note. */
const moveWords: Record<Exclude<MoveState, "match">, string> = { edited: "Its words differ from the commit.", missing: "Not in the public code." };
function TrustBase({ wave }: { wave: FoundingWave }) {
  const days = useMemo(() => byDay(wave.moves), [wave]);
  const starts = useMemo(() => { let at = 0; return days.map((d) => { const s = at; at += d.moves.length; return s; }); }, [days]);
  const [states, setStates] = useState<MoveState[] | null>(null), [shown, setShown] = useState(0), [checking, setChecking] = useState(false), [failed, setFailed] = useState(false);
  const root = useRef<HTMLElement>(null), button = useRef<HTMLButtonElement>(null);
  const total = wave.moves.length;
  const changedIn = (i: number) => (states ? states.slice(starts[i], starts[i] + days[i].moves.length).filter((s) => s !== "match").length : 0);

  // Where the browser cannot tie an animation to the scroll, each day's wave settles once, when the day is reached.
  useEffect(() => {
    const el = root.current;
    if (!el || CSS.supports("animation-timeline: view()") || !("IntersectionObserver" in window)) return;
    el.classList.add("tb-timed");
    const seen = new IntersectionObserver((entries) => {
      for (const e of entries) if (e.isIntersecting) { e.target.classList.add("tb-in"); seen.unobserve(e.target); }
    }, { rootMargin: "0px 0px -12% 0px" });
    el.querySelectorAll(".tb-day").forEach((d) => seen.observe(d));
    return () => { seen.disconnect(); el.classList.remove("tb-timed"); };
  }, [days]);

  useEffect(() => {
    if (!states) return;
    if (stillMotion()) { setShown(days.length); setChecking(false); return; }
    let k = 0;
    const id = setInterval(() => {
      if (!changedIn(k)) sound("land", k);
      k++; setShown(k);
      if (k < days.length) return;
      clearInterval(id); setChecking(false);
      // Every move matched: the ground under the page answers, from where the check was asked.
      if (states.every((s) => s === "match") && button.current) mindWave(button.current, 1);
    }, BEAT * 200);
    return () => clearInterval(id);
  }, [states]);

  const check = async () => {
    setChecking(true); setFailed(false); setStates(null); setShown(0);
    try { setStates(compareMoves(wave.moves, await publicHistory(wave.repo, wave.moves))); }
    catch { setFailed(true); setChecking(false); }
  };
  const done = Boolean(states) && shown >= days.length;
  const changed = states?.filter((s) => s !== "match").length || 0;

  return (
    <section className="pw-chapter tb" id="trustbase" ref={root} aria-labelledby="tb-title">
      <p className="eyebrow">THE TRUSTBASE</p>
      <h2 id="tb-title">Every Move, In The Open.</h2>
      <p className="tb-lede">{total} moves so far. Each one links to its commit in the public code.</p>
      <div className="tb-check">
        <p>Check each one in your own browser, against the public history on GitHub.</p>
        <button type="button" className="workspace-button secondary" disabled={checking} onClick={check} ref={button}>{checking ? "Checking…" : "Check The Record"}<ShieldCheck size={17} /></button>
        {/* The answer has its place from the start, so the list does not move when it arrives. */}
        <p className="tb-result" role="status">{failed ? "GitHub did not answer. Each move still links to its commit." : done ? (changed ? `${changed} of ${total} moves ${changed === 1 ? "does" : "do"} not match the public code.` : `All ${total} moves match the public code.`) : ""}</p>
      </div>

      <ol className="tb-days">
        {days.map((d, i) => {
          const reached = Boolean(states) && i < shown, bad = reached ? changedIn(i) : 0;
          const link = (m: (typeof d.moves)[number], k: number) => {
            const state = reached ? states![starts[i] + k] : null;
            return <>
              <a href={commitUrl(wave, m)} target="_blank" rel="noreferrer">{m.move}<span className="sr-only"> (opens the commit on GitHub)</span></a>
              {state && state !== "match" && <span className="tb-move-state">{moveWords[state]}</span>}
            </>;
          };
          const head = <>
            <time dateTime={d.date}>{day(d.date)}</time>
            <span className="tb-count">{d.moves.length === 1 ? "1 move" : `${d.moves.length} moves`}</span>
            {reached && <span className="tb-state">{bad ? `${bad} changed.` : "Matches."}</span>}
          </>;
          return (
            <li className={`tb-day${reached ? (bad ? " tb-reached" : " tb-reached tb-ok") : ""}`} key={d.date} style={{ "--n": d.moves.length } as CSSProperties}>
              {d.moves.length === 1 ? (
                <div className="tb-one"><div className="tb-head">{head}</div><p className="tb-first">{link(d.moves[0], 0)}</p></div>
              ) : (
                <details open={bad > 0 || undefined}>
                  {/* A day opens into its moves and closes back into the day as a zoom (src/day-zoom.ts). */}
                  <summary onClick={(e) => { e.preventDefault(); toggleDay(e.currentTarget.parentElement as HTMLDetailsElement); }}><span className="tb-head">{head}</span><span className="tb-first">{d.moves[0].move}</span></summary>
                  <ol className="tb-moves">{d.moves.map((m, k) => <li key={m.sha}>{link(m, k)}</li>)}</ol>
                </details>
              )}
              <span className="tb-ground" aria-hidden="true">
                <i className="tb-wave" /><i className="tb-lines" />
                {/* One light for each line, so each move answers for itself: a move that does not match stays dark. */}
                {d.moves.map((m, k) => <b key={m.sha} className={reached && states![starts[i] + k] === "match" ? "tb-ray tb-lit" : "tb-ray"} style={{ "--k": k } as CSSProperties} />)}
              </span>
            </li>
          );
        })}
      </ol>

      <a className="text-button tb-code" href={`${wave.repo}/commits/main`} target="_blank" rel="noreferrer">Open The Public Code <ArrowUpRight size={16} /></a>

      <div className="tb-people">
        <p className="eyebrow">THE PEOPLE MOVING IT FORWARD</p>
        <h3>Contributions &amp; Carrying</h3>
        {wave.people.length
          ? wave.people.map((p) => <article className="workspace-entry" key={p.name}><h4>{p.name}</h4><p>{p.did}</p>{p.evidence && <a className="text-button" href={p.evidence} target="_blank" rel="noreferrer">View Evidence <ArrowRight size={16} /></a>}</article>)
          : <p>Agreed contributions and outcomes will appear here with permission. Each person’s help becomes part of the Journey.</p>}
        <p className="fine-print">{wave.ownership}</p>
      </div>

      <div className="tb-words">
        <p className="eyebrow">IN THEIR OWN WORDS</p>
        {wave.words.length
          ? wave.words.map((w) => <figure key={w.name + w.date}><blockquote>{w.words}</blockquote><figcaption>{w.name} · <time dateTime={w.date}>{day(w.date)}</time></figcaption></figure>)
          : <p>The first words will appear here.</p>}
        <a className="text-button" href={mail(wave.contact, `My words for ${wave.title}`)}>Add Your Words <ArrowRight size={16} /></a>
        <p className="fine-print">Your mail app opens a note to August. With your yes, your words are added here as you wrote them, in a public commit.</p>
      </div>
    </section>
  );
}
