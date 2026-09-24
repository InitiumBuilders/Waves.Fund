import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, Heart, LogOut, MessageCircle, Trash2 } from "lucide-react";
import { Loading, PageHead, Problem, Switch, formatDay, useCall, useGiveAuth, useLoad, useMe } from "./core";
import type { Profile, Shares } from "./core";
import { Confirm } from "./safety";

type RecordData = {
  waves: { id: string; status: string; title: string; guide: string; confirmed: number }[];
  peerHours: number; peerSessions: number; loggedHours: number;
  gratus: { day: string; message: string | null; point: boolean; wave: string; from: string; title: string }[];
  points: number; guides: { id: string; name: string; lastMessage: string | null }[];
};
const STATUS: { [k: string]: string } = { proposed: "Invitation", active: "Active", completed: "Completed" };

/* Your record. Only you can see it. There are no public scores and no rankings. */
export function RecordPage() {
  const call = useCall();
  const rec = useLoad(() => call<RecordData>("record"), [call]);
  const r = rec.data;
  if (rec.error) return <Problem>{rec.error}</Problem>;
  if (!r) return <Loading />;
  return (
    <div className="gt-record">
      <PageHead eyebrow="ONLY YOU CAN SEE THIS" title={<>Your <span>Record</span></>}>
        <p>What you and your Give Guides have done together. Nothing here is public or ranked.</p>
      </PageHead>
      <div className="gt-stats gt-stats-wide">
        <div><strong>{r.peerHours}</strong><span>Peer-confirmed {r.peerHours === 1 ? "hour" : "hours"}</span></div>
        <div><strong>{r.peerSessions}</strong><span>Days given together</span></div>
        <div><strong>{r.loggedHours}</strong><span>{r.loggedHours === 1 ? "Hour" : "Hours"} you logged</span></div>
        <div><strong>{r.points}</strong><span>Gratus {r.points === 1 ? "point" : "points"}</span></div>
      </div>
      <p className="fine-print">Peer-confirmed hours are days you and your Give Guide both logged as time together. They are not verified by the host organization. Gratus points are private thanks with no money value.</p>

      <section className="gt-block" aria-labelledby="gt-rec-waves">
        <h2 id="gt-rec-waves" className="gt-block-title">Your Waves</h2>
        {r.waves.length === 0 ? <p className="gt-quiet">No Shared Waves yet. <Link to="/give/opportunities">Find an opportunity</Link> and invite your Give Guide.</p> : (
          <ul className="gt-rows">
            {r.waves.map((w) => (
              <li key={w.id}><Link className="gt-row" to={`/give/wave/${w.id}`}><span className="gt-row-text"><b>{w.title || "Shared Wave"}</b><small>With {w.guide} · {STATUS[w.status] || w.status}{w.confirmed ? ` · ${w.confirmed} confirmed ${w.confirmed === 1 ? "day" : "days"}` : ""}</small></span><ArrowRight size={18} aria-hidden="true" /></Link></li>
            ))}
          </ul>
        )}
      </section>

      <section className="gt-block" aria-labelledby="gt-rec-gratus">
        <h2 id="gt-rec-gratus" className="gt-block-title">Gratus You Received</h2>
        {r.gratus.length === 0 ? <p className="gt-quiet">When a Give Guide thanks you for a day you both confirmed, it appears here.</p> : (
          <ul className="gt-gratus">{r.gratus.map((g) => <li key={g.wave + g.day}><Heart size={16} aria-hidden="true" /><p>{g.message || "Gratus, without words."}</p><small>{g.from} · {g.title} · {formatDay(g.day)}{g.point ? " · 1 Gratus point" : ""}</small></li>)}</ul>
        )}
      </section>

      {r.guides.length > 0 && (
        <section className="gt-block" aria-labelledby="gt-rec-guides">
          <h2 id="gt-rec-guides" className="gt-block-title">Your Give Guides</h2>
          <ul className="gt-rows">{r.guides.map((g) => <li key={g.id}><Link className="gt-row" to={`/give/with/${g.id}`}><span className="gt-avatar" aria-hidden="true">{g.name.slice(0, 1)}</span><span className="gt-row-text"><b>{g.name}</b></span><MessageCircle size={18} aria-hidden="true" /></Link></li>)}</ul>
        </section>
      )}
    </div>
  );
}

/* Privacy and safety: what others see, pausing, and leaving. */
export function PrivacyPage() {
  const { me, setMe } = useMe();
  const auth = useGiveAuth();
  const call = useCall();
  const navigate = useNavigate();
  const p = me!.profile as Profile;
  const [error, setError] = useState("");
  const [deleting, setDeleting] = useState(false);
  const update = async (patch: Partial<{ seeking: boolean; shares: Shares }>) => {
    setError("");
    try { const out = await call<{ profile: Profile }>("profile.save", { ...p, ...patch }); setMe({ ...me!, profile: out.profile }); }
    catch (e) { setError((e as Error).message); }
  };
  return (
    <div className="gt-privacy">
      <PageHead eyebrow="PRIVACY, SAFETY & SIMPLICITY" title={<>Privacy <span>& Safety</span></>}>
        <p>You choose what people see, and you can pause or leave at any time.</p>
      </PageHead>
      <section className="panel gt-card gt-section">
        <h2 className="gt-block-title">Matching</h2>
        <Switch label="Find me a Give Guide" hint="Turn this off to pause. You leave everyone’s matches, and your connections stay." checked={p.seeking} onChange={(v) => update({ seeking: v })} />
      </section>
      <section className="panel gt-card gt-section">
        <h2 className="gt-block-title">What People You Match With See</h2>
        <p className="gt-hint">Always: your display name, what you want to give, the causes, times and ways you chose. Never: your email, your account, or your exact location.</p>
        <Switch label="My town" checked={p.shares.place} onChange={(v) => update({ shares: { ...p.shares, place: v } })} />
        <Switch label="My Mantra And Statement" checked={p.shares.statement} onChange={(v) => update({ shares: { ...p.shares, statement: v } })} />
        <Switch label="My skills" checked={p.shares.skills} onChange={(v) => update({ shares: { ...p.shares, skills: v } })} />
        <Switch label="What I could teach and want to learn" checked={p.shares.teach} onChange={(v) => update({ shares: { ...p.shares, teach: v } })} />
        <Problem>{error}</Problem>
      </section>
      <section className="panel gt-card gt-section">
        <h2 className="gt-block-title">Staying Safe</h2>
        <ul className="gt-list">
          <li>Give Together is for adults, 18 and over.</li>
          <li>No one can message you until you both accept.</li>
          <li>Meet for the first time at a staffed public place, like a library, a community center or the organization hosting the work. Tell someone where you are going.</li>
          <li>Never send money, gift cards or financial details to anyone you meet here.</li>
          <li>Listings marked “Not yet verified” have not been checked by the team. Check them with the organizer before you go.</li>
          <li>You can report or block anyone from their page. Blocking is private and permanent.</li>
          <li>If someone is in danger, call your local emergency number first.</li>
        </ul>
      </section>
      <section className="panel gt-card gt-section">
        <h2 className="gt-block-title">Leave Or Sign Out</h2>
        <div className="gt-actions">
          <button className="text-button" onClick={() => auth.signOut()}><LogOut size={16} aria-hidden="true" />Sign Out</button>
          <button className="text-button gt-danger" onClick={() => setDeleting(true)}><Trash2 size={16} aria-hidden="true" />Delete My Give Profile</button>
        </div>
        <p className="fine-print">Deleting removes your profile, the messages you sent, your saved opportunities and the time you logged. It ends your connections and closes opportunities you posted. Gratus you sent stays with the person you thanked, without your words. <Link to="/privacy">Privacy & Participation</Link></p>
      </section>
      {deleting && (
        <Confirm title="Delete your Give Profile?" action="Delete My Give Profile" onClose={() => setDeleting(false)} run={async () => { await call("profile.delete", {}); navigate("/give"); setMe({ profile: null }); }}>
          <p>This cannot be undone. Your Waves.Fund account itself stays; you can make a new Give Profile later.</p>
        </Confirm>
      )}
    </div>
  );
}
