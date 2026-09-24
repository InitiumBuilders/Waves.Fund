import { createClerkClient } from "@clerk/backend";
import { createHmac, timingSafeEqual } from "node:crypto";
import { createGive, fault } from "./_give/core.js";

// Give Together. Accounts are the site's existing Clerk accounts; data lives in the existing Neon database.
let service;
function give() {
  if (!process.env.DATABASE_URL || !process.env.WAVES_DATA_KEY) throw fault(503, "Give Together is being prepared. Please check back soon.");
  service ??= createGive({ url: process.env.DATABASE_URL, schema: process.env.GIVE_SCHEMA || "public", secret: process.env.WAVES_DATA_KEY });
  return service;
}
const publishable = () => process.env.VITE_CLERK_PUBLISHABLE_KEY || process.env.CLERK_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
let clerk;
const users = new Map();
const origins = () => ["https://www.waves.fund", "https://waves.fund", ...(process.env.VERCEL_URL ? [`https://${process.env.VERCEL_URL}`] : [])];

async function actorOf(req) {
  // Stand-in people for local testing only. This path cannot open on Vercel.
  if (!process.env.VERCEL && process.env.GIVE_DEV_ACTORS === "on" && /^dev_[a-z0-9]{1,20}$/.test(String(req.headers["x-dev-actor"] || ""))) {
    return { id: String(req.headers["x-dev-actor"]) };
  }
  if (!process.env.CLERK_SECRET_KEY || !publishable()) throw fault(503, "Give Together is being prepared. Please check back soon.");
  if (!String(req.headers.authorization || "").startsWith("Bearer ")) throw fault(401, "Sign in to use Give Together.");
  clerk ??= createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY, publishableKey: publishable() });
  const headers = new Headers();
  for (const [k, v] of Object.entries(req.headers)) if (v) headers.set(k, Array.isArray(v) ? v.join(", ") : String(v));
  const local = /^(localhost|127\.0\.0\.1)/.test(String(req.headers.host || ""));
  const request = new Request(`${local ? "http" : "https"}://${req.headers.host}${req.url || "/api/give"}`, { headers });
  let auth;
  try {
    const result = await clerk.authenticateRequest(request, { authorizedParties: local ? undefined : origins(), acceptsToken: "session_token" });
    if (!result.isAuthenticated) throw Error("unauthenticated");
    auth = result.toAuth();
  } catch { throw fault(401, "Please sign in again."); }
  if (!auth?.userId) throw fault(401, "Sign in to use Give Together.");
  // Banned or locked accounts are refused; the answer is kept for five minutes per instance.
  const seen = users.get(auth.userId);
  if (!seen || Date.now() - seen.at > 300000) {
    const user = await clerk.users.getUser(auth.userId);
    users.set(auth.userId, { ok: !user.banned && !user.locked, at: Date.now() });
  }
  if (!users.get(auth.userId).ok) throw fault(403, "This account cannot use Give Together.");
  return { id: auth.userId };
}
// The Team Review sign-in cookie, checked the same way api/community.js signs it.
function isTeam(req) {
  const key = process.env.WAVES_ADMIN_KEY;
  if (!key) return false;
  const value = (String(req.headers.cookie || "").split("; ").find((v) => v.startsWith("waves_admin=")) || "").slice(12);
  const at = value.lastIndexOf(".");
  if (at <= 0) return false;
  const expected = createHmac("sha256", key).update(value.slice(0, at)).digest("hex"), got = value.slice(at + 1);
  return Buffer.byteLength(expected) === Buffer.byteLength(got) && timingSafeEqual(Buffer.from(expected), Buffer.from(got)) && Number(value.slice(0, at)) > Date.now();
}
function bodyOf(req) {
  if (!String(req.headers["content-type"] || "").startsWith("application/json")) throw fault(415, "JSON required.");
  let body;
  try { body = typeof req.body === "string" ? JSON.parse(req.body) : req.body; } catch { throw fault(400, "Invalid request."); }
  if (!body || typeof body !== "object" || Array.isArray(body) || JSON.stringify(body).length > 20000) throw fault(400, "Invalid request.");
  return body;
}
// An approximate place from the connection, offered to prefill a profile. Nothing is stored unless the person saves it.
function where(req) {
  const h = req.headers, num = (v) => { const n = parseFloat(v); return Number.isFinite(n) ? Math.round(n * 10) / 10 : null; };
  let city = "";
  try { city = decodeURIComponent(h["x-vercel-ip-city"] || ""); } catch { city = ""; }
  const region = String(h["x-vercel-ip-country-region"] || ""), country = String(h["x-vercel-ip-country"] || "");
  return { place: [city, region || country].filter(Boolean).join(", ") || null, lat: num(h["x-vercel-ip-latitude"]), lng: num(h["x-vercel-ip-longitude"]) };
}

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "no-referrer");
  try {
    const action = String(req.query?.action || "");
    if (req.method === "GET" && action === "config") {
      return res.status(200).json({ ready: Boolean(process.env.DATABASE_URL && process.env.WAVES_DATA_KEY && process.env.CLERK_SECRET_KEY && publishable()) });
    }
    if (action.startsWith("team")) {
      if (!isTeam(req)) throw fault(401, "Sign in to Team Review first.");
      if (req.method === "GET" && action === "team") return res.status(200).json(await give().adminOverview());
      if (req.method !== "POST") throw fault(405, "Method not allowed.");
      const body = bodyOf(req);
      if (action === "team.report") return res.status(200).json(await give().adminReport(body));
      if (action === "team.opportunity") return res.status(200).json(await give().adminOpportunity(body));
      if (action === "team.profile") return res.status(200).json(await give().adminProfile(body));
      throw fault(400, "Unknown action.");
    }
    const actor = await actorOf(req);
    const s = give(), q = req.query || {};
    if (req.method === "GET") {
      if (action === "me") return res.status(200).json({ ...(await s.me(actor)), where: where(req) });
      if (action === "matches") return res.status(200).json(await s.matches(actor));
      if (action === "connections") return res.status(200).json(await s.connections(actor));
      if (action === "connection") return res.status(200).json(await s.connection(actor, q.id));
      if (action === "thread") return res.status(200).json(await s.thread(actor, q.id, q.after));
      if (action === "opportunities") return res.status(200).json(await s.opportunities(actor, q));
      if (action === "waves") return res.status(200).json(await s.waves(actor));
      if (action === "wave") return res.status(200).json(await s.wave(actor, q.id));
      if (action === "record") return res.status(200).json(await s.record(actor));
      throw fault(400, "Unknown view.");
    }
    if (req.method !== "POST") throw fault(405, "Method not allowed.");
    const b = bodyOf(req);
    const actions = {
      "profile.save": s.saveProfile, "profile.delete": s.deleteProfile, "connect.request": s.request, "connect.respond": s.respond,
      "connect.end": s.endConnection, "message.send": s.send, block: s.block, report: s.report, "opportunity.create": s.createOpportunity,
      "opportunity.save": s.saveOpportunity, "opportunity.close": s.closeOpportunity, "wave.propose": s.proposeWave, "wave.respond": s.respondWave,
      "wave.complete": s.completeWave, "session.log": s.logSession, "gratus.send": s.sendGratus,
    };
    if (!actions[action]) throw fault(400, "Unknown action.");
    return res.status(200).json(await actions[action](actor, b));
  } catch (error) {
    const status = Number.isInteger(error.status) ? error.status : 503;
    if (status >= 500) console.error("Give Together unavailable:", error.name || "Error", error.code || "");
    return res.status(status).json({ error: status >= 500 ? "Give Together is unavailable right now. Please try again soon." : error.message });
  }
}
