// Frame timing on the Give opening (the sea) at 6x CPU throttle on a phone viewport, dev server.
// Playwright: set PLAYWRIGHT_CORE to a playwright-core index.mjs (a file:// URL); see scripts/qa/README.md.
const { chromium } = await import(process.env.PLAYWRIGHT_CORE || "file:///C:/Users/Initi/semble-up-citizens/node_modules/playwright-core/index.mjs");
const base = process.argv[2] || "http://127.0.0.1:5197";
const b = await chromium.launch({ channel: "chrome", headless: true, args: ["--use-angle=d3d11", "--ignore-gpu-blocklist", "--enable-gpu"] });
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
const p = await ctx.newPage(); const cdp = await ctx.newCDPSession(p);
await p.goto(base + "/give", { waitUntil: "load" }); await p.waitForSelector(".gt-tank-scene canvas", { timeout: 60000 }); await p.waitForTimeout(4000);
for (const f of [0.1, 0.9]) {
  await p.evaluate((f) => { const el = document.querySelector(".gt-tank"); const run = el.offsetHeight - innerHeight; scrollTo(0, el.getBoundingClientRect().top + scrollY + run * f); }, f);
  await p.waitForTimeout(1500);
  for (const rate of [1, 6]) {
    await cdp.send("Emulation.setCPUThrottlingRate", { rate });
    const r = await p.evaluate(async () => { const fr = []; let l = performance.now(), run = true; const t = (x) => { fr.push(x - l); l = x; if (run) requestAnimationFrame(t); }; requestAnimationFrame(t); await new Promise((d) => setTimeout(d, 3000)); run = false; const s = fr.slice(2).sort((a, b) => a - b); return `n=${s.length} p50=${s[Math.floor(s.length / 2)].toFixed(1)} p90=${s[Math.floor(s.length * 0.9)].toFixed(1)} long=${s.filter((x) => x > 50).length}`; });
    console.log(`chapter ${f} at ${rate}x:`, r);
  }
}
await b.close();
