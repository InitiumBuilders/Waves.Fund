// Playwright: set PLAYWRIGHT_CORE to a playwright-core index.mjs (a file:// URL); see scripts/qa/README.md.
//   node scripts/qa/smoke2.mjs <base> [--webkit]
// --webkit runs the same pages in WebKit, the engine of every iPhone browser (PLAYWRIGHT_WEBKIT, or the copy below).
const webkit = process.argv.includes("--webkit");
const pw = await import(webkit
  ? process.env.PLAYWRIGHT_WEBKIT || "file:///C:/Users/Initi/iphone-duos-sold/node_modules/playwright-core/index.mjs"
  : process.env.PLAYWRIGHT_CORE || "file:///C:/Users/Initi/semble-up-citizens/node_modules/playwright-core/index.mjs");
const base = process.argv[2];
const routes = ["/", "/manifest", "/film", "/now-lets-begin", "/learn", "/guide", "/guide/library", "/guide/library/discovery", "/guide/apply", "/guide/team", "/guide/partners", "/guide/partners/green-reef", "/guide/partners/semble", "/guide/partners/ocean97", "/give", "/give/guide", "/guide/teachback", "/grow", "/apply", "/projects", "/waves", "/waves/waves-fund", "/privacy", "/nope"];
const b = webkit ? await pw.webkit.launch() : await pw.chromium.launch({ channel: "chrome", headless: true, args: ["--use-angle=d3d11", "--ignore-gpu-blocklist", "--enable-gpu"] });
for (const vp of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
  // A context that only reads: every request other than GET is refused (Clerk's development sign-in sends one POST
  // on some loads). isMobile is a Chrome setting; WebKit takes the viewport and touch.
  const open = async () => {
    const c = await b.newContext({ viewport: vp, isMobile: webkit ? undefined : vp.width < 500, hasTouch: vp.width < 500 });
    c.refused = 0;
    await c.route("**/*", (r) => { if (r.request().method() === "GET") return r.continue(); c.refused++; return r.abort(); });
    return c;
  };
  // WebKit takes WebGL contexts away once about 16 are open, counting pages that closed but are not yet collected,
  // so in one shared context it logs "WebGL: context lost." on later routes. There each route gets its own context,
  // one at a time.
  const shared = webkit ? null : await open();
  const batch = webkit ? 1 : 6;
  let bad = 0;
  for (let i = 0; i < routes.length; i += batch) {
    await Promise.all(routes.slice(i, i + batch).map(async (r) => {
      const ctx = shared || (await open());
      const p = await ctx.newPage(); const errs = []; const before = ctx.refused;
      // WebKit reports a refused request as "Load failed"; it counts unless this rig refused a write on this page.
      p.on("console", (m) => { if (m.type() === "error" && !/clerk|ERR_SSL|Failed to load resource/i.test(m.text()) && !(webkit && ctx.refused > before && /Load failed/.test(m.text()))) errs.push(m.text().slice(0, 150)); });
      p.on("pageerror", (e) => errs.push("PAGEERROR " + String(e).slice(0, 150)));
      await p.goto(base + r, { waitUntil: "load", timeout: 60000 }).catch((e) => errs.push("GOTO " + e.message.slice(0, 80)));
      await p.waitForTimeout(webkit ? 5000 : 3500);
      await p.evaluate(() => scrollTo(0, document.documentElement.scrollHeight * 0.6)); await p.waitForTimeout(800);
      if (errs.length) { bad++; console.log(vp.width, r, errs.join(" | ")); }
      await p.close();
      if (!shared) await ctx.close();
    }));
  }
  console.log(webkit ? "webkit" : "chrome", vp.width, "routes with errors:", bad);
  if (shared) await shared.close();
}
await b.close();
