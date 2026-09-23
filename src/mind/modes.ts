/** The Field's modes. Each page or section asks the one lattice to move in a way that says something.
 *  See docs/design/MOTUS-DESIGN.md for the statement behind each one. */
export const FIELD_MODES = [
  "vision",   // Home: your vision has gravity; waves radiate from it.
  "layers",   // Learn: a forward pass through four layers.
  "orbit",    // Guide: two masses, a builder and a Guide, in each other's orbit.
  "vortex",   // Give: energy directed with intention, drawn inward.
  "rise",     // Grow: growth moving upward through everyone.
  "gather",   // Waves: projects are masses; signals travel the paths between them.
  "hubs",     // Partners and team: three masses and the coordination between them.
  "ocean",    // Begin and Green Reef: one long wave moving through the whole field.
  "path",     // Library: a practice learned in steps.
  "timeline", // Proposal: ninety days, five stations, one pulse moving forward.
  "seed",     // Apply: one mass that grows as the form fills in.
  "bond",     // The mantra: links form between neighbours who act together.
  "still",    // Privacy: calm.
  "noise",    // Not found: unformed.
] as const;
export type FieldMode = (typeof FIELD_MODES)[number];

/** Each practice has a colour; the field shifts toward it. RGB, 0 to 1. */
export const HUES: Record<string, [number, number, number]> = {
  home: [0.36, 0.86, 1.0],
  learn: [0.4, 0.93, 1.0],
  guide: [0.36, 0.62, 1.0],
  give: [0.68, 0.52, 1.0],
  grow: [0.32, 0.98, 0.9],
  waves: [0.3, 0.78, 1.0],
  quiet: [0.5, 0.66, 0.92],
};
export function hueFor(pathname: string) {
  if (pathname === "/") return HUES.home;
  const first = pathname.split("/")[1];
  if (first === "learn" || first === "now-lets-begin") return HUES.learn;
  if (first === "guide") return HUES.guide;
  if (first === "give" || first === "contribute") return HUES.give;
  if (first === "grow") return HUES.grow;
  if (first === "waves" || first === "projects" || first === "apply") return HUES.waves;
  return HUES.quiet;
}
