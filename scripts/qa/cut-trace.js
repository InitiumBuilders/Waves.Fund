// Times the page change of the dive from the Waves sea into Wave One, in any Chrome: open /waves, paste this into the
// console (or run it through a browser tool), and read the result. It taps light 0 where the sea reports it
// (data-lights), records every long animation frame with its scripts, and gives the frame gaps over 60 ms.
// On 2026-11-25 (build l65uaz3q6) the frame at the page change lasted 411 ms: about 115 ms of script, and the render
// began only 386 ms in. The rest was React holding the lazy page's reveal (its 300 ms Suspense throttle) while the
// view transition waited for the new page. See docs/NEXT-MOVES.md, "Paused 2026-11-25".
(async () => {
  const q = () => document.querySelector(".sea-hero-scene");
  for (let i = 0; i < 60 && !(q() && q().dataset.lights); i++) await new Promise((r) => setTimeout(r, 200));
  const s = q();
  if (!s || !s.dataset.lights) return { fail: "the sea never said where its lights stand" };
  await new Promise((r) => setTimeout(r, 1500));
  const box = s.getBoundingClientRect();
  const [x, y] = s.dataset.lights.split(" ")[0].split(",").map(Number);
  const pt = { x: Math.round(box.left + x), y: Math.round(box.top + y) };
  const loaf = [], frames = [];
  new PerformanceObserver((l) => { for (const e of l.getEntries()) loaf.push(e); }).observe({ type: "long-animation-frame" });
  let last = performance.now(), on = true;
  const tick = (t) => { frames.push(t - last); last = t; if (on) requestAnimationFrame(tick); };
  requestAnimationFrame(tick);
  const t0 = performance.now();
  s.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, clientX: pt.x, clientY: pt.y, pointerType: "mouse", isPrimary: true, button: 0 }));
  await new Promise((r) => setTimeout(r, 5000));
  on = false;
  const top = loaf.filter((e) => e.startTime >= t0 - 5).sort((a, b) => b.duration - a.duration).slice(0, 4).map((e) => ({
    at: Math.round(e.startTime - t0), ms: Math.round(e.duration), renderBeganAt: e.renderStart ? Math.round(e.renderStart - e.startTime) : null,
    scripts: (e.scripts || []).map((sc) => ({ fn: sc.sourceFunctionName, src: (sc.sourceURL || "").split("/").pop(), at: sc.sourceCharPosition, ms: Math.round(sc.duration), forcedLayoutMs: Math.round(sc.forcedStyleAndLayoutDuration || 0), by: String(sc.invoker).slice(0, 50) })),
  }));
  return { path: location.pathname, gapsOver60ms: frames.map(Math.round).filter((d) => d > 60), longFrames: top };
})();
