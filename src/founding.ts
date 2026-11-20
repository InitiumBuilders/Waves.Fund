import record from "./record-data.json";
import type { Project } from "./community";
import type { PublicWave } from "./workspace-types";

/* A founding Wave is written in the open. Its words live in this file and its moves are the public code's own
   commits, so every change to it is itself a move anyone can open on GitHub. It needs no workspace and no database.
   A Wave published from the workspace at the same address takes its place.

   People and words are added only with the person's yes, by a public commit, exactly as they wrote them. */
export type Move = { sha: string; date: string; move: string };
export type FoundingWave = {
  slug: string;
  number: string;
  title: string;
  contact: string;
  story: { heading: [string, string]; body: string };
  guide: { role: string; name: string; bio: string; mantra: string };
  move: { kicker: string; title: [string, string]; body: string; detail: string; links: { to: string; label: string; note: string }[] };
  ownership: string;
  /** A person whose finished help is part of this Wave, shown with their permission. */
  people: { name: string; did: string; evidence?: string }[];
  /** What a person says they saw, in their own words, shown with their permission. */
  words: { name: string; words: string; date: string }[];
  repo: string;
  /** Newest first, as scripts/record.mjs writes them. */
  moves: Move[];
};

/* Wave One. Every line here already stands on the Wave One card (src/wave-one.tsx). They are August's site words:
   do not edit or reword them. */
const waveOne: FoundingWave = {
  slug: "waves-fund",
  number: "WAVE 001",
  title: "Waves.Fund",
  contact: "August@Outlier.Systems",
  story: {
    heading: ["Raise Capital", "In A Whole New Way."],
    body: "A home for lifelong learners and leaders building Waves for humanity. Bring your vision. Find the people to help it move.",
  },
  guide: {
    role: "Founder & First Wave Guide",
    name: "August James Domanchuk",
    bio: "Emergent Strategist. Life long learner and teacher.",
    mantra: "“Move The Mindset”",
  },
  move: {
    kicker: "NEXT CHAPTER · PROPOSED PILOT",
    title: ["Build The First", "Adaptive Waves"],
    body: "Connect builders and Wave Guides to shape custom building blocks around a mission, a story, and a clear next move.",
    detail: "Custom builds begin with a conversation about scope, fees, and the support you need.",
    links: [
      { to: "/apply", label: "Bring Your Vision", note: "Tell us what you are building." },
      { to: "/guide/apply", label: "Become A Wave Guide", note: "Bring your skills to the work." },
    ],
  },
  ownership: "The team keeps its home and control. People carrying the Wave can share it and propose contributions. The team chooses what becomes part of its story.",
  people: [],
  words: [],
  repo: record.repo,
  moves: record.moves,
};

export const FOUNDING: FoundingWave[] = [waveOne];
export const foundingWave = (slug: string) => FOUNDING.find((w) => w.slug === slug) || null;
export const commitUrl = (w: FoundingWave, m: Move) => `${w.repo}/commit/${m.sha}`;

/** The moves grouped by the day they were made, newest day first. */
export function byDay(moves: Move[]) {
  const days: { date: string; moves: Move[] }[] = [];
  for (const m of moves) {
    const last = days[days.length - 1];
    if (last && last.date === m.date) last.moves.push(m);
    else days.push({ date: m.date, moves: [m] });
  }
  return days;
}

/* The same shape a workspace Wave has, so a founding Wave draws on the same sea: its moves rise as ripples and each
   person whose help is part of it is a light beside it. */
export function asPublicWave(w: FoundingWave): PublicWave {
  const oldestFirst = [...w.moves].reverse();
  return {
    id: `founding:${w.slug}`, slug: w.slug, title: w.title, template: "custom", story: w.story.body,
    guideName: w.guide.name, guideBio: w.guide.bio,
    currentMove: { id: "founding", title: w.move.title.join(" "), owner: w.guide.name, needs: w.move.body, completion: "", status: "open", evidence: "", outcome: "" },
    journey: oldestFirst.map((m) => ({ id: m.sha, title: m.move, body: "", evidence: commitUrl(w, m), created: `${m.date}T12:00:00Z` })),
    publishedAt: `${oldestFirst[0]?.date || "2026-09-23"}T12:00:00Z`,
    contributions: w.people.map((p) => ({ name: p.name, outcome: p.did, evidence: p.evidence || "" })),
    carrying: [],
  };
}

/* On the Waves sea and in its list. Its latest moves (11 at most, oldest first) replay as ripples from its light. */
export function asProject(w: FoundingWave): Project {
  return {
    id: `founding:${w.slug}`, slug: w.slug, title: w.title, description: w.story.body, category: w.number, budget: 0,
    milestone: w.move.title.join(" "), signals: w.people.length + w.words.length,
    pulses: w.moves.slice(0, 11).reverse().map((m) => `${m.date}T12:00:00Z`),
  };
}
