// A browser may take a page's WebGL contexts away and give them back later. An iPhone does it to a page left in the
// background. This takes every context away (WEBGL_lose_context), gives it back, and checks that each scene draws
// again by itself and is shown again, with no reload and nothing thrown. Four cases for each page and size:
//   1. the page at rest (then a scene further down the page is scrolled to, and must draw);
//   2. the worst moment, just after each context is made, while its programs are still compiling;
//   3. a context handed out already lost (WebKit did this to the lattice's second canvas on 2026-11-21);
//   4. a browser that cannot keep a context: it is taken again as soon as the scene is rebuilt. The scene must stop
//      asking for it (mind/programs.ts, keeper) and rest on its still form, not rebuild for ever.
//   node scripts/qa/contexts.mjs <base> [route ...] [--webkit]
// --webkit runs the same cases in WebKit at the iPhone 15's size only. In WebKit a context taken this way is a
// synthetic loss, which comes back only through restoreContext(); WebKit's own returns after a real loss (retried
// every second once the page is in front) cannot be made from a test, and are read from its source instead.
// Until 2026-11-21 the lattice never asked for its context back, the sea showed one still light for good, a context
// taken during the first compile was read as a failed compile, and one handed out lost gave the lattice's still
// picture for the rest of the visit.
const webkit = process.argv.includes("--webkit");
const pw = await import(webkit
  ? process.env.PLAYWRIGHT_WEBKIT || "file:///C:/Users/Initi/iphone-duos-sold/node_modules/playwright-core/index.mjs"
  : process.env.PLAYWRIGHT_CORE || "file:///C:/Users/Initi/semble-up-citizens/node_modules/playwright-core/index.mjs");
const args = process.argv.slice(2).filter((a) => !a.startsWith("--"));
// A page that opens on the sea, the home page (the lattice alone), and the Give page (two seas on one page). The
// ripple scene is drawn only for signed-in members, which no check here can reach; it handles a loss as the sea does.
const base = args[0], routes = args.slice(1).length ? args.slice(1) : ["/waves/waves-fund", "/", "/give"];
if (!base) { console.error("usage: node scripts/qa/contexts.mjs <base> [route ...] [--webkit]"); process.exit(2); }
const SIZES = webkit ? [[393, 659, "phone"]] : [[393, 659, "phone"], [1440, 900, "wide"]];
// WebKit on this machine compiles shaders in software and takes many seconds a page, so its waits are longer.
const SLOW = webkit ? 3 : 1;
let pass = 0, fail = 0;
const check = (ok, what) => { ok ? pass++ : fail++; console.log(`${ok ? "pass" : "FAIL"}  ${what}`); };

// Runs in the page before anything else. mode "early": take each context away just after it is made and give it
// back 1.2 s after the page hears the loss. "born": take it before the page has it, so the page is handed a lost
// context, and give it back the same way. "never": take it just after it is made, offer it back 300 ms after every
// loss, and take it again 50 ms after every return. Returns are timed from the loss event, not from the clock: a
// page busy compiling (WebKit here) hears the loss late, and a return offered before it has answered is refused.
const setup = (mode) => {
  try { localStorage.setItem("waves-tour-offered", "1"); } catch { /* storage may be off */ }
  // Every canvas that is given a WebGL context, with the context, so none has to be asked for from outside.
  window.__ctx = [];
  const orig = HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext = function (type, ...rest) {
    const got = orig.call(this, type, ...rest);
    if (got && String(type).startsWith("webgl") && !window.__ctx.some((x) => x.c === this)) {
      const ext = got.getExtension("WEBGL_lose_context");
      const x = { c: this, gl: got, ext, lost: 0, returned: 0, name: (this.className || this.parentElement?.className || "canvas").split(" ").slice(0, 2).join(".") };
      window.__ctx.push(x);
      const offer = { early: 1200, born: 1200, never: 300 }[mode];
      // The page's own listener runs in the same dispatch as this one, so by the time the offer comes it has answered.
      this.addEventListener("webglcontextlost", () => { x.lost++; if (offer && ext && (mode === "never" || x.lost === 1)) setTimeout(() => ext.restoreContext(), offer); });
      this.addEventListener("webglcontextrestored", () => { x.returned++; if (mode === "never") setTimeout(() => ext.loseContext(), 50); });
      if ((mode === "early" || mode === "never") && ext) setTimeout(() => ext.loseContext(), 0);
      if (mode === "born" && ext) ext.loseContext();
    }
    return got;
  };
  // How much of each canvas is drawn: the share of sampled pixels that are not empty, read right after the page's
  // own drawing in the same frame (the buffer is emptied once the frame is shown). The most over 40 frames.
  window.__drawn = () => new Promise((done) => {
    const best = window.__ctx.map(() => 0); let n = 0;
    const frame = () => {
      window.__ctx.forEach((x, i) => {
        if (x.gl.isContextLost() || !x.c.isConnected) return;
        const W = x.gl.drawingBufferWidth, H = x.gl.drawingBufferHeight, px = new Uint8Array(W * H * 4);
        x.gl.bindFramebuffer(x.gl.FRAMEBUFFER, null);
        x.gl.readPixels(0, 0, W, H, x.gl.RGBA, x.gl.UNSIGNED_BYTE, px);
        let lit = 0, all = 0;
        for (let k = 3; k < px.length; k += 4 * 7) { all++; if (px[k] > 8) lit++; }
        best[i] = Math.max(best[i], lit / all);
      });
      if (++n < 40) { dispatchEvent(new Event("scroll")); requestAnimationFrame(frame); } else done(best);
    };
    requestAnimationFrame(frame);
  });
  const onScreen = (el) => { const r = el.getBoundingClientRect(); return el.isConnected && r.width > 0 && r.height > 0 && r.bottom > 0 && r.top < innerHeight; };
  window.__state = () => ({
    names: window.__ctx.map((x) => x.name),
    lost: window.__ctx.filter((x) => x.gl.isContextLost()).map((x) => x.name),
    still: [...document.querySelectorAll(".ripple")].filter((e) => e.querySelector("canvas") && e.dataset.still === "on").length,
    seas: [...document.querySelectorAll(".ripple")].filter((e) => e.querySelector("canvas")).length,
    fallback: !!document.querySelector(".mind-fallback"),
    seaWanted: !!document.querySelector(".sea-hero"),
    losses: window.__ctx.map((x) => x.lost),
    returned: window.__ctx.map((x) => x.returned),
    // A scene draws only while it is on screen; one further down the page waits until it is scrolled to.
    inView: window.__ctx.map((x) => onScreen(x.c)),
    // What a visitor sees of each sea on screen: drawing into its buffer is not enough, its canvas must be shown
    // (a sea fades its canvas in once its programs are ready, data-ready).
    shown: [...document.querySelectorAll(".ripple")].filter((e) => e.querySelector("canvas") && onScreen(e)).map((e) => e.dataset.ready === "on" && getComputedStyle(e.querySelector("canvas")).opacity === "1"),
  });
};
// The liquid layer draws only where a page has vessels, so an empty one says nothing; a scene off screen draws nothing.
const drawing = (s, drawn) => s.names.every((n, i) => n.includes("mind-liquid") || !s.inView[i] || drawn[i] > 0.002);
const list = (s, key) => s.names.map((n, i) => `${n} ${s[key][i]}`).join(", ");

const b = webkit ? await pw.webkit.launch() : await pw.chromium.launch({ channel: "chrome", headless: true, args: ["--use-angle=d3d11", "--ignore-gpu-blocklist", "--enable-gpu"] });
const contextFor = (w, h, size) => webkit
  ? b.newContext({ ...pw.devices["iPhone 15"] })
  : b.newContext({ viewport: { width: w, height: h }, isMobile: size === "phone", hasTouch: size === "phone" });
// A browser just opened takes seconds over its first page, because it is still starting up. Let it open one first,
// refusing every write as the cases below do.
{
  const wc = await contextFor(393, 659, "phone");
  await wc.route("**/*", (r) => (r.request().method() === "GET" ? r.continue() : r.abort()));
  const warm = await wc.newPage();
  await warm.goto(base + routes[0], { waitUntil: "load", timeout: 90000 * SLOW }).catch(() => {});
  await warm.waitForTimeout(8000);
  await wc.close();
}

async function open(w, h, size, route, mode) {
  const ctx = await contextFor(w, h, size);
  // Nothing but plain reads leaves this check. (The Give pages' sign-in service opens with a write, which is blocked.)
  let blocked = 0;
  await ctx.route("**/*", (r) => { if (r.request().method() === "GET") return r.continue(); blocked++; return r.abort(); });
  await ctx.route("**/api/community*", (r) => r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ projects: [], guides: 1 }) }));
  await ctx.addInitScript(setup, mode);
  const p = await ctx.newPage();
  const notes = [];
  p.on("console", (m) => {
    const t = m.text();
    // A request this check blocked echoes in the console as a failed load and a failed fetch; those lines are its own.
    if (blocked && (/Failed to load resource: net::ERR_FAILED/.test(t) || /^TypeError: Failed to fetch/.test(t))) return;
    if (m.type() === "error" || /WebGL/.test(t)) notes.push(`${m.type()}: ${t.slice(0, 150)}`);
  });
  p.on("pageerror", (e) => notes.push("page error: " + String(e.message).slice(0, 150)));
  await p.goto(base + route, { waitUntil: "load", timeout: 90000 * SLOW });
  // The page itself first: its title, so a scene that has not been mounted yet is not missed.
  await p.waitForSelector("main h1", { timeout: 60000 * SLOW }).catch(() => {});
  // A browser that never keeps a context: give the page time to settle, then read where it came to rest.
  if (mode === "never") {
    await p.waitForFunction(() => !document.querySelector(".sea-hero") || !!document.querySelector(".sea-hero .ripple canvas"), null, { timeout: 60000 * SLOW }).catch(() => {});
    await p.waitForTimeout(6000 * SLOW);
    return { ctx, p, notes, s: await p.evaluate(() => window.__state()), drawn: [] };
  }
  // Wait until the page's scenes are up, drawing and shown (up to 30 s), so nothing is judged while it is arriving.
  let s = await p.evaluate(() => window.__state()), drawn = [];
  for (let i = 0; i < 60 * SLOW; i++) {
    await p.waitForTimeout(500);
    s = await p.evaluate(() => window.__state());
    if (s.fallback) break;
    if (!s.names.length || s.lost.length || (s.seaWanted && !s.seas) || !s.shown.every(Boolean)) continue;
    drawn = await p.evaluate(() => window.__drawn());
    if (drawing(s, drawn)) break;
  }
  return { ctx, p, notes, s, drawn };
}
const said = (notes) => (notes.length ? ": " + [...new Set(notes)].slice(0, 4).join(" ; ") : "");

for (const [w, h, size] of SIZES) {
  for (const route of routes) {
    // 1. The page at rest: take every context, then give every one back.
    {
      const where = `${size} ${route}`;
      const { ctx, p, notes, s, drawn: first } = await open(w, h, size, route, "rest");
      // A page still filling in changes how much of the lattice shows (the Give guide's lattice draws almost nothing
      // for its first ten seconds). The reading to compare against is taken once two readings 2 s apart agree.
      let before = first;
      for (let i = 0; i < 10 && !s.fallback; i++) {
        await p.waitForTimeout(2000);
        const now = await p.evaluate(() => window.__drawn());
        const steady = now.every((v, k) => Math.abs(v - (before[k] ?? 0)) <= 0.25 * Math.max(v, before[k] ?? 0) + 0.001);
        before = now;
        if (steady) break;
      }
      check(s.names.length > 0 && !s.fallback && drawing(s, before), `${where}: ${s.names.length} scenes drawing (${s.names.join(", ")})`);
      if (s.seas) check(s.shown.length > 0 && s.shown.every(Boolean), `${where}: each sea on screen is shown (ready, fully opaque)`);
      await p.evaluate(() => window.__ctx.forEach((x) => x.ext?.loseContext()));
      await p.waitForTimeout(600 * SLOW);
      const gone = await p.evaluate(() => window.__state());
      check(gone.lost.length === gone.names.length, `${where}: every context is lost`);
      if (gone.seas) check(gone.still === gone.seas, `${where}: a scene without its context shows its still light`);
      await p.evaluate(() => window.__ctx.forEach((x) => x.ext?.restoreContext()));
      // Wait for the scenes to come back, draw and be shown (up to 15 s), so a slow rebuild is not read as none.
      let back = gone, after = [];
      for (let i = 0; i < 30 * SLOW; i++) {
        await p.waitForTimeout(500);
        back = await p.evaluate(() => window.__state());
        if (back.fallback) break;
        if (back.lost.length || back.still || !back.shown.every(Boolean)) continue;
        after = await p.evaluate(() => window.__drawn());
        if (s.names.every((n, k) => before[k] < 0.002 || after[k] > before[k] * 0.5)) break;
      }
      check(back.lost.length === 0, `${where}: every context is back`);
      if (back.seas) check(back.still === 0, `${where}: no scene is left on its still light`);
      if (back.seas) check(back.shown.length > 0 && back.shown.every(Boolean), `${where}: each sea on screen is shown again (ready, fully opaque)`);
      check(!back.fallback, `${where}: the lattice is drawn, not replaced by the still picture`);
      s.names.forEach((name, i) => {
        if (before[i] < 0.002) return;
        check(after[i] > before[i] * 0.5, `${where}: ${name} draws again (${(before[i] * 100).toFixed(1)}% of its pixels before, ${(after[i] * 100).toFixed(1)}% after)`);
      });
      // A scene below the first screen gets ready only when it is scrolled to (a scene draws only in view). After the
      // loss and the return, scroll to each one and see it draw and be shown.
      const below = s.names.map((n, i) => (s.inView[i] || n.startsWith("mind-") ? -1 : i)).filter((i) => i >= 0);
      for (const i of below) {
        await p.evaluate((k) => window.__ctx[k].c.scrollIntoView({ block: "center" }), i);
        let got = 0, shown = false;
        for (let t = 0; t < 12 * SLOW && !(got > 0.002 && shown); t++) {
          await p.waitForTimeout(500);
          got = (await p.evaluate(() => window.__drawn()))[i] || 0;
          shown = await p.evaluate((k) => { const e = window.__ctx[k].c.parentElement; return e?.dataset.ready === "on" && getComputedStyle(window.__ctx[k].c).opacity === "1"; }, i);
        }
        check(got > 0.002 && shown, `${where}: ${s.names[i]} further down draws and is shown once scrolled to (${(got * 100).toFixed(1)}% of its pixels)`);
      }
      check(notes.length === 0, `${where}: nothing thrown or logged${said(notes)}`);
      await ctx.close();
    }
    // 2 and 3. Each context taken just after it is made, or handed out already lost; each comes back 1.2 s later.
    for (const [mode, label] of [["early", "taken while compiling"], ["born", "handed out already lost"]]) {
      const where = `${size} ${route}, ${label}`;
      const { ctx, notes, s, drawn } = await open(w, h, size, route, mode);
      check(s.names.length > 0 && s.losses.every((n) => n >= 1) && s.returned.every((n) => n >= 1), `${where}: every context was taken and came back (losses: ${list(s, "losses")}; returns: ${list(s, "returned")})`);
      check(!s.fallback, `${where}: the lattice is drawn, not replaced by the still picture`);
      check(s.lost.length === 0 && s.still === 0, `${where}: every context is back and no scene is left on its still light`);
      if (s.seas) check(s.shown.length > 0 && s.shown.every(Boolean), `${where}: each sea on screen is shown (ready, fully opaque)`);
      check(s.names.length > 0 && drawing(s, drawn), `${where}: ${s.names.length} scenes drawing (${s.names.map((n, i) => `${n} ${((drawn[i] || 0) * 100).toFixed(1)}%`).join(", ")})`);
      check(notes.length === 0, `${where}: nothing thrown or logged${said(notes)}`);
      await ctx.close();
    }
    // 4. A browser that cannot keep a context: taken at the start, and again 50 ms after every return.
    {
      const where = `${size} ${route}, a context that never stays`;
      const { ctx, notes, s } = await open(w, h, size, route, "never");
      check(s.names.length > 0 && s.returned.every((n) => n === 1), `${where}: each scene asks for its context back once, then stops (returns: ${list(s, "returned")})`);
      check(s.lost.length === s.names.length, `${where}: the page comes to rest with its scenes quiet`);
      if (s.seas) check(s.still === s.seas, `${where}: a scene without its context shows its still light`);
      if (s.names.includes("mind-canvas")) check(s.fallback, `${where}: the lattice rests on its still picture`);
      // The rig offers the context back after the scene has stopped asking, and the browser says so; that line is the rig's.
      const real = notes.filter((n) => !/restoreContext: context restoration not allowed/.test(n));
      check(real.length === 0, `${where}: nothing thrown or logged${said(real)}`);
      await ctx.close();
    }
  }
}
await b.close();
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
