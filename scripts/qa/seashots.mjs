// The Give sea through its three chapters, desktop and phone, from the dev server. Usage: node seashots.mjs <base> <tag>
// Playwright: set PLAYWRIGHT_CORE to a playwright-core index.mjs (a file:// URL); see scripts/qa/README.md.
const { chromium } = await import(process.env.PLAYWRIGHT_CORE || "file:///C:/Users/Initi/semble-up-citizens/node_modules/playwright-core/index.mjs");
const [base = "http://127.0.0.1:5197", tag = "sea"] = process.argv.slice(2);
const b = await chromium.launch({ channel: "chrome", headless: true, args: ["--use-angle=d3d11", "--ignore-gpu-blocklist", "--enable-gpu"] });
for (const [vp, t] of [[{ width: 1440, height: 900 }, "d"], [{ width: 390, height: 844 }, "m"]]) {
  const ctx = await b.newContext({ viewport: vp, isMobile: vp.width < 500, hasTouch: vp.width < 500, deviceScaleFactor: 1 });
  const p = await ctx.newPage(); const errs = [];
  p.on("console", (m) => { if (m.type() === "error") errs.push(m.text().slice(0, 200)); });
  p.on("pageerror", (e) => errs.push(String(e).slice(0, 200)));
  await p.goto(base + "/give", { waitUntil: "load" });
  await p.waitForSelector(".gt-tank-scene canvas", { timeout: 60000 }); await p.waitForTimeout(3500);
  for (const f of [0.08, 0.45, 0.92]) {
    await p.evaluate((f) => { const el = document.querySelector(".gt-tank"); const run = el.offsetHeight - innerHeight; scrollTo(0, el.getBoundingClientRect().top + scrollY + run * f); }, f);
    await p.waitForTimeout(1800);
    await p.screenshot({ path: `vt/${tag}_${t}_${f}.jpg`, type: "jpeg", quality: 80 });
  }
  console.log(t, JSON.stringify(await p.evaluate(() => { const r = document.querySelector(".gt-tank-scene").getBoundingClientRect(); return [Math.round(r.top), Math.round(r.height), innerHeight]; })), errs.length ? "ERR " + errs.join(" | ") : "no errors");
  await p.close(); await ctx.close();
}
await b.close();
