// Give Together: people who want to give back find each other, connect by mutual consent, choose an
// opportunity together, and keep a private record of what they did.
//
// Rules this service holds, whatever the client sends:
// - Adults only, and only people who opt in are ever shown to anyone.
// - Other people are identified by a random reference, never by an account id.
// - Locations are approximate (rounded to about 10km) and only shown if the person chose to share them.
// - No messages until both people accept the connection. Blocking ends it for good.
// - Participation is "peer-confirmed" only when both people log the same day as together; it is never
//   presented as verified by a host organization.
// - One Gratus per person per confirmed session. No public scores, no rankings.

import { neon } from "@neondatabase/serverless";
import { createHmac, randomUUID } from "node:crypto";

export const fault = (status, message) => Object.assign(new Error(message), { status });

export const GIVES = ["time", "skills", "resources", "financial", "teachback"];
export const CAUSES = ["community", "families", "education", "animals", "environment", "relief", "other"];
export const TIMES = ["today", "week", "weekends", "flexible"];
export const WAYS = ["one", "team", "own"];
export const KINDS = ["volunteer", "teachback", "event"];
const REASONS = ["unsafe", "harassment", "spam", "fake", "underage", "other"];

const clean = (v, max) => (typeof v === "string" ? v.replace(/\s+/g, " ").trim().slice(0, max) : "");
const prose = (v, max) => (typeof v === "string" ? v.replace(/\r\n?/g, "\n").replace(/\n{3,}/g, "\n\n").trim().slice(0, max) : "");
const pick = (v, allowed) => (Array.isArray(v) ? [...new Set(v.filter((x) => allowed.includes(x)))] : []);
const tags = (v, n = 12, max = 32) => (Array.isArray(v) ? [...new Set(v.map((x) => clean(x, max).toLowerCase()).filter(Boolean))].slice(0, n) : []);
const coord = (v, lo, hi) => { const n = typeof v === "number" ? v : parseFloat(v); return Number.isFinite(n) && n >= lo && n <= hi ? Math.round(n * 10) / 10 : null; };
const id = (v) => (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(v)) ? String(v).toLowerCase() : null);
const day = (v) => (/^\d{4}-\d{2}-\d{2}$/.test(String(v)) && !Number.isNaN(Date.parse(v)) ? String(v) : null);
const link = (v) => { try { const u = new URL(String(v)); return ["https:", "http:"].includes(u.protocol) ? u.href.slice(0, 400) : null; } catch { return null; } };
const both = (a, b) => a.filter((x) => b.includes(x));
function km(a, b) {
  const r = Math.PI / 180, dLat = (b.lat - a.lat) * r, dLng = (b.lng - a.lng) * r;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(dLng / 2) ** 2;
  return 12742 * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function createGive({ url, schema = "public", secret }) {
  if (!/^[a-z_][a-z0-9_]*$/.test(schema)) throw Error("Invalid schema name");
  const sql = neon(url);
  const q = (text, params = []) => sql.query(text.replaceAll("{s}", schema), params);
  const one = async (text, params) => (await q(text, params))[0] || null;

  async function limit(user, action, maximum, hours = 1) {
    const window = Math.floor(Date.now() / (hours * 3600000));
    const bucket = createHmac("sha256", secret).update(`${user}:${action}:${hours}:${window}`).digest("hex");
    const row = await one(`INSERT INTO {s}.give_limits (bucket, count, expires_at) VALUES ($1, 1, $2)
      ON CONFLICT (bucket) DO UPDATE SET count = {s}.give_limits.count + 1 RETURNING count`, [bucket, new Date((window + 2) * hours * 3600000).toISOString()]);
    if (row.count > maximum) throw fault(429, "Please take a moment and try again later.");
  }

  const profileOf = (user) => one(`SELECT * FROM {s}.give_profiles WHERE user_id = $1`, [user]);
  async function requireProfile(user) {
    const p = await profileOf(user);
    if (!p) throw fault(409, "Create your Give Profile first.");
    if (p.status === "suspended") throw fault(403, "This profile is paused while the team reviews a report.");
    return p;
  }
  function own(p) {
    if (!p) return null;
    return {
      ref: p.ref, name: p.display_name, gives: p.gives, causes: p.causes, causeOther: p.cause_other, times: p.times, ways: p.ways,
      skills: p.skills, teach: p.teach, learn: p.learn, availability: p.availability, place: p.place,
      located: p.lat != null && p.lng != null, lat: p.lat, lng: p.lng, statement: p.statement, shares: { place: true, statement: true, skills: true, teach: true, ...p.shares },
      seeking: p.seeking, adult: p.adult, status: p.status, updatedAt: p.updated_at,
    };
  }
  // What someone else sees: only what this person chose to share.
  function shared(p) {
    const s = { place: true, statement: true, skills: true, teach: true, ...p.shares };
    return {
      ref: p.ref, name: p.display_name, gives: p.gives, causes: p.causes, times: p.times, ways: p.ways,
      place: s.place ? p.place : null, statement: s.statement ? p.statement : null,
      skills: s.skills ? p.skills : [], teach: s.teach ? p.teach : [], learn: s.teach ? p.learn : [],
    };
  }
  function common(a, b) {
    const times = both(a.times, b.times);
    if (!times.length && (a.times.includes("flexible") || b.times.includes("flexible")) && a.times.length && b.times.length) times.push("flexible");
    const out = {
      causes: both(a.causes, b.causes),
      gives: both(a.gives, b.gives),
      times,
      ways: both(a.ways, b.ways).filter((w) => w !== "own"),
      skills: both(a.skills, b.skills),
      teachYou: both(a.learn, b.teach),
      teachThem: both(a.teach, b.learn),
      teachback: a.gives.includes("teachback") && b.gives.includes("teachback"),
      distance: null,
    };
    if (a.lat != null && b.lat != null) { const d = km(a, b); out.distance = d <= 25 ? "near" : d <= 80 ? "region" : d <= 250 ? "far" : null; }
    return out;
  }
  function score(c) {
    return c.causes.length * 3 + c.gives.length * 2 + (c.teachback ? 3 : 0) + c.times.length + c.ways.length + c.skills.length +
      (c.teachYou.length + c.teachThem.length) * 2 + (c.distance === "near" ? 4 : c.distance === "region" ? 2 : 0);
  }
  const blocked = (a, b) => one(`SELECT 1 FROM {s}.give_blocks WHERE (blocker = $1 AND blocked = $2) OR (blocker = $2 AND blocked = $1)`, [a, b]);
  async function connectionFor(user, connectionId) {
    const cid = id(connectionId);
    const c = cid && (await one(`SELECT * FROM {s}.give_connections WHERE id = $1 AND (requester = $2 OR recipient = $2)`, [cid, user]));
    if (!c) throw fault(404, "This connection is not available.");
    return { ...c, other: c.requester === user ? c.recipient : c.requester };
  }
  async function event(wave, actor, kind, detail = {}) {
    await q(`INSERT INTO {s}.give_wave_events (id, wave_id, actor, kind, detail) VALUES ($1, $2, $3, $4, $5)`, [randomUUID(), wave, actor, kind, JSON.stringify(detail)]);
  }
  function opportunityOut(o, user, saved = false) {
    return {
      id: o.id, kind: o.kind, title: o.title, need: o.need, cause: o.cause, organizer: o.organizer, place: o.place, remote: o.remote,
      when: o.when_text, startsOn: o.starts_on ? String(o.starts_on instanceof Date ? o.starts_on.toISOString() : o.starts_on).slice(0, 10) : null,
      how: o.how, url: o.url, skills: o.skills, times: o.times, verified: o.verified, mine: o.created_by === user, saved, createdAt: o.created_at,
    };
  }

  // ---- Profile ------------------------------------------------------------------------------------------
  async function me(actor) {
    const p = await profileOf(actor.id);
    if (!p) return { profile: null };
    const counts = await one(`SELECT
      (SELECT count(*) FROM {s}.give_connections WHERE recipient = $1 AND status = 'pending')::int AS invites,
      (SELECT count(*) FROM {s}.give_connections WHERE (requester = $1 OR recipient = $1) AND status = 'accepted')::int AS guides,
      (SELECT count(*) FROM {s}.give_waves w JOIN {s}.give_connections c ON c.id = w.connection_id
        WHERE (c.requester = $1 OR c.recipient = $1) AND w.status IN ('proposed', 'active'))::int AS waves`, [actor.id]);
    return { profile: own(p), ...counts };
  }
  async function saveProfile(actor, b) {
    await limit(actor.id, "profile", 60);
    if (b.adult !== true) throw fault(400, "Give Together is for adults, 18 and over.");
    const name = clean(b.name, 40);
    if (name.length < 2) throw fault(400, "Choose a display name of at least two characters.");
    const gives = pick(b.gives, GIVES), causes = pick(b.causes, CAUSES);
    const lat = coord(b.lat, -90, 90), lng = coord(b.lng, -180, 180);
    const existing = await profileOf(actor.id);
    if (existing?.status === "suspended") throw fault(403, "This profile is paused while the team reviews a report.");
    const sharesIn = b.shares && typeof b.shares === "object" ? b.shares : {};
    const shares = { place: sharesIn.place !== false, statement: sharesIn.statement !== false, skills: sharesIn.skills !== false, teach: sharesIn.teach !== false };
    const row = await one(`INSERT INTO {s}.give_profiles (user_id, ref, display_name, gives, causes, cause_other, times, ways, skills, teach, learn,
        availability, place, lat, lng, statement, shares, seeking, adult)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, TRUE)
      ON CONFLICT (user_id) DO UPDATE SET display_name = $3, gives = $4, causes = $5, cause_other = $6, times = $7, ways = $8, skills = $9,
        teach = $10, learn = $11, availability = $12, place = $13, lat = $14, lng = $15, statement = $16, shares = $17, seeking = $18,
        adult = TRUE, updated_at = now()
      RETURNING *`, [actor.id, randomUUID(), name, gives, causes, causes.includes("other") ? clean(b.causeOther, 60) || null : null,
      pick(b.times, TIMES), pick(b.ways, WAYS), tags(b.skills), gives.includes("teachback") ? tags(b.teach, 8, 48) : [],
      gives.includes("teachback") ? tags(b.learn, 8, 48) : [], clean(b.availability, 120) || null, clean(b.place, 80) || null,
      lat, lat == null ? null : lng, clean(b.statement, 280) || null, JSON.stringify(shares), b.seeking === true]);
    return { profile: own(row) };
  }
  async function deleteProfile(actor) {
    const u = actor.id;
    await q(`UPDATE {s}.give_connections SET status = 'ended', ended_by = $1, responded_at = COALESCE(responded_at, now()) WHERE (requester = $1 OR recipient = $1) AND status IN ('pending', 'accepted')`, [u]);
    await q(`DELETE FROM {s}.give_messages WHERE sender = $1`, [u]);
    await q(`DELETE FROM {s}.give_saves WHERE user_id = $1`, [u]);
    await q(`DELETE FROM {s}.give_sessions WHERE user_id = $1`, [u]);
    await q(`UPDATE {s}.give_gratus SET message = NULL WHERE from_user = $1`, [u]);
    await q(`UPDATE {s}.give_opportunities SET status = 'closed' WHERE created_by = $1 AND status = 'open'`, [u]);
    await q(`DELETE FROM {s}.give_profiles WHERE user_id = $1`, [u]);
    return { deleted: true };
  }

  // ---- Find Your Give Guide --------------------------------------------------------------------------------
  async function matches(actor) {
    const mine = await requireProfile(actor.id);
    const rows = await q(`SELECT p.* FROM {s}.give_profiles p
      WHERE p.seeking AND p.adult AND p.status = 'active' AND p.user_id <> $1
        AND NOT EXISTS (SELECT 1 FROM {s}.give_blocks b WHERE (b.blocker = $1 AND b.blocked = p.user_id) OR (b.blocker = p.user_id AND b.blocked = $1))
        AND NOT EXISTS (SELECT 1 FROM {s}.give_connections c
          WHERE LEAST(c.requester, c.recipient) = LEAST($1, p.user_id) AND GREATEST(c.requester, c.recipient) = GREATEST($1, p.user_id)
            AND (c.status IN ('pending', 'accepted') OR (c.status = 'declined' AND c.responded_at > now() - interval '30 days')))
      ORDER BY p.updated_at DESC LIMIT 400`, [actor.id]);
    const out = [];
    for (const p of rows) {
      const c = common(mine, p);
      const s = score(c);
      if (!c.causes.length && !c.gives.length && !c.teachYou.length && !c.teachThem.length && !c.teachback) continue;
      out.push({ person: shared(p), common: c, score: s });
    }
    out.sort((a, b) => b.score - a.score);
    return { seeking: mine.seeking, matches: out.slice(0, 16) };
  }
  async function request(actor, b) {
    const mine = await requireProfile(actor.id);
    if (!mine.seeking) throw fault(409, "Turn on Find Your Give Guide in your profile first.");
    const target = id(b.ref) && (await one(`SELECT * FROM {s}.give_profiles WHERE ref = $1`, [id(b.ref)]));
    if (!target || !target.seeking || !target.adult || target.status !== "active" || target.user_id === actor.id) throw fault(404, "This person is not available.");
    if (await blocked(actor.id, target.user_id)) throw fault(404, "This person is not available.");
    await limit(actor.id, "request", 12, 24);
    // If they already asked you, saying yes is the answer.
    const theirs = await one(`SELECT * FROM {s}.give_connections WHERE requester = $1 AND recipient = $2 AND status = 'pending'`, [target.user_id, actor.id]);
    if (theirs) {
      await q(`UPDATE {s}.give_connections SET status = 'accepted', responded_at = now() WHERE id = $1`, [theirs.id]);
      return { connection: theirs.id, status: "accepted" };
    }
    const cid = randomUUID();
    try {
      await q(`INSERT INTO {s}.give_connections (id, requester, recipient, status, note) VALUES ($1, $2, $3, 'pending', $4)`, [cid, actor.id, target.user_id, prose(b.note, 400) || null]);
    } catch (error) {
      if (error.code === "23505") throw fault(409, "You are already connected or waiting for an answer.");
      throw error;
    }
    return { connection: cid, status: "pending" };
  }
  async function respond(actor, b) {
    await requireProfile(actor.id);
    const c = await connectionFor(actor.id, b.connection);
    if (c.recipient !== actor.id || c.status !== "pending") throw fault(409, "This invitation has already been answered.");
    const accept = b.accept === true;
    await q(`UPDATE {s}.give_connections SET status = $2, responded_at = now() WHERE id = $1`, [c.id, accept ? "accepted" : "declined"]);
    return { connection: c.id, status: accept ? "accepted" : "declined" };
  }
  async function endConnection(actor, b) {
    const c = await connectionFor(actor.id, b.connection);
    await q(`UPDATE {s}.give_connections SET status = 'ended', ended_by = $2, responded_at = COALESCE(responded_at, now()) WHERE id = $1`, [c.id, actor.id]);
    await q(`UPDATE {s}.give_waves SET status = 'withdrawn', updated_at = now() WHERE connection_id = $1 AND status IN ('proposed', 'active')`, [c.id]);
    return { ended: true };
  }
  async function connections(actor) {
    const mine = await requireProfile(actor.id);
    const rows = await q(`SELECT c.*, p.*, c.id AS cid, c.status AS cstatus, c.created_at AS c_created,
        (SELECT max(m.created_at) FROM {s}.give_messages m WHERE m.connection_id = c.id) AS last_message
      FROM {s}.give_connections c JOIN {s}.give_profiles p ON p.user_id = CASE WHEN c.requester = $1 THEN c.recipient ELSE c.requester END
      WHERE (c.requester = $1 OR c.recipient = $1) AND c.status IN ('pending', 'accepted')
      ORDER BY COALESCE((SELECT max(m.created_at) FROM {s}.give_messages m WHERE m.connection_id = c.id), c.responded_at, c.created_at) DESC`, [actor.id]);
    return {
      connections: rows.map((r) => ({
        id: r.cid, status: r.cstatus, direction: r.requester === actor.id ? "out" : "in", note: r.note,
        createdAt: r.c_created, respondedAt: r.responded_at, lastMessage: r.last_message,
        person: shared(r), common: common(mine, r),
      })),
    };
  }
  async function connection(actor, connectionId) {
    const mine = await requireProfile(actor.id);
    const c = await connectionFor(actor.id, connectionId);
    const other = await profileOf(c.other);
    if (!other || !["pending", "accepted"].includes(c.status)) throw fault(404, "This connection is not available.");
    return { id: c.id, status: c.status, direction: c.requester === actor.id ? "out" : "in", note: c.note, respondedAt: c.responded_at, person: shared(other), common: common(mine, other) };
  }

  // ---- Private messages --------------------------------------------------------------------------------------
  async function thread(actor, connectionId, after) {
    const c = await connectionFor(actor.id, connectionId);
    if (c.status !== "accepted") throw fault(403, "Messages open once you both accept.");
    const since = after && !Number.isNaN(Date.parse(after)) ? after : "1970-01-01";
    const rows = await q(`SELECT id, sender, body, created_at FROM {s}.give_messages WHERE connection_id = $1 AND created_at > $2 ORDER BY created_at ASC LIMIT 300`, [c.id, since]);
    return { messages: rows.map((m) => ({ id: m.id, mine: m.sender === actor.id, body: m.body, at: m.created_at })) };
  }
  async function send(actor, b) {
    const mine = await requireProfile(actor.id);
    const c = await connectionFor(actor.id, b.connection);
    if (c.status !== "accepted") throw fault(403, "Messages open once you both accept.");
    if (await blocked(actor.id, c.other)) throw fault(403, "This conversation is closed.");
    const body = prose(b.body, 1000);
    if (!body) throw fault(400, "Write a message first.");
    await limit(actor.id, "message", 90);
    const mid = randomUUID();
    const row = await one(`INSERT INTO {s}.give_messages (id, connection_id, sender, body) VALUES ($1, $2, $3, $4) RETURNING created_at`, [mid, c.id, mine.user_id, body]);
    return { message: { id: mid, mine: true, body, at: row.created_at } };
  }

  // ---- Safety ------------------------------------------------------------------------------------------------
  async function block(actor, b) {
    const target = id(b.ref) && (await one(`SELECT user_id FROM {s}.give_profiles WHERE ref = $1`, [id(b.ref)]));
    if (!target || target.user_id === actor.id) throw fault(404, "This person is not available.");
    await q(`INSERT INTO {s}.give_blocks (blocker, blocked) VALUES ($1, $2) ON CONFLICT DO NOTHING`, [actor.id, target.user_id]);
    await q(`UPDATE {s}.give_connections SET status = 'ended', ended_by = $1, responded_at = COALESCE(responded_at, now())
      WHERE LEAST(requester, recipient) = LEAST($1, $2) AND GREATEST(requester, recipient) = GREATEST($1, $2) AND status IN ('pending', 'accepted')`, [actor.id, target.user_id]);
    return { blocked: true };
  }
  async function report(actor, b) {
    await limit(actor.id, "report", 12, 24);
    const reason = REASONS.includes(b.reason) ? b.reason : null;
    if (!reason) throw fault(400, "Choose a reason.");
    const target = id(b.ref) ? await one(`SELECT user_id FROM {s}.give_profiles WHERE ref = $1`, [id(b.ref)]) : null;
    const opp = id(b.opportunity) ? await one(`SELECT id, created_by FROM {s}.give_opportunities WHERE id = $1`, [id(b.opportunity)]) : null;
    const conn = id(b.connection) ? await connectionFor(actor.id, b.connection).catch(() => null) : null;
    if (!target && !opp) throw fault(400, "Nothing to report.");
    await q(`INSERT INTO {s}.give_reports (id, reporter, reported, connection_id, opportunity_id, reason, detail) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [randomUUID(), actor.id, target?.user_id || opp?.created_by || null, conn?.id || null, opp?.id || null, reason, prose(b.detail, 1000) || null]);
    if (b.block === true && target) await block(actor, { ref: b.ref });
    return { reported: true };
  }

  // ---- Opportunities -----------------------------------------------------------------------------------------
  async function opportunities(actor, f = {}) {
    const mine = await profileOf(actor.id);
    const params = [actor.id];
    const where = [`o.status = 'open'`];
    if (f.kind && KINDS.includes(f.kind)) { params.push(f.kind); where.push(`o.kind = $${params.length}`); }
    if (f.cause && CAUSES.includes(f.cause)) { params.push(f.cause); where.push(`o.cause = $${params.length}`); }
    if (f.time && TIMES.includes(f.time) && f.time !== "flexible") { params.push(f.time); where.push(`($${params.length} = ANY(o.times) OR 'flexible' = ANY(o.times) OR cardinality(o.times) = 0)`); }
    if (f.remote === "only") where.push(`o.remote`);
    if (f.remote === "exclude") where.push(`NOT o.remote`);
    if (f.skill) { params.push(clean(f.skill, 32).toLowerCase()); where.push(`$${params.length} = ANY(o.skills)`); }
    if (f.q) { params.push(`%${clean(f.q, 60).replace(/[%_\\]/g, "\\$&")}%`); where.push(`(o.title ILIKE $${params.length} OR o.need ILIKE $${params.length} OR o.organizer ILIKE $${params.length} OR o.place ILIKE $${params.length})`); }
    if (f.saved === "1") where.push(`s.user_id IS NOT NULL`);
    const rows = await q(`SELECT o.*, s.user_id IS NOT NULL AS is_saved FROM {s}.give_opportunities o
      LEFT JOIN {s}.give_saves s ON s.opportunity_id = o.id AND s.user_id = $1
      WHERE ${where.join(" AND ")} ORDER BY o.verified DESC, o.created_at DESC LIMIT 120`, params);
    let list = rows.map((o) => ({ ...opportunityOut(o, actor.id, o.is_saved), _lat: o.lat, _lng: o.lng }));
    if (f.near === "1" && mine?.lat != null) {
      list = list.filter((o) => o.remote || (o._lat != null && km(mine, { lat: o._lat, lng: o._lng }) <= 80));
    }
    for (const o of list) { o.distance = mine?.lat != null && o._lat != null ? (km(mine, { lat: o._lat, lng: o._lng }) <= 25 ? "near" : km(mine, { lat: o._lat, lng: o._lng }) <= 80 ? "region" : null) : null; delete o._lat; delete o._lng; }
    return { opportunities: list };
  }
  async function createOpportunity(actor, b) {
    await requireProfile(actor.id);
    await limit(actor.id, "opportunity", 6, 24);
    const kind = KINDS.includes(b.kind) ? b.kind : null;
    const title = clean(b.title, 90), need = prose(b.need, 800), organizer = clean(b.organizer, 90), how = prose(b.how, 500);
    if (!kind || title.length < 4 || need.length < 10 || organizer.length < 2 || how.length < 6) throw fault(400, "Add a title, what help is needed, who is organizing it, and how to take part.");
    const remote = b.remote === true;
    const place = clean(b.place, 90) || null;
    if (!remote && !place) throw fault(400, "Add where it happens, or mark it remote.");
    const lat = coord(b.lat, -90, 90), lng = coord(b.lng, -180, 180);
    const oid = randomUUID();
    await q(`INSERT INTO {s}.give_opportunities (id, created_by, kind, title, need, cause, organizer, place, lat, lng, remote, when_text, starts_on, how, url, skills, times)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)`,
      [oid, actor.id, kind, title, need, CAUSES.includes(b.cause) ? b.cause : null, organizer, place, lat, lat == null ? null : lng, remote,
        clean(b.when, 120) || null, day(b.startsOn), how, link(b.url), tags(b.skills, 8), pick(b.times, TIMES)]);
    return { id: oid };
  }
  async function saveOpportunity(actor, b) {
    const oid = id(b.opportunity);
    if (!oid) throw fault(404, "This opportunity is not available.");
    if (b.saved === false) await q(`DELETE FROM {s}.give_saves WHERE user_id = $1 AND opportunity_id = $2`, [actor.id, oid]);
    else await q(`INSERT INTO {s}.give_saves (user_id, opportunity_id) SELECT $1, id FROM {s}.give_opportunities WHERE id = $2 AND status = 'open' ON CONFLICT DO NOTHING`, [actor.id, oid]);
    return { saved: b.saved !== false };
  }
  async function closeOpportunity(actor, b) {
    const oid = id(b.opportunity);
    const row = oid && (await one(`UPDATE {s}.give_opportunities SET status = 'closed' WHERE id = $1 AND created_by = $2 RETURNING id`, [oid, actor.id]));
    if (!row) throw fault(404, "Only the person who posted it can close it.");
    return { closed: true };
  }

  // ---- Shared Waves --------------------------------------------------------------------------------------------
  async function waveFor(user, waveId) {
    const wid = id(waveId);
    const w = wid && (await one(`SELECT w.*, c.requester, c.recipient, c.status AS cstatus FROM {s}.give_waves w JOIN {s}.give_connections c ON c.id = w.connection_id
      WHERE w.id = $1 AND (c.requester = $2 OR c.recipient = $2)`, [wid, user]));
    if (!w) throw fault(404, "This Wave is not available.");
    return { ...w, other: w.requester === user ? w.recipient : w.requester };
  }
  async function proposeWave(actor, b) {
    await requireProfile(actor.id);
    const c = await connectionFor(actor.id, b.connection);
    if (c.status !== "accepted") throw fault(403, "Connect first, then choose an opportunity together.");
    const oid = id(b.opportunity);
    const o = oid && (await one(`SELECT id FROM {s}.give_opportunities WHERE id = $1 AND status = 'open'`, [oid]));
    if (!o) throw fault(404, "This opportunity is not available.");
    const wid = randomUUID();
    try {
      await q(`INSERT INTO {s}.give_waves (id, connection_id, opportunity_id, proposed_by, status) VALUES ($1, $2, $3, $4, 'proposed')`, [wid, c.id, o.id, actor.id]);
    } catch (error) {
      if (error.code === "23505") throw fault(409, "You have already invited each other to this one.");
      throw error;
    }
    await event(wid, actor.id, "invited", { note: clean(b.note, 200) || null });
    return { wave: wid };
  }
  async function respondWave(actor, b) {
    const w = await waveFor(actor.id, b.wave);
    if (w.status !== "proposed" || w.proposed_by === actor.id) throw fault(409, "This invitation is waiting for your Give Guide.");
    const accept = b.accept === true;
    await q(`UPDATE {s}.give_waves SET status = $2, updated_at = now() WHERE id = $1`, [w.id, accept ? "active" : "declined"]);
    await event(w.id, actor.id, accept ? "accepted" : "declined");
    return { status: accept ? "active" : "declined" };
  }
  async function completeWave(actor, b) {
    const w = await waveFor(actor.id, b.wave);
    if (w.status !== "active") throw fault(409, "Only an active Wave can be completed.");
    await q(`UPDATE {s}.give_waves SET status = 'completed', updated_at = now() WHERE id = $1`, [w.id]);
    await event(w.id, actor.id, "completed");
    return { status: "completed" };
  }
  async function sessionsOf(w) {
    return q(`SELECT user_id, to_char(day, 'YYYY-MM-DD') AS day, hours, together, note FROM {s}.give_sessions WHERE wave_id = $1 ORDER BY day`, [w.id]);
  }
  function confirmedOf(w, sessions) {
    const a = sessions.filter((s) => s.user_id === w.requester && s.together), b = sessions.filter((s) => s.user_id === w.recipient && s.together);
    return a.map((x) => { const y = b.find((z) => z.day === x.day); return y ? { day: x.day, hours: Math.min(x.hours, y.hours) } : null; }).filter(Boolean);
  }
  async function waveOut(user, w) {
    const [o, other, sessions, events, gratus] = await Promise.all([
      one(`SELECT * FROM {s}.give_opportunities WHERE id = $1`, [w.opportunity_id]),
      profileOf(w.other),
      sessionsOf(w),
      q(`SELECT actor, kind, detail, created_at FROM {s}.give_wave_events WHERE wave_id = $1 ORDER BY created_at ASC LIMIT 200`, [w.id]),
      q(`SELECT to_char(day, 'YYYY-MM-DD') AS day, from_user, message, point, created_at FROM {s}.give_gratus WHERE wave_id = $1 ORDER BY created_at`, [w.id]),
    ]);
    const confirmed = confirmedOf(w, sessions);
    return {
      id: w.id, status: w.status, proposedByMe: w.proposed_by === user, connection: w.connection_id, createdAt: w.created_at,
      opportunity: o ? opportunityOut(o, user) : null,
      guide: other ? { ref: other.ref, name: other.display_name } : { ref: null, name: "Your Give Guide" },
      sessions: {
        mine: sessions.filter((s) => s.user_id === user).map(({ day, hours, together, note }) => ({ day, hours, together, note })),
        theirs: sessions.filter((s) => s.user_id !== user).map(({ day, hours, together }) => ({ day, hours, together })),
      },
      confirmed,
      gratus: {
        sent: gratus.filter((g) => g.from_user === user).map((g) => ({ day: g.day, message: g.message, point: g.point })),
        received: gratus.filter((g) => g.from_user !== user).map((g) => ({ day: g.day, message: g.message, point: g.point })),
      },
      events: events.map((e) => ({ kind: e.kind, mine: e.actor === user, detail: e.detail, at: e.created_at })),
    };
  }
  async function waves(actor) {
    await requireProfile(actor.id);
    const rows = await q(`SELECT w.*, c.requester, c.recipient FROM {s}.give_waves w JOIN {s}.give_connections c ON c.id = w.connection_id
      WHERE (c.requester = $1 OR c.recipient = $1) AND w.status IN ('proposed', 'active', 'completed') ORDER BY w.updated_at DESC LIMIT 60`, [actor.id]);
    return { waves: await Promise.all(rows.map((w) => waveOut(actor.id, { ...w, other: w.requester === actor.id ? w.recipient : w.requester }))) };
  }
  async function wave(actor, waveId) { return waveOut(actor.id, await waveFor(actor.id, waveId)); }
  async function logSession(actor, b) {
    const w = await waveFor(actor.id, b.wave);
    if (!["active", "completed"].includes(w.status)) throw fault(409, "Log time once you have both said yes to this Wave.");
    const d = day(b.day);
    // The latest day anywhere on Earth right now, so no one's "today" is refused.
    const today = new Date(Date.now() + 14 * 3600000).toISOString().slice(0, 10);
    const opened = new Date(new Date(w.created_at).getTime() - 86400000).toISOString().slice(0, 10);
    if (!d || d > today || d < opened) throw fault(400, "Choose the day you gave, between when this Wave began and today.");
    const hours = Math.round(Number(b.hours) * 4) / 4;
    if (!(hours >= 0.25 && hours <= 12)) throw fault(400, "Log between a quarter hour and twelve hours.");
    await limit(actor.id, "session", 30, 24);
    await q(`INSERT INTO {s}.give_sessions (id, wave_id, user_id, day, hours, together, note) VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (wave_id, user_id, day) DO UPDATE SET hours = $5, together = $6, note = $7`,
      [randomUUID(), w.id, actor.id, d, hours, b.together === true, clean(b.note, 200) || null]);
    await event(w.id, actor.id, "logged", { day: d, hours, together: b.together === true });
    const sessions = await sessionsOf(w);
    const confirmed = confirmedOf(w, sessions).find((c) => c.day === d);
    if (confirmed) await event(w.id, null, "confirmed", confirmed);
    return { confirmed: Boolean(confirmed) };
  }
  async function sendGratus(actor, b) {
    const w = await waveFor(actor.id, b.wave);
    const d = day(b.day);
    const confirmed = confirmedOf(w, await sessionsOf(w)).find((c) => c.day === d);
    if (!confirmed) throw fault(409, "Gratus opens once you have both confirmed this day together.");
    try {
      await q(`INSERT INTO {s}.give_gratus (id, wave_id, day, from_user, to_user, message, point) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [randomUUID(), w.id, d, actor.id, w.other, prose(b.message, 400) || null, b.point !== false]);
    } catch (error) {
      if (error.code === "23505") throw fault(409, "You have already sent Gratus for this day.");
      throw error;
    }
    await event(w.id, actor.id, "gratus", { day: d });
    return { sent: true };
  }

  // ---- Your private record -------------------------------------------------------------------------------------
  async function record(actor) {
    await requireProfile(actor.id);
    const all = (await waves(actor)).waves;
    let peerHours = 0, peerSessions = 0, loggedHours = 0;
    for (const w of all) {
      for (const c of w.confirmed) { peerHours += c.hours; peerSessions++; }
      for (const s of w.sessions.mine) loggedHours += s.hours;
    }
    const received = all.flatMap((w) => w.gratus.received.map((g) => ({ ...g, wave: w.id, from: w.guide.name, title: w.opportunity?.title || "" })));
    const guides = (await connections(actor)).connections.filter((c) => c.status === "accepted").map((c) => ({ id: c.id, name: c.person.name, lastMessage: c.lastMessage }));
    return {
      waves: all.map((w) => ({ id: w.id, status: w.status, title: w.opportunity?.title || "", guide: w.guide.name, confirmed: w.confirmed.length })),
      peerHours, peerSessions, loggedHours, gratus: received, points: received.filter((g) => g.point).length, guides,
    };
  }

  // ---- Team review ---------------------------------------------------------------------------------------------
  async function adminOverview() {
    const [reports, pending, counts, paused] = await Promise.all([
      q(`SELECT r.*, a.display_name AS reporter_name, b.display_name AS reported_name, b.status AS reported_status, o.title AS opportunity_title
        FROM {s}.give_reports r LEFT JOIN {s}.give_profiles a ON a.user_id = r.reporter LEFT JOIN {s}.give_profiles b ON b.user_id = r.reported
        LEFT JOIN {s}.give_opportunities o ON o.id = r.opportunity_id WHERE r.status = 'open' ORDER BY r.created_at DESC LIMIT 100`),
      q(`SELECT * FROM {s}.give_opportunities WHERE status = 'open' AND NOT verified ORDER BY created_at DESC LIMIT 100`),
      one(`SELECT (SELECT count(*) FROM {s}.give_profiles)::int AS profiles, (SELECT count(*) FROM {s}.give_profiles WHERE seeking)::int AS seeking,
        (SELECT count(*) FROM {s}.give_connections WHERE status = 'accepted')::int AS connections, (SELECT count(*) FROM {s}.give_waves WHERE status IN ('active', 'completed'))::int AS waves`),
      q(`SELECT ref, display_name, updated_at FROM {s}.give_profiles WHERE status = 'suspended' ORDER BY updated_at DESC LIMIT 100`),
    ]);
    return {
      counts,
      reports: reports.map((r) => ({ id: r.id, reason: r.reason, detail: r.detail, at: r.created_at, reporter: r.reporter_name, reported: r.reported_name, reportedStatus: r.reported_status, opportunity: r.opportunity_title })),
      opportunities: pending.map((o) => opportunityOut(o, null)),
      paused: paused.map((p) => ({ ref: p.ref, name: p.display_name })),
    };
  }
  async function adminReport(b) {
    const r = id(b.id) && (await one(`SELECT * FROM {s}.give_reports WHERE id = $1`, [id(b.id)]));
    if (!r) throw fault(404, "Report not found.");
    if (b.outcome === "suspend" && r.reported) {
      await q(`UPDATE {s}.give_profiles SET status = 'suspended', seeking = FALSE WHERE user_id = $1`, [r.reported]);
      await q(`UPDATE {s}.give_connections SET status = 'ended', ended_by = 'team', responded_at = COALESCE(responded_at, now()) WHERE (requester = $1 OR recipient = $1) AND status IN ('pending', 'accepted')`, [r.reported]);
    }
    if (b.outcome === "restore" && r.reported) await q(`UPDATE {s}.give_profiles SET status = 'active' WHERE user_id = $1`, [r.reported]);
    if (r.opportunity_id && b.outcome === "hide") await q(`UPDATE {s}.give_opportunities SET status = 'hidden' WHERE id = $1`, [r.opportunity_id]);
    await q(`UPDATE {s}.give_reports SET status = $2 WHERE id = $1`, [r.id, b.outcome === "dismiss" ? "dismissed" : "resolved"]);
    return { ok: true };
  }
  async function adminProfile(b) {
    const ref = id(b.ref);
    const row = ref && (await one(`UPDATE {s}.give_profiles SET status = 'active' WHERE ref = $1 AND status = 'suspended' RETURNING ref`, [ref]));
    if (!row) throw fault(404, "Profile not found.");
    return { ok: true };
  }
  async function adminOpportunity(b) {
    const oid = id(b.id);
    if (!oid) throw fault(404, "Opportunity not found.");
    if (b.verified === true || b.verified === false) await q(`UPDATE {s}.give_opportunities SET verified = $2 WHERE id = $1`, [oid, b.verified]);
    if (b.hide === true) await q(`UPDATE {s}.give_opportunities SET status = 'hidden' WHERE id = $1`, [oid]);
    return { ok: true };
  }

  async function setup(schemaSql) {
    const statements = schemaSql.replaceAll("{s}", schema).replace(/^\s*--.*$/gm, "").split(";").map((v) => v.trim()).filter(Boolean);
    for (const statement of statements) await sql.query(statement);
  }

  return {
    setup, me, saveProfile, deleteProfile, matches, request, respond, endConnection, connections, connection, thread, send, block, report,
    opportunities, createOpportunity, saveOpportunity, closeOpportunity, proposeWave, respondWave, completeWave, waves, wave, logSession,
    sendGratus, record, adminOverview, adminReport, adminProfile, adminOpportunity, raw: q,
  };
}
