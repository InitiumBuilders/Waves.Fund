import { put, get, list, del } from "@vercel/blob";
import { createHmac, timingSafeEqual } from "node:crypto";

// Append-only records make retries and concurrent requests safe. Closed days are
// compacted into immutable totals; no shared counter is ever overwritten.
const TIME_ZONE = "America/Chicago";
const LIVE_HOSTS = new Set(["waves.fund", "www.waves.fund"]);
const KNOWN_PAGES = new Set([
  "/now-lets-begin",
  "/", "/learn", "/guide", "/give", "/grow", "/waves", "/projects", "/apply",
  "/guide/apply", "/contribute", "/guide/team", "/guide/partners",
  "/guide/partners/green-reef", "/guide/partners/green-reef/proposal",
  "/guide/partners/semble", "/guide/partners/ocean97", "/privacy",
]);
const DAY = 86400000;
const fail = (status, message) => Object.assign(new Error(message), { status });
const hash = (value, secret = process.env.WAVES_DATA_KEY) =>
  createHmac("sha256", secret).update(value).digest("hex");
const equal = (a, b) => typeof a === "string" && typeof b === "string" &&
  Buffer.byteLength(a) === Buffer.byteLength(b) && timingSafeEqual(Buffer.from(a), Buffer.from(b));

export function calendarDay(time) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit",
  }).format(new Date(time));
}
function dayShift(day, amount) {
  return new Date(Date.parse(day + "T12:00:00Z") + amount * DAY).toISOString().slice(0, 10);
}
function admin(req, now) {
  const value = String(req.headers.cookie || "").split(/;\s*/)
    .find((v) => v.startsWith("waves_admin="))?.slice(12) || "";
  const at = value.lastIndexOf(".");
  const expiry = value.slice(0, at);
  return at > 0 && /^\d+$/.test(expiry) && Number(expiry) > now &&
    equal(hash(expiry, process.env.WAVES_ADMIN_KEY), value.slice(at + 1));
}
function sameOrigin(req) {
  try { return new URL(String(req.headers.origin)).host === req.headers.host; }
  catch { return false; }
}
function hostAllowed(req) {
  return LIVE_HOSTS.has(String(req.headers.host).toLowerCase()) ||
    (process.env.WAVES_TRAX_TEST_MODE === "true" && process.env.VERCEL_ENV !== "production");
}
export function normaliseEvent(body, now) {
  if (!body || typeof body !== "object" || Array.isArray(body) ||
      !/^[a-f0-9-]{36}$/.test(body.id || "") ||
      !Number.isInteger(body.sequence) || body.sequence < 0 || body.sequence > 1440 ||
      !Number.isInteger(body.ms) || body.ms < 0 || body.ms > 30000 ||
      !Number.isSafeInteger(body.at) || Math.abs(body.at - now) > 10 * 60000 ||
      (body.sequence === 0 && body.ms !== 0) ||
      (body.sequence !== 0 && body.ms === 0)) throw fail(400, "Invalid activity record.");
  let page = typeof body.page === "string" ? body.page : "";
  // Never retain query strings, fragments, application text or project IDs.
  if (/^\/projects\/[a-f0-9-]{36}$/.test(page)) page = "/projects/:project";
  if (page !== "/projects/:project" && !KNOWN_PAGES.has(page)) throw fail(400, "Invalid page.");
  return {
    id: hash(body.id), page, day: calendarDay(body.at),
    sequence: body.sequence, ms: body.ms,
  };
}
const storage = {
  async read(path) {
    const item = await get(path, { access: "private", useCache: false });
    return item ? JSON.parse(await new Response(item.stream).text()) : null;
  },
  async write(path, value) {
    try {
      await put(path, JSON.stringify(value), {
        access: "private", addRandomSuffix: false, allowOverwrite: false,
        contentType: "application/json", cacheControlMaxAge: 60,
      });
      return true;
    } catch (error) {
      if (/already exists/i.test(error.message)) return false;
      throw error;
    }
  },
  async files(prefix) {
    const result = [];
    let cursor;
    do {
      const page = await list({ prefix, limit: 1000, cursor });
      result.push(...page.blobs);
      if (result.length > 100000) throw fail(503, "The report is being prepared. Please try again later.");
      cursor = page.hasMore ? page.cursor : undefined;
    } while (cursor);
    return result;
  },
  async remove(paths) { if (paths.length) await del(paths); },
};
async function mapLimited(items, task, limit = 12) {
  const result = new Array(items.length);
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const index = next++;
      result[index] = await task(items[index]);
    }
  }));
  return result;
}
export function dailyTotals(events, day) {
  const pages = new Map();
  const seen = new Set();
  for (const event of events) {
    if (!event || event.day !== day) continue;
    const signature = `${event.id}:${event.sequence}`;
    if (seen.has(signature)) continue;
    seen.add(signature);
    const row = pages.get(event.page) || { page: event.page, views: 0, ms: 0 };
    row.views += event.sequence === 0 ? 1 : 0;
    row.ms += event.ms;
    pages.set(event.page, row);
  }
  return { day, pages: [...pages.values()] };
}
export function summarise(days, applications, now) {
  const today = calendarDay(now);
  const weekday = new Date(today + "T12:00:00Z").getUTCDay();
  const starts = { today, week: dayShift(today, -((weekday + 6) % 7)), month: today.slice(0, 7) + "-01", lifetime: "0000-01-01" };
  const periods = Object.fromEntries(Object.entries(starts).map(([name, from]) => {
    const pages = new Map();
    let views = 0, ms = 0;
    for (const day of days) {
      if (day.day < from || day.day > today) continue;
      for (const page of day.pages) {
        views += page.views; ms += page.ms;
        const current = pages.get(page.page) || { page: page.page, views: 0, ms: 0 };
        current.views += page.views; current.ms += page.ms;
        pages.set(page.page, current);
      }
    }
    return [name, {
      from: name === "lifetime" ? null : from, to: today, views, ms,
      projects: applications.filter((a) => a?.kind === "project" &&
        Number.isFinite(Date.parse(a.created)) && calendarDay(a.created) >= from && calendarDay(a.created) <= today).length,
      pages: [...pages.values()].sort((a, b) => b.views - a.views || b.ms - a.ms),
    }];
  }));
  const byDay = new Map(days.map((day) => [day.day, day]));
  const series = Array.from({ length: 28 }, (_, index) => {
    const day = dayShift(today, index - 27), rows = byDay.get(day)?.pages || [];
    return { day, views: rows.reduce((sum, row) => sum + row.views, 0), ms: rows.reduce((sum, row) => sum + row.ms, 0) };
  });
  return { updated: new Date(now).toISOString(), timezone: TIME_ZONE, periods, series,
    firstRecordedDay: days.filter((d) => d.pages.length).map((d) => d.day).sort()[0] || null };
}

export function createHandler(store = storage, clock = () => Date.now()) {
  async function rateLimit(req, now) {
    const address = String(req.headers["x-vercel-forwarded-for"] || req.headers["x-forwarded-for"] || "unknown").split(",")[0];
    const bucket = hash(`trax:${address}:${Math.floor(now / 60000)}`);
    const prefix = `trax/rate/${calendarDay(now)}/${bucket}/`;
    const used = new Set((await store.files(prefix)).map((file) => file.pathname));
    // An atomic free-slot claim bounds collection across concurrent instances.
    for (let slot = 0; slot < 90; slot++) {
      const path = `${prefix}${slot}.json`;
      if (!used.has(path) && await store.write(path, { expires: now + 120000 })) return;
    }
    throw fail(429, "Activity collection is temporarily paused.");
  }
  async function report(now) {
    const [savedFiles, rawFiles, appFiles, submissionFiles] = await Promise.all([
      store.files("trax/daily/"), store.files("trax/events/"), store.files("applications/"), store.files("trax/submissions/"),
    ]);
    const saved = (await mapLimited(savedFiles, (f) => store.read(f.pathname))).filter(Boolean);
    const byDay = new Map(saved.map((entry) => [entry.day, entry]));
    const groups = new Map();
    for (const file of rawFiles) {
      const day = file.pathname.split("/")[2];
      if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) continue;
      if (!groups.has(day)) groups.set(day, []);
      groups.get(day).push(file);
    }
    const closedBefore = dayShift(calendarDay(now), -2);
    await mapLimited([...groups], async ([day, files]) => {
      if (byDay.has(day)) {
        if (day < closedBefore) await store.remove(files.map((f) => f.pathname));
        return;
      }
      const entries = await mapLimited(files, (f) => store.read(f.pathname));
      const total = dailyTotals(entries, day);
      if (day < closedBefore) {
        const path = `trax/daily/${day}.json`;
        if (!await store.write(path, total)) {
          // A simultaneous report may have won the claim. Use its complete total.
          const existing = await store.read(path);
          if (existing) byDay.set(day, existing);
        } else byDay.set(day, total);
        if (byDay.has(day)) await store.remove(files.map((f) => f.pathname));
      } else byDay.set(day, total);
    }, 3);
    const submissions = new Map();
    for (const marker of await mapLimited(submissionFiles, (file) => store.read(file.pathname))) {
      if (marker?.kind === "project" && /^[a-f0-9]{64}$/.test(marker.id || "") && Number.isFinite(Date.parse(marker.created)))
        submissions.set(marker.id, { kind: "project", created: marker.created });
    }
    // Preserve a count, never the private application, when an older project
    // predates anonymous submission markers. Immutable claims avoid duplicates.
    await mapLimited(appFiles, async (file) => {
      const application = await store.read(file.pathname);
      if (application?.kind !== "project" || !Number.isFinite(Date.parse(application.created))) return;
      const id = hash(application.id || file.pathname.split("/").at(-1).replace(/\.json$/, ""));
      if (!submissions.has(id)) {
        const marker = { id, kind: "project", created: application.created };
        await store.write(`trax/submissions/${id}.json`, marker);
        submissions.set(id, marker);
      }
    });
    const expiredRates = (await store.files("trax/rate/")).filter((f) => f.pathname.split("/")[2] < closedBefore);
    await store.remove(expiredRates.map((f) => f.pathname));
    return summarise([...byDay.values()], [...submissions.values()], now);
  }
  return async function handler(req, res) {
    const started = clock();
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("X-Content-Type-Options", "nosniff");
    try {
      if (!process.env.WAVES_DATA_KEY || !process.env.WAVES_ADMIN_KEY) throw fail(503, "Analytics are temporarily unavailable.");
      if (req.method === "GET") {
        if (!admin(req, started)) throw fail(401, "Sign in with your team key to view Trax.");
        return res.status(200).json(await report(started));
      }
      if (req.method !== "POST") throw fail(405, "Method not allowed.");
      if (!sameOrigin(req)) throw fail(403, "Use Waves.Fund to send activity.");
      if (!hostAllowed(req) || req.headers.dnt === "1" || req.headers["sec-gpc"] === "1" ||
        /bot|crawler|spider|headless/i.test(String(req.headers["user-agent"] || ""))) return res.status(200).json({ collected: false });
      if (!String(req.headers["content-type"] || "").startsWith("application/json")) throw fail(415, "JSON required.");
      if (Number(req.headers["content-length"] || 0) > 2048) throw fail(413, "Invalid activity record.");
      let body;
      try { body = typeof req.body === "string" ? JSON.parse(req.body) : req.body; }
      catch { throw fail(400, "Invalid activity record."); }
      if (!body || JSON.stringify(body).length > 2048) throw fail(400, "Invalid activity record.");
      const event = normaliseEvent(body, started);
      const path = `trax/events/${event.day}/${event.id}/${event.sequence}.json`;
      // Retries consume neither another view nor another rate slot.
      if (await store.read(path)) return res.status(200).json({ collected: true });
      await rateLimit(req, started);
      await store.write(path, event);
      return res.status(202).json({ collected: true });
    } catch (error) {
      const status = error.status || 500;
      if (status === 500) console.error(JSON.stringify({ level: "error", route: "/api/trax", operation: req.method, name: error.name, ms: clock() - started }));
      return res.status(status).json({ error: status === 500 ? "Unable to load analytics. Please try again." : error.message });
    }
  };
}
export default createHandler();
