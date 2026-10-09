import { list, get } from "@vercel/blob";
import { neon } from "@neondatabase/serverless";
import { notify } from "./_notify.js";

/* The daily digest: once a day (vercel.json crons) the team gets one short mail with what is waiting and how long, and
   the fund's counts. Kinds, counts and days only, never a name or an email. It runs only when Vercel's cron calls it
   with CRON_SECRET, and it sends only when RESEND_API_KEY is set. GET ?dry=1 with the secret returns the lines
   without sending. */

const WAITING = new Set(["Received", "In Review"]);

async function files(prefix) {
  let cursor, all = [];
  do { const r = await list({ prefix, limit: 1000, cursor }); all.push(...r.blobs); cursor = r.hasMore ? r.cursor : undefined; } while (cursor);
  return all;
}
async function read(path) {
  const f = await get(path, { access: "private", useCache: false });
  return f ? JSON.parse(await new Response(f.stream).text()) : null;
}
const days = (iso, now) => Math.max(0, Math.floor((now - Date.parse(iso)) / 86400000));

export async function digestLines(now = Date.now()) {
  const apps = (await Promise.all((await files("applications/")).map((f) => read(f.pathname)))).filter(Boolean);
  const waiting = apps.filter((a) => WAITING.has(a.status)).sort((a, b) => a.created.localeCompare(b.created));
  const lines = [];
  if (waiting.length) {
    lines.push(`Waiting for an answer: ${waiting.length}`);
    for (const a of waiting) lines.push(`- ${a.kind}, ${a.status}, waiting ${days(a.created, now)} ${days(a.created, now) === 1 ? "day" : "days"}`);
  } else lines.push("Nothing is waiting for an answer.");
  const newToday = apps.filter((a) => now - Date.parse(a.created) < 86400000).length;
  lines.push("", `New in the last day: ${newToday}`, `Applications: ${apps.length}`);
  lines.push(`Published Waves: ${(await files("published/")).length}`, `Accepted Wave Guides: ${(await files("guides/")).length}`, `Support signals: ${(await files("votes/")).length}`);
  if (process.env.DATABASE_URL) {
    const sql = neon(process.env.DATABASE_URL);
    const count = async (table) => (await sql.query(`select count(*)::int as n from public.${table}`).catch(() => [{ n: "?" }]))[0].n;
    lines.push(`Give profiles: ${await count("give_profiles")}`, `Give connections: ${await count("give_connections")}`, `Days given together: ${await count("give_sessions")}`);
  }
  lines.push("", "Answer in Team Review: https://www.waves.fund/team/review");
  return { lines, waiting: waiting.length };
}

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  const secret = process.env.CRON_SECRET;
  if (!secret) return res.status(503).json({ error: "The digest is not set up." });
  if (req.headers.authorization !== `Bearer ${secret}`) return res.status(401).json({ error: "Not allowed." });
  try {
    const { lines, waiting } = await digestLines();
    if (String(req.query?.dry || "") === "1") return res.status(200).json({ lines });
    const sent = await notify(waiting ? `${waiting} waiting for an answer` : "Today's digest", lines);
    return res.status(200).json({ sent });
  } catch (error) {
    console.error("digest failed:", error.name || "Error");
    return res.status(500).json({ error: "The digest could not be built." });
  }
}
