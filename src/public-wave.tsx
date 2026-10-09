import { useEffect, useRef, useState } from "react";
import type { MutableRefObject } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowRight, Download, Share2, Check, RefreshCw } from "lucide-react";
import { ButtonLink, WaveMark } from "./ui";
import { SeaHero } from "./sea-hero";
import { BEAT } from "./cadence";
import { sound } from "./sound";
import { safeWebLink, saveFile, waveRequest } from "./workspace-client";
import type { RippleModel, Source } from "./together/ripple";
import type { PublicWave as PublicWaveRecord, ReceiptResult, WaveOffer, WavePass } from "./workspace-types";
import "./workspace.css";
import "./public-wave.css";

const formatDate = (v: string) => new Date(v).toLocaleDateString(undefined, { dateStyle: "medium" });
function Evidence({ href }: { href: string }) { const safe = safeWebLink(href); return safe ? <a className="text-button" href={safe} target="_blank" rel="noreferrer">View Evidence <ArrowRight size={16} /></a> : null; }

/* Each Wave opens on its own water. Its light is far out; every person whose help is part of it (a completed
   contribution, an accepted carrier) is another light, coming up beside it in step, so the swell grows with its people.
   Its finished moves rise from its light as ripples when the page opens, oldest first, one a beat, and ring with sound
   on. Every eight beats a wave rises from the horizon and comes all the way to you. */
function waveSea(wave: MutableRefObject<PublicWaveRecord | null>): RippleModel {
  let t0: number | null = null;
  const rung = new Set<number>();
  return (t, w, h) => {
    if (t0 === null) t0 = t;
    const x = wave.current;
    const lambda = Math.max(46, Math.min(116, Math.min(w, h) * 0.17));
    const sources: Source[] = [{ x: w * 0.6, y: h * 0.16, a: 0.85, phase: 0, hue: 0.12, size: 3.6, born: -100, reach: 0.75 }];
    const people = x ? Math.min(8, x.contributions.length + x.carrying.filter((p) => p.status === "accepted" || p.status === "completed").length) : 0;
    for (let k = 0; k < people; k++) {
      const side = k % 2 ? -1 : 1, step = Math.floor(k / 2) + 1;
      sources.push({ x: w * (0.6 + side * 0.11 * step), y: h * (0.2 + 0.05 * step), a: 0.5, phase: 0, hue: 0.12 + 0.06 * (k % 4), size: 3, born: t0 + (k + 1) * BEAT, reach: 0.5 });
    }
    (x?.journey || []).slice(-6).forEach((_, k) => {
      const at = t0! + 2 * BEAT + k * BEAT, age = t - at;
      if (age < 0 || age > 4) return;
      if (!rung.has(k)) { rung.add(k); sound("light", k); }
      sources.push({ x: w * 0.6, y: h * 0.16, a: 0.8 * (1 - age / 4), phase: 0, hue: 0.12, size: 2, born: at, reach: 0.7 });
    });
    return { sources, lambda, speed: lambda / BEAT, gain: 1.05, dots: 14, ground: 0.92, roll: [8 * BEAT, 1] };
  };
}

export function PublicWave() {
  const { slug = "" } = useParams();
  const [latestReceipt, setLatestReceipt] = useState("");
  const [wave, setWave] = useState<PublicWaveRecord | null>(null), [loading, setLoading] = useState(true), [error, setError] = useState(""), [shared, setShared] = useState(false);
  const current = useRef<PublicWaveRecord | null>(null);
  current.current = wave;
  const model = useRef<RippleModel>(waveSea(current));
  useEffect(() => { let active = true; setLoading(true); setWave(null); setError(""); waveRequest<{wave:PublicWaveRecord}>("", undefined, slug).then(r => { if(active) setWave(r.wave); }).catch(e => { if(active) setError(e.message); }).finally(() => { if(active) setLoading(false); }); return () => { active = false; }; }, [slug]);
  const share = async () => { const url = `${window.location.origin}/waves/${slug}`; try { if (navigator.share) await navigator.share({title:wave?.title,url}); else { await navigator.clipboard.writeText(url); setShared(true); } } catch { setShared(false); } };
  if (loading) return <div className="workspace-page workspace-loading" role="status">Opening this Wave…</div>;
  if (error || !wave) return <div className="workspace-page"><section className="panel"><WaveMark /><h1>This Wave Is Not Available Yet.</h1><p>{error || "Published Waves appear here when the builder and team are ready to share them."}</p><div className="workspace-actions"><ButtonLink to="/waves">Explore Waves</ButtonLink><ButtonLink to="/now-lets-begin#wave-examples" secondary>Explore The Starting Models</ButtonLink></div></section></div>;
  const open = wave.currentMove.status === "open";
  const hasReceipt = (() => { try { return Boolean(latestReceipt || localStorage.getItem(`waves-offer-receipt:${slug}`)); } catch { return Boolean(latestReceipt); } })();
  return <div className="public-wave" data-no-swipe>
    <SeaHero
      eyebrow={wave.template && wave.template !== "custom" ? `${wave.template.toUpperCase()} WAVE` : "A WAVE ON WAVES.FUND"}
      model={model}
      title={wave.title}
      actions={<>{open && <a className="glow-button" href="#offer-help">Offer Your Help <ArrowRight size={18} /></a>}<button type="button" className="text-button" onClick={share}>{shared ? <Check size={17}/> : <Share2 size={17}/>}{shared ? "Link Copied" : "Share This Wave"}</button></>}
    >
      <p>Trust People. And They Become Trustworthy.</p>
    </SeaHero>
    <div className="document-page sea-after pw-body">
      <section className="pw-chapter arrive"><p className="eyebrow">THE STORY</p><h2>What We’re Building Together</h2><p className="pw-story">{wave.story}</p>{wave.guideName && <div className="pw-guide"><span className="eyebrow">YOUR WAVE GUIDE</span><h3>{wave.guideName}</h3>{wave.guideBio && <p>{wave.guideBio}</p>}</div>}</section>
      <section className="pw-chapter arrive"><p className="eyebrow">THE CURRENT MOVE</p><div className="panel pw-move"><span className="workspace-badge">{open ? "Help Welcome" : "Complete"}</span><h2>{wave.currentMove.title}</h2><dl className="workspace-detail"><div><dt>Responsible</dt><dd>{wave.currentMove.owner}</dd></div><div><dt>Help Needed</dt><dd>{wave.currentMove.needs}</dd></div><div><dt>Complete When</dt><dd>{wave.currentMove.completion}</dd></div>{wave.currentMove.outcome && <div><dt>What Changed</dt><dd>{wave.currentMove.outcome}</dd></div>}</dl>{wave.currentMove.evidence && <div className="workspace-actions"><Evidence href={wave.currentMove.evidence}/></div>}</div></section>
      {open && <div className="pw-chapter arrive"><OfferHelp wave={wave} onReceipt={setLatestReceipt}/></div>}
      <section className="pw-chapter arrive"><p className="eyebrow">THE PEOPLE MOVING IT FORWARD</p><h2>Contributions & Carrying</h2>{!wave.contributions.length && !wave.carrying.length && <p>Agreed contributions and outcomes will appear here with permission. Each person’s help becomes part of the Journey.</p>}{wave.contributions.map((contribution,index)=><article className="workspace-entry" key={`contribution-${index}`}><span className="workspace-badge">Completed Contribution</span><h3>{contribution.name}</h3><p>{contribution.outcome}</p><Evidence href={contribution.evidence}/></article>)}{wave.carrying.map((person,index)=><article className="workspace-entry" key={`pass-${index}`}><span className="workspace-badge">{person.status === "accepted" ? "Carrying This Wave" : person.status}</span><h3>{person.name}</h3><p>{person.purpose}</p>{person.outcome && <p>{person.outcome}</p>}<Evidence href={person.evidence}/></article>)}</section>
      <section className="pw-chapter arrive"><p className="eyebrow">YOU HELPED. HERE’S WHAT CHANGED.</p><h2>The Journey</h2>{wave.journey.length ? <ol className="pw-journey">{wave.journey.map(item=><li key={item.id}><time dateTime={item.created}>{formatDate(item.created)}</time><h3>{item.title}</h3><p>{item.body}</p><Evidence href={item.evidence}/></li>)}</ol> : <p>The next outcome will be shared here after the work is completed and approved.</p>}</section>
      <details className="pw-chapter pw-receipt" open={hasReceipt}><summary>Follow Your Contribution</summary><ReceiptTracker slug={slug} receivedReceipt={latestReceipt}/></details>
      <section className="pw-close arrive"><h2>Build Your Own Wave.</h2><p>A Wave Guide works with you to design, build, and evolve the tools and story your mission needs. Begin with your vision, then agree your scope and fee together.</p><div className="button-row"><ButtonLink to={`/apply${wave.template?`?waveType=${encodeURIComponent(wave.template)}`:""}`}>Bring Your Vision</ButtonLink><ButtonLink to="/guide/library" secondary>Explore The Guide Library</ButtonLink></div></section>
    </div>
  </div>;
}

function OfferHelp({wave,onReceipt}:{wave:PublicWaveRecord;onReceipt:(receipt:string)=>void}) {
  const [busy,setBusy]=useState(false),[error,setError]=useState(""),[receipt,setReceipt]=useState("");
  const [requestId]=useState(()=>crypto.randomUUID());
  const submit=async (event:React.FormEvent<HTMLFormElement>)=>{event.preventDefault();setBusy(true);setError("");const form=new FormData(event.currentTarget);try{const response=await waveRequest<{receipt:string}>("offer",{action:"offer",slug:wave.slug,moveId:wave.currentMove.id,name:String(form.get("name")||"").trim(),email:String(form.get("email")||"").trim(),message:String(form.get("message")||"").trim(),recognitionConsent:form.get("recognitionConsent")==="on",requestId,website:String(form.get("website")||"")});setReceipt(response.receipt);onReceipt(response.receipt);try{localStorage.setItem(`waves-offer-receipt:${wave.slug}`,response.receipt);}catch{/* A downloaded receipt remains available. */}}catch(e){setError((e as Error).message);}finally{setBusy(false);}};
  return <section className="panel" id="offer-help"><p className="eyebrow">YOUR CONTRIBUTION MATTERS</p><h2>{receipt?"Your Offer Is In Motion.":"Offer Your Help"}</h2>{receipt ? <><p>Your builder and Guide can now review your offer. Save this private receipt to see their response, track what happens, or withdraw your offer.</p><p className="workspace-receipt">{receipt}</p><button className="workspace-button" onClick={()=>saveFile(`${wave.slug}-contribution-receipt.json`,{receipt,slug:wave.slug,url:`https://www.waves.fund/waves/${wave.slug}`,kind:"offer"})}><Download size={17}/>Download My Receipt</button><p className="workspace-note">Keep your receipt private. Anyone with it can view and manage your offer.</p><a className="text-button" href="#my-contribution">Track My Contribution<ArrowRight size={16}/></a></> : <><p>Offer time, skills, a useful introduction, or another practical contribution to this move. The team will respond through your private receipt.</p><form className="workspace-form" onSubmit={submit}><div className="workspace-grid"><label>Your name<input name="name" autoComplete="name" required maxLength={120}/></label><label>Your email · private<input name="email" type="email" autoComplete="email" required maxLength={254}/></label></div><label>How would you like to help?<textarea name="message" required rows={5} maxLength={3000}/></label><label className="workspace-check"><input type="checkbox" name="recognitionConsent"/><span>You may show my name and completed contribution on the public Wave.</span></label><label className="workspace-check"><input type="checkbox" required/><span>I agree that the builder and assigned Guides may use these details to coordinate my offer. <Link to="/privacy">Privacy</Link></span></label><div style={{position:"absolute",left:-10000}} aria-hidden="true"><label>Website<input name="website" tabIndex={-1} autoComplete="off"/></label></div><button className="workspace-button" disabled={busy}>{busy?"Sending…":"Offer My Help"}<ArrowRight size={17}/></button></form></>}{error && <p className="workspace-message error" role="alert">{error}</p>}</section>;
}

function ReceiptTracker({slug,receivedReceipt}:{slug:string;receivedReceipt:string}) {
  const [receipt,setReceipt]=useState(()=>{try{return localStorage.getItem(`waves-offer-receipt:${slug}`)||"";}catch{return "";}}),[result,setResult]=useState<ReceiptResult|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState(""),[recognition,setRecognition]=useState(false);
  useEffect(() => { if (receivedReceipt) { setReceipt(receivedReceipt); setResult(null); } }, [receivedReceipt]);
  async function inspect(action="receipt",decision?:"accept"|"decline") {setBusy(true);setError("");try{const response=await waveRequest<ReceiptResult>(action,{action,receipt:receipt.trim(),...(decision?{decision,recognitionConsent:recognition}:{})});setResult(response);}catch(e){setError((e as Error).message);}finally{setBusy(false);}}
  const record=result?.record;
  return <section className="panel" id="my-contribution"><p className="eyebrow">YOUR PRIVATE RECEIPT</p><h2>Follow Your Contribution</h2><p>Open your saved receipt to see a response or outcome. You can also open a carrying invitation here.</p><form className="workspace-form" onSubmit={e=>{e.preventDefault();void inspect();}}><label>Receipt code<textarea value={receipt} onChange={e=>{setReceipt(e.target.value);setResult(null);}} rows={3} required autoComplete="off" spellCheck={false}/></label><label>Or load your receipt file<input type="file" accept=".json,application/json" onChange={async e=>{const file=e.target.files?.[0];if(!file)return;setError("");try{if(file.size>32000)throw Error("Choose your small receipt JSON file.");const data=JSON.parse(await file.text());if(typeof data.receipt!=="string"||data.receipt.length>2000)throw Error("This file does not contain a receipt.");setReceipt(data.receipt);setResult(null);}catch(err){setError((err as Error).message);}}}/></label><button className="workspace-button secondary" disabled={busy}>{busy?"Checking…":"Open My Receipt"}<RefreshCw size={17}/></button></form>{error&&<p className="workspace-message error" role="alert">{error}</p>}{result && record && <div className="workspace-entry" style={{marginTop:24}}><p className="eyebrow">{result.wave.title}</p><span className="workspace-badge">{record.status}</span><h3>{record.name}</h3>{result.kind==="offer" ? <><p>{(record as WaveOffer).message}</p>{(record as WaveOffer).response&&<div className="workspace-message"><strong>The Team’s Response</strong><p>{(record as WaveOffer).response}</p></div>}{record.outcome&&<><h3>Here’s What Changed</h3><p>{record.outcome}</p><Evidence href={record.evidence}/></>}{record.status!=="withdrawn"&&<button className="workspace-button secondary" disabled={busy} onClick={()=>inspect("withdraw")}>Withdraw My Offer</button>}</> : <><p>{(record as WavePass).purpose}</p><p>Until {formatDate((record as WavePass).expires)}</p>{record.status==="invited"&&<><label className="workspace-check" style={{display:"flex",gap:12,margin:"20px 0"}}><input type="checkbox" checked={recognition} onChange={e=>setRecognition(e.target.checked)}/><span>You may show my name, carrying purpose, and completed outcome publicly.</span></label><div className="workspace-actions"><button className="workspace-button" disabled={busy} onClick={()=>inspect("passReply","accept")}>Accept The Wave<Check size={17}/></button><button className="workspace-button secondary" disabled={busy} onClick={()=>inspect("passReply","decline")}>Decline Invitation</button></div></>}{record.outcome&&<><h3>Here’s What Changed</h3><p>{record.outcome}</p><Evidence href={record.evidence}/></>}</>}{result.journey.length>0&&<details style={{marginTop:20}}><summary>See The Approved Journey</summary>{result.journey.map(item=><article className="workspace-entry" key={item.id}><h3>{item.title}</h3><p>{item.body}</p><Evidence href={item.evidence}/></article>)}</details>}</div>}</section>;
}
