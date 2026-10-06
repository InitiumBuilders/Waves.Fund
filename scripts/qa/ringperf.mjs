// Playwright: set PLAYWRIGHT_CORE to a playwright-core index.mjs (a file:// URL); see scripts/qa/README.md.
const { chromium } = await import(process.env.PLAYWRIGHT_CORE || "file:///C:/Users/Initi/semble-up-citizens/node_modules/playwright-core/index.mjs");
const base = process.argv[2] || "http://127.0.0.1:5197";
const b = await chromium.launch({ channel: "chrome", headless: true, args: ["--use-angle=d3d11", "--ignore-gpu-blocklist", "--enable-gpu"] });
const measure = async (p) => p.evaluate(async () => {
  const f = []; let l = performance.now(), run = true;
  const t = (x) => { f.push(x - l); l = x; if (run) requestAnimationFrame(t); }; requestAnimationFrame(t);
  for (let i = 0; i < 30; i++) { scrollBy(0, 12); await new Promise((d) => setTimeout(d, 60)); }
  for (let i = 0; i < 30; i++) { scrollBy(0, -12); await new Promise((d) => setTimeout(d, 60)); }
  run = false; const s = f.slice(2).sort((a, b) => a - b);
  return `p50=${s[Math.floor(s.length / 2)].toFixed(1)} p90=${s[Math.floor(s.length * 0.9)].toFixed(1)} long=${s.filter((x) => x > 50).length}`;
});
for (const round of [1, 2]) {
  for (const withTour of [false, true]) {
    const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    await ctx.addInitScript(() => { try { localStorage.setItem("waves-tour-offered", "1"); } catch {} });
    const p = await ctx.newPage();
    await p.goto(base + (withTour ? "/give?tour=give" : "/give"), { waitUntil: "load" });
    if (withTour) { await p.waitForSelector(".tour-next:not([disabled])", { timeout: 30000 }); await p.waitForTimeout(800); await p.click(".tour-next"); await p.waitForFunction(() => document.querySelector(".tour-ring[data-on]"), null, { timeout: 30000 }); }
    else { await p.waitForTimeout(3000); await p.evaluate(() => { const s = document.querySelector(".gt-flow-section"); scrollTo(0, s.getBoundingClientRect().top + scrollY - 76); }); }
    await p.waitForTimeout(2000);
    const cdp = await ctx.newCDPSession(p); await cdp.send("Emulation.setCPUThrottlingRate", { rate: 6 });
    console.log(round, withTour ? "with the ring " : "without tour  ", Math.round(await p.evaluate(() => scrollY)), await measure(p));
    await ctx.close();
  }
}
await b.close();
