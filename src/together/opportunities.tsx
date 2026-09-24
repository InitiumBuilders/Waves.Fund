import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowRight, Bookmark, BookmarkCheck, Flag, LocateFixed, Plus, Search, X } from "lucide-react";
import { CAUSES, Choices, DISTANCE, KINDS, Loading, PageHead, Problem, Switch, TIMES, Tags, Verified, formatDay, label, useCall, useLoad, useMe } from "./core";
import type { Connection, Opportunity } from "./core";
import { Report } from "./safety";
import { Sheet } from "../ui";
import { mindWave } from "../mind/WaveMind";
import { Pair, StandingString, Travel } from "../symbols";

// Each kind has its wave: a Teachback holds (standing wave), volunteering is two in step, an event travels.
const KIND_SYMBOL: Record<string, typeof Pair> = { teachback: StandingString, volunteer: Pair, event: Travel };

type Filters = { q: string; kind: string; cause: string; time: string; remote: string; skill: string; near: boolean; saved: boolean };
const EMPTY: Filters = { q: "", kind: "", cause: "", time: "", remote: "", skill: "", near: false, saved: false };

/* Opportunities: things to do, posted by members and checked by the team. Filter them, save them, and invite
   your Give Guide. Two yeses make a Shared Wave. */
export function Opportunities() {
  const call = useCall();
  const [params, setParams] = useSearchParams();
  const withId = params.get("with") || "";
  const location = useLocation();
  const navigate = useNavigate();
  const [posted] = useState(Boolean((location.state as { posted?: boolean } | null)?.posted));
  useEffect(() => { if (posted) navigate(location.pathname + location.search, { replace: true, state: null }); }, [posted, navigate, location.pathname, location.search]);
  const { me } = useMe();
  const [f, setF] = useState<Filters>(EMPTY);
  const [q, setQ] = useState("");
  useEffect(() => { const t = setTimeout(() => setF((x) => ({ ...x, q })), 300); return () => clearTimeout(t); }, [q]);
  const query: Record<string, string> = {};
  if (f.q) query.q = f.q; if (f.kind) query.kind = f.kind; if (f.cause) query.cause = f.cause; if (f.time) query.time = f.time;
  if (f.remote) query.remote = f.remote; if (f.skill) query.skill = f.skill; if (f.near) query.near = "1"; if (f.saved) query.saved = "1";
  const key = JSON.stringify(query);
  const list = useLoad(() => call<{ opportunities: Opportunity[] }>("opportunities", undefined, query), [call, key]);
  const conns = useLoad(() => call<{ connections: Connection[] }>("connections"), [call]);
  const guides = (conns.data?.connections || []).filter((c) => c.status === "accepted");
  const chosen = guides.find((g) => g.id === withId) || null;
  const set = <K extends keyof Filters>(k: K, v: Filters[K]) => setF((x) => ({ ...x, [k]: v }));
  const items = list.data?.opportunities || [];
  const filtered = Object.keys(query).length > 0;

  return (
    <div className="gt-opps">
      <PageHead title={<>Join Or Build a <span>Wave Together</span></>}>
        <p>Find something to do, save it, and invite your Give Guide. When you both say yes, it becomes a Shared Wave.</p>
      </PageHead>
      {posted && <p className="gt-done" role="status">Posted. It shows as not yet verified until the team checks it.</p>}
      {chosen && (
        <p className="gt-with"><span>Choosing with <b>{chosen.person.name}</b>. Pick one and press “Invite {chosen.person.name}”.</span>
          <button className="icon-button" aria-label="Stop choosing together" onClick={() => { params.delete("with"); setParams(params, { replace: true }); }}><X size={16} /></button>
        </p>
      )}

      <div className="gt-toolbar">
        <label className="gt-search"><Search size={18} aria-hidden="true" /><span className="gt-visually-hidden">Search opportunities</span>
          <input type="search" value={q} placeholder="Search by title, place or organizer" onChange={(e) => setQ(e.target.value)} />
        </label>
        <div className="gt-segment" role="group" aria-label="Kind">
          {[["", "All"], ...KINDS].map(([k, text]) => <button key={k} aria-pressed={f.kind === k} className={f.kind === k ? "on" : ""} onClick={() => set("kind", k)}>{text}</button>)}
        </div>
        <details className="gt-more">
          <summary>More filters</summary>
          <div className="gt-filter-grid">
            <label>Cause<select value={f.cause} onChange={(e) => set("cause", e.target.value)}><option value="">Any cause</option>{CAUSES.map(([k, t]) => <option key={k} value={k}>{t}</option>)}</select></label>
            <label>When<select value={f.time} onChange={(e) => set("time", e.target.value)}><option value="">Any time</option>{TIMES.filter(([k]) => k !== "flexible").map(([k, t]) => <option key={k} value={k}>{t}</option>)}</select></label>
            <label>Remote<select value={f.remote} onChange={(e) => set("remote", e.target.value)}><option value="">In person or remote</option><option value="only">Remote only</option><option value="exclude">In person only</option></select></label>
            <label>Skill<input value={f.skill} maxLength={32} placeholder="teaching, carpentry…" onChange={(e) => set("skill", e.target.value.toLowerCase())} /></label>
          </div>
          <Switch label="Near me" hint={me?.profile?.located ? "Within about 80 km, plus remote ones." : "Add your area in your Give Profile to use this."} checked={f.near} onChange={(v) => set("near", v)} />
          <Switch label="Saved only" checked={f.saved} onChange={(v) => set("saved", v)} />
        </details>
        <Link className="glow-button gt-post" to={`/give/opportunities/new${withId ? `?with=${withId}` : ""}`}><Plus size={18} aria-hidden="true" />Post An Opportunity</Link>
      </div>

      <p className="fine-print gt-verify-note"><Verified verified /> means the Waves.Fund team checked the listing. Everything else was posted by a member and has not been checked yet.</p>

      <Problem>{list.error}</Problem>
      {list.loading && !list.data ? <Loading /> : items.length === 0 ? (
        <section className="panel gt-card gt-empty">
          <h2>{filtered ? "Nothing Matches" : "No Opportunities Yet"}</h2>
          <p>{filtered ? "Try fewer filters." : "Give Together is new, and no one has posted yet. Post the first one, or organize a Teachback with your Give Guide."}</p>
          <div className="gt-actions">
            <Link className="glow-button" to={`/give/opportunities/new${withId ? `?with=${withId}` : ""}`}>Post An Opportunity<ArrowRight size={18} /></Link>
            <Link className="text-button" to={`/give/opportunities/new?kind=teachback${withId ? `&with=${withId}` : ""}`}>Organize A Teachback<ArrowRight size={16} /></Link>
          </div>
        </section>
      ) : (
        <div className="gt-opp-list">{items.map((o) => <Card key={o.id} o={o} guides={guides} chosen={chosen} onChange={list.reload} />)}</div>
      )}
    </div>
  );
}

function Card({ o, guides, chosen, onChange }: { o: Opportunity; guides: Connection[]; chosen: Connection | null; onChange: () => void }) {
  const call = useCall();
  const [saved, setSaved] = useState(o.saved);
  const [pick, setPick] = useState(false);
  const [report, setReport] = useState(false);
  const [sent, setSent] = useState<string[]>([]);
  const [error, setError] = useState("");
  const toggle = async () => {
    const next = !saved; setSaved(next);
    try { await call("opportunity.save", { opportunity: o.id, saved: next }); } catch (e) { setSaved(!next); setError((e as Error).message); }
  };
  const invite = async (g: Connection, el?: Element | null) => {
    setError("");
    try { await call("wave.propose", { connection: g.id, opportunity: o.id }); setSent((s) => [...s, g.id]); if (el) mindWave(el, 0.7); }
    catch (e) { setError((e as Error).message); }
  };
  const close = async () => { try { await call("opportunity.close", { opportunity: o.id }); onChange(); } catch (e) { setError((e as Error).message); } };
  const where = o.remote ? (o.place ? `Remote, or at ${o.place}` : "Remote") : o.place;
  return (
    <article className="panel gt-card gt-opp">
      <div className="gt-opp-top">
        <p className="gt-kind">{label(KINDS, o.kind)}{o.cause ? ` · ${label(CAUSES, o.cause)}` : ""}</p>
        <Verified verified={o.verified} />
      </div>
      {(() => { const Symbol = KIND_SYMBOL[o.kind] || Pair; return <Symbol className="gt-opp-symbol" />; })()}
      <h3>{o.title}</h3>
      <p>{o.need}</p>
      <dl className="gt-facts">
        <div><dt>Where</dt><dd>{where}{o.distance ? ` · ${DISTANCE[o.distance]}` : ""}</dd></div>
        {(o.when || o.startsOn) && <div><dt>When</dt><dd>{[o.startsOn ? formatDay(o.startsOn) : null, o.when].filter(Boolean).join(" · ")}</dd></div>}
        <div><dt>Organized by</dt><dd>{o.organizer}</dd></div>
        <div><dt>How to take part</dt><dd>{o.how}</dd></div>
        {o.skills.length > 0 && <div><dt>Skills</dt><dd>{o.skills.join(", ")}</dd></div>}
      </dl>
      {o.url && <a className="text-button" href={o.url} target="_blank" rel="noopener noreferrer nofollow ugc">More details<ArrowRight size={16} /></a>}
      <Problem>{error}</Problem>
      <div className="gt-opp-actions">
        {chosen ? (
          sent.includes(chosen.id) ? <span className="gt-sent">Invited {chosen.person.name}</span>
            : <button className="glow-button" onClick={(e) => invite(chosen, e.currentTarget)}>Invite {chosen.person.name}<ArrowRight size={18} /></button>
        ) : guides.length > 0 ? (
          <button className="glow-button" onClick={() => setPick(true)}>Invite Your Give Guide<ArrowRight size={18} /></button>
        ) : null}
        <button className="text-button" aria-pressed={saved} onClick={toggle}>{saved ? <BookmarkCheck size={17} aria-hidden="true" /> : <Bookmark size={17} aria-hidden="true" />}{saved ? "Saved" : "Save"}</button>
        {o.mine ? <button className="text-button" onClick={close}>Close Listing</button>
          : <button className="text-button gt-subtle" onClick={() => setReport(true)}><Flag size={15} aria-hidden="true" />Report</button>}
      </div>
      {pick && (
        <Sheet title="Invite Your Give Guide" onClose={() => setPick(false)}>
          <p>Choose who to do this with. When they say yes, it becomes a Shared Wave.</p>
          <ul className="gt-rows">
            {guides.map((g) => (
              <li key={g.id} className="gt-row is-still">
                <span className="gt-avatar" aria-hidden="true">{g.person.name.slice(0, 1)}</span>
                <span className="gt-row-text"><b>{g.person.name}</b></span>
                {sent.includes(g.id) ? <span className="gt-sent">Invited</span> : <button className="workspace-button secondary" onClick={() => invite(g)}>Invite</button>}
              </li>
            ))}
          </ul>
          <Problem>{error}</Problem>
        </Sheet>
      )}
      {report && <Report opportunity={o.id} name="this listing" onClose={() => setReport(false)} />}
    </article>
  );
}

type Draft = {
  kind: string; title: string; need: string; cause: string; organizer: string; place: string; remote: boolean; pin: boolean;
  lat: number | null; lng: number | null; when: string; startsOn: string; how: string; url: string; skills: string[]; times: string[];
};

export function NewOpportunity() {
  const call = useCall();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { me } = useMe();
  const home = me?.profile?.located ? { lat: me.profile.lat, lng: me.profile.lng } : { lat: me?.where?.lat ?? null, lng: me?.where?.lng ?? null };
  const [d, setD] = useState<Draft>({
    kind: KINDS.some(([k]) => k === params.get("kind")) ? params.get("kind")! : "volunteer", title: "", need: "", cause: "", organizer: me?.profile?.name || "",
    place: me?.profile?.place || "", remote: false, pin: home.lat != null, lat: home.lat, lng: home.lng, when: "", startsOn: "", how: "", url: "", skills: [], times: [],
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setD((x) => ({ ...x, [k]: v }));
  const locate = () => navigator.geolocation?.getCurrentPosition(
    (p) => setD((x) => ({ ...x, lat: Math.round(p.coords.latitude * 10) / 10, lng: Math.round(p.coords.longitude * 10) / 10, pin: true })),
    () => setError("Location was not shared. The listing can still name its place."), { timeout: 10000 });
  const submit = async (e: FormEvent) => {
    e.preventDefault(); setError(""); setBusy(true);
    try {
      await call("opportunity.create", { ...d, lat: d.pin ? d.lat : null, lng: d.pin ? d.lng : null, cause: d.cause || null, url: d.url || null });
      const back = params.get("with");
      navigate(`/give/opportunities${back ? `?with=${encodeURIComponent(back)}` : ""}`, { state: { posted: true } });
    } catch (err) { setError((err as Error).message); setBusy(false); }
  };
  const teachback = d.kind === "teachback";
  return (
    <form className="gt-new" onSubmit={submit}>
      <PageHead title={teachback ? <>Organize A <span>Teachback</span></> : <>Post An <span>Opportunity</span></>}>
        <p>{teachback ? "Teach something together. The people who learn it teach it back, then teach one more person." : "Say what help is needed, where and when, who is organizing it, and how people take part."}</p>
      </PageHead>
      <section className="panel gt-card gt-section">
        <Choices legend="What kind is it?" single options={KINDS} value={[d.kind]} onChange={(v) => set("kind", v[0])} />
        {teachback && <p className="gt-hint">A Teachback: you learn something, teach it together, and the people who learned it teach it back. <Link to="/guide/teachback">Read about the Teachback</Link></p>}
        <label>Title<input required minLength={4} maxLength={90} value={d.title} placeholder={teachback ? "Spanish basics, taught back" : "Saturday river cleanup"} onChange={(e) => set("title", e.target.value)} /></label>
        <label>What help is needed?<textarea required minLength={10} maxLength={800} rows={4} value={d.need} onChange={(e) => set("need", e.target.value)} /></label>
        <label>Cause<select value={d.cause} onChange={(e) => set("cause", e.target.value)}><option value="">Choose a cause (optional)</option>{CAUSES.map(([k, t]) => <option key={k} value={k}>{t}</option>)}</select></label>
        <label>Organized by<input required minLength={2} maxLength={90} value={d.organizer} onChange={(e) => set("organizer", e.target.value)} /></label>
      </section>
      <section className="panel gt-card gt-section">
        <Switch label="This can be done remotely" checked={d.remote} onChange={(v) => set("remote", v)} />
        <label>Where{d.remote ? " (optional)" : ""}<input required={!d.remote} maxLength={90} value={d.place} placeholder="Harold Washington Library, Chicago" onChange={(e) => set("place", e.target.value)} /></label>
        <p className="gt-hint">Name a public place. Never post a home address.</p>
        <Switch label="Show it to people nearby" hint={d.lat != null ? "Uses an approximate point, rounded to about 10 km." : "Share an approximate point to turn this on."} checked={d.pin && d.lat != null} onChange={(v) => set("pin", v)} />
        <button type="button" className="text-button" onClick={locate}><LocateFixed size={17} aria-hidden="true" />Use this device’s location</button>
      </section>
      <section className="panel gt-card gt-section">
        <div className="gt-pair">
          <label>Start date (optional)<input type="date" value={d.startsOn} onChange={(e) => set("startsOn", e.target.value)} /></label>
          <label>When (optional)<input maxLength={120} value={d.when} placeholder="Saturdays, 10am to noon" onChange={(e) => set("when", e.target.value)} /></label>
        </div>
        <Choices legend="Good for" options={TIMES} value={d.times} onChange={(v) => set("times", v)} />
        <label>How to take part<textarea required minLength={6} maxLength={500} rows={3} value={d.how} placeholder="Meet at the front desk. Wear closed shoes." onChange={(e) => set("how", e.target.value)} /></label>
        <label>Link for more details (optional)<input type="url" maxLength={400} value={d.url} placeholder="https://" onChange={(e) => set("url", e.target.value)} /></label>
        <Tags label="Helpful skills (optional)" max={8} value={d.skills} onChange={(v) => set("skills", v)} />
      </section>
      <Problem>{error}</Problem>
      <div className="gt-save-row">
        <button type="submit" className="glow-button" disabled={busy}>{busy ? "Posting…" : teachback ? "Post This Teachback" : "Post This Opportunity"}<ArrowRight size={18} /></button>
        <p className="fine-print">New listings show as not yet verified until the Waves.Fund team checks them. Do not post anything that asks for money.</p>
      </div>
    </form>
  );
}
