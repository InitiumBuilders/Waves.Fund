// Playwright: set PLAYWRIGHT_CORE to a playwright-core index.mjs (a file:// URL); see scripts/qa/README.md.
const { chromium } = await import(process.env.PLAYWRIGHT_CORE || "file:///C:/Users/Initi/semble-up-citizens/node_modules/playwright-core/index.mjs");
const [url, selector] = process.argv.slice(2);
const b = await chromium.launch({ channel: "chrome", headless: true });
const p = await (await b.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
await p.goto(url, { waitUntil: "load" }); await p.waitForTimeout(4000); await p.evaluate(() => scrollTo(0, document.documentElement.scrollHeight)); await p.waitForTimeout(1500);
console.log(JSON.stringify(await p.evaluate((selector) => {
  const el = document.querySelector(selector); if (!el) return "not found";
  const chain = []; for (let e = el; e && e.tagName !== "MAIN"; e = e.parentElement) chain.push(e.tagName.toLowerCase() + (e.className ? "." + String(e.className).split(" ").join(".") : ""));
  const out = [];
  const walk = (rules) => { for (const r of rules) { if (r.cssRules && !(r instanceof CSSStyleRule)) { if (!r.media || matchMedia(r.media.mediaText).matches) walk(r.cssRules); continue; } if (r instanceof CSSStyleRule && r.style.fontSize) { try { if (el.matches(r.selectorText)) out.push(`${r.selectorText.slice(0, 80)} => ${r.style.fontSize}${r.style.getPropertyPriority("font-size") ? " !important" : ""}`); } catch {} } } };
  for (const s of document.styleSheets) { try { walk(s.cssRules); } catch {} }
  return { computed: getComputedStyle(el).fontSize, chain: chain.slice(0, 7), rules: out };
}, selector), null, 1));
await b.close();
