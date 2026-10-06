// Which elements make a page hard to read: reading text under 14px, and lines over 80 characters. Grouped by selector.
// Playwright: set PLAYWRIGHT_CORE to a playwright-core index.mjs (a file:// URL); see scripts/qa/README.md.
const { chromium } = await import(process.env.PLAYWRIGHT_CORE || "file:///C:/Users/Initi/semble-up-citizens/node_modules/playwright-core/index.mjs");
const base = process.argv[2] || "https://www.waves.fund";
const routes = (process.argv[3] || "/learn,/guide,/guide/library,/guide/teachback,/give,/grow,/waves,/apply,/guide/partners/green-reef,/now-lets-begin,/privacy").split(",");
const b = await chromium.launch({ channel: "chrome", headless: true });
for (const vp of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
  const ctx = await b.newContext({ viewport: vp, isMobile: vp.width < 500 });
  const small = new Map(), long = new Map();
  for (const r of routes) {
    const p = await ctx.newPage();
    await p.goto(base + r, { waitUntil: "load" }); await p.waitForTimeout(3000);
    const found = await p.evaluate(() => {
      const sel = (e) => { const c = [...e.classList].slice(0, 2).join("."); const pc = e.parentElement ? [...e.parentElement.classList].slice(0, 1).join(".") : ""; return `${pc ? "." + pc + " > " : ""}${e.tagName.toLowerCase()}${c ? "." + c : ""}`; };
      const out = { small: [], long: [] };
      for (const e of document.querySelectorAll("main p, main li, main dd, main dt, main label, main small, main span, main summary, main a")) {
        if (!e.offsetParent || e.closest("dialog")) continue;
        const own = [...e.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent).join("").trim();
        if (own.length < 12) continue;
        const cs = getComputedStyle(e), fs = parseFloat(cs.fontSize), w = e.getBoundingClientRect().width;
        if (fs < 14) out.small.push([sel(e), fs]);
        const cpl = Math.round(w / (fs * 0.5)); if (cpl > 80 && own.length > 90 && cs.display !== "inline") out.long.push([sel(e), cpl]);
      }
      return out;
    });
    for (const [s, fs] of found.small) { const k = `${s} ${fs}px`; small.set(k, (small.get(k) || new Set()).add(r)); }
    for (const [s, c] of found.long) { const k = s; const v = long.get(k) || { max: 0, routes: new Set() }; v.max = Math.max(v.max, c); v.routes.add(r); long.set(k, v); }
    await p.close();
  }
  console.log(`\n== ${vp.width}px: reading text under 14px`);
  for (const [k, v] of [...small].sort((a, b) => b[1].size - a[1].size).slice(0, 30)) console.log("  ", k, "|", [...v].join(" "));
  if (vp.width > 500) { console.log(`== ${vp.width}px: lines over 80 characters`); for (const [k, v] of [...long].sort((a, b) => b[1].max - a[1].max).slice(0, 30)) console.log("  ", k, v.max, "|", [...v.routes].join(" ")); }
  await ctx.close();
}
await b.close();
