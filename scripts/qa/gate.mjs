// The gate: every check a release must pass, in one command, with one verdict. Run it on a staged deployment
// before `vercel promote`, or on a local build.
//   node scripts/qa/gate.mjs <base url> [--build] [--styles <baseline.json>] [--quick]
//   --build    run `npm run build` first (type check, build, share pages)
//   --styles   record computed styles and compare them with a baseline from `styles.mjs snap` (reported, not gated)
//   --quick    skip the tour walk and the second centring pass
// Exits 1 if any check fails. Logs go to a temporary folder; the summary names it.
import { spawn } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..", "..");
const args = process.argv.slice(2);
const base = args.find((a) => /^https?:\/\//.test(a));
if (!base) { console.log("usage: node scripts/qa/gate.mjs <base url> [--build] [--styles <baseline.json>] [--quick]"); process.exit(2); }
const flag = (f) => args.includes(f);
const stylesBaseline = flag("--styles") ? args[args.indexOf("--styles") + 1] : null;
const work = mkdtempSync(join(tmpdir(), "waves-gate-"));
mkdirSync(join(work, "vt"));
const env = { ...process.env, MSYS_NO_PATHCONV: "1", AXE_CORE: process.env.AXE_CORE || join(here, ".a11y", "node_modules", "axe-core", "axe.min.js") };

function run(name, cmd, cmdArgs, cwd = work) {
  return new Promise((resolve) => {
    const t0 = Date.now(); let out = "";
    const child = spawn(cmd, cmdArgs, { cwd, env, shell: process.platform === "win32" && cmd === "npm" });
    child.stdout.on("data", (d) => (out += d)); child.stderr.on("data", (d) => (out += d));
    child.on("close", (code) => { writeFileSync(join(work, `${name}.log`), out); resolve({ name, code, out, s: ((Date.now() - t0) / 1000).toFixed(0) }); });
  });
}
const rig = (name, file, ...a) => run(name, process.execPath, [join(here, file), ...a]);
const num = (out, re) => [...out.matchAll(re)].map((m) => +m[1]);
const results = [];
const verdict = (name, ok, detail, r) => results.push({ name, ok, detail, s: r?.s ?? "-" });

if (flag("--build")) {
  const r = await run("build", "npm", ["run", "build"], root);
  verdict("build", r.code === 0, r.code === 0 ? "type check and build pass" : "failed, see build.log", r);
  if (r.code !== 0) { report(); process.exit(1); }
}

// Three independent rigs at a time; each launches its own browser.
const [smoke, overflow, centre] = await Promise.all([
  rig("smoke", "smoke2.mjs", base),
  rig("overflow", "overflow.mjs", base),
  rig("centre", "centercheck.mjs", base),
]);
{ const n = num(smoke.out, /routes with errors: (\d+)/g); verdict("console and page errors", n.length === 2 && n.every((x) => x === 0), n.length === 2 ? `routes with errors: ${n.join(" / ")} (desktop / phone)` : "did not finish, see smoke.log", smoke); }
{ const n = num(overflow.out, /routes wider than the phone: (\d+)/g); verdict("nothing wider than a phone", n.length === 1 && n[0] === 0, n.length ? `${n[0]} routes grow sideways` : "did not finish, see overflow.log", overflow); }
let centreN = num(centre.out, /off-centre paragraphs: (\d+)/g);
if (!flag("--quick") && centreN.some((x) => x > 0)) { const again = await rig("centre2", "centercheck.mjs", base); centreN = num(again.out, /off-centre paragraphs: (\d+)/g); }
verdict("centred lines stay centred", centreN.length === 2 && centreN.every((x) => x === 0), centreN.length === 2 ? `off-centre: ${centreN.join(" / ")}` : "did not finish, see centre.log", centre);

const later = [rig("axe", "axe.mjs", base)];
if (!flag("--quick")) later.push(rig("tour", "tourtest.mjs", base, "all", "d"));
if (stylesBaseline) later.push(rig("styles", "styles.mjs", "snap", base, join(work, "styles.json")));
const [axe, tour, styles] = await Promise.all(later);
{ const n = num(axe.out, /violations: (\d+)/g); verdict("accessibility (WCAG 2.2 AA)", n.length === 1 && n[0] === 0, n.length ? `${n[0]} violations` : "did not finish, see axe.log", axe); }
if (tour) { const ended = /end: /.test(tour.out), clean = /errors: none/.test(tour.out), steps = num(tour.out, /step (\d+)/g).length; verdict("the tour, every step", ended && clean, `${steps} steps, ${ended ? "reached the end" : "did not reach the end"}, ${clean ? "no errors" : "errors, see tour.log"}`, tour); }
if (styles) {
  const d = await rig("styles-diff", "styles.mjs", "diff", stylesBaseline, join(work, "styles.json"));
  const g = num(d.out, /groups: (\d+)/g)[0];
  verdict("styles against the baseline (reported)", true, `${g ?? "?"} groups differ, see styles-diff.log`, styles);
}
report();
process.exit(results.every((r) => r.ok) ? 0 : 1);

function report() {
  console.log(`\nGate for ${base}\n`);
  for (const r of results) console.log(`${r.ok ? "PASS" : "FAIL"}  ${r.name.padEnd(40)} ${String(r.s).padStart(4)}s  ${r.detail}`);
  console.log(`\n${results.every((r) => r.ok) ? "All checks pass." : "Not ready: fix the failures above."} Logs: ${work}`);
}
