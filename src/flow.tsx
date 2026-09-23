import { useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useStateStore } from './state';
const views = ['/', '/learn', '/guide', '/give', '/grow'];
export function FlowNavigation() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { motion } = useStateStore();
  const last = useRef(pathname);
  useEffect(() => {
    const before = views.indexOf(last.current), after = views.indexOf(pathname);
    document.documentElement.dataset.direction = after >= before ? 'next' : 'previous';
    last.current = pathname;
  }, [pathname]);
  useEffect(() => {
    if (!views.includes(pathname)) return;
    let start: {x:number;y:number;time:number} | null = null;
    const blocked = (target: EventTarget | null) => target instanceof Element && !!target.closest('input,textarea,select,button,a,[role="slider"],dialog,[data-no-swipe]');
    const begin = (event: TouchEvent) => {
      if (event.touches.length !== 1 || blocked(event.target) || document.querySelector('dialog[open]')) { start=null; return; }
      const point = event.touches[0];
      // Preserve the browser's edge-swipe back gesture.
      if (point.clientX < 24 || point.clientX > innerWidth - 24) return;
      start = {x:point.clientX,y:point.clientY,time:performance.now()};
    };
    const finish = (event: TouchEvent) => {
      if (!start || event.changedTouches.length !== 1) return;
      const point=event.changedTouches[0], dx=point.clientX-start.x,dy=point.clientY-start.y;
      const allowed = Math.abs(dx)>85 && Math.abs(dx)>Math.abs(dy)*1.8 && performance.now()-start.time<750;
      start=null;
      if (!allowed || document.querySelector('dialog[open]') || window.getSelection()?.toString()) return;
      const next = views.indexOf(pathname)+(dx<0?1:-1);
      if (next>=0&&next<views.length) navigate(views[next]);
    };
    const cancel=()=>{start=null};
    document.addEventListener('touchstart',begin,{passive:true});
    document.addEventListener('touchend',finish,{passive:true});
    document.addEventListener('touchcancel',cancel,{passive:true});
    return ()=>{document.removeEventListener('touchstart',begin);document.removeEventListener('touchend',finish);document.removeEventListener('touchcancel',cancel)};
  }, [pathname,navigate]);
  useEffect(() => {
    if (!motion) return;
    const observer = new IntersectionObserver(entries=>{
      for(const entry of entries) if(entry.isIntersecting){entry.target.classList.add('flow-arrival');observer.unobserve(entry.target)};
    },{threshold:0.08});
    document.querySelectorAll('main .section, main .partner-tile, main .roadmap article').forEach(el=>observer.observe(el));
    return ()=>observer.disconnect();
  },[pathname,motion]);
  return null;
}
