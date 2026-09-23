import { useEffect, useId, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ArrowDown, ArrowDownToLine, ArrowRight, ArrowUpRight, BookOpen, Check, Compass, Heart, Layers, Network, Users } from "lucide-react";
import { CONTACT, WaveMark } from "./ui";
import { WaveOne } from "./wave-one";
import { WaveExamples } from "./wave-examples";
import praxis from "../docs/WAVE-PRAXIS.md?raw";
import "./begin.css";

const DOWNLOAD = "/media/wave-praxis.md";
const pieces = praxis.split(/(?=^## )/m);
const preface = pieces[0];
const chapters = pieces.slice(1).map((text, index) => ({
  text,
  title: text.split("\n")[0].replace(/^## /, "").trim(),
  id: `praxis-${index + 1}`,
}));
const core = [
  { title: "The Story", icon: BookOpen, question: "What are we building?", text: "Your mission, in your words. A place for people to understand the work and why it matters." },
  { title: "The Next Move", icon: Compass, question: "What is needed now?", text: "One clear way to help. As the need is met, your Wave adapts to the next move." },
  { title: "The Outcome", icon: Heart, question: "What changed?", text: "Bring the result back to the people who helped. Keep the story, the learning, and the work connected." },
];
function WaveAnatomy() {
  const [selected, setSelected] = useState(0);
  const uid = useId().replaceAll(":", "");
  return <div className="begin-anatomy">
    <div className="begin-orbit" aria-label="Explore the three essentials of a Wave" data-mind="ocean">
      <svg className="begin-branches" viewBox="0 0 500 310" aria-hidden="true">
        <defs><linearGradient id={uid} x1="0" y1="0" x2="0" y2="1"><stop stopColor="#77f5ff" /><stop offset="1" stopColor="#4d81ff" /></linearGradient></defs>
        <ellipse cx="250" cy="122" rx="103" ry="80" />
        {["M250 125 C250 200 70 160 70 257", "M250 125 C245 180 250 190 250 257", "M250 125 C250 200 430 160 430 257"].map((d, i) => <g key={d}><path d={d} className="begin-branch-base" /><path d={d} className={selected === i ? "begin-branch-current" : ""} stroke={`url(#${uid})`} /></g>)}
      </svg>
      <div className="begin-orbit-core"><WaveMark /><span>Your Wave</span></div>
      <div className="begin-orbit-controls">{core.map(({title, icon: Icon}, i) => <button key={title} type="button" aria-pressed={selected === i} aria-controls={`${uid}-meaning`} onClick={() => setSelected(i)}><span><Icon size={22} strokeWidth={1.5} /></span>{title}</button>)}</div>
    </div>
    <div id={`${uid}-meaning`} className="begin-orbit-meaning" aria-live="polite"><h2>{core[selected].question}</h2><p>{core[selected].text}</p></div>
  </div>;
}

const routes = [
  { name: "A Creator", icon: BookOpen, title: "Carry the story.", text: "A creator can feature a Wave in a video and invite people back to its home. The Journey can record the feature and support received through its tracked path." },
  { name: "A Community", icon: Users, title: "Bring people together.", text: "People can offer skills, time, ideas, or introductions around the current move. The team acknowledges the help and shares what changed." },
  { name: "A Partner", icon: Network, title: "Open another path.", text: "A partner can carry the Wave on its website, make an introduction, or help meet a shared need. Deeper connections depend on the permissions each platform provides." },
];
function PassIllustration() {
  const [selected, setSelected] = useState(0);
  const id = useId();
  return <aside className="begin-pass" aria-label="Explore how a Wave can travel">
    <div className="begin-pass-heading"><WaveMark /><div><span className="begin-label">One home. Many paths.</span><h3>Pass the Wave.</h3></div></div>
    <div className="begin-pass-path" aria-hidden="true"><i /><i /><i /></div>
    <div className="begin-pass-options">{routes.map(({ name, icon: Icon }, i) => <button type="button" aria-pressed={selected === i} aria-controls={id} key={name} onClick={() => setSelected(i)}><Icon size={23} />{name}</button>)}</div>
    <div className="begin-pass-copy" aria-live="polite" id={id}><h4>{routes[selected].title}</h4><p>{routes[selected].text}</p></div>
    <p className="begin-note">Explore a possible path. The team keeps its home and decides what becomes part of the Wave.</p>
  </aside>;
}

function DocumentReader() {
  const [active, setActive] = useState("praxis-1");
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const intersections = new Set<Element>();
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => entry.isIntersecting ? intersections.add(entry.target) : intersections.delete(entry.target));
      const visible = [...intersections].sort((a, b) => a.getBoundingClientRect().top - b.getBoundingClientRect().top);
      if (visible[0]) setActive(visible[0].id);
    }, { rootMargin: "-8% 0px -62% 0px", threshold: 0 });
    ref.current?.querySelectorAll(".begin-chapter").forEach(section => observer.observe(section));
    return () => observer.disconnect();
  }, []);
  const contents = <>{chapters.map((chapter, i) => <a key={chapter.id} href={`#${chapter.id}`} aria-current={active === chapter.id ? "location" : undefined}><span>{String(i + 1).padStart(2, "0")}</span>{chapter.title}</a>)}</>;
  return <section id="praxis" className="begin-reader" aria-labelledby="praxis-title">
    <header className="begin-reader-title"><span className="begin-label">The complete document · Version 0.3</span><h2 id="praxis-title">The Wave Praxis</h2><p>The whole vision. Every word. An open foundation for what comes next.</p><a href={DOWNLOAD} download="WAVE-PRAXIS.md" className="begin-download"><ArrowDownToLine size={18} />Download the full MD file</a></header>
    <div className="begin-reading-layout">
      <aside className="begin-contents"><details open><summary>Inside the praxis <ArrowDown size={15} /></summary><nav aria-label="Praxis chapters">{contents}</nav></details></aside>
      <div className="begin-essay" ref={ref}>
        <div className="begin-preface begin-markdown"><Markdown remarkPlugins={[remarkGfm]} components={{ h1: ({children}) => <h3>{children}</h3> }}>{preface}</Markdown></div>
        {chapters.map((chapter, index) => <section key={chapter.id} id={chapter.id} className="begin-chapter">
          <div className="begin-chapter-number" aria-hidden="true"><span>{String(index + 1).padStart(2, "0")}</span><i /></div>
          <div className="begin-markdown"><Markdown remarkPlugins={[remarkGfm]} components={{ table: ({children}) => <div className="begin-table" role="region" aria-label={`${chapter.title} table`} tabIndex={0}><table>{children}</table></div>, a: ({href, children}) => <a href={href} target={href?.startsWith("https:") ? "_blank" : undefined} rel={href?.startsWith("https:") ? "noreferrer" : undefined}>{children}</a> }}>{chapter.text}</Markdown></div>
          {chapter.title === "Pass the Wave" && <PassIllustration />}
        </section>)}
      </div>
    </div>
  </section>;
}

export default function Begin() {
  const { hash } = useLocation();
  useEffect(() => {
    if (!hash) return;
    const frame = requestAnimationFrame(() => document.getElementById(hash.slice(1))?.scrollIntoView({ behavior: "instant" }));
    return () => cancelAnimationFrame(frame);
  }, [hash]);
  return <div className="begin-page">
    <section className="begin-hero" aria-labelledby="begin-title">
      <div className="begin-hero-copy"><p className="begin-label"><span className="begin-live-dot" />Waves.Fund · The next chapter</p><h1 id="begin-title">Now,<br />Let’s Begin.</h1><p className="begin-hero-mantra">Raise Money In A New Way.</p><p className="begin-lead">Your mission. Your story. Your Wave.<br />A custom building block, built with a real Wave Guide—and made to grow with you.</p><div className="begin-actions"><a href="#wave-one" className="glow-button">Meet Wave One <ArrowRight size={19} /></a><a href="#praxis" className="begin-text-link">Read the full praxis <ArrowDown size={17} /></a></div></div>
      <WaveAnatomy />
      <div className="begin-hero-foot"><span>A story people can understand.</span><span>A next move people can help.</span><span>An outcome people can see.</span></div>
    </section>

    <nav className="begin-jump" aria-label="Explore this page"><a href="#build-with-a-guide">A real Guide</a><a href="#wave-one">Wave One</a><a href="#wave-examples">Example Waves</a><a href="#praxis">The full praxis</a><a href={DOWNLOAD} download="WAVE-PRAXIS.md" aria-label="Download the Wave Praxis Markdown file"><ArrowDownToLine size={16} /><span>Download</span></a></nav>

    <section id="build-with-a-guide" className="begin-guide" aria-labelledby="guide-build-title">
      <div className="begin-section-heading"><span className="begin-label">Built around your mission</span><h2 id="guide-build-title">You hire a Wave Guide.<br />You build it together.</h2><p>A real person listens, designs, builds, and evolves your Wave with you. It can become a campaign, a team workspace, a place for your story, or a way to bring people and funding around the work.</p></div>
      <div className="begin-engagements">{[
        { icon: Layers, name: "A defined build", description: "One agreed scope. A custom Wave, ready for its next move." },
        { icon: Compass, name: "Weekly support", description: "Work with a Guide as needs change and the work moves forward." },
        { icon: Users, name: "Monthly support", description: "An ongoing rhythm for building, coordinating, and evolving your Wave." },
      ].map(({ icon: Icon, name, description }) => <article key={name}><span className="begin-engagement-icon"><Icon size={25} strokeWidth={1.4} /></span><h3>{name}</h3><p>{description}</p></article>)}</div>
      <div className="begin-guide-action"><p>Scope, fees, timing, and ownership are agreed with your Guide before work begins.</p><a href={`mailto:${CONTACT}?subject=${encodeURIComponent("Build my Wave — Guide engagement")}`} className="begin-text-link">Discuss your Wave <ArrowUpRight size={18} /></a></div>
    </section>

    <section className="begin-example" aria-labelledby="first-wave-title"><div className="begin-section-heading"><span className="begin-label">The first Wave is our own</span><h2 id="first-wave-title">Wave One. Waves.Fund.</h2><p>Explore the story, the current next move, and the Journey. August James Domanchuk is the founder and first Wave Guide.</p></div><WaveOne /></section>

    <WaveExamples />
    <div className="begin-bridge"><img src="/media/home-nucleus.webp" alt="" loading="lazy" /><p>Trust People.<br />And They Become Trustworthy.</p></div>
    <DocumentReader />
    <section className="begin-closing"><WaveMark /><h2>What’s Your Vision?</h2><p>Built For All Lifelong Learners And Leaders Building Waves For Humanity</p><div className="begin-actions"><Link to="/apply" className="glow-button">Build Your Wave <ArrowRight size={18} /></Link><a href={DOWNLOAD} download="WAVE-PRAXIS.md" className="begin-text-link"><Check size={17} />Keep the praxis</a></div></section>
  </div>;
}
