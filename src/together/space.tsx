import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowRight, Check, Flag, Send, ShieldOff, Unlink, X } from "lucide-react";
import { DISTANCE, KINDS, Loading, PageHead, Problem, SafetyNote, Verified, commonLines, formatAt, label, useCall, useLoad, useMe } from "./core";
import { Confirm, Report } from "./safety";
import type { Connection, Message, Opportunity, Wave } from "./core";

/* The private space two Give Guides share: say hello, choose an opportunity, and see your Shared Waves. */
export default function SpacePage() {
  const { id = "" } = useParams();
  const call = useCall();
  const { reload: reloadMe } = useMe();
  const navigate = useNavigate();
  const conn = useLoad(() => call<Connection>("connection", undefined, { id }), [call, id]);
  const waves = useLoad(() => call<{ waves: Wave[] }>("waves"), [call]);
  const saved = useLoad(() => call<{ opportunities: Opportunity[] }>("opportunities", undefined, { saved: "1" }), [call]);
  const [sheet, setSheet] = useState<"report" | "block" | "end" | null>(null);
  const c = conn.data;
  // Shared Waves change when the other person acts; refresh them when a new message arrives or the page is shown again.
  const refreshWaves = waves.reload;
  useEffect(() => {
    const onVis = () => { if (!document.hidden) refreshWaves(); };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [refreshWaves]);

  if (conn.error) return <section className="panel gt-card"><h2>This Connection Is Closed</h2><p>{conn.error}</p><Link className="text-button" to="/give/guide">Back to Find Your Give Guide<ArrowRight size={16} /></Link></section>;
  if (!c) return <Loading />;
  const name = c.person.name;
  const ours = (waves.data?.waves || []).filter((w) => w.connection === id);
  const lines = commonLines(c.common, name);

  return (
    <div className="gt-space">
      <PageHead eyebrow="YOUR GIVE GUIDE" title={name}>
        <p>{[c.person.place, c.common.distance ? DISTANCE[c.common.distance] : null].filter(Boolean).join(" · ")}</p>
      </PageHead>

      {c.status === "pending" && (
        c.direction === "in"
          ? <Answer c={c} onDone={async () => { await Promise.all([conn.reload(), reloadMe()]); }} />
          : <section className="panel gt-card"><h2>Waiting For {name}</h2><p>You invited {name}. Messages open once they say yes.</p></section>
      )}

      {lines.length > 0 && (
        <section className="panel gt-card gt-common">
          <h2 className="gt-block-title">What You Have In Common</h2>
          <ul>{lines.map((l) => <li key={l}>{l}</li>)}</ul>
          {c.person.statement && <blockquote className="gt-quote">{c.person.statement}</blockquote>}
        </section>
      )}

      {c.status === "accepted" && (
        <>
          <SafetyNote />
          <Thread id={id} name={name} onNews={refreshWaves} />

          <section className="gt-block" aria-labelledby="gt-shared">
            <h2 id="gt-shared" className="gt-block-title">Your Shared Waves</h2>
            {ours.length === 0 && <p className="gt-quiet">No Shared Wave yet. Choose an opportunity and invite {name}. When you both say yes, it becomes a Shared Wave.</p>}
            <div className="gt-waves">{ours.map((w) => <WaveCard key={w.id} w={w} onChange={waves.reload} />)}</div>
            <Choose id={id} name={name} saved={saved.data?.opportunities || []} onInvited={waves.reload} />
          </section>
        </>
      )}

      <div className="gt-safety-actions">
        <button className="text-button" onClick={() => setSheet("report")}><Flag size={16} aria-hidden="true" />Report</button>
        <button className="text-button" onClick={() => setSheet("block")}><ShieldOff size={16} aria-hidden="true" />Block</button>
        {c.status === "accepted" && <button className="text-button" onClick={() => setSheet("end")}><Unlink size={16} aria-hidden="true" />End Connection</button>}
      </div>

      {sheet === "report" && <Report refId={c.person.ref} connection={id} name={name} onClose={() => setSheet(null)} onBlocked={() => navigate("/give/guide")} />}
      {sheet === "block" && (
        <Confirm title={`Block ${name}?`} action="Block" onClose={() => setSheet(null)} run={async () => { await call("block", { ref: c.person.ref }); await reloadMe(); navigate("/give/guide"); }}>
          <p>You will not see each other again in Give Together, and this conversation closes. {name} is not notified.</p>
        </Confirm>
      )}
      {sheet === "end" && (
        <Confirm title={`End your connection with ${name}?`} action="End Connection" onClose={() => setSheet(null)} run={async () => { await call("connect.end", { connection: id }); await reloadMe(); navigate("/give/guide"); }}>
          <p>Messages close, and any Shared Wave still open is withdrawn. Your record keeps the hours you both confirmed.</p>
        </Confirm>
      )}
    </div>
  );
}

function Answer({ c, onDone }: { c: Connection; onDone: () => Promise<void> }) {
  const call = useCall();
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const answer = async (accept: boolean) => {
    try { await call("connect.respond", { connection: c.id, accept }); if (accept) await onDone(); else navigate("/give/guide"); }
    catch (e) { setError((e as Error).message); }
  };
  return (
    <section className="panel gt-card">
      <h2>{c.person.name} Invited You</h2>
      {c.note && <blockquote className="gt-quote">{c.note}</blockquote>}
      <Problem>{error}</Problem>
      <div className="gt-actions">
        <button className="glow-button" onClick={() => answer(true)}>Accept<Check size={18} /></button>
        <button className="text-button" onClick={() => answer(false)}>Not now<X size={16} /></button>
      </div>
    </section>
  );
}

// Messages, checked every 8 seconds while the page is open.
function Thread({ id, name, onNews }: { id: string; name: string; onNews: () => void }) {
  const call = useCall();
  const [messages, setMessages] = useState<Message[]>([]);
  const [body, setBody] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const box = useRef<HTMLOListElement>(null);
  const latest = useRef<string | undefined>(undefined);

  useEffect(() => {
    let stop = false;
    const pull = async () => {
      if (document.hidden) return;
      try {
        const out = await call<{ messages: Message[] }>("thread", undefined, latest.current ? { id, after: latest.current } : { id });
        if (stop) return;
        if (out.messages.length) {
          if (latest.current && out.messages.some((m) => !m.mine)) onNews();
          latest.current = out.messages[out.messages.length - 1].at;
          setMessages((m) => { const known = new Set(m.map((x) => x.id)); return [...m, ...out.messages.filter((x) => !known.has(x.id))]; });
        }
        setLoaded(true); setError("");
      } catch (e) { if (!stop) setError((e as Error).message); }
    };
    pull();
    const t = setInterval(pull, 8000);
    const onVis = () => { if (!document.hidden) pull(); };
    document.addEventListener("visibilitychange", onVis);
    return () => { stop = true; clearInterval(t); document.removeEventListener("visibilitychange", onVis); };
  }, [call, id, onNews]);

  // Keep the newest message in view inside the list, without moving the page.
  useEffect(() => { const b = box.current; if (b) b.scrollTop = b.scrollHeight; }, [messages.length]);

  const send = async (e: FormEvent) => {
    e.preventDefault();
    const text = body.trim();
    if (!text) return;
    setBusy(true); setError("");
    try {
      const out = await call<{ message: Message }>("message.send", { connection: id, body: text });
      latest.current = out.message.at;
      setMessages((m) => [...m, out.message]);
      setBody("");
    } catch (err) { setError((err as Error).message); }
    finally { setBusy(false); }
  };

  return (
    <section className="panel gt-card gt-thread" aria-labelledby="gt-thread-title">
      <h2 id="gt-thread-title" className="gt-block-title">Messages</h2>
      {!loaded ? <Loading /> : messages.length === 0 ? <p className="gt-quiet">Say hello to {name}. You could suggest a time and a public place to meet, or pick an opportunity below.</p> : null}
      <ol ref={box} className="gt-messages" aria-live="polite" tabIndex={messages.length ? 0 : -1}>
        {messages.map((m) => (
          <li key={m.id} className={m.mine ? "is-mine" : ""}>
            <p>{m.body}</p>
            <time dateTime={m.at}>{m.mine ? "You" : name} · {formatAt(m.at)}</time>
          </li>
        ))}
      </ol>
      <form className="gt-compose" onSubmit={send}>
        <label className="gt-visually-hidden" htmlFor="gt-compose">Message to {name}</label>
        <textarea id="gt-compose" rows={2} maxLength={1000} value={body} placeholder={`Message ${name}`} onChange={(e) => setBody(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); e.currentTarget.form?.requestSubmit(); } }} />
        <button className="gt-send" type="submit" disabled={busy || !body.trim()} aria-label="Send"><Send size={19} /></button>
      </form>
      <Problem>{error}</Problem>
    </section>
  );
}

const STATUS: Record<string, string> = { proposed: "Invitation", active: "Active", completed: "Completed" };
function WaveCard({ w, onChange }: { w: Wave; onChange: () => void }) {
  const call = useCall();
  const [error, setError] = useState("");
  const respond = async (accept: boolean) => { try { await call("wave.respond", { wave: w.id, accept }); onChange(); } catch (e) { setError((e as Error).message); } };
  const hours = w.confirmed.reduce((a, c) => a + c.hours, 0);
  return (
    <article className="panel gt-card gt-wave-card">
      <p className="gt-status">{STATUS[w.status] || w.status}{w.confirmed.length > 0 && ` · ${hours} peer-confirmed ${hours === 1 ? "hour" : "hours"}`}</p>
      <h3>{w.opportunity?.title || "An opportunity that was removed"}</h3>
      {w.status === "proposed" && (w.proposedByMe
        ? <p className="gt-quiet">Waiting for {w.guide.name} to say yes.</p>
        : <div className="gt-actions"><button className="glow-button" onClick={() => respond(true)}>Say Yes<Check size={18} /></button><button className="text-button" onClick={() => respond(false)}>Not this one</button></div>)}
      <Problem>{error}</Problem>
      <Link className="text-button" to={`/give/wave/${w.id}`}>Open Shared Wave<ArrowRight size={16} /></Link>
    </article>
  );
}

function Choose({ id, name, saved, onInvited }: { id: string; name: string; saved: Opportunity[]; onInvited: () => void }) {
  const call = useCall();
  const [error, setError] = useState("");
  const [sent, setSent] = useState<string[]>([]);
  const invite = async (o: Opportunity) => {
    setError("");
    try { await call("wave.propose", { connection: id, opportunity: o.id }); setSent((s) => [...s, o.id]); onInvited(); }
    catch (e) { setError((e as Error).message); }
  };
  return (
    <div className="gt-choose">
      <h3>Choose An Opportunity Together</h3>
      {saved.length > 0 ? (
        <ul className="gt-rows">
          {saved.map((o) => (
            <li key={o.id} className="gt-row is-still">
              <span className="gt-row-text"><b>{o.title}</b><small>{label(KINDS, o.kind)} · {o.remote ? "Remote" : o.place} · <Verified verified={o.verified} /></small></span>
              {sent.includes(o.id) ? <span className="gt-sent">Invited</span> : <button className="workspace-button secondary" onClick={() => invite(o)}>Invite {name}</button>}
            </li>
          ))}
        </ul>
      ) : <p className="gt-quiet">Save opportunities you like and they appear here, ready to share with {name}.</p>}
      <Problem>{error}</Problem>
      <Link className="text-button" to={`/give/opportunities?with=${id}`}>Browse Opportunities With {name}<ArrowRight size={16} /></Link>
    </div>
  );
}
