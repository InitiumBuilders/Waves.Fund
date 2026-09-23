import { readFile, writeFile, copyFile, mkdir } from "node:fs/promises";

// The page imports the canonical Markdown; its download is synchronized at build time.
if (process.argv.includes("--after-build")) {
  let html = await readFile(new URL("../dist/index.html", import.meta.url), "utf8");
  const title = "Now, Let’s Begin — The Wave Praxis | Waves.Fund";
  const description = "Build your custom Wave with a real Wave Guide. Explore Wave One, the complete Wave Praxis, and a new way to bring people and funding around your mission.";
  html = html.replace(/<title>[^<]*<\/title>/, `<title>${title}</title>`)
    .replace(/(<meta\s+name="description"\s+content=")[^"]*(")/, `$1${description}$2`)
    .replace(/(<meta\s+property="og:title"\s+content=")[^"]*(")/, `$1${title}$2`)
    .replace(/(<meta\s+property="og:description"\s+content=")[^"]*(")/, `$1${description}$2`)
    .replace(/(<meta\s+property="og:url"\s+content=")[^"]*(")/, "$1https://www.waves.fund/now-lets-begin$2")
    .replace("</head>", '<link rel="canonical" href="https://www.waves.fund/now-lets-begin" /></head>');
  await writeFile(new URL("../dist/now-lets-begin.html", import.meta.url), html);
} else {
  await mkdir(new URL("../public/media/", import.meta.url), { recursive: true });
  await copyFile(new URL("../docs/WAVE-PRAXIS.md", import.meta.url), new URL("../public/media/wave-praxis.md", import.meta.url));
}
