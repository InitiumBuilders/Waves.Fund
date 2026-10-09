// Walks the Wave workspace from creation to a published public Wave on the dev server, as stand-in people (dev only:
// the data lives in the dev server's memory; see api/_workspace/dev.js). The words are sample text for the walk.
// Usage: node wavewalk.mjs [dev base] [slug]
const [base = "http://127.0.0.1:5191", slug = "waves-fund"] = process.argv.slice(2);
const call = async (who, action, body, method = "POST") => {
  const url = `${base}/api/workspace?action=${action}${method === "GET" && body?.id ? `&id=${body.id}` : ""}`;
  const r = await fetch(url, { method, headers: { "x-dev-actor": who, Origin: base, ...(method === "POST" ? { "Content-Type": "application/json" } : {}) }, ...(method === "POST" ? { body: JSON.stringify({ action, ...body }) } : {}) });
  const j = await r.json(); if (!r.ok) throw new Error(`${who} ${action}: ${r.status} ${j.error}`); return j;
};
const team = "dev_team", builder = "dev_august";
const email = (id) => `${id}@dev.waves.fund`;
let w = (await call(team, "create", { title: "Waves.Fund", slug, builderEmail: email(builder), guideEmail: email(builder), template: "custom" })).wave;
console.log("created", w.slug, w.status);
w = (await call(builder, "update", { id: w.id, version: w.version,
  brief: { mission: "Sample mission for the local walk.", audience: "Builders, Guides and givers.", needs: "The first eleven builders." },
  draft: { title: "Waves.Fund", story: "Sample story for the local walk: the fund that is its own first Wave.", guideName: "August James Domanchuk", guideBio: "Founder and first Wave Guide.", buildNotes: "", deliverableUrl: "" },
  engagement: { scope: "Wave One: the fund's own Wave.", fee: "USD 1,500 (sample)", paymentSchedule: "Sample.", deliveryWindow: "Season One", revisions: "As needed", ownership: "The builder owns the Wave.", support: "Monthly" },
  currentMove: { title: "Find the first 11 builders", owner: "August", needs: "Introductions to builders with a vision", completion: "Eleven Waves invited", status: "open", outcome: "", evidence: "" },
})).wave;
w = (await call(builder, "approveEngagement", { id: w.id, version: w.version, as: "builder" })).wave;
w = (await call(builder, "approveEngagement", { id: w.id, version: w.version, as: "guide" })).wave;
w = (await call(builder, "publish", { id: w.id, version: w.version })).wave;
console.log("after publish request:", w.status);
w = (await call(team, "review", { id: w.id, version: w.version, decision: "approve" })).wave;
console.log("after team review:", w.status);
const pub = await (await fetch(`${base}/api/waves?slug=${slug}`)).json();
console.log("public:", JSON.stringify({ title: pub.wave?.title, story: pub.wave?.story?.slice(0, 50), move: pub.wave?.currentMove?.title, keys: Object.keys(pub.wave || {}) }));
