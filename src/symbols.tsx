import { useEffect, useId, useRef } from "react";
import type { ReactNode } from "react";
import "./symbols.css";

/* Small wave symbols drawn in SVG and moved with transforms only, so they cost nothing to run.
   Each one is a real wave behaviour:
   - StandingString: a string held at both ends. A standing wave is a fixed shape whose height swings back
     and forth, so a sine path scaled up and down in time is exactly what it looks like.
   - Travel: a wave moving along, a long sine slid sideways inside a window.
   - Pair: two sources sending out rings in step.
   - Echo: a pulse that goes out, meets the far end and comes back.
   - Resonance: one string held in a standing wave sets the next one moving. */

const sine = (w: number, h: number, halves: number, amp: number, phase = 0, steps = 96) =>
  Array.from({ length: steps + 1 }, (_, i) => {
    const x = (i / steps) * w;
    return `${i ? "L" : "M"}${x.toFixed(1)} ${(h / 2 - amp * Math.sin((halves * Math.PI * x) / w + phase)).toFixed(1)}`;
  }).join(" ");

export function StandingString({ halves = 3, className = "", label }: { halves?: number; className?: string; label?: string }) {
  const W = 320, H = 72, amp = 24;
  const nodes = Array.from({ length: halves + 1 }, (_, i) => (i * W) / halves);
  return (
    <svg className={`sym sym-string ${className}`} viewBox={`0 0 ${W} ${H}`} role={label ? "img" : undefined} aria-label={label} aria-hidden={label ? undefined : true}>
      <path className="sym-envelope" d={sine(W, H, halves, amp)} />
      <path className="sym-envelope" d={sine(W, H, halves, -amp)} />
      <g className="sym-swing"><path className="sym-line" d={sine(W, H, halves, amp)} /></g>
      {nodes.map((x, i) => <circle key={x} className={i === 0 || i === halves ? "sym-end" : "sym-node"} cx={x} cy={H / 2} r={i === 0 || i === halves ? 4.5 : 2.2} />)}
    </svg>
  );
}

export function Travel({ className = "" }: { className?: string }) {
  const W = 320, H = 72, id = useId();
  return (
    <svg className={`sym sym-travel ${className}`} viewBox={`0 0 ${W} ${H}`} aria-hidden="true">
      <defs><clipPath id={`clip${id}`}><rect x="0" y="0" width={W} height={H} /></clipPath></defs>
      <g clipPath={`url(#clip${id})`}><g className="sym-slide"><path className="sym-line" d={sine(W * 2, H, 8, 20)} /></g></g>
      <circle className="sym-end" cx={W - 8} cy={H / 2} r="4.5" />
    </svg>
  );
}

export function Pair({ className = "", at = [110, 210] }: { className?: string; at?: number[] }) {
  const rings = [0, 1, 2, 3];
  return (
    <svg className={`sym sym-pair ${className}`} viewBox="0 0 320 72" aria-hidden="true">
      {at.map((cx) => (
        <g key={cx} transform={`translate(${cx} 36)`}>
          {rings.map((r) => <circle key={r} className="sym-ring" r="30" style={{ animationDelay: `${r * 0.75}s` }} />)}
          <circle className="sym-end" r="4.5" />
        </g>
      ))}
    </svg>
  );
}

export function Echo({ className = "" }: { className?: string }) {
  return (
    <svg className={`sym sym-echo ${className}`} viewBox="0 0 320 72" aria-hidden="true">
      <line className="sym-rail" x1="12" y1="36" x2="308" y2="36" />
      <g className="sym-pulse"><path className="sym-line" d="M-26 36 C -14 36, -10 14, 0 14 C 10 14, 14 36, 26 36" /></g>
      <circle className="sym-end" cx="12" cy="36" r="4.5" />
      <circle className="sym-end is-far" cx="308" cy="36" r="4.5" />
    </svg>
  );
}

export function Resonance({ className = "" }: { className?: string }) {
  const W = 320, H = 72;
  return (
    <svg className={`sym sym-resonance ${className}`} viewBox={`0 0 ${W} ${H}`} aria-hidden="true">
      <g transform="translate(0 -14)"><g className="sym-swing"><path className="sym-line" d={sine(W, H, 2, 12)} /></g></g>
      <g transform="translate(0 14)"><g className="sym-swing is-late"><path className="sym-line is-second" d={sine(W, H, 2, 12)} /></g></g>
    </svg>
  );
}

/* A guided wave: light bouncing between two walls and carried along, as in a waveguide. */
export function Guided({ className = "" }: { className?: string }) {
  const W = 320, H = 72, id = useId();
  const zig = Array.from({ length: 17 }, (_, i) => `${i ? "L" : "M"}${i * 40} ${i % 2 ? 58 : 14}`).join(" ");
  return (
    <svg className={`sym sym-guided ${className}`} viewBox={`0 0 ${W} ${H}`} aria-hidden="true">
      <defs><clipPath id={`clip${id}`}><rect x="0" y="10" width={W} height="52" /></clipPath></defs>
      <line className="sym-wall" x1="0" y1="11" x2={W} y2="11" /><line className="sym-wall" x1="0" y1="61" x2={W} y2="61" />
      <g clipPath={`url(#clip${id})`}><g className="sym-slide is-guided"><path className="sym-line" d={zig} /></g></g>
    </svg>
  );
}

/* A wave gaining strength: its swing grows, settles, and grows again. */
export function Growing({ className = "" }: { className?: string }) {
  const W = 320, H = 72;
  return (
    <svg className={`sym sym-growing ${className}`} viewBox={`0 0 ${W} ${H}`} aria-hidden="true">
      <g className="sym-grow"><path className="sym-line" d={sine(W, H, 4, 26)} /></g>
      <circle className="sym-end" cx="0" cy={H / 2} r="4.5" />
    </svg>
  );
}

/* A list whose items light one after another as they are reached, joined by one wave running down the
   page: the energy of each step carries into the next. */
export function WaveList({ items, className = "" }: { items: { title: ReactNode; text: ReactNode }[]; className?: string }) {
  const ref = useRef<HTMLOListElement>(null);
  useEffect(() => {
    const list = ref.current;
    if (!list) return;
    const lis = [...list.querySelectorAll("li")];
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) if (e.isIntersecting) { e.target.classList.add("is-lit"); io.unobserve(e.target); }
    }, { threshold: 0.55 });
    lis.forEach((li) => io.observe(li));
    // If the page is hidden or observers are held back, nothing should stay dark forever.
    const floor = setTimeout(() => lis.forEach((li) => li.getBoundingClientRect().top < innerHeight && li.classList.add("is-lit")), 1500);
    return () => { io.disconnect(); clearTimeout(floor); };
  }, []);
  return (
    <ol ref={ref} className={`wave-list ${className}`}>
      {items.map((it, i) => (
        <li key={i}>
          <svg className="wave-list-path" viewBox="0 0 24 100" preserveAspectRatio="none" aria-hidden="true">
            <path d={Array.from({ length: 41 }, (_, k) => `${k ? "L" : "M"}${(12 + 9 * Math.cos((k / 40) * Math.PI * 2)).toFixed(2)} ${(k * 2.5).toFixed(1)}`).join(" ")} vectorEffect="non-scaling-stroke" />
          </svg>
          <span className="wave-list-node" aria-hidden="true" />
          <span className="step-number">{String(i + 1).padStart(2, "0")}</span>
          <h3>{it.title}</h3>
          <p>{it.text}</p>
        </li>
      ))}
    </ol>
  );
}
