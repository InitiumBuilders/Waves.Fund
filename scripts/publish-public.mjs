// Copies the public part of this repo into another folder for github.com/InitiumBuilders/Waves.Fund.
// Usage: node scripts/publish-public.mjs <target-folder>
// Only git-tracked files are copied, so .env files and .vercel can never be included.
import { execFileSync } from 'node:child_process';
import { cp, mkdir, readdir, rm } from 'node:fs/promises';
import { dirname, join, relative, resolve } from 'node:path';

// Tracked here, kept out of the public repo.
const PRIVATE = [
  /^\.agents\//,
  /^skills-lock\.json$/,
  /^README\.md$/,
  /^VERIFICATION\.md$/,
  /^docs\/RELEASE-/,
  /^scripts\/inspect-workspace-services\.mjs$/,
];
// Files under public-repo/ exist only in the public repo and land at its root.
const OVERLAY = 'public-repo/';

const root = execFileSync('git', ['rev-parse', '--show-toplevel']).toString().trim();
const target = resolve(process.argv[2] || '');
if (!process.argv[2] || !relative(root, target).startsWith('..')) {
  console.error('Usage: node scripts/publish-public.mjs <folder outside this repo>');
  process.exit(1);
}

await mkdir(target, { recursive: true });
for (const entry of await readdir(target)) if (entry !== '.git') await rm(join(target, entry), { recursive: true, force: true });

const files = execFileSync('git', ['ls-files', '-z'], { cwd: root }).toString().split('\0').filter(Boolean);
let copied = 0;
for (const file of files) {
  const destination = file.startsWith(OVERLAY) ? file.slice(OVERLAY.length) : PRIVATE.some(rule => rule.test(file)) ? null : file;
  if (!destination) continue;
  await mkdir(dirname(join(target, destination)), { recursive: true });
  await cp(join(root, file), join(target, destination));
  copied++;
}
console.log(`Copied ${copied} of ${files.length} tracked files to ${target}`);
