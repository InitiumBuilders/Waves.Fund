import { useCallback, useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";

type Overview = {
  counts: { profiles: number; seeking: number; connections: number; waves: number };
  reports: { id: string; reason: string; detail: string | null; at: string; reporter: string | null; reported: string | null; reportedStatus: string | null; opportunity: string | null }[];
  paused: { ref: string; name: string }[];
  opportunities: { id: string; kind: string; title: string; need: string; organizer: string; place: string | null; remote: boolean; when: string | null; how: string; url: string | null; createdAt: string }[];
};
const REASON: Record<string, string> = { unsafe: "Feels unsafe", harassment: "Harassment", spam: "Spam or selling", fake: "Fake profile or listing", underage: "May be under 18", other: "Something else" };

/* Give Together in Team Review: reports to act on, and member listings waiting for a check.
   Uses the same Team Review sign-in cookie as the applications above. */
export function GiveReview() {
  const [data, setData] = useState<Overview | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    const r = await fetch("/api/give?action=team", { credentials: "same-origin" });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(d.error || "Give Together could not load.");
    setData(d);
  }, []);
  useEffect(() => { load().catch((e) => setError(e.message)); }, [load]);
  const act = async (action: string, body: object) => {
    setBusy(true); setError("");
    try {
      const r = await fetch(`/api/give?action=${action}`, { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error || "That did not work.");
      await load();
    } catch (e) { setError((e as Error).message); }
    finally { setBusy(false); }
  };
  return (
    <section className="give-review" aria-labelledby="give-review-title">
      <div className="admin-tools">
        <h2 id="give-review-title">Give Together</h2>
        <button className="text-button" onClick={() => load().catch((e) => setError(e.message))}>Refresh <RefreshCw size={16} /></button>
      </div>
      {data && <p className="fine-print">{data.counts.profiles} Give Profiles · {data.counts.seeking} looking for a Give Guide · {data.counts.connections} connections · {data.counts.waves} Shared Waves</p>}
      {error && <p className="error-message" role="alert">{error}</p>}

      <h3>Open Reports</h3>
      {data && data.reports.length === 0 && <p className="fine-print">No open reports.</p>}
      {data?.reports.map((r) => (
        <article className="panel review-card" key={r.id}>
          <div className="row-heading"><p className="eyebrow">{REASON[r.reason] || r.reason}</p>{r.reportedStatus && <span className="status-chip">{r.reportedStatus}</span>}</div>
          <p>{r.detail || "No detail given."}</p>
          <dl>
            <div><dt>About</dt><dd>{r.opportunity ? `Listing: ${r.opportunity}` : r.reported || "A deleted profile"}</dd></div>
            <div><dt>Reported by</dt><dd>{r.reporter || "A deleted profile"}</dd></div>
            <div><dt>Received</dt><dd>{new Date(r.at).toLocaleString()}</dd></div>
          </dl>
          <div className="admin-tools">
            <button className="text-button" disabled={busy} onClick={() => act("team.report", { id: r.id, outcome: "dismiss" })}>Dismiss</button>
            {r.reported && r.reportedStatus !== "suspended" && <button className="text-button" disabled={busy} onClick={() => { if (window.confirm("Pause this profile? Their matching and connections end while it is paused.")) act("team.report", { id: r.id, outcome: "suspend" }); }}>Pause Profile</button>}
            {r.reportedStatus === "suspended" && <button className="text-button" disabled={busy} onClick={() => act("team.report", { id: r.id, outcome: "restore" })}>Restore Profile</button>}
            {r.opportunity && <button className="text-button" disabled={busy} onClick={() => act("team.report", { id: r.id, outcome: "hide" })}>Hide Listing</button>}
          </div>
        </article>
      ))}

      {data && data.paused.length > 0 && (
        <>
          <h3>Paused Profiles</h3>
          <ul className="give-review-paused">
            {data.paused.map((p) => <li key={p.ref}><span>{p.name}</span><button className="text-button" disabled={busy} onClick={() => act("team.profile", { ref: p.ref })}>Restore Profile</button></li>)}
          </ul>
        </>
      )}

      <h3>Listings Waiting For A Check</h3>
      <p className="fine-print">Mark a listing verified only after you have confirmed the organizer and the place are real. Members see “Verified by Waves.Fund” on it.</p>
      {data && data.opportunities.length === 0 && <p className="fine-print">Nothing waiting.</p>}
      {data?.opportunities.map((o) => (
        <article className="panel review-card" key={o.id}>
          <p className="eyebrow">{o.kind}</p>
          <h2>{o.title}</h2>
          <p>{o.need}</p>
          <dl>
            <div><dt>Organized by</dt><dd>{o.organizer}</dd></div>
            <div><dt>Where</dt><dd>{o.remote ? "Remote" : ""}{o.remote && o.place ? " · " : ""}{o.place}</dd></div>
            {o.when && <div><dt>When</dt><dd>{o.when}</dd></div>}
            <div><dt>How to take part</dt><dd>{o.how}</dd></div>
            {o.url && <div><dt>Link</dt><dd><a href={o.url} target="_blank" rel="noopener noreferrer nofollow">{o.url}</a></dd></div>}
            <div><dt>Posted</dt><dd>{new Date(o.createdAt).toLocaleString()}</dd></div>
          </dl>
          <div className="admin-tools">
            <button className="text-button" disabled={busy} onClick={() => act("team.opportunity", { id: o.id, verified: true })}>Mark Verified</button>
            <button className="text-button" disabled={busy} onClick={() => { if (window.confirm("Hide this listing from everyone?")) act("team.opportunity", { id: o.id, hide: true }); }}>Hide Listing</button>
          </div>
        </article>
      ))}
    </section>
  );
}
