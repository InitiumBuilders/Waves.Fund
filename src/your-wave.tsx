import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { Check, Share2 } from "lucide-react";
import type { MutableRefObject } from "react";
import type { RippleModel, Source } from "./together/ripple";
import { hash } from "./together/ripple";
import { BEAT } from "./cadence";
import { sound } from "./sound";
import { waveTypeLabel } from "./community";
import "./your-wave.css";

const Sea = lazy(() => import("./together/sea").then((m) => ({ default: m.Sea })));

/* Your Wave: the Wave a builder is writing, drawn while they write it, the way its public page will look. It has its
   own water and one light far out. The light grows with the story; each part that lands (the name, the story, the
   first move) rises from it once as a ripple, and rings with sound on. The first move is a second light, nearer the
   shore, in step with the first: a next move people can reach. When the application is sent, a wave rises from the
   horizon and comes all the way in. Nothing here is stored anywhere but this browser. */
export type YourWaveParts = { title: string; story: string; move: string; sent: boolean; ground: number; hue?: number };
const PARTS = ["title", "story", "move", "sent"] as const;

export function yourWaveModel(parts: MutableRefObject<YourWaveParts>): RippleModel {
  let t0: number | null = null, last = 0, level = 0.2;
  const landed: Record<(typeof PARTS)[number], number> = { title: -1, story: -1, move: -1, sent: -1 };
  return (t, w, h) => {
    if (t0 === null) { t0 = t; last = t; }
    const p = parts.current;
    const has = { title: p.title.trim().length > 0, story: p.story.trim().length >= 20, move: p.move.trim().length > 0, sent: p.sent };
    PARTS.forEach((k, i) => {
      if (has[k] && landed[k] < 0) {
        landed[k] = t;
        // A draft restored as the page opens is already there; it does not ring.
        if (t - t0! > 0.6) sound("light", i);
      } else if (!has[k]) landed[k] = -1;
    });
    const target = 0.22 + (has.title ? 0.2 : 0) + 0.26 * Math.min(1, p.story.trim().length / 320) + (has.move ? 0.14 : 0) + (has.sent ? 0.16 : 0);
    const dt = Math.min(0.1, Math.max(0, t - last)); last = t;
    level += (target - level) * Math.min(1, dt * 1.6);
    const lambda = Math.max(40, Math.min(100, Math.min(w, h) * 0.2));
    const hue = p.hue ?? 0.1 + 0.5 * hash(p.title.trim().toLowerCase() || "your wave");
    const x = w * 0.5, y = h * 0.24;
    const sources: Source[] = [{ x, y, a: level, phase: 0, hue, size: 2.4 + level * 2.2, born: -100, reach: 0.28 + 0.5 * level }];
    for (const k of PARTS) {
      const at = landed[k], age = t - at;
      if (at < 0 || age < 0 || age > 4) continue;
      sources.push({ x, y, a: 0.85 * (1 - age / 4), phase: 0, hue, size: 2, born: at, reach: 0.72 });
    }
    if (has.move) sources.push({ x, y: h * 0.56, a: 0.42, phase: 0, hue: hue + 0.05, size: 2.6, born: landed.move, reach: 0.4 });
    return { sources, lambda, speed: lambda / BEAT, gain: 1.05, dots: 14, ground: p.ground, ...(has.sent ? { roll: [8 * BEAT, 0.85] as [number, number] } : {}) };
  };
}

/* The builder's draft, kept in this browser so a Wave being written survives a reload. The vision typed on the home
   page is the start of its story. */
const DRAFT = "waves-wave-draft";
export type WaveDraft = { title: string; story: string; move: string; waveType: string };
export function readDraft(): WaveDraft {
  try {
    const d = JSON.parse(localStorage.getItem(DRAFT) || "null");
    const s = (v: unknown, n: number) => (typeof v === "string" ? v.slice(0, n) : "");
    return { title: s(d?.title, 120), story: s(d?.story, 2500), move: s(d?.move, 700), waveType: s(d?.waveType, 40) };
  } catch {
    return { title: "", story: "", move: "", waveType: "" };
  }
}
export function saveDraft(d: WaveDraft) {
  try {
    if (!d.title.trim() && !d.story.trim() && !d.move.trim()) localStorage.removeItem(DRAFT);
    else localStorage.setItem(DRAFT, JSON.stringify(d));
  } catch { /* storage blocked: the draft lasts this visit */ }
}

/* A Wave once sent, kept in this browser beside its receipt, so Grow can show the builder their Wave while it is in
   review. Only the newest few are kept. */
const SENT = "waves-sent-waves";
export type SentWave = { id: string; title: string; story: string; move: string; waveType: string };
export function rememberSent(w: SentWave) {
  try {
    const list = sentWaves().filter((x) => x.id !== w.id);
    localStorage.setItem(SENT, JSON.stringify([...list, w].slice(-5)));
  } catch { /* storage blocked: the receipt still holds the title */ }
}
export function sentWaves(): SentWave[] {
  try {
    const d = JSON.parse(localStorage.getItem(SENT) || "[]");
    return Array.isArray(d) ? d.filter((w) => w && typeof w.id === "string" && typeof w.title === "string") : [];
  } catch { return []; }
}

/* Shape It Together: a builder sends their draft Wave to one person as a link. The words ride in the link's fragment
   (after the #), which a browser never sends to any server; the other person opens the application with the Wave
   filled in, shapes it, and can send it back the same way. Name and email never travel. */
const b64 = (o: unknown) => { const bytes = new TextEncoder().encode(JSON.stringify(o)); let s = ""; bytes.forEach((b) => (s += String.fromCharCode(b))); return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, ""); };
const unb64 = (t: string) => { const s = atob(t.replace(/-/g, "+").replace(/_/g, "/")); return JSON.parse(new TextDecoder().decode(Uint8Array.from(s, (c) => c.charCodeAt(0)))); };
export function shareLink(d: WaveDraft) {
  return `${window.location.origin}/apply#wave=${b64({ t: d.title.slice(0, 120), s: d.story.slice(0, 2500), m: d.move.slice(0, 700), w: d.waveType.slice(0, 40) })}`;
}
export function readShared(): WaveDraft | null {
  try {
    const m = /[#&]wave=([A-Za-z0-9_-]+)/.exec(window.location.hash); if (!m) return null;
    const o = unb64(m[1]), s = (v: unknown, n: number) => (typeof v === "string" ? v.slice(0, n) : "");
    const d = { title: s(o?.t, 120), story: s(o?.s, 2500), move: s(o?.m, 700), waveType: s(o?.w, 40) };
    return d.title || d.story || d.move ? d : null;
  } catch { return null; }
}
export function clearShared() { try { history.replaceState(history.state, "", window.location.pathname + window.location.search); } catch { /* the link stays as it was */ } }
export function ShapeTogether({ draft }: { draft: WaveDraft }) {
  const [done, setDone] = useState(false);
  const ready = Boolean(draft.title.trim() || draft.story.trim());
  useEffect(() => { setDone(false); }, [draft.title, draft.story, draft.move, draft.waveType]);
  const send = async () => {
    const url = shareLink(draft);
    try {
      // a phone hands the link to its share sheet; a desktop copies it, ready to paste into a message
      if (navigator.share && matchMedia("(pointer: coarse)").matches) await navigator.share({ title: `${draft.title.trim() || "A Wave"} · Waves.Fund`, url });
      else { await navigator.clipboard.writeText(url); setDone(true); }
    } catch { /* the person closed the share sheet */ }
  };
  return (
    <div className="yw-shape">
      <button type="button" className="text-button yw-shape-button" onClick={send} disabled={!ready}>
        {done ? <Check size={17} /> : <Share2 size={17} />}{done ? "Link Copied" : "Shape It Together"}
      </button>
      <p className="yw-shape-note">Send your Wave to one person to shape it with you.</p>
    </div>
  );
}

export function useWide(query = "(min-width: 1100px)") {
  const [wide, setWide] = useState(() => matchMedia(query).matches);
  useEffect(() => {
    const m = matchMedia(query), on = () => setWide(m.matches);
    m.addEventListener("change", on);
    return () => m.removeEventListener("change", on);
  }, [query]);
  return wide;
}

// `inPanel`: the Wave stands inside a panel (the form on a phone, the receipt), so its water draws only its light and
// lattice and lets the panel show through, instead of laying the page's night over it.
export function YourWave({ title, story, move, waveType, sent = false, inPanel = false, shape = false, className = "" }: {
  title: string; story: string; move: string; waveType?: string; sent?: boolean; inPanel?: boolean; shape?: boolean; className?: string;
}) {
  const ground = inPanel ? 0 : 0.92;
  const parts = useRef<YourWaveParts>({ title, story, move, sent, ground });
  parts.current = { title, story, move, sent, ground };
  const model = useRef<RippleModel>(yourWaveModel(parts));
  const label = waveTypeLabel(waveType);
  return (
    <section className={`yw ${sent ? "yw-sent " : ""}${className}`} aria-label="Your Wave">
      <div className="yw-sea">
        <Suspense fallback={<div className="ripple yw-scene" aria-hidden="true" />}>
          <Sea model={model} className="yw-scene" maxDpr={1.25} still={4.5} aria-hidden="true" />
        </Suspense>
      </div>
      <div className="yw-copy">
        <p className="eyebrow">{label ? label.toUpperCase() : "A WAVE ON WAVES.FUND"}</p>
        {title.trim() ? <h2 className="yw-title">{title}</h2> : <span className="yw-bar yw-bar-title" aria-hidden="true" />}
        <p className="yw-mantra">Trust People. And They Become Trustworthy.</p>
        <p className="eyebrow yw-label">THE STORY</p>
        {story.trim() ? <p className="yw-story">{story}</p> : <span className="yw-bars" aria-hidden="true"><i /><i /><i /></span>}
        <p className="eyebrow yw-label">THE CURRENT MOVE</p>
        {move.trim() ? <p className="yw-move">{move}</p> : <span className="yw-bars" aria-hidden="true"><i /><i /></span>}
        {shape && <ShapeTogether draft={{ title, story, move, waveType: waveType || "" }} />}
      </div>
    </section>
  );
}

/* Your Guide card: a Wave Guide applicant sees themselves the way a Guide appears on a Wave's page, on their own
   water, with the violet light the Guide carries beside a builder's. */
export function YourGuide({ name, bio, inPanel = false, className = "" }: { name: string; bio: string; inPanel?: boolean; className?: string }) {
  const ground = inPanel ? 0 : 0.92;
  const parts = useRef<YourWaveParts>({ title: name, story: bio, move: "", sent: false, ground, hue: 0.85 });
  parts.current = { title: name, story: bio, move: "", sent: false, ground, hue: 0.85 };
  const model = useRef<RippleModel>(yourWaveModel(parts));
  return (
    <section className={`yw yw-guide ${className}`} aria-label="Your Wave Guide card">
      <div className="yw-sea">
        <Suspense fallback={<div className="ripple yw-scene" aria-hidden="true" />}>
          <Sea model={model} className="yw-scene" maxDpr={1.25} still={4.5} aria-hidden="true" />
        </Suspense>
      </div>
      <div className="yw-copy">
        <p className="eyebrow">YOUR WAVE GUIDE</p>
        {name.trim() ? <h2 className="yw-title">{name}</h2> : <span className="yw-bar yw-bar-title" aria-hidden="true" />}
        {bio.trim() ? <p className="yw-story">{bio}</p> : <span className="yw-bars" aria-hidden="true"><i /><i /><i /></span>}
      </div>
    </section>
  );
}
