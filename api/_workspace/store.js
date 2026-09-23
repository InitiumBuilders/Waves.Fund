import { neon } from '@neondatabase/serverless';
import { fault } from './core.js';

export function createNeonStore(url) {
  const sql = neon(url);
  const decode = rows => rows[0] ? { ...rows[0].state, version: rows[0].version } : null;
  return {
    async ready() { await sql`SELECT id FROM wave_workspaces LIMIT 1`; return true; },
    async get(id) { return decode(await sql`SELECT state, version FROM wave_workspaces WHERE id = ${id}::uuid`); },
    async bySlug(slug) { return decode(await sql`SELECT state, version FROM wave_workspaces WHERE slug = ${slug}`); },
    async byReceipt(receiptHash) {
      return decode(await sql`SELECT state, version FROM wave_workspaces WHERE
        EXISTS (SELECT 1 FROM jsonb_array_elements(state -> 'offers') item WHERE item ->> 'receiptHash' = ${receiptHash})
        OR EXISTS (SELECT 1 FROM jsonb_array_elements(state -> 'passes') item WHERE item ->> 'receiptHash' = ${receiptHash}) LIMIT 1`);
    },
    async list(actor) {
      const rows = actor.isAdmin
        ? await sql`SELECT state, version FROM wave_workspaces ORDER BY updated_at DESC LIMIT 100`
        : await sql`SELECT state, version FROM wave_workspaces WHERE state -> 'members' @> ${JSON.stringify([{ email: actor.email }])}::jsonb ORDER BY updated_at DESC LIMIT 100`;
      return rows.map(row => ({ ...row.state, version: row.version }));
    },
    async publicList() {
      const rows = await sql`SELECT state, version FROM wave_workspaces WHERE state ->> 'status' = 'published' ORDER BY updated_at DESC LIMIT 100`;
      return rows.map(row => ({ ...row.state, version: row.version }));
    },
    async insert(wave) {
      try {
        await sql`INSERT INTO wave_workspaces (id, slug, version, state) VALUES (${wave.id}::uuid, ${wave.slug}, ${wave.version}, ${JSON.stringify(wave)}::jsonb)`;
      } catch (error) {
        if (error.code === '23505') throw fault(409, 'That Wave address is already in use. Choose another address.');
        throw error;
      }
    },
    async save(wave, expected) {
      const rows = await sql`UPDATE wave_workspaces SET state = ${JSON.stringify(wave)}::jsonb, version = ${wave.version}, updated_at = now() WHERE id = ${wave.id}::uuid AND version = ${expected} RETURNING id`;
      return rows.length === 1;
    },
    async limit(bucket, maximum, expires) {
      const rows = await sql`INSERT INTO wave_workspace_limits (bucket, count, expires_at) VALUES (${bucket}, 1, ${expires}::timestamptz)
        ON CONFLICT (bucket) DO UPDATE SET count = wave_workspace_limits.count + 1 RETURNING count`;
      if (rows[0].count > maximum) throw fault(429, 'Please take a moment and try again later.');
    },
  };
}
