// Create the Give Together tables. Explicit operator invocation only; never prints connection strings.
// Usage: node scripts/setup-give.mjs <environment-file> [schema]
import { readFile } from "node:fs/promises";
import { parseEnv } from "node:util";
import { createGive } from "../api/_give/core.js";

const [envFile, schema = "public"] = process.argv.slice(2);
if (!envFile) { console.error("Usage: node scripts/setup-give.mjs <environment-file> [schema]"); process.exit(1); }
try {
  const env = parseEnv(await readFile(envFile, "utf8"));
  if (!env.DATABASE_URL || !env.WAVES_DATA_KEY) throw Error("Missing DATABASE_URL or WAVES_DATA_KEY");
  const give = createGive({ url: env.DATABASE_URL, schema, secret: env.WAVES_DATA_KEY });
  await give.setup(await readFile(new URL("./give-schema.sql", import.meta.url), "utf8"));
  const [counts] = await give.raw(`SELECT (SELECT count(*) FROM {s}.give_profiles)::int AS profiles, (SELECT count(*) FROM {s}.give_opportunities)::int AS opportunities`);
  console.log(JSON.stringify({ schema, ready: true, ...counts }));
} catch (error) {
  console.error(`Give Together setup failed (${error.code || error.name || "Error"}: ${String(error.message).slice(0, 120)}). No credentials were printed.`);
  process.exitCode = 1;
}
