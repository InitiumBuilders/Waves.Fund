import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Activity, ArrowDownToLine, ArrowUpRight, Clock3, Eye, FileText, LockKeyhole, LogOut, RefreshCw } from "lucide-react";
import { api } from "./community";
import "./trax.css";

type Period = "today" | "week" | "month" | "lifetime";
type PageTotal = { page: string; views: number; ms: number };
type PageSort = "views" | "ms" | "average";
const pageValue = (page: PageTotal, sort: PageSort) =>
  sort === "average" ? (page.views ? page.ms / page.views : 0) : page[sort];
type Total = { from: string | null; to: string; views: number; projects: number; ms: number; pages: PageTotal[] };
type Report = {
  updated: string; timezone: string; firstRecordedDay: string | null;
  periods: Record<Period, Total>;
  series: { day: string; views: number; ms: number }[];
};
type ActivityRecord = { id: string; page: string; sequence: number; ms: number; at: number };
const periodLabels: Record<Period, string> = { today: "Today", week: "This Week", month: "This Month", lifetime: "Lifetime" };
const pageNames: Record<string, string> = {
  "/now-lets-begin": "Now, Let’s Begin",
  "/": "What’s Your Vision?", "/learn": "Learn", "/guide": "Wave Guides", "/give": "Give", "/grow": "Grow",
  "/waves": "Waves", "/projects": "Projects", "/projects/:project": "Project Details", "/apply": "Submit A Project", "/guide/apply": "Wave Guide Application",
  "/contribute": "Contribute", "/guide/team": "The Waves Fund Team", "/guide/partners": "Partners",
  "/guide/partners/green-reef": "Green Reef Foundation", "/guide/partners/green-reef/proposal": "Green Reef Proposal",
  "/guide/partners/semble": "Partner · Semble.CC", "/guide/partners/ocean97": "Ocean97.Com", "/privacy": "Privacy & Participation",
};
const number = (value: number) => new Intl.NumberFormat("en-US").format(value);
function duration(ms: number) {
  const seconds = Math.floor(ms / 1000);
  if (!seconds) return "0s";
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
  const hours = Math.floor(seconds / 3600);
  return `${number(hours)}h ${Math.floor((seconds % 3600) / 60)}m`;
}
function dateLabel(day: string) {
  return new Date(day + "T12:00:00Z").toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
}
function measuredPage(path: string) {
  if (/^\/projects\/[a-f0-9-]{36}$/.test(path)) return "/projects/:project";
  return Object.hasOwn(pageNames, path) ? path : null;
}
function allowedBrowser() {
  const nav = navigator as Navigator & { globalPrivacyControl?: boolean };
  return ["waves.fund", "www.waves.fund"].includes(location.hostname) &&
    nav.doNotTrack !== "1" && !nav.globalPrivacyControl && !nav.webdriver;
}
function sendActivity(record: ActivityRecord, attempt = 0) {
  if (!allowedBrowser()) return;
  fetch("/api/trax", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify(record), keepalive: true,
  }).then((response) => {
    if (!response.ok && response.status >= 500) throw Error("Collection unavailable");
  }).catch(() => {
    if (attempt < 2) window.setTimeout(() => sendActivity(record, attempt + 1), 3000 * (attempt + 1));
  });
}

/** Anonymous per-page measurements only. No cookies, persistent IDs or input values. */
export function TraxCollector() {
  const { pathname } = useLocation();
  useEffect(() => {
    const page = measuredPage(pathname);
    if (!page || !allowedBrowser()) return;
    let dispose: (() => void) | undefined;
    // Deferring one task avoids a duplicate view in React's development checks.
    const start = window.setTimeout(() => {
      const id = crypto.randomUUID();
      let sequence = 0, pending = 0, viewed = false, last = performance.now();
      let lastActivity = last, lastSend = last;
      const interactive = () => !document.hidden && document.hasFocus();
      const initial = () => {
        if (viewed || document.hidden) return;
        viewed = true;
        sendActivity({ id, page, sequence: 0, ms: 0, at: Date.now() });
      };
      const flush = () => {
        if (pending < 1000 || !viewed || sequence >= 1440) return;
        sequence++;
        const ms = Math.min(30000, Math.floor(pending));
        pending = 0;
        lastSend = performance.now();
        sendActivity({ id, page, sequence, ms, at: Date.now() });
      };
      const tick = () => {
        const now = performance.now(), elapsed = now - last;
        // A suspended timer cannot add time from a background tab or sleeping device.
        if (interactive() && elapsed < 2500 && now - lastActivity < 60000) pending += elapsed;
        last = now;
        initial();
        if (pending >= 29000 || now - lastSend >= 30000) flush();
      };
      const touch = () => { tick(); lastActivity = performance.now(); };
      const visibility = () => { tick(); flush(); last = performance.now(); if (!document.hidden) lastActivity = last; };
      const leave = () => { tick(); flush(); };
      const events = ["pointerdown", "pointermove", "keydown", "scroll", "touchstart"] as const;
      events.forEach((name) => window.addEventListener(name, touch, { passive: true }));
      window.addEventListener("blur", leave);
      window.addEventListener("focus", touch);
      window.addEventListener("pagehide", leave);
      document.addEventListener("visibilitychange", visibility);
      const interval = window.setInterval(tick, 1000);
      initial();
      dispose = () => {
        leave();
        clearInterval(interval);
        events.forEach((name) => window.removeEventListener(name, touch));
        window.removeEventListener("blur", leave);
        window.removeEventListener("focus", touch);
        window.removeEventListener("pagehide", leave);
        document.removeEventListener("visibilitychange", visibility);
      };
    }, 0);
    return () => { clearTimeout(start); dispose?.(); };
  }, [pathname]);
  return null;
}

async function loadReport(): Promise<Report> {
  const response = await fetch("/api/trax");
  const data = await response.json();
  if (!response.ok) throw Object.assign(Error(data.error || "Unable to load Trax."), { status: response.status });
  return data;
}
function exportReport(report: Report, period: Period) {
  const current = report.periods[period];
  const quote = (value: string | number) => `"${String(value).replaceAll('"', '""')}"`;
  const rows: (string | number)[][] = [
    ["Waves.Fund · Trax", periodLabels[period]], ["Time zone", report.timezone], ["Updated", report.updated],
    ["Views", current.views], ["Projects submitted", current.projects], ["Engaged seconds", Math.floor(current.ms / 1000)], [],
    ["Page", "Views", "Engaged seconds", "Average seconds per view"],
    ...current.pages.map((page) => [page.page, page.views, Math.floor(page.ms / 1000), page.views ? Math.floor(page.ms / page.views / 1000) : 0]),
  ];
  const url = URL.createObjectURL(new Blob([rows.map((row) => row.map(quote).join(",")).join("\r\n")], { type: "text/csv;charset=utf-8;" }));
  const link = document.createElement("a");
  link.href = url; link.download = `waves-trax-${period}-${current.to}.csv`; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function Trend({ report, metric }: { report: Report; metric: "views" | "ms" }) {
  const max = Math.max(...report.series.map((day) => day[metric]), 1);
  const values = report.series.map((day, index) => ({ x: 12 + index * 20.55, y: 130 - day[metric] / max * 105, ...day }));
  const line = values.map((point, index) => `${index ? "L" : "M"}${point.x.toFixed(1)},${point.y.toFixed(1)}`).join(" ");
  return (
    <div className="trax-trend">
      <svg viewBox="0 0 580 150" role="img" aria-label={`Last 28 days: ${number(report.series.reduce((sum, day) => sum + day.views, 0))} measured views and ${duration(report.series.reduce((sum, day) => sum + day.ms, 0))} engaged time.`}>
        <defs><linearGradient id="trax-area" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="#31d9ff" stopOpacity=".2" /><stop offset="100%" stopColor="#31d9ff" stopOpacity="0" /></linearGradient></defs>
        {[25, 77, 130].map((y) => <line key={y} x1="12" y1={y} x2="567" y2={y} className="trax-gridline" />)}
        <path d={`${line} L567,145 L12,145 Z`} fill="url(#trax-area)" />
        <path d={line} className="trax-line" />
        {values.map((point) => <circle key={point.day} cx={point.x} cy={point.y} r={point[metric] ? 3 : 1.5} fill={point[metric] ? "#b7faff" : "#57819c"}><title>{dateLabel(point.day)}: {metric === "views" ? `${point.views} views` : duration(point.ms)}</title></circle>)}
      </svg>
      <div className="trax-axis"><span>{dateLabel(report.series[0].day)}</span><span>{metric === "views" ? `${number(max === 1 && !report.series.some((d) => d.views) ? 0 : max)} peak views` : `${duration(max === 1 ? 0 : max)} peak`}</span><span>Today</span></div>
    </div>
  );
}

export function Trax() {
  const [report, setReport] = useState<Report | null>(null);
  const [period, setPeriod] = useState<Period>("today"), [sort, setSort] = useState<PageSort>("views");
  const [metric, setMetric] = useState<"views" | "ms">("views");
  const [busy, setBusy] = useState(true), [locked, setLocked] = useState(false), [error, setError] = useState("");
  const [teamKey, setTeamKey] = useState("");
  const refresh = useCallback(async () => {
    setBusy(true); setError("");
    try { setReport(await loadReport()); setLocked(false); }
    catch (e) {
      if ((e as Error & { status?: number }).status === 401) { setLocked(true); setReport(null); }
      else setError((e as Error).message);
    } finally { setBusy(false); }
  }, []);
  useEffect(() => {
    void refresh();
    const timer = window.setInterval(() => { if (!document.hidden) void refresh(); }, 60000);
    return () => clearInterval(timer);
  }, [refresh]);
  async function login(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError("");
    try { await api("login", { key: teamKey }); setTeamKey(""); await refresh(); }
    catch (e) { setError((e as Error).message); setBusy(false); }
  }
  async function logout() {
    setBusy(true);
    try { await api("logout", {}); setReport(null); setLocked(true); }
    catch (e) { setError((e as Error).message); }
    finally { setBusy(false); }
  }
  const rows = useMemo(() => [...(report?.periods[period].pages || [])].sort((a, b) => pageValue(b, sort) - pageValue(a, sort) || b.views - a.views), [report, period, sort]);
  const current = report?.periods[period];
  return (
    <div className="trax-page">
      <header className="trax-heading">
        <div><p className="eyebrow"><Activity size={14} /> WAVES.FUND / TRAX</p><h1>Measure What Moves.</h1><p>People arriving. Projects beginning. Time given.</p></div>
        <span className="trax-private"><LockKeyhole size={13} /> Private Team View</span>
      </header>
      {error && <p className="trax-error" role="alert">{error}</p>}
      {locked ? (
        <form className="trax-login" onSubmit={login}>
          <LockKeyhole size={26} />
          <h2>Your View Of The Waves.</h2>
          <p>Use the same team key as application review.</p>
          <label htmlFor="trax-key">Team Key</label>
          <input id="trax-key" type="password" autoComplete="current-password" value={teamKey} onChange={(e) => setTeamKey(e.target.value)} required />
          <button className="glow-button" type="submit" disabled={busy}>{busy ? "Opening…" : "Open Trax"}<ArrowUpRight size={18} /></button>
        </form>
      ) : !report ? (
        <div className="trax-loading" role="status"><Activity size={26} /><p>{busy ? "Gathering The View…" : "The dashboard is temporarily unavailable."}</p>{!busy && <button className="text-button" onClick={() => void refresh()}>Try Again</button>}</div>
      ) : <>
        <div className="trax-toolbar">
          <p><span className="trax-live-dot" /> {busy ? "Updating…" : `Updated ${new Date(report.updated).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: report.timezone })}`} <span className="trax-zone">· Chicago time</span></p>
          <div><button className="icon-button" aria-label="Refresh Analytics" title="Refresh Analytics" disabled={busy} onClick={() => void refresh()}><RefreshCw size={17} className={busy ? "trax-refreshing" : ""} /></button><button className="icon-button" aria-label="Download Selected Period" title="Download Selected Period" onClick={() => exportReport(report, period)}><ArrowDownToLine size={17} /></button><button className="icon-button" aria-label="Sign Out Of Team Access" title="Sign Out" disabled={busy} onClick={() => void logout()}><LogOut size={17} /></button></div>
        </div>
        <section className="trax-periods" aria-label="Analytics Periods">
          {(Object.keys(periodLabels) as Period[]).map((name) => {
            const total = report.periods[name];
            return <button key={name} className={`trax-period ${period === name ? "selected" : ""}`} aria-pressed={period === name} onClick={() => setPeriod(name)}>
              <span className="trax-period-label">{periodLabels[name]}</span>
              <strong>{number(total.views)}</strong><span className="trax-view-label">Views</span>
              <span className="trax-submetric"><FileText size={13} /><b>{number(total.projects)}</b> Projects Submitted</span>
              <span className="trax-submetric"><Clock3 size={13} /><b>{duration(total.ms)}</b> Engaged Time</span>
            </button>;
          })}
        </section>
        <div className="trax-main-grid">
          <section className="trax-surface trax-chart" aria-labelledby="trax-trend-title">
            <div className="trax-section-heading"><div><p className="eyebrow">THE LAST 28 DAYS</p><h2 id="trax-trend-title">A View Over Time</h2></div><div className="trax-switch" aria-label="Chart Metric"><button aria-pressed={metric === "views"} onClick={() => setMetric("views")}><Eye size={14} />Views</button><button aria-pressed={metric === "ms"} onClick={() => setMetric("ms")}><Clock3 size={14} />Time</button></div></div>
            <Trend report={report} metric={metric} />
            {!report.firstRecordedDay && <p className="trax-quiet">The first measured visits will appear here. Earlier traffic is not reconstructed.</p>}
          </section>
          <aside className="trax-surface trax-focus">
            <p className="eyebrow">{periodLabels[period].toUpperCase()}</p><h2>Time, Together.</h2>
            <strong>{duration(current!.ms)}</strong><p>Total active time across public pages.</p>
            <div className="trax-focus-line"><span>Projects Submitted</span><b>{number(current!.projects)}</b></div>
            <Link to="/team/review">Open Application Review <ArrowUpRight size={15} /></Link>
          </aside>
        </div>
        <section className="trax-surface trax-pages" aria-labelledby="trax-pages-title">
          <div className="trax-section-heading"><div><p className="eyebrow">{periodLabels[period].toUpperCase()} · {current?.from ? `${dateLabel(current.from)} – ${dateLabel(current.to)}` : "ALL MEASURED ACTIVITY"}</p><h2 id="trax-pages-title">Where People Spend Time</h2></div><label className="trax-sort">Sort By<select value={sort} onChange={(e) => setSort(e.target.value as PageSort)}><option value="views">Most Views</option><option value="ms">Most Total Time</option><option value="average">Most Time Per View</option></select></label></div>
          {rows.length ? <div className="trax-table-scroll" tabIndex={0} role="region" aria-label="Page Analytics"><table><thead><tr><th scope="col">Page</th><th scope="col">Views</th><th scope="col">Total Time</th><th scope="col">Time / View</th></tr></thead><tbody>{rows.map((page) => <tr key={page.page}><th scope="row"><span className="trax-page-name">{page.page === "/guide/partners/semble" && <img src="/media/semble-logo.webp" alt="" />}{pageNames[page.page] || page.page}</span><span className="trax-page-path">{page.page}</span><span className="trax-page-bar" style={{ width: `${Math.max(2, pageValue(page, sort) / Math.max(...rows.map((r) => pageValue(r, sort)), 1) * 100)}%` }} /></th><td><span className="trax-mobile-label" aria-hidden="true">Views</span>{number(page.views)}</td><td><span className="trax-mobile-label" aria-hidden="true">Total Time</span>{duration(page.ms)}</td><td><span className="trax-mobile-label" aria-hidden="true">Time / View</span>{page.views ? duration(page.ms / page.views) : "—"}</td></tr>)}</tbody></table></div> : <p className="trax-empty">No measured page activity in this period yet.</p>}
        </section>
        <details className="trax-method">
          <summary>What These Numbers Mean</summary>
          <div><p><strong>Views</strong> count measured page openings, including returning visits. They are not a count of unique people. Today, this Monday-to-Sunday week, and this calendar month use America/Chicago time. Lifetime traffic starts {report.firstRecordedDay ? `with the first recorded activity on ${dateLabel(report.firstRecordedDay)}` : "with this analytics release"}; earlier visits cannot be recovered.</p>
          <p><strong>Engaged time</strong> counts a visible, focused page while the visitor has interacted within the last 60 seconds. Collection pauses in background tabs and after idle time. Time is sent in short intervals; closing a browser, blockers, offline use, and declined tracking may leave activity unmeasured. Time / View is the period’s engaged time divided by its page views; visits crossing midnight can contribute time to a different day.</p>
          <p><strong>Projects submitted</strong> come from real project submissions, using their original submission dates. Guide and time contributions are excluded. An anonymous submission count remains when a private application is deleted; its name, email and project content are not retained in analytics.</p>
          <p><strong>Privacy</strong> comes first: no names, form values, search text, referrers, location or full URLs enter activity records. A temporary random page identifier only prevents duplicate counts. Do Not Track and Global Privacy Control are respected. Team pages, this dashboard, automated browsers and non-production hosts are excluded. Known bots are filtered; these totals are directional analytics, not audited financial or identity records.</p>
          <p><strong>Retention</strong>: raw activity is compacted into anonymous daily totals once its calendar day is over 48 hours old, on a dashboard refresh. Temporary collection limits are cleared at the same time. Daily totals are retained for lifetime reporting. Only the team can open or export this dashboard.</p></div>
        </details>
      </>}
    </div>
  );
}

