# Give Together

The Give page (/give) and everything under /give/. August's statement for it: "Find Your People.
Give Together. Build a Wave." His principle: "Build The Difference. Give Together."

## The flow

Give Profile → Find Your Give Guide → Mutual Connection → Shared Opportunity → Volunteer Together
→ Confirm Participation → Build Another Wave.

| Route | Page |
| --- | --- |
| /give | Landing: a scroll scene in three chapters (his lines), the flow, what a Give Guide is with a study of two waves in and out of step, the Teachback, Wave Partner of the month (The Green Reef Foundation), safety, the principle. No sign-in needed. |
| /give/profile | Give Profile. New profiles go one question at a time and every question can be skipped; an existing profile opens as one editable page. |
| /give/guide | Find Your Give Guide: the ripple scene, invitations, people who share something with you, your Give Guides. |
| /give/with/:id | The private space with one Give Guide: what you share, messages, Shared Waves, report, block, end. |
| /give/opportunities | Opportunities, with search and filters (kind, cause, time, remote, skill, near me, saved). `?with=<connection>` adds an "Invite" button for that Give Guide. |
| /give/opportunities/new | Post an opportunity. `?kind=teachback` opens it as a Teachback. |
| /give/wave/:id | A Shared Wave: details, log your time, peer-confirmed days, Gratus, history, complete. |
| /give/record | Your private record. |
| /give/privacy | What others see, pause matching, safety guidance, sign out, delete. |
| /give/sign-in, /give/join | Clerk sign-in and sign-up. |
| /guide/teachback | The Teachback page, with the string lab. |

The scenes are drawn with real wave physics; how each one works is in docs/design/MOTUS-DESIGN.md
("Ripples", "Give Together", "The Teachback").

## Rules the server holds

`api/_give/core.js` holds every rule; `api/give.js` is the HTTP layer. The client cannot skip them.

- Adults only. Only people who turn on "Find me a Give Guide" are shown to anyone.
- People are identified to each other by a random reference, never an account id.
- Locations are rounded to about 10 km. Others see near, same region, or a few hours away, never
  a distance. Town, statement, skills and teach/learn are shown only if the person shares them.
- No messages until both people accept. Asking back someone who asked you is a yes.
- A declined invitation keeps the pair out of each other's matches for 30 days.
- Blocking ends the connection for good and hides both people from each other.
- A day is peer-confirmed only when both people log it as time together; the confirmed hours are
  the smaller of the two. It is labelled as not verified by a host organization.
- One Gratus per person per confirmed day, with an optional 1 Gratus point. Points have no money
  value. There are no public scores or rankings.
- New opportunities are "Not yet verified" until the team marks them verified in Team Review.
- Rate limits per person: profile saves 60/hour, invitations 12/day, messages 90/hour,
  opportunities 6/day, reports 12/day, logged days 30/day.
- Deleting a profile removes it, the messages the person sent, their saves and logged time, ends
  their connections and closes their open opportunities. Gratus they sent stays, without words.

## Data

Neon Postgres, the tables in `scripts/give-schema.sql`, in the schema named by `GIVE_SCHEMA`
(default `public`). The DDL is additive and touches nothing else.

- Create or update the tables: `node scripts/setup-give.mjs <env-file> [schema]`.
- Rules test (never on public): `node scripts/give.test.mjs .env.local` runs 42 checks in `give_test`.

## Accounts

Give Together uses the site's Clerk accounts. The Clerk provider mounts only under /give/ (and
the workspace pages), around `<main>`, so the rest of the site never loads Clerk.

Production uses the live Clerk instance, whose Frontend API is `clerk.www.waves.fund`. It works
only once these CNAME records exist in the waves.fund DNS (Squarespace):

| Host | Points to |
| --- | --- |
| clerk.www | frontend-api.clerk.services |
| accounts.www | accounts.clerk.services |
| clkmail.www | mail.e8eqoqu74bpk.clerk.services |
| clk._domainkey.www | dkim1.e8eqoqu74bpk.clerk.services |
| clk2._domainkey.www | dkim2.e8eqoqu74bpk.clerk.services |

Until then the sign-in pages say sign-in is being connected. The Content-Security-Policy in
`vercel.json` allows `clerk.www.waves.fund`, `img.clerk.com` and Cloudflare's bot check.

## Local development

`vite.config.ts` serves `/api/give` with `GIVE_SCHEMA=give_test` and stand-in people: open any
/give/ page with `?as=dev_name` and that tab acts as that person (kept in the tab's session
storage). The server accepts stand-ins only when `GIVE_DEV_ACTORS=on` and not on Vercel.

## Moderation

Team Review (/team/review) has a Give Together section: open reports (dismiss, pause the profile,
hide the listing), paused profiles (restore), and listings waiting for a check (mark verified,
hide).
