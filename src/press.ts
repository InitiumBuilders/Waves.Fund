import { still } from "./cadence";
import { mindWave } from "./mind/WaveMind";
import { sound } from "./sound";
import "./press.css";

/* Every press is met. Light spreads through the button from the point the finger landed (from its centre for a key),
   a ring goes out through the water behind the page, with sound on a button rings the water's note for where it was
   touched (a link rings when its page arrives), and on a phone that can, a primary press gives one short tick.
   One listener for the whole site, so every button answers the same way. */

const PLATE = ".glow-button, .workspace-button, .guide-download, .surge-button";
const LINE = ".text-button";
const BOTH = `${PLATE}, ${LINE}`;

function answer(el: HTMLElement, x: number, y: number) {
  const r = el.getBoundingClientRect();
  const plate = el.matches(PLATE);
  const host = plate ? (el.querySelector<HTMLElement>(":scope > press-clip") || el.appendChild(document.createElement("press-clip"))) : el;
  const lx = x - r.left, ly = y - r.top;
  // A plate fills from the touch to its farthest corner; a text link answers with a small light under the finger.
  const size = plate ? 2 * Math.hypot(Math.max(lx, r.width - lx), Math.max(ly, r.height - ly)) : 76;
  const ring = document.createElement("press-ring");
  ring.style.cssText = `left:${lx.toFixed(1)}px;top:${ly.toFixed(1)}px;width:${size.toFixed(1)}px;height:${size.toFixed(1)}px`;
  host.appendChild(ring);
  const done = () => ring.remove();
  ring.addEventListener("animationend", done, { once: true });
  setTimeout(done, 1500);
  mindWave({ x, y }, plate ? 0.7 : 0.4);
  if (el.tagName === "BUTTON") sound("tap", Math.round((x / innerWidth) * 100));
}

export function startPress() {
  addEventListener("pointerdown", (e) => {
    if (still() || e.button > 0) return;
    const el = (e.target as Element | null)?.closest?.<HTMLElement>(BOTH);
    if (!el || el.matches(":disabled, [aria-disabled='true']")) return;
    answer(el, e.clientX, e.clientY);
  }, { capture: true, passive: true });
  addEventListener("keydown", (e) => {
    if (still() || e.repeat || (e.key !== "Enter" && e.key !== " ")) return;
    const el = (e.target as Element | null)?.closest?.<HTMLElement>(BOTH);
    if (!el || el !== e.target || el.matches(":disabled")) return;
    const r = el.getBoundingClientRect();
    answer(el, r.left + r.width / 2, r.top + r.height / 2);
  }, { capture: true });
  // A tick needs the press to have finished (browsers allow vibration only after a completed gesture).
  addEventListener("click", (e) => {
    if (still() || !("vibrate" in navigator) || !matchMedia("(pointer: coarse)").matches) return;
    if ((e.target as Element | null)?.closest?.(PLATE)) navigator.vibrate(8);
  }, { capture: true, passive: true });
}
