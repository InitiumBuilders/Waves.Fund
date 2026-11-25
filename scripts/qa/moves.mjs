// Moving between pages (src/seamless.tsx): each move is one view transition with the way it should have. For each move
// the real link or tab is clicked, so the site's own handler runs; during the transition the rig records which
// animations run, and once it ends it checks the page has settled (the words at rest, no flag left behind).
//   node scripts/qa/moves.mjs <base> [--shots <folder>] [--webkit]
// Expected: between the four practices the words arrive from the side travelled toward (way-from-right or -left);
// into a practice they rise (motus-rise); back out they come forward (way-forward). The light under the tabs travels
// when the tab changes. Between two pages that open on the sea, the water holds (sea-hold), unless the page you left
// was scrolled past its sea. With reduced motion there is no transition at all. Added 2026-11-24.
// A "back:" move clicks the link, waits, then presses the browser's back: the move home has the way reversed.
import { mkdirSync } from "node:fs";
import { join } from "node:path";
const args = process.argv.slice(2);
// --webkit runs the moves in WebKit (iPhones have View Transitions from Safari 18).
const webkit = args.includes("--webkit");
const pw = await import(webkit
  ? process.env.PLAYWRIGHT_WEBKIT || "file:///C:/Users/Initi/iphone-duos-sold/node_modules/playwright-core/index.mjs"
  : process.env.PLAYWRIGHT_CORE || "file:///C:/Users/Initi/semble-up-citizens/node_modules/playwright-core/index.mjs");
const base = args.find((a) => !a.startsWith("--") && args[args.indexOf(a) - 1] !== "--shots");
if (!base) { console.error("usage: node scripts/qa/moves.mjs <base> [--shots <folder>]"); process.exit(2); }
const shots = args.includes("--shots") ? args[args.indexOf("--shots") + 1] : null;
if (shots) mkdirSync(shots, { recursive: true });

// [name, start page, link to click, the arriving words' animation, the light travels (null: the tab does not change,
// so it is not judged), the sea holds, scroll first, a wide screen (the header's tabs)]
const MOVES = [
  ["Learn to Guide, by tab", "/learn", ".bottom-nav a[href='/guide']", "way-from-right", true, false],
  ["Guide to Learn, by tab", "/guide", ".bottom-nav a[href='/learn']", "way-from-left", true, false],
  ["Learn to Grow, by tab", "/learn", ".bottom-nav a[href='/grow']", "way-from-right", true, false],
  ["Guide into its Library", "/guide", "main a[href='/guide/library']", "motus-rise", null, false],
  ["Library back to Guide", "/guide/library", "main a.guide-back, main a[href='/guide']", "way-forward", null, false],
  ["Learn to the Manifest, sea to sea", "/learn", "main a[href='/manifest']", "motus-rise", null, true],
  // Scrolled past the sea, the link is one the rig places in view: the site's own click handler still runs.
  ["Learn to the Manifest, scrolled past the sea", "/learn", "a#rig-link", "motus-rise", null, false, true],
  ["Back from Guide to Learn", "/learn", "back:.bottom-nav a[href='/guide']", "way-from-left", true, false],
  ["Back out of the Library to Guide", "/guide", "back:main a[href='/guide/library']", "way-forward", null, false],
  ["Learn to Guide on a wide screen, by the header's tab", "/learn", ".desktop-nav a[href='/guide']", "way-from-right", true, false, false, true],
];

// In WebKit each move gets a fresh browser: Playwright's WebKit crashed the eighth page of one long run (2026-11-24),
// on a move that had passed earlier in the same run and passed again in a browser of its own.
const launch = () => (webkit ? pw.webkit.launch() : pw.chromium.launch({ channel: "chrome", headless: true, args: ["--use-angle=d3d11", "--ignore-gpu-blocklist", "--enable-gpu"] }));
let b = await launch();
let pass = 0, fail = 0;
const check = (ok, what) => { if (ok) pass++; else fail++; console.log(`${ok ? "pass" : "FAIL"}  ${what}`); };

async function open(reduced, wide) {
  const ctx = await b.newContext(wide
    ? { viewport: { width: 1440, height: 900 }, reducedMotion: reduced ? "reduce" : "no-preference" }
    : { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: webkit ? undefined : true, hasTouch: true, reducedMotion: reduced ? "reduce" : "no-preference" });
  await ctx.route("**/*", (r) => (r.request().method() === "GET" ? r.continue() : r.abort()));
  await ctx.route("**/api/community*", (r) => r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ projects: [], guides: 1 }) }));
  await ctx.addInitScript(() => {
    try { localStorage.setItem("waves-tour-offered", "1"); } catch { /* storage may be off */ }
    // Every animation seen from the click on: name and what it runs on (a view-transition part or an element).
    window.__seen = new Set();
    window.__watch = () => {
      const t0 = performance.now();
      const tick = () => {
        for (const a of document.getAnimations()) {
          const fx = a.effect;
          const on = fx?.pseudoElement || (fx?.target?.id ? "#" + fx.target.id : fx?.target?.tagName?.toLowerCase() || "?");
          window.__seen.add(`${a.animationName || a.constructor.name}@${on}`);
        }
        if (performance.now() - t0 < 1600) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    };
  });
  return ctx;
}

for (const [name, start, chosen, arrive, light, sea, scrolled, wide] of MOVES) {
  const back = chosen.startsWith("back:"), link = back ? chosen.slice(5) : chosen;
  if (webkit) { await b.close(); b = await launch(); }
  const ctx = await open(false, wide);
  const p = await ctx.newPage();
  const errors = [];
  p.on("pageerror", (e) => errors.push(String(e).slice(0, 120)));
  p.on("console", (m) => { if (m.type() === "error" && !/Failed to load resource|clerk/i.test(m.text())) errors.push(m.text().slice(0, 120)); });
  await p.goto(base + start, { waitUntil: "load", timeout: 90000 });
  await p.waitForSelector("main h1", { timeout: 30000 });
  await p.waitForTimeout(2500);
  if (scrolled) {
    await p.evaluate(() => scrollTo(0, innerHeight * 1.5));
    await p.waitForTimeout(600);
    await p.evaluate(() => { const a = document.createElement("a"); a.id = "rig-link"; a.href = "/manifest"; a.textContent = "The Manifest"; a.style.cssText = "position:fixed;top:140px;left:24px;z-index:99;padding:12px;background:#000;color:#fff"; document.body.appendChild(a); });
  }
  const target = await p.$(link);
  if (!target) { check(false, `${name}: no link "${link}" on ${start}`); await ctx.close(); continue; }
  if (!scrolled) { await target.scrollIntoViewIfNeeded().catch(() => {}); await p.evaluate(() => scrollTo(0, 0)).catch(() => {}); }
  const via = await target.evaluate((a) => new URL(a.href).pathname), to = back ? start : via;
  if (back) {
    // Out by the link, then home by the browser's own back, watched from the press.
    await target.click({ noWaitAfter: true });
    await p.waitForTimeout(2600);
    await p.evaluate(() => { window.__seen = new Set(); window.__watch(); history.back(); });
  } else {
    await p.evaluate(() => window.__watch());
    await target.click({ noWaitAfter: true });
  }
  if (shots) { let t = 0; for (const ms of [90, 200, 320, 460, 700]) { await p.waitForTimeout(ms - t); t = ms; await p.screenshot({ path: join(shots, `${name.replace(/\W+/g, "-").toLowerCase()}-${ms}.png`) }); } }
  await p.waitForTimeout(2600);
  const r = await p.evaluate(() => {
    const h1 = [...document.querySelectorAll("main h1")].find((e) => e.offsetHeight);
    const cs = h1 ? getComputedStyle(h1) : null;
    return {
      seen: [...window.__seen],
      path: location.pathname,
      way: document.getElementById("content")?.dataset.way || "",
      carry: document.documentElement.hasAttribute("data-sea-carry"),
      rest: cs ? cs.opacity === "1" && (cs.transform === "none" || cs.transform === "matrix(1, 0, 0, 1, 0, 0)") : false,
    };
  });
  const has = (s) => r.seen.some((x) => x.startsWith(s));
  check(r.path === to, `${name}: arrives at ${to} (at ${r.path})`);
  // In WebKit a move from one sea page to another changes page plainly (it crashed with a transition, src/seamless.tsx).
  // A back is judged by the move it makes: from the page the link opened, home.
  const SEA = (x) => x === "/learn" || x === "/manifest" || x === "/waves" || x.startsWith("/waves/");
  if (webkit && SEA(back ? via : start) && SEA(to)) {
    check(!r.seen.some((x) => x.includes("::view-transition")), `${name}: in WebKit, a plain change of page (no transition)`);
    check(r.rest && !r.carry, `${name}: the page settles (title at rest, no carry flag left)`);
    check(!errors.length, `${name}: nothing thrown or logged${errors.length ? ": " + errors.join(" | ") : ""}`);
    await ctx.close();
    continue;
  }
  check(has("seamless-leave@::view-transition-old(root)") || has("seamless-leave"), `${name}: the page you leave dissolves`);
  check(has(`${arrive}@h1`) || r.seen.some((x) => x.startsWith(arrive + "@")), `${name}: the words arrive by ${arrive}${has(arrive) ? "" : ` (seen: ${[...new Set(r.seen.map((x) => x.split("@")[0]))].join(", ")})`}`);
  if (light !== null) check(r.seen.some((x) => x.endsWith("::view-transition-group(tab-light)")) === light, `${name}: the tab's light ${light ? "travels" : "stays"}`);
  check(has("sea-hold") === sea, `${name}: the sea ${sea ? "holds" : "is not carried"}`);
  check(r.rest && !r.carry, `${name}: the page settles (title at rest, no carry flag left)`);
  check(!errors.length, `${name}: nothing thrown or logged${errors.length ? ": " + errors.join(" | ") : ""}`);
  await ctx.close();
}

// Reduced motion: no transition, the page simply changes.
{
  const ctx = await open(true);
  const p = await ctx.newPage();
  await p.goto(base + "/learn", { waitUntil: "load", timeout: 90000 });
  await p.waitForSelector("main h1", { timeout: 30000 });
  await p.waitForTimeout(1500);
  await p.evaluate(() => window.__watch());
  await p.click(".bottom-nav a[href='/guide']", { noWaitAfter: true });
  await p.waitForTimeout(2000);
  const seen = await p.evaluate(() => [...window.__seen]);
  check(!seen.some((x) => x.includes("::view-transition")) && !seen.some((x) => x.startsWith("way-")), `reduced motion: no transition and no way${seen.length ? " (seen: " + [...new Set(seen.map((x) => x.split("@")[0]))].slice(0, 6).join(", ") + ")" : ""}`);
  await ctx.close();
}

await b.close();
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
