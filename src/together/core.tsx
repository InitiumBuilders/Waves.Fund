import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { BadgeCheck, Check, CircleDashed, Compass, NotebookPen, UserRound, Users, X } from "lucide-react";

// ---- Shapes returned by /api/give ---------------------------------------------------------------
export type Shares = { place: boolean; statement: boolean; skills: boolean; teach: boolean };
export type Profile = {
  ref: string; name: string; gives: string[]; causes: string[]; causeOther: string | null; times: string[]; ways: string[];
  skills: string[]; teach: string[]; learn: string[]; availability: string | null; place: string | null; located: boolean; lat: number | null; lng: number | null;
  statement: string | null; shares: Shares; seeking: boolean; adult: boolean; status: string; updatedAt: string;
};
export type Person = {
  ref: string; name: string; gives: string[]; causes: string[]; times: string[]; ways: string[]; place: string | null;
  statement: string | null; skills: string[]; teach: string[]; learn: string[];
};
export type Common = {
  causes: string[]; gives: string[]; times: string[]; ways: string[]; skills: string[]; teachYou: string[]; teachThem: string[];
  teachback: boolean; distance: "near" | "region" | "far" | null;
};
export type Match = { person: Person; common: Common; score: number };
export type Connection = {
  id: string; status: "pending" | "accepted"; direction: "in" | "out"; note: string | null; createdAt: string;
  respondedAt: string | null; lastMessage?: string | null; person: Person; common: Common;
};
export type Message = { id: string; mine: boolean; body: string; at: string };
export type Opportunity = {
  id: string; kind: string; title: string; need: string; cause: string | null; organizer: string; place: string | null; remote: boolean;
  when: string | null; startsOn: string | null; how: string; url: string | null; skills: string[]; times: string[]; verified: boolean;
  mine: boolean; saved: boolean; createdAt: string; distance?: "near" | "region" | null;
};
export type Session = { day: string; hours: number; together: boolean; note?: string | null };
export type GratusNote = { day: string; message: string | null; point: boolean };
export type Wave = {
  id: string; status: "proposed" | "active" | "completed" | "declined" | "withdrawn"; proposedByMe: boolean; connection: string;
  createdAt: string; opportunity: Opportunity | null; guide: { ref: string | null; name: string };
  sessions: { mine: Session[]; theirs: Session[] }; confirmed: { day: string; hours: number }[];
  gratus: { sent: GratusNote[]; received: GratusNote[] };
  events: { kind: string; mine: boolean; detail: Record<string, unknown>; at: string }[];
};
export type Where = { place: string | null; lat: number | null; lng: number | null };
export type Me = { profile: Profile | null; invites?: number; guides?: number; waves?: number; where?: Where };

// ---- The words for each choice. The question and option wording is August's. ----------------------------
export const GIVES: [string, string, string?][] = [
  ["time", "My Time"], ["skills", "My Skills"], ["resources", "My Resources"], ["financial", "Financial Support"],
  ["teachback", "Teach Together", "Teach something together, or organize or join a Teachback"],
];
export const CAUSES: [string, string][] = [
  ["community", "My Community"], ["families", "Families"], ["education", "Education"], ["animals", "Animals"],
  ["environment", "The Environment"], ["relief", "Emergency Relief"], ["other", "Other"],
];
export const TIMES: [string, string][] = [["today", "Today"], ["week", "This Week"], ["weekends", "Weekends"], ["flexible", "Flexible"]];
export const WAYS: [string, string][] = [["one", "With One Person"], ["team", "With a Team"], ["own", "On My Own"]];
export const KINDS: [string, string][] = [["volunteer", "Volunteer"], ["teachback", "Teachback"], ["event", "Event"]];
export const SENTIMENTS = ["I believe in making a difference together", "Together we can make a difference", "We can do more together"];
export const REASONS: [string, string][] = [
  ["unsafe", "I feel unsafe"], ["harassment", "Harassment"], ["spam", "Spam or selling"], ["fake", "Fake profile or listing"],
  ["underage", "May be under 18"], ["other", "Something else"],
];
export const label = (list: [string, string, string?][], id: string | null | undefined) => list.find(([k]) => k === id)?.[1] || "";

const CAUSE_PHRASE: Record<string, string> = {
  community: "your communities", families: "families", education: "education", animals: "animals",
  environment: "the environment", relief: "emergency relief", other: "other causes",
};
const GIVE_PHRASE: Record<string, string> = { time: "time", skills: "skills", resources: "resources", financial: "financial support" };
const TIME_PHRASE: Record<string, string> = { today: "today", week: "this week", weekends: "on weekends", flexible: "at flexible times" };
export const DISTANCE: Record<string, string> = { near: "Near you", region: "In your region", far: "A few hours away" };

export function words(list: string[]) {
  if (list.length < 2) return list.join("");
  return `${list.slice(0, -1).join(", ")} and ${list[list.length - 1]}`;
}
// What two people share, said plainly. Built only from what both chose to share.
export function commonLines(c: Common, name: string): string[] {
  const out: string[] = [];
  if (c.causes.length) out.push(`You both want to help with ${words(c.causes.map((x) => CAUSE_PHRASE[x] || x))}.`);
  const gives = c.gives.filter((g) => g !== "teachback");
  if (gives.length) out.push(`You both want to give ${words(gives.map((x) => GIVE_PHRASE[x] || x))}.`);
  if (c.teachback) out.push("You both want to teach together.");
  if (c.teachYou.length) out.push(`${name} can teach you ${words(c.teachYou)}.`);
  if (c.teachThem.length) out.push(`You can teach ${name} ${words(c.teachThem)}.`);
  if (c.times.length) out.push(`You can both give ${words(c.times.map((t) => TIME_PHRASE[t] || t))}.`);
  if (c.ways.includes("one")) out.push("You both like giving with one other person.");
  else if (c.ways.includes("team")) out.push("You both like giving with a team.");
  if (c.skills.length) out.push(`You both list ${words(c.skills)} as skills.`);
  if (c.distance === "near") out.push("You live near each other.");
  else if (c.distance === "region") out.push("You live in the same region.");
  else if (c.distance === "far") out.push("You live a few hours apart.");
  return out;
}

// ---- Dates -------------------------------------------------------------------------------------------
export const localDay = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
export const formatDay = (day: string) => new Date(`${day}T12:00:00`).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
export function formatAt(at: string) {
  const d = new Date(at);
  return localDay(d) === localDay() ? d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" }) : d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}
export const hoursText = (h: number) => `${Number.isInteger(h) ? h : h.toFixed(2).replace(/0$/, "")} ${h === 1 ? "hour" : "hours"}`;

// ---- Who is signed in, and how to reach the API --------------------------------------------------------
export type GiveAuth = { ready: boolean; signedIn: boolean; dev: string | null; token: () => Promise<string | null>; signOut: () => Promise<void> };
export const AuthContext = createContext<GiveAuth>({ ready: false, signedIn: false, dev: null, token: async () => null, signOut: async () => {} });
export const useGiveAuth = () => useContext(AuthContext);

// Local development only: ?as=dev_a picks a stand-in person for this tab. The server refuses it on Vercel.
export function devActor(): string | null {
  if (!import.meta.env.DEV) return null;
  try {
    const asked = new URLSearchParams(location.search).get("as");
    if (asked && /^dev_[a-z0-9]{1,20}$/.test(asked)) sessionStorage.setItem("give-dev-actor", asked);
    return sessionStorage.getItem("give-dev-actor");
  } catch { return null; }
}

export class GiveError extends Error { constructor(message: string, public status: number) { super(message); } }
export function useCall() {
  const auth = useGiveAuth();
  return useCallback(async <T,>(action: string, body?: object, params: Record<string, string> = {}): Promise<T> => {
    const headers: Record<string, string> = {};
    if (auth.dev) headers["x-dev-actor"] = auth.dev;
    else { const t = await auth.token(); if (t) headers.Authorization = `Bearer ${t}`; }
    if (body) headers["Content-Type"] = "application/json";
    let response: Response;
    try {
      response = await fetch(`/api/give?${new URLSearchParams({ action, ...params })}`, { method: body ? "POST" : "GET", headers, body: body ? JSON.stringify(body) : undefined });
    } catch { throw new GiveError("You seem to be offline. Please try again.", 0); }
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new GiveError(data.error || "Something went wrong. Please try again.", response.status);
    return data as T;
  }, [auth]);
}

export function useLoad<T>(load: () => Promise<T>, deps: unknown[]) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const seq = useRef(0);
  const reload = useCallback(async () => {
    const n = ++seq.current;
    setLoading(true);
    try { const d = await load(); if (n === seq.current) { setData(d); setError(""); } }
    catch (e) { if (n === seq.current) setError((e as Error).message); }
    finally { if (n === seq.current) setLoading(false); }
  }, deps);
  useEffect(() => { reload(); }, [reload]);
  return { data, setData, error, loading, reload };
}

// ---- The signed-in person's Give Profile, shared by every Give Together page ---------------------------------
type MeState = { me: Me | null; error: string; reload: () => Promise<void>; setMe: (m: Me) => void };
export const MeContext = createContext<MeState>({ me: null, error: "", reload: async () => {}, setMe: () => {} });
export const useMe = () => useContext(MeContext);
// Kept between pages so each page opens straight away; refreshed in the background.
let cached: { who: string; me: Me } | null = null;
export function MeProvider({ who, children }: { who: string; children: ReactNode }) {
  const call = useCall();
  const [me, setMeState] = useState<Me | null>(cached?.who === who ? cached.me : null);
  const [error, setError] = useState("");
  const setMe = useCallback((m: Me) => {
    cached = { who, me: m }; setMeState(m);
    // Lets the Give landing page say "Open Give Together" to someone who already has a profile. Nothing else is kept.
    try { if (m.profile) localStorage.setItem("give-member", "1"); else localStorage.removeItem("give-member"); } catch { /* private mode */ }
  }, [who]);
  const reload = useCallback(async () => {
    try { setMe(await call<Me>("me")); setError(""); } catch (e) { setError((e as Error).message); }
  }, [call, setMe]);
  useEffect(() => { reload(); }, [reload]);
  return <MeContext.Provider value={{ me, error, reload, setMe }}>{children}</MeContext.Provider>;
}
export const forgetMe = () => { cached = null; };

// ---- Controls --------------------------------------------------------------------------------------------
export function Choices({ legend, hint, options, value, onChange, single = false, id }: {
  legend: ReactNode; hint?: ReactNode; options: [string, string, string?][]; value: string[]; onChange: (v: string[]) => void; single?: boolean; id?: string;
}) {
  return (
    <fieldset className="gt-choices" id={id}>
      <legend>{legend}</legend>
      {hint && <p className="gt-hint">{hint}</p>}
      <div className="gt-chips">
        {options.map(([key, text, sub]) => {
          const on = value.includes(key);
          return (
            <button type="button" key={key} className={"gt-chip" + (on ? " on" : "")} aria-pressed={on}
              onClick={() => onChange(single ? [key] : on ? value.filter((v) => v !== key) : [...value, key])}>
              <span className="gt-chip-mark" aria-hidden="true">{on && <Check size={14} strokeWidth={2.6} />}</span>
              <span className="gt-chip-text">{text}{sub && <small>{sub}</small>}</span>
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

export function Tags({ label: text, hint, value, onChange, max = 12, placeholder }: {
  label: string; hint?: string; value: string[]; onChange: (v: string[]) => void; max?: number; placeholder?: string;
}) {
  const [draft, setDraft] = useState("");
  const add = () => {
    const parts = draft.split(",").map((t) => t.replace(/\s+/g, " ").trim().toLowerCase().slice(0, 40)).filter(Boolean);
    const next = [...value];
    for (const t of parts) if (!next.includes(t) && next.length < max) next.push(t);
    if (next.length !== value.length) onChange(next);
    setDraft("");
  };
  return (
    <div className="gt-tags">
      <label>
        {text}
        <input value={draft} placeholder={placeholder} enterKeyHint="done" maxLength={80}
          onChange={(e) => setDraft(e.target.value)} onBlur={add}
          onKeyDown={(e) => { if (e.key === "Enter" || e.key === ",") { e.preventDefault(); add(); } }} />
      </label>
      {hint && <p className="gt-hint">{hint}</p>}
      {value.length > 0 && (
        <ul className="gt-tag-list">
          {value.map((t) => (
            <li key={t}><span>{t}</span><button type="button" aria-label={`Remove ${t}`} onClick={() => onChange(value.filter((v) => v !== t))}><X size={14} /></button></li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function Switch({ label: text, hint, checked, onChange }: { label: ReactNode; hint?: ReactNode; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="gt-switch">
      <input type="checkbox" role="switch" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span className="gt-switch-track" aria-hidden="true"><i /></span>
      <span className="gt-switch-text">{text}{hint && <small>{hint}</small>}</span>
    </label>
  );
}

export function Verified({ verified }: { verified: boolean }) {
  return verified
    ? <span className="gt-badge is-verified"><BadgeCheck size={15} aria-hidden="true" />Verified by Waves.Fund</span>
    : <span className="gt-badge"><CircleDashed size={15} aria-hidden="true" />Not yet verified</span>;
}

export function Problem({ children }: { children: ReactNode }) {
  return children ? <p className="gt-problem" role="alert">{children}</p> : null;
}
export function Loading({ children = "Loading…" }: { children?: ReactNode }) {
  return <p className="gt-loading" role="status"><i aria-hidden="true" />{children}</p>;
}

// The Give Together pages, one tap apart.
export function GiveNav() {
  const { me } = useMe();
  const invites = me?.invites || 0;
  const { pathname } = useLocation();
  const items: [string, string, typeof Users, string[]][] = [
    ["/give/guide", "Give Guide", Users, ["/give/with/"]], ["/give/opportunities", "Opportunities", Compass, []],
    ["/give/record", "Record", NotebookPen, ["/give/wave/"]], ["/give/profile", "Profile", UserRound, ["/give/privacy"]],
  ];
  return (
    <nav className="gt-nav" aria-label="Give Together">
      {items.map(([to, text, Icon, also]) => (
        <NavLink key={to} to={to} className={({ isActive }) => "gt-nav-item" + (isActive || also.some((p) => pathname.startsWith(p)) ? " active" : "")}>
          <Icon size={18} strokeWidth={1.8} aria-hidden="true" />
          <span>{text}</span>
          {to === "/give/guide" && invites > 0 && <b className="gt-count" aria-label={`${invites} new ${invites === 1 ? "invitation" : "invitations"}`}>{invites}</b>}
        </NavLink>
      ))}
    </nav>
  );
}

export function PageHead({ eyebrow = "GIVE TOGETHER", title, children }: { eyebrow?: string; title: ReactNode; children?: ReactNode }) {
  return (
    <header className="gt-head">
      <p className="eyebrow">{eyebrow}</p>
      <h1>{title}</h1>
      {children && <div className="gt-lede">{children}</div>}
    </header>
  );
}

export const SafetyNote = () => (
  <p className="gt-safety">
    Meet for the first time at a staffed public place, like a library or a volunteer center. Never send money or share financial details.{" "}
    <Link to="/give/privacy">Safety and privacy</Link>
  </p>
);
