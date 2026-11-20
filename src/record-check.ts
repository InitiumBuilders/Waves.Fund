import type { Move } from "./founding";

/* Checking a founding Wave's moves against the public code, from the visitor's own browser. The list is asked from
   GitHub directly, never through this site, so the answer does not depend on trusting us.
   match: the commit is in the public history and its first line is the move's words.
   edited: the commit is there and its words are different.
   missing: no such commit in the public history. */
export type MoveState = "match" | "edited" | "missing";
type Commit = { sha: string; commit: { message: string } };

export function compareMoves(moves: Move[], commits: Commit[]): MoveState[] {
  const words = new Map(commits.map((c) => [c.sha, c.commit.message.split("\n")[0].trim()]));
  return moves.map((m) => (!words.has(m.sha) ? "missing" : words.get(m.sha) === m.move.trim() ? "match" : "edited"));
}

/* The public history, a hundred commits a page, until every move has been found or the history ends. Throws when
   GitHub does not answer (offline, or the hourly limit for visitors without an account). */
export async function publicHistory(repo: string, moves: Move[], signal?: AbortSignal): Promise<Commit[]> {
  const path = new URL(repo).pathname.replace(/^\/|\/$/g, "");
  const wanted = new Set(moves.map((m) => m.sha));
  const all: Commit[] = [];
  for (let page = 1; page <= 6 && wanted.size; page++) {
    const response = await fetch(`https://api.github.com/repos/${path}/commits?per_page=100&page=${page}`, { headers: { Accept: "application/vnd.github+json" }, signal });
    if (!response.ok) throw Error(`GitHub answered ${response.status}`);
    const batch = (await response.json()) as Commit[];
    if (!Array.isArray(batch) || !batch.length) break;
    for (const c of batch) { all.push(c); wanted.delete(c.sha); }
    if (batch.length < 100) break;
  }
  return all;
}
