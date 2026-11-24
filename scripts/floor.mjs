// The oldest browser the site is built for: Safari 15.4 (iOS 15.4, March 2022). The site already needed it (@layer and
// svh in the styles, <dialog> for the menu), so the build targets it too. Until 2026-11-23 the build targeted Safari
// 16.4, Vite's default, and two things failed on iOS 15.4 to 16.3:
//   - The CSS minifier rewrote every min-width and max-width media query in the newer range form, (width>=900px).
//     Those versions do not read it, so none of the phone-size rules applied.
//   - remark-gfm's email autolink regex has a lookbehind, which those versions cannot parse. The chunk behind
//     Now, Let's Begin and the Guide Library failed to load.
// At 15.4 the transpiler also rewrites class fields as constructor code. Safari 15 can throw a ReferenceError for a
// field whose initializer holds extra parentheses (WebKit bug 236843), and minified code is full of them.
// The plugin removes that lookbehind, and stops a build whose output still holds syntax Safari 15.4 cannot read.
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseAst } from "vite";

export const FLOOR = ["chrome111", "edge111", "firefox114", "safari15.4", "ios15.4"];

// mdast-util-gfm-autolink-literal 2.0.1 tests the character before an email twice: in the regex (a lookbehind) and in
// its own previous() check, which refuses the same characters. Without the lookbehind the same links are found: 0 of
// 300,000 random strings differed, run through the package's own checks and retry loop.
const AUTOLINK = /mdast-util-gfm-autolink-literal[\\/]lib[\\/]index\.js$/;
const LOOKBEHIND = String.raw`/(?<=^|\s|\p{P}|\p{S})([-.\w+]+)@([-\w]+(?:\.[-\w]+)+)/gu`;
const PLAIN = String.raw`/([-.\w+]+)@([-\w]+(?:\.[-\w]+)+)/gu`;

function jsFaults(code, name) {
  const faults = [];
  // At this target the transpiler lowers static blocks and writes a lookbehind or v-flag regex as new RegExp("..."),
  // so a chunk can only hold a fault if one of these appears in its text. Parsing only those keeps the build fast.
  if (!/\(\?<|static ?\{|RegExp\(/.test(code)) return faults;
  const regex = (pattern, flags) => {
    if (/\(\?<[=!]/.test(pattern)) faults.push(`${name}: a regex lookbehind (Safari 16.4): /${pattern.slice(0, 70)}/`);
    if (flags.includes("v")) faults.push(`${name}: a regex v flag (Safari 17): /${pattern.slice(0, 70)}/`);
  };
  const stack = [parseAst(code)];
  while (stack.length) {
    const node = stack.pop();
    if (!node || typeof node !== "object") continue;
    if (Array.isArray(node)) { stack.push(...node); continue; }
    if (node.type === "StaticBlock") faults.push(`${name}: a class static block (Safari 16.4)`);
    if (node.type === "Literal" && node.regex) regex(node.regex.pattern, node.regex.flags);
    // A regex the transpiler could not lower becomes new RegExp("..."), which parses but throws when it runs.
    if ((node.type === "NewExpression" || node.type === "CallExpression") && node.callee?.type === "Identifier" && node.callee.name === "RegExp" && typeof node.arguments?.[0]?.value === "string")
      regex(node.arguments[0].value, typeof node.arguments[1]?.value === "string" ? node.arguments[1].value : "");
    for (const key in node) if (key !== "type" && key !== "start" && key !== "end" && node[key] && typeof node[key] === "object") stack.push(node[key]);
  }
  return faults;
}

function cssFaults(css, name) {
  const faults = [];
  for (const [query] of css.matchAll(/@media[^{]*/g))
    if (/\([^)]*[<>]/.test(query)) faults.push(`${name}: a media query in range form (Safari 16.4): ${query.slice(0, 70)}`);
  return faults;
}

// Every fault in a folder of built files (for checking a build made elsewhere).
export async function faultsIn(dir) {
  const { readdir, readFile } = await import("node:fs/promises");
  const { join } = await import("node:path");
  const faults = [];
  for (const file of await readdir(dir)) {
    if (file.endsWith(".js")) faults.push(...jsFaults(await readFile(join(dir, file), "utf8"), file));
    else if (file.endsWith(".css")) faults.push(...cssFaults(await readFile(join(dir, file), "utf8"), file));
  }
  return faults;
}

export function floor() {
  return {
    name: "waves-floor",
    apply: "build",
    transform(code, id) {
      if (!AUTOLINK.test(id.split("?")[0])) return null;
      if (!code.includes(LOOKBEHIND))
        this.error("mdast-util-gfm-autolink-literal changed. If its email regex no longer has a lookbehind, remove the transform in scripts/floor.mjs; if it has a new one, update LOOKBEHIND.");
      return code.replace(LOOKBEHIND, PLAIN);
    },
    writeBundle(_, bundle) {
      const faults = [];
      for (const file of Object.values(bundle)) {
        if (file.type === "chunk") faults.push(...jsFaults(file.code, file.fileName));
        else if (file.fileName.endsWith(".css")) faults.push(...cssFaults(String(file.source), file.fileName));
      }
      if (faults.length) this.error(`Safari 15.4 cannot read this build (scripts/floor.mjs):\n${faults.join("\n")}`);
    },
  };
}

// node scripts/floor.mjs <folder of built files>
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const dir = process.argv[2];
  if (!dir) { console.error("usage: node scripts/floor.mjs <dist/assets>"); process.exit(2); }
  const faults = await faultsIn(dir);
  console.log(faults.length ? faults.join("\n") : "Safari 15.4 can read every file.");
  process.exit(faults.length ? 1 : 0);
}
