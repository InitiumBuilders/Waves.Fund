// A Shared Wave between the stand-ins Maya and Ana (test schema via the dev server): proposed, accepted, a day logged
// by both and confirmed, and Gratus sent. Prints the wave id. Usage: node givewave.mjs [base]
const base = process.argv[2] || "http://127.0.0.1:5197";
const call = async (who, action, body) => {
  const r = await fetch(`${base}/api/give?action=${action}`, body === undefined
    ? { headers: { "x-dev-actor": who } }
    : { method: "POST", headers: { "x-dev-actor": who, "Content-Type": "application/json", Origin: base }, body: JSON.stringify(body) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(`${who} ${action}: ${r.status} ${j.error || ""}`);
  return j;
};
const conn = (await call("dev_maya", "connections")).connections.find((c) => c.person.name === "Ana" && c.status === "accepted");
const opp = (await call("dev_maya", "opportunities")).opportunities.find((o) => o.title === "Shoal Creek cleanup");
let wave = (await call("dev_maya", "waves")).waves?.find((w) => w.opportunity?.title === "Shoal Creek cleanup" || w.title === "Shoal Creek cleanup");
if (!wave) {
  await call("dev_maya", "wave.propose", { connection: conn.id, opportunity: opp.id, note: "Saturday morning?" });
  const theirs = (await call("dev_ana", "waves")).waves.find((w) => w.status === "proposed");
  await call("dev_ana", "wave.respond", { wave: theirs.id, accept: true });
  wave = (await call("dev_maya", "waves")).waves.find((w) => w.id === theirs.id);
}
const day = new Date().toISOString().slice(0, 10);
await call("dev_maya", "session.log", { wave: wave.id, day, hours: 2, together: true, note: "Two bags along the trail." });
const both = await call("dev_ana", "session.log", { wave: wave.id, day, hours: 2, together: true });
console.log("confirmed:", both.confirmed);
await call("dev_ana", "gratus.send", { wave: wave.id, day, message: "Thank you for coming out early.", point: true }).catch((e) => console.log("gratus:", e.message));
console.log("wave", wave.id);
