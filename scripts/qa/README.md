# QA rigs

The checks used to ship Waves.Fund since 2026-09-28. They were written in a session scratchpad, which is deleted
when a session ends, so they live here now. Each one drives a real browser through Playwright.

## Setup

- Playwright: the rigs import `playwright-core` from `PLAYWRIGHT_CORE` (a `file://` URL to its `index.mjs`). The
  default points at the copy in `C:/Users/Initi/semble-up-citizens/node_modules/playwright-core`. They launch the
  installed Chrome (`channel: "chrome"`) with the GPU on, so the WebGL scenes render.
- axe-core (for `axe.mjs` only): `npm install --prefix scripts/qa/.a11y axe-core@4`, or set `AXE_CORE` to its
  `axe.min.js`. The folder is ignored by git.
- Run from a scratch folder that has a `vt/` folder in it: the rigs write screenshots to `vt/`.
- In Git Bash, prefix runs that take routes with `MSYS_NO_PATHCONV=1`, or `/learn` becomes a Windows path.
- A dev server for the rigs that need dev-only hooks (`window.__engine`, `window.__sea`, stand-in people):
  `npx vite --port 5197 --strictPort --host 127.0.0.1`, in the background, and stop it afterwards.

## The gate

`node scripts/qa/gate.mjs <url>` runs the checks a release must pass and gives one verdict: console and page errors
on every route at both sizes, no page wider than a phone, centred lines still centred (a second pass before failing),
accessibility (axe-core, WCAG 2.2 AA), and a walk through the whole tour. `--build` runs `npm run build` first,
`--styles <baseline.json>` also compares every element's computed style with a baseline, `--quick` skips the tour
and the second centring pass. It exits 1 on any failure and writes its logs to a temporary folder. About ten minutes.

## The release, in order

1. `npx tsc --noEmit -p tsconfig.json` and `npx vite build`.
2. Stage: `vercel deploy --prod --skip-domain --yes --archive=tgz --scope sourcecrowd`, then
   `vercel inspect <url> --wait --scope sourcecrowd`.
3. `node scripts/qa/gate.mjs <staged url>`. Everything passes or no promote.
4. The checks for what changed (below). Read the screenshots before calling them proof.
5. `vercel promote <staged url> --yes --scope sourcecrowd`.
6. Public copy: `node scripts/publish-public.mjs`, `node scripts/check-secrets.mjs .open-source .env.local
   .env.workspace.production`, then commit and push inside `.open-source` as InitiumBuilders.

Log long runs to a file and grep it. A crash piped through `tail` prints only the Node version line.

## The rigs

| Rig | What it checks |
| --- | --- |
| `gate.mjs <base> [--build] [--styles f] [--quick]` | The release gate: runs the rigs below that a release must pass |
| `smoke2.mjs <base>` | Every route at two sizes: console errors and page errors |
| `overflow.mjs <base> [routes]` | Pages that grow sideways on a phone, and the element at the right edge |
| `styles.mjs snap <base> <f>` / `styles.mjs diff <a> <b>` | Every element's computed style on every page, and what changed between two builds |
| `whywin.mjs <old> <new> <groups.json>` | For each style change, the rules that set it in both builds, in cascade order, with their layer |
| `copy.mjs <base> <dir> [routes]` | The words on every page, one file per route, and a word count |
| `scenes.mjs <base> [routes]` then `sharecards.mjs [names]` | Share cards: the hero sea captured without its words (into `share/` in the folder you run from), then the 1200x630 card with the page's line, written to `public/media/share/` |
| `wavewalk.mjs [dev base] [slug]` | Walks a Wave workspace from setup to published as stand-in people (dev server only; data in memory) |
| `soundshot.mjs <dev base> <out.wav> [seconds]` | Renders the site's sound offline from the real engine (dev server) to a WAV file, with its peak and loudness |
| `axe.mjs <base>` | WCAG 2.2 AA with axe-core: 18 pages at two sizes, the open menu, the tour's question and a step |
| `density.mjs <base> [routes]` | Typical text size, text under 14px, longest line, section gaps, words per screen |
| `offenders.mjs <base> [routes]` | Which elements are under 14px or run past 80 characters, grouped by selector |
| `whyfs2.mjs <url> <selector>` | Which stylesheet rules set an element's font size, in cascade order |
| `centercheck.mjs <base>` | Centred lines knocked off centre (run it twice before trusting a zero) |
| `weight.mjs <base> [routes]` | First-visit bytes per page on a phone, by kind |
| `perf2.mjs <base> <route> <scroll 0..1>` | Frame times at 6x CPU throttle on a phone |
| `seaperf.mjs <base>` | Frame times in the Give sea's chapters, 1x and 6x |
| `ringperf.mjs <base>` | Scrolling with the tour's ring up versus without |
| `tour.mjs <base> <dir> [routes]` + `sheet.py <dir> <out>` | Scroll captures of each route and contact sheets |
| `tourtest.mjs <base> <path> <d|m> [draft]` | Walks one tour path (vision, guide, give, waves, all) and records each step |
| `tourextras.mjs <base>` | The first-visit offer, Escape, the menu entry |
| `circuitshots.mjs <base> <tag>` | The circuit between cards: a pulse mid-flight and landed |
| `heroshots.mjs <base> <tag>` / `seashots.mjs` | The sea heroes and the Give sea, two moments each; a tap on a Wave's light |
| `bond_verify.mjs <base>` | The closing network at the end of pages (dev: reads the engine) |
| `menushot.mjs <base> <tag>` | The menu at both sizes |
| `giveseed.mjs` / `givewave.mjs` | Stand-in people, a connection, an invitation, an opportunity, a Shared Wave with a confirmed day. Dev server only; it writes to the `give_test` schema |
| `givetour.mjs <base> <dir> <who> <routes>` / `momentshot.mjs` | Walks the Give app as a stand-in person; the connection moment |

`scripts/give.test.mjs` resets `give_test`. Run `giveseed.mjs` again after it before walking the Give app.
