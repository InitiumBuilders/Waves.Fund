// Fails when a real secret value, or anything shaped like a known token, appears in a folder.
// Usage: node scripts/check-secrets.mjs <folder> [env files...]
// Prints variable names and file paths only, never the values.
import { readFile, readdir } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { parseEnv } from 'node:util';

const [root = '.', ...envFiles] = process.argv.slice(2);
const skipDirs = new Set(['.git', 'node_modules', 'dist']);
const textFile = /\.(m?js|cjs|ts|tsx|json|md|css|html|sql|txt|ya?ml|example)$|(^|[\\/])\.[^\\/]+$/;
const shapes = [
  ['Clerk secret key', /sk_(live|test)_[A-Za-z0-9]{20,}/],
  ['Vercel Blob token', /vercel_blob_rw_[A-Za-z0-9_]{16,}/],
  ['Postgres URL with password', /postgres(ql)?:\/\/[^\s:@/]+:[^\s@/]+@/],
  ['Neon password', /npg_[A-Za-z0-9]{12,}/],
  ['GitHub token', /(ghp_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{30,})/],
  ['JSON web token', /eyJ[A-Za-z0-9_-]{20,}\.eyJ[A-Za-z0-9_-]{20,}\./],
  ['Private key', /-----BEGIN [A-Z ]*PRIVATE KEY-----/],
];

const secrets = [];
for (const file of envFiles) {
  const env = parseEnv(await readFile(file, 'utf8'));
  for (const [name, value] of Object.entries(env)) {
    if (value && value.length >= 12 && !/^(true|false|production|preview|development)$/i.test(value)) secrets.push([name, value]);
  }
}

async function* walk(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    if (skipDirs.has(entry.name)) continue;
    const path = join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(path);
    else yield path;
  }
}

const found = [];
let scanned = 0;
for await (const path of walk(root)) {
  if (/(^|[\\/])\.env(?!\.example$)/.test(relative(root, path))) { found.push(`${relative(root, path)}: environment file present`); continue; }
  const content = (await readFile(path)).toString('latin1');
  scanned++;
  for (const [name, value] of secrets) if (content.includes(value)) found.push(`${relative(root, path)}: value of ${name}`);
  if (textFile.test(path)) for (const [label, pattern] of shapes) if (pattern.test(content)) found.push(`${relative(root, path)}: looks like a ${label}`);
}

if (found.length) {
  console.error(`Secret check failed (${found.length}):\n${found.map(line => `  ${line}`).join('\n')}`);
  process.exit(1);
}
console.log(`Secret check passed: ${scanned} files, ${secrets.length} known values, ${shapes.length} token shapes.`);
