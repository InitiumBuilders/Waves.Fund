// A day in Wave One's TrustBase opening into its moves and closing again, frame by frame, for judging the motion: a
// burst of frames on the day with the most moves at Safari's first screen on a phone (393x659), then the frame timing
// of the same open and close at 1x and at 6x CPU throttle. GET requests only. Added 2026-11-25.
//   node scripts/qa/dayframes.mjs <base> <out folder>    -> <out>/dz-*.jpg, frames.json, a summary
//   python scripts/qa/zoomsheet.py <out folder>          -> a contact sheet, each frame labelled with its time
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const [base, out] = process.argv.slice(2);
if (!base || !out) { console.error("usage: node scripts/qa/dayframes.mjs <base> <out folder>"); process.exit(2); }
mkdirSync(out, { recursive: true });
const pw = await import(process.env.PLAYWRIGHT_CORE || "file:///C:/Users/Initi/semble-up-citizens/node_modules/playwright-core/index.mjs");
const b = await pw.chromium.launch({ channel: "chrome", headless: true, args: ["--use-angle=d3d11", "--ignore-gpu-blocklist", "--enable-gpu"] });
const report = { base, frames: {}, timing: {} };

async function open() {
  const ctx = await b.newContext({ viewport: { width: 393, height: 659 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  await ctx.route("**/*", (r) => (r.request().method() === "GET" ? r.continue() : r.abort()));
  await ctx.addInitScript(() => { try { localStorage.setItem("waves-tour-offered", "1"); } catch { /* storage may be off */ } });
  const p = await ctx.newPage();
  await p.goto(base + "/waves/waves-fund", { waitUntil: "load", timeout: 90000 });
  await p.waitForSelector(".tb-day details", { timeout: 30000 });
  await p.waitForTimeout(2000);
  // The day with the most moves, a little below the top of the screen.
  await p.evaluate(() => {
    const days = [...document.querySelectorAll(".tb-day")].filter((d) => d.querySelector("details"));
    window.__day = days.sort((a, c) => c.querySelectorAll(".tb-moves > li").length - a.querySelectorAll(".tb-moves > li").length)[0];
    window.__day.scrollIntoView({ block: "start", behavior: "instant" });
    scrollBy(0, -110);
  });
  await p.waitForTimeout(600);
  return { ctx, p };
}
const settled = (p, open) => p.waitForFunction((open) => {
  const det = window.__day.querySelector("details");
  return det.open === open && !window.__day.querySelector(".tb-ground").getAnimations().length;
}, open, { timeout: 5000 }).then(() => true, () => false);

// Frames: screenshots as fast as the browser gives them for 700 ms from the tap.
async function burst(p, name) {
  const frames = [], t0 = Date.now();
  await p.evaluate(() => window.__day.querySelector("summary").click());
  while (Date.now() - t0 < 700) {
    const t = Date.now() - t0, f = `${name}-${String(frames.length).padStart(2, "0")}.jpg`;
    await p.screenshot({ path: join(out, f), type: "jpeg", quality: 82, scale: "css" });
    frames.push({ f, t });
  }
  return frames;
}
{
  const { ctx, p } = await open();
  await p.screenshot({ path: join(out, "dz-before.jpg"), type: "jpeg", quality: 86 });
  report.frames.open = await burst(p, "dz-open");
  report.frames.opened = await settled(p, true);
  await p.screenshot({ path: join(out, "dz-opened.jpg"), type: "jpeg", quality: 86 });
  report.frames.close = await burst(p, "dz-close");
  report.frames.closed = await settled(p, false);
  await p.screenshot({ path: join(out, "dz-closed.jpg"), type: "jpeg", quality: 86 });
  console.log(`frames: open ${report.frames.open.length} (settled open: ${report.frames.opened}), close ${report.frames.close.length} (settled closed: ${report.frames.closed})`);
  await ctx.close();
}

// Timing: every requestAnimationFrame for 900 ms from the tap. Gaps over 34 ms are two or more missed frames at 60 per
// second.
const stats = (ts) => {
  const d = ts.slice(1).map((t, i) => t - ts[i]).sort((x, y) => x - y);
  if (!d.length) return null;
  const q = (x) => d[Math.min(d.length - 1, Math.floor(x * d.length))];
  return { frames: ts.length, median: +q(0.5).toFixed(1), p95: +q(0.95).toFixed(1), max: +d.at(-1).toFixed(1), over34: d.filter((x) => x > 34).length };
};
for (const rate of [1, 6]) {
  const { ctx, p } = await open();
  const cdp = await ctx.newCDPSession(p);
  if (rate > 1) await cdp.send("Emulation.setCPUThrottlingRate", { rate });
  await p.waitForTimeout(800);
  const timed = () => p.evaluate(() => new Promise((done) => {
    const ts = [], t0 = performance.now();
    window.__day.querySelector("summary").click();
    const loop = (t) => { ts.push(t - t0); if (t - t0 < 900) requestAnimationFrame(loop); else done(ts); };
    requestAnimationFrame(loop);
  }));
  const opening = await timed();
  await settled(p, true);
  const closing = await timed();
  await settled(p, false);
  report.timing[`${rate}x`] = { open: stats(opening), close: stats(closing) };
  console.log(`timing ${rate}x: open ${JSON.stringify(report.timing[`${rate}x`].open)}; close ${JSON.stringify(report.timing[`${rate}x`].close)}`);
  await ctx.close();
}
writeFileSync(join(out, "frames.json"), JSON.stringify(report, null, 1));
await b.close();
