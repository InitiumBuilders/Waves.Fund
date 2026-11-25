/* Zooming between the fund's map and a Wave (2026-11-25). On the Waves sea each Wave is a light: a tap on one sends
   the camera down into it, and that Wave's page opens close on its own light and pulls back as the page rises around
   it. Coming back out is the reverse: the Waves sea opens close on that Wave's light and pulls back to the map, where
   the light takes its place among the others. The page being left says where the next one opens; the next page reads
   it when it mounts. A note left behind by a move that never arrived expires on its own. */
type Zoom = { to: string; slug?: string; at: number };
let pending: Zoom | null = null;

export function expectZoom(to: string, slug?: string) {
  pending = { to, slug, at: performance.now() };
}

/** The zoom the page at `path` should open with, if the move that brought it here asked for one. */
export function takeZoom(path: string): { slug?: string } | null {
  if (!pending || pending.to !== path || performance.now() - pending.at > 4000) return null;
  return { slug: pending.slug };
}

/** The Wave a path opens, or null: /waves/waves-fund gives "waves-fund". */
export const waveSlug = (path: string) => /^\/waves\/([^/?#]+)/.exec(path)?.[1] ?? null;
