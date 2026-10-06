// Playwright: set PLAYWRIGHT_CORE to a playwright-core index.mjs (a file:// URL); see scripts/qa/README.md.
const { chromium } = await import(process.env.PLAYWRIGHT_CORE || "file:///C:/Users/Initi/semble-up-citizens/node_modules/playwright-core/index.mjs");
const base = process.argv[2] || "http://127.0.0.1:5197", tag = process.argv[3] || "menu";
const b = await chromium.launch({ channel: "chrome", headless: true, args: ["--use-angle=d3d11", "--ignore-gpu-blocklist", "--enable-gpu"] });
for (const [vp, t] of [[{ width: 390, height: 844 }, "m"], [{ width: 1440, height: 900 }, "d"]]) {
  const p = await (await b.newContext({ viewport: vp, isMobile: vp.width < 500, hasTouch: vp.width < 500 })).newPage();
  await p.goto(base + "/learn", { waitUntil: "load" }); await p.waitForTimeout(3000);
  await p.click(".menu-button"); await p.waitForTimeout(900);
  await p.screenshot({ path: `vt/${tag}_${t}.jpg`, type: "jpeg", quality: 80 });
  const h = await p.evaluate(() => { const d = document.querySelector("dialog[open]"); return d ? [d.scrollHeight, d.clientHeight] : null; });
  console.log(t, "menu height (content/visible):", JSON.stringify(h));
  await p.close();
}
await b.close();
