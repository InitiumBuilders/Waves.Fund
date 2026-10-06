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

## The gate, in order

1. `npx tsc --noEmit -p tsconfig.json` and `npx vite build`.
2. Stage: `vercel deploy --prod --skip-domain --yes --archive=tgz --scope sourcecrowd`, then
   `vercel inspect <url> --wait --scope sourcecrowd`.
3. `node smoke2.mjs <staged url>`: all 23 routes at 1440 and 390 wide. Zero errors or no promote.
4. The checks for what changed (below). Read the screenshots before calling them proof.
5. `vercel promote <staged url> --yes --scope sourcecrowd`.
6. Public copy: `node scripts/publish-public.mjs`, `node scripts/check-secrets.mjs .open-source .env.local
   .env.workspace.production`, then commit and push inside `.open-source` as InitiumBuilders.

Log long runs to a file and grep it. A crash piped through `tail` prints only the Node version line.

## The rigs

| Rig | What it checks |
| --- | --- |
| `smoke2.mjs <base>` | Every route at two sizes: console errors and page errors |
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
