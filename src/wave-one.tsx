import { useId, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, ArrowUpRight, Check, Copy, Flag, Globe, Share2, Users } from "lucide-react";
import "./wave-one.css";

const WAVE_URL = "https://www.waves.fund/now-lets-begin#wave-one";
const views = ["Story", "Next Move", "Journey"] as const;
type WaveView = (typeof views)[number];

export function WaveOne() {
  const [view, setView] = useState<WaveView>("Story");
  const [shareMessage, setShareMessage] = useState("");
  const [showLink, setShowLink] = useState(false);
  const [sharing, setSharing] = useState(false);
  const panelId = useId();
  const titleId = useId();

  async function passWave() {
    setSharing(true);
    setShareMessage("");
    try {
      if (typeof navigator.share === "function") {
        try {
          await navigator.share({
            title: "Wave One — Waves.Fund",
            text: "Trust People. And They Become Trustworthy. Pass the Wave.",
            url: WAVE_URL,
          });
          setShareMessage("The Wave link was shared. A share does not create a recorded handoff.");
          return;
        } catch (error) {
          if (error instanceof DOMException && error.name === "AbortError") {
            setShareMessage("Sharing cancelled. You can pass the Wave whenever you’re ready.");
            return;
          }
        }
      }
      if (navigator.clipboard?.writeText) {
        try {
          await navigator.clipboard.writeText(WAVE_URL);
          setShareMessage("Wave link copied. Share it with someone who could help move the mission forward.");
          return;
        } catch {
          // The selectable link below also works when clipboard access is unavailable.
        }
      }
      setShowLink(true);
      setShareMessage("Select and copy the link below to pass the Wave.");
    } finally {
      setSharing(false);
    }
  }

  return (
    <article className="wave-one" id="wave-one" aria-labelledby={titleId}>
      <div className="wave-one-aura" aria-hidden="true" />
      <div className="wave-one-identity">
        <div className="wave-one-number"><span aria-hidden="true" /> WAVE 001</div>
        <div className="wave-one-symbol" aria-hidden="true">
          <svg viewBox="0 0 260 180" className="wave-one-orbits" focusable="false">
            <ellipse cx="130" cy="90" rx="110" ry="54" />
            <ellipse cx="130" cy="90" rx="110" ry="54" transform="rotate(26 130 90)" />
            <ellipse cx="130" cy="90" rx="110" ry="54" transform="rotate(-26 130 90)" />
            <circle cx="29" cy="69" r="3.5" />
            <circle cx="229" cy="113" r="3.5" />
            <circle cx="130" cy="36" r="3" />
          </svg>
          <img src="/media/nav-waves.png" alt="" loading="lazy" width="128" height="108" />
        </div>
        <h3 id={titleId}>Waves.Fund</h3>
        <p className="wave-one-mantra">Trust People.<br />And They Become Trustworthy.</p>
        <div className="wave-one-home"><Globe size={15} aria-hidden="true" /><a href="https://www.waves.fund/">One Home. Waves.Fund <ArrowUpRight size={13} aria-hidden="true" /></a></div>
        <p className="wave-one-caption">The first Wave is our own.</p>
      </div>

      <div className="wave-one-main">
        <div className="wave-one-views" role="group" aria-label="Explore Wave One">
          {views.map((item) => (
            <button key={item} type="button" aria-pressed={view === item} aria-controls={panelId} onClick={() => setView(item)}>{item}</button>
          ))}
        </div>

        <div className="wave-one-content" id={panelId}>
          {view === "Story" && (
            <div className="wave-one-view" key="story">
              <p className="wave-one-kicker">AN IMPACT FUND. FUNDING FOR FUTURES.</p>
              <h4>Students Funding<br />The Future</h4>
              <p>A student driven home for lifelong learners and leaders building Waves for humanity. Bring your vision. Find the people to help it move.</p>
              <div className="wave-one-guide">
                <span className="wave-one-guide-mark" aria-hidden="true">AJD</span>
                <div><span>Founder &amp; First Wave Guide</span><strong>August James Domanchuk</strong><p>Emergent Strategist. Life long learner and teacher.</p></div>
              </div>
              <p className="wave-one-guide-mantra">“Move The Mindset”</p>
            </div>
          )}

          {view === "Next Move" && (
            <div className="wave-one-view" key="next">
              <p className="wave-one-kicker">NEXT CHAPTER · PROPOSED PILOT</p>
              <h4>Build The First<br />Adaptive Waves</h4>
              <p>Connect builders and Wave Guides to shape custom building blocks around a mission, a story, and a clear next move.</p>
              <div className="wave-one-next-links">
                <Link to="/apply"><Flag size={19} aria-hidden="true" /><span>Bring Your Vision<small>Tell us what you are building.</small></span><ArrowUpRight size={18} aria-hidden="true" /></Link>
                <Link to="/guide/apply"><Users size={19} aria-hidden="true" /><span>Become A Wave Guide<small>Bring your skills to the work.</small></span><ArrowUpRight size={18} aria-hidden="true" /></Link>
              </div>
              <p className="wave-one-detail">Custom builds begin with a conversation about scope, fees, and the support you need.</p>
            </div>
          )}

          {view === "Journey" && (
            <div className="wave-one-view" key="journey">
              <p className="wave-one-kicker">THE JOURNEY SO FAR</p>
              <h4>A Home.<br />A Direction. A Next Move.</h4>
              <ol className="wave-one-journey">
                <li><span className="wave-one-node" aria-hidden="true"><Check size={13} /></span><div><strong>The Vision Is Written</strong><p>The Wave Praxis describes the adaptive building block and the human Guide.</p><span className="wave-one-record">Document</span></div></li>
                <li><span className="wave-one-node" aria-hidden="true"><Check size={13} /></span><div><strong>The Home Is Live</strong><p>Waves.Fund welcomes project and Wave Guide applications.</p><span className="wave-one-record">Available Today</span></div></li>
                <li className="wave-one-future"><span className="wave-one-node" aria-hidden="true"><ArrowRight size={13} /></span><div><strong>The Next Chapter</strong><p>A proposed pilot to build custom Waves with builders and Guides.</p><span className="wave-one-record">Proposed</span></div></li>
              </ol>
            </div>
          )}
        </div>

        <div className="wave-one-actions">
          <button className="wave-one-pass" type="button" onClick={passWave} disabled={sharing}><Share2 size={17} aria-hidden="true" />{sharing ? "Opening Share…" : "Pass This Wave"}<ArrowRight size={17} aria-hidden="true" /></button>
          <a className="wave-one-contact" href="mailto:August@Outlier.Systems?subject=Build%20My%20Wave">Work With August <ArrowUpRight size={15} aria-hidden="true" /></a>
        </div>
        <div className="wave-one-share-state" role="status" aria-live="polite">{shareMessage}</div>
        {showLink && <label className="wave-one-copy"><span><Copy size={14} aria-hidden="true" /> Wave One Link</span><input type="url" value={WAVE_URL} readOnly onFocus={(event) => event.currentTarget.select()} /></label>}
        <p className="wave-one-ownership">The team keeps its home and control. People carrying the Wave can share it and propose contributions. The team chooses what becomes part of its story.</p>
      </div>
    </article>
  );
}
