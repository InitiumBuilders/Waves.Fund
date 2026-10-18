// The Record: every move Waves.Fund has made, read from the public code repo's history, so each one links to a commit
// anyone can open on GitHub. Run after each public push (it reads the local clone in .open-source) and commit the
// result with the next release.
//   node scripts/record.mjs        -> src/record-data.json
import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";

const REPO = "https://github.com/InitiumBuilders/Waves.Fund";
const log = execFileSync("git", ["-C", ".open-source", "log", "--format=%H%x09%ad%x09%s", "--date=short"], { encoding: "utf8" });
const moves = log.trim().split("\n").map((line) => {
  const [sha, date, ...subject] = line.split("\t");
  return { sha, date, move: subject.join("\t").trim() };
}).filter((m) => m.sha && m.move);
writeFileSync(new URL("../src/record-data.json", import.meta.url), JSON.stringify({ repo: REPO, moves }, null, 1) + "\n");
console.log(`${moves.length} moves, ${moves.at(-1)?.date} to ${moves[0]?.date}`);
