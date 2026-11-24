// Serves a built folder on 127.0.0.1 for the length of one rig run, then stops. No dev server is left running.
// Every path outside the folder is refused, unknown paths get index.html (the app routes them), and /api answers
// 404 (like vite preview, which has no API either).
//   node scripts/qa/serve.mjs [--dir dist] -- <command> [args]     ({base} in the args becomes the address)
// Example: node scripts/qa/serve.mjs -- node scripts/qa/gate.mjs {base}
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, join, normalize, resolve, sep } from "node:path";
import { spawn } from "node:child_process";

const argv = process.argv.slice(2);
const cut = argv.indexOf("--");
if (cut < 0 || cut === argv.length - 1) { console.error("usage: node scripts/qa/serve.mjs [--dir dist] -- <command> [args]"); process.exit(2); }
const own = argv.slice(0, cut), command = argv.slice(cut + 1);
const root = resolve(own.includes("--dir") ? own[own.indexOf("--dir") + 1] : "dist");
const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".json": "application/json", ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp", ".avif": "image/avif", ".gif": "image/gif", ".ico": "image/x-icon", ".woff2": "font/woff2", ".woff": "font/woff", ".mp4": "video/mp4", ".webm": "video/webm", ".mp3": "audio/mpeg", ".wav": "audio/wav", ".txt": "text/plain; charset=utf-8", ".xml": "application/xml", ".webmanifest": "application/manifest+json", ".pdf": "application/pdf", ".md": "text/markdown; charset=utf-8", ".wasm": "application/wasm" };

async function file(path) {
  try { const s = await stat(path); return s.isFile() ? path : null; } catch { return null; }
}
const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url || "/", "http://127.0.0.1");
    if (req.method !== "GET" && req.method !== "HEAD") { res.writeHead(405).end(); return; }
    if (url.pathname.startsWith("/api/")) { res.writeHead(404, { "Content-Type": "application/json" }).end('{"error":"No API here."}'); return; }
    const wanted = normalize(join(root, decodeURIComponent(url.pathname)));
    if (wanted !== root && !wanted.startsWith(root + sep)) { res.writeHead(403).end(); return; }
    // A file, a folder's index.html, or the app's own index.html for a route.
    const found = (await file(wanted)) || (await file(join(wanted, "index.html"))) || (extname(url.pathname) ? null : join(root, "index.html"));
    if (!found) { res.writeHead(404).end(); return; }
    const body = await readFile(found);
    res.writeHead(200, { "Content-Type": TYPES[extname(found).toLowerCase()] || "application/octet-stream", "Content-Length": body.length, "Cache-Control": "no-store" });
    res.end(req.method === "HEAD" ? undefined : body);
  } catch (e) {
    res.writeHead(500).end(String(e));
  }
});
server.listen(0, "127.0.0.1", () => {
  const base = `http://127.0.0.1:${server.address().port}`;
  console.log(`serving ${root} at ${base}`);
  // Node runs directly; anything else (npx is a .cmd on Windows) goes through the shell.
  const direct = command[0] === "node";
  const child = spawn(direct ? process.execPath : command[0], command.slice(1).map((a) => a.replaceAll("{base}", base)), { stdio: "inherit", shell: !direct && process.platform === "win32" });
  const stop = (code) => { server.closeAllConnections(); server.close(() => process.exit(code ?? 1)); };
  child.on("exit", (code) => stop(code));
  child.on("error", (e) => { console.error(e.message); stop(1); });
  for (const sig of ["SIGINT", "SIGTERM"]) process.on(sig, () => { child.kill(); stop(1); });
});
