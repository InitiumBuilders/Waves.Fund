import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, ArrowRight, ArrowUpRight, ChevronDown } from "lucide-react";
import { useStateStore } from "./state";
import { waveExamples } from "./wave-examples-data";
import "./wave-examples.css";

export function WaveExamples() {
  const [active, setActive] = useState(0);
  const track = useRef<HTMLDivElement>(null);
  const activeIndex = useRef(0);
  const { motion } = useStateStore();

  useEffect(() => {
    const element = track.current;
    if (!element) return;
    let frame = 0;
    let width = element.clientWidth;
    const readPosition = () => {
      frame = 0;
      const slides = Array.from(element.children) as HTMLElement[];
      const index = slides.reduce((nearest, slide, i) =>
        Math.abs(slide.offsetLeft - element.scrollLeft) < Math.abs(slides[nearest].offsetLeft - element.scrollLeft) ? i : nearest, 0);
      activeIndex.current = index;
      setActive(index);
    };
    const onScroll = () => { if (!frame) frame = requestAnimationFrame(readPosition); };
    const resize = new ResizeObserver(() => {
      if (element.clientWidth === width) return;
      width = element.clientWidth;
      const slide = element.children[activeIndex.current] as HTMLElement;
      element.scrollTo({ left: slide.offsetLeft, behavior: "instant" });
    });
    resize.observe(element);
    element.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      resize.disconnect();
      element.removeEventListener("scroll", onScroll);
    };
  }, []);

  const goTo = (index: number, smooth = true) => {
    const element = track.current;
    if (!element) return;
    const next = Math.max(0, Math.min(waveExamples.length - 1, index));
    const slide = element.children[next] as HTMLElement;
    const animate = smooth && motion && !matchMedia("(prefers-reduced-motion: reduce)").matches;
    element.scrollTo({ left: slide.offsetLeft, behavior: animate ? "smooth" : "instant" });
  };

  return <section id="wave-examples" className="wave-examples" aria-labelledby="wave-examples-title" aria-roledescription="carousel" data-no-swipe>
    <header className="begin-section-heading">
      <span className="begin-label">Eight starting models. Your own Wave.</span>
      <h2 id="wave-examples-title">What could your Wave become?</h2>
      <p>Explore the mockups, one Wave at a time. Each starts with a different need and can evolve with your mission.</p>
    </header>

    <div className="wave-examples-toolbar">
      <label className="wave-examples-picker">Explore a Wave
        <span><select value={active} onChange={event => goTo(Number(event.target.value), false)} aria-controls="wave-examples-track">
          {waveExamples.map((wave, index) => <option key={wave.id} value={index}>{wave.name}</option>)}
        </select><ChevronDown size={17} aria-hidden="true" /></span>
      </label>
      <div className="wave-examples-arrows">
        <button type="button" onClick={() => goTo(active - 1)} disabled={active === 0} aria-label="Previous Wave" aria-controls="wave-examples-track"><ArrowLeft size={21} /></button>
        <span className="wave-examples-count" role="status" aria-atomic="true"><span className="wave-examples-sr">{waveExamples[active].name}, </span>{String(active + 1).padStart(2, "0")} <span aria-hidden="true">/</span><span className="wave-examples-sr">of</span> 08</span>
        <button type="button" onClick={() => goTo(active + 1)} disabled={active === waveExamples.length - 1} aria-label="Next Wave" aria-controls="wave-examples-track"><ArrowRight size={21} /></button>
      </div>
    </div>
    <p className="wave-examples-hint" id="wave-examples-help">Swipe left or right, or use the arrows. Select the gallery to use your keyboard’s arrow keys.</p>

    <div id="wave-examples-track" className="wave-examples-track" ref={track} tabIndex={0} role="group" aria-label="Wave mockup gallery" aria-describedby="wave-examples-help"
      onKeyDown={event => {
        if (event.target !== event.currentTarget || event.altKey || event.ctrlKey || event.metaKey) return;
        const index = event.key === "ArrowRight" ? active + 1 : event.key === "ArrowLeft" ? active - 1 : event.key === "Home" ? 0 : event.key === "End" ? waveExamples.length - 1 : null;
        if (index === null) return;
        event.preventDefault();
        goTo(index);
      }}>
      {waveExamples.map((wave, index) => <article key={wave.id} className="wave-example" role="group" aria-roledescription="slide" aria-label={`${wave.name}, ${index + 1} of ${waveExamples.length}`} inert={index !== active}>
        <figure className="wave-example-art">
          <a href={wave.image} target="_blank" rel="noreferrer" className="wave-example-image-link" aria-label={`View the full-size ${wave.name} graphic in a new tab`}>
            <img src={wave.image} srcSet={`${wave.image.replace(".webp", "-640.webp")} 640w, ${wave.image} 1024w`} sizes="(min-width: 900px) 440px, (min-width: 600px) 400px, calc(100vw - 40px)" width="1024" height="1536" loading="lazy" decoding="async" alt={wave.alt} draggable={false} />
          </a>
          <figcaption><a href={wave.image} target="_blank" rel="noreferrer">View full-size graphic <ArrowUpRight size={16} aria-hidden="true" /></a></figcaption>
        </figure>
        <div className="wave-example-copy">
          <span className="begin-label">Illustrative Wave template</span>
          <h3>{wave.name}</h3>
          <p className="wave-example-project">{wave.project}</p>
          <p className="wave-example-description">{wave.description}</p>
          <div className="wave-example-move"><span className="begin-label">The next move</span><p>{wave.nextMove}</p></div>
          <h4 className="wave-example-model-title">The starting structure</h4>
          <ol className="wave-example-model">{wave.structure.map((step, i) => <li key={step}><span aria-hidden="true">{String(i + 1).padStart(2, "0")}</span>{step}</li>)}</ol>
          <details className="wave-example-details"><summary>The Guide & the outcome <ChevronDown size={17} aria-hidden="true" /></summary><div><h4>A human Wave Guide</h4><p>{wave.guide}</p><h4>What completion could look like</h4><p>{wave.outcome}</p></div></details>
          <Link to={`/apply?waveType=${wave.id}`} className="glow-button">Build My Wave Like This <ArrowRight size={18} aria-hidden="true" /></Link>
        </div>
      </article>)}
    </div>
    <p className="wave-examples-note">Concept mockups, with example projects and amounts. A real Wave is custom-built with your Guide. It can change its focus while keeping its home, people, and Journey.</p>
  </section>;
}
