// The zoom between the Waves sea and a Wave, frame by frame, for judging the motion: the dive into Wave One's light on
// /waves and the rise back out, at Safari's first screen on a phone (393x659) and on a desktop (1440x900), then the
// frame timing of the same two moves on the phone at 1x and at 6x CPU throttle. GET requests only. Added 2026-11-25.
//   node scripts/qa/zoomframes.mjs <base> <out folder>   -> <out>/<view>-<move>-NN.jpg, frames.json, a summary
//   python scripts/qa/zoomsheet.py <out folder>          -> contact sheets, each frame labelled with its time
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const [base, out] = process.argv.slice(2);
if (!base || !out) { console.error("usage: node scripts/qa/zoomframes.mjs <base> <out folder>"); process.exit(2); }
mkdirSync(out, { recursive: true });
const pw = await import(process.env.PLAYWRIGHT_CORE || "file:///C:/Users/Initi/semble-up-citizens/node_modules/playwright-core/index.mjs");
const b = await pw.chromium.launch({ channel: "chrome", headless: true, args: ["--use-angle=d3d11", "--ignore-gpu-blocklist", "--enable-gpu"] });
const VIEWS = {
  phone: { viewport: { width: 393, height: 659 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
  desktop: { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 },
};
const report = { base, views: {}, timing: {} };

async function open(view) {
  const ctx = await b.newContext({ ...VIEWS[view], reducedMotion: "no-preference" });
  await ctx.route("**/*", (r) => (r.request().method() === "GET" ? r.continue() : r.abort()));
  await ctx.addInitScript(() => {
    try { localStorage.setItem("waves-tour-offered", "1"); } catch { /* storage may be off */ }
    window.__dived = false;
    new MutationObserver(() => { if (document.querySelector(".sea-diving")) window.__dived = true; })
      .observe(document, { subtree: true, attributes: true, attributeFilter: ["class"] });
  });
  const p = await ctx.newPage();
  const errors = [];
  p.on("pageerror", (e) => errors.push(String(e).slice(0, 160)));
  p.on("console", (m) => { if (m.type() === "error" && !/Failed to load resource|clerk/i.test(m.text())) errors.push(m.text().slice(0, 160)); });
  await p.goto(base + "/waves", { waitUntil: "load", timeout: 90000 });
  await p.waitForSelector("main h1", { timeout: 30000 });
  await p.waitForFunction(() => document.querySelector(".sea-hero-scene")?.dataset.lights, null, { timeout: 30000 });
  await p.waitForTimeout(5000); // past the sea's opening, so the dive starts from the map at rest
  return { ctx, p, errors };
}

// Where light i stands on the screen, as the sea itself reports it (the same point scripts/qa/moves.mjs taps).
const lightAt = (p, i) => p.evaluate((i) => {
  const s = document.querySelector(".sea-hero-scene"), r = s?.getBoundingClientRect();
  const at = (s?.dataset.lights || "").split(" ")[i];
  if (!r || !at || at === "-") return null;
  const [x, y] = at.split(",").map(Number);
  return { x: r.left + x, y: r.top + y };
}, i);

// Screenshots as fast as the browser gives them for `ms` after the move starts, each with its time from the start.
async function burst(p, name, t0, ms) {
  const frames = [];
  while (Date.now() - t0 < ms) {
    const t = Date.now() - t0, f = `${name}-${String(frames.length).padStart(2, "0")}.jpg`;
    await p.screenshot({ path: join(out, f), type: "jpeg", quality: 80, scale: "css" });
    frames.push({ f, t });
  }
  return frames;
}

for (const view of Object.keys(VIEWS)) {
  const { ctx, p, errors } = await open(view);
  const r = { lights: await p.evaluate(() => document.querySelector(".sea-hero-scene")?.dataset.lights) };
  await p.screenshot({ path: join(out, `${view}-before.jpg`), type: "jpeg", quality: 86 });
  const pt = await lightAt(p, 0);
  if (!pt) { r.fail = "the sea never said where its lights stand"; report.views[view] = r; console.log(`${view}: ${r.fail}`); await ctx.close(); continue; }
  r.tap = pt;
  let t0 = Date.now();
  if (view === "phone") await p.touchscreen.tap(pt.x, pt.y); else await p.mouse.click(pt.x, pt.y);
  r.dive = await burst(p, `${view}-dive`, t0, 3200);
  await p.waitForTimeout(800);
  r.divePath = await p.evaluate(() => location.pathname);
  r.dived = await p.evaluate(() => window.__dived);
  await p.screenshot({ path: join(out, `${view}-arrived.jpg`), type: "jpeg", quality: 86 });
  t0 = Date.now();
  await p.evaluate(() => history.back());
  r.back = await burst(p, `${view}-back`, t0, 2800);
  await p.waitForTimeout(800);
  r.backPath = await p.evaluate(() => location.pathname);
  await p.screenshot({ path: join(out, `${view}-rest.jpg`), type: "jpeg", quality: 86 });
  r.errors = errors;
  report.views[view] = r;
  console.log(`${view}: tap ${Math.round(pt.x)},${Math.round(pt.y)}; dive ${r.dive.length} frames, now ${r.divePath} (words stepped aside: ${r.dived}); back ${r.back.length} frames, now ${r.backPath}; errors: ${errors.length ? errors.join(" | ") : "none"}`);
  await ctx.close();
}

// Frame timing on the phone: every requestAnimationFrame from the tap, at 1x and at 6x CPU. Gaps over 34 ms are two
// or more missed frames at 60 per second.
const stats = (ts) => {
  const d = ts.slice(1).map((t, i) => t - ts[i]).sort((x, y) => x - y);
  if (!d.length) return null;
  const q = (x) => d[Math.min(d.length - 1, Math.floor(x * d.length))];
  return { frames: ts.length, median: +q(0.5).toFixed(1), p95: +q(0.95).toFixed(1), max: +d.at(-1).toFixed(1), over34: d.filter((x) => x > 34).length, over50: d.filter((x) => x > 50).length };
};
for (const rate of [1, 6]) {
  const { ctx, p, errors } = await open("phone");
  const cdp = await ctx.newCDPSession(p);
  if (rate > 1) await cdp.send("Emulation.setCPUThrottlingRate", { rate });
  await p.waitForTimeout(1500);
  const record = () => p.evaluate(() => {
    window.__f = [];
    const t0 = performance.now();
    const loop = (t) => { window.__f.push(t - t0); if (t - t0 < 3200) requestAnimationFrame(loop); };
    requestAnimationFrame(loop);
  });
  const pt = await lightAt(p, 0);
  if (!pt) { report.timing[`${rate}x`] = { fail: "no lights" }; console.log(`timing ${rate}x: no lights`); await ctx.close(); continue; }
  await record();
  await p.touchscreen.tap(pt.x, pt.y);
  await p.waitForTimeout(rate > 1 ? 5400 : 3600);
  const dive = await p.evaluate(() => window.__f);
  const path = await p.evaluate(() => location.pathname);
  await record();
  await p.evaluate(() => history.back());
  await p.waitForTimeout(rate > 1 ? 5400 : 3600);
  const back = await p.evaluate(() => window.__f);
  const t = { path, flight: stats(dive.filter((x) => x <= 760)), arrival: stats(dive.filter((x) => x > 760)), back: stats(back), errors };
  report.timing[`${rate}x`] = t;
  console.log(`timing ${rate}x (dive to ${path}): flight ${JSON.stringify(t.flight)}; arrival ${JSON.stringify(t.arrival)}; back ${JSON.stringify(t.back)}; errors: ${errors.length}`);
  await ctx.close();
}
writeFileSync(join(out, "frames.json"), JSON.stringify(report, null, 1));
await b.close();
