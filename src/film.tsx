import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Check, Share2 } from "lucide-react";
import { ButtonLink } from "./ui";
import "./film.css";

/* The film: Waves.Fund in three minutes, told on the site's own sea in Honor's voice. One stage, nothing around it.
   It loads only its first frames until it is played; captions are in the player's menu. The words on this page are
   the film's title and the site's own calls. */
export default function Film() {
  const [shared, setShared] = useState(false);
  const share = async () => {
    const url = `${window.location.origin}/film`;
    try {
      if (navigator.share) await navigator.share({ title: "Waves.Fund", url });
      else { await navigator.clipboard.writeText(url); setShared(true); }
    } catch { setShared(false); }
  };
  return (
    <div className="fm-page">
      <header className="fm-head">
        <p className="eyebrow">THE FILM · 3:00</p>
        <h1>Raise <span>Waves.</span></h1>
      </header>
      <div className="fm-stage" data-no-swipe>
        <video className="fm-video" controls playsInline preload="metadata" poster="/media/film/raise-waves.webp">
          <source src="/media/film/raise-waves.mp4" type="video/mp4" />
          <track kind="captions" src="/media/film/raise-waves.en.vtt" srcLang="en" label="English" />
        </video>
      </div>
      <div className="button-row fm-actions">
        <ButtonLink to="/apply">Bring Your Vision</ButtonLink>
        <button type="button" className="text-button" onClick={share}>
          {shared ? <Check size={17} /> : <Share2 size={17} />}
          {shared ? "Link Copied" : "Share The Film"}
        </button>
        <Link className="text-button" to="/manifest">Read The Manifest <ArrowRight size={17} /></Link>
      </div>
    </div>
  );
}
