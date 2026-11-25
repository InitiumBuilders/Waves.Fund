import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';
import { WaveMark } from './ui';
import { useStateStore } from './state';
import { mindGrow, mindWave } from './mind/WaveMind';
import { cutByTheBar } from './bar';
const INTRO_TEXT='Start Building Your Wave Right Here, Right Now. Set It Into Motion.';
type IntroPhase='waiting'|'typing'|'flow'|'idle';
/* On a phone the tab bar, and the fade it paints above itself, cover the foot of the first screen, and Surge must end
   clear of the fade or stand wholly below the bar (src/bar.ts). Where it would stand in the fade (an iPhone with
   Safari's bars showing, 393x659, had it half under the bar), the stage gives up width until Surge clears it; its height
   follows the art's 960:696, so the box and the channel keep their shape. Never narrower than LEAST: on a phone too
   short even then (an iPhone SE), Surge stays wholly below the bar with the vision box in view. Measured by layout
   before the first paint, and again only when something above the stage changes size, never on resize. */
const LEAST=214;
function useSurgeClear(stage:RefObject<HTMLFormElement|null>){
  useLayoutEffect(()=>{
    const s=stage.current;
    if(!s)return;
    const fit=()=>{
      s.style.removeProperty('width');s.style.removeProperty('margin-inline');delete s.dataset.narrow;
      const surge=s.querySelector<HTMLElement>('.surge-button');
      const cut=cutByTheBar(surge);
      if(!cut||!surge)return;
      // Surge stands at a fixed share of the stage's height, so narrowing the stage by d lifts its foot by d times this.
      const lift=(surge.offsetTop+surge.offsetHeight)/s.offsetWidth;
      const width=Math.max(LEAST,Math.floor(s.offsetWidth-cut.up/lift));
      if(width>=s.offsetWidth)return;
      s.style.width=width+'px';s.style.marginInline='auto';
      // A narrower box keeps three lines of the vision in view.
      if(width<320)s.dataset.narrow='';
    };
    fit();
    const ro=new ResizeObserver(fit);
    const workspace=s.parentElement;
    for(let e=workspace?.previousElementSibling;e;e=e.previousElementSibling)ro.observe(e);
    for(let e=s.previousElementSibling;e;e=e.previousElementSibling)ro.observe(e);
    document.fonts?.ready.then(fit);
    return()=>ro.disconnect();
  },[stage]);
}
export function Home() {
  const {state,setState,motion}=useStateStore();
  const navigate=useNavigate();
  const [focus,setFocus]=useState(false),[sending,setSending]=useState(false),[playing,setPlaying]=useState(false);
  const [introPhase,setIntroPhase]=useState<IntroPhase>(motion?'waiting':'idle');
  const [introText,setIntroText]=useState('');
  const video=useRef<HTMLVideoElement>(null);
  const stage=useRef<HTMLFormElement>(null);
  useSurgeClear(stage);
  const nucleus=useRef<HTMLVideoElement>(null);
  const timer=useRef<ReturnType<typeof setTimeout>|null>(null);
  const introTimer=useRef<ReturnType<typeof setTimeout>|null>(null);
  const introPhaseRef=useRef<IntroPhase>(motion?'waiting':'idle');
  const transferMode=useRef<'intro'|'submit'|null>(null);
  const done=useRef(false);
  const lastSpark=useRef(0);
  // Your vision has gravity: the mass in the field grows as the words do.
  const written=(introPhase==='idle'?state.vision:introText).length;
  useEffect(()=>{mindGrow(0.25+0.75*Math.min(1,written/160))},[written]);
  useEffect(()=>()=>mindGrow(1),[]);
  const clearIntroTimer=()=>{if(introTimer.current){clearTimeout(introTimer.current);introTimer.current=null}};
  const finishIntro=()=>{
    clearIntroTimer();
    if(transferMode.current==='intro'){
      video.current?.pause();
      if(video.current)video.current.currentTime=0;
      transferMode.current=null;
    }
    introPhaseRef.current='idle';setIntroPhase('idle');setIntroText('');setPlaying(false);setFocus(false);
  };
  const continueToApplication=()=>{if(done.current)return;done.current=true;if(timer.current)clearTimeout(timer.current);navigate('/apply')};
  const transferEnded=()=>{if(transferMode.current==='intro')finishIntro();else if(transferMode.current==='submit')continueToApplication()};
  useEffect(()=>()=>{if(timer.current)clearTimeout(timer.current)},[]);
  // The tour asks the intro to stop when it shows this box, so the visitor sees their own draft.
  useEffect(()=>{const quiet=()=>{if(introPhaseRef.current!=='idle')finishIntro()};addEventListener('waves:quiet-intro',quiet);return()=>removeEventListener('waves:quiet-intro',quiet)},[]);
  useEffect(()=>{
    if(!motion){finishIntro();return;}
    let active=true;
    let index=0;
    const typeNext=()=>{
      if(!active||introPhaseRef.current!=='typing')return;
      if(document.hidden){introTimer.current=setTimeout(typeNext,180);return;}
      index+=1;setIntroText(INTRO_TEXT.slice(0,index));
      if(index%7===0&&video.current)mindWave(video.current.parentElement!,0.22);
      if(index<INTRO_TEXT.length){introTimer.current=setTimeout(typeNext,48);return;}
      introTimer.current=setTimeout(()=>{
        if(!active||introPhaseRef.current!=='typing')return;
        introPhaseRef.current='flow';setIntroPhase('flow');transferMode.current='intro';
        const v=video.current;
        if(!v){finishIntro();return;}
        v.currentTime=0;v.playbackRate=.58;
        v.play().catch(()=>{if(transferMode.current==='intro')finishIntro()});
        introTimer.current=setTimeout(finishIntro,12500);
      },550);
    };
    introTimer.current=setTimeout(()=>{
      if(!active||introPhaseRef.current!=='waiting')return;
      introPhaseRef.current='typing';setIntroPhase('typing');typeNext();
    },650);
    const visibility=()=>{
      if(transferMode.current!=='intro')return;
      if(document.hidden){video.current?.pause();clearIntroTimer()}
      else{video.current?.play().catch(()=>{if(transferMode.current==='intro')finishIntro()});introTimer.current=setTimeout(finishIntro,12500)}
    };
    document.addEventListener('visibilitychange',visibility);
    return()=>{active=false;clearIntroTimer();document.removeEventListener('visibilitychange',visibility);if(transferMode.current==='intro'){video.current?.pause();transferMode.current=null}};
  },[motion]);
  useEffect(()=>{
    const element=nucleus.current;
    let visible=false;
    const update=()=>{if(visible&&motion&&!sending&&!document.hidden)element?.play().catch(()=>{});else element?.pause()};
    const observer=new IntersectionObserver(entries=>{visible=entries.some(entry=>entry.isIntersecting);update()},{threshold:.1});
    if(element)observer.observe(element);
    update();document.addEventListener('visibilitychange',update);
    return()=>{observer.disconnect();document.removeEventListener('visibilitychange',update)};
  },[motion,sending]);
  function surge(event:React.SubmitEvent<HTMLFormElement>){
    event.preventDefault();
    if(introPhaseRef.current!=='idle'){finishIntro();return;}
    if(!state.vision.trim()||sending)return;
    setSending(true);
    const gate=event.currentTarget.querySelector('.surge-button');
    if(gate)mindWave(gate,1.5);
    if(!motion){continueToApplication();return;}
    const v=video.current;
    transferMode.current='submit';
    if(v){v.currentTime=0;v.playbackRate=.58;v.play().catch(continueToApplication)}
    else continueToApplication();
    timer.current=setTimeout(continueToApplication,15000);
  }
  return <div className={'home-page immersive-home '+(sending?'is-sending':'')}>
    <div className="home-identity">
      <WaveMark className="identity-mark" />
      <div className="identity-name" aria-label="Waves.Fund">Waves<span>.Fund</span></div>
      <p className="identity-mantra">Trust People.<br/>And They Become Trustworthy.</p>
      <div className="desktop-invitation"><p className="home-tagline">Raise Capital In A Whole New Way.<br/><span>Raise Waves.</span></p><Link to="/learn">Welcome To The Frontier Of Funding <ArrowRight size={17}/></Link><p className="home-tags">#BuildDifferent #BuildAWave</p></div>
    </div>
    <div className="vision-workspace">
      <div className="vision-heading"><h1>What’s Your <span>Vision?</span></h1><p>What Are You Rising Towards?</p></div>
      <form ref={stage} className={'energy-stage '+(focus||introPhase==='typing'?'engaged ':'')+(introPhase==='typing'?'intro-typing ':'')+(playing?'transferring':'')} onSubmit={surge}>
        <video className="surge-transfer" ref={video} src="/media/surge-transfer.mp4" preload="auto" muted playsInline aria-hidden="true" onPlaying={()=>{if(transferMode.current)setPlaying(true)}} onEnded={transferEnded} onError={()=>{if(transferMode.current==='intro')finishIntro()}}/>
        <div className="vision-input">
          <label htmlFor="vision" className="sr-only">What’s Your Vision?</label>
          <textarea id="vision" required maxLength={500} value={introPhase==='idle'?state.vision:introText} placeholder={introPhase==='idle'?'Type your vision here...':''} readOnly={sending||introPhase!=='idle'} onFocus={()=>{if(introPhaseRef.current!=='idle')finishIntro();setFocus(true);if(motion&&video.current?.readyState===0)video.current.load()}} onBlur={()=>setFocus(false)} onChange={e=>{if(introPhaseRef.current==='idle'){setState(s=>({...s,vision:e.target.value}));const now=performance.now();if(now-lastSpark.current>120){lastSpark.current=now;mindWave(e.currentTarget,0.3)}}}}/>
          <span className="character-count">{introPhase==='idle'?state.vision.length:introText.length}/500</span>
        </div>
        <svg className="energy-channel" viewBox="0 0 950 650" aria-hidden="true"><defs><linearGradient id="channel" x1="0" y1="0" x2="0" y2="1"><stop stopColor="#43dfff" stopOpacity="0"/><stop offset=".5" stopColor="#64edff"/><stop offset="1" stopColor="#9981ff" stopOpacity=".2"/></linearGradient></defs><path className="channel-branch" d="M55 338 C55 385 350 380 446 454 C467 469 475 483 475 506 M895 338 C895 385 600 380 504 454 C483 469 475 483 475 506"/><path className="channel-core" d="M475 357 C475 430 475 453 475 506"/><circle className="channel-node" cx="475" cy="450" r="5"/></svg>
        <button className="surge-button" type="submit" disabled={sending}><span>Surge</span><ArrowRight size={24}/></button>
      </form>
      <div className="vision-after"><span role="status">{sending?'Your vision is moving forward.':''}</span>{sending?<button onClick={continueToApplication}>Continue <ArrowRight size={14}/></button>:introPhase!=='idle'&&<button type="button" onClick={finishIntro}>Skip intro <ArrowRight size={14}/></button>}</div>
      <div className="home-neuron" aria-hidden="true" data-mind="vision"><video ref={nucleus} src="/media/home-nucleus.mp4" poster="/media/home-nucleus.webp" muted playsInline loop preload="metadata"/></div>
      <Link className="home-learn-link" to="/learn">Raise Capital In A Whole New Way. Raise Waves. <ArrowRight size={15}/></Link>
    </div>
    <p className="swipe-hint"><ChevronLeft size={12}/> Swipe To Explore <ChevronRight size={12}/></p>
  </div>;
}

