import { put, get, list, del } from "@vercel/blob";
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
const key = () => process.env.WAVES_ADMIN_KEY;
const dataKey = () => process.env.WAVES_DATA_KEY;
const hash = (v, secret = dataKey()) =>
  createHmac("sha256", secret).update(v).digest("hex");
const same = (a, b) =>
  typeof a === "string" &&
  typeof b === "string" &&
  Buffer.byteLength(a) === Buffer.byteLength(b) &&
  timingSafeEqual(Buffer.from(a), Buffer.from(b));
const fail = (status, message) => Object.assign(new Error(message), { status });
const text = (v, max = 500) =>
  typeof v === "string" ? v.trim().slice(0, max) : "";
const waveTypes = new Set(["growth", "funding", "innovation", "story", "hype", "maker", "work", "brave"]);
async function read(path) {
  const file = await get(path, { access: "private", useCache: false });
  if (!file) return null;
  return JSON.parse(await new Response(file.stream).text());
}
async function write(path, data, overwrite = false) {
  return put(path, JSON.stringify(data), {
    access: "private",
    addRandomSuffix: false,
    allowOverwrite: overwrite,
    contentType: "application/json",
    cacheControlMaxAge: 60,
  });
}
async function files(prefix) {
  let cursor,
    all = [];
  do {
    const r = await list({ prefix, limit: 1000, cursor });
    all.push(...r.blobs);
    cursor = r.hasMore ? r.cursor : undefined;
  } while (cursor);
  return all;
}
function cookie(req, name) {
  const match = (req.headers.cookie || "")
    .split("; ")
    .find((v) => v.startsWith(name + "="));
  return match ? match.slice(name.length + 1) : "";
}
function signed(value, secret = dataKey()) {
  return value + "." + hash(value, secret);
}
function verify(value, secret = dataKey()) {
  const at = value.lastIndexOf(".");
  return at > 0 && same(hash(value.slice(0, at), secret), value.slice(at + 1))
    ? value.slice(0, at)
    : null;
}
function admin(req) {
  const s = verify(cookie(req, "waves_admin"), key());
  return !!s && Number(s) > Date.now();
}
function setCookie(res, name, value, seconds) {
  res.setHeader(
    "Set-Cookie",
    `${name}=${value}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${seconds}`,
  );
}
async function limit(req, action, max) {
  const ip = String(
    req.headers["x-vercel-forwarded-for"] ||
      req.headers["x-forwarded-for"] ||
      "unknown",
  ).split(",")[0];
  const bucket = hash(`${ip}:${action}:${Math.floor(Date.now() / 3600000)}`);
  for (let n = 0; n < max; n++) {
    try {
      await write(`limits/${bucket}/${n}.json`, {
        expires: Date.now() + 3600000,
      });
      return;
    } catch (e) {
      if (!/already exists/i.test(e.message)) throw e;
    }
  }
  throw fail(429, "Please try again in an hour.");
}
function originOK(req) {
  const origin = req.headers.origin;
  if (!origin) return false;
  try {
    return new URL(origin).host === req.headers.host;
  } catch {
    return false;
  }
}
function safeProject(a) {
  return {
    id: a.id,
    title: a.title,
    description: a.description,
    category: a.category,
    budget: a.budget,
    milestone: a.milestone,
    created: a.created,
    status: "Community Review",
    ...(waveTypes.has(a.waveType) ? { waveType: a.waveType } : {}),
  };
}
async function recordSubmission(a) {
  if (a.kind !== "project") return;
  const id = hash(a.id);
  try {
    await write(`trax/submissions/${id}.json`, { id, kind: "project", created: a.created });
  } catch (error) {
    if (!/already exists/i.test(error.message)) console.error("Submission count deferred", error.name);
  }
}
export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");
  try {
    if (!key() || !dataKey())
      throw fail(
        503,
        "Applications are temporarily unavailable. Please contact August@Outlier.Systems.",
      );
    const action = String(req.query.action || "public");
    if (req.method === "GET" && action === "public") {
      const rows = await Promise.all(
        (await files("published/")).map((f) => read(f.pathname)),
      );
      const voter = verify(cookie(req, "waves_learner"));
      const projects = await Promise.all(
        rows.filter(Boolean).map(async (p) => {
          const votes = await files(`votes/${p.id}/`);
          return {
            ...p,
            signals: votes.length,
            supported:
              !!voter &&
              votes.some((v) =>
                v.pathname.endsWith("/" + hash(voter) + ".json"),
              ),
          };
        }),
      );
      return res
        .status(200)
        .json({ projects, guides: (await files("guides/")).length });
    }
    if (req.method === "GET" && action === "admin") {
      if (!admin(req)) throw fail(401, "Sign in to review applications.");
      const rows = await Promise.all(
        (await files("applications/")).map((f) => read(f.pathname)),
      );
      return res.status(200).json({
        applications: rows
          .filter(Boolean)
          .sort((a, b) => b.created.localeCompare(a.created))
          .map(({ receiptHash, ...rest }) => rest),
      });
    }
    if (req.method !== "POST") throw fail(405, "Method not allowed.");
    if (!originOK(req)) throw fail(403, "Please submit from Waves.Fund.");
    if (
      !String(req.headers["content-type"] || "").startsWith("application/json")
    )
      throw fail(415, "JSON required.");
    if (Number(req.headers["content-length"] || 0) > 20000)
      throw fail(413, "This application is too long.");
    let b;
    try {
      b = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    } catch {
      throw fail(400, "Invalid request.");
    }
    if (!b || typeof b !== "object" || JSON.stringify(b).length > 20000)
      throw fail(400, "Invalid request.");
    if (action === "login") {
      await limit(req, "login", 8);
      if (!same(b.key, key()))
        throw fail(401, "That team key was not recognized.");
      setCookie(
        res,
        "waves_admin",
        signed(String(Date.now() + 8 * 3600000), key()),
        8 * 3600,
      );
      return res.json({ ok: true });
    }
    if (action === "logout") {
      setCookie(res, "waves_admin", "", 0);
      return res.json({ ok: true });
    }
    if (action === "submit") {
      if (b.website) throw fail(400, "Unable to submit.");
      if (
        !["project", "guide", "support"].includes(b.kind) ||
        b.consent !== true ||
        b.learner !== true
      )
        throw fail(400, "Confirm your learning and privacy choices.");
      const name = text(b.name, 100),
        email = text(b.email, 254).toLowerCase(),
        title = text(b.title, 120),
        description = text(b.description, 2500),
        id = text(b.id, 36),
        receipt = text(b.receipt, 80);
      if (
        !name ||
        !/^\S+@\S+\.\S+$/.test(email) ||
        !title ||
        description.length < 20 ||
        !/^[a-f0-9-]{36}$/.test(id) ||
        !/^[a-f0-9-]{72}$/.test(receipt)
      )
        throw fail(400, "Please complete the required fields.");
      if (b.kind === "project" && !text(b.milestone, 700))
        throw fail(400, "Describe your first milestone.");
      if (b.kind === "project" && b.waveType !== undefined && b.waveType !== "" && !waveTypes.has(b.waveType))
        throw fail(400, "Choose a listed Wave model or leave it open for your Guide.");
      if (b.kind !== "project" && !text(b.availability, 300))
        throw fail(400, "Tell us your availability.");
      const budget = Number(b.budget || 0);
      if (!Number.isFinite(budget) || budget < 0 || budget > 1000000)
        throw fail(400, "Enter a budget between 0 and 1,000,000 USD.");
      const path = `applications/${id}.json`;
      const existing = await read(path);
      if (existing) {
        if (same(existing.receiptHash, hash(receipt))) {
          await recordSubmission(existing);
          return res.json({ id, status: existing.status });
        }
        throw fail(409, "Please start a new application.");
      }
      await limit(req, "submit", 5);
      const application = {
        id,
        kind: b.kind,
        name,
        email,
        title,
        description,
        budget,
        category: text(b.category, 80),
        milestone: text(b.milestone, 700),
        availability: text(b.availability, 300),
        publicConsent: b.publicConsent === true,
        learner: true,
        consent: true,
        created: new Date().toISOString(),
        status: "Received",
        receiptHash: hash(receipt),
        ...(b.kind === "project" && waveTypes.has(b.waveType) ? { waveType: b.waveType } : {}),
      };
      await write(path, application);
      await recordSubmission(application);
      return res.status(201).json({ id, status: "Received" });
    }
    if (action === "status") {
      if (!/^[a-f0-9-]{36}$/.test(b.id || ""))
        throw fail(400, "Enter a valid receipt.");
      const a = await read(`applications/${b.id}.json`);
      if (!a || !same(a.receiptHash, hash(String(b.receipt || ""))))
        throw fail(404, "Receipt not found.");
      return res.json({
        id: a.id,
        status: a.status,
        title: a.title,
        created: a.created,
        ...(waveTypes.has(a.waveType) ? { waveType: a.waveType } : {}),
      });
    }
    if (action === "delete") {
      if (!admin(req)) throw fail(401, "Sign in to manage applications.");
      if (!/^[a-f0-9-]{36}$/.test(b.id || ""))
        throw fail(400, "Invalid application.");
      const paths = [
        `applications/${b.id}.json`,
        `published/${b.id}.json`,
        `guides/${b.id}.json`,
        ...(await files(`votes/${b.id}/`)).map((f) => f.pathname),
      ];
      await del(paths);
      return res.json({ ok: true });
    }
    if (action === "review") {
      if (!admin(req)) throw fail(401, "Sign in to review applications.");
      if (
        !/^[a-f0-9-]{36}$/.test(b.id || "") ||
        ![
          "Received",
          "In Review",
          "More Information Needed",
          "Approved For Community Review",
          "Guide Accepted",
          "Not Selected",
        ].includes(b.status)
      )
        throw fail(400, "Invalid review.");
      const a = await read(`applications/${b.id}.json`);
      if (!a) throw fail(404, "Application not found.");
      if (
        b.status === "Approved For Community Review" &&
        (a.kind !== "project" || !a.publicConsent)
      )
        throw fail(
          400,
          "Only projects with publication consent can be published.",
        );
      if (b.status === "Guide Accepted" && a.kind !== "guide")
        throw fail(400, "This is not a guide application.");
      a.status = b.status;
      a.reviewed = new Date().toISOString();
      await write(`applications/${a.id}.json`, a, true);
      if (a.status === "Approved For Community Review")
        await write(`published/${a.id}.json`, safeProject(a), true);
      else await del(`published/${a.id}.json`);
      if (a.status === "Guide Accepted")
        await write(`guides/${a.id}.json`, { id: a.id }, true);
      else await del(`guides/${a.id}.json`);
      return res.json({ ok: true });
    }
    if (action === "vote") {
      if (b.learner !== true)
        throw fail(
          400,
          "Self-identify as a student or lifelong learner to participate.",
        );
      if (
        !/^[a-f0-9-]{36}$/.test(b.id || "") ||
        !(await read(`published/${b.id}.json`))
      )
        throw fail(404, "This project is not open for community review.");
      await limit(req, "vote", 30);
      let voter = verify(cookie(req, "waves_learner"));
      if (!voter) {
        voter = randomBytes(24).toString("hex");
        setCookie(res, "waves_learner", signed(voter), 365 * 86400);
      }
      const path = `votes/${b.id}/${hash(voter)}.json`;
      if (b.withdraw === true) {
        await del(path);
        return res.json({ supported: false });
      }
      try {
        await write(path, { created: new Date().toISOString() });
      } catch (e) {
        if (!/already exists/i.test(e.message)) throw e;
      }
      return res.json({ supported: true });
    }
    throw fail(404, "Not found.");
  } catch (e) {
    const code = e.status || 500;
    if (code === 500) console.error("Waves API operation failed", e.name);
    res.status(code).json({
      error:
        code === 500
          ? "Unable to complete this request. Please try again."
          : e.message,
    });
  }
}
