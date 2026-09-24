// The first full Idealist sync, run by hand: node --env-file=.env.local scripts/idealist-sync.mjs
// Needs IDEALIST_API_KEY and BLOB_READ_WRITE_TOKEN. It is resumable: stop it any time and run it again.
import { get, put } from "@vercel/blob";
import { syncIdealist } from "../api/_volunteer/sources.js";

async function read(path) {
  const file = await get(path, { access: "private", useCache: false });
  return file ? JSON.parse(await new Response(file.stream).text()) : null;
}
async function write(path, data) {
  await put(path, JSON.stringify(data), { access: "private", addRandomSuffix: false, allowOverwrite: true, contentType: "application/json" });
}
for (let round = 1; ; round++) {
  const out = await syncIdealist({ read, write, budgetMs: 120000 });
  console.log(`round ${round}: filed ${out.filed}, pending ${out.pending}, listed ${out.listed}, since ${out.since}`);
  if (!out.pending) break;
}
