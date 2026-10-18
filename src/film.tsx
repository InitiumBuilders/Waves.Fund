import { useEffect, useRef, useState } from "react";
import type { RefObject } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Check, Share2 } from "lucide-react";
import { ButtonLink } from "./ui";
import "./film.css";

/* The films. First the hype film (4:28, August Jace's voice, the vision and the plan in motion), then the first film
   (3:00, Honor's voice, the site's own sea). A phone or a data-saving browser gets the 720p copies. Each stage loads
   only its first frames until it is played; captions are in the player's menu.
   Under the hype film, its chapters: each starts on a bar of the score; the one playing is lit, and any can be
   jumped to. The words on this page are the films' title, the chapters' names and the site's own calls. */
const CHAPTERS: [number, string][] = [
  [19.71, "Raise Waves"], [43.67, "The Wave"], [55.66, "The Guide"], [67.64, "In Sync"],
  [105.3, "Your Wave"], [139.53, "Picture This"], [168.64, "The Plan"], [202.87, "The Anthem"],
];
const clock = (x: number) => { const s = Math.round(x); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`; };
const small = () => {
  try { return matchMedia("(max-width: 900px)").matches || Boolean((navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData); }
  catch { return false; }
};
function Stage({ src, poster, captions, className = "", video }: { src: string; poster: string; captions: string; className?: string; video?: RefObject<HTMLVideoElement | null> }) {
  const [light] = useState(small);
  return (
    <div className={"fm-stage " + className} data-no-swipe>
      <video ref={video} className="fm-video" controls playsInline preload="metadata" poster={poster}>
        <source src={light ? src.replace(".mp4", "-720.mp4") : src} type="video/mp4" />
        <track kind="captions" src={captions} srcLang="en" label="English" />
      </video>
    </div>
  );
}
function Chapters({ video }: { video: RefObject<HTMLVideoElement | null> }) {
  const [now, setNow] = useState(-1);
  useEffect(() => {
    const v = video.current; if (!v) return;
    const on = () => setNow(v.currentTime);
    v.addEventListener("timeupdate", on); v.addEventListener("seeked", on);
    return () => { v.removeEventListener("timeupdate", on); v.removeEventListener("seeked", on); };
  }, [video]);
  const at = CHAPTERS.reduce((k, [t], i) => (now >= t - 0.05 ? i : k), -1);
  return (
    <ol className="fm-ch" data-no-swipe aria-label="Chapters">
      {CHAPTERS.map(([t, name], i) => (
        <li key={name}>
          <button type="button" className={"fm-ch-stop" + (i === at ? " on" : "")} aria-current={i === at ? "true" : undefined}
            onClick={() => { const v = video.current; if (!v) return; v.currentTime = t; void v.play().catch(() => {}); }}>
            <span className="fm-ch-time">{clock(t)}</span>
            <span className="fm-ch-name">{name}</span>
          </button>
        </li>
      ))}
    </ol>
  );
}
export default function Film() {
  const [shared, setShared] = useState(false);
  const hype = useRef<HTMLVideoElement>(null);
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
      <Stage video={hype} src="/media/film/raise-waves-hype.mp4" poster="/media/film/raise-waves-hype.webp" captions="/media/film/raise-waves-hype.en.vtt" />
      <Chapters video={hype} />
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
