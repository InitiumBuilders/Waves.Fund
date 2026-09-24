# Waves.Fund · Motus Design

The design system for the Motus Design rebuild (September 2026), built with the
`/motus-design` skill. Every visual below has its statement written first.

## The Field

One steady lattice of dots runs under the whole site, in three layers at three depths: a
dense, faint matrix far back, an offset middle layer, and fairly large front dots. It is
drawn in 3D through a tilted camera. The dots never leave their places. Energy moves
through them instead.

| Element | What happens | Statement |
| --- | --- | --- |
| The lattice | Evenly spaced dots, every page | Everyone stands on the same ground. Nobody is placed above anyone. |
| The brand wave | A wave rolls across the whole field, always | Waves move through people. |
| Gravity | The grid bends toward a mass and the dots near it grow | Whatever has weight (a vision, a Wave, a mission) draws people in. |
| Pulses | A touch, a keystroke, Surge or a chapter sends a ring through the field | An action travels from person to person. |
| Links | A line lights between two neighbouring dots only when both are active | Coordination is visible where people act together. |
| Colour | The field shifts toward each practice's colour, and toward what you reach for | Learn is cyan, Guide electric blue, Give violet, Grow aqua. |
| Growth | Dots grow as you move down a page | Momentum builds as you go. |
| Depth | The lattice is a surface in 3D: a long swell rolls under it, masses sink funnels into it, pulses lift rings out of it, and the pointer tilts the frame | The ground people stand on is alive. |
| Clearings | The dots fade out around every card, line of text and button, and frame them instead | Words come first. The network holds them and never covers them. |
| The travelling mark | The Waves mark descends each long page as a small mass, bending the grid | Your Wave moves through every chapter with you. |

## Modes

Each page or section asks the one lattice to move in a way that says something. Modes
crossfade as you scroll from one anchor to the next. Source: `src/mind/field.ts`.

| Mode | Where | Statement |
| --- | --- | --- |
| vision | Home, the vision box; each Wave card | Your vision has gravity; waves radiate from it. |
| layers | Learn | A forward pass through four layers: learning is how a network gets stronger. |
| bond | Learn, the mantra | Links form between neighbours who act together. Trust People. And They Become Trustworthy. |
| orbit | Guide, inside the circle; Team | Two masses, a builder and a Guide, in each other's orbit. |
| vortex | Give | Energy directed with intention, drawn inward. |
| rise | Grow | Growth moving upward through everyone. |
| ocean | Waves, Begin, Green Reef, the Proposal | Three waves travel through the grid, like the strokes of the mark. |
| gather, hubs | Semble; Partners and the Guide page's partners | Masses, and signals travelling the paths between them. |
| path | Library; Guide's steps | A practice is learned in steps. |
| timeline | Learn's roadmap; the Proposal's cadence | Ninety days, five stations, one pulse moving forward. |
| seed | Apply; the application receipt; the last Waves card | One mass that grows as the form fills in. |
| still | Privacy | Private things stay calm. |
| noise | Not found | Unformed. |

## Networks that organise themselves

As you reach a chapter, and now and then while you read, some dots of the lattice become
nodes: they light, grow and rise, their neighbours lean in, and connections grow between them
with signals travelling along them. After a few seconds the network lets go. Nothing flies in:
the network is made of dots that were already there. Each mode has its shape: layers for
Learn, hubs for Guide and Partners, a star around a vision or seed, a chain for paths and
timelines. Networks only form in open space, and every connection is masked per pixel so it
never crosses a line of text.

| Element | Statement |
| --- | --- |
| A network forming | People who meet around an idea become a network. |
| A signal arriving | A node lights when something reaches it. |

## Clearings

Every line of text, control and card is drawn as a soft rounded box into a small mask on the
GPU each frame (measured on layout changes only). Dots fade out over about 40px around the
words, so clearings follow a ragged right edge and never open up empty space.

## Energy: vessels and guides

`src/mind/energy.ts`, on its own canvas above the page and below the header, tab bar and sheets.

| Element | What happens | Statement |
| --- | --- | --- |
| Stocks | A glass vessel at the foot of a card holds liquid energy; its level is what the card holds | Every step holds the energy people put into it. |
| Guides | Glass channels between vessels, routed through gutters and the empty foot of cards; light weaves inside them the way it stays inside an optical fibre | Guided energy keeps its strength. |
| Flow | When the next card comes into view, a slug of liquid runs down the guide and pours in: the surface takes the impact, droplets leap and fall back, bubbles rise | Energy flows on from one step to the next. |
| Welling up | A vessel with no guide into it fills from below as it comes into view | A card fills as it is reached. |

## The waveguide

`src/mind/WaveguideScene.tsx`. The Guide page opens on a waveguide drawn from its physics: a
glass core inside a cladding, light launched from a source, total internal reflection keeping
it inside, the guided mode with its travelling phase, the evanescent glow just past the core,
and the light leaving as a spreading wave. The section "Why we call it a Wave Guide" cites the
definition from Wikipedia and has a study version: move the pointer (or use the arrow keys)
to change the launch angle, and past the critical angle the light escapes.

## Give Together

`src/give.tsx` (the /give landing) and `src/together/` (everything under /give/). The Give page is
Give Together: a Give Profile, a peer Give Guide found by what two people share, a mutual yes
before any message, Shared Waves around real opportunities, and a private record. The full
build is in docs/GIVE-TOGETHER.md.

`src/together/scene.tsx` draws its ocean network. You are a soft cyan light with currents (slow
contour lines of a moving flow). People who share something with you are distant points of
light, nearer the more you share. A Give Guide is joined to you by a flowing strand. When both
people say yes, the strand grows between them and a ring of light spreads from where they meet,
then "Your Give Guide" and "You both want to make a difference." appear. On the landing page the
scene is an illustration and is never shown as real people. The output fades to zero before the
canvas edge, so no rectangle shows over the dots.

## The Teachback

`src/teachback.tsx`, at /guide/teachback. One light teaches two; each learner sends a violet
pulse back (the teach-back), then teaches two more, for five generations on rings. Drawn on a 2D
canvas with stamped glow sprites. Motion off shows the finished tree.

## Buttons

Buttons are squircles: a generous radius with `corner-shape: superellipse(2.15)`. A
gradient rim, a dark plate, and liquid rising inside on hover. No cut corners (August,
2026-09-23: "always use squircles").

## What stays exactly as it was

- August's words, every one, and his new lines: "Raise Capital In A Whole New Way.",
  "Raise Waves.", "Welcome To The Frontier Of Funding", "#BuildDifferent #BuildAWave".
- The supplied films: the home nucleus, the Surge transfer (the home input's auto-played
  intro, restored exactly at August's request) and the Grow whale (dimmer, so the words lead).
- The four nav marks and the Grow hold (it now opens Waves with a pulse through the field).
- Every route, form and API.

## Rules

- No particle swarms. Dots never fly in to form a shape (August, 2026-09-23).
- A mode never sits under body text; masses gather in open space. Content is cleared by
  measuring text, controls and cards on layout changes only, never per frame.
- Never read `scrollY` or layout inside a frame. Keep the scroll position from the scroll
  event. Reading it in the frame forced a style pass every frame and cost about a third
  of the scroll frame rate at 6x throttle.
- Transform and opacity only in CSS; no backdrop-filter on anything that scrolls.
- The field draws at half rate at rest and pauses when hidden. Reduced motion and the
  pause control show one still frame. Without WebGL2 the page shows the supplied still.
- The canvas is decorative and hidden from assistive technology. All content is HTML.
