import { get, put } from "@vercel/blob";
import { idealistKey, syncIdealist } from "./_volunteer/sources.js";

// The daily Idealist sync. Vercel's cron calls it with the CRON_SECRET; it does nothing until
// IDEALIST_API_KEY is set. The first full sync is long, so run scripts/idealist-sync.mjs once by hand.
async function read(path) {
  const file = await get(path, { access: "private", useCache: false });
  return file ? JSON.parse(await new Response(file.stream).text()) : null;
}
async function write(path, data) {
  await put(path, JSON.stringify(data), { access: "private", addRandomSuffix: false, allowOverwrite: true, contentType: "application/json" });
}

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.authorization !== `Bearer ${secret}`) { res.status(401).json({ error: "Unauthorized" }); return; }
  if (!idealistKey()) { res.status(200).json({ skipped: "IDEALIST_API_KEY is not set" }); return; }
  try {
    res.status(200).json(await syncIdealist({ read, write, budgetMs: 50000 }));
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message });
  }
}
