// Walk the tour: start it, pick a path, press Next through every step, and record what each step shows.
// Usage: node tourtest.mjs <base> <path> <d|m> [draft vision]
// Playwright: set PLAYWRIGHT_CORE to a playwright-core index.mjs (a file:// URL); see scripts/qa/README.md.
const { chromium } = await import(process.env.PLAYWRIGHT_CORE || "file:///C:/Users/Initi/semble-up-citizens/node_modules/playwright-core/index.mjs");
const [base = "http://127.0.0.1:5197", path = "give", size = "d", draft = ""] = process.argv.slice(2);
const vp = size === "m" ? { width: 390, height: 844 } : { width: 1440, height: 900 };
const b = await chromium.launch({ channel: "chrome", headless: true, args: ["--use-angle=d3d11", "--ignore-gpu-blocklist", "--enable-gpu"] });
const ctx = await b.newContext({ viewport: vp, isMobile: size === "m", hasTouch: size === "m", deviceScaleFactor: 1 });
await ctx.addInitScript((draft) => { try { localStorage.setItem("waves-tour-offered", "1"); if (draft) localStorage.setItem("waves-app-draft", JSON.stringify({ vision: draft })); } catch {} }, draft);
const p = await ctx.newPage(); const errs = [];
p.on("pageerror", (e) => errs.push(String(e).slice(0, 200)));
p.on("console", (m) => { if (m.type() === "error" && !/clerk/i.test(m.text())) errs.push(m.text().slice(0, 200)); });
await p.goto(base + "/learn?tour", { waitUntil: "load" });
await p.waitForSelector(".tour-card.is-choice", { timeout: 60000 }); await p.waitForTimeout(900);
const tag = `${path}_${size}${draft ? "_draft" : ""}`;
await p.screenshot({ path: `vt/tour_${tag}_0choice.jpg`, type: "jpeg", quality: 80 });
const suggested = await p.evaluate(() => document.querySelector(".tour-path.is-suggested b")?.textContent || null);
if (path === "all") await p.click(".tour-all"); else await p.click(`.tour-path:nth-child(${["vision", "guide", "give", "waves"].indexOf(path) + 1})`);
const t0 = Date.now();
for (let n = 1; n < 12; n++) {
  // A step is ready when its Next is enabled; a flight step is ready at once and flies after.
  const end = await p.waitForFunction(() => document.querySelector(".tour-card.is-end") || (document.querySelector(".tour-next") && !document.querySelector(".tour-next").disabled), null, { timeout: 30000 }).then(() => p.$(".tour-card.is-end"));
  if (end) { await p.waitForTimeout(800); await p.screenshot({ path: `vt/tour_${tag}_${n}end.jpg`, type: "jpeg", quality: 80 }); console.log(`${((Date.now() - t0) / 1000).toFixed(1)}s end:`, await p.evaluate(() => document.querySelector(".tour-end .glow-button")?.textContent)); break; }
  const fly = await p.evaluate(() => location.pathname === "/give" && document.querySelector(".tour-practice")?.textContent === "Give" && !document.querySelector(".tour-ring[data-on]"));
  await p.waitForTimeout(fly ? 4500 : 1300);
  if (fly) await p.screenshot({ path: `vt/tour_${tag}_${n}a_flying.jpg`, type: "jpeg", quality: 80 });
  await p.waitForTimeout(fly ? 6000 : 0);
  const s = await p.evaluate(() => ({ at: location.pathname, y: Math.round(scrollY), title: document.querySelector("#tour-title")?.textContent, live: document.querySelector(".tour-live")?.textContent || null, mine: document.querySelector(".tour-mine")?.textContent || null, ring: document.querySelector(".tour-ring")?.dataset.on === "on", ringBox: (() => { const r = document.querySelector(".tour-ring").getBoundingClientRect(); return [Math.round(r.left), Math.round(r.top), Math.round(r.width), Math.round(r.height)]; })(), card: (() => { const r = document.querySelector(".tour-card").getBoundingClientRect(); return [Math.round(r.top), Math.round(r.height)]; })() }));
  console.log(`${((Date.now() - t0) / 1000).toFixed(1)}s step ${n}`, JSON.stringify(s));
  await p.screenshot({ path: `vt/tour_${tag}_${n}.jpg`, type: "jpeg", quality: 80 });
  await p.click(".tour-next");
}
console.log("suggested:", suggested, "| errors:", errs.length ? errs.join(" | ") : "none");
await b.close();
