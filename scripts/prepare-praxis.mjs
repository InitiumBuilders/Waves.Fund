import { readFile, writeFile, copyFile, mkdir } from "node:fs/promises";

// Before the build: the page imports the canonical Markdown; its download is synchronized here.
// After the build: each main page gets its own HTML with its own title and link preview, so a
// shared link shows that page instead of the home card. vercel.json rewrites each route to its file.
// Titles and descriptions reuse lines already on the site.
export const SHARE_PAGES = [
  { route: "/now-lets-begin", file: "now-lets-begin.html", title: "Now, Let’s Begin — The Wave Praxis | Waves.Fund", description: "Build your custom Wave with a real Wave Guide. Explore Wave One, the complete Wave Praxis, and a new way to bring people and funding around your mission." },
  { route: "/learn", file: "share/learn.html", title: "Raise Capital In A Whole New Way. Raise Waves. | Waves.Fund", description: "Welcome To The Frontier Of Funding. #BuildDifferent #BuildAWave" },
  { route: "/guide", file: "share/guide.html", title: "Your vision. Your Wave. A Guide beside you. | Waves.Fund", description: "A Wave Guide works with you to design, build, and evolve a custom home for your mission: its story, its people, and its next move." },
  { route: "/guide/library", file: "share/guide-library.html", title: "The Wave Guide Library | Waves.Fund", description: "Learn the practice. Build it together. Six lessons and seven working templates for the human in the loop." },
  { route: "/give", file: "share/give.html", title: "Give Together | Waves.Fund", description: "Find Your People. Give Together. Build a Wave." },
  { route: "/guide/teachback", file: "share/teachback.html", title: "The Teachback | Waves.Fund", description: "Give Together. Teach Together. Organize a teachback." },
  { route: "/grow", file: "share/grow.html", title: "When Humanity Builds Together, We Change The World. | Waves.Fund", description: "Measure what moves." },
  { route: "/waves", file: "share/waves.html", title: "Waves In Motion | Waves.Fund", description: "Explore approved Wave projects in community review. Learn about the work and add your voice." },
  { route: "/apply", file: "share/apply.html", title: "What’s Your Vision? | Waves.Fund", description: "Funding For Lifelong Learners And Leaders. Bring your vision to Waves.Fund." },
  { route: "/guide/partners/green-reef/proposal", file: "share/green-reef-proposal.html", title: "Students Funding Aquatic Futures. | Waves.Fund", description: "A proposed 90-day pilot between Waves.Fund and The Green Reef Foundation." },
];

if (process.argv.includes("--after-build")) {
  const base = await readFile(new URL("../dist/index.html", import.meta.url), "utf8");
  await mkdir(new URL("../dist/share/", import.meta.url), { recursive: true });
  for (const page of SHARE_PAGES) {
    const url = `https://www.waves.fund${page.route}`;
    const html = base.replace(/<title>[^<]*<\/title>/, `<title>${page.title}</title>`)
      .replace(/(<meta\s+name="description"\s+content=")[^"]*(")/, `$1${page.description}$2`)
      .replace(/(<meta\s+property="og:title"\s+content=")[^"]*(")/, `$1${page.title}$2`)
      .replace(/(<meta\s+property="og:description"\s+content=")[^"]*(")/, `$1${page.description}$2`)
      .replace(/(<meta\s+property="og:url"\s+content=")[^"]*(")/, `$1${url}$2`)
      .replace("</head>", `<link rel="canonical" href="${url}" /></head>`);
    await writeFile(new URL(`../dist/${page.file}`, import.meta.url), html);
  }
} else {
  await mkdir(new URL("../public/media/", import.meta.url), { recursive: true });
  await copyFile(new URL("../docs/WAVE-PRAXIS.md", import.meta.url), new URL("../public/media/wave-praxis.md", import.meta.url));
}
