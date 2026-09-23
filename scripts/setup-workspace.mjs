import { readFile } from 'node:fs/promises';
import { parseEnv } from 'node:util';
import { neon } from '@neondatabase/serverless';

// Explicit operator invocation only. Never prints connection strings or environment values.
const envFile = process.argv[2];
if (!envFile) { console.error('Usage: node scripts/setup-workspace.mjs <environment-file>'); process.exit(1); }
try {
  const env = parseEnv(await readFile(envFile, 'utf8'));
  if (!env.DATABASE_URL) throw Error('Missing DATABASE_URL');
  const sql = neon(env.DATABASE_URL);
  const source = await readFile(new URL('./workspace-schema.sql', import.meta.url), 'utf8');
  const statements = source.replace(/^\s*--.*$/gm, '').split(';').map(value => value.trim()).filter(Boolean);
  await sql.transaction(statements.map(statement => sql.query(statement)));
  const counts = await sql`SELECT (SELECT count(*) FROM wave_workspaces)::int AS workspaces, (SELECT count(*) FROM wave_workspace_limits)::int AS rate_buckets`;
  console.log(JSON.stringify({ schema: 'ready', ...counts[0] }));
} catch (error) {
  console.error(`Workspace setup failed (${error.code || error.name || 'Error'}). No credentials were printed.`);
  process.exitCode = 1;
}
