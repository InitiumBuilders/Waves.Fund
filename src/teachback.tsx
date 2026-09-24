import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { useStateStore } from "./state";
import { Stock } from "./mind/WaveMind";
import { Echo, Pair, Resonance, Travel } from "./symbols";
import { StringScene } from "./teachback-string";
import { BEAT } from "./cadence";
import "./teachback.css";

/* The Teachback: a core page of the Wave Guides. His lines are the mantra, "Give Together. Teach Together.
   Organize a teachback."; the rest is written plainly for his review.
   Its symbol is the standing wave: a wave sent out and returned in step keeps its shape. */

const STEPS = [
  { title: "Learn it", text: "Pick something you know well, or something you just learned and want to keep.", Symbol: Travel },
  { title: "Teach it together", text: "Teach it with your Give Guide, so no one teaches alone and two people can answer questions.", Symbol: Pair },
  { title: "Teach it back", text: "Each learner explains it back in their own words. You hear what they understood and what to explain again.", Symbol: Echo },
  { title: "Pass it on", text: "Each learner teaches it to one more person, so it keeps spreading after the Teachback ends.", Symbol: Resonance },
];
const MINDSET = [
  ["No title needed.", "If you can do it, you can show someone else how."],
  ["Explaining back checks the learning.", "When someone explains it back, you hear what they understood and what needs another pass."],
  ["Two teachers are easier than one.", "You share the preparation, the nerves and the questions."],
  ["Teaching counts as giving.", "An hour of teaching is an hour of your time, given like any other."],
];
const COMMIT = [
  "Meet in a public, staffed place, or online.",
  "Teach what you understand, and say plainly what you do not know.",
  "Let every learner teach it back, and listen to them.",
  "Keep it free. Nothing is sold at a Teachback.",
  "Ask each learner to pass it on to one more person.",
];

export default function Teachback() {
  return (
    <div className="teachback-page document-page">
      <Link to="/guide" className="guide-back"><ArrowLeft size={16} />Wave Guides</Link>
      <header className="page-intro has-mind tb-hero">
        <div className="intro-text">
          <p className="eyebrow">WAVE GUIDES · THE TEACHBACK</p>
          <h1>The <span>Teachback</span></h1>
          <div className="intro-description"><p>Give Together. Teach Together. Organize a teachback.</p></div>
          <div className="button-row intro-actions">
            <Link className="glow-button" to="/give/opportunities/new?kind=teachback">Organize A Teachback<ArrowRight size={18} /></Link>
            <Link className="text-button" to="/give/guide">Find Your Give Guide<ArrowRight size={17} /></Link>
          </div>
        </div>
        <TeachbackScene />
      </header>

      <section className="section tb-what" aria-labelledby="tb-what-title">
        <p className="eyebrow">WHAT IT IS</p>
        <h2 id="tb-what-title">Learn it. Teach it together.<br /><span>Hear it taught back.</span></h2>
        <p className="tb-lede">A Teachback is a small gathering where two people teach something they know, and everyone who learns it explains it back before they leave. Then each of them teaches it to someone new.</p>
        <ol className="tb-steps">
          {STEPS.map(({ title, text, Symbol }, i) => (
            <li key={title}>
              <Symbol className="tb-step-symbol" />
              <span className="step-number">{String(i + 1).padStart(2, "0")}</span>
              <h3>{title}</h3>
              <p>{text}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="section tb-why" aria-labelledby="tb-why-title">
        <p className="eyebrow">WHY IT WORKS</p>
        <h2 id="tb-why-title">Explaining It Back<br /><span>Makes It Stick</span></h2>
        <StringScene />
        <div className="tb-why-grid">
          <p>In health care, the teach-back method asks patients to explain instructions in their own words, so the clinician can check what was understood and fix what was not.</p>
          <p>Research on learning by teaching points the same way. People who study in order to teach recall more and organize it better, and people who then explain it to others remember it longer.</p>
        </div>
        <ul className="tb-sources">
          <li><a href="https://www.ahrq.gov/health-literacy/improve/precautions/tool5.html" target="_blank" rel="noreferrer">AHRQ Health Literacy Universal Precautions Toolkit: Use the Teach-Back Method</a></li>
          <li><a href="https://doi.org/10.3758/s13421-014-0416-z" target="_blank" rel="noreferrer">Nestojko, Bui, Kornell and Bjork (2014), Expecting to teach enhances learning and organization of knowledge in free recall of text passages. Memory & Cognition.</a></li>
          <li><a href="https://doi.org/10.1016/j.cedpsych.2013.06.001" target="_blank" rel="noreferrer">Fiorella and Mayer (2013), The relative benefits of learning by teaching and teaching expectancy. Contemporary Educational Psychology.</a></li>
        </ul>
      </section>

      <section className="section tb-mindset" aria-labelledby="tb-mind-title">
        <p className="eyebrow">THE MINDSET</p>
        <h2 id="tb-mind-title">Anyone<br /><span>Can Teach</span></h2>
        <ul className="tb-mind-list">
          {MINDSET.map(([title, text]) => <li key={title}><h3>{title}</h3><p>{text}</p></li>)}
        </ul>
      </section>

      <section className="section tb-commit" aria-labelledby="tb-commit-title">
        <div className="panel tb-commit-card">
          <p className="eyebrow">THE COMMITMENT</p>
          <h2 id="tb-commit-title">When You Organize<br /><span>A Teachback</span></h2>
          <ol className="tb-commit-list">{COMMIT.map((c) => <li key={c}>{c}</li>)}</ol>
          <Link className="glow-button" to="/give/opportunities/new?kind=teachback">Organize A Teachback<ArrowRight size={18} /></Link>
          <Stock level={0.24} />
        </div>
      </section>

      <section className="section tb-vision" aria-labelledby="tb-vision-title">
        <p className="eyebrow">THE VISION</p>
        <h2 id="tb-vision-title">Every Wave<br /><span>Teaches The Next</span></h2>
        <div className="tb-vision-text">
          <p>Wave Guides learn by building Waves with builders. A Teachback is how that learning gets passed on: a builder and their Guide teach what worked to the next builders, and those builders teach it back.</p>
          <p>With Give Together, anyone can do the same with a friend: two people teach a room, and each person in it teaches one more.</p>
        </div>
        <div className="button-row">
          <Link className="glow-button" to="/give">Give Together<ArrowRight size={18} /></Link>
          <Link className="text-button" to="/guide/library">The Guide Library<ArrowRight size={17} /></Link>
        </div>
      </section>

      <section className="section gt-principle" aria-label="The Teachback">
        <div className="gt-front" aria-hidden="true"><i /><i /><i /></div>
        <p>Give Together. Teach Together. Organize a teachback.</p>
      </section>
    </div>
  );
}

/* One light teaches two. A pulse runs out along each branch, reflects from the learner (a fixed end flips
   it) and comes home. Once it has been taught back, the branch settles into a standing wave that keeps
   swinging: the learning holds. Then each learner teaches two more. Five generations, on rings. */
function TeachbackScene() {
  const box = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const { motion } = useStateStore();
  useEffect(() => {
    const b = box.current, c = canvas.current;
    const ctx = c?.getContext("2d");
    if (!b || !c || !ctx) return;
    type Node = { g: number; a: number; parent: number; x: number; y: number; seed: number };
    const GENS = 5;
    const nodes: Node[] = [];
    const grow = (g: number, a0: number, a1: number, parent: number) => {
      const i = nodes.push({ g, a: (a0 + a1) / 2, parent, x: 0, y: 0, seed: (nodes.length * 0.618) % 1 }) - 1;
      if (g + 1 < GENS) { const mid = (a0 + a1) / 2; grow(g + 1, a0, mid, i); grow(g + 1, mid, a1, i); }
    };
    grow(0, -Math.PI / 2, Math.PI * 1.5, -1);
    const sprite = (rgb: string) => {
      const s = document.createElement("canvas"); s.width = s.height = 64;
      const x = s.getContext("2d")!, gr = x.createRadialGradient(32, 32, 0, 32, 32, 32);
      gr.addColorStop(0, `rgba(${rgb},1)`); gr.addColorStop(0.18, `rgba(${rgb},0.55)`); gr.addColorStop(0.5, `rgba(${rgb},0.12)`); gr.addColorStop(1, `rgba(${rgb},0)`);
      x.fillStyle = gr; x.fillRect(0, 0, 64, 64); return s;
    };
    const cyan = sprite("120,236,255"), violet = sprite("170,150,255"), white = sprite("235,252,255");
    let w = 1, h = 1, dpr = 1, raf = 0, visible = true;
    const t0 = performance.now();
    const resize = () => {
      const r = b.getBoundingClientRect(); w = Math.max(1, r.width); h = Math.max(1, r.height);
      dpr = Math.min(devicePixelRatio || 1, 2); c.width = Math.round(w * dpr); c.height = Math.round(h * dpr);
      frame(performance.now());
    };
    const place = (spin: number) => {
      const R = Math.min(w, h) * 0.46, cx = w / 2, cy = h / 2;
      for (const n of nodes) { const r = (n.g / (GENS - 1)) * R; n.x = cx + Math.cos(n.a + spin) * r; n.y = cy + Math.sin(n.a + spin) * r; }
    };
    const stamp = (img: HTMLCanvasElement, x: number, y: number, size: number, alpha: number) => {
      if (alpha <= 0.01) return; ctx.globalAlpha = Math.min(1, alpha); ctx.drawImage(img, x - size / 2, y - size / 2, size, size);
    };
    const CYCLE = 17, STEP = 2.2, SAMPLES = 26;
    const frame = (now: number) => {
      const clock = (now - t0) / 1000;
      // Every branch swings once a beat on the page's shared clock (src/cadence.ts).
      const beat = (now / 1000) * ((Math.PI * 2) / BEAT);
      // It opens partway through, with the first learners already taught back, so the first screen is never empty.
      const t = motion ? (clock + 5.2) % CYCLE : 12.5;
      const fade = motion ? Math.min(1, Math.max(0, (CYCLE - t) / 1.4), clock < 1 ? clock : 1) : 1;
      place(motion ? clock * 0.01 : 0.2);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      ctx.globalCompositeOperation = "lighter";
      ctx.lineCap = "round"; ctx.lineJoin = "round";
      const S = Math.min(w, h) / 420;
      for (let i = 1; i < nodes.length; i++) {
        const n = nodes[i], p = nodes[n.parent];
        const start = 0.6 + (n.g - 1) * STEP;
        const out = Math.min(1, Math.max(0, (t - start) / 0.85));          // taught: the pulse runs out
        const back = Math.min(1, Math.max(0, (t - start - 0.95) / 0.85));  // taught back: it returns, flipped
        if (out <= 0) continue;
        const dx = n.x - p.x, dy = n.y - p.y, len = Math.hypot(dx, dy) || 1;
        const nx = -dy / len, ny = dx / len;
        // Once returned, the branch holds a standing wave that settles to a steady swing.
        const settled = motion ? Math.max(0, t - start - 1.8) : 3;
        const hold = back >= 1 ? (2.4 + 6 * Math.exp(-settled / 1.3)) * S : 0;
        const swing = Math.cos(beat + n.seed * 6.28);
        const pulseAt = back > 0 ? 1 - back : out;
        const pulseSign = back > 0 ? -1 : 1;
        const pulseOn = motion && (out < 1 || (back > 0 && back < 1));
        ctx.beginPath();
        const reach = back > 0 ? 1 : out;
        for (let k = 0; k <= SAMPLES; k++) {
          const u = (k / SAMPLES) * reach;
          let off = hold * Math.sin(Math.PI * u) * swing;
          if (pulseOn) off += pulseSign * 9 * S * Math.exp(-(((u - pulseAt) * 7) ** 2));
          const x = p.x + dx * u + nx * off, y = p.y + dy * u + ny * off;
          if (k) ctx.lineTo(x, y); else ctx.moveTo(x, y);
        }
        const strong = back >= 1 ? 1 : 0.7;
        ctx.globalAlpha = 0.16 * fade * strong; ctx.strokeStyle = "rgb(94,233,255)"; ctx.lineWidth = Math.max(3, 6 * S); ctx.stroke();
        ctx.globalAlpha = 0.75 * fade * strong; ctx.strokeStyle = back >= 1 ? "rgb(150,236,255)" : "rgb(120,220,255)"; ctx.lineWidth = Math.max(1, 1.4 * S); ctx.stroke();
        if (pulseOn) {
          const u = pulseAt, off = pulseSign * 9 * S;
          const x = p.x + dx * u + nx * off, y = p.y + dy * u + ny * off;
          stamp(back > 0 ? violet : white, x, y, 38 * S, fade);
        }
        // The learner lights when the teaching arrives, and again when it has been taught back.
        const lit = out >= 1 ? 1 : 0;
        const answer = back > 0 && back < 1 ? 0.45 : 0;
        stamp(back >= 1 ? cyan : violet, n.x, n.y, (40 - n.g * 4.5) * S * (1 + answer), (0.72 + answer) * lit * fade);
        stamp(white, n.x, n.y, (12 - n.g * 1.2) * S, 0.95 * lit * fade);
        if (back >= 1 && t - start - 1.8 < 0.6 && motion) stamp(violet, p.x, p.y, 40 * S, (0.6 - (t - start - 1.8)) * fade);
      }
      const root = nodes[0], pulse = motion ? 0.86 + 0.14 * Math.sin(clock * 1.4) : 1;
      stamp(cyan, root.x, root.y, 76 * S * pulse, 0.9);
      stamp(white, root.x, root.y, 20 * S, 1);
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = "source-over";
    };
    const loop = (now: number) => { frame(now); raf = motion && visible && !document.hidden ? requestAnimationFrame(loop) : 0; };
    const start = () => { if (!raf && motion && visible) raf = requestAnimationFrame(loop); };
    const ro = new ResizeObserver(resize); ro.observe(b);
    const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible) start(); }); io.observe(b);
    const onVis = () => { if (!document.hidden) start(); };
    document.addEventListener("visibilitychange", onVis);
    resize(); start();
    return () => { cancelAnimationFrame(raf); ro.disconnect(); io.disconnect(); document.removeEventListener("visibilitychange", onVis); };
  }, [motion]);
  return <div ref={box} className="tb-scene" aria-hidden="true" data-quiet><canvas ref={canvas} /></div>;
}
