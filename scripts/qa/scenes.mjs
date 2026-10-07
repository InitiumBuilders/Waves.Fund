// Share-card scenes from the sea: the hero with its words, header and field hidden, cropped around the first light.
// Usage: node scenes.mjs <base>   writes share/scene-learn-<phase>.png and share/scene-waves-<phase>.png
const { chromium } = await import(process.env.PLAYWRIGHT_CORE || "file:///C:/Users/Initi/semble-up-citizens/node_modules/playwright-core/index.mjs");
import { mkdir } from "node:fs/promises";
const base = process.argv[2] || "http://127.0.0.1:5197";
await mkdir("share", { recursive: true });
const b = await chromium.launch({ channel: "chrome", headless: true, args: ["--use-angle=d3d11", "--ignore-gpu-blocklist", "--enable-gpu"] });
const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
for (const r of (process.argv[3] || "learn,waves").split(",")) {
  const p = await ctx.newPage();
  await p.goto(`${base}/${r}`, { waitUntil: "load" });
  await p.waitForSelector(".sea-hero-scene canvas", { timeout: 60000 });
  await p.addStyleTag({ content: ".sea-hero-copy, .app-header, .bottom-nav, .mind-canvas, .mind-liquid { visibility: hidden !important; }" });
  if (r === "waves") await p.waitForSelector(".wave-card", { timeout: 30000 }).catch(() => {});
  if (r === "manifest") await p.waitForTimeout(13000);   // every light has come up
  await p.waitForTimeout(2500);
  // Three moments of the twelve-second rise, so the best one can be chosen by eye.
  for (const at of [4.5, 6.5, 8.5]) {
    const phase = await p.evaluate(() => (performance.now() / 1000) % 12);
    await p.waitForTimeout((((at - phase) % 12) + 12) % 12 * 1000);
    const light = await p.evaluate(() => { const c = document.querySelector(".sea-hero-scene canvas").getBoundingClientRect(); const q = window.__sea?.at(0); return { x: c.left + (q ? q[0] : c.width * 0.6), top: c.top, h: c.height, w: c.width }; });
    const W = 900, x = Math.round(Math.min(light.w - W, Math.max(0, light.x - W / 2)));
    await p.screenshot({ path: `share/scene-${r}-${String(at).replace(".", "")}.png`, type: "png", clip: { x, y: Math.round(light.top), width: W, height: Math.round(light.h) } });
    console.log(r, "phase", at, "light x", Math.round(light.x), "crop x", x);
  }
  await p.close();
}
await b.close();
