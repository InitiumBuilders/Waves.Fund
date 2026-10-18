import type { WaveJourney } from "./workspace-types";

/* The same seal api/_workspace/core.js gives a Journey entry when it is recorded, computed here in the visitor's own
   browser: a SHA-256 of the entry's words, its dates, and the seal of the entry before it. */
export async function sealOf(item: WaveJourney) {
  const text = JSON.stringify([item.prev, item.id, item.title, item.body, item.evidence, item.created, item.sealed]);
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/* match: the words are the ones that were sealed. edited: the words changed after sealing. unlinked: the entry before
   it was removed, or another was put in between. null: recorded before seals began. */
export type SealState = "match" | "edited" | "unlinked" | null;
export async function checkJourney(journey: WaveJourney[]): Promise<SealState[]> {
  const states: SealState[] = [];
  let prev = "";
  for (const item of journey) {
    if (!item.seal) { states.push(null); prev = ""; continue; }
    states.push((await sealOf(item)) !== item.seal ? "edited" : (item.prev ?? "") !== prev ? "unlinked" : "match");
    prev = item.seal;
  }
  return states;
}
