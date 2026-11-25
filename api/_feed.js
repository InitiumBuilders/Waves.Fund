/* The public feed of Waves in community review (api/community.js). Every page that shows the fund reads it, the
   Waves page reads it again each minute while it is open, and building it lists the store, which Blob bills per call.
   So one instance answers from what it listed in the last 30 seconds: requests that arrive while a listing runs share
   it, and a write that changes the feed in this instance clears it (a clear during a listing keeps that listing from
   being kept, so a fresh vote is never hidden behind an older read). Other instances are at most 30 seconds behind.
   The visitor's own "supported" is worked out per request from the listed votes, without another call. */
export function makeFeed({ files, read, ttl = 30000, now = () => Date.now() }) {
  let cache = null, pending = null, generation = 0;
  async function build() {
    const rows = (await Promise.all((await files("published/")).map((f) => read(f.pathname)))).filter(Boolean);
    const votes = await Promise.all(rows.map((p) => files(`votes/${p.id}/`)));
    return { at: now(), rows, votes, guides: (await files("guides/")).length };
  }
  return {
    async get() {
      if (cache && now() - cache.at < ttl) return cache;
      if (!pending) {
        const started = generation;
        pending = build()
          .then((built) => { if (generation === started) cache = built; return built; })
          .finally(() => { pending = null; });
      }
      return pending;
    },
    clear() { cache = null; generation++; },
  };
}
