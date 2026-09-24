import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, ArrowUpRight, Check, Coins, Copy, Hourglass, LocateFixed, Megaphone, Users } from "lucide-react";
import { ButtonLink, CONTACT, DONATE, External, Intro } from "./ui";
import { MindAnchor, Stock, energyFlow, mindEmerge, mindWave } from "./mind/WaveMind";

type Kind = "Time" | "Mentorship" | "Funding" | "Signal";
const CHOICES = [["Time", Hourglass], ["Mentorship", Users], ["Funding", Coins], ["Signal", Megaphone]] as const;

/* Give: the four ways to give are four guides out of one core. Light runs along all of them; the one you
   choose carries it brightest, and energy flows down a guide into the panel that tells you how. */
export function Give() {
  const [kind, setKind] = useState<Kind>("Funding");
  const [copied, setCopied] = useState(false);
  async function share() {
    try { await navigator.clipboard.writeText("https://waves.fund"); setCopied(true); }
    catch { setCopied(false); }
  }
  return (
    <div className="give-page document-page">
      <Intro eyebrow="GIVE" title={<>Funding The<br /><span>Future Together</span></>}>
        <p>Direct energy with intention.</p>
      </Intro>
      <div className="give-layout">
        <div className="give-orbit" data-feed-source>
          <MindAnchor name="vortex" className="give-mind" />
          <span className="give-core" id="give-core" aria-hidden="true">Support</span>
          {CHOICES.map(([k, Icon]) => (
            <button
              key={k}
              className={"orbit-choice choice-" + k.toLowerCase() + (kind === k ? " selected" : "")}
              aria-pressed={kind === k}
              data-beam-from="#give-core"
              data-beam-on={kind === k ? "on" : "off"}
              onClick={(event) => {
                setKind(k);
                setCopied(false);
                mindWave(event.currentTarget, 0.8);
                energyFlow(document.querySelector(".contribution-panel > .stock"));
              }}
            >
              <Icon size={22} strokeWidth={1.6} aria-hidden="true" />
              <span>{k}</span>
            </button>
          ))}
        </div>
        <section className="panel contribution-panel" aria-live="polite">
          <p className="eyebrow">{kind}</p>
          <h2>Support This Vision</h2>
          {kind === "Funding" ? (
            <>
              <p>Give directly to The Green Reef Foundation through its Benevity donation page.</p>
              <img className="giving-logo" src="/media/green-reef-logo.webp" alt="The Green Reef Foundation" />
              <External href={DONATE} className="glow-button">Give To Green Reef</External>
              <p className="fine-print">
                You will continue to Benevity. The Foundation and its giving provider handle your donation and receipt.
                This supports the Foundation’s mission; project-specific awards require a separate agreement.
              </p>
            </>
          ) : kind === "Signal" ? (
            <>
              <p>When Humanity Builds Together, We Change The World.</p>
              <button className="glow-button" onClick={share}>
                {copied ? "Link Copied" : "Copy Waves.Fund Link"}
                {copied ? <Check size={18} /> : <Copy size={18} />}
              </button>
              <a className="share-address" href="https://waves.fund">waves.fund</a>
            </>
          ) : (
            <>
              <p>
                {kind === "Time"
                  ? "Bring your time, attention, and practical support to work that matters."
                  : "Share what you know. Learn alongside builders. Help a project move forward."}
              </p>
              <ButtonLink to={kind === "Mentorship" ? "/guide/apply" : "/contribute?type=Time"}>
                {kind === "Mentorship" ? "Become A Wave Guide" : "Offer Your Time"}
              </ButtonLink>
              {kind === "Time" && <a className="text-button near-jump" href="#near-you">Volunteer near you <ArrowRight size={16} /></a>}
              <p className="fine-print">Tell the team what you can offer and when. They will review your submission and contact you about a match.</p>
            </>
          )}
          <Stock level={0.3} feed="#give-core" />
        </section>
      </div>
      <NearYou />
      <section className="section contact-strip">
        <div>
          <p className="eyebrow">PARTNERSHIPS & IMPACT INVESTMENT</p>
          <h2>Welcome To The Frontier Of Funding</h2>
        </div>
        <a className="text-button" href={`mailto:${CONTACT}`}>{CONTACT}<ArrowRight size={17} /></a>
      </section>
    </div>
  );
}

type Opportunity = {
  id: string; source: string; url: string; title: string; org: string; summary: string; remote: boolean;
  place: string | null; lat: number | null; lng: number | null; when: string | null; rhythm: string | null; tags: string[]; km: number | null;
};
type Feed = { place: { city: string; region: string; country: string; exact: boolean }; at: { lat: number; lng: number } | null; items: Opportunity[]; city: { name: string; url: string } | null; sources: string[]; partial: boolean };
type Filter = "all" | "near" | "remote";

/* Volunteer near you: live opportunities from open sources, and a constellation of where they are. You are
   the centre; each place you could give your time is a node at its real bearing, nearer ones closer in,
   remote roles on the outer ring. The list is the real interface; the constellation mirrors it. */
function NearYou() {
  const section = useRef<HTMLElement>(null);
  const [feed, setFeed] = useState<Feed | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [filter, setFilter] = useState<Filter>("all");
  const [active, setActive] = useState<string | null>(null);
  const [locating, setLocating] = useState(false);
  const load = (coords?: { lat: number; lng: number }) => {
    setStatus("loading");
    // A shared location is rounded to about ten kilometres before it leaves the browser.
    const q = coords ? `?lat=${coords.lat.toFixed(1)}&lng=${coords.lng.toFixed(1)}` : "";
    fetch("/api/volunteer" + q)
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((data: Feed) => {
        setFeed(data);
        setStatus("ready");
        requestAnimationFrame(() => mindEmerge(section.current?.querySelector(".near-you-map") ?? null, "star"));
      })
      .catch(() => setStatus("error"));
  };
  useEffect(() => {
    const el = section.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { io.disconnect(); load(); } }, { rootMargin: "400px 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  const exact = () => {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (p) => { setLocating(false); load({ lat: p.coords.latitude, lng: p.coords.longitude }); },
      () => setLocating(false),
      { maximumAge: 600000, timeout: 10000 },
    );
  };
  const items = feed?.items ?? [];
  const near = items.filter((x) => !x.remote && x.km != null);
  const shown = filter === "near" ? near : filter === "remote" ? items.filter((x) => x.remote) : items;
  const where = !feed ? "" : feed.place.exact ? "Near you" : feed.place.city ? `Near ${[feed.place.city, feed.place.region].filter(Boolean).join(", ")}` : "Near you";
  return (
    <section className="section near-you" id="near-you" ref={section} aria-labelledby="near-you-title">
      <div className="near-you-head">
        <p className="eyebrow">GIVE YOUR TIME</p>
        <h2 id="near-you-title">Volunteer Near You</h2>
        <p className="near-you-where">
          {where}
          {feed && !feed.place.exact && <span> (approximate)</span>}
          <button type="button" className="text-button" onClick={exact} disabled={locating}>
            <LocateFixed size={16} aria-hidden="true" />{locating ? "Finding you…" : "Use my exact location"}
          </button>
        </p>
      </div>
      <div className="near-you-body">
        <Constellation items={shown} at={feed?.at ?? null} active={active} onActive={setActive} />
        <div className="near-you-feed">
          <div className="near-you-filter" role="group" aria-label="Show">
            {([["all", "All", items.length], ["near", "In Person", near.length], ["remote", "Remote", items.length - near.length]] as const).map(([k, label, n]) => (
              <button key={k} type="button" aria-pressed={filter === k} onClick={() => setFilter(k)}>{label}<span>{n}</span></button>
            ))}
          </div>
          {status === "loading" && <p className="near-you-note" role="status">Finding opportunities near you…</p>}
          {status === "error" && <p className="near-you-note" role="alert">Opportunities are unavailable right now. <button type="button" className="text-button" onClick={() => load()}>Try again</button></p>}
          {status === "ready" && !shown.length && !(feed?.city && filter !== "remote") && <p className="near-you-note">No listings from our sources here yet. Try remote roles, or search the wider networks below.</p>}
          {feed?.city && filter !== "remote" && (
            <External href={feed.city.url} className="near-card near-city">
              <span className="near-card-where">In person · Idealist</span>
              <strong>Volunteer in {feed.city.name}</strong>
              <span className="near-card-org">See every in-person opportunity near {feed.city.name} on Idealist.</span>
            </External>
          )}
          <ul className="near-you-list">
            {shown.slice(0, 24).map((x) => (
              <li key={x.id}>
                <a
                  className={"near-card" + (active === x.id ? " is-active" : "")}
                  href={x.url}
                  target="_blank"
                  rel="noreferrer noopener"
                  onPointerEnter={() => setActive(x.id)}
                  onPointerLeave={() => setActive(null)}
                  onFocus={() => setActive(x.id)}
                  onBlur={() => setActive(null)}
                >
                  <span className="near-card-where">{x.remote ? `Remote${x.place ? " · " + x.place : ""}` : x.km != null ? `${x.km < 1 ? "Under 1" : x.km} km away` : x.place || "In person"}</span>
                  <strong>{x.title}</strong>
                  <span className="near-card-org">{x.org}</span>
                  {(x.when || x.rhythm) && <span className="near-card-when">{[x.rhythm, x.when].filter(Boolean).join(" · ")}</span>}
                  {x.tags.length > 0 && <span className="near-card-tags">{x.tags.map((t) => <i key={t}>{t}</i>)}</span>}
                  <ArrowUpRight className="near-card-go" size={18} aria-hidden="true" />
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <p className="fine-print near-you-sources">
        {feed?.sources.length ? `Listings from ${feed.sources.join(" and ")}. ` : ""}Each one opens on the organization’s own listing. Your location is only used to sort them and is not stored.
      </p>
      <div className="near-you-more">
        <External href="https://www.idealist.org/en/volunteer" className="text-button">Search Idealist</External>
        <External href="https://www.idealist.org/volunteermatch" className="text-button">VolunteerMatch on Idealist</External>
      </div>
    </section>
  );
}

function bearing(from: { lat: number; lng: number }, to: { lat: number; lng: number }) {
  const r = Math.PI / 180, y = Math.sin((to.lng - from.lng) * r) * Math.cos(to.lat * r);
  const x = Math.cos(from.lat * r) * Math.sin(to.lat * r) - Math.sin(from.lat * r) * Math.cos(to.lat * r) * Math.cos((to.lng - from.lng) * r);
  return Math.atan2(y, x);
}

function Constellation({ items, at, active, onActive }: { items: Opportunity[]; at: { lat: number; lng: number } | null; active: string | null; onActive: (id: string | null) => void }) {
  const W = 600, H = 400, cx = W / 2, cy = H / 2;
  const nodes = useMemo(() => {
    const local = items.filter((x) => !x.remote && x.km != null).slice(0, 24);
    const far = items.filter((x) => x.remote).slice(0, 18);
    const maxKm = Math.max(10, ...local.map((x) => x.km!));
    const out: { id: string; x: number; y: number; r: number; remote: boolean; i: number }[] = [];
    local.forEach((x, i) => {
      // Its real bearing from you when both ends are known; otherwise spread evenly round you.
      const a = at && x.lat != null && x.lng != null ? bearing(at, { lat: x.lat, lng: x.lng }) + (i % 3) * 0.05 : i * 2.39996;
      const d = 46 + (Math.log1p(x.km!) / Math.log1p(maxKm)) * 118;
      out.push({ id: x.id, x: cx + Math.sin(a) * d, y: cy - Math.cos(a) * d * 0.82, r: 5.2, remote: false, i });
    });
    far.forEach((x, i) => {
      const a = (i / Math.max(1, far.length)) * Math.PI * 2 + 0.3;
      out.push({ id: x.id, x: cx + Math.cos(a) * 262, y: cy + Math.sin(a) * 170, r: 3.4, remote: true, i: local.length + i });
    });
    return out;
  }, [items, at]);
  return (
    <svg className="near-you-map" viewBox={`0 0 ${W} ${H}`} aria-hidden="true" data-clear>
      <defs>
        <radialGradient id="ny-core"><stop offset="0" stopColor="#f2feff" /><stop offset=".35" stopColor="#7cecff" /><stop offset="1" stopColor="#2f8dff" stopOpacity="0" /></radialGradient>
        <linearGradient id="ny-line" x1="0" x2="1"><stop offset="0" stopColor="#7cecff" stopOpacity=".7" /><stop offset="1" stopColor="#9a86ff" stopOpacity=".15" /></linearGradient>
      </defs>
      <ellipse cx={cx} cy={cy} rx={262} ry={170} className="ny-ring" />
      <ellipse cx={cx} cy={cy} rx={164} ry={134} className="ny-ring ny-ring-in" />
      {nodes.map((n) => (
        <line key={"l" + n.id} x1={cx} y1={cy} x2={n.x} y2={n.y} className={"ny-link" + (n.remote ? " far" : "") + (active === n.id ? " on" : "")} style={{ animationDelay: `${n.i * 45}ms` }} />
      ))}
      <circle cx={cx} cy={cy} r={34} fill="url(#ny-core)" className="ny-you" />
      <circle cx={cx} cy={cy} r={7} className="ny-you-dot" />
      {nodes.map((n) => (
        <g key={n.id} className={"ny-node" + (n.remote ? " far" : "") + (active === n.id ? " on" : "")} style={{ animationDelay: `${120 + n.i * 45}ms` }} onPointerEnter={() => onActive(n.id)} onPointerLeave={() => onActive(null)}>
          <circle cx={n.x} cy={n.y} r={n.r * 3.2} className="ny-halo" />
          <circle cx={n.x} cy={n.y} r={n.r} />
        </g>
      ))}
    </svg>
  );
}
