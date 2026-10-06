// Playwright: set PLAYWRIGHT_CORE to a playwright-core index.mjs (a file:// URL); see scripts/qa/README.md.
const { chromium } = await import(process.env.PLAYWRIGHT_CORE || "file:///C:/Users/Initi/semble-up-citizens/node_modules/playwright-core/index.mjs");
const base = process.argv[2] || "http://localhost:5192", route = process.argv[3] || "/learn", at = +(process.argv[4] || 1);
const variants = { asis: "", noscene: ".tb-scene{display:none!important}", nocss: "*,*::before,*::after{animation:none!important}" };
const b = await chromium.launch({ channel: "chrome", headless: true, args: ["--use-angle=d3d11", "--ignore-gpu-blocklist", "--enable-gpu"] });
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
for (const round of [1, 2]) for (const [name, css] of Object.entries(variants)) {
  const p = await ctx.newPage(); const cdp = await ctx.newCDPSession(p);
  await p.goto(base + route, { waitUntil: "load" }); await p.waitForTimeout(2000);
  if (css) await p.addStyleTag({ content: css });
  await p.evaluate((at) => scrollTo(0, (document.documentElement.scrollHeight - innerHeight) * at), at);
  await p.waitForTimeout(2500);
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: 6 });
  const rest = await p.evaluate(async () => { const f = []; let l = performance.now(), run = true; const t = (x) => { f.push(x - l); l = x; if (run) requestAnimationFrame(t); }; requestAnimationFrame(t); await new Promise((d) => setTimeout(d, 3000)); run = false; const s = f.slice(2).sort((a, b) => a - b); return `n=${s.length} p50=${s[Math.floor(s.length / 2)]?.toFixed(1)} long=${s.filter((x) => x > 50).length}`; });
  console.log(round, name.padEnd(9), rest);
  await p.close();
}
await b.close();
