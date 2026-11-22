// The first screen on a real phone. With Safari's bars showing an iPhone gives a page about 659px of height, and an
// iPhone SE about 548px; a rig that only opens 390x844 never sees that. A common Android phone gives 360x640. For
// each main page at the three sizes:
//   - the title starts clear of the header, and nothing runs past the side of the screen;
//   - on a page that opens on the sea, at least 40px of water shows above the point where the night under the words
//     reaches half its strength (the night fades in over the 120px above the eyebrow, so that point is 60px above it);
//   - the first thing to press (the first link or button in the page's first row of actions) stands either clear of
//     the tab bar or wholly below it, never cut by it. On every page since 2026-11-21 (before, sea pages only).
//   node scripts/qa/firstscreen.mjs <base> [routes] [--shots <folder>]
// Until 2026-11-21 the Learn page's title began 101px under the header on an iPhone SE, and the sea pages showed
// 10 to 150px of water on an iPhone, because the words were set from the foot of a screen assumed to be tall.
import { mkdirSync } from "node:fs";
import { join } from "node:path";
const { chromium } = await import(process.env.PLAYWRIGHT_CORE || "file:///C:/Users/Initi/semble-up-citizens/node_modules/playwright-core/index.mjs");
const args = process.argv.slice(2), plain = args.filter((a, i) => !a.startsWith("--") && args[i - 1] !== "--shots");
const base = plain[0];
if (!base) { console.error("usage: node scripts/qa/firstscreen.mjs <base> [routes] [--shots <folder>]"); process.exit(2); }
const routes = (plain[1] || "/,/learn,/guide,/give,/grow,/waves,/waves/waves-fund,/apply,/manifest,/film,/now-lets-begin,/guide/apply,/guide/library,/guide/partners,/guide/team,/guide/teachback,/privacy,/contribute").split(",");
const shots = args.includes("--shots") ? args[args.indexOf("--shots") + 1] : null;
if (shots) mkdirSync(shots, { recursive: true });
const SIZES = [[375, 548, "iPhone SE"], [393, 659, "iPhone"], [360, 640, "Android"]];
// The least water a sea page shows above the night's half-strength point.
const WATER = 40;

const b = await chromium.launch({ channel: "chrome", headless: true, args: ["--use-angle=d3d11", "--ignore-gpu-blocklist", "--enable-gpu"] });
let faults = 0, seen = 0, seas = 0;
for (const [w, h, name] of SIZES) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  await ctx.route("**/*", (r) => (r.request().method() === "GET" ? r.continue() : r.abort()));
  // The project feed answered as production answers it today, so /waves shows the line it shows there.
  await ctx.route("**/api/community*", (r) => r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ projects: [], guides: 1 }) }));
  await ctx.addInitScript(() => { try { localStorage.setItem("waves-tour-offered", "1"); } catch { /* storage may be off */ } });
  for (const route of routes) {
    const p = await ctx.newPage();
    await p.goto(base + route, { waitUntil: "load", timeout: 90000 });
    await p.waitForSelector("main h1", { timeout: 30000 }).catch(() => {});
    await p.waitForTimeout(2500);
    const m = await p.evaluate(() => {
      const top = (e) => (e ? Math.round(e.getBoundingClientRect().top + scrollY) : null);
      const h1 = [...document.querySelectorAll("main h1")].find((e) => e.getBoundingClientRect().height > 0);
      const stage = document.querySelector(".sea-hero-stage");
      const bar = document.querySelector(".bottom-nav")?.getBoundingClientRect();
      const press = [...document.querySelectorAll(stage ? ".sea-hero .intro-actions a, .sea-hero .intro-actions button" : "main .intro-actions a, main .intro-actions button, main .fm-actions a, main .fm-actions button, main a.glow-button, main button.glow-button")]
        .find((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0; });
      const pr = press?.getBoundingClientRect();
      return {
        head: Math.round(document.querySelector(".app-header")?.getBoundingClientRect().bottom ?? 0),
        h1: top(h1),
        over: document.documentElement.scrollWidth - innerWidth,
        cut: [...document.querySelectorAll("main h1, main h2, main p")].filter((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.top < innerHeight && (r.left < -1 || r.right > innerWidth + 1); }).length,
        water: stage ? top(stage.querySelector(".sea-hero-copy .eyebrow")) - 60 - top(stage) : null,
        // With the page at its top: does the bar cut the first button? (1px either way is layout rounding.)
        press: press ? press.textContent.trim().slice(0, 30) : null,
        barCut: !!(bar && bar.height && pr && pr.top + scrollY < bar.top - 1 && pr.bottom + scrollY > bar.top + 1),
        into: bar && pr ? Math.round(pr.bottom + scrollY - bar.top) : 0,
      };
    });
    const found = [];
    if (m.h1 === null) found.push("no title on the page");
    else if (m.head - m.h1 > 1) found.push(`the title begins ${m.head - m.h1}px under the header`);
    if (m.over > 0) found.push(`the page is ${m.over}px wider than the screen`);
    if (m.cut) found.push(`${m.cut} lines run past the side of the screen`);
    if (m.water !== null) { seas++; if (m.water < WATER) found.push(`${m.water}px of water above the night's half-strength point (at least ${WATER})`); }
    if (m.barCut) found.push(`the tab bar cuts "${m.press}" (${m.into}px of it under the bar)`);
    seen++;
    if (found.length) { faults++; console.log(`${name} ${w}x${h} ${route}: ${found.join("; ")}`); }
    if (shots) await p.screenshot({ path: join(shots, `${name.replace(/ /g, "-").toLowerCase()}${route.replace(/\//g, "_") || "_"}.png`) });
    await p.close();
  }
  await ctx.close();
}
await b.close();
// A run that found no sea page measured nothing about the water, so it cannot pass.
if (!plain[1] && !seas) { console.log("no page opened on the sea, so the water was never measured"); faults++; }
console.log(`first screens with a fault: ${faults} of ${seen}`);
process.exit(faults ? 1 : 0);
