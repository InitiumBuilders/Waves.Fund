// Tour: every route at desktop and phone, captured in scroll steps, for contact sheets.
// Usage: node tour.mjs <base> <outdir> [routes-comma-separated]
// Playwright: set PLAYWRIGHT_CORE to a playwright-core index.mjs (a file:// URL); see scripts/qa/README.md.
const { chromium } = await import(process.env.PLAYWRIGHT_CORE || "file:///C:/Users/Initi/semble-up-citizens/node_modules/playwright-core/index.mjs");
import { mkdir } from "node:fs/promises";
const [base, dir = "tour", only] = process.argv.slice(2);
const ROUTES = (only ? only.split(",") : ["/", "/now-lets-begin", "/learn", "/guide", "/guide/library", "/guide/library/discovery", "/guide/apply", "/guide/team", "/guide/partners", "/guide/partners/green-reef", "/guide/partners/green-reef/proposal", "/guide/partners/semble", "/guide/partners/ocean97", "/give", "/give/guide", "/guide/teachback", "/grow", "/apply", "/projects", "/privacy", "/trax", "/nope"]);
await mkdir(dir, { recursive: true });
const b = await chromium.launch({ channel: "chrome", headless: true, args: ["--use-angle=d3d11", "--ignore-gpu-blocklist", "--enable-gpu"] });
const sizes = [{ tag: "d", w: 1440, h: 900, max: +(process.env.TOUR_MAX || 9), mobile: false }, { tag: "m", w: 390, h: 844, max: +(process.env.TOUR_MAX || 12), mobile: true }];
for (const s of sizes) {
  const ctx = await b.newContext({ viewport: { width: s.w, height: s.h }, deviceScaleFactor: 1, isMobile: s.mobile, hasTouch: s.mobile });
  for (const r of ROUTES) {
    const p = await ctx.newPage();
    const errs = [];
    p.on("pageerror", (e) => errs.push(String(e).slice(0, 140)));
    await p.goto(base + r, { waitUntil: "load", timeout: 60000 }).catch(() => {});
    await p.waitForTimeout(+(process.env.TOUR_WAIT || 3200));
    const H = await p.evaluate(() => document.documentElement.scrollHeight);
    const step = Math.round(s.h * 0.9);
    const n = Math.min(s.max, Math.ceil((H - s.h) / step) + 1);
    const name = (r === "/" ? "home" : r.slice(1).replace(/\//g, "_"));
    for (let i = 0; i < n; i++) {
      await p.evaluate((y) => scrollTo(0, y), i * step);
      await p.waitForTimeout(i ? 900 : 200);
      await p.screenshot({ path: `${dir}/${s.tag}_${name}_${String(i).padStart(2, "0")}.jpg`, type: "jpeg", quality: 70 });
    }
    console.log(s.tag, r, "frames", n, "height", H, errs.length ? "ERR " + errs.join(" | ") : "");
    await p.close();
  }
  await ctx.close();
}
await b.close();
