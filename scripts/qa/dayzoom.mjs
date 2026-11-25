// A day in the TrustBase opening into its moves and closing back into the day (src/day-zoom.ts), on Wave One's page.
// Every day with more than one move is opened and closed at Safari's first screen on a phone (393x659) and on a
// desktop (1440x900). For each: nothing moves at the moment it opens (the first move stays, the ground and the days
// under it start where they stood); it opens fully; the first move keeps its shape; nothing moves at the moment it
// closes; and it closes back to exactly where it began, with the page's scroll unchanged. Then: with motion off and
// with reduced motion a day opens and closes at once; Enter on a day opens and closes it; a real tap and a real click
// open one. Every wait is for the end state, with a ceiling. GET requests only, so nothing is written anywhere.
//   node scripts/qa/dayzoom.mjs <base> [--webkit]
// Added 2026-11-25 with the zoom.
const webkit = process.argv.includes("--webkit");
const pw = await import(webkit
  ? process.env.PLAYWRIGHT_WEBKIT || "file:///C:/Users/Initi/iphone-duos-sold/node_modules/playwright-core/index.mjs"
  : process.env.PLAYWRIGHT_CORE || "file:///C:/Users/Initi/semble-up-citizens/node_modules/playwright-core/index.mjs");
const base = process.argv.slice(2).find((a) => !a.startsWith("--"));
if (!base) { console.error("usage: node scripts/qa/dayzoom.mjs <base> [--webkit]"); process.exit(2); }
const b = webkit ? await pw.webkit.launch() : await pw.chromium.launch({ channel: "chrome", headless: true, args: ["--use-angle=d3d11", "--ignore-gpu-blocklist", "--enable-gpu"] });
let pass = 0, fail = 0;
const check = (ok, what) => { if (ok) pass++; else fail++; console.log(`${ok ? "pass" : "FAIL"}  ${what}`); };
const VIEWS = {
  phone: { viewport: { width: 393, height: 659 }, deviceScaleFactor: 2, isMobile: webkit ? undefined : true, hasTouch: true },
  desktop: { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 },
};

async function open(view, reduced = false) {
  const ctx = await b.newContext({ ...VIEWS[view], reducedMotion: reduced ? "reduce" : "no-preference" });
  await ctx.route("**/*", (r) => (r.request().method() === "GET" ? r.continue() : r.abort()));
  await ctx.addInitScript(() => { try { localStorage.setItem("waves-tour-offered", "1"); } catch { /* storage may be off */ } });
  const p = await ctx.newPage();
  const errors = [];
  p.on("pageerror", (e) => errors.push(String(e).slice(0, 160)));
  await p.goto(base + "/waves/waves-fund", { waitUntil: "load", timeout: 90000 });
  await p.waitForSelector(".tb-day details", { timeout: 30000 });
  await p.waitForTimeout(webkit ? 3000 : 2000);
  // In the page: the day's parts, and a wait for a condition with a ceiling (timers, not frames: a page in a
  // headless browser can hold its frames back).
  await p.evaluate(() => {
    const Y = (e) => e.getBoundingClientRect().top + scrollY, H = (e) => e.getBoundingClientRect().height;
    window.__dz = {
      days: () => [...document.querySelectorAll(".tb-day")].filter((d) => d.querySelector("details")),
      parts(day) {
        const det = day.querySelector("details"), sum = det.querySelector("summary"), ground = day.querySelector(".tb-ground");
        const next = day.nextElementSibling || document.querySelector(".tb-code");
        const rows = () => [...det.querySelectorAll(".tb-moves > li")];
        const settled = () => !ground.getAnimations().length && !rows().some((r) => r.getAnimations().length);
        return { det, sum, ground, next, rows, settled, first: sum.querySelector(".tb-first") };
      },
      Y, H,
      async until(ok, ms = 3000) { const t0 = performance.now(); while (!ok()) { if (performance.now() - t0 > ms) return false; await new Promise((r) => setTimeout(r, 25)); } return true; },
    };
  });
  return { ctx, p, errors };
}

const near = (a, b) => Math.abs(a - b) <= 0.5;
for (const view of Object.keys(VIEWS)) {
  const { ctx, p, errors } = await open(view);
  const count = await p.evaluate(() => window.__dz.days().length);
  for (let i = 0; i < count; i++) {
    const r = await p.evaluate(async (i) => {
      const { Y, H, until } = window.__dz, day = window.__dz.days()[i], x = window.__dz.parts(day);
      day.scrollIntoView({ block: "center", behavior: "instant" });
      await new Promise((res) => setTimeout(res, 250));
      const b = { sy: scrollY, first: Y(x.first), fh: H(x.first), ground: Y(x.ground), next: Y(x.next) };
      x.sum.click();
      const row0 = x.rows()[0];
      const t0 = { open: x.det.open, row0: Y(row0), ground: Y(x.ground), next: Y(x.next) };
      const opened = await until(() => x.det.open && x.settled());
      const o = { row0: Y(row0), r0h: H(row0), ground: Y(x.ground), next: Y(x.next) };
      x.sum.click();
      const c0 = { row0: Y(row0), ground: Y(x.ground), next: Y(x.next) };
      const closed = await until(() => !x.det.open && x.settled());
      const a = { sy: scrollY, first: Y(x.first), ground: Y(x.ground), next: Y(x.next), mark: x.det.classList.contains("tb-closing") };
      return { day: day.querySelector("time").textContent, n: x.rows().length, b, t0, opened, o, c0, closed, a };
    }, i);
    const name = `${view}, ${r.day} (${r.n} moves)`;
    check(r.t0.open && near(r.t0.row0, r.b.first) && near(r.t0.ground, r.b.ground) && near(r.t0.next, r.b.next), `${name}: nothing moves as it opens`);
    check(r.opened, `${name}: it opens fully`);
    check(near(r.o.r0h, r.b.fh), `${name}: the first move keeps its shape (${r.b.fh.toFixed(1)} and ${r.o.r0h.toFixed(1)} tall)`);
    check(near(r.c0.row0, r.o.row0) && near(r.c0.ground, r.o.ground) && near(r.c0.next, r.o.next), `${name}: nothing moves as it closes`);
    const back = r.closed && !r.a.mark && near(r.a.first, r.b.first) && near(r.a.ground, r.b.ground) && near(r.a.next, r.b.next) && r.a.sy === r.b.sy;
    const f = (x) => x.toFixed(1);
    check(back, `${name}: it closes back to where it began${back ? "" : ` (closed ${r.closed}, mark left ${r.a.mark}, first ${f(r.b.first)} to ${f(r.a.first)}, ground ${f(r.b.ground)} to ${f(r.a.ground)}, next ${f(r.b.next)} to ${f(r.a.next)}, scroll ${r.b.sy} to ${r.a.sy})`}`);
  }
  // Enter on a day opens it and closes it again.
  const keys = await (async () => {
    await p.evaluate(() => { const d = window.__dz.days()[0]; d.scrollIntoView({ block: "center", behavior: "instant" }); d.querySelector("summary").focus(); });
    await p.keyboard.press("Enter");
    const opened = await p.evaluate(() => { const x = window.__dz.parts(window.__dz.days()[0]); return window.__dz.until(() => x.det.open && x.settled()); });
    await p.keyboard.press("Enter");
    const closed = await p.evaluate(() => { const x = window.__dz.parts(window.__dz.days()[0]); return window.__dz.until(() => !x.det.open && x.settled()); });
    return opened && closed;
  })();
  check(keys, `${view}: Enter opens a day and closes it`);
  // A real tap on the phone, a real click on the desktop.
  const summary = p.locator(".tb-day details summary").nth(1);
  await summary.scrollIntoViewIfNeeded();
  if (view === "phone") await summary.tap(); else await summary.click();
  const real = await p.evaluate(() => { const x = window.__dz.parts(window.__dz.days()[1]); return window.__dz.until(() => x.det.open && x.settled()); });
  check(real, `${view}: a real ${view === "phone" ? "tap" : "click"} opens a day`);
  // With motion off a day opens and closes at once.
  const off = await p.evaluate(() => {
    document.documentElement.dataset.motion = "off";
    const x = window.__dz.parts(window.__dz.days()[2]), known = new Set(document.getAnimations());
    x.sum.click(); const opened = x.det.open, quiet = !document.getAnimations().some((a) => !known.has(a));
    x.sum.click(); const closed = !x.det.open;
    delete document.documentElement.dataset.motion;
    return opened && quiet && closed;
  });
  check(off, `${view}: with motion off a day opens and closes at once`);
  check(!errors.length, `${view}: no page errors${errors.length ? ": " + errors.join(" | ") : ""}`);
  await ctx.close();
}
// With reduced motion asked for, a day opens and closes at once.
{
  const { ctx, p } = await open("phone", true);
  const ok = await p.evaluate(() => {
    const x = window.__dz.parts(window.__dz.days()[0]), known = new Set(document.getAnimations());
    x.sum.click(); const opened = x.det.open, quiet = !document.getAnimations().some((a) => !known.has(a));
    x.sum.click(); return opened && quiet && !x.det.open;
  });
  check(ok, "phone: with reduced motion a day opens and closes at once");
  await ctx.close();
}
await b.close();
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
