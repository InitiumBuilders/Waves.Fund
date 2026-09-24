// Volunteer opportunities from open sources, in one shape.
//
// Volunteer Connector: a free public search API (Canada, plus remote roles), searched live by postal code.
// Idealist: a keyed API with no location search. Its listings are synced into small location tiles in
// private Blob storage (see syncIdealist), and read back by tile here. It switches on when
// IDEALIST_API_KEY is set; keys are issued by support@idealist.org.

const UA = "Waves.Fund volunteer feed (https://www.waves.fund)";
const clip = (value, max) => (typeof value === "string" ? value.replace(/\s+/g, " ").trim().slice(0, max) : "");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export function km(a, b) {
  const rad = Math.PI / 180, dLat = (b.lat - a.lat) * rad, dLng = (b.lng - a.lng) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2;
  return 12742 * Math.asin(Math.min(1, Math.sqrt(h)));
}

async function json(url, headers = {}, timeout = 6000) {
  const r = await fetch(url, { headers: { accept: "application/json", "user-agent": UA, ...headers }, signal: AbortSignal.timeout(timeout) });
  if (!r.ok) throw Object.assign(new Error(`${r.status} from ${new URL(url).host}`), { status: r.status });
  return r.json();
}

// ---- Volunteer Connector ------------------------------------------------------------------------------

function fromConnector(x) {
  const aud = x.audience || {};
  const local = aud.scope === "local" && Number.isFinite(aud.latitude);
  return {
    id: "vc:" + x.id,
    source: "Volunteer Connector",
    url: x.url,
    title: clip(x.title, 120),
    org: clip(x.organization?.name, 90),
    summary: clip(x.description, 220),
    remote: Boolean(x.remote_or_online),
    place: local ? null : (aud.regions || []).join(", ") || (aud.scope === "national" ? "Canada" : null),
    lat: local ? aud.latitude : null,
    lng: local ? aud.longitude : null,
    when: clip(x.dates, 60) || null,
    rhythm: clip(x.duration, 30) || null,
    tags: (x.activities || []).map((a) => clip(a.name, 40)).filter(Boolean).slice(0, 3),
  };
}

export async function connector({ postal, remote, pages = 3 }) {
  const base = "https://www.volunteerconnector.org/api/search/?format=json";
  const query = remote ? "&ro=on" : `&pc=${encodeURIComponent(postal)}&md=60`;
  const settled = await Promise.allSettled(Array.from({ length: pages }, (_, i) => json(`${base}${query}&page=${i + 1}`)));
  const items = [];
  for (const s of settled) if (s.status === "fulfilled") for (const x of s.value.results || []) items.push(fromConnector(x));
  if (!items.length && settled.every((s) => s.status === "rejected")) throw settled[0].reason;
  return items;
}

// ---- Idealist ----------------------------------------------------------------------------------------

const IDEALIST = "https://www.idealist.org/api/v1/listings/volops";
export const idealistKey = () => process.env.IDEALIST_API_KEY || "";
const auth = () => ({ authorization: "Basic " + Buffer.from(idealistKey() + ":").toString("base64") });
const tileOf = (lat, lng) => `${Math.floor(lat)}_${Math.floor(lng)}`;
const PREFIX = "volunteer/idealist/";

function fromIdealist(v) {
  const a = v.address || {};
  return {
    id: "id:" + v.id,
    source: "Idealist",
    url: v.url?.en || v.url?.es || v.url?.pt || "https://www.idealist.org",
    title: clip(v.name, 120),
    org: clip(v.org?.name, 90),
    summary: clip(String(v.description || "").replace(/<[^>]+>/g, " "), 220),
    remote: v.locationType === "REMOTE",
    place: [a.city, a.stateCode || a.state, a.country].filter(Boolean).join(", ") || null,
    lat: Number.isFinite(a.latitude) ? a.latitude : null,
    lng: Number.isFinite(a.longitude) ? a.longitude : null,
    when: v.startDate ? [v.startDate, v.endDate].filter(Boolean).map((d) => String(d).slice(0, 10)).join(" to ") : null,
    rhythm: v.locationType === "HYBRID" ? "hybrid" : null,
    tags: [...(v.areasOfFocus || []), ...(v.functions || [])].map((t) => clip(String(t).replace(/_/g, " ").toLowerCase(), 40)).slice(0, 3),
    ends: v.endDate || v.expires || null,
  };
}

/** Idealist listings within reach of a point, from the synced tiles. */
export async function idealistNear(read, at, radius = 80) {
  const lat0 = Math.floor(at.lat), lng0 = Math.floor(at.lng), span = Math.abs(at.lat) > 55 ? 2 : 1;
  const keys = [];
  for (let dy = -1; dy <= 1; dy++) for (let dx = -span; dx <= span; dx++) keys.push(`${lat0 + dy}_${lng0 + dx}`);
  const tiles = await Promise.all(keys.map((k) => read(`${PREFIX}tiles/${k}.json`).catch(() => null)));
  const now = Date.now();
  return tiles.filter(Boolean).flatMap((t) => Object.values(t))
    .filter((x) => x.lat != null && km(at, x) <= radius && !(x.ends && Date.parse(x.ends) < now));
}
export async function idealistRemote(read) {
  const list = (await read(`${PREFIX}remote.json`).catch(() => null)) || {};
  const now = Date.now();
  return Object.values(list).filter((x) => !(x.ends && Date.parse(x.ends) < now));
}

/**
 * One bounded pass of the Idealist sync: list what changed since the last cursor, then fetch details for
 * as many changed listings as the time allows (at least 250ms apart, one at a time, as Idealist asks),
 * and file each one into its location tile or the remote list. Safe to run again and again.
 */
export async function syncIdealist({ read, write, budgetMs = 45000, fetchJson = json }) {
  if (!idealistKey()) throw Object.assign(new Error("IDEALIST_API_KEY is not set"), { status: 503 });
  const t0 = Date.now();
  const meta = (await read(`${PREFIX}meta.json`)) || { since: "2000-01-01T00:00:00Z", pending: [], removed: [], listed: 0, filed: 0 };
  const index = (await read(`${PREFIX}index.json`)) || {};
  // 1. List changes, oldest first. `since` is inclusive, so the last timestamp repeats; ids dedupe it.
  const pending = new Set(meta.pending), removed = new Set(meta.removed || []);
  let hasMore = true;
  while (hasMore && Date.now() - t0 < budgetMs * 0.3) {
    const page = await fetchJson(`${IDEALIST}?since=${encodeURIComponent(meta.since)}`, auth(), 15000);
    const list = page.volops || [];
    for (const v of list) { if (v.isPublished === false) { removed.add(v.id); pending.delete(v.id); } else { pending.add(v.id); removed.delete(v.id); } }
    const last = list.length ? list[list.length - 1].updated : null;
    meta.listed += list.length;
    hasMore = Boolean(page.hasMore) && Boolean(last) && last !== meta.since;
    if (last) meta.since = last;
    await sleep(260);
  }
  // 2. Details, one at a time.
  const tiles = new Map(), touched = new Set();
  const tile = async (key) => { if (!tiles.has(key)) tiles.set(key, (await read(`${PREFIX}${key}.json`)) || {}); return tiles.get(key); };
  for (const id of removed) { const where = index[id]; if (where) { delete (await tile(where))["id:" + id]; touched.add(where); delete index[id]; } }
  removed.clear();
  for (const id of [...pending]) {
    if (Date.now() - t0 > budgetMs) break;
    try {
      const detail = await fetchJson(`${IDEALIST}/${encodeURIComponent(id)}`, auth(), 15000);
      const item = fromIdealist(detail.volop || detail);
      const where = item.remote || item.lat == null ? "remote" : `tiles/${tileOf(item.lat, item.lng)}`;
      if (index[id] && index[id] !== where) { delete (await tile(index[id]))[item.id]; touched.add(index[id]); }
      (await tile(where))[item.id] = item;
      touched.add(where); index[id] = where; meta.filed++;
    } catch (error) {
      if (error.status !== 404) throw error;
    }
    pending.delete(id);
    await sleep(260);
  }
  for (const key of touched) await write(`${PREFIX}${key}.json`, tiles.get(key));
  meta.pending = [...pending]; meta.removed = [...removed]; meta.updated = new Date().toISOString();
  await write(`${PREFIX}index.json`, index);
  await write(`${PREFIX}meta.json`, meta);
  return { since: meta.since, pending: meta.pending.length, filed: meta.filed, listed: meta.listed, tiles: touched.size };
}
