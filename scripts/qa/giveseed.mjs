// Stand-in people for walking the Give app on the dev server. The dev server forces GIVE_SCHEMA=give_test, so all of
// this lands in the test schema, never in public. Usage: node giveseed.mjs [base]
const base = process.argv[2] || "http://127.0.0.1:5197";
const call = async (who, action, body) => {
  const r = await fetch(`${base}/api/give?action=${action}`, body === undefined
    ? { headers: { "x-dev-actor": who } }
    : { method: "POST", headers: { "x-dev-actor": who, "Content-Type": "application/json", Origin: base }, body: JSON.stringify(body) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(`${who} ${action}: ${r.status} ${j.error || ""}`);
  return j;
};
const AUSTIN = { place: "Austin, TX", lat: 30.27, lng: -97.74 };
const people = {
  dev_maya: { name: "Maya", gives: ["time", "teachback"], causes: ["environment", "education"], times: ["weekends"], ways: ["one"], skills: ["writing", "photography"], teach: ["intro to photography"], learn: ["first aid"], statement: "I want to spend my Saturdays on something that leaves a place better.", ...AUSTIN },
  dev_ana: { name: "Ana", gives: ["time"], causes: ["environment", "community"], times: ["weekends"], ways: ["one", "team"], skills: ["organizing"], statement: "Creek cleanups and tree planting, most weekends.", place: "Austin, TX", lat: 30.3, lng: -97.7 },
  dev_cara: { name: "Cara", gives: ["time", "teachback"], causes: ["environment"], times: ["weekends", "flexible"], ways: ["one"], skills: ["teaching"], teach: ["first aid"], learn: ["photography"], statement: "I teach first aid and would love to learn photography.", place: "Round Rock, TX", lat: 30.5, lng: -97.68 },
  dev_ben: { name: "Ben", gives: ["skills"], causes: ["education"], times: ["week"], ways: ["one"], skills: ["math tutoring"], statement: "Evening tutoring for high school math.", place: "Austin, TX", lat: 30.25, lng: -97.75 },
  dev_dan: { name: "Dan", gives: ["time"], causes: ["animals"], times: ["flexible"], ways: ["team"], skills: [], statement: "Shelter walks whenever I can.", place: "San Marcos, TX", lat: 29.88, lng: -97.94 },
};
for (const [who, p] of Object.entries(people)) await call(who, "profile.save", { ...p, adult: true, seeking: true, shares: { place: true, statement: true, skills: true, teach: true } });
console.log("profiles saved:", Object.keys(people).join(", "));

// Ana and Maya are Give Guides to each other; Cara has invited Maya and waits for an answer.
const refOf = async (viewer, name) => (await call(viewer, "matches")).matches?.find((m) => m.person.name === name)?.person.ref;
const conns = await call("dev_maya", "connections");
const already = (conns.connections || []).some((c) => c.person?.name === "Ana" && c.status === "accepted");
if (!already) {
  const anaRef = await refOf("dev_maya", "Ana");
  if (anaRef) await call("dev_maya", "connect.request", { ref: anaRef, note: "Would you like to do a creek cleanup together?" }).catch((e) => console.log("request:", e.message));
  const toAna = await call("dev_ana", "connections");
  const pending = (toAna.connections || []).find((c) => c.person?.name === "Maya" && c.status === "pending" && c.direction === "in");
  if (pending) await call("dev_ana", "connect.respond", { connection: pending.id, accept: true });
}
const caraRef = await refOf("dev_cara", "Maya");
if (caraRef) await call("dev_cara", "connect.request", { ref: caraRef, note: "I teach first aid; want to swap a Teachback?" }).catch((e) => console.log("cara:", e.message));

const opps = await call("dev_ana", "opportunities");
if (!JSON.stringify(opps).includes("Shoal Creek cleanup")) {
  await call("dev_ana", "opportunity.create", { kind: "volunteer", title: "Shoal Creek cleanup", need: "Hands to pick up litter along the creek trail for two hours.", cause: "environment", organizer: "Friends of Shoal Creek", place: "Austin, TX", lat: 30.28, lng: -97.75, remote: false, when: "Saturday mornings, 9 to 11", how: "Meet at the trailhead by the library. Gloves and bags provided.", times: ["weekends"] });
}
const mine = await call("dev_maya", "connections");
console.log("maya connections:", JSON.stringify(mine).slice(0, 400));
