// How dense each page reads: body text sizes, small text, line length, gaps between sections, words per screen.
// Usage: node density.mjs <base> [routes]
// Playwright: set PLAYWRIGHT_CORE to a playwright-core index.mjs (a file:// URL); see scripts/qa/README.md.
const { chromium } = await import(process.env.PLAYWRIGHT_CORE || "file:///C:/Users/Initi/semble-up-citizens/node_modules/playwright-core/index.mjs");
const base = process.argv[2] || "https://www.waves.fund";
const routes = (process.argv[3] || "/learn,/guide,/guide/library,/guide/teachback,/give,/grow,/waves,/apply,/guide/partners,/guide/partners/green-reef,/now-lets-begin,/privacy").split(",");
const b = await chromium.launch({ channel: "chrome", headless: true, args: ["--use-angle=d3d11", "--ignore-gpu-blocklist", "--enable-gpu"] });
for (const vp of [{ width: 390, height: 844 }, { width: 1440, height: 900 }]) {
  const ctx = await b.newContext({ viewport: vp, isMobile: vp.width < 500, hasTouch: vp.width < 500 });
  console.log(`\n== ${vp.width}px   route | body px (median) | text <14px | longest line (chars) | section gap px (min/median) | words per screen (max)`);
  for (const r of routes) {
    const p = await ctx.newPage();
    await p.goto(base + r, { waitUntil: "load" }); await p.waitForTimeout(3500);
    await p.evaluate(() => scrollTo(0, document.documentElement.scrollHeight)); await p.waitForTimeout(800); await p.evaluate(() => scrollTo(0, 0)); await p.waitForTimeout(400);
    const m = await p.evaluate(() => {
      const main = document.querySelector("main"); if (!main) return null;
      const ps = [...main.querySelectorAll("p, li, dd, summary, label, small, .fine-print")].filter((e) => e.offsetParent && e.textContent.trim().length > 20 && !e.closest("dialog, nav, header.app-header"));
      const sizes = ps.map((e) => parseFloat(getComputedStyle(e).fontSize)).sort((a, b) => a - b);
      const small = ps.filter((e) => parseFloat(getComputedStyle(e).fontSize) < 14).length;
      // Characters per line: width over the average glyph width (about half the font size).
      const cpl = ps.map((e) => { const cs = getComputedStyle(e); const w = e.getBoundingClientRect().width; return Math.round(w / (parseFloat(cs.fontSize) * 0.5)); });
      const secs = [...main.querySelectorAll(":scope section, :scope > div > section, :scope > div > div > section")].filter((s) => s.offsetParent).map((s) => s.getBoundingClientRect()).sort((a, b) => a.top - b.top);
      const gaps = []; for (let i = 1; i < secs.length; i++) { const g = Math.round(secs[i].top - secs[i - 1].bottom); if (g > -5 && secs[i].top >= secs[i - 1].bottom - 5) gaps.push(g); }
      gaps.sort((a, b) => a - b);
      // Words visible in each screenful.
      const H = innerHeight, total = document.documentElement.scrollHeight, words = [];
      const nodes = []; const tw = document.createTreeWalker(main, NodeFilter.SHOW_TEXT);
      while (tw.nextNode()) { const n = tw.currentNode; const t = n.textContent.trim(); if (!t || !n.parentElement?.offsetParent) continue; const rr = n.parentElement.getBoundingClientRect(); nodes.push([rr.top + scrollY, t.split(/\s+/).length]); }
      for (let y = 0; y < total; y += H) words.push(nodes.filter(([t]) => t >= y && t < y + H).reduce((s, [, n]) => s + n, 0));
      return { body: sizes[Math.floor(sizes.length / 2)], small, n: ps.length, cpl: Math.max(...cpl, 0), gapMin: gaps[0] ?? null, gapMed: gaps[Math.floor(gaps.length / 2)] ?? null, wordsMax: Math.max(...words, 0) };
    });
    console.log(r.padEnd(32), m ? `${m.body} | ${m.small}/${m.n} | ${m.cpl} | ${m.gapMin}/${m.gapMed} | ${m.wordsMax}` : "no main");
    await p.close();
  }
  await ctx.close();
}
await b.close();
