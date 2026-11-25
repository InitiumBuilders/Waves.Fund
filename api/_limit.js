/* The hourly limit on the public forms (api/community.js), kept as create-only files in the store. Slot n of a
   sender's hour is the file limits/<bucket>/<n>.json, and a request is allowed when it creates the first free slot.
   Each instance remembers the slots it knows are taken and starts past them, so a sender's twentieth request costs
   one write instead of twenty, and a sender past the limit is refused without a billed call. The files still decide,
   so the limit holds across instances. */
export function makeLimit({ write, fail, now = () => Date.now() }) {
  const known = new Map();
  const taken = (bucket, n) => known.set(bucket, Math.max(known.get(bucket) ?? 0, n));
  return async function limit(bucket, max) {
    if (known.size > 5000) known.clear();
    for (let n = known.get(bucket) ?? 0; n < max; n++) {
      try {
        await write(`limits/${bucket}/${n}.json`, { expires: now() + 3600000 });
        taken(bucket, n + 1);
        return;
      } catch (e) {
        if (!/already exists/i.test(e.message)) throw e;
      }
    }
    taken(bucket, max);
    throw fail(429, "Please try again in an hour.");
  };
}
