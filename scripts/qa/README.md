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
- A built folder for any rig, with no server left running: `node scripts/qa/serve.mjs [--dir dist] -- node
  scripts/qa/gate.mjs {base}`. It serves the folder on 127.0.0.1 for that one run (`{base}` becomes its address),
  refuses paths outside the folder, answers /api with 404 like `vite preview`, and stops when the rig ends.

## The gate

`node scripts/qa/gate.mjs <url>` runs the checks a release must pass and gives one verdict: a first visit in a
brand-new browser profile is not held still (worst pause under 1.5 s, on the home page and on a page that opens on
the sea; it runs first and alone, because the other rigs load the machine), console and page errors on every route
at both sizes, no page wider than a phone, centred lines still centred (a second pass before failing), the first
screen at the heights real phones give, scenes that draw again after the browser takes their WebGL contexts away,
text that reflows at 320 wide (WCAG 1.4.10, since 2026-11-24), moving between pages (since 2026-11-24), accessibility (axe-core, WCAG 2.2 AA), and a walk
through the whole tour. `--build` runs `npm run build` first,
`--styles <baseline.json>` also compares every element's computed style with a baseline, `--quick` skips the tour
and the second centring pass. It exits 1 on any failure and writes its logs to a temporary folder. About fifteen
minutes.

Time a first visit on a quiet machine. On 2026-11-21 the same build read 3.5 to 4.8 s in the minutes after a WebKit
run and 0.2 s once the machine had settled, and the live site read 0.2 s in between. Before believing a slow
number, measure the live site in the same minute; if that is slow too, it is the machine.

## The release, in order

Since 2026-11-20 the public copy goes first, so the build that goes live already lists its own move on the Record
and on Wave One's TrustBase, and one deploy is enough. (Before, the Record lagged a push and needed a second deploy.)
Nothing below starts without August's word for that build.

1. `npx tsc --noEmit -p tsconfig.json` and `npx vite build`; the gate and the checks for what changed, on the local
   build. Read the screenshots before calling them proof. Commit. The build itself refuses output that Safari 15.4
   cannot read (`scripts/floor.mjs`, since 2026-11-23); `node scripts/floor.mjs <folder>` checks files built elsewhere.
2. Public copy: `node scripts/publish-public.mjs`, `node scripts/check-secrets.mjs .open-source .env.local
   .env.workspace.production`, then commit and push inside `.open-source` as InitiumBuilders. The first line of that
   commit is shown on the site as the move, so write it as one plain sentence.
3. `node scripts/record.mjs`, commit the new `src/record-data.json`.
4. Stage: `vercel deploy --prod --skip-domain --yes --archive=tgz --scope sourcecrowd`, then
   `vercel inspect <url> --wait --scope sourcecrowd`.
5. `node scripts/qa/gate.mjs <staged url>` and `node scripts/qa/waveone.mjs <staged url> --live-github`. Everything
   passes or no promote. If something fails, fix forward: the public code is a few minutes ahead of the site.
6. `vercel promote <staged url> --yes --scope sourcecrowd`, then `waveone.mjs https://www.waves.fund --live-github`
   and `smoke2.mjs https://www.waves.fund` (both only read).

Log long runs to a file and grep it. A crash piped through `tail` prints only the Node version line.

## The rigs

| Rig | What it checks |
| --- | --- |
| `gate.mjs <base> [--build] [--styles f] [--quick]` | The release gate: runs the rigs below that a release must pass |
| `serve.mjs [--dir d] -- <rig> {base}` | Serves a built folder on 127.0.0.1 for one rig run, then stops |
| `smoke2.mjs <base> [--webkit]` | Every route at two sizes: console errors and page errors; `--webkit` runs it in WebKit |
| `overflow.mjs <base> [routes]` | Pages that grow sideways on a phone, and the element at the right edge |
| `styles.mjs snap <base> <f>` / `styles.mjs diff <a> <b>` | Every element's computed style on every page, and what changed between two builds |
| `whywin.mjs <old> <new> <groups.json>` | For each style change, the rules that set it in both builds, in cascade order, with their layer |
| `copy.mjs <base> <dir> [routes]` | The words on every page, one file per route, and a word count |
| `scenes.mjs <base> [routes]` then `sharecards.mjs [names]` | Share cards: the hero sea captured without its words (into `share/` in the folder you run from), then the 1200x630 card with the page's line, written to `public/media/share/` |
| `wavewalk.mjs [dev base] [slug]` | Walks a Wave workspace from setup to published as stand-in people (dev server only; data in memory) |
| `waveone.mjs <base> [--live-github]` | Wave One, the founding Wave: on the Waves sea and list, on its own page at two sizes, the Wave One card's link, reduced motion, and the record check's four answers (GitHub is answered by the test; `--live-github` asks the real one once) |
| `firstvisit.mjs <base> [route] [runs] [phone\|wide] [--cold]` | A first visit in a brand-new browser profile: first paint, long tasks and the longest gap between frames (the 4 to 6 s shader freeze of 2026-11-20 shows here) |
| `firstscreen.mjs <base> [routes] [--shots dir] [--webkit]` | The first screen at real phone heights (375x548 and 393x659, Safari's bars showing, 360x640, a common Android phone, and 320x460, the first iPhone SE or Display Zoom): the title clear of the header and ending above the tab bar, nothing past the side of the screen, on a page that opens on the sea at least 40px of water above the point where the night under the words reaches half strength, the first button (the first link or button in the page's first row of actions; on the home, Surge) ending 40px above the tab bar, clear of the fade the bar paints above itself, or wholly below the bar, and the first field (the home's vision box) clear of the bar, on every page |
| `reflow.mjs <base> [routes] [--webkit]` | Reflow at 320x460 (WCAG 1.4.10): each whole page scrolled, failing on text cut by the side of the screen outside a horizontal scroller, or a page wider than the screen |
| `moves.mjs <base> [--shots dir]` | Moving between pages: each kind of move clicked for real (tab to tab both ways, into a practice and back, sea to sea, scrolled past the sea, the browser's own back both ways, reduced motion); the way the words arrive, the tab light, the sea held, and the page at rest afterwards |
| `contexts.mjs <base> [route ...]` | Takes every WebGL context away and gives it back (an iPhone does this to a page left in the background): each scene must draw again by itself. Four cases: at rest (then a sea further down is scrolled to), while still compiling, a context handed out already lost, and a browser that never keeps a context (the scene must stop asking and rest on its still form). Each sea on screen must also be shown, not only drawn. Chrome only in the gate; `--webkit` runs the cases in WebKit at the iPhone 15's size, where a loss made this way is synthetic. WebKit's own returns after a real loss (retried every second once the page is in front) are read from its source, not tested |
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
| `sfaudit.mjs <base>` | Every heading on every route at two sizes: surfaces each one, then checks the moving copy wraps exactly like the real words, and lists headings that fell back to plain |
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
