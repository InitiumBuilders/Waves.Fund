// Playwright: set PLAYWRIGHT_CORE to a playwright-core index.mjs (a file:// URL); see scripts/qa/README.md.
const { chromium } = await import(process.env.PLAYWRIGHT_CORE || "file:///C:/Users/Initi/semble-up-citizens/node_modules/playwright-core/index.mjs");
const base = process.argv[2] || "http://127.0.0.1:5197";
const b = await chromium.launch({ channel: "chrome", headless: true, args: ["--use-angle=d3d11", "--ignore-gpu-blocklist", "--enable-gpu"] });
for (const [vp, t] of [[{ width: 1440, height: 900 }, "d"], [{ width: 390, height: 844 }, "m"]]) {
  const p = await (await b.newContext({ viewport: vp, isMobile: vp.width < 500, hasTouch: vp.width < 500 })).newPage();
  await p.goto(`${base}/give/guide?as=dev_maya`, { waitUntil: "load" }); await p.waitForTimeout(8000);
  const moment = await p.$("dialog.gt-moment[open]");
  console.log(t, "moment open:", !!moment, moment ? JSON.stringify(await p.evaluate(() => [...document.querySelectorAll(".gt-moment-common li")].map((l) => l.textContent))) : "");
  await p.screenshot({ path: `vt/moment_${t}.jpg`, type: "jpeg", quality: 80 });
  if (moment) { await p.click(".gt-moment-close"); await p.waitForTimeout(1500); }
  await p.screenshot({ path: `vt/guidepage_${t}.jpg`, type: "jpeg", quality: 80 });
  await p.evaluate(() => scrollTo(0, innerHeight * 0.9)); await p.waitForTimeout(1200);
  await p.screenshot({ path: `vt/guidepage_${t}_2.jpg`, type: "jpeg", quality: 80 });
  await p.close();
}
await b.close();
