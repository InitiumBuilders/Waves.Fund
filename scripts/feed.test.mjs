// The public feed's cache (api/_feed.js).   node scripts/feed.test.mjs
// Listed at most once per 30 s per instance; reads that arrive during a listing share it; a write's clear shows the
// change at once; a clear during a listing keeps that listing from being kept. A fake store counts the listings.
import assert from "node:assert/strict";
import { makeFeed } from "../api/_feed.js";

let n = 0, t = 1000, lists = 0;
const check = (cond, what) => { assert.ok(cond, what); n++; };
const store = {
  "published/": [{ pathname: "published/a.json" }],
  "votes/a/": [{ pathname: "votes/a/x.json", uploadedAt: "2026-11-25T10:05:00Z" }],
  "guides/": [{ pathname: "guides/g.json" }],
};
const files = async (prefix) => { lists++; await Promise.resolve(); return [...(store[prefix] || [])]; };
const read = async (path) => (path === "published/a.json" ? { id: "a", title: "A" } : null);
const feed = makeFeed({ files, read, ttl: 30000, now: () => t });

let f = await feed.get();
check(f.rows.length === 1 && f.rows[0].id === "a" && f.votes[0].length === 1 && f.guides === 1, "the feed holds the published Wave, its vote and the guide count");
check(lists === 3, "the first read lists three times: published, the Wave's votes, guides");
await feed.get();
check(lists === 3, "a read within 30 s lists nothing");
t += 29999; await feed.get();
check(lists === 3, "nor one a moment before 30 s");
t += 2; await feed.get();
check(lists === 6, "after 30 s it lists again");

store["votes/a/"].push({ pathname: "votes/a/y.json", uploadedAt: "2026-11-25T11:05:00Z" });
feed.clear(); f = await feed.get();
check(f.votes[0].length === 2 && lists === 9, "a write's clear shows the new vote at once");

feed.clear();
const [p, q] = await Promise.all([feed.get(), feed.get()]);
check(p === q && lists === 12, "two reads at once share one listing");

let release, held = true;
const slow = makeFeed({
  // The first listing of published/ waits until released, so a clear can land while it runs.
  files: async (prefix) => { lists++; if (prefix === "published/" && held) { held = false; await new Promise((r) => { release = r; }); } return [...(store[prefix] || [])]; },
  read, now: () => t,
});
const during = slow.get();
slow.clear();
release();
await during;
const before = lists;
await slow.get();
check(lists > before, "a listing interrupted by a clear is not kept: the next read lists again");

console.log(`feed: ${n} checks passed`);
