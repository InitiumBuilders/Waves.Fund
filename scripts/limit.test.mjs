// The forms' hourly limit (api/_limit.js).   node scripts/limit.test.mjs
// A fake create-only store counts the writes. Each allowed request costs one write once the instance knows the taken
// slots; a sender past the limit costs none; slots taken by another instance are found and skipped; any other store
// error is passed on; two requests at once both get a slot and the count never goes back.
import assert from "node:assert/strict";
import { makeLimit } from "../api/_limit.js";

let n = 0;
const check = (cond, what) => { assert.ok(cond, what); n++; };
const fail = (status, message) => Object.assign(new Error(message), { status });

function store() {
  const taken = new Set();
  const s = {
    writes: 0, broken: false,
    async write(path) {
      s.writes++;
      await Promise.resolve();
      if (s.broken) throw new Error("store unavailable");
      if (taken.has(path)) throw new Error("This blob already exists");
      taken.add(path);
    },
    taken,
  };
  return s;
}

{
  const s = store(), limit = makeLimit({ write: s.write, fail });
  await limit("a", 3);
  check(s.writes === 1 && s.taken.has("limits/a/0.json"), "the first request takes slot 0 with one write");
  await limit("a", 3);
  await limit("a", 3);
  check(s.writes === 3 && s.taken.has("limits/a/2.json"), "the second and third requests cost one write each");
  await assert.rejects(limit("a", 3), (e) => e.status === 429);
  check(s.writes === 3, "a request past the limit is refused with no write");
  await assert.rejects(limit("a", 3), (e) => e.status === 429);
  check(s.writes === 3, "and so is the next one");
  await limit("b", 3);
  check(s.writes === 4 && s.taken.has("limits/b/0.json"), "another sender has their own slots");
}

{
  // Two instances share the store; each knows only its own slots.
  const s = store(), one = makeLimit({ write: s.write, fail }), two = makeLimit({ write: s.write, fail });
  await one("a", 3);
  await one("a", 3);
  await two("a", 3);
  check(s.taken.has("limits/a/2.json") && s.writes === 5, "a second instance finds the taken slots and takes the next");
  await assert.rejects(one("a", 3), (e) => e.status === 429);
  check(s.writes === 6, "the first instance learns the last slot went elsewhere with one failed write");
  await assert.rejects(two("a", 3), (e) => e.status === 429);
  check(s.writes === 6, "the second instance refuses with no write: it knows every slot is taken");
}

{
  const s = store(), limit = makeLimit({ write: s.write, fail });
  s.broken = true;
  await assert.rejects(limit("a", 3), (e) => e.message === "store unavailable" && e.status === undefined);
  check(s.writes === 1, "a store failure is passed on at once, not counted as a taken slot");
  s.broken = false;
  await limit("a", 3);
  check(s.taken.has("limits/a/0.json"), "after a store failure the sender still has every slot");
}

{
  const s = store(), limit = makeLimit({ write: s.write, fail });
  await Promise.all([limit("a", 3), limit("a", 3)]);
  check(s.taken.has("limits/a/0.json") && s.taken.has("limits/a/1.json"), "two requests at once both get a slot");
  await limit("a", 3);
  check(s.taken.has("limits/a/2.json") && s.writes === 4, "the next request starts at the first free slot");
}

console.log(`limit: ${n} checks passed`);
