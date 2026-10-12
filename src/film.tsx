import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Check, Share2 } from "lucide-react";
import { ButtonLink } from "./ui";
import "./film.css";

/* The films. First the hype film (4:28, August Jace's voice, the vision and the plan in motion), then the first film
   (3:00, Honor's voice, the site's own sea). Each stage loads only its first frames until it is played; captions are
   in the player's menu. The words on this page are the films' title and the site's own calls. */
function Stage({ src, poster, captions, className = "" }: { src: string; poster: string; captions: string; className?: string }) {
  return (
    <div className={"fm-stage " + className} data-no-swipe>
      <video className="fm-video" controls playsInline preload="metadata" poster={poster}>
        <source src={src} type="video/mp4" />
        <track kind="captions" src={captions} srcLang="en" label="English" />
      </video>
    </div>
  );
}
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
        <p className="eyebrow">THE FILM · 4:28</p>
        <h1>Raise <span>Waves.</span></h1>
      </header>
      <Stage src="/media/film/raise-waves-hype.mp4" poster="/media/film/raise-waves-hype.webp" captions="/media/film/raise-waves-hype.en.vtt" />
      <div className="button-row fm-actions">
        <ButtonLink to="/apply">Bring Your Vision</ButtonLink>
        <button type="button" className="text-button" onClick={share}>
          {shared ? <Check size={17} /> : <Share2 size={17} />}
          {shared ? "Link Copied" : "Share The Film"}
        </button>
        <Link className="text-button" to="/manifest">Read The Manifest <ArrowRight size={17} /></Link>
      </div>
      <section className="fm-second" aria-label="The first film">
        <p className="eyebrow">THE FIRST FILM · 3:00</p>
        <Stage src="/media/film/raise-waves.mp4" poster="/media/film/raise-waves.webp" captions="/media/film/raise-waves.en.vtt" className="fm-stage-small" />
      </section>
    </div>
  );
}
