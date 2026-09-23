# Waves.Fund · Motus Design

The design system for the Motus Design rebuild (September 2026), built with the
`/motus-design` skill. Every visual below has its statement written first.

## The Field

One steady lattice of dots runs under the whole site, in three layers: a dense, faint
matrix at the back, an offset middle layer, and fairly large front dots. The dots never
leave their places. Energy moves through them instead.

| Element | What happens | Statement |
| --- | --- | --- |
| The lattice | Evenly spaced dots, every page | Everyone stands on the same ground. Nobody is placed above anyone. |
| The brand wave | A wave rolls across the whole field, always | Waves move through people. |
| Gravity | The grid bends toward a mass and the dots near it grow | Whatever has weight (a vision, a Wave, a mission) draws people in. |
| Pulses | A touch, a keystroke, Surge or a chapter sends a ring through the field | An action travels from person to person. |
| Links | A line lights between two neighbouring dots only when both are active | Coordination is visible where people act together. |
| Colour | The field shifts toward each practice's colour, and toward what you reach for | Learn is cyan, Guide electric blue, Give violet, Grow aqua. |
| Growth | Dots grow as you move down a page | Momentum builds as you go. |
| Depth | The back layer surfaces where the front is most active | Every action has people behind it. |
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

## What stays exactly as it was

- August's words, every one, and his new lines: "Raise Capital In A Whole New Way.",
  "Raise Waves.", "Welcome To The Frontier Of Funding", "#BuildDifferent #BuildAWave".
- The supplied films: the home nucleus, the Surge transfer and the Grow whale.
- The four nav marks and the Grow hold (it now opens Waves with a pulse through the field).
- Every route, form and API.

## Rules

- No particle swarms. Dots never fly in to form a shape (August, 2026-09-23).
- A mode never sits under body text; masses gather in open space.
- Transform and opacity only in CSS; no backdrop-filter on anything that scrolls.
- The field draws at half rate at rest and pauses when hidden. Reduced motion and the
  pause control show one still frame. Without WebGL2 the page shows the supplied still.
- The canvas is decorative and hidden from assistive technology. All content is HTML.
