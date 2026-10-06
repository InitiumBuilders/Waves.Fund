// The first-visit offer, the menu entry, and frame times while scrolling with the ring up (phone, 6x CPU).
// Playwright: set PLAYWRIGHT_CORE to a playwright-core index.mjs (a file:// URL); see scripts/qa/README.md.
const { chromium } = await import(process.env.PLAYWRIGHT_CORE || "file:///C:/Users/Initi/semble-up-citizens/node_modules/playwright-core/index.mjs");
const base = process.argv[2] || "http://127.0.0.1:5197";
const b = await chromium.launch({ channel: "chrome", headless: true, args: ["--use-angle=d3d11", "--ignore-gpu-blocklist", "--enable-gpu"] });
// 1. A first visit to Learn: the offer appears after a few seconds; Take The Tour opens the first question.
{
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
  const p = await ctx.newPage();
  await p.goto(base + "/learn", { waitUntil: "load" });
  const shown = await p.waitForSelector(".tour-offer", { timeout: 20000 }).then(() => true).catch(() => false);
  await p.screenshot({ path: "vt/tour_offer_d.jpg", type: "jpeg", quality: 80 });
  if (shown) { await p.click(".tour-offer-go"); await p.waitForSelector(".tour-card.is-choice", { timeout: 15000 }); }
  console.log("offer shown:", shown, "| opens the tour:", !!(await p.$(".tour-card.is-choice")));
  await p.keyboard.press("Escape"); await p.waitForTimeout(500);
  console.log("Escape ends it:", !(await p.$(".tour-card")));
  await p.reload({ waitUntil: "load" }); await p.waitForTimeout(9000);
  console.log("offer again after it was used:", !!(await p.$(".tour-offer")));
  await ctx.close();
}
// 2. The menu entry.
{
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  await ctx.addInitScript(() => { try { localStorage.setItem("waves-tour-offered", "1"); } catch {} });
  const p = await ctx.newPage();
  await p.goto(base + "/guide", { waitUntil: "load" }); await p.waitForTimeout(2500);
  await p.click(".menu-button"); await p.waitForTimeout(700);
  await p.click(".menu-tour"); await p.waitForTimeout(1200);
  console.log("menu entry opens the tour:", !!(await p.$(".tour-card.is-choice")), "| menu closed:", !(await p.$("dialog[open]")));
  // 3. With the ring up, scroll and measure frames at 6x.
  await p.click(".tour-path:nth-child(3)");   // Give
  await p.waitForTimeout(1500); await p.click(".tour-next");
  await p.waitForFunction(() => document.querySelector(".tour-ring[data-on]"), null, { timeout: 30000 });
  const cdp = await ctx.newCDPSession(p); await cdp.send("Emulation.setCPUThrottlingRate", { rate: 6 });
  const r = await p.evaluate(async () => {
    const f = []; let l = performance.now(), run = true;
    const t = (x) => { f.push(x - l); l = x; if (run) requestAnimationFrame(t); }; requestAnimationFrame(t);
    for (let i = 0; i < 30; i++) { scrollBy(0, 12); await new Promise((d) => setTimeout(d, 60)); }
    for (let i = 0; i < 30; i++) { scrollBy(0, -12); await new Promise((d) => setTimeout(d, 60)); }
    run = false; const s = f.slice(2).sort((a, b) => a - b);
    return `n=${s.length} p50=${s[Math.floor(s.length / 2)].toFixed(1)} p90=${s[Math.floor(s.length * 0.9)].toFixed(1)} long=${s.filter((x) => x > 50).length}`;
  });
  console.log("scrolling with the ring up, 6x:", r);
  await p.screenshot({ path: "vt/tour_ring_m.jpg", type: "jpeg", quality: 80 });
  await ctx.close();
}
await b.close();
