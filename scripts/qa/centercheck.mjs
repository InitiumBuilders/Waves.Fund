// After capping paragraph width: find centred paragraphs that are no longer centred in their parent.
// Playwright: set PLAYWRIGHT_CORE to a playwright-core index.mjs (a file:// URL); see scripts/qa/README.md.
const { chromium } = await import(process.env.PLAYWRIGHT_CORE || "file:///C:/Users/Initi/semble-up-citizens/node_modules/playwright-core/index.mjs");
const base = process.argv[2] || "http://127.0.0.1:5197";
const routes = ["/", "/manifest", "/learn", "/guide", "/guide/library", "/guide/library/listen", "/guide/teachback", "/give", "/grow", "/waves", "/apply", "/guide/apply", "/guide/team", "/guide/partners", "/guide/partners/green-reef", "/guide/partners/green-reef/proposal", "/guide/partners/semble", "/guide/partners/ocean97", "/now-lets-begin", "/privacy", "/trax", "/nope"];
const b = await chromium.launch({ channel: "chrome", headless: true });
for (const vp of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
  const ctx = await b.newContext({ viewport: vp, isMobile: vp.width < 500 });
  let bad = 0;
  for (const r of routes) {
    const p = await ctx.newPage();
    await p.goto(base + r, { waitUntil: "load" }); await p.waitForTimeout(2500);
    const off = await p.evaluate(() => [...document.querySelectorAll("main p, main li")].filter((e) => {
      if (!e.offsetParent || getComputedStyle(e).textAlign !== "center") return false;
      const r = e.getBoundingClientRect(), pr = e.parentElement.getBoundingClientRect(), ps = getComputedStyle(e.parentElement);
      const inner = { l: pr.left + parseFloat(ps.paddingLeft), r: pr.right - parseFloat(ps.paddingRight) };
      return Math.abs((r.left - inner.l) - (inner.r - r.right)) > 12;
    }).map((e) => `${e.parentElement.className.toString().slice(0, 40)} > ${e.tagName.toLowerCase()}.${e.className.toString().slice(0, 30)} "${e.textContent.trim().slice(0, 40)}"`));
    if (off.length) { bad += off.length; console.log(vp.width, r, off.slice(0, 4).join(" || ")); }
    await p.close();
  }
  console.log(vp.width, "off-centre paragraphs:", bad);
  await ctx.close();
}
await b.close();
