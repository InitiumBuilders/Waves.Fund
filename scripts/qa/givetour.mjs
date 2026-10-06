// Walk the Give app as a stand-in person (dev server only), every screen in scroll steps, both sizes.
// Usage: node givetour.mjs <base> <outdir> <who> <route,route,...>
// Playwright: set PLAYWRIGHT_CORE to a playwright-core index.mjs (a file:// URL); see scripts/qa/README.md.
const { chromium } = await import(process.env.PLAYWRIGHT_CORE || "file:///C:/Users/Initi/semble-up-citizens/node_modules/playwright-core/index.mjs");
import { mkdir } from "node:fs/promises";
const [base = "http://127.0.0.1:5197", dir = "givetour", who = "dev_maya", only] = process.argv.slice(2);
const ROUTES = only.split(",");
await mkdir(dir, { recursive: true });
const b = await chromium.launch({ channel: "chrome", headless: true, args: ["--use-angle=d3d11", "--ignore-gpu-blocklist", "--enable-gpu"] });
for (const s of [{ tag: "d", w: 1440, h: 900, max: 6, mobile: false }, { tag: "m", w: 390, h: 844, max: 8, mobile: true }]) {
  const ctx = await b.newContext({ viewport: { width: s.w, height: s.h }, deviceScaleFactor: 1, isMobile: s.mobile, hasTouch: s.mobile });
  const p = await ctx.newPage(); const errs = [];
  p.on("pageerror", (e) => errs.push(String(e).slice(0, 160)));
  p.on("console", (m) => { if (m.type() === "error" && !/clerk/i.test(m.text())) errs.push(m.text().slice(0, 160)); });
  await p.goto(`${base}/give/guide?as=${who}`, { waitUntil: "load" }); await p.waitForFunction(() => sessionStorage.getItem("give-dev-actor") && document.querySelector("main h1"), null, { timeout: 120000 }); await p.waitForTimeout(1500);
  for (const r of ROUTES) {
    errs.length = 0;
    await p.goto(base + r, { waitUntil: "load" }).catch(() => {});
    await p.waitForTimeout(+(process.env.TOUR_WAIT || 5000));
    const H = await p.evaluate(() => document.documentElement.scrollHeight);
    const step = Math.round(s.h * 0.9), n = Math.min(s.max, Math.ceil((H - s.h) / step) + 1);
    const name = r.slice(1).replace(/[\/?=&]/g, "_");
    for (let i = 0; i < n; i++) {
      await p.evaluate((y) => scrollTo(0, y), i * step); await p.waitForTimeout(i ? 900 : 200);
      await p.screenshot({ path: `${dir}/${s.tag}_${name}_${String(i).padStart(2, "0")}.jpg`, type: "jpeg", quality: 72 });
    }
    console.log(s.tag, r, "frames", n, "height", H, errs.length ? "ERR " + errs.join(" | ") : "");
  }
  await ctx.close();
}
await b.close();
