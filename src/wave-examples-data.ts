export type WaveExample = {
  id: string
  name: string
  project: string
  description: string
  nextMove: string
  structure: string[]
  outcome: string
  guide: string
  image: string
  alt: string
}

/** Illustrative starting models, not live campaigns or reported outcomes. */
export const waveExamples: WaveExample[] = [
  {
    id: 'growth',
    name: 'Growth Wave',
    project: 'The Community Workshop',
    description: 'Bring builders, hosts, and mentors around one shared next move.',
    nextMove: 'Find two workshop hosts.',
    structure: ['Shared mission', 'Open roles and capacity', 'Accepted commitments', 'Completed work'],
    outcome: 'A workshop happens, and contributors receive a consented record of repairs and lessons.',
    guide: 'The Guide shapes useful roles, reviews offers with the builder, and coordinates accepted commitments.',
    image: '/media/wave-examples/growth-wave.webp',
    alt: 'Growth Wave concept with luminous branches connecting builders, hosts, and mentors to a community workshop.',
  },
  {
    id: 'funding',
    name: 'Funding Wave',
    project: 'Student Field Lab',
    description: 'Make a funding need, its recipient, and the planned use of resources clear.',
    nextMove: 'Fund the first field kit.',
    structure: ['Purpose and recipient', 'Budget and funding route', 'Pledged versus received', 'Use and reporting'],
    outcome: 'Confirmed receipts, purchase records, and a field report show what the funding made possible.',
    guide: 'The Guide clarifies the budget and funding route, prepares evidence, and coordinates updates; Guide fees stay separate.',
    image: '/media/wave-examples/funding-wave.webp',
    alt: 'Funding Wave concept with a glowing reservoir and separate equipment, fieldwork, and reporting budget paths.',
  },
  {
    id: 'innovation',
    name: 'Innovation Wave',
    project: 'Open River Sensor',
    description: 'Turn a question into a prototype, an observable test, and shared learning.',
    nextMove: 'Find a field-testing partner.',
    structure: ['Question', 'Prototype', 'Field test', 'Evidence and uncertainty'],
    outcome: 'Published methods and observations explain what was supported, not supported, or remains unclear.',
    guide: 'The Guide connects suitable expertise, coordinates the test, and preserves the team’s methods and decisions.',
    image: '/media/wave-examples/innovation-wave.webp',
    alt: 'Innovation Wave concept with an illustrative river sensor inside a luminous question-to-evidence learning cycle.',
  },
  {
    id: 'story',
    name: 'Story Wave',
    project: 'Voices Of The Coast',
    description: 'Carry a story between communities while preserving its home, voices, and consent.',
    nextMove: 'Find the next storyteller.',
    structure: ['Listen', 'Approve the story', 'Carry it forward', 'Return a chapter'],
    outcome: 'An approved chapter or linked feature returns to the people who shared their experiences.',
    guide: 'The Guide listens, shapes the narrative with participants, and agrees how their words and images may travel.',
    image: '/media/wave-examples/story-wave.webp',
    alt: 'Story Wave concept connecting coastal people and place through listening, carrying, and adding an approved chapter.',
  },
  {
    id: 'hype',
    name: 'Hype Wave',
    project: 'First Wave Live',
    description: 'Turn anticipation into informed participation in a community launch.',
    nextMove: 'Find three launch hosts.',
    structure: ['Clear invitation', 'Approved launch media', 'Accepted launch passes', 'Participation and recap'],
    outcome: 'Published invitations, confirmed participation, and an outcome recap keep reach distinct from real involvement.',
    guide: 'The Guide prepares the launch brief, coordinates willing hosts, and keeps invitations accurate as plans change.',
    image: '/media/wave-examples/hype-wave.webp',
    alt: 'Hype Wave concept with outward blue ripples connecting a launch preview, community invitation, and first experience.',
  },
  {
    id: 'maker',
    name: 'Maker Wave',
    project: 'The Community Build Kit',
    description: 'Bring plans, materials, and skills together into something people can use and make again.',
    nextMove: 'Build the first working kit.',
    structure: ['Build brief and version', 'Parts and skills', 'Build and review', 'Files and handover'],
    outcome: 'A demonstrated working artifact comes with known limitations, a parts record, and permissioned build files.',
    guide: 'The Guide shapes an achievable brief, connects makers, coordinates resources, and prepares the next steward.',
    image: '/media/wave-examples/maker-wave.webp',
    alt: 'Maker Wave concept with modular workbench components converging into an illustrative community build kit.',
  },
  {
    id: 'work',
    name: 'Work Wave',
    project: 'The Workshop Opening',
    description: 'Connect owners, dependencies, and accepted handoffs so a shared commitment can be delivered.',
    nextMove: 'Assign the setup lead.',
    structure: ['Deliverable and owner', 'Dependencies and blockers', 'Review criteria', 'Accepted handoff'],
    outcome: 'Reviewed deliverables and accepted handoffs show what is complete and which responsibilities remain.',
    guide: 'The Guide helps the team agree what done means, match work to capacity, and unblock the next person.',
    image: '/media/wave-examples/work-wave.webp',
    alt: 'Work Wave concept with a flowing dependency path linking example site, build, and review leads for a workshop opening.',
  },
  {
    id: 'brave',
    name: 'Brave Wave',
    project: 'The Community Readiness Brief',
    description: 'Keep shared decisions grounded in known facts, visible unknowns, and current context.',
    nextMove: 'Review the access plan before the workshop opens.',
    structure: ['Facts and sources', 'Unknowns and affected work', 'Decision and response owners', 'Next review or change trigger'],
    outcome: 'Owners record a proceed, modify, or pause decision while open issues and the next review remain visible.',
    guide: 'The Guide separates evidence from assumptions, protects private details, and brings changed context back to the responsible owner.',
    image: '/media/wave-examples/brave-wave.webp',
    alt: 'Brave Wave concept showing a shared community readiness brief with known facts, unresolved questions, owners, and review status.',
  },
]
