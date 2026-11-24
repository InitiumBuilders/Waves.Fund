// Reflow at 320 CSS pixels (WCAG 2.2 AA 1.4.10): the first iPhone SE, and Display Zoom on the SE and the minis, give a
// page 320 wide. Each whole page is scrolled at 320x460; a fault is text cut by the side of the screen (outside a
// horizontal scroller, which is allowed to scroll) or a page wider than the screen. Hidden things are skipped: the
// forms' spam trap sits far off screen on purpose.
//   node scripts/qa/reflow.mjs <base> [routes] [--webkit]
// Added 2026-11-24, when 320 had never been measured: the site passed, and the first screens there did not.
const webkit = process.argv.includes("--webkit");
const pw = await import(webkit
  ? process.env.PLAYWRIGHT_WEBKIT || "file:///C:/Users/Initi/iphone-duos-sold/node_modules/playwright-core/index.mjs"
  : process.env.PLAYWRIGHT_CORE || "file:///C:/Users/Initi/semble-up-citizens/node_modules/playwright-core/index.mjs");
const args = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const base = args[0];
if (!base) { console.error("usage: node scripts/qa/reflow.mjs <base> [routes] [--webkit]"); process.exit(2); }
const routes = (args[1] || "/,/manifest,/film,/now-lets-begin,/learn,/guide,/guide/library,/guide/library/listen,/guide/library/discovery,/guide/apply,/guide/team,/guide/partners,/guide/partners/green-reef,/guide/partners/semble,/guide/partners/ocean97,/give,/give/guide,/guide/teachback,/grow,/apply,/waves,/waves/waves-fund,/privacy,/contribute,/nope").split(",");
const b = webkit ? await pw.webkit.launch() : await pw.chromium.launch({ channel: "chrome", headless: true, args: ["--use-angle=d3d11", "--ignore-gpu-blocklist", "--enable-gpu"] });
let bad = 0;
for (const route of routes) {
  // One context per page, reading only: every request other than GET is refused.
  const ctx = await b.newContext({ viewport: { width: 320, height: 460 }, deviceScaleFactor: 2, isMobile: webkit ? undefined : true, hasTouch: true });
  await ctx.route("**/*", (r) => (r.request().method() === "GET" ? r.continue() : r.abort()));
  await ctx.route("**/api/community*", (r) => r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ projects: [], guides: 1 }) }));
  await ctx.addInitScript(() => { try { localStorage.setItem("waves-tour-offered", "1"); } catch { /* storage may be off */ } });
  const p = await ctx.newPage();
  await p.goto(base + route, { waitUntil: "load", timeout: 90000 });
  await p.waitForTimeout(webkit ? 4000 : 2500);
  const cut = new Map();
  let wide = 0;
  for (let i = 0; i < 80; i++) {
    const r = await p.evaluate(() => {
      const W = innerWidth;
      const held = (e) => { for (let a = e.parentElement; a && a !== document.body && a !== document.documentElement; a = a.parentElement) { const s = getComputedStyle(a); if (s.overflowX !== "visible" || s.position === "fixed") return true; } return false; };
      const out = [];
      for (const e of document.querySelectorAll("main h1, main h2, main h3, main h4, main p, main li, main a, main button, main label, main summary, main figcaption, main blockquote, main dt, main dd, main th, main td, main small, main strong, main em")) {
        const rc = e.getBoundingClientRect();
        if (!rc.width || !rc.height || rc.bottom < 0 || rc.top > innerHeight) continue;
        if (!(e.textContent || "").trim() || e.closest("[aria-hidden='true'], .form-trap")) continue;
        const s = getComputedStyle(e);
        if (s.visibility === "hidden" || +s.opacity === 0) continue;
        // A box past either side, or text longer than its box (a word that will not wrap).
        const past = rc.left < -1 || rc.right > W + 1;
        const spill = s.overflowX === "visible" && e.scrollWidth > e.clientWidth + 2 && rc.left + e.scrollWidth > W + 1 && !["inline", "contents"].includes(s.display);
        if ((past || spill) && !held(e)) out.push(`${e.tagName.toLowerCase()} "${e.textContent.trim().replace(/\s+/g, " ").slice(0, 44)}" (${Math.round(rc.left)} to ${Math.round(past ? rc.right : rc.left + e.scrollWidth)})`);
      }
      const end = innerHeight + scrollY >= document.documentElement.scrollHeight - 4;
      scrollBy(0, innerHeight * 0.7);
      return { out, wide: document.documentElement.scrollWidth - W, end };
    });
    wide = Math.max(wide, r.wide);
    for (const line of r.out) cut.set(line.replace(/\(-?\d+ to -?\d+\)/, ""), line);
    await p.waitForTimeout(140);
    if (r.end) break;
  }
  if (cut.size || wide > 0) { bad++; console.log(`${route}: ${wide > 0 ? `${wide}px wider than the screen; ` : ""}${cut.size} cut`); for (const l of cut.values()) console.log("    " + l); }
  await ctx.close();
}
console.log(`${webkit ? "webkit" : "chrome"} 320x460: pages with a fault: ${bad} of ${routes.length}`);
await b.close();
process.exit(bad ? 1 : 0);
