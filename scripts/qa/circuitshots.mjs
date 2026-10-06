// The circuit between cards: bring each card into view in turn and catch the pulse mid-trace, then landed.
// Usage: node circuitshots.mjs <base> <tag>
// Playwright: set PLAYWRIGHT_CORE to a playwright-core index.mjs (a file:// URL); see scripts/qa/README.md.
const { chromium } = await import(process.env.PLAYWRIGHT_CORE || "file:///C:/Users/Initi/semble-up-citizens/node_modules/playwright-core/index.mjs");
const [base = "http://127.0.0.1:5197", tag = "circ"] = process.argv.slice(2);
const b = await chromium.launch({ channel: "chrome", headless: true, args: ["--use-angle=d3d11", "--ignore-gpu-blocklist", "--enable-gpu"] });
const BEAT = 1500;
for (const [vp, t] of [[{ width: 1440, height: 900 }, "d"], [{ width: 390, height: 844 }, "m"]]) {
  const ctx = await b.newContext({ viewport: vp, isMobile: vp.width < 500, hasTouch: vp.width < 500, deviceScaleFactor: 1 });
  for (const [r, sel] of [["/learn", ".cascade"], ["/learn", ".roadmap"], ["/guide", ".guide-cascade"], ["/guide/library", ".guide-lesson-grid"]]) {
    const p = await ctx.newPage(); const errs = [];
    p.on("console", (m) => { if (m.type() === "error") errs.push(m.text().slice(0, 200)); });
    p.on("pageerror", (e) => errs.push(String(e).slice(0, 200)));
    await p.goto(base + r, { waitUntil: "load" }); await p.waitForSelector(sel, { timeout: 60000 }); await p.waitForTimeout(3500);
    // Card 1 in the middle of the screen, then card 2: the pulse leaves on the next beat.
    const show = async (i) => p.evaluate(([sel, i]) => { const c = document.querySelector(sel).children[i]; const r = c.getBoundingClientRect(); scrollTo(0, scrollY + r.top - innerHeight * 0.45); }, [sel, i]);
    await show(0); await p.waitForTimeout(1200);
    await show(1);
    // Wait for the beat the pulse starts on, then a third of a beat into its travel.
    const phase = await p.evaluate(() => (performance.now() % 1500));
    await p.waitForTimeout(1500 - phase + BEAT * 0.4);
    const name = (r.slice(1) + "_" + sel.replace(/\W/g, "")).replace(/\//g, "_");
    await p.screenshot({ path: `vt/${tag}_${t}_${name}_mid.jpg`, type: "jpeg", quality: 84 });
    await p.waitForTimeout(BEAT * 2.2);
    await p.screenshot({ path: `vt/${tag}_${t}_${name}_landed.jpg`, type: "jpeg", quality: 84 });
    const state = await p.evaluate((sel) => { const l = document.querySelector(sel).parentElement; return { lit: [...document.querySelectorAll(sel + " > .is-lit")].length, live: l.querySelectorAll(".trace-live.is-live").length, pads: l.querySelectorAll(".pad.is-lit").length, pulses: l.querySelectorAll(".circuit-pulse").length, traces: l.querySelectorAll(".trace").length }; }, sel);
    console.log(t, r, sel, JSON.stringify(state), errs.length ? "ERR " + errs.join(" | ") : "no errors");
    await p.close();
  }
  await ctx.close();
}
await b.close();
