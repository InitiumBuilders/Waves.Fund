import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';
import { WaveMark } from './ui';
import { useStateStore } from './state';
const INTRO_TEXT='Start Building Your Wave Right Here, Right Now. Set It Into Motion.';
type IntroPhase='waiting'|'typing'|'flow'|'idle';
export function Home() {
  const {state,setState,motion}=useStateStore();
  const navigate=useNavigate();
  const [focus,setFocus]=useState(false),[sending,setSending]=useState(false),[playing,setPlaying]=useState(false);
  const [introPhase,setIntroPhase]=useState<IntroPhase>(motion?'waiting':'idle');
  const [introText,setIntroText]=useState('');
  const video=useRef<HTMLVideoElement>(null);
  const nucleus=useRef<HTMLVideoElement>(null);
  const timer=useRef<ReturnType<typeof setTimeout>|null>(null);
  const introTimer=useRef<ReturnType<typeof setTimeout>|null>(null);
  const introPhaseRef=useRef<IntroPhase>(motion?'waiting':'idle');
  const transferMode=useRef<'intro'|'submit'|null>(null);
  const done=useRef(false);
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
  useEffect(()=>{
    if(!motion){finishIntro();return;}
    let active=true;
    let index=0;
    const typeNext=()=>{
      if(!active||introPhaseRef.current!=='typing')return;
      if(document.hidden){introTimer.current=setTimeout(typeNext,180);return;}
      index+=1;setIntroText(INTRO_TEXT.slice(0,index));
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
      <div className="desktop-invitation"><p>An Impact Fund. Funding For Futures.</p><Link to="/learn">Students Funding The Future <ArrowRight size={17}/></Link></div>
    </div>
    <div className="vision-workspace">
      <div className="vision-heading"><h1>What’s Your <span>Vision?</span></h1><p>What Are You Rising Towards?</p></div>
      <form className={'energy-stage '+(focus||introPhase==='typing'?'engaged ':'')+(introPhase==='typing'?'intro-typing ':'')+(playing?'transferring':'')} onSubmit={surge}>
        <video className="surge-transfer" ref={video} src="/media/surge-transfer.mp4" preload="auto" muted playsInline aria-hidden="true" onPlaying={()=>{if(transferMode.current)setPlaying(true)}} onEnded={transferEnded} onError={()=>{if(transferMode.current==='intro')finishIntro()}}/>
        <div className="vision-input">
          <label htmlFor="vision" className="sr-only">What’s Your Vision?</label>
          <textarea id="vision" required maxLength={500} value={introPhase==='idle'?state.vision:introText} placeholder={introPhase==='idle'?'Type your vision here...':''} readOnly={sending||introPhase!=='idle'} onFocus={()=>{if(introPhaseRef.current!=='idle')finishIntro();setFocus(true);if(motion&&video.current?.readyState===0)video.current.load()}} onBlur={()=>setFocus(false)} onChange={e=>{if(introPhaseRef.current==='idle')setState(s=>({...s,vision:e.target.value}))}}/>
          <span className="character-count">{introPhase==='idle'?state.vision.length:introText.length}/500</span>
        </div>
        <svg className="energy-channel" viewBox="0 0 950 650" aria-hidden="true"><defs><linearGradient id="channel" x1="0" y1="0" x2="0" y2="1"><stop stopColor="#43dfff" stopOpacity="0"/><stop offset=".5" stopColor="#64edff"/><stop offset="1" stopColor="#9981ff" stopOpacity=".2"/></linearGradient></defs><path className="channel-branch" d="M55 338 C55 385 350 380 446 454 C467 469 475 483 475 506 M895 338 C895 385 600 380 504 454 C483 469 475 483 475 506"/><path className="channel-core" d="M475 357 C475 430 475 453 475 506"/><circle className="channel-node" cx="475" cy="450" r="5"/></svg>
        <button className="surge-button" type="submit" disabled={sending}><span>Surge</span><ArrowRight size={24}/></button>
      </form>
      <div className="vision-after"><span role="status">{sending?'Your vision is moving forward.':''}</span>{sending?<button onClick={continueToApplication}>Continue <ArrowRight size={14}/></button>:introPhase!=='idle'&&<button type="button" onClick={finishIntro}>Skip intro <ArrowRight size={14}/></button>}</div>
      <div className="home-neuron" aria-hidden="true"><video ref={nucleus} src="/media/home-nucleus.mp4" poster="/media/home-nucleus.webp" muted playsInline loop preload="metadata"/></div>
      <Link className="home-learn-link" to="/learn">Students Funding The Future <ArrowRight size={15}/></Link>
    </div>
    <p className="swipe-hint"><ChevronLeft size={12}/> Swipe To Explore <ChevronRight size={12}/></p>
  </div>;
}

