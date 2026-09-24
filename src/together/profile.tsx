import { useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, LocateFixed } from "lucide-react";
import { CAUSES, Choices, GIVES, Loading, Problem, SENTIMENTS, Switch, TIMES, Tags, WAYS, useCall, useMe } from "./core";
import type { Me, Profile, Shares, Where } from "./core";
import { mindWave } from "../mind/WaveMind";

type Draft = {
  name: string; gives: string[]; causes: string[]; causeOther: string; times: string[]; ways: string[]; skills: string[];
  teach: string[]; learn: string[]; availability: string; place: string; lat: number | null; lng: number | null; nearby: boolean;
  statement: string; shares: Shares; seeking: boolean; adult: boolean;
};
function start(p: Profile | null | undefined, where?: Where): Draft {
  return {
    name: p?.name || "", gives: p?.gives || [], causes: p?.causes || [], causeOther: p?.causeOther || "", times: p?.times || [],
    ways: p?.ways || [], skills: p?.skills || [], teach: p?.teach || [], learn: p?.learn || [], availability: p?.availability || "",
    place: p?.place || where?.place || "", lat: p?.located ? p.lat : where?.lat ?? null, lng: p?.located ? p.lng : where?.lng ?? null,
    nearby: p ? p.located : where?.lat != null,
    statement: p?.statement || "", shares: p?.shares || { place: true, statement: true, skills: true, teach: true },
    seeking: p ? p.seeking : true, adult: p?.adult || false,
  };
}

const STEPS = ["give", "help", "when", "how", "where", "statement", "you"] as const;
type Step = (typeof STEPS)[number];

/* The Give Profile. New profiles walk one question at a time, and every question can be skipped.
   An existing profile opens with every question on one page to edit. */
export default function ProfilePage() {
  const { me } = useMe();
  // The form starts from the saved profile, so it waits for it.
  if (!me) return <Loading />;
  return <ProfileForm key={me.profile?.ref || "new"} me={me} />;
}

function ProfileForm({ me }: { me: Me }) {
  const { setMe } = useMe();
  const call = useCall();
  const navigate = useNavigate();
  const { state } = useLocation() as { state: { from?: string } | null };
  const existing = me?.profile;
  const [draft, setDraft] = useState<Draft>(() => start(existing, me?.where));
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [locating, setLocating] = useState(false);
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => { setDraft((d) => ({ ...d, [k]: v })); setSaved(false); };

  async function save(event?: FormEvent) {
    event?.preventDefault();
    setError("");
    if (draft.name.trim().length < 2) { setError("Choose a display name of at least two characters."); return; }
    if (!draft.adult) { setError("Give Together is for adults, 18 and over. Please confirm your age."); return; }
    setBusy(true);
    try {
      // Coordinates come from your connection or your device, rounded to about 10 km, and only if you keep "near me" on.
      const useCoords = draft.nearby && draft.lat != null && draft.lng != null;
      const body = { ...draft, lat: useCoords ? draft.lat : null, lng: useCoords ? draft.lng : null };
      const out = await call<{ profile: Profile }>("profile.save", body);
      setMe({ ...me, profile: out.profile });
      setSaved(true);
      mindWave(document.querySelector(".gt-save") || { x: innerWidth / 2, y: innerHeight / 2 }, 0.9);
      if (!existing) navigate(state?.from && state.from !== "/give/profile" ? state.from : "/give/guide", { state: { fresh: true } });
    } catch (e) { setError((e as Error).message); }
    finally { setBusy(false); }
  }

  function locate() {
    if (!navigator.geolocation) { setError("This browser cannot share a location. You can still type your town."); return; }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => { setDraft((d) => ({ ...d, lat: Math.round(pos.coords.latitude * 10) / 10, lng: Math.round(pos.coords.longitude * 10) / 10, nearby: true })); setLocating(false); setSaved(false); },
      () => { setLocating(false); setError("Location was not shared. You can still type your town."); },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 600000 },
    );
  }

  const sections: Record<Step, ReactNode> = {
    give: (
      <>
        <Choices legend="What would you like to give?" hint="Choose all that fit." options={GIVES} value={draft.gives} onChange={(v) => set("gives", v)} />
        {draft.gives.includes("skills") && <Tags label="Your skills (optional)" placeholder="Design, cooking, first aid…" hint="Press Enter after each one." value={draft.skills} onChange={(v) => set("skills", v)} />}
        {draft.gives.includes("teachback") && (
          <div className="gt-pair">
            <Tags label="What could you teach?" placeholder="Spanish, guitar, budgeting…" max={8} value={draft.teach} onChange={(v) => set("teach", v)} />
            <Tags label="What would you like to learn?" placeholder="Coding, gardening…" max={8} value={draft.learn} onChange={(v) => set("learn", v)} />
            <p className="gt-hint">A Teachback: you learn something, teach it together, and the people who learned it teach it back. <Link to="/guide/teachback">Read about the Teachback</Link></p>
          </div>
        )}
      </>
    ),
    help: (
      <>
        <Choices legend="What would you like to help with?" hint="Choose all that fit." options={CAUSES} value={draft.causes} onChange={(v) => set("causes", v)} />
        {draft.causes.includes("other") && <label>Other cause<input maxLength={60} value={draft.causeOther} onChange={(e) => set("causeOther", e.target.value)} /></label>}
      </>
    ),
    when: (
      <>
        <Choices legend="When would you like to give?" options={TIMES} value={draft.times} onChange={(v) => set("times", v)} />
        <label>Anything else about your time? (optional)<input maxLength={120} placeholder="Tuesday evenings, mornings before work…" value={draft.availability} onChange={(e) => set("availability", e.target.value)} /></label>
      </>
    ),
    how: <Choices legend="How would you like to give?" options={WAYS} value={draft.ways} onChange={(v) => set("ways", v)} />,
    where: (
      <fieldset className="gt-choices">
        <legend>Where are you, roughly?</legend>
        <p className="gt-hint">Only your town, never an address. It helps you find people and places near you.</p>
        <label>Your town or area<input maxLength={80} autoComplete="address-level2" placeholder="Chicago, IL" value={draft.place} onChange={(e) => set("place", e.target.value)} /></label>
        <Switch label="Match me with people near me" hint={draft.lat != null ? "Uses an approximate point, rounded to about 10 km. Others only ever see near, same region, or a few hours away." : "Share an approximate point to turn this on."} checked={draft.nearby && draft.lat != null} onChange={(v) => set("nearby", v)} />
        <button type="button" className="text-button" onClick={locate} disabled={locating}><LocateFixed size={17} aria-hidden="true" />{locating ? "Finding your area…" : draft.lat != null ? "Update from this device" : "Use this device’s location"}</button>
      </fieldset>
    ),
    statement: (
      <fieldset className="gt-choices gt-statement">
        <legend>Mantra And Statement</legend>
        <p className="gt-question">How would you like to make a difference?</p>
        <textarea maxLength={280} rows={3} value={draft.statement} aria-label="How would you like to make a difference?" onChange={(e) => set("statement", e.target.value)} />
        <div className="gt-sentiments">
          {SENTIMENTS.map((s) => (
            <button type="button" key={s} className={"gt-sentiment" + (draft.statement === s ? " on" : "")} aria-pressed={draft.statement === s} onClick={() => set("statement", s)}>{s}</button>
          ))}
        </div>
        <p className="gt-hint">Optional. You can write your own or start from one of these.</p>
      </fieldset>
    ),
    you: (
      <fieldset className="gt-choices">
        <legend>Your display name</legend>
        <label className="gt-visually-hidden" htmlFor="gt-name">Display name</label>
        <input id="gt-name" required minLength={2} maxLength={40} autoComplete="nickname" value={draft.name} onChange={(e) => set("name", e.target.value)} />
        <p className="gt-hint">This is the name other people see. It does not need to be your full name.</p>
        <Switch label="Find me a Give Guide" hint="People who share something with you can see your profile and invite you. Nothing opens until you both say yes." checked={draft.seeking} onChange={(v) => set("seeking", v)} />
        <div className="gt-shares">
          <p className="gt-hint">What people you match with can see, besides your name and what you chose above:</p>
          <Switch label="My town" checked={draft.shares.place} onChange={(v) => set("shares", { ...draft.shares, place: v })} />
          <Switch label="My Mantra And Statement" checked={draft.shares.statement} onChange={(v) => set("shares", { ...draft.shares, statement: v })} />
          <Switch label="My skills" checked={draft.shares.skills} onChange={(v) => set("shares", { ...draft.shares, skills: v })} />
          <Switch label="What I could teach and want to learn" checked={draft.shares.teach} onChange={(v) => set("shares", { ...draft.shares, teach: v })} />
        </div>
        <label className="checkbox gt-adult">
          <input type="checkbox" checked={draft.adult} onChange={(e) => set("adult", e.target.checked)} />
          <span>I am 18 or older, and I will follow the <Link to="/give/privacy">safety guidance</Link>.</span>
        </label>
      </fieldset>
    ),
  };

  // Editing: every question on one page.
  if (existing) {
    return (
      <form className="gt-profile" onSubmit={save}>
        <header className="gt-head">
          <p className="eyebrow">GIVE PROFILE</p>
          <h1>{existing.name}</h1>
          <p className="gt-lede">Change anything, then save. <Link to="/give/privacy">Privacy and safety</Link></p>
        </header>
        {STEPS.map((k) => <section key={k} className="panel gt-card gt-section">{sections[k]}</section>)}
        <div className="gt-save-row">
          <Problem>{error}</Problem>
          <button type="submit" className="glow-button gt-save" disabled={busy}>{busy ? "Saving…" : saved ? "Saved" : "Save My Give Profile"}<ArrowRight size={18} /></button>
          {saved && <p className="gt-done" role="status">Your Give Profile is saved.</p>}
        </div>
      </form>
    );
  }

  // New: one question at a time.
  const current = STEPS[step];
  const last = step === STEPS.length - 1;
  const next = () => { setError(""); setStep((s) => Math.min(STEPS.length - 1, s + 1)); window.scrollTo({ top: 0 }); };
  return (
    <form className="gt-profile gt-steps" onSubmit={(e) => { e.preventDefault(); if (last) save(); else next(); }}>
      <header className="gt-head gt-head-rings">
        <div>
          <p className="eyebrow">GIVE PROFILE</p>
          <h1>Give <span>Together</span></h1>
          <p className="gt-lede">A few short questions. Skip any you like; you can change them later.</p>
        </div>
      </header>
      <WaveRings step={step} total={STEPS.length} />
      <section className="panel gt-card gt-section" key={current}>{sections[current]}</section>
      <Problem>{error}</Problem>
      <div className="gt-step-actions">
        {step > 0 && <button type="button" className="text-button" onClick={() => setStep((s) => s - 1)}><ArrowLeft size={17} aria-hidden="true" />Back</button>}
        {!last && <button type="button" className="text-button gt-skip" onClick={next}>Skip</button>}
        <button type="submit" className="glow-button gt-save" disabled={busy}>{last ? (busy ? "Saving…" : "Save My Give Profile") : "Continue"}<ArrowRight size={18} /></button>
      </div>
    </form>
  );
}

/* Your wave, forming: a light with one ring for each question. Answered rings glow; the one you are on
   breathes. Skipped questions still count; you can come back to them. */
function WaveRings({ step, total }: { step: number; total: number }) {
  return (
    <div className="gt-rings" role="img" aria-label={`Question ${step + 1} of ${total}`}>
      <svg viewBox="0 0 200 200" aria-hidden="true" data-clear="round">
        {Array.from({ length: total }, (_, i) => (
          <circle key={i} cx="100" cy="100" r={22 + i * 11} className={i < step ? "done" : i === step ? "now" : ""} />
        ))}
        <circle cx="100" cy="100" r="7" className="core" />
      </svg>
      <span>{step + 1} of {total}</span>
    </div>
  );
}
