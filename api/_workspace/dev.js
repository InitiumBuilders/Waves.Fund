// Local development only: the workspace with stand-in people and its data held in memory, so a walk through the whole
// flow never touches the live tables or Clerk. The dev server turns it on (vite.config.ts); it can never run on Vercel,
// where process.env.VERCEL is always set. A stand-in is a tab opened with ?as=dev_name (dev_team is the team).

export const devOn = () => !process.env.VERCEL && process.env.WAVES_WORKSPACE_DEV === 'on';

export function devActor(req) {
  const id = String(req.headers['x-dev-actor'] || '');
  if (!/^dev_[a-z0-9]{1,20}$/.test(id)) return null;
  return { userId: id, email: `${id}@dev.waves.fund`, isAdmin: id === 'dev_team' };
}

// The same store the workspace tests use (scripts/workspace.test.mjs), kept for as long as the dev server runs.
export function createMemoryStore() {
  const db = new Map();
  const copy = (value) => structuredClone(value);
  return {
    ready: async () => true,
    get: async (id) => copy(db.get(id) || null),
    bySlug: async (slug) => copy([...db.values()].find((item) => item.slug === slug) || null),
    byReceipt: async (receipt) => copy([...db.values()].find((item) => [...item.offers, ...item.passes].some((record) => record.receiptHash === receipt)) || null),
    list: async (actor) => copy([...db.values()].filter((item) => actor.isAdmin || item.members.some((member) => member.email === actor.email))),
    publicList: async () => copy([...db.values()].filter((item) => item.status === 'published')),
    insert: async (wave) => {
      if ([...db.values()].some((item) => item.slug === wave.slug)) throw Object.assign(new Error('That Wave address is already in use. Choose another address.'), { status: 409 });
      db.set(wave.id, copy(wave));
    },
    save: async (wave, version) => { if (db.get(wave.id)?.version !== version) return false; db.set(wave.id, copy(wave)); return true; },
    limit: async () => {},   // no rate limit for one person on their own machine
  };
}
