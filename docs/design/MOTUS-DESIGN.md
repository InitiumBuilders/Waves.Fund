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
definition from Wikipedia and has a second version that follows the scroll: as it comes into
view the light is launched too steeply and escapes, and by the middle of the screen it is inside the
critical angle and guided. No controls or labels.

## Cadence: one beat

`src/cadence.ts`. The whole site keeps one beat, 1.5 seconds. Every loop lasts a whole number of beats
(0.75, 1.5, 3, 4.5, 6, 7.5 s) and runs on one clock, the document timeline:

- CSS loops: when a looping animation starts, its start time is set to zero, so its cycles fall on the
  beat with every other loop on the page.
- The dot field (`field.ts`), the waveguide scene and the energy layer use that clock (t0 = 0), and every
  frequency in their shaders is a whole fraction of the beat (`OM = 2π / 1.5`).
- Ripples: crests pass once a beat (`speed = λ / BEAT`, phase from the shared clock).

Statement: everything here moves in step. It is Give Together's idea applied to the site itself.

## Seamless page changes

`src/seamless.tsx`, with the View Transitions API. A tap on a link (or a swipe between the five main
views) sends a wave through the field from where you touched; the page you leave dissolves (0.34 s,
opacity only) while the next page rises with its own arrival. The header and tab bar are captured on
their own (`view-transition-name`), so they hold still. The change waits for a lazy page to load, so a
placeholder never shows. Browsers without the API, and motion off, get the page's own arrival.

## Arrival on scroll

Blocks below the first screen rise into place as they are scrolled to (`.arrive`), driven by the scroll
position with CSS scroll-driven animations, so they run off the main thread and rewind exactly when you
scroll back. Cards in one row follow each other by 40px of scroll. Blocks already on screen never fade.
The field measures blocks in their resting place (`html.mind-measuring`). Where the browser has no
scroll timelines, the older timed arrival (`flow-arrival`) runs instead.

## Open vessels

A stock's vessel is open at the top and lit at its sides and floor, so an empty one reads as waiting to
be filled, not as an input. A thin line of light rests on its floor and breathes on the beat until the
energy from the step before pours in.

## Performance rules found in this round

- SVG animations run on the main thread even off screen. The wave symbols now animate HTML layers
  (compositor), and rest while out of view, rejoining the beat in phase when they return.
- Never animate `filter` in a loop (the Learn nav mark's glow is steady now).
- Measure at 6x CPU on a phone viewport against a production build; compare with the live site in the
  same sitting, because the machine's load moves the numbers.

## Ripples

`src/together/ripple.tsx` is one WebGL2 fragment shader that adds up real waves. Each source
sends out rings, A = Σ a·cos(k·r − ω·t + φ), with a reach that fades it with distance and a
start time so a new source's wavefront spreads outward. Crests are soft bright bands, troughs a
faint violet, and where the sum comes close to its peak a thin bright ridge appears. The water is
drawn as a lit dot lattice on a dark pool that fades out at the edges, so it sits inside the
Motus field instead of on top of it. A tap or click adds a short-lived source in step with you.
Scenes pass a model function `(t, w, h) => frame`; the engine owns the canvas, the loop, pausing
when hidden, and motion off (one still frame). The element carries `data-quiet`, so field
networks never form over it.

## Give Together

`src/give.tsx` (the /give landing) and `src/together/` (everything under /give/). The Give page is
Give Together: a Give Profile, a peer Give Guide found by what two people share, a mutual yes
before any message, Shared Waves around real opportunities, and a private record. The full
build is in docs/GIVE-TOGETHER.md.

Its physics is interference.

| Place | What it shows | Statement |
| --- | --- | --- |
| Landing, first scene (`together/tank.tsx`) | A sticky scene over three scroll chapters, August's lines "Find Your People." "Give Together." "Build a Wave.": you, one light, with faint lights around you not yet in step; one comes near and falls into step, and the bands between you rise twice as high; then everyone lines up in step and the rings join into one straight wavefront (Huygens) | Two in step add up; many in step make one wave. |
| Landing, A Give Guide (`PairScene`) | Two sources; as the section scrolls into view the second one arrives and falls into step with the first, and the bands between them brighten. Scrolling back reverses it | Meeting someone to give with. |
| /give/guide (`together/scene.tsx`, field) | You at the centre. Give Guides ripple in step with you; people who share something are faint lights whose rings stay close; choose one and their rings reach toward yours and fall into step | A preview of giving together. |
| The moment | Two lights fall into step over two seconds, then a ring spreads from where they meet, and "Your Give Guide" appears | You both said yes. |
| Shared Wave (`together/wave.tsx`) | Two lights out of step while proposed, in step once active | The Wave is underway. |
| Opportunities | Each kind has its wave symbol (Teachback: standing wave; volunteering: a pair in step; event: a travelling wave) | Kind at a glance. |

## The Teachback

`src/teachback.tsx`, at /guide/teachback. Its physics is reflection and the standing wave.

- The first scene: one light teaches two. A pulse runs out along each branch, reflects from the
  learner (a fixed end flips it) and comes home violet; once taught back, the branch settles into
  a steady standing-wave swing. Then each learner teaches two more, for five generations. 2D
  canvas, stamped glow sprites; motion off shows the finished tree. It opens partway through its
  cycle, so the first screen already shows learners taught back.
- The string (`src/teachback-string.tsx`): a string held at both ends, simulated with the damped
  1D wave equation. It starts by itself when scrolled into view: one end moves at the string's third
  harmonic, each push meets the returning echo, and a standing wave builds. Scrolled away, it settles.
  A touch sends one pulse. No labels, buttons or captions.

## Wave symbols

`src/symbols.tsx` and `symbols.css`: small SVG symbols, each a real wave behaviour, moved with
transforms only. StandingString (a sine scaled from +1 to −1), Travel (a sine slid one
wavelength), Pair (two sources sending rings in step), Echo (a pulse out and back, flipped at the
far end), Resonance (one string setting the next moving), Guided (a ray zigzagging between two
walls) and Growing (a swing that grows). WaveList is a list joined by one wave that lights each
step as it is reached. Where they appear: the Teachback steps (Learn it: Travel, Teach it
together: Pair, Teach it back: Echo, Pass it on: Resonance), the four practices on Learn
(Learn: Travel, Guide: Guided, Give: Pair, Grow: Growing) and the four steps on the Guide page (Tell your
story: Echo, Build your Wave: Growing, Bring people together: Pair, Show what changed: Resonance). The
moving parts are HTML layers, so the compositor animates them; each symbol clears its patch of dots.

A clearing can be round: `data-clear="round"` clears a circle instead of a rounded box.

Rule (August, 2026-09-24): no sliders, dials, meters, readouts or captions that explain a visual, and
no physics words in visible copy. Animations run by themselves, on the beat, or follow the scroll.

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
