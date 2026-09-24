import { useEffect, useRef } from "react";
import type { CSSProperties, ReactNode } from "react";
import "./symbols.css";

/* Small wave symbols. Each one is a real wave behaviour:
   - StandingString: a string held at both ends. A standing wave is a fixed shape whose height swings back
     and forth, so a sine scaled up and down in time is exactly what it looks like.
   - Travel: a wave moving along, a long sine slid sideways inside a window.
   - Pair: two sources sending out rings in step.
   - Echo: a pulse that goes out, meets the far end and comes back flipped.
   - Resonance: one string held in a standing wave sets the next one moving.
   - Guided: light bouncing between two walls and carried along, as in a waveguide.
   - Growing: a wave gaining strength.

   The drawing is SVG, but everything that moves is an HTML layer holding its own SVG. The browser animates
   an HTML layer's transform and opacity on the compositor, off the main thread; animating inside an SVG it
   cannot. So the symbols cost almost nothing, even on a slow phone. Every loop is a whole number of beats
   (src/cadence.ts). */

const W = 320, H = 72;

const sine = (w: number, h: number, halves: number, amp: number, phase = 0, steps = 96) =>
  Array.from({ length: steps + 1 }, (_, i) => {
    const x = (i / steps) * w;
    return `${i ? "L" : "M"}${x.toFixed(1)} ${(h / 2 - amp * Math.sin((halves * Math.PI * x) / w + phase)).toFixed(1)}`;
  }).join(" ");

/** The symbol's box: 320 by 72 units, drawn to the width it is given. */
function Box({ kind, className, label, children }: { kind: string; className: string; label?: string; children: ReactNode }) {
  return (
    <span className={`sym sym-${kind} ${className}`} role={label ? "img" : undefined} aria-label={label} aria-hidden={label ? undefined : true} data-clear>
      {children}
    </span>
  );
}
/** A still drawing in the symbol's own units. */
const Draw = ({ children, width = W }: { children: ReactNode; width?: number }) => (
  <svg viewBox={`0 0 ${width} ${H}`} focusable="false">{children}</svg>
);
/** A moving layer: the browser animates the layer, not the drawing inside it. */
const Move = ({ className, style, children, width }: { className: string; style?: CSSProperties; children: ReactNode; width?: number }) => (
  <span className={`sym-move ${className}`} style={style}><Draw width={width}>{children}</Draw></span>
);

export function StandingString({ halves = 3, className = "", label }: { halves?: number; className?: string; label?: string }) {
  const amp = 24;
  const nodes = Array.from({ length: halves + 1 }, (_, i) => (i * W) / halves);
  return (
    <Box kind="string" className={className} label={label}>
      <Draw>
        <path className="sym-envelope" d={sine(W, H, halves, amp)} />
        <path className="sym-envelope" d={sine(W, H, halves, -amp)} />
      </Draw>
      <Move className="sym-swing"><path className="sym-line" d={sine(W, H, halves, amp)} /></Move>
      <Draw>{nodes.map((x, i) => <circle key={x} className={i === 0 || i === halves ? "sym-end" : "sym-node"} cx={x} cy={H / 2} r={i === 0 || i === halves ? 4.5 : 2.2} />)}</Draw>
    </Box>
  );
}

export function Travel({ className = "" }: { className?: string }) {
  return (
    <Box kind="travel" className={className}>
      <span className="sym-clip"><Move className="sym-slide" width={W * 2}><path className="sym-line" d={sine(W * 2, H, 8, 20)} /></Move></span>
      <Draw><circle className="sym-end" cx={W - 8} cy={H / 2} r="4.5" /></Draw>
    </Box>
  );
}

export function Pair({ className = "", at = [110, 210] }: { className?: string; at?: number[] }) {
  const R = 30;
  return (
    <Box kind="pair" className={className}>
      {at.map((cx) => [0, 1, 2, 3].map((k) => (
        <span key={`${cx}-${k}`} className="sym-ring" style={{ left: `${((cx - R) / W) * 100}%`, top: `${((H / 2 - R) / H) * 100}%`, width: `${((2 * R) / W) * 100}%`, height: `${((2 * R) / H) * 100}%`, animationDelay: `${k * 0.75}s` }} />
      )))}
      <Draw>{at.map((cx) => <circle key={cx} className="sym-end" cx={cx} cy={H / 2} r="4.5" />)}</Draw>
    </Box>
  );
}

export function Echo({ className = "" }: { className?: string }) {
  return (
    <Box kind="echo" className={className}>
      <Draw>
        <line className="sym-rail" x1="12" y1="36" x2="308" y2="36" />
        <circle className="sym-end" cx="12" cy="36" r="4.5" />
      </Draw>
      <Move className="sym-pulse"><path className="sym-line" d="M-26 36 C -14 36, -10 14, 0 14 C 10 14, 14 36, 26 36" /></Move>
      <span className="sym-far" style={{ left: `${(308 / W) * 100}%` }} />
    </Box>
  );
}

export function Resonance({ className = "" }: { className?: string }) {
  return (
    <Box kind="resonance" className={className}>
      <Move className="sym-swing is-first"><g transform="translate(0 -14)"><path className="sym-line" d={sine(W, H, 2, 12)} /></g></Move>
      <Move className="sym-swing is-late"><g transform="translate(0 14)"><path className="sym-line is-second" d={sine(W, H, 2, 12)} /></g></Move>
    </Box>
  );
}

export function Guided({ className = "" }: { className?: string }) {
  const zig = Array.from({ length: 17 }, (_, i) => `${i ? "L" : "M"}${i * 40} ${i % 2 ? 58 : 14}`).join(" ");
  return (
    <Box kind="guided" className={className}>
      <Draw>
        <line className="sym-wall" x1="0" y1="11" x2={W} y2="11" />
        <line className="sym-wall" x1="0" y1="61" x2={W} y2="61" />
      </Draw>
      <span className="sym-clip"><Move className="sym-slide is-guided" width={W * 2}><path className="sym-line" d={zig} /></Move></span>
    </Box>
  );
}

export function Growing({ className = "" }: { className?: string }) {
  return (
    <Box kind="growing" className={className}>
      <Move className="sym-grow"><path className="sym-line" d={sine(W, H, 4, 26)} /></Move>
      <Draw><circle className="sym-end" cx="0" cy={H / 2} r="4.5" /></Draw>
    </Box>
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
