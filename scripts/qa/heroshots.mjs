// The sea heroes on Learn and Waves: desktop and phone, two moments of the rising wave, and a tap on a Wave's light.
// Usage: node heroshots.mjs <base> <tag>   (the tap test needs the dev server: window.__sea is dev only)
// Playwright: set PLAYWRIGHT_CORE to a playwright-core index.mjs (a file:// URL); see scripts/qa/README.md.
const { chromium } = await import(process.env.PLAYWRIGHT_CORE || "file:///C:/Users/Initi/semble-up-citizens/node_modules/playwright-core/index.mjs");
const [base = "http://127.0.0.1:5197", tag = "hero"] = process.argv.slice(2);
const b = await chromium.launch({ channel: "chrome", headless: true, args: ["--use-angle=d3d11", "--ignore-gpu-blocklist", "--enable-gpu"] });
for (const [vp, t] of [[{ width: 1440, height: 900 }, "d"], [{ width: 390, height: 844 }, "m"]]) {
  const ctx = await b.newContext({ viewport: vp, isMobile: vp.width < 500, hasTouch: vp.width < 500, deviceScaleFactor: 1 });
  for (const r of ["/learn", "/waves"]) {
    const p = await ctx.newPage(); const errs = [];
    p.on("console", (m) => { if (m.type() === "error") errs.push(m.text().slice(0, 200)); });
    p.on("pageerror", (e) => errs.push(String(e).slice(0, 200)));
    await p.goto(base + r, { waitUntil: "load" });
    await p.waitForSelector(".sea-hero-scene canvas", { timeout: 60000 });
    // Two moments of the twelve-second rise: the wave mid-water, then near the shore.
    const phase = await p.evaluate(() => (performance.now() / 1000) % 12);
    await p.waitForTimeout(((phase <= 6 ? 6 - phase : 18 - phase)) * 1000);
    const name = r.slice(1);
    await p.screenshot({ path: `vt/${tag}_${t}_${name}_a.jpg`, type: "jpeg", quality: 82 });
    await p.waitForTimeout(3600);
    await p.screenshot({ path: `vt/${tag}_${t}_${name}_b.jpg`, type: "jpeg", quality: 82 });
    if (r === "/waves") {
      await p.waitForSelector(".wave-card", { timeout: 30000 }).catch(() => {}); await p.waitForTimeout(1500);
      const at = await p.evaluate(() => { const s = window.__sea; if (!s) return null; const c = document.querySelector(".sea-hero-scene canvas").getBoundingClientRect(); const q = s.at(0); return q ? { x: c.left + q[0], y: c.top + q[1], n: s.count() } : null; });
      if (at) {
        await p.mouse.click(at.x, at.y); await p.waitForTimeout(600);
        const open = await p.locator("dialog[open], [role='dialog']").count();
        console.log(t, `lights ${at.n}; tapped the first at (${Math.round(at.x)}, ${Math.round(at.y)}):`, open ? "the Wave opened" : "nothing opened");
        await p.screenshot({ path: `vt/${tag}_${t}_${name}_tap.jpg`, type: "jpeg", quality: 82 });
      } else console.log(t, "no __sea on this build (not dev)");
    }
    console.log(t, r, JSON.stringify(await p.evaluate(() => { const el = document.querySelector(".sea-hero-stage"); if (!el) return location.pathname; const s = el.getBoundingClientRect(); return [Math.round(s.top), Math.round(s.height), innerHeight]; })), errs.length ? "ERR " + errs.join(" | ") : "no errors");
    await p.close();
  }
  await ctx.close();
}
await b.close();
