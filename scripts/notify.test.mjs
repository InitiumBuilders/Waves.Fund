// node scripts/notify.test.mjs
// The team notification: nothing is sent without a key; with one, the right mail goes to the right place; a slow
// or failing mail service never blocks or throws.
import assert from "node:assert/strict";
import { notify } from "../api/_notify.js";

delete process.env.RESEND_API_KEY;
assert.equal(await notify("x", ["y"]), false, "no key: nothing is sent");

process.env.RESEND_API_KEY = "test-key";
process.env.NOTIFY_TO = "team@example.test";
let seen;
const ok = async (url, init) => { seen = { url, init }; return { ok: true, status: 200 }; };
assert.equal(await notify("A new project application", ["A new project application arrived.", "Open Team Review: https://www.waves.fund/team/review"], { fetch: ok }), true);
assert.equal(seen.url, "https://api.resend.com/emails");
assert.equal(seen.init.headers.Authorization, "Bearer test-key");
const body = JSON.parse(seen.init.body);
assert.deepEqual(body.to, ["team@example.test"]);
assert.equal(body.subject, "Waves.Fund · A new project application");
assert.match(body.text, /Open Team Review: https:\/\/www\.waves\.fund\/team\/review/);
assert.doesNotMatch(body.text, /@/, "no address in the mail body");

const slow = (_url, init) => new Promise((_resolve, reject) => init.signal.addEventListener("abort", () => reject(Object.assign(new Error("aborted"), { name: "AbortError" }))));
assert.equal(await notify("slow", ["x"], { fetch: slow, timeout: 50 }), false, "a slow mail service is given up on");
const failing = async () => ({ ok: false, status: 500 });
assert.equal(await notify("bad", ["x"], { fetch: failing }), false, "a failing mail service is reported, not thrown");
const broken = async () => { throw new Error("network"); };
assert.equal(await notify("broken", ["x"], { fetch: broken }), false, "a network error is reported, not thrown");

console.log("notify: 10 checks passed");
