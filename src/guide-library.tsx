import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ArrowDownToLine, ArrowLeft, ArrowRight, BookOpen, Check, Compass, FileText, Users, Waves } from "lucide-react";
import { ButtonLink, Intro, WaveMark } from "./ui";
import { guideHandbook, guideLessons, guidePractices, guideWorksheets, downloadGuideMarkdown } from "./guide-library-data";
import type { GuideLessonData } from "./guide-library-data";
import "./guide-library.css";
import { MindAnchor } from "./mind/WaveMind";

function Download({ content, filename, children }: { content: string; filename: string; children: React.ReactNode }) {
  return <button type="button" className="guide-download" onClick={() => downloadGuideMarkdown(content, filename)}><ArrowDownToLine size={17} aria-hidden="true" />{children}</button>;
}

function Practices() {
  const [active, setActive] = useState(0);
  return <section className="guide-section" aria-labelledby="guide-practices-title">
    <div className="guide-section-heading"><p className="eyebrow">FIVE OVERLAPPING PRACTICES</p><h2 id="guide-practices-title">Bring what you know.<br />Keep learning together.</h2><p>One accountable lead Guide. Supporting Guides where the work needs them. These are areas of practice, not certifications.</p></div>
    <div className="guide-practices panel">
      <div className="guide-practice-options" aria-label="Explore Guide practices">{guidePractices.map((practice, index) => <button key={practice.name} type="button" aria-pressed={active === index} aria-controls="guide-practice-detail" onClick={() => setActive(index)}><span aria-hidden="true">0{index + 1}</span>{practice.name}<ArrowRight size={16} aria-hidden="true" /></button>)}</div>
      <div className="guide-practice-detail" id="guide-practice-detail" aria-live="polite"><Compass size={28} strokeWidth={1.4} aria-hidden="true" /><h3>{guidePractices[active].name}</h3><p>{guidePractices[active].text}</p><div className="guide-example-note"><span className="eyebrow">AN ILLUSTRATIVE STARTING POINT</span><p>{guidePractices[active].example}</p></div></div>
    </div>
  </section>;
}

export function GuidePitch() {
  return <div className="document-page guide-public">
    <div className="guide-pitch-hero"><Intro eyebrow="THE HUMAN IN THE LOOP" title={<>Your vision.<br />Your Wave.<br /><span>A Guide beside you.</span></>}><p>A Wave Guide works with you to design, build, and evolve a custom home for your mission—its story, its people, and its next move.</p></Intro><div className="guide-human-orbit" aria-hidden="true"><div className="guide-orbit-ring" /><MindAnchor name="orbit" className="guide-orbit-mind" /><WaveMark className="guide-orbit-fallback" /><span>Wave Guides</span><i /><i /></div></div>
    <div className="guide-actions"><ButtonLink to="/apply">Build Your Wave</ButtonLink><ButtonLink to="/guide/library" secondary>Explore The Guide Library</ButtonLink></div>
    <section className="guide-service panel" aria-labelledby="guide-service-title"><div><p className="eyebrow">CUSTOM. ADAPTIVE. BUILT TOGETHER.</p><h2 id="guide-service-title">A real person.<br />A working relationship.</h2></div><div><p>You hire a Wave Guide to understand your mission and build a Wave around what you need. A campaign, a team, a story, a funding need, or an idea taking its first form.</p><p>Agree on a <strong>defined build, weekly engagement, or monthly support</strong>. Scope, fees, ownership, and ongoing care are agreed together before work begins. Your Wave adapts as the work changes.</p><p>You own the direction. Your Guide helps you make the next move.</p></div></section>
    <section className="guide-section" aria-labelledby="guide-circle-title" data-mind="path"><div className="guide-section-heading"><p className="eyebrow">FROM INTENTION TO OUTCOME</p><h2 id="guide-circle-title">Build it. Move it.<br />See what changes.</h2></div><ol className="guide-service-steps">{[{ title: "Tell your story", text: "Your Guide listens, shapes the brief with you, and agrees the first useful move.", Icon: BookOpen }, { title: "Build your Wave", text: "A custom experience brings your story, tools, and ways to participate together.", Icon: Waves }, { title: "Bring people together", text: "Acknowledge offers, agree the work, and let people carry the Wave with permission.", Icon: Users }, { title: "Show what changed", text: "Report the outcome, recognize the help, and adapt to what is needed next.", Icon: Compass }].map(({ title, text, Icon }, index) => <li key={title}><div className="guide-step-node"><Icon size={23} strokeWidth={1.5} aria-hidden="true" /><span>0{index + 1}</span></div><h3>{title}</h3><p>{text}</p></li>)}</ol></section>
    <Practices />
    <section className="guide-learning-callout panel"><div><p className="eyebrow">LIFELONG LEARNERS. LIFELONG LEADERS.</p><h2>Learn the practice.<br />Become a Wave Guide.</h2><p>Six practical lessons. Seven working templates. A shared foundation you can adapt with every builder.</p><p>Designers, makers, teachers, researchers, artists, operators, and community builders can apply. Share what you can do, what you are learning, and the work you want to help move forward.</p></div><div className="guide-actions"><ButtonLink to="/guide/library">Open The Library</ButtonLink><ButtonLink to="/guide/apply" secondary>Apply To Be A Wave Guide</ButtonLink></div></section>
    <section className="guide-section guide-team-partners" data-mind="hubs"><div className="guide-team-card"><p className="eyebrow">WAVE ONE · FOUNDING GUIDE</p><h2>August James<br />Domanchuk</h2><p>Founder of Waves.Fund, Outlier.Systems and Semble.CC. An Emergent Strategist, a life long learner and teacher, musician, and regenerative systems researcher.</p><blockquote>“Move The Mindset”</blockquote><Link className="text-button" to="/guide/team">Meet August & Jarvis Green <ArrowRight size={17} /></Link></div><div><p className="eyebrow">MOVING TOGETHER</p><h2>Our Partners</h2><div className="guide-partner-list">{[{ slug: "green-reef", name: "The Green Reef Foundation", image: "green-reef-logo.webp" }, { slug: "semble", name: "Semble.CC", image: "semble-logo.webp" }, { slug: "ocean97", name: "Ocean97.Com", image: "ocean97-logo.webp" }].map(partner => <Link key={partner.slug} to={`/guide/partners/${partner.slug}`}><img src={`/media/${partner.image}`} alt="" loading="lazy" /><span>{partner.name}</span><ArrowRight size={16} /></Link>)}</div></div></section>
    <p className="guide-closing-mantra">Trust People.<br />And They Become Trustworthy.</p>
  </div>;
}

function WorksheetList({ slugs }: { slugs?: string[] }) {
  const worksheets = slugs ? guideWorksheets.filter(item => slugs.includes(item.slug)) : guideWorksheets;
  return <div className="guide-worksheet-grid">{worksheets.map(worksheet => <article className="guide-worksheet panel" key={worksheet.slug}><FileText size={24} strokeWidth={1.4} aria-hidden="true" /><h3>{worksheet.title}</h3><p>{worksheet.description}</p><Download content={worksheet.markdown} filename={`Waves-Guide-${worksheet.slug}.md`}>Download Markdown</Download><details><summary>Read the worksheet</summary><div className="guide-markdown"><Markdown remarkPlugins={[remarkGfm]} components={{ h1: ({ children }) => <h4>{children}</h4>, h2: ({ children }) => <h5>{children}</h5> }}>{worksheet.markdown}</Markdown></div></details></article>)}</div>;
}

export function GuideLibrary() {
  return <div className="document-page guide-public">
    <Link to="/guide" className="guide-back"><ArrowLeft size={16} />Wave Guides</Link>
    <Intro eyebrow="THE WAVE GUIDE LIBRARY" mind="path" title={<>Learn the practice.<br /><span>Build it together.</span></>}><p>A practical foundation for the human in the loop. Listen deeply. Build something useful. Help people move together. Show what changed.</p></Intro>
    <div className="guide-library-tools"><Download content={guideHandbook} filename="Waves-Guide-Handbook.md">Download The Full Handbook</Download><a href="#guide-worksheets" className="guide-inline-link">Seven working templates <ArrowRight size={16} /></a></div>
    <section className="guide-section" aria-labelledby="guide-lessons-title"><div className="guide-section-heading"><p className="eyebrow">SIX LESSONS · ONE COMPLETE JOURNEY</p><h2 id="guide-lessons-title">Start with a real mission.</h2><p>Work through the lessons with your builder or an illustrative exercise. Each one ends with a deliverable and a readiness check. Reading times are estimates; the work takes the time it needs.</p></div><div className="guide-lesson-grid">{guideLessons.map((lesson, index) => <Link key={lesson.slug} to={`/guide/library/${lesson.slug}`} className="guide-lesson-card panel"><div className="guide-lesson-card-top"><span className="guide-lesson-number">0{index + 1}</span><span>{lesson.minutes} min read</span></div><h3>{lesson.title}</h3><p>{lesson.description}</p><span className="guide-lesson-open">Open lesson <ArrowRight size={18} /></span></Link>)}</div></section>
    <section className="guide-case-strip panel"><img src="/media/wave-examples/growth-wave-640.webp" alt="Illustrative Growth Wave showing people connecting around a community workshop" loading="lazy" width="640" height="960" /><div><p className="eyebrow">EIGHT STARTING MODELS</p><h2>Different missions.<br />A shared foundation.</h2><p>Growth. Funding. Innovation. Story. Hype. Maker. Work. Brave. Explore the illustrated examples, then shape what your builder actually needs.</p><ButtonLink to="/now-lets-begin#wave-examples" secondary>Explore The Wave Examples</ButtonLink></div></section>
    <section id="guide-worksheets" className="guide-section" aria-labelledby="guide-worksheets-title"><div className="guide-section-heading"><p className="eyebrow">TAKE THE WORK WITH YOU</p><h2 id="guide-worksheets-title">Seven working templates.</h2><p>Download, adapt, and agree them together. These are blank starting documents. Keep client details and private decisions in your assigned workspace.</p></div><WorksheetList /></section>
    <section className="guide-library-end panel"><p className="eyebrow">WHEN HUMANITY BUILDS TOGETHER, WE CHANGE THE WORLD.</p><h2>Put the practice into motion.</h2><div className="guide-actions"><ButtonLink to="/guide/apply">Apply To Be A Wave Guide</ButtonLink><ButtonLink to="/apply" secondary>Bring Your Vision</ButtonLink></div></section>
  </div>;
}

function Readiness({ lesson }: { lesson: GuideLessonData }) {
  const items = [...lesson.markdown.matchAll(/^- \[ \] (.+)$/gm)].map(match => match[1]);
  const [checked, setChecked] = useState<Set<number>>(() => new Set());
  return <section className="guide-readiness panel" aria-labelledby="guide-readiness-title"><p className="eyebrow">BEFORE YOU MOVE ON</p><h2 id="guide-readiness-title">Ready for the next move?</h2><p>Use this check with your builder. Your choices stay on this page for this visit.</p><div className="guide-checklist">{items.map((item, index) => <label key={item}><input type="checkbox" checked={checked.has(index)} onChange={() => setChecked(current => { const next = new Set(current); if (next.has(index)) next.delete(index); else next.add(index); return next; })} /><span>{item}</span></label>)}</div><div className="guide-readiness-count" role="status"><Check size={17} aria-hidden="true" />{checked.size} of {items.length} checked{checked.size === items.length ? " · Review the deliverable together." : ""}</div></section>;
}

export function GuideLesson() {
  const { slug } = useParams();
  const index = guideLessons.findIndex(lesson => lesson.slug === slug);
  const lesson = guideLessons[index];
  if (!lesson) return <div className="narrow-page guide-public"><Intro eyebrow="THE WAVE GUIDE LIBRARY" title="Lesson not found." /><ButtonLink to="/guide/library">Return To The Library</ButtonLink></div>;
  const next = guideLessons[index + 1];
  const body = lesson.markdown.replace(/^# .+\n/, "").split("## Before You Move On")[0];
  return <div className="document-page guide-public guide-lesson-page" key={lesson.slug}>
    <Link to="/guide/library" className="guide-back"><ArrowLeft size={16} />The Guide Library</Link>
    <Intro eyebrow={`LESSON 0${index + 1} OF 06 · ${lesson.minutes} MIN READ`} title={lesson.title}><p>{lesson.subtitle}</p></Intro>
    <div className="guide-lesson-layout"><aside className="guide-lesson-aside"><nav aria-label="Guide lessons">{guideLessons.map((item, i) => <Link key={item.slug} to={`/guide/library/${item.slug}`} aria-current={item.slug === slug ? "page" : undefined}><span>0{i + 1}</span>{item.title}</Link>)}</nav><Download content={lesson.markdown} filename={`Waves-Guide-${lesson.slug}.md`}>Download This Lesson</Download><figure><a href={`/media/wave-examples/${lesson.image}-wave.webp`} target="_blank" rel="noreferrer" aria-label={`View the full ${lesson.caseName} illustration in a new tab`}><img src={`/media/wave-examples/${lesson.image}-wave-640.webp`} alt={`${lesson.caseName} concept interface used as an illustrative teaching case`} loading="lazy" width="640" height="960" /></a><figcaption>{lesson.caseName}<br />Illustrative teaching case</figcaption></figure></aside><div className="guide-lesson-main"><article className="guide-markdown guide-lesson-text"><Markdown remarkPlugins={[remarkGfm]}>{body}</Markdown></article><Readiness key={lesson.slug} lesson={lesson} /><section className="guide-lesson-worksheets" aria-labelledby="lesson-worksheets-title"><h2 id="lesson-worksheets-title">Put it into practice.</h2><WorksheetList slugs={lesson.worksheets} /></section><nav className="guide-lesson-next" aria-label="Continue learning">{index > 0 && <Link to={`/guide/library/${guideLessons[index - 1].slug}`}><ArrowLeft size={16} />{guideLessons[index - 1].title}</Link>}{next ? <Link to={`/guide/library/${next.slug}`} className="glow-button">Next: {next.title}<ArrowRight size={17} /></Link> : <Link to="/workspace" className="glow-button">Open Your Workspace<ArrowRight size={17} /></Link>}</nav></div></div>
  </div>;
}
