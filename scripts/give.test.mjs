// End-to-end rules test for Give Together, run against a throwaway schema (never public).
// Usage: node scripts/give.test.mjs <environment-file>
import { readFile } from "node:fs/promises";
import { parseEnv } from "node:util";
import assert from "node:assert/strict";
import { createGive } from "../api/_give/core.js";

const env = parseEnv(await readFile(process.argv[2], "utf8"));
const schema = "give_test";
const g = createGive({ url: env.DATABASE_URL, schema, secret: env.WAVES_DATA_KEY });
await g.setup(await readFile(new URL("./give-schema.sql", import.meta.url), "utf8"));
for (const t of ["profiles", "connections", "messages", "blocks", "reports", "opportunities", "saves", "waves", "wave_events", "sessions", "gratus", "limits"]) await g.raw(`TRUNCATE {s}.give_${t}`);

const A = { id: "dev_a" }, B = { id: "dev_b" }, C = { id: "dev_c" }, D = { id: "dev_d" };
const rejects = async (p, status) => { await assert.rejects(p, (e) => e.status === status); };
const today = new Date().toISOString().slice(0, 10);
let n = 0; const ok = (label) => console.log(`  ok ${++n} ${label}`);

// Profiles
assert.deepEqual(await g.me(A), { profile: null }); ok("no profile yet");
await rejects(g.saveProfile(A, { name: "Ava", adult: false }), 400); ok("adults only");
await rejects(g.saveProfile(A, { name: "A", adult: true }), 400); ok("name needs two characters");
const base = { adult: true, seeking: true, times: ["weekends"], ways: ["one"] };
const a = await g.saveProfile(A, { ...base, name: "Ava", gives: ["time", "teachback", "hacking"], causes: ["education", "environment"], teach: ["Spanish"], learn: ["guitar"], lat: 41.93, lng: -87.64, place: "Chicago, IL", statement: "Together we can make a difference." });
assert.deepEqual(a.profile.gives, ["time", "teachback"]); ok("unknown values are dropped");
await g.saveProfile(B, { ...base, name: "Ben", gives: ["time", "teachback"], causes: ["education"], teach: ["guitar"], learn: ["spanish"], lat: 41.88, lng: -87.63, place: "Chicago, IL", shares: { statement: false }, statement: "private words" });
await g.saveProfile(C, { ...base, name: "Cy", gives: ["skills"], causes: ["animals"], seeking: true });
await g.saveProfile(D, { ...base, name: "Dee", gives: ["time"], causes: ["education"], seeking: false });

// Matching
const m = await g.matches(A);
assert.equal(m.matches.length, 1); assert.equal(m.matches[0].person.name, "Ben"); ok("only opted-in people with something in common");
assert.equal(m.matches[0].person.statement, null); ok("a statement not shared stays private");
assert.ok(m.matches[0].common.teachback && m.matches[0].common.teachYou.includes("guitar") && m.matches[0].common.teachThem.includes("spanish")); ok("Teachback complements are found");
assert.equal(m.matches[0].common.distance, "near"); ok("distance is a band, never a number");
assert.ok(!("user_id" in m.matches[0].person)); ok("no account ids leave the service");

// Connection by mutual consent
const r = await g.request(A, { ref: m.matches[0].person.ref, note: "Hi Ben" });
assert.equal(r.status, "pending");
await rejects(g.request(A, { ref: m.matches[0].person.ref }), 409); ok("one invitation at a time");
await rejects(g.thread(A, r.connection), 403); ok("no messages before both accept");
await rejects(g.respond(A, { connection: r.connection, accept: true }), 409); ok("only the invited person answers");
assert.equal((await g.matches(A)).matches.length, 0); ok("a pending person leaves your matches");
await g.respond(B, { connection: r.connection, accept: true });
const conns = await g.connections(A);
assert.equal(conns.connections[0].status, "accepted"); ok("accepted");

// Mutual request: if they already asked you, asking back is saying yes
const cRef = (await g.me(C)).profile.ref;
await g.saveProfile(C, { ...base, name: "Cy", gives: ["time"], causes: ["education"] });
const cr = await g.request(C, { ref: a.profile.ref });
const back = await g.request(A, { ref: cRef });
assert.equal(back.status, "accepted"); assert.equal(back.connection, cr.connection); ok("asking back accepts");

// Messages
await g.send(A, { connection: r.connection, body: "Saturday at the library?" });
await g.send(B, { connection: r.connection, body: "Yes, see you there." });
const t = await g.thread(A, r.connection);
assert.deepEqual(t.messages.map((x) => x.mine), [true, false]); ok("private thread in order");
await rejects(g.send(D, { connection: r.connection, body: "hello" }), 404); ok("outsiders cannot write in a thread");

// Opportunities
await rejects(g.createOpportunity(A, { kind: "teachback", title: "Hi" }), 400); ok("an opportunity says what, who and how");
const opp = await g.createOpportunity(A, { kind: "teachback", title: "Spanish and guitar Teachback", need: "Two teachers and a room of curious people.", organizer: "Ava and Ben", place: "Harold Washington Library, Chicago", how: "Come to the second floor meeting room.", cause: "education", times: ["weekends"], skills: ["teaching"], lat: 41.88, lng: -87.63 });
const list = await g.opportunities(B, { q: "guitar" });
assert.equal(list.opportunities.length, 1); assert.equal(list.opportunities[0].verified, false); ok("listed, and marked unverified");
assert.equal((await g.opportunities(B, { remote: "only" })).opportunities.length, 0); ok("remote filter");
assert.equal((await g.opportunities(B, { cause: "animals" })).opportunities.length, 0); ok("cause filter");
await g.saveOpportunity(B, { opportunity: opp.id });
assert.equal((await g.opportunities(B, { saved: "1" })).opportunities.length, 1); ok("saved");

// A Shared Wave
const w = await g.proposeWave(A, { connection: r.connection, opportunity: opp.id });
await rejects(g.proposeWave(B, { connection: r.connection, opportunity: opp.id }), 409); ok("one Wave per opportunity per pair");
await rejects(g.respondWave(A, { wave: w.wave, accept: true }), 409); ok("the other person says yes");
await rejects(g.logSession(A, { wave: w.wave, day: today, hours: 2, together: true }), 409); ok("no logging before both agree");
await g.respondWave(B, { wave: w.wave, accept: true });

// Volunteer together, confirm participation
await rejects(g.logSession(A, { wave: w.wave, day: "2020-01-01", hours: 2, together: true }), 400); ok("no days before the Wave began");
await rejects(g.logSession(A, { wave: w.wave, day: today, hours: 40, together: true }), 400); ok("hours have a sane limit");
assert.equal((await g.logSession(A, { wave: w.wave, day: today, hours: 2, together: true })).confirmed, false); ok("one log is not a confirmation");
await rejects(g.sendGratus(A, { wave: w.wave, day: today, message: "thank you" }), 409); ok("Gratus waits for both");
assert.equal((await g.logSession(B, { wave: w.wave, day: today, hours: 1.5, together: true })).confirmed, true); ok("both logs confirm");
const wv = await g.wave(A, w.wave);
assert.deepEqual(wv.confirmed, [{ day: today, hours: 1.5 }]); ok("confirmed hours are the smaller of the two");
await g.sendGratus(A, { wave: w.wave, day: today, message: "Thank you for teaching with me." });
await rejects(g.sendGratus(A, { wave: w.wave, day: today, message: "again" }), 409); ok("one Gratus per person per session");
const recB = await g.record(B);
assert.equal(recB.points, 1); assert.equal(recB.peerHours, 1.5); assert.equal(recB.gratus[0].message, "Thank you for teaching with me."); ok("private record holds it");
assert.ok(wv.events.some((e) => e.kind === "confirmed")); ok("activity history");
await g.completeWave(B, { wave: w.wave });
assert.equal((await g.wave(A, w.wave)).status, "completed"); ok("completed");

// Safety: report, suspend, restore, block, delete
await g.report(B, { ref: a.profile.ref, reason: "spam", detail: "test report" });
const ov = await g.adminOverview();
assert.equal(ov.reports.length, 1); assert.equal(ov.opportunities.length, 1); ok("the team sees reports and unverified listings");
await g.adminReport({ id: ov.reports[0].id, outcome: "suspend" });
await rejects(g.matches(A), 403); await rejects(g.saveProfile(A, { ...base, name: "Ava", seeking: true }), 403); ok("a suspended profile is paused");
assert.equal((await g.adminOverview()).paused.length, 1); ok("the team sees paused profiles");
await g.adminProfile({ ref: a.profile.ref });
await g.saveProfile(A, { ...base, name: "Ava", gives: ["time", "teachback"], causes: ["education"] });
await g.adminOpportunity({ id: opp.id, verified: true });
assert.equal((await g.opportunities(A, {})).opportunities[0].verified, true); ok("verified by the team");
await g.block(C, { ref: a.profile.ref });
await rejects(g.request(C, { ref: a.profile.ref }), 404); ok("blocked people cannot reach each other");
assert.ok(!(await g.matches(A)).matches.some((x) => x.person.name === "Cy")); ok("and never appear as matches");
await g.deleteProfile(D);
assert.deepEqual(await g.me(D), { profile: null }); ok("delete my profile");

console.log(`\n${n} checks passed in schema ${schema}.`);
