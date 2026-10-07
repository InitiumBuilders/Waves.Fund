// Pages that grow sideways on a phone: scroll each route at 390 wide and report the widest the page became and the
// element at its right edge. A moving layer that leaves its box widens the whole layout on a phone.
// Usage: node overflow.mjs <base> [routes]
const { chromium } = await import(process.env.PLAYWRIGHT_CORE || "file:///C:/Users/Initi/semble-up-citizens/node_modules/playwright-core/index.mjs");
const base = process.argv[2] || "http://127.0.0.1:5192";
const routes = (process.argv[3] || "/,/manifest,/now-lets-begin,/learn,/guide,/guide/library,/guide/library/listen,/guide/apply,/guide/team,/guide/partners,/guide/partners/green-reef,/guide/partners/green-reef/proposal,/guide/partners/semble,/guide/partners/ocean97,/give,/give/guide,/guide/teachback,/grow,/apply,/waves,/privacy,/nope").split(",");
const b = await chromium.launch({ channel: "chrome", headless: true, args: ["--use-angle=d3d11", "--ignore-gpu-blocklist", "--enable-gpu"] });
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
await ctx.addInitScript(() => { try { localStorage.setItem("waves-tour-offered", "1"); } catch {} });
let bad = 0;
for (const r of routes) {
  const p = await ctx.newPage();
  await p.goto(base + r, { waitUntil: "load", timeout: 60000 }); await p.waitForTimeout(3000);
  let worst = { sw: 390 };
  for (let i = 0; i < 40; i++) {
    const s = await p.evaluate(() => {
      const sw = Math.max(document.documentElement.scrollWidth, innerWidth); let el = null, right = 0;
      if (sw > 391) for (const e of document.querySelectorAll("body *")) { const rc = e.getBoundingClientRect(); if (rc.width && rc.right > right) { right = rc.right; el = e; } }
      const end = innerHeight + scrollY >= document.documentElement.scrollHeight - 4; scrollBy(0, innerHeight * 0.7);
      return { sw, end, el: el ? `${el.tagName.toLowerCase()}.${[...el.classList].join(".")} in ${el.parentElement?.className || ""}` : "" };
    });
    if (s.sw > worst.sw) worst = s;
    await p.waitForTimeout(180);
    if (s.end) break;
  }
  if (worst.sw > 391) { bad++; console.log(r, "grows to", worst.sw, "px:", worst.el); }
  await p.close();
}
console.log("routes wider than the phone:", bad);
await b.close();
