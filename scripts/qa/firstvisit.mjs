// A first visit: how long is the page held still, and when does it first paint? Each run uses a brand-new browser
// profile, so nothing is kept from an earlier visit (no compiled shaders, no cache). The browser is opened on a blank
// page and left a few seconds first, as a person's browser already is; without that the number is mostly Chrome
// itself starting. --cold skips the wait.
//   node scripts/qa/firstvisit.mjs <base> [route] [runs] [phone|wide] [--cold]
// Read: the worst long task and the longest gap between frames. On 2026-11-20 the live build showed 4.2 to 6.3 s
// (the field's shaders compiling on the main thread); the build after it, 0.23 to 0.38 s.
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
const { chromium } = await import(process.env.PLAYWRIGHT_CORE || "file:///C:/Users/Initi/semble-up-citizens/node_modules/playwright-core/index.mjs");
const args = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const base = args[0], route = args[1] || "/", runs = Number(args[2] || 3), size = args[3] || "phone", cold = process.argv.includes("--cold");
if (!base) { console.error("usage: node scripts/qa/firstvisit.mjs <base> [route] [runs] [phone|wide] [--cold]"); process.exit(2); }
const vp = size === "wide" ? { width: 1440, height: 900 } : { width: 390, height: 844 };
let worstOfAll = 0;
for (let run = 0; run < runs; run++) {
  const dir = mkdtempSync(join(tmpdir(), "first-visit-"));
  const ctx = await chromium.launchPersistentContext(dir, { channel: "chrome", headless: true, viewport: vp, isMobile: size !== "wide", hasTouch: size !== "wide", args: ["--use-angle=d3d11", "--ignore-gpu-blocklist", "--enable-gpu"] });
  await ctx.route("**/*", (r) => (r.request().method() === "GET" ? r.continue() : r.abort()));
  await ctx.addInitScript(() => {
    window.__long = [];
    new PerformanceObserver((list) => { for (const e of list.getEntries()) window.__long.push([Math.round(e.startTime), Math.round(e.duration)]); }).observe({ type: "longtask", buffered: true });
    let last = performance.now(); window.__gap = [0, 0];
    const tick = (t) => { if (t - last > window.__gap[1]) window.__gap = [Math.round(last), Math.round(t - last)]; last = t; requestAnimationFrame(tick); };
    requestAnimationFrame(tick);
  });
  const p = ctx.pages()[0] || await ctx.newPage();
  if (!cold) { await p.goto("about:blank"); await p.waitForTimeout(6000); }
  await p.goto(base + route, { waitUntil: "load", timeout: 90000 });
  await p.waitForTimeout(12000);
  const out = await p.evaluate(() => ({ long: window.__long, gap: window.__gap, fcp: Math.round(performance.getEntriesByName("first-contentful-paint")[0]?.startTime || 0) }));
  const total = out.long.reduce((a, [, d]) => a + d, 0), worst = out.long.reduce((a, x) => (x[1] > a[1] ? x : a), [0, 0]);
  worstOfAll = Math.max(worstOfAll, worst[1]);
  console.log(`run ${run} ${size} ${route}: first paint ${out.fcp} ms, long tasks ${out.long.length} totalling ${total} ms, worst ${worst[1]} ms at ${worst[0]} ms, longest frame gap ${out.gap[1]} ms at ${out.gap[0]} ms`);
  await ctx.close();
  try { rmSync(dir, { recursive: true, force: true }); } catch { /* the profile folder may still be held for a moment */ }
}
console.log(`worst long task over ${runs} runs: ${worstOfAll} ms`);
