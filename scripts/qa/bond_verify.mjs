// The closing bond at the bottom of pages: on dev, read the engine (anchor and network count) and screenshot.
// Playwright: set PLAYWRIGHT_CORE to a playwright-core index.mjs (a file:// URL); see scripts/qa/README.md.
const { chromium } = await import(process.env.PLAYWRIGHT_CORE || "file:///C:/Users/Initi/semble-up-citizens/node_modules/playwright-core/index.mjs");
const base = process.argv[2] || "http://127.0.0.1:5197";
const dev = base.includes("127.0.0.1");
const b = await chromium.launch({ channel: "chrome", headless: true, args: ["--use-angle=d3d11", "--ignore-gpu-blocklist", "--enable-gpu"] });
for (const vp of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
  const ctx = await b.newContext({ viewport: vp, isMobile: vp.width < 500, hasTouch: vp.width < 500 });
  for (const r of ["/learn", "/give", "/guide/teachback", "/grow"]) {
    const p = await ctx.newPage();
    await p.goto(base + r, { waitUntil: "load" });
    await p.waitForSelector(".app-footer", { timeout: 30000 }); await p.waitForTimeout(dev ? 4000 : 3000);
    // Reach the true bottom: scroll, let the page settle, scroll again.
    await p.evaluate(() => scrollTo(0, document.documentElement.scrollHeight)); await p.waitForTimeout(800);
    await p.evaluate(() => scrollTo(0, document.documentElement.scrollHeight)); await p.waitForTimeout(4500);
    const info = dev ? await p.evaluate(() => { const e = window.__engine(); return { anchor: e.b?.name ?? null, nets: e.networks, calm: +e.calm.toFixed(2) }; }) : {};
    console.log(vp.width, r, JSON.stringify(info));
    await p.screenshot({ path: `vt/bond_${dev ? "dev" : "stage"}_${vp.width}_${r.slice(1).replace(/\//g, "_")}.jpg`, type: "jpeg", quality: 72 });
    await p.close();
  }
  await ctx.close();
}
await b.close();
