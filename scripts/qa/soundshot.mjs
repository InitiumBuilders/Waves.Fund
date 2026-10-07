// Renders the site's soundscape offline through the dev server and saves it as a WAV file to listen to, with its
// loudness. Usage: node soundshot.mjs <dev base> <out.wav> [seconds]
const { chromium } = await import(process.env.PLAYWRIGHT_CORE || "file:///C:/Users/Initi/semble-up-citizens/node_modules/playwright-core/index.mjs");
import { writeFileSync } from "node:fs";
const [base = "http://127.0.0.1:5191", out = "vt/soundscape.wav", seconds = "24"] = process.argv.slice(2);
const b = await chromium.launch({ channel: "chrome", headless: true });
const p = await (await b.newContext()).newPage();
await p.goto(base + "/privacy", { waitUntil: "load" });
const r = await p.evaluate(async (secs) => {
  const m = await import("/src/sound-engine.ts");
  const wav = new Uint8Array(await m.preview(+secs));
  let peak = 0, sum = 0; const v = new DataView(wav.buffer);
  for (let k = 44; k < wav.length; k += 2) { const x = v.getInt16(k, true) / 32768; peak = Math.max(peak, Math.abs(x)); sum += x * x; }
  let bin = ""; for (let k = 0; k < wav.length; k += 0x8000) bin += String.fromCharCode(...wav.subarray(k, k + 0x8000));
  return { b64: btoa(bin), peak, rms: Math.sqrt(sum / ((wav.length - 44) / 2)) };
}, seconds);
writeFileSync(out, Buffer.from(r.b64, "base64"));
console.log(out, "peak", (20 * Math.log10(r.peak)).toFixed(1), "dBFS | rms", (20 * Math.log10(r.rms)).toFixed(1), "dBFS");
await b.close();
