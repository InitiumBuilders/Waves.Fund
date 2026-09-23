# Waves.Fund

**Trust People. And They Become Trustworthy.**

The source for [waves.fund](https://www.waves.fund). Students Funding The Future. An Impact Fund. Funding For Futures.

> A Wave is a custom home for something you are building, shaped with a real Guide, that people can help and pass along.

The full thinking is in [the Wave Praxis](docs/WAVE-PRAXIS.md).

## What's live and what isn't

Live on waves.fund today:

- Project, Wave Guide and contributor applications. They are stored privately, and the applicant keeps a receipt to check status from any device.
- A team review inbox at `/team/review`. A project reaches the public feed at `/waves` only after the applicant consents and the team approves it.
- Learner support on published projects. It is one signal per browser and advisory, not a verified vote.
- The Guide Library at `/guide/library`, with six lessons and seven worksheets.
- `/now-lets-begin`, with the Wave Praxis and eight illustrative Wave models.
- `/trax`, private page-view and engaged-time analytics for the team.
- Giving goes to the Green Reef Foundation through its Benevity page. This site never handles money.

Built and switched off: shared Wave workspaces at `/workspace` and public Wave pages at `/waves/:slug`, using Clerk sign-in and Neon Postgres. Two flags keep them off until accounts are set up and tested end to end.

Proposed and not built: grant rounds, Wave Pools, platform adapters and a published Wave format. The Praxis describes each one.

## Stack

Vite, React 19, TypeScript and React Router in the browser. Vercel Node functions in `api/`. Private Vercel Blob storage for applications and analytics. Clerk and Neon for the workspace pilot.

## Run it

Use Node.js 24.

```bash
npm ci
cp .env.example .env.local
npm run dev
```

Fill in `.env.local` first. The dev server runs at http://127.0.0.1:5173 and serves the API through Vite middleware. Without the Blob token and the two Waves keys, pages still load, but applications and the project feed return an error.

```bash
npm run build
node --test scripts/workspace.test.mjs
```

## Layout

```
src/            pages and components
api/            community.js   applications, review, public feed, learner support
                trax.js        analytics
                workspace.js, waves.js, _workspace/   the workspace pilot
docs/           the Wave Praxis and the Guide Library lessons
public/media/   artwork, video and logos
scripts/        build helpers, workspace schema and tests, secret check
```

## Privacy in the code

- Applicant names and emails never reach the public feed. See `safeProject` in `api/community.js`.
- Receipts are stored only as keyed hashes.
- Trax sets no cookies and keeps no visitor ID, query string, referrer or form value. It skips visitors who send Do Not Track or Global Privacy Control.
- Server keys never use the `VITE_` prefix, so they stay out of the browser bundle.

If you find a security problem, email August@Outlier.Systems rather than opening a public issue.

## License

The code is MIT licensed. See [LICENSE](LICENSE).

The Waves.Fund name and marks, everything in `public/media` (artwork, video, photos and partner logos) and the writing in `docs/` are not covered by the MIT license. See [NOTICE](NOTICE).
