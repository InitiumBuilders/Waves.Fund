// The words on every page: the visible text inside <main>, after scrolling so lazy blocks arrive, one file per route plus
// a word count table. Usage: node copy.mjs <base> <out dir> [routes]
const { chromium } = await import(process.env.PLAYWRIGHT_CORE || "file:///C:/Users/Initi/semble-up-citizens/node_modules/playwright-core/index.mjs");
import { mkdirSync, writeFileSync } from "node:fs";
const base = process.argv[2] || "https://www.waves.fund";
const out = process.argv[3] || "vt/copy";
const routes = (process.argv[4] || "/,/manifest,/now-lets-begin,/learn,/guide,/guide/library,/guide/library/discovery,/guide/apply,/guide/team,/guide/partners,/guide/partners/green-reef,/guide/partners/green-reef/proposal,/give,/guide/teachback,/grow,/apply,/waves,/privacy").split(",");
mkdirSync(out, { recursive: true });
const b = await chromium.launch({ channel: "chrome", headless: true, args: ["--use-angle=d3d11", "--ignore-gpu-blocklist", "--enable-gpu"] });
const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
await ctx.addInitScript(() => { try { localStorage.setItem("waves-tour-offered", "1"); } catch {} });
const rows = [];
for (const r of routes) {
  const p = await ctx.newPage();
  await p.goto(base + r, { waitUntil: "load", timeout: 60000 });
  await p.waitForTimeout(3000);
  for (let y = 0; y < 30; y++) { const done = await p.evaluate(() => { scrollBy(0, innerHeight * 0.8); return innerHeight + scrollY >= document.documentElement.scrollHeight - 4; }); await p.waitForTimeout(150); if (done) break; }
  const text = await p.evaluate(() => (document.querySelector("main") || document.body).innerText.replace(/\n{3,}/g, "\n\n").trim());
  const words = text.split(/\s+/).filter(Boolean).length;
  const screens = await p.evaluate(() => Math.round((document.documentElement.scrollHeight / innerHeight) * 10) / 10);
  rows.push([r, words, screens]);
  writeFileSync(`${out}/${(r === "/" ? "home" : r.slice(1).replace(/\//g, "_"))}.txt`, text + "\n");
  await p.close();
}
console.log("route".padEnd(42), "words", "screens");
for (const [r, w, s] of rows) console.log(r.padEnd(42), String(w).padStart(5), String(s).padStart(7));
console.log("total words:", rows.reduce((a, x) => a + x[1], 0));
await b.close();
