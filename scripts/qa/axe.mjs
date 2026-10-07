// Accessibility audit with axe-core (WCAG 2.2 A/AA): every page at both sizes, plus the open menu and the tour's
// first question and a tour step. Usage: node axe.mjs <base>
// Playwright: set PLAYWRIGHT_CORE to a playwright-core index.mjs (a file:// URL); see scripts/qa/README.md.
const { chromium } = await import(process.env.PLAYWRIGHT_CORE || "file:///C:/Users/Initi/semble-up-citizens/node_modules/playwright-core/index.mjs");
import { readFileSync } from "node:fs";
const base = process.argv[2] || "http://127.0.0.1:5197";
const AXE = readFileSync(process.env.AXE_CORE || new URL("./.a11y/node_modules/axe-core/axe.min.js", import.meta.url), "utf8");
const routes = ["/", "/manifest", "/learn", "/guide", "/guide/library", "/guide/library/listen", "/guide/teachback", "/guide/apply", "/guide/team", "/guide/partners", "/guide/partners/green-reef", "/guide/partners/green-reef/proposal", "/give", "/grow", "/waves", "/apply", "/now-lets-begin", "/privacy", "/nope"];
const b = await chromium.launch({ channel: "chrome", headless: true, args: ["--use-angle=d3d11", "--ignore-gpu-blocklist", "--enable-gpu"] });
const run = async (p) => {
  await p.addScriptTag({ content: AXE });
  return p.evaluate(async () => {
    const r = await window.axe.run(document, { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"] } });
    return r.violations.map((v) => ({ id: v.id, impact: v.impact, n: v.nodes.length, where: v.nodes.slice(0, 2).map((x) => x.target.join(" ")).join(" | "), why: (v.nodes[0]?.failureSummary || "").split("\n").slice(1, 2).join(" ").slice(0, 140) }));
  });
};
let total = 0;
for (const vp of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
  const ctx = await b.newContext({ viewport: vp, isMobile: vp.width < 500, hasTouch: vp.width < 500, bypassCSP: true });
  await ctx.addInitScript(() => { try { localStorage.setItem("waves-tour-offered", "1"); } catch {} });
  for (const r of routes) {
    const p = await ctx.newPage();
    await p.goto(base + r, { waitUntil: "load" }); await p.waitForTimeout(3500);
    await p.evaluate(() => scrollTo(0, document.documentElement.scrollHeight)); await p.waitForTimeout(900); await p.evaluate(() => scrollTo(0, 0)); await p.waitForTimeout(500);
    const v = await run(p); total += v.length;
    if (v.length) console.log(vp.width, r, JSON.stringify(v));
    await p.close();
  }
  // The open menu, the tour's first question, and a lit tour step.
  const p = await ctx.newPage();
  await p.goto(base + "/learn", { waitUntil: "load" }); await p.waitForTimeout(3000);
  await p.click(".menu-button"); await p.waitForTimeout(800);
  let v = await run(p); total += v.length; if (v.length) console.log(vp.width, "menu", JSON.stringify(v));
  await p.keyboard.press("Escape"); await p.waitForTimeout(500);
  await p.goto(base + "/learn?tour", { waitUntil: "load" }); await p.waitForSelector(".tour-card.is-choice", { timeout: 30000 }); await p.waitForTimeout(800);
  v = await run(p); total += v.length; if (v.length) console.log(vp.width, "tour question", JSON.stringify(v));
  await p.click(".tour-path:nth-child(2)"); await p.waitForFunction(() => document.querySelector(".tour-ring[data-on]"), null, { timeout: 30000 }); await p.waitForTimeout(800);
  v = await run(p); total += v.length; if (v.length) console.log(vp.width, "tour step", JSON.stringify(v));
  await p.close(); await ctx.close();
}
console.log("violations:", total);
await b.close();
