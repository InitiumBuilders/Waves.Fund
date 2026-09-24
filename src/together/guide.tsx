import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { ArrowRight, Check, Copy, MessageCircle, X } from "lucide-react";
import { DISTANCE, Loading, PageHead, Problem, commonLines, useCall, useLoad, useMe } from "./core";
import type { Connection, Match, Person, Profile } from "./core";
import { GiveScene } from "./scene";
import type { SceneNode } from "./scene";
import { useStateStore } from "../state";
import { mindWave } from "../mind/WaveMind";

// Which connection moments this person has already seen, kept per person so a shared device still plays each one.
const SEEN = (me: string) => `give-moments-seen:${me}`;
const seen = (me: string): string[] => { try { return JSON.parse(localStorage.getItem(SEEN(me)) || "[]"); } catch { return []; } };
const markSeen = (me: string, id: string) => { try { localStorage.setItem(SEEN(me), JSON.stringify([...seen(me), id].slice(-200))); } catch { /* private mode */ } };

/* Find Your Give Guide. People who share something with you appear as lights; tap one, or pick from the list,
   to see what you have in common. Nothing opens until both people say yes. */
export default function GuidePage() {
  const { me, reload: reloadMe, setMe } = useMe();
  const call = useCall();
  const navigate = useNavigate();
  const location = useLocation();
  const [fresh] = useState(Boolean((location.state as { fresh?: boolean } | null)?.fresh));
  const profile = me!.profile as Profile;
  const matches = useLoad(() => (profile.seeking ? call<{ matches: Match[] }>("matches") : Promise.resolve({ matches: [] as Match[] })), [call, profile.seeking]);
  const conns = useLoad(() => call<{ connections: Connection[] }>("connections"), [call]);
  const [selected, setSelected] = useState<string | null>(null);
  const [moment, setMoment] = useState<Connection | null>(null);
  const list = matches.data?.matches || [];
  const connections = conns.data?.connections || [];
  const incoming = connections.filter((c) => c.status === "pending" && c.direction === "in");
  const waiting = connections.filter((c) => c.status === "pending" && c.direction === "out");
  const guides = connections.filter((c) => c.status === "accepted");

  // A connection you have not seen yet plays its moment once.
  useEffect(() => {
    if (moment) return;
    const fresh = guides.find((c) => !seen(profile.ref).includes(c.id) && c.respondedAt && Date.now() - Date.parse(c.respondedAt) < 14 * 86400000);
    if (fresh) setMoment(fresh);
  }, [guides, moment, profile.ref]);

  const nodes = useMemo<SceneNode[]>(() => {
    const out: SceneNode[] = [];
    for (const c of guides) out.push({ key: c.person.ref, state: "guide", weight: 0.55 });
    for (const c of incoming) out.push({ key: c.person.ref, state: "incoming", weight: 0.85 });
    for (const c of waiting) out.push({ key: c.person.ref, state: "invited", weight: 0.75 });
    const top = list.length ? Math.max(...list.map((m) => m.score)) || 1 : 1;
    for (const m of list) out.push({ key: m.person.ref, state: "candidate", weight: 0.15 + 0.7 * (m.score / top) });
    return out.slice(0, 16);
  }, [conns.data, matches.data]);

  useEffect(() => { if (fresh) navigate(location.pathname, { replace: true, state: null }); }, [fresh, navigate, location.pathname]);
  const refresh = async () => { await Promise.all([matches.reload(), conns.reload(), reloadMe()]); };
  const pick = (ref: string) => {
    const guide = guides.find((c) => c.person.ref === ref);
    if (guide) { navigate(`/give/with/${guide.id}`); return; }
    setSelected(ref);
    requestAnimationFrame(() => document.getElementById(`gt-person-${ref}`)?.scrollIntoView({ behavior: "smooth", block: "nearest" }));
  };
  const turnOn = async () => {
    const out = await call<{ profile: Profile }>("profile.save", { ...profile, seeking: true });
    setMe({ ...me!, profile: out.profile });
  };

  return (
    <div className="gt-guide">
      <PageHead title={<>Find Your <span>Give Guide</span></>}>
        <p>A Give Guide is a friend you give with. Choose someone who shares what you care about, and give your time together. You both say yes before anyone can message.</p>
      </PageHead>
      {fresh && <p className="gt-done" role="status">Your Give Profile is saved. Here is who shares something with you.</p>}

      <div className="gt-guide-stage">
        <GiveScene variant="field" nodes={nodes} selected={selected} onSelect={pick} paused={Boolean(moment)} className="gt-guide-scene" />
        <p className="gt-scene-key" aria-hidden="true" data-clear>
          <span><i className="k-you" />You</span>
          {guides.length > 0 && <span><i className="k-guide" />Give Guide</span>}
          {incoming.length > 0 && <span><i className="k-incoming" />Invited you</span>}
          {list.length > 0 && <span><i className="k-candidate" />Shares something with you</span>}
        </p>
      </div>

      {(matches.loading && !matches.data) || (conns.loading && !conns.data) ? <Loading>Looking for your people…</Loading> : null}
      <Problem>{matches.error || conns.error}</Problem>

      {incoming.length > 0 && (
        <section className="gt-block" aria-labelledby="gt-incoming">
          <h2 id="gt-incoming" className="gt-block-title">Invitations For You</h2>
          {incoming.map((c) => <Invitation key={c.id} c={c} onDone={async (accepted) => { await refresh(); if (accepted) setMoment({ ...c, status: "accepted", respondedAt: new Date().toISOString() }); }} />)}
        </section>
      )}

      {guides.length > 0 && (
        <section className="gt-block" aria-labelledby="gt-guides">
          <h2 id="gt-guides" className="gt-block-title">Your Give Guides</h2>
          <ul className="gt-rows">
            {guides.map((c) => (
              <li key={c.id}>
                <Link className="gt-row" to={`/give/with/${c.id}`}>
                  <span className="gt-avatar" aria-hidden="true">{c.person.name.slice(0, 1)}</span>
                  <span className="gt-row-text"><b>{c.person.name}</b><small>{commonLines(c.common, c.person.name)[0] || "Connected"}</small></span>
                  <MessageCircle size={19} aria-hidden="true" />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {!profile.seeking ? (
        <section className="panel gt-card">
          <h2>You Are Not Looking Right Now</h2>
          <p>Turn on Find Your Give Guide and people who share your causes and times can see your profile and invite you.</p>
          <button className="glow-button" onClick={() => turnOn().then(refresh)}>Turn On Find Your Give Guide<ArrowRight size={18} /></button>
        </section>
      ) : matches.data && list.length === 0 ? (
        <Empty others={connections.length > 0} />
      ) : list.length > 0 ? (
        <section className="gt-block" aria-labelledby="gt-matches">
          <h2 id="gt-matches" className="gt-block-title">People Who Share Something With You</h2>
          <div className="gt-people">
            {list.map((m) => <Candidate key={m.person.ref} m={m} open={selected === m.person.ref} onOpen={() => setSelected(m.person.ref)} onInvited={refresh} />)}
          </div>
        </section>
      ) : null}

      {waiting.length > 0 && (
        <section className="gt-block" aria-labelledby="gt-waiting">
          <h2 id="gt-waiting" className="gt-block-title">Waiting For An Answer</h2>
          <ul className="gt-rows">
            {waiting.map((c) => (
              <li key={c.id} className="gt-row is-still">
                <span className="gt-avatar" aria-hidden="true">{c.person.name.slice(0, 1)}</span>
                <span className="gt-row-text"><b>{c.person.name}</b><small>You invited {c.person.name}. You can message once they say yes.</small></span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {moment && <Moment c={moment} onClose={() => { markSeen(profile.ref, moment.id); setMoment(null); }} />}
    </div>
  );
}

function Tags({ person }: { person: Person }) {
  const all = [...person.skills.map((s) => ["skill", s]), ...person.teach.map((s) => ["teach", `Can teach ${s}`]), ...person.learn.map((s) => ["learn", `Wants to learn ${s}`])];
  if (!all.length) return null;
  return <ul className="gt-mini-tags">{all.slice(0, 8).map(([k, s]) => <li key={k + s} className={`is-${k}`}>{s}</li>)}</ul>;
}

function Candidate({ m, open, onOpen, onInvited }: { m: Match; open: boolean; onOpen: () => void; onInvited: () => Promise<void> }) {
  const call = useCall();
  const [note, setNote] = useState("");
  const [asking, setAsking] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const lines = commonLines(m.common, m.person.name);
  const ref = useRef<HTMLElement>(null);
  const invite = async () => {
    setBusy(true); setError("");
    try {
      await call("connect.request", { ref: m.person.ref, note });
      mindWave(ref.current || { x: innerWidth / 2, y: innerHeight / 2 }, 0.8);
      await onInvited();
    } catch (e) { setError((e as Error).message); }
    finally { setBusy(false); }
  };
  return (
    <article ref={ref} id={`gt-person-${m.person.ref}`} className={"panel gt-card gt-person" + (open ? " is-open" : "")}>
      <button className="gt-person-head" aria-expanded={open} onClick={onOpen}>
        <span className="gt-avatar" aria-hidden="true">{m.person.name.slice(0, 1)}</span>
        <span className="gt-row-text">
          <b>{m.person.name}</b>
          <small>{[m.person.place, m.common.distance ? DISTANCE[m.common.distance] : null].filter(Boolean).join(" · ") || "Place not shared"}</small>
        </span>
      </button>
      <p className="gt-intro">{lines.slice(0, open ? 6 : 2).join(" ")}</p>
      {open && (
        <>
          {m.person.statement && <blockquote className="gt-quote">{m.person.statement}</blockquote>}
          <Tags person={m.person} />
          {!asking ? (
            <button className="glow-button" onClick={() => setAsking(true)}>Invite {m.person.name}<ArrowRight size={18} /></button>
          ) : (
            <div className="gt-invite">
              <label>A short hello (optional)<textarea rows={2} maxLength={400} value={note} placeholder={`Hi ${m.person.name}, want to give together?`} onChange={(e) => setNote(e.target.value)} /></label>
              <p className="gt-hint">{m.person.name} sees your name, what you chose to share, and this note. Messages open if they say yes.</p>
              <Problem>{error}</Problem>
              <div className="gt-actions">
                <button className="glow-button" disabled={busy} onClick={invite}>{busy ? "Sending…" : "Send Invitation"}<ArrowRight size={18} /></button>
                <button className="text-button" onClick={() => setAsking(false)}>Cancel</button>
              </div>
            </div>
          )}
        </>
      )}
    </article>
  );
}

function Invitation({ c, onDone }: { c: Connection; onDone: (accepted: boolean) => Promise<void> }) {
  const call = useCall();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const answer = async (accept: boolean) => {
    setBusy(true); setError("");
    try { await call("connect.respond", { connection: c.id, accept }); await onDone(accept); }
    catch (e) { setError((e as Error).message); setBusy(false); }
  };
  return (
    <article id={`gt-person-${c.person.ref}`} className="panel gt-card gt-person is-open is-incoming">
      <div className="gt-person-head">
        <span className="gt-avatar" aria-hidden="true">{c.person.name.slice(0, 1)}</span>
        <span className="gt-row-text"><b>{c.person.name} invited you</b><small>{[c.person.place, c.common.distance ? DISTANCE[c.common.distance] : null].filter(Boolean).join(" · ") || "Place not shared"}</small></span>
      </div>
      {c.note && <blockquote className="gt-quote">{c.note}</blockquote>}
      <p className="gt-intro">{commonLines(c.common, c.person.name).slice(0, 4).join(" ")}</p>
      <Tags person={c.person} />
      <Problem>{error}</Problem>
      <div className="gt-actions">
        <button className="glow-button" disabled={busy} onClick={() => answer(true)}>Accept<Check size={18} /></button>
        <button className="text-button" disabled={busy} onClick={() => answer(false)}>Not now<X size={16} /></button>
      </div>
      <p className="fine-print">{c.person.name} is not notified if you choose “Not now”.</p>
    </article>
  );
}

function Empty({ others }: { others: boolean }) {
  const [copied, setCopied] = useState(false);
  const link = "https://www.waves.fund/give";
  const share = async () => {
    try {
      if (navigator.share) await navigator.share({ title: "Give Together", url: link });
      else { await navigator.clipboard.writeText(link); setCopied(true); }
    } catch { /* closed the share sheet */ }
  };
  return (
    <section className="panel gt-card gt-empty">
      <h2>{others ? "No One Else Yet" : "No One Yet"}</h2>
      <p>{others ? "No one else shares your causes or times yet." : "No one shares your causes or times yet."} As more people make a Give Profile, they will appear here as lights around you.</p>
      <p>Invite a friend to give with you, or find something to do now.</p>
      <div className="gt-actions">
        <button className="glow-button" onClick={share}>{copied ? "Link Copied" : "Invite A Friend"}{copied ? <Check size={18} /> : <Copy size={18} />}</button>
        <Link className="text-button" to="/give/opportunities">Find Opportunities<ArrowRight size={16} /></Link>
      </div>
    </section>
  );
}

/* Both said yes. The two lights join, a wave spreads, and then the words arrive. */
function Moment({ c, onClose }: { c: Connection; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const navigate = useNavigate();
  const { motion } = useStateStore();
  const lines = commonLines(c.common, c.person.name);
  useEffect(() => {
    const d = ref.current;
    const previous = document.activeElement as HTMLElement | null;
    d?.showModal();
    const old = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    // Focus goes back where it was when the moment closes.
    return () => { document.body.style.overflow = old; previous?.focus?.(); };
  }, []);
  const go = (to: string) => { onClose(); navigate(to); };
  return (
    <dialog ref={ref} className={"gt-moment" + (motion ? "" : " is-still")} aria-labelledby="gt-moment-title" onCancel={(e) => { e.preventDefault(); onClose(); }}>
      <GiveScene variant="moment" className="gt-moment-scene" />
      <button className="icon-button gt-moment-close" aria-label="Close" onClick={onClose}><X /></button>
      <div className="gt-moment-words">
        <p className="eyebrow gt-moment-name">{c.person.name}</p>
        <h2 id="gt-moment-title">Your Give Guide</h2>
        <p className="gt-moment-line">You both want to make a difference.</p>
        {lines.length > 0 && <ul className="gt-moment-common">{lines.slice(0, 4).map((l) => <li key={l}>{l}</li>)}</ul>}
        <div className="gt-actions">
          <button className="glow-button" onClick={() => go(`/give/opportunities?with=${c.id}`)}>Explore Opportunities Together<ArrowRight size={18} /></button>
          <button className="text-button" onClick={() => go(`/give/with/${c.id}`)}>Say Hello<MessageCircle size={16} /></button>
        </div>
      </div>
    </dialog>
  );
}

