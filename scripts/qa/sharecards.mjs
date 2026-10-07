// Share cards for Waves.Fund: 1200x630, the page's own scene on the right, its line on the left.
// Every line is already on the site (his words or the page's heading). Output: public/media/share/*.jpg
const { chromium } = await import(process.env.PLAYWRIGHT_CORE || "file:///C:/Users/Initi/semble-up-citizens/node_modules/playwright-core/index.mjs");
import { writeFile, mkdir } from "node:fs/promises";

const REPO = new URL("../..", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1").replace(/\/$/, "");
const HERE = process.cwd().replaceAll("\\", "/");   // run from the folder where scenes.mjs wrote share/
const font = `file:///${REPO}/node_modules/@fontsource-variable/inter/files/inter-latin-wght-normal.woff2`;
const logo = `file:///${REPO}/public/media/logo.webp`;

const CARDS = [
  { name: "default", scene: "learn-45", head: "Trust People.<br><span>And They Become Trustworthy.</span>", sub: "" },
  { name: "give", scene: "give", head: "Give Together", sub: "Find Your People. Give Together. Build a Wave." },
  { name: "teachback", scene: "teachback", head: "The <span>Teachback</span>", sub: "Give Together. Teach Together. Organize a teachback." },
  { name: "guide", scene: "guide", head: "Your vision.<br>Your Wave.<br><span>A Guide beside you.</span>", sub: "" },
  { name: "learn", scene: "learn-65", head: "Raise Capital<br>In A Whole New Way.<br><span>Raise Waves.</span>", sub: "Welcome To The Frontier Of Funding" },
  { name: "manifest", scene: "manifest-65", head: "The <span>Manifest</span>", sub: "Trust People. And They Become Trustworthy." },
  { name: "waves", scene: "waves-85", head: "Waves<br><span>In Motion</span>", sub: "Explore approved Wave projects in community review." },
];
// Only the named cards when names are given: node sharecards.mjs default learn waves
const ONLY = process.argv.slice(2);

const page = (c) => `<!doctype html><html><head><meta charset="utf-8"><style>
@font-face { font-family: Inter; src: url("${font}") format("woff2"); font-weight: 100 900; }
* { box-sizing: border-box; margin: 0; }
html, body { width: 1200px; height: 630px; background: #010513; overflow: hidden; }
body { font-family: Inter, sans-serif; color: #f3faff; position: relative; }
.scene { position: absolute; top: 0; right: 0; width: 620px; height: 630px; object-fit: cover; object-position: center;
  -webkit-mask-image: linear-gradient(90deg, transparent 0%, rgba(0,0,0,.5) 26%, #000 50%); mask-image: linear-gradient(90deg, transparent 0%, rgba(0,0,0,.5) 26%, #000 50%); }
.copy { position: absolute; left: 72px; top: 0; bottom: 0; width: 660px; display: flex; flex-direction: column; justify-content: center; gap: 22px; }
.brand { position: absolute; left: 72px; top: 56px; display: flex; align-items: center; gap: 14px; font-size: 30px; font-weight: 560; letter-spacing: -0.02em; }
.brand img { width: 58px; height: 58px; object-fit: contain; filter: drop-shadow(0 0 16px rgba(4, 170, 255, .45)); }
h1 { font-size: ${c.name === "learn" || c.name === "guide" ? 58 : 66}px; line-height: 1.04; font-weight: 520; letter-spacing: -0.04em; }
h1 span { background: linear-gradient(90deg, #8ff0ff, #7fb6ff 50%, #b3a2ff); -webkit-background-clip: text; background-clip: text; color: transparent; }
p { font-size: 24px; line-height: 1.35; font-weight: 500; letter-spacing: -0.012em; max-width: 660px; white-space: nowrap; }
.site { position: absolute; left: 72px; bottom: 50px; font-size: 17px; font-weight: 600; letter-spacing: 0.16em; text-transform: uppercase; color: #cfe9ff; }
</style></head><body>
<img class="scene" src="file:///${HERE}/share/scene-${c.scene}.png">
<div class="brand"><img src="${logo}">Waves.Fund</div>
<div class="copy"><h1>${c.head}</h1>${c.sub ? `<p>${c.sub}</p>` : ""}</div>
<div class="site">www.waves.fund</div>
</body></html>`;

await mkdir(`${REPO}/public/media/share`, { recursive: true });
const b = await chromium.launch({ channel: "chrome", headless: true });
const p = await b.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
for (const c of CARDS.filter((c) => !ONLY.length || ONLY.includes(c.name))) {
  const file = `${HERE}/share/card-${c.name}.html`;
  await writeFile(file, page(c));
  await p.goto(`file:///${file}`, { waitUntil: "load" });
  await p.evaluate(() => document.fonts.ready);
  await p.waitForTimeout(300);
  await p.screenshot({ path: `${REPO}/public/media/share/${c.name}.jpg`, type: "jpeg", quality: 88 });
  console.log("card", c.name);
}
await b.close();
