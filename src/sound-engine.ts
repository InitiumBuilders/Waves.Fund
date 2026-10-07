import { BEAT, clock } from "./cadence";

/* The sound of Waves.Fund, synthesized with the Web Audio API (loaded only when sound is on; see sound.tsx).
   - The sea: a low bed of soft noise, and a swell on the site's clock. Every eight beats the visual sea sends a wave
     from the horizon to the shore; the swell rises with it and breaks as it arrives.
   - Bells: a few sine partials in a bowl's ratios, each with its own decay, in a hall. Every note is from one D major
     pentatonic scale, so any two notes sound well together.
   - A page change is a soft wave of filtered noise.
   Levels, measured offline (scripts/qa/soundshot.mjs): the bed sits near -40 dBFS between waves, a wave rises to about
   -30 and breaks near -26, and a bell peaks near -18. */

const NOTES = [293.66, 329.63, 369.99, 440, 493.88, 587.33, 659.25, 739.99, 880, 987.77];
const CYCLE = 8 * BEAT;
const PARTIALS: [ratio: number, gain: number, decay: number][] = [[1, 1, 3.6], [1.003, 0.35, 3.4], [2, 0.2, 2.4], [2.76, 0.36, 2], [4.07, 0.1, 1.2], [5.4, 0.07, 0.8]];

type Graph = { c: BaseAudioContext; master: GainNode; dry: GainNode; wet: GainNode; swell: GainNode; band: BiquadFilterNode; noise: AudioBuffer };
let live: AudioContext | null = null, g: Graph | null = null;
let timer = 0, lastBell = 0, eventName = "";

function pinkNoise(c: BaseAudioContext, seconds: number) {
  const n = Math.floor(c.sampleRate * seconds), buf = c.createBuffer(2, n, c.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch);
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < n; i++) {
      const w = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + w * 0.0555179; b1 = 0.99332 * b1 + w * 0.0750759; b2 = 0.969 * b2 + w * 0.153852;
      b3 = 0.8665 * b3 + w * 0.3104856; b4 = 0.55 * b4 + w * 0.5329522; b5 = -0.7616 * b5 - w * 0.016898;
      d[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.11; b6 = w * 0.115926;
    }
  }
  return buf;
}

// A hall: stereo noise that dies away over three seconds, darker as it fades.
function hall(c: BaseAudioContext, seconds = 3.2) {
  const n = Math.floor(c.sampleRate * seconds), buf = c.createBuffer(2, n, c.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch); let lp = 0;
    for (let i = 0; i < n; i++) { const k = 0.25 + 0.7 * (i / n); lp += (Math.random() * 2 - 1 - lp) * (1 - k); d[i] = lp * Math.pow(1 - i / n, 2.4); }
  }
  return buf;
}

function build(c: BaseAudioContext): Graph {
  const noise = pinkNoise(c, 4);
  const comp = c.createDynamicsCompressor(); comp.threshold.value = -20; comp.ratio.value = 3; comp.connect(c.destination);
  const master = c.createGain(); master.gain.value = 0; master.connect(comp);
  const dry = c.createGain(); dry.gain.value = 0.75; dry.connect(master);
  const conv = c.createConvolver(); conv.buffer = hall(c);
  const wet = c.createGain(); wet.gain.value = 0.55; wet.connect(conv); conv.connect(master);
  const loop = (dest: AudioNode, offset: number) => { const s = c.createBufferSource(); s.buffer = noise; s.loop = true; s.connect(dest); s.start(0, offset); };
  const low = c.createBiquadFilter(); low.type = "lowpass"; low.frequency.value = 380; low.Q.value = 0.6;
  const bed = c.createGain(); bed.gain.value = 0.07; low.connect(bed); bed.connect(master); loop(low, 0);
  const band = c.createBiquadFilter(); band.type = "bandpass"; band.Q.value = 0.9;
  const swell = c.createGain(); swell.gain.value = 0.0001; band.connect(swell); swell.connect(dry); swell.connect(wet); loop(band, 2);
  return { c, master, dry, wet, swell, band, noise };
}

// The swell for the cycle that begins at `t0` (audio time): it rises as the wave nears, breaks, and washes out.
function cycle(x: Graph, t0: number) {
  const v = x.swell.gain, f = x.band.frequency, br = t0 + 0.86 * CYCLE;
  v.setValueAtTime(0.0001, t0); v.linearRampToValueAtTime(0.15, t0 + 0.6 * CYCLE); v.linearRampToValueAtTime(0.5, br);
  v.linearRampToValueAtTime(1, br + 0.3); v.setTargetAtTime(0.0001, br + 0.3, 0.5);
  f.setValueAtTime(240, t0); f.exponentialRampToValueAtTime(620, br); f.exponentialRampToValueAtTime(1500, br + 0.3); f.exponentialRampToValueAtTime(420, t0 + CYCLE - 0.05);
}

// The live swell keeps the shared clock: each cycle is planned a second before it begins, so it never drifts.
function schedule() {
  if (!g || !live) return;
  clearTimeout(timer);
  const x = g, now = live.currentTime, toNext = CYCLE - (clock() % CYCLE);
  x.swell.gain.cancelScheduledValues(now); x.band.frequency.cancelScheduledValues(now);
  x.swell.gain.setTargetAtTime(0.0001, now, 0.3);
  cycle(x, now + toNext);
  const next = () => { if (!live || g !== x) return; cycle(x, live.currentTime + (CYCLE - (clock() % CYCLE))); timer = window.setTimeout(next, CYCLE * 1000); };
  timer = window.setTimeout(next, Math.max(0, (toNext + CYCLE - 1) * 1000));
}

function bell(x: Graph, freq: number, velocity: number, delay = 0, pan = 0) {
  const c = x.c, t = c.currentTime + delay;
  const p = c.createStereoPanner(); p.pan.value = pan; p.connect(x.dry); p.connect(x.wet);
  for (const [ratio, gain, decay] of PARTIALS) {
    const o = c.createOscillator(), v = c.createGain();
    o.frequency.value = freq * ratio;
    v.gain.setValueAtTime(0.0001, t); v.gain.linearRampToValueAtTime(velocity * gain * 0.11, t + 0.008); v.gain.exponentialRampToValueAtTime(0.0001, t + decay);
    o.connect(v); v.connect(p); o.start(t); o.stop(t + decay + 0.05);
  }
}

function wave(x: Graph, delay = 0) {
  const c = x.c, t = c.currentTime + delay, s = c.createBufferSource(), f = c.createBiquadFilter(), v = c.createGain();
  s.buffer = x.noise; f.type = "lowpass"; f.Q.value = 0.8;
  f.frequency.setValueAtTime(220, t); f.frequency.exponentialRampToValueAtTime(1600, t + 0.5); f.frequency.exponentialRampToValueAtTime(260, t + 1.5);
  v.gain.setValueAtTime(0.0001, t); v.gain.linearRampToValueAtTime(0.2, t + 0.4); v.gain.exponentialRampToValueAtTime(0.0001, t + 1.5);
  s.connect(f); f.connect(v); v.connect(x.dry); v.connect(x.wet); s.start(t, Math.random() * 2); s.stop(t + 1.6);
}

const tone = (kind: string, i: number) => {
  if (kind === "on") return [[NOTES[5], 0.55, 0, -0.2], [NOTES[7], 0.45, 0.22, 0.2]];
  if (kind === "land") return [[NOTES[[0, 2, 4, 5, 7, 9][i % 6]], 0.5, 0, (i % 3 - 1) * 0.3]];
  if (kind === "tour") return [[NOTES[[0, 2, 4, 7, 5, 3][i % 6]], 0.42, 0, 0]];
  if (kind === "light") return [[NOTES[5 + (i % 5)], 0.55, 0, 0]];
  if (kind === "tap") return [[NOTES[Math.round((Math.min(100, Math.max(0, i)) / 100) * 9)], 0.4, 0, (i / 100 - 0.5) * 0.8]];
  return [];
};

function play(x: Graph, kind: string, i: number, at = 0) {
  if (kind === "page") return wave(x, at);
  for (const [f, v, d, p] of tone(kind, i)) bell(x, f, v, at + d, p);
}

function onEvent(e: Event) {
  const { kind, i } = (e as CustomEvent<{ kind: string; i: number }>).detail;
  if (!g) return;
  if (kind !== "page") { const now = performance.now(); if (now - lastBell < 90) return; lastBell = now; }   // never a flurry
  play(g, kind, i);
}

const onVisibility = () => { if (!live) return; if (document.hidden) void live.suspend(); else void live.resume().then(schedule); };

export async function start(name: string) {
  eventName = name;
  if (!live) { live = new AudioContext(); g = build(live); }
  await live.resume();
  const m = g!.master.gain; m.cancelScheduledValues(live.currentTime); m.setTargetAtTime(1, live.currentTime, 0.6);
  schedule();
  addEventListener(eventName, onEvent);
  document.addEventListener("visibilitychange", onVisibility);
}

export function stop() {
  if (!live || !g) return;
  removeEventListener(eventName, onEvent);
  document.removeEventListener("visibilitychange", onVisibility);
  clearTimeout(timer);
  const m = g.master.gain, c = live; m.cancelScheduledValues(c.currentTime); m.setTargetAtTime(0, c.currentTime, 0.15);
  window.setTimeout(() => { if (c.state === "running" && m.value < 0.01) void c.suspend(); }, 900);
}

/** The soundscape rendered offline, to listen to outside the site (scripts/qa/soundshot.mjs): sound turned on, the
    circuit landing on three cards, a tour step, a page change, a tap on the water and a light, over two swells.
    Returns 16-bit stereo WAV bytes. */
export async function preview(seconds = 2 * CYCLE) {
  const off = new OfflineAudioContext(2, Math.ceil(44100 * seconds), 44100), x = build(off);
  x.master.gain.value = 1;
  for (let t = 0; t < seconds; t += CYCLE) cycle(x, t);
  const script: [number, string, number][] = [[1, "on", 0], [3, "land", 1], [4.5, "land", 2], [6, "land", 3], [8.5, "tour", 2], [13, "page", 0], [16, "tap", 30], [18, "tap", 75], [20.5, "light", 1]];
  for (const [at, kind, i] of script) if (at < seconds) play(x, kind, i, at);
  const out = await off.startRendering();
  const n = out.length, L = out.getChannelData(0), R = out.getChannelData(1), bytes = new DataView(new ArrayBuffer(44 + n * 4));
  const s = (o: number, t: string) => { for (let k = 0; k < t.length; k++) bytes.setUint8(o + k, t.charCodeAt(k)); };
  s(0, "RIFF"); bytes.setUint32(4, 36 + n * 4, true); s(8, "WAVEfmt "); bytes.setUint32(16, 16, true); bytes.setUint16(20, 1, true); bytes.setUint16(22, 2, true);
  bytes.setUint32(24, 44100, true); bytes.setUint32(28, 44100 * 4, true); bytes.setUint16(32, 4, true); bytes.setUint16(34, 16, true); s(36, "data"); bytes.setUint32(40, n * 4, true);
  for (let k = 0; k < n; k++) { bytes.setInt16(44 + k * 4, Math.max(-1, Math.min(1, L[k])) * 32767, true); bytes.setInt16(46 + k * 4, Math.max(-1, Math.min(1, R[k])) * 32767, true); }
  return bytes.buffer;
}
