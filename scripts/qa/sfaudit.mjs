// Every heading on every route at two sizes: scroll through so each one surfaces, then compare the copy's lines with
// the real words' lines, and list headings that fell back to plain.
// Usage: node sfaudit.mjs <base>. Playwright: set PLAYWRIGHT_CORE (see README).
const { chromium } = await import(process.env.PLAYWRIGHT_CORE || "file:///C:/Users/Initi/semble-up-citizens/node_modules/playwright-core/index.mjs");
const base = process.argv[2];
const routes = ["/", "/manifest", "/film", "/now-lets-begin", "/learn", "/guide", "/guide/library", "/guide/library/discovery", "/guide/apply", "/guide/team", "/guide/partners", "/guide/partners/green-reef", "/guide/partners/semble", "/guide/partners/ocean97", "/give", "/give/guide", "/guide/teachback", "/grow", "/apply", "/waves", "/privacy"];
const b = await chromium.launch({ channel: "chrome", headless: true, args: ["--use-angle=d3d11", "--enable-gpu"] });
let bad = 0, total = 0, off = 0;
for (const vp of [{ width: 390, height: 844 }, { width: 1440, height: 900 }]) {
  const ctx = await b.newContext({ viewport: vp, isMobile: vp.width < 500, hasTouch: vp.width < 500 });
  await ctx.addInitScript(() => { try { localStorage.setItem("waves-tour-offered", "1"); } catch {} });
  for (const r of routes) {
    const p = await ctx.newPage(); const errs = [];
    p.on("pageerror", (e) => errs.push(String(e).slice(0, 160)));
    await p.goto(base + r, { waitUntil: "load" }); await p.waitForTimeout(2500);
    const H = await p.evaluate(() => document.documentElement.scrollHeight);
    for (let y = 0; y < H; y += vp.height * 0.6) { await p.evaluate((y) => scrollTo(0, y), y); await p.waitForTimeout(160); }
    await p.waitForTimeout(1500);
    const res = await p.evaluate(() => {
      const out = { n: 0, off: [], bad: [], hidden: [] };
      for (const h of document.querySelectorAll("main h1, main h2")) {
        if (h.dataset.sf === "off") { out.off.push(h.textContent.trim().slice(0, 40)); continue; }
        const l = h.querySelector(":scope > sf-layer"); if (!l) continue;
        out.n++;
        const ws = [...l.querySelectorAll("sf-w")];
        const range = document.createRange(); range.selectNodeContents(h); range.setEndBefore(l);
        const orig = new Set([...range.getClientRects()].filter((x) => x.width > 1).map((x) => Math.round(x.bottom)));
        const copy = new Set(ws.map((w) => Math.round(w.getBoundingClientRect().bottom)));
        if (h.getBoundingClientRect().height > 0 && orig.size !== copy.size) out.bad.push(`${h.textContent.trim().slice(0, 40)} ${orig.size}/${copy.size}`);
        if (h.getBoundingClientRect().height > 0 && !h.classList.contains("sf-on")) out.hidden.push(h.textContent.trim().slice(0, 40));
      }
      return out;
    });
    total += res.n; off += res.off.length; bad += res.bad.length;
    if (res.bad.length || res.off.length || res.hidden.length || errs.length) console.log(vp.width, r, JSON.stringify({ off: res.off, bad: res.bad, notShown: res.hidden, errs }));
    await p.close();
  }
  await ctx.close();
}
console.log("surfacing", total, "fell back", off, "mismatched", bad);
await b.close();
