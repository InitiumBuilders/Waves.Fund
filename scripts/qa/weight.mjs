// First-visit weight per page (bytes over the wire, cache empty), split by kind, at the moment the page has settled
// and before anything is scrolled into view. Usage: node weight.mjs <base>
// Playwright: set PLAYWRIGHT_CORE to a playwright-core index.mjs (a file:// URL); see scripts/qa/README.md.
const { chromium } = await import(process.env.PLAYWRIGHT_CORE || "file:///C:/Users/Initi/semble-up-citizens/node_modules/playwright-core/index.mjs");
const base = process.argv[2] || "https://www.waves.fund";
const routes = (process.argv[3] || "/,/learn,/guide,/give,/waves,/grow,/apply").split(",");
const b = await chromium.launch({ channel: "chrome", headless: true, args: ["--use-angle=d3d11", "--ignore-gpu-blocklist", "--enable-gpu"] });
console.log("route        total KB | js | css | img | media | font | other   (phone, empty cache, 6 s)");
for (const r of routes) {
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const p = await ctx.newPage(); const cdp = await ctx.newCDPSession(p);
  await cdp.send("Network.enable");
  const sizes = new Map(), types = new Map();
  cdp.on("Network.responseReceived", (e) => types.set(e.requestId, e.type));
  cdp.on("Network.loadingFinished", (e) => sizes.set(e.requestId, e.encodedDataLength));
  await p.goto(base + r, { waitUntil: "load" }); await p.waitForTimeout(6000);
  const by = { Script: 0, Stylesheet: 0, Image: 0, Media: 0, Font: 0, other: 0 };
  for (const [id, n] of sizes) { const t = types.get(id); by[t in by ? t : "other"] += n; }
  const kb = (n) => Math.round(n / 1024);
  const total = Object.values(by).reduce((a, x) => a + x, 0);
  console.log(r.padEnd(12), String(kb(total)).padStart(6), "|", kb(by.Script), "|", kb(by.Stylesheet), "|", kb(by.Image), "|", kb(by.Media), "|", kb(by.Font), "|", kb(by.other));
  await ctx.close();
}
await b.close();
