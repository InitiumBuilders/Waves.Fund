// Computed styles of every element on every page, at two sizes, for comparing two builds of a CSS change that should
// look the same. Animations are paused at their start so two runs agree.
//   node styles.mjs snap <base> <out.json>      record
//   node styles.mjs diff <a.json> <b.json>      list what differs, grouped by selector and property
import { readFileSync, writeFileSync } from "node:fs";
const [mode, x, y] = process.argv.slice(2);
const PROPS = ["display", "position", "top", "right", "bottom", "left", "z-index", "width", "height", "min-height", "max-width",
  "margin-top", "margin-right", "margin-bottom", "margin-left", "padding-top", "padding-right", "padding-bottom", "padding-left",
  "gap", "row-gap", "column-gap", "grid-template-columns", "flex-direction", "justify-content", "align-items", "font-family", "font-size",
  "font-weight", "line-height", "letter-spacing", "text-transform", "text-align", "color", "background-color", "background-image",
  "border-top-width", "border-top-color", "border-radius", "box-shadow", "opacity", "transform", "visibility", "overflow-x", "overflow-y",
  "filter", "backdrop-filter", "pointer-events", "cursor", "outline-style", "text-decoration-line", "white-space", "mix-blend-mode", "inset"];
const ROUTES = (process.env.ROUTES || "/,/manifest,/now-lets-begin,/learn,/guide,/guide/library,/guide/library/listen,/guide/apply,/guide/team,/guide/partners,/guide/partners/green-reef,/guide/partners/green-reef/proposal,/guide/partners/semble,/guide/partners/ocean97,/give,/give/guide,/guide/teachback,/grow,/apply,/waves,/privacy,/trax,/nope").split(",");

if (mode === "snap") {
  const { chromium } = await import(process.env.PLAYWRIGHT_CORE || "file:///C:/Users/Initi/semble-up-citizens/node_modules/playwright-core/index.mjs");
  const b = await chromium.launch({ channel: "chrome", headless: true, args: ["--use-angle=d3d11", "--ignore-gpu-blocklist", "--enable-gpu"] });
  const snap = {};
  for (const vp of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
    const ctx = await b.newContext({ viewport: vp, isMobile: vp.width < 500, hasTouch: vp.width < 500 });
    await ctx.addInitScript(() => { try { localStorage.setItem("waves-tour-offered", "1"); } catch {} });
    for (const r of [...ROUTES, "menu", "tour"]) {
      const p = await ctx.newPage();
      const url = r === "menu" ? "/learn" : r === "tour" ? "/learn?tour" : r;
      await p.goto(x + url, { waitUntil: "load", timeout: 60000 });
      await p.waitForTimeout(3500);
      for (let i = 0; i < 25; i++) { const end = await p.evaluate(() => { scrollBy(0, innerHeight); return innerHeight + scrollY >= document.documentElement.scrollHeight - 4; }); await p.waitForTimeout(120); if (end) break; }
      await p.evaluate(() => scrollTo(0, 0)); await p.waitForTimeout(600);
      if (r === "menu") { await p.click(".menu-button"); await p.waitForTimeout(900); }
      if (r === "tour") { await p.waitForSelector(".tour-card", { timeout: 30000 }); await p.waitForTimeout(900); }
      const rows = await p.evaluate((PROPS) => {
        for (const a of document.getAnimations()) { try { a.pause(); a.currentTime = 0; } catch {} }
        const key = (el) => { const parts = []; for (let e = el; e && e !== document.documentElement; e = e.parentElement) { const i = e.parentElement ? [...e.parentElement.children].indexOf(e) : 0; parts.unshift(`${e.tagName.toLowerCase()}${e.classList.length ? "." + [...e.classList].filter((c) => !/^is-|^arrive|in-view|lit|fed|live/.test(c)).join(".") : ""}:${i}`); } return parts.join(">"); };
        const out = {};
        for (const el of document.querySelectorAll("body *")) {
          if (/^(SCRIPT|STYLE|LINK|META|NOSCRIPT|TEMPLATE|PATH|G|DEFS|STOP|LINEARGRADIENT|RADIALGRADIENT|CIRCLE|RECT|LINE|POLYLINE|POLYGON|ELLIPSE|USE|SYMBOL|MASK|CLIPPATH|FILTER|FE[A-Z]*)$/i.test(el.tagName)) continue;
          if (el.closest("[class*='cl-']")) continue;
          const cs = getComputedStyle(el); const v = {};
          for (const p of PROPS) v[p] = cs.getPropertyValue(p);
          for (const pseudo of ["::before", "::after"]) { const ps = getComputedStyle(el, pseudo); if (ps.content && ps.content !== "none" && ps.content !== "normal") for (const p of ["content", "width", "height", "background-color", "background-image", "opacity", "transform", "color", "font-size", "top", "left"]) v[pseudo + p] = ps.getPropertyValue(p); }
          out[key(el)] = v;
        }
        return out;
      }, PROPS);
      snap[`${vp.width} ${r}`] = rows;
      process.stdout.write(`${vp.width} ${r} ${Object.keys(rows).length}\n`);
      await p.close();
    }
    await ctx.close();
  }
  writeFileSync(y, JSON.stringify(snap));
  await b.close();
} else if (mode === "diff") {
  const A = JSON.parse(readFileSync(x, "utf8")), B = JSON.parse(readFileSync(y, "utf8"));
  const groups = new Map(); let missing = 0;
  for (const page of Object.keys(A)) {
    const a = A[page], bb = B[page] || {};
    for (const k of Object.keys(a)) {
      if (!bb[k]) { missing++; continue; }
      for (const p of Object.keys(a[k])) {
        if (a[k][p] === bb[k][p]) continue;
        const sel = k.split(">").slice(-2).join(" > ").replace(/:\d+/g, "");
        const g = `${sel} | ${p}`;
        if (!groups.has(g)) groups.set(g, { n: 0, ex: `${page}: ${String(a[k][p]).slice(0, 70)} -> ${String(bb[k][p]).slice(0, 70)}`, page, key: k, prop: p });
        groups.get(g).n++;
      }
    }
  }
  const list = [...groups.entries()].sort((p, q) => q[1].n - p[1].n);
  for (const [g, { n, ex }] of list) console.log(String(n).padStart(5), g, "\n        ", ex);
  console.log("groups:", list.length, "| elements missing in b:", missing);
  if (process.env.GROUPS_JSON) writeFileSync(process.env.GROUPS_JSON, JSON.stringify(list.map(([g, v]) => ({ g, ...v }))));
}
