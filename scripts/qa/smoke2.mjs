// Playwright: set PLAYWRIGHT_CORE to a playwright-core index.mjs (a file:// URL); see scripts/qa/README.md.
const { chromium } = await import(process.env.PLAYWRIGHT_CORE || "file:///C:/Users/Initi/semble-up-citizens/node_modules/playwright-core/index.mjs");
const base = process.argv[2];
const routes = ["/", "/manifest", "/now-lets-begin", "/learn", "/guide", "/guide/library", "/guide/library/discovery", "/guide/apply", "/guide/team", "/guide/partners", "/guide/partners/green-reef", "/guide/partners/green-reef/proposal", "/guide/partners/semble", "/guide/partners/ocean97", "/give", "/give/guide", "/guide/teachback", "/grow", "/apply", "/projects", "/waves", "/privacy", "/trax", "/nope"];
const b = await chromium.launch({ channel: "chrome", headless: true, args: ["--use-angle=d3d11", "--ignore-gpu-blocklist", "--enable-gpu"] });
for (const vp of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
  const ctx = await b.newContext({ viewport: vp, isMobile: vp.width < 500, hasTouch: vp.width < 500 });
  let bad = 0;
  for (let i = 0; i < routes.length; i += 6) {
    await Promise.all(routes.slice(i, i + 6).map(async (r) => {
      const p = await ctx.newPage(); const errs = [];
      p.on("console", (m) => { if (m.type() === "error" && !/clerk|ERR_SSL|Failed to load resource/i.test(m.text())) errs.push(m.text().slice(0, 150)); });
      p.on("pageerror", (e) => errs.push("PAGEERROR " + String(e).slice(0, 150)));
      await p.goto(base + r, { waitUntil: "load", timeout: 60000 }).catch((e) => errs.push("GOTO " + e.message.slice(0, 80)));
      await p.waitForTimeout(3500);
      await p.evaluate(() => scrollTo(0, document.documentElement.scrollHeight * 0.6)); await p.waitForTimeout(800);
      if (errs.length) { bad++; console.log(vp.width, r, errs.join(" | ")); }
      await p.close();
    }));
  }
  console.log(vp.width, "routes with errors:", bad);
  await ctx.close();
}
await b.close();
