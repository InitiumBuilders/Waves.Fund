import { get } from "@vercel/blob";
import { connector, idealistKey, idealistNear, idealistRemote, km } from "./_volunteer/sources.js";

// Volunteer opportunities near the visitor. The location is either one they chose to share (rounded to
// about ten kilometres before it is sent) or Vercel's approximate one for the connection. Nothing is stored.
async function read(path) {
  const file = await get(path, { access: "private", useCache: false });
  return file ? JSON.parse(await new Response(file.stream).text()) : null;
}
const num = (v) => { const n = parseFloat(v); return Number.isFinite(n) ? n : null; };
// Idealist's own city pages: the nearest one within reach is a real local path, key or no key.
const IDEALIST_CITIES = [
  ["Austin", "austin-tx", 30.27, -97.74], ["Boston", "boston", 42.36, -71.06], ["Chicago", "chicago", 41.88, -87.63],
  ["Denver", "denver-co", 39.74, -104.99], ["Long Beach", "long-beach-ca", 33.77, -118.19], ["Madison", "madison-wisconsin", 43.07, -89.4],
  ["Miami", "miami", 25.76, -80.19], ["Minneapolis", "minneapolis-mn", 44.98, -93.27], ["Nashville", "nashville-tn", 36.16, -86.78],
  ["New Orleans", "new-orleans-la", 29.95, -90.07], ["New York City", "new-york-city", 40.71, -74.01], ["Phoenix", "phoenix-az", 33.45, -112.07],
  ["San Diego", "san-diego-ca", 32.72, -117.16], ["San Francisco", "san-francisco", 37.77, -122.42], ["San Jose", "san-jose", 37.34, -121.89],
  ["Seattle", "seattle-wa", 47.61, -122.33], ["Virginia Beach", "virginia-beach-virginia", 36.85, -75.98], ["Washington, DC", "washington-dc", 38.91, -77.04],
];
function nearestCity(at) {
  let best = null;
  for (const [name, slug, lat, lng] of IDEALIST_CITIES) {
    const d = km(at, { lat, lng });
    if (d <= 90 && (!best || d < best.km)) best = { name, url: `https://www.idealist.org/en/volunteer-in-${slug}`, km: Math.round(d) };
  }
  return best;
}
const decode = (v) => { try { return decodeURIComponent(v || ""); } catch { return String(v || ""); } };

export default async function handler(req, res) {
  res.setHeader("X-Content-Type-Options", "nosniff");
  // The answer depends on where the visitor is, so it is never shared between visitors.
  res.setHeader("Cache-Control", "private, max-age=600");
  if (req.method !== "GET") { res.status(405).json({ error: "Method not allowed" }); return; }
  const h = req.headers, q = req.query || {};
  let lat = num(q.lat), lng = num(q.lng);
  const exact = lat != null && lng != null;
  if (exact) { lat = Math.round(lat * 10) / 10; lng = Math.round(lng * 10) / 10; }
  else { lat = num(h["x-vercel-ip-latitude"]); lng = num(h["x-vercel-ip-longitude"]); }
  const at = lat != null && lng != null ? { lat, lng } : null;
  const country = String(h["x-vercel-ip-country"] || "").toUpperCase().slice(0, 2);
  const postal = String(q.postal || h["x-vercel-ip-postal-code"] || "").replace(/\s+/g, "").slice(0, 3).toUpperCase();
  const place = { city: decode(h["x-vercel-ip-city"]), region: String(h["x-vercel-ip-country-region"] || ""), country, exact };

  const jobs = [];
  if (/^[A-Z]\d[A-Z]$/.test(postal)) jobs.push(connector({ postal }).then((items) => ({ name: "Volunteer Connector", items })));
  jobs.push(connector({ remote: true, pages: 2 }).then((items) => ({ name: "Volunteer Connector", items })));
  if (idealistKey() && at) {
    jobs.push(idealistNear(read, at).then((items) => ({ name: "Idealist", items })));
    jobs.push(idealistRemote(read).then((items) => ({ name: "Idealist", items: items.slice(0, 24) })));
  }
  const settled = await Promise.allSettled(jobs);
  const seen = new Set(), items = [], sources = [];
  for (const s of settled) {
    if (s.status !== "fulfilled") continue;
    if (!sources.includes(s.value.name)) sources.push(s.value.name);
    for (const x of s.value.items) if (!seen.has(x.id)) { seen.add(x.id); items.push(x); }
  }
  for (const x of items) x.km = at && x.lat != null ? Math.round(km(at, x)) : null;
  items.sort((a, b) => Number(a.remote) - Number(b.remote) || (a.km ?? 1e9) - (b.km ?? 1e9));
  res.status(200).json({
    place,
    at: at && { lat: Math.round(at.lat * 10) / 10, lng: Math.round(at.lng * 10) / 10 },
    items: items.slice(0, 48),
    city: at ? nearestCity(at) : null,
    sources,
    partial: settled.some((s) => s.status === "rejected"),
  });
}
