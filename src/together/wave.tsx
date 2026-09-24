import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowRight, Check, Heart, Minus, Plus } from "lucide-react";
import { CAUSES, DISTANCE, KINDS, Loading, PageHead, Problem, Switch, Verified, formatAt, formatDay, hoursText, label, localDay, useCall, useLoad } from "./core";
import type { Wave } from "./core";
import { Confirm } from "./safety";
import { Sheet } from "../ui";
import { mindWave } from "../mind/WaveMind";
import { BEAT } from "../cadence";
import { Ripple, ease } from "./ripple";
import type { RippleHandle, RippleModel } from "./ripple";

/* A Shared Wave: one opportunity, two Give Guides. Each person logs their own time. A day both people log as
   together becomes peer-confirmed, at the smaller of the two numbers. Peer-confirmed is not host-verified. */
export default function WavePage() {
  const { id = "" } = useParams();
  const call = useCall();
  const wave = useLoad(() => call<Wave>("wave", undefined, { id }), [call, id]);
  const [finishing, setFinishing] = useState(false);
  const [error, setError] = useState("");
  const w = wave.data;
  if (wave.error) return <section className="panel gt-card"><h2>This Wave Is Not Available</h2><p>{wave.error}</p><Link className="text-button" to="/give/record">Your Record<ArrowRight size={16} /></Link></section>;
  if (!w) return <Loading />;
  const o = w.opportunity;
  const name = w.guide.name;
  const respond = async (accept: boolean) => { try { await call("wave.respond", { wave: w.id, accept }); wave.reload(); } catch (e) { setError((e as Error).message); } };
  const days = [...new Set([...w.sessions.mine.map((s) => s.day), ...w.sessions.theirs.map((s) => s.day)])].sort().reverse();
  const confirmedHours = w.confirmed.reduce((a, c) => a + c.hours, 0);

  return (
    <div className="gt-wave">
      <PageHead eyebrow="SHARED WAVE" title={o?.title || "Shared Wave"}>
        <p>With <Link to={`/give/with/${w.connection}`}>{name}</Link> · {w.status === "proposed" ? "Waiting for two yeses" : w.status === "active" ? "Active" : w.status === "completed" ? "Completed" : "Closed"}</p>
      </PageHead>

      <PairOfYou status={w.status} />

      {w.status === "proposed" && (
        <section className="panel gt-card">
          {w.proposedByMe ? <><h2>Waiting For {name}</h2><p>You invited {name} to this. It becomes a Shared Wave when they say yes.</p></> : (
            <>
              <h2>{name} Invited You To This</h2>
              <p>Say yes and it becomes your Shared Wave. You can each log your time afterwards.</p>
              <div className="gt-actions">
                <button className="glow-button" onClick={() => respond(true)}>Say Yes<Check size={18} /></button>
                <button className="text-button" onClick={() => respond(false)}>Not this one</button>
              </div>
            </>
          )}
          <Problem>{error}</Problem>
        </section>
      )}

      {o && (
        <section className="panel gt-card gt-opp">
          <div className="gt-opp-top"><p className="gt-kind">{label(KINDS, o.kind)}{o.cause ? ` · ${label(CAUSES, o.cause)}` : ""}</p><Verified verified={o.verified} /></div>
          <p>{o.need}</p>
          <dl className="gt-facts">
            <div><dt>Where</dt><dd>{o.remote ? (o.place ? `Remote, or at ${o.place}` : "Remote") : o.place}{o.distance ? ` · ${DISTANCE[o.distance]}` : ""}</dd></div>
            {(o.when || o.startsOn) && <div><dt>When</dt><dd>{[o.startsOn ? formatDay(o.startsOn) : null, o.when].filter(Boolean).join(" · ")}</dd></div>}
            <div><dt>Organized by</dt><dd>{o.organizer}</dd></div>
            <div><dt>How to take part</dt><dd>{o.how}</dd></div>
          </dl>
          {o.url && <a className="text-button" href={o.url} target="_blank" rel="noopener noreferrer nofollow ugc">More details<ArrowRight size={16} /></a>}
        </section>
      )}

      {(w.status === "active" || w.status === "completed") && (
        <>
          <section className="gt-block" aria-labelledby="gt-part">
            <h2 id="gt-part" className="gt-block-title">Confirm Participation</h2>
            <div className="gt-stats">
              <div><strong>{confirmedHours}</strong><span>Peer-confirmed {confirmedHours === 1 ? "hour" : "hours"}</span></div>
              <div><strong>{w.confirmed.length}</strong><span>Peer-confirmed {w.confirmed.length === 1 ? "day" : "days"}</span></div>
            </div>
            <p className="fine-print">Peer-confirmed means you and {name} both logged the same day as time together. It is your own record, not a certificate: the host organization has not verified these hours.</p>
            <Log w={w} onSaved={wave.reload} />
            {days.length > 0 && (
              <ul className="gt-days">
                {days.map((d) => <Day key={d} day={d} w={w} onSent={wave.reload} />)}
              </ul>
            )}
          </section>

          {w.gratus.received.length > 0 && (
            <section className="gt-block" aria-labelledby="gt-gratus-in">
              <h2 id="gt-gratus-in" className="gt-block-title">Gratus From {name}</h2>
              <ul className="gt-gratus">{w.gratus.received.map((g) => <li key={g.day}><Heart size={16} aria-hidden="true" /><p>{g.message || "Gratus, without words."}</p><small>{formatDay(g.day)}{g.point ? " · 1 Gratus point" : ""}</small></li>)}</ul>
            </section>
          )}
        </>
      )}

      {w.status === "active" && (
        <section className="panel gt-card">
          <h2>Finished?</h2>
          <p>Mark this Wave complete when the work is done. Your record keeps every confirmed day.</p>
          <button className="glow-button" onClick={() => setFinishing(true)}>Mark This Wave Complete<ArrowRight size={18} /></button>
        </section>
      )}
      {w.status === "completed" && (
        <section className="panel gt-card gt-again">
          <h2>Build Another Wave</h2>
          <p>Choose the next opportunity with {name}, or organize a Teachback together.</p>
          <div className="gt-actions">
            <Link className="glow-button" to={`/give/opportunities?with=${w.connection}`}>Choose With {name}<ArrowRight size={18} /></Link>
            <Link className="text-button" to="/give/opportunities/new?kind=teachback">Organize A Teachback<ArrowRight size={16} /></Link>
          </div>
        </section>
      )}

      {w.events.length > 0 && (
        <section className="gt-block" aria-labelledby="gt-history">
          <h2 id="gt-history" className="gt-block-title">History</h2>
          <ol className="gt-history">
            {[...w.events].reverse().map((e, i) => <li key={i}><span>{eventText(e, name)}</span><time dateTime={e.at}>{formatAt(e.at)}</time></li>)}
          </ol>
        </section>
      )}

      {finishing && (
        <Confirm title="Mark this Wave complete?" action="Mark Complete" onClose={() => setFinishing(false)} run={async () => { await call("wave.complete", { wave: w.id }); setFinishing(false); wave.reload(); mindWave({ x: innerWidth / 2, y: innerHeight / 2 }, 1); }}>
          <p>You can still log a day you missed afterwards.</p>
        </Confirm>
      )}
    </div>
  );
}

function eventText(e: Wave["events"][number], name: string) {
  const who = e.mine ? "You" : name;
  const d = e.detail as { day?: string; hours?: number; together?: boolean };
  switch (e.kind) {
    case "invited": return `${who} proposed this Wave.`;
    case "accepted": return `${who} said yes. It became a Shared Wave.`;
    case "declined": return `${who} passed on this one.`;
    case "logged": return `${who} logged ${d.hours ? hoursText(d.hours) : "time"}${d.day ? ` on ${formatDay(d.day)}` : ""}${d.together ? ", together" : ""}.`;
    case "confirmed": return `${d.day ? formatDay(d.day) : "A day"} was peer-confirmed${d.hours ? ` at ${hoursText(d.hours)}` : ""}.`;
    case "gratus": return `${who} sent Gratus.`;
    case "completed": return `${who} marked the Wave complete.`;
    default: return e.kind;
  }
}

function Log({ w, onSaved }: { w: Wave; onSaved: () => void }) {
  const call = useCall();
  const today = localDay();
  const min = localDay(new Date(Date.parse(w.createdAt) - 86400000));
  const [day, setDay] = useState(today);
  const [hours, setHours] = useState(2);
  const [together, setTogether] = useState(true);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const save = async (e: FormEvent) => {
    e.preventDefault(); setBusy(true); setError(""); setMsg("");
    const form = e.currentTarget as Element;
    try {
      const out = await call<{ confirmed: boolean }>("session.log", { wave: w.id, day, hours, together, note });
      setMsg(out.confirmed ? `Peer-confirmed. You and ${w.guide.name} both logged ${formatDay(day)}.` : together ? `Logged. It becomes peer-confirmed when ${w.guide.name} logs ${formatDay(day)} too.` : "Logged.");
      if (out.confirmed) mindWave(form, 0.9);
      onSaved();
    } catch (err) { setError((err as Error).message); }
    finally { setBusy(false); }
  };
  return (
    <form className="panel gt-card gt-log" onSubmit={save}>
      <h3>Log Your Time</h3>
      <div className="gt-pair">
        <label>Day<input type="date" required value={day} min={min} max={today} onChange={(e) => setDay(e.target.value)} /></label>
        <div className="gt-hours">
          <span id="gt-hours-label">Hours</span>
          <div role="group" aria-labelledby="gt-hours-label">
            <button type="button" className="icon-button" aria-label="Less" onClick={() => setHours((h) => Math.max(0.25, h - 0.25))}><Minus size={16} /></button>
            <output aria-live="polite">{hours}</output>
            <button type="button" className="icon-button" aria-label="More" onClick={() => setHours((h) => Math.min(12, h + 0.25))}><Plus size={16} /></button>
          </div>
        </div>
      </div>
      <Switch label={`I gave this time together with ${w.guide.name}`} checked={together} onChange={setTogether} />
      <label>Note, just for you (optional)<input maxLength={200} value={note} onChange={(e) => setNote(e.target.value)} /></label>
      <Problem>{error}</Problem>
      {msg && <p className="gt-done" role="status">{msg}</p>}
      <button className="glow-button" type="submit" disabled={busy}>{busy ? "Saving…" : "Log This Day"}<ArrowRight size={18} /></button>
    </form>
  );
}

function Day({ day, w, onSent }: { day: string; w: Wave; onSent: () => void }) {
  const mine = w.sessions.mine.find((s) => s.day === day);
  const theirs = w.sessions.theirs.find((s) => s.day === day);
  const confirmed = w.confirmed.find((c) => c.day === day);
  const sent = w.gratus.sent.find((g) => g.day === day);
  const [open, setOpen] = useState(false);
  return (
    <li className={"gt-day" + (confirmed ? " is-confirmed" : "")}>
      <div className="gt-day-head"><b>{formatDay(day)}</b>{confirmed ? <span className="gt-badge is-verified"><Check size={14} aria-hidden="true" />Peer-confirmed · {hoursText(confirmed.hours)}</span> : <span className="gt-badge">Waiting for {mine ? w.guide.name : "you"}</span>}</div>
      <p className="gt-day-both">You: {mine ? `${hoursText(mine.hours)}${mine.together ? "" : " (not together)"}` : "not logged"} · {w.guide.name}: {theirs ? `${hoursText(theirs.hours)}${theirs.together ? "" : " (not together)"}` : "not logged"}</p>
      {confirmed && (sent ? <p className="gt-quiet">You sent Gratus for this day.</p> : <button className="text-button" onClick={() => setOpen(true)}><Heart size={16} aria-hidden="true" />Send Gratus</button>)}
      {open && <Gratus w={w} day={day} onClose={() => setOpen(false)} onSent={() => { setOpen(false); onSent(); }} />}
    </li>
  );
}

function Gratus({ w, day, onClose, onSent }: { w: Wave; day: string; onClose: () => void; onSent: () => void }) {
  const call = useCall();
  const [message, setMessage] = useState("");
  const [point, setPoint] = useState(true);
  const [error, setError] = useState("");
  const send = async (e: FormEvent) => {
    e.preventDefault();
    try { await call("gratus.send", { wave: w.id, day, message, point }); onSent(); }
    catch (err) { setError((err as Error).message); }
  };
  return (
    <Sheet title={`Gratus For ${w.guide.name}`} onClose={onClose}>
      <form className="gt-gratus-form" onSubmit={send}>
        <p>A private thank-you for {formatDay(day)}. Only {w.guide.name} sees it.</p>
        <label>Your words (optional)<textarea rows={3} maxLength={400} value={message} onChange={(e) => setMessage(e.target.value)} /></label>
        <Switch label="Add 1 Gratus point" hint="A private token of thanks. It has no money value and is never shown publicly or ranked." checked={point} onChange={setPoint} />
        <Problem>{error}</Problem>
        <button className="glow-button" type="submit">Send Gratus<Heart size={17} /></button>
      </form>
    </Sheet>
  );
}

/* You and your Give Guide as two lights. While the Wave waits for both yeses, the second light is out of
   step and the water between you stays still; once it is active you ripple in step and the bands between
   you glow. */
function PairOfYou({ status }: { status: Wave["status"] }) {
  const inStep = status === "active" || status === "completed";
  const target = useRef(inStep ? 1 : 0);
  target.current = inStep ? 1 : 0;
  const handle = useRef<RippleHandle | null>(null);
  const model = useRef<RippleModel>((() => {
    let lock = target.current, last = 0;
    return (t: number, w: number, h: number) => {
      const dt = Math.min(0.1, Math.max(0, t - last)); last = t;
      lock += (target.current - lock) * (1 - Math.exp(-dt * 1.2));
      const lambda = Math.max(40, Math.min(90, Math.min(w, h) * 0.3));
      const gap = lambda * 1.6, cy = h / 2;
      return {
        lambda, speed: lambda / BEAT, gain: 1.15, dots: 13, ground: 0.9,
        sources: [
          { x: w / 2 - gap, y: cy, a: 1, phase: 0, hue: 0.05, size: 4.2, born: -100, reach: 0.9 },
          { x: w / 2 + gap, y: cy, a: 0.55 + 0.45 * ease(lock), phase: Math.PI * (1 - ease(lock)), hue: 0.3, size: 4.2, born: -100, reach: 0.9 },
        ],
      };
    };
  })());
  useEffect(() => { handle.current?.redraw(); }, [inStep]);
  return <Ripple model={model} handle={handle} className="gt-pair-scene" maxDpr={1.25} still={3} aria-hidden="true" />;
}
