// Wave One, the founding Wave (src/founding.ts): on the Waves sea and in its list, on its own page, linked from the
// Wave One card, and its moves checked against GitHub from the browser. GitHub is answered by the test, so the
// check's four answers (all match, one edited, one missing, no answer) are each proven; --live-github asks the
// real one once.
//   node scripts/qa/waveone.mjs <base> [--live-github]
import { readFileSync } from "node:fs";
const { chromium } = await import(process.env.PLAYWRIGHT_CORE || "file:///C:/Users/Initi/semble-up-citizens/node_modules/playwright-core/index.mjs");
const base = process.argv[2], live = process.argv.includes("--live-github");
if (!base) { console.error("usage: node scripts/qa/waveone.mjs <base> [--live-github]"); process.exit(2); }
const record = JSON.parse(readFileSync(new URL("../../src/record-data.json", import.meta.url), "utf8"));
const moves = record.moves, days = [...new Set(moves.map((m) => m.date))];
const PAGE = "/waves/waves-fund";
// A static preview of the build has no API. There the project feed is answered here, as production answers it today.
const feed = await fetch(base + "/api/community").then((r) => r.json()).then((j) => Array.isArray(j.projects)).catch(() => false);
if (!feed) console.log("note: this server has no project feed; the test answers it with no projects");
let failed = 0;
const ok = (pass, what, got = "") => { if (!pass) failed++; console.log(pass ? "ok  " : "FAIL", what, pass ? "" : `-> ${String(got).slice(0, 200)}`); };
const asCommits = (list) => list.map((m) => ({ sha: m.sha, commit: { message: `${m.move}\n\nMore lines the check must ignore.` } }));

const b = await chromium.launch({ channel: "chrome", headless: true, args: ["--use-angle=d3d11", "--ignore-gpu-blocklist", "--enable-gpu"] });
async function open(vp, path, { github, reduce } = {}) {
  const ctx = await b.newContext({ viewport: vp, isMobile: vp.width < 500, hasTouch: vp.width < 500, reducedMotion: reduce ? "reduce" : "no-preference" });
  const asked = [], writes = [], errs = [];
  await ctx.route("**/*", (r) => { if (r.request().method() === "GET") return r.continue(); writes.push(r.request().url()); return r.abort(); });
  if (!feed) await ctx.route("**/api/community*", (r) => r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ projects: [], guides: 1 }) }));
  if (github !== undefined) await ctx.route("https://api.github.com/**", (r) => { asked.push(r.request().url()); return github === null ? r.abort() : r.fulfill({ status: 200, contentType: "application/json", headers: { "access-control-allow-origin": "*" }, body: JSON.stringify(github) }); });
  const p = await ctx.newPage();
  p.on("console", (m) => { if (m.type() === "error" && !/clerk|ERR_SSL|Failed to load resource|ERR_FAILED/i.test(m.text())) errs.push(m.text().slice(0, 160)); });
  p.on("pageerror", (e) => errs.push("PAGEERROR " + String(e).slice(0, 160)));
  await p.goto(base + path, { waitUntil: "load", timeout: 90000 });
  await p.waitForSelector("main h1", { timeout: 90000 });
  return { ctx, p, asked, writes, errs };
}
const press = async (p) => { await p.locator(".tb-check button").scrollIntoViewIfNeeded(); await p.locator(".tb-check button").click(); await p.waitForFunction(() => document.querySelector(".tb-result")?.textContent.trim(), null, { timeout: 30000 }); return (await p.locator(".tb-result").innerText()).trim(); };

// 1. The Waves sea and its list.
{
  const { ctx, p, errs } = await open({ width: 390, height: 844 }, "/waves");
  await p.waitForSelector(".wave-card h2", { timeout: 30000 });
  const card = p.locator(".wave-card", { has: p.locator("h2", { hasText: /^Waves\.Fund$/ }) });
  ok(await card.count() === 1, "/waves lists Wave One once", await card.count());
  ok((await card.locator("a[href='/waves/waves-fund']").count()) === 1, "its card opens /waves/waves-fund");
  ok((await card.locator(".eyebrow").innerText()).trim() === "WAVE 001", "its card is marked WAVE 001");
  ok(/Project submissions are open/.test(await p.locator(".sea-hero .intro-description").innerText()), "the first screen still says submissions are open");
  ok((await p.locator(".empty-state").count()) === 0, "the empty state is gone");
  ok(!errs.length, "/waves has no console errors", errs.join(" | "));
  await ctx.close();
}

// 2. The page itself, at a phone and a wide screen.
for (const vp of [{ width: 390, height: 844 }, { width: 1440, height: 900 }]) {
  const { ctx, p, errs, writes } = await open(vp, PAGE);
  await p.waitForSelector("#trustbase", { timeout: 30000 });
  ok((await p.locator("main h1").innerText()).trim() === "Waves.Fund", `${vp.width}: the title is Waves.Fund`);
  ok((await p.title()) === "Waves.Fund — Wave One", `${vp.width}: the tab is named Wave One`, await p.title());
  const eyebrows = (await p.locator(".pw-chapter > .eyebrow").allInnerTexts()).map((t) => t.trim());
  ok(["THE STORY", "THE NEXT MOVE", "THE TRUSTBASE"].every((e) => eyebrows.includes(e)), `${vp.width}: the three parts are named`, eyebrows.join(", "));
  ok((await p.locator(".tb-day").count()) === days.length, `${vp.width}: one row for each of the ${days.length} days`, await p.locator(".tb-day").count());
  const lines = await p.locator(".tb-day").evaluateAll((els) => els.map((el) => Number(getComputedStyle(el).getPropertyValue("--n"))));
  ok(lines.reduce((a, n) => a + n, 0) === moves.length, `${vp.width}: one line of ground for each of the ${moves.length} moves`, lines.join("+"));
  await p.evaluate(() => document.querySelectorAll(".tb-day details").forEach((d) => { d.open = true; }));
  const hrefs = await p.locator(".tb-day a").evaluateAll((els) => els.map((a) => a.getAttribute("href")));
  ok(hrefs.length === moves.length && moves.every((m) => hrefs.includes(`${record.repo}/commit/${m.sha}`)), `${vp.width}: every move links to its own commit`, hrefs.length);
  await p.evaluate(() => document.querySelectorAll(".tb-day details").forEach((d) => { d.open = false; }));
  const small = await p.evaluate(() => [...document.querySelectorAll(".tb-day summary, .tb-check button, .fw-ways a, .tb-words .text-button")].filter((el) => el.getBoundingClientRect().height < 44).map((el) => el.textContent.trim().slice(0, 30)));
  ok(!small.length, `${vp.width}: everything to press is at least 44px tall`, small.join(" | "));
  ok((await p.evaluate(() => document.documentElement.scrollWidth - innerWidth)) <= 0, `${vp.width}: the page is no wider than the screen`);
  ok((await p.locator(".fw a[href^='mailto:August@Outlier.Systems']").count()) === 2, `${vp.width}: two ways to write to August`, await p.locator(".fw a[href^='mailto:']").count());
  ok(!errs.length && !writes.length, `${vp.width}: no console errors and nothing sent`, [...errs, ...writes].join(" | "));
  await ctx.close();
}

// 3. The check, with GitHub answered here.
{
  const all = asCommits(moves);
  let { ctx, p, asked } = await open({ width: 390, height: 844 }, PAGE, { github: all });
  ok((await press(p)) === `All ${moves.length} moves match the public code.`, "all match: the result says so");
  await p.waitForFunction((n) => document.querySelectorAll(".tb-day.tb-ok").length === n, days.length, { timeout: 15000 }).catch(() => {});
  ok((await p.locator(".tb-day.tb-ok").count()) === days.length, "all match: every day is lit", await p.locator(".tb-day.tb-ok").count());
  ok((await p.locator(".tb-state").allInnerTexts()).every((t) => t.trim() === "Matches."), "all match: every day says Matches.");
  ok(asked.length === 1, "all match: GitHub is asked once", asked.length);
  await ctx.close();

  const edited = asCommits(moves); edited[3].commit.message = "Different words\n";
  ({ ctx, p } = await open({ width: 390, height: 844 }, PAGE, { github: edited }));
  ok((await press(p)) === `1 of ${moves.length} moves does not match the public code.`, "one edited: the result counts it");
  await p.waitForSelector(".tb-move-state", { timeout: 15000 }).catch(() => {});
  ok((await p.locator(".tb-move-state").allInnerTexts()).join("|") === "Its words differ from the commit.", "one edited: the move says its words differ");
  ok((await p.locator(".tb-day:not(.tb-ok) .tb-state").allInnerTexts()).join("|") === "1 changed.", "one edited: its day says 1 changed.");
  ok((await p.locator(".tb-day:not(.tb-ok) details[open]").count()) + (await p.locator(".tb-day:not(.tb-ok) .tb-one").count()) === 1, "one edited: its day stands open");
  await ctx.close();

  const missing = asCommits(moves.filter((_, i) => i !== 10));
  ({ ctx, p } = await open({ width: 390, height: 844 }, PAGE, { github: missing }));
  ok((await press(p)) === `1 of ${moves.length} moves does not match the public code.`, "one missing: the result counts it");
  await p.waitForSelector(".tb-move-state", { timeout: 15000 }).catch(() => {});
  ok((await p.locator(".tb-move-state").allInnerTexts()).join("|") === "Not in the public code.", "one missing: the move says so");
  await ctx.close();

  ({ ctx, p } = await open({ width: 390, height: 844 }, PAGE, { github: null }));
  ok((await press(p)) === "GitHub did not answer. Each move still links to its commit.", "no answer: the page says so plainly");
  ok((await p.locator(".tb-check button").isEnabled()), "no answer: the check can be pressed again");
  await ctx.close();
}

// 4. With motion reduced, every band is at rest: its lines drawn, its wave gone.
{
  const { ctx, p } = await open({ width: 390, height: 844 }, PAGE, { reduce: true });
  await p.waitForSelector("#trustbase");
  await p.evaluate(() => document.getElementById("trustbase").scrollIntoView());
  await p.waitForTimeout(1200);
  const rest = await p.evaluate(() => [...document.querySelectorAll(".tb-ground")].map((g) => [getComputedStyle(g.querySelector(".tb-lines")).opacity, getComputedStyle(g.querySelector(".tb-wave")).opacity].join("/")));
  ok(rest.length === days.length && rest.every((r) => r === "1/0"), "reduced motion: lines drawn, no wave", [...new Set(rest)].join(" "));
  await ctx.close();
}

// 5. The Wave One card leads to the record.
{
  const { ctx, p } = await open({ width: 390, height: 844 }, "/now-lets-begin");
  await p.waitForSelector("#wave-one", { timeout: 60000 });
  await p.locator("#wave-one .wave-one-views button", { hasText: "Journey" }).click();
  const link = p.locator("#wave-one a.wave-one-all");
  ok((await link.getAttribute("href")) === "/waves/waves-fund#trustbase" && /^Every Move Since \w+ \d+$/.test((await link.innerText()).trim()), "the Wave One card links to every move", await link.innerText().catch(() => "none"));
  await link.scrollIntoViewIfNeeded(); await link.tap();
  await p.waitForSelector("#trustbase", { timeout: 60000 });
  await p.waitForFunction(() => { const t = document.getElementById("trustbase")?.getBoundingClientRect().top; return t !== undefined && t > 40 && t < 200; }, null, { timeout: 15000 }).catch(() => {});
  const top = await p.evaluate(() => Math.round(document.getElementById("trustbase").getBoundingClientRect().top));
  ok(top > 40 && top < 200, "that link lands on The TrustBase", `top ${top}`);
  await ctx.close();
}

// 6. The real GitHub, once, when asked for.
if (live) {
  const { ctx, p } = await open({ width: 390, height: 844 }, PAGE);
  ok((await press(p)) === `All ${moves.length} moves match the public code.`, "live GitHub: every move is in the public code", await p.locator(".tb-result").innerText().catch(() => ""));
  await ctx.close();
}

await b.close();
console.log(failed ? `${failed} FAILED` : "all passed");
process.exit(failed ? 1 : 0);
