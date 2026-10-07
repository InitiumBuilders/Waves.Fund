// For each style difference found by `styles.mjs diff` (GROUPS_JSON), name the rules that set the property on that
// element in both builds, in cascade order (last wins), with their layer. Shows which rule took over and why.
//   node whywin.mjs <old base> <new base> <groups.json> [max groups]
import { readFileSync } from "node:fs";
const { chromium } = await import(process.env.PLAYWRIGHT_CORE || "file:///C:/Users/Initi/semble-up-citizens/node_modules/playwright-core/index.mjs");
const [oldBase, newBase, file, max = "80"] = process.argv.slice(2);
const DERIVED = /^(width|height|inset|right|bottom|grid-template-columns|::before(width|height|top|left)|::after(width|height|top|left))$/;
const SHORT = { "margin-top": ["margin", "margin-block", "margin-block-start"], "margin-bottom": ["margin", "margin-block", "margin-block-end"], "margin-left": ["margin", "margin-inline", "margin-inline-start"], "margin-right": ["margin", "margin-inline", "margin-inline-end"],
  "padding-top": ["padding", "padding-block", "padding-block-start"], "padding-bottom": ["padding", "padding-block", "padding-block-end"], "padding-left": ["padding", "padding-inline", "padding-inline-start"], "padding-right": ["padding", "padding-inline", "padding-inline-end"],
  "font-size": ["font"], "font-weight": ["font"], "line-height": ["font"], "font-family": ["font"], "background-color": ["background"], "background-image": ["background"],
  "border-top-width": ["border", "border-top", "border-width", "border-block", "border-block-start"], "border-top-color": ["border", "border-top", "border-color", "border-block", "border-block-start"],
  top: ["inset", "inset-block", "inset-block-start"], left: ["inset", "inset-inline", "inset-inline-start"], gap: [], "row-gap": ["gap"], "column-gap": ["gap"], "max-width": ["max-inline-size"], "overflow-x": ["overflow"], "overflow-y": ["overflow"], "text-decoration-line": ["text-decoration"] };
const groups = JSON.parse(readFileSync(file, "utf8")).filter((g) => !DERIVED.test(g.prop));
const seen = new Set(); const todo = [];
for (const g of groups) { const tail = g.key.split(">").pop().replace(/:\d+/, ""); const k = tail + "|" + g.prop; if (seen.has(k)) continue; seen.add(k); todo.push(g); if (todo.length >= +max) break; }
const b = await chromium.launch({ channel: "chrome", headless: true, args: ["--use-angle=d3d11", "--ignore-gpu-blocklist", "--enable-gpu"] });
const ctxs = {};
async function open(base, page) {
  const [w, r] = page.split(" ");
  const ck = base + w;
  if (!ctxs[ck]) { ctxs[ck] = await b.newContext({ viewport: { width: +w, height: +w > 500 ? 900 : 844 }, isMobile: +w < 500, hasTouch: +w < 500 }); await ctxs[ck].addInitScript(() => { try { localStorage.setItem("waves-tour-offered", "1"); } catch {} }); }
  const p = await ctxs[ck].newPage();
  const url = r === "menu" ? "/learn" : r === "tour" ? "/learn?tour" : r;
  await p.goto(base + url, { waitUntil: "load", timeout: 60000 }); await p.waitForTimeout(3000);
  for (let i = 0; i < 25; i++) { const end = await p.evaluate(() => { scrollBy(0, innerHeight); return innerHeight + scrollY >= document.documentElement.scrollHeight - 4; }); await p.waitForTimeout(100); if (end) break; }
  await p.evaluate(() => scrollTo(0, 0)); await p.waitForTimeout(500);
  if (r === "menu") { await p.click(".menu-button"); await p.waitForTimeout(800); }
  if (r === "tour") { await p.waitForSelector(".tour-card", { timeout: 30000 }); await p.waitForTimeout(800); }
  const cdp = await p.context().newCDPSession(p);
  await cdp.send("DOM.enable"); await cdp.send("CSS.enable");
  return { p, cdp };
}
async function rules({ p, cdp }, g) {
  const found = await p.evaluate((key) => {
    document.querySelectorAll("[data-whywin]").forEach((e) => e.removeAttribute("data-whywin"));
    let el = document.documentElement;
    for (const part of key.split(">")) { const i = +part.split(":").pop(); el = el && el.children[i]; }
    if (!el) return false; el.setAttribute("data-whywin", "1"); return true;
  }, g.key);
  if (!found) return ["(element not found)"];
  const { root } = await cdp.send("DOM.getDocument", { depth: -1 });
  const { nodeId } = await cdp.send("DOM.querySelector", { nodeId: root.nodeId, selector: "[data-whywin]" });
  if (!nodeId) return ["(no node)"];
  const m = await cdp.send("CSS.getMatchedStylesForNode", { nodeId });
  const pseudo = g.prop.match(/^::(before|after)(.*)$/);
  const prop = pseudo ? pseudo[2] : g.prop;
  let list = m.matchedCSSRules || [];
  if (pseudo) list = (m.pseudoElements || []).find((x) => x.pseudoType === pseudo[1])?.matches || [];
  const names = [prop, ...(SHORT[prop] || [])];
  const out = [];
  for (const { rule } of list) {
    if (rule.origin !== "regular") continue;
    const decl = rule.style.cssProperties.filter((d) => names.includes(d.name) && d.value !== undefined && !d.disabled && d.parsedOk !== false && (d.name === prop || !d.implicit));
    const own = decl.filter((d) => d.name === prop); const use = own.length ? own.slice(-1) : decl.slice(-1);
    if (!use.length) continue;
    const layer = (rule.layers || []).map((l) => l.text).join(".") || "-";
    const sel = rule.selectorList.text.replace(/s+/g, " ").slice(0, 110);
    for (const d of use) out.push(`[${layer}] ${sel} { ${d.name}: ${d.value.slice(0, 50)}${d.important ? " !important" : ""} }`);
  }
  return out.slice(-3);
}
const pages = [...new Set(todo.map((g) => g.page))];
for (const page of pages) {
  const o = await open(oldBase, page), n = await open(newBase, page);
  for (const g of todo.filter((x) => x.page === page)) {
    console.log(`
### ${g.n}x ${g.g}
    ${g.ex}`);
    console.log("  old:"); for (const x of await rules(o, g)) console.log("    " + x);
    console.log("  new:"); for (const x of await rules(n, g)) console.log("    " + x);
  }
  await o.p.close(); await n.p.close();
}
await b.close();
