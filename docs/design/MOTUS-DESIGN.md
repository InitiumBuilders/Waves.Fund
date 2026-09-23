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

## Liquid energy

Where energy gathers, the dots flow together into a bead of neon liquid. It follows the
two supplied films (the Surge film and the Energy film): a ribbon pours into a glass
vessel, the surface sways and carries bubbles, a bead necks from the bottom and lets go,
and where it lands a ring spreads and a few droplets leap and fall back. Source:
`src/mind/liquid.ts`, drawn on its own canvas above the page and below the header, tab
bar and sheets. It only draws in stocks, in the gaps between cards and along card edges.

| Element | What happens | Statement |
| --- | --- | --- |
| Stocks | A glass vessel at the foot of a card holds a pool; its level is what the card holds | Every step holds the energy people put into it. |
| Condense | Dots in open space over a card flow into a bead, which falls onto the card | Support comes out of the network. |
| Drip | A charged stock necks and drips onto the card below; a runner slides down the card's edge into its stock | Energy flows on from one step to the next. |
| Cascade | Learn's four steps and the Guide's four steps step down the page | The path is a waterfall of stocks. |
| Wave stocks | A Wave card's stock is as full as its learner signals are toward 11 | A Wave holds the support it has gathered. |
| Roadmap stocks | NOW is fullest, the pilot half full, NEXT nearly empty | The further along, the fuller. |
| Home | The ribbon pours into the vision box as the page opens; the pool drips onto Surge; Surge erupts | Your vision is energy; Surge sets it moving. |

The home pool drains to a thin line while someone types, so the words are never under
it. Without WebGL2 the supplied Surge film plays instead, and each stock shows its level
as a still fill.

## Buttons

Buttons are squircles: a generous radius with `corner-shape: superellipse(2.15)`. A
gradient rim, a dark plate, and liquid rising inside on hover. No cut corners (August,
2026-09-23: "always use squircles").

## What stays exactly as it was

- August's words, every one, and his new lines: "Raise Capital In A Whole New Way.",
  "Raise Waves.", "Welcome To The Frontier Of Funding", "#BuildDifferent #BuildAWave".
- The supplied films: the home nucleus and the Grow whale (now dimmer, so the words lead).
  The Surge transfer film is the fallback when the liquid cannot run.
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
