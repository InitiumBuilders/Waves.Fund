import { FIELD_MODES, type FieldMode } from "./modes";
import { Energy } from "./energy";

/** An anchor rectangle in document pixels, where a mode of the field takes place. */
export type Anchor = { name: FieldMode; left: number; top: number; width: number; height: number };
/** Content the field frames and never covers: document pixels, or viewport pixels when fixed. */
export type Clear = { left: number; top: number; width: number; height: number; fixed: boolean; radius?: number };
/** A rectangle in viewport pixels. */
export type Region = { x: number; y: number; w: number; h: number };
export type Topology = "layers" | "star" | "hubs" | "chain" | "web";

/* The Field: one steady lattice of dots in 3D under the whole site. The dots never leave their places.
   Energy moves through them: waves lift them toward you, masses sink gravity funnels into the grid, pulses
   ring out from a touch, and links light between neighbours only where both are active.
   Now and then, and as you reach a chapter, a neural network organises itself out of the lattice: some
   dots become nodes, their neighbours lean in, connections grow between them and signals travel along
   them. Then it lets go and the ground is even again. Nothing flies in; the network is made of the dots
   that were already there.
   Content is never covered. Every line of text, control and card is drawn into a small mask each frame,
   and the dots fade out around them, so the words sit on quiet ground. */

const FOCAL = 1100;
const MAX_NODES = 28, MAX_EDGES = 56;
const MASK_SCALE = 0.25;

const FIELD = `
uniform vec2 uRes;
uniform float uTime, uMix, uVisA, uVisB, uGrow, uAmb, uTrust, uScrollP;
uniform int uModeA, uModeB;
uniform vec4 uRectA, uRectB;
uniform vec3 uPointer, uMover;
uniform vec4 uPulses[4];
uniform vec4 uNodes[${MAX_NODES}];
uniform int uNodeN;
uniform vec4 uNetBox;
uniform float uNodeR;
struct F { float a; vec2 d; float z; };
float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
// Gravity: the grid leans toward a mass and sinks into a funnel around it, the way spacetime diagrams draw it.
void well(inout F f, vec2 p, vec2 c, float R, float s) {
  vec2 d = c - p; float r = length(d) + 0.001;
  f.d += d / r * s * 10.0 * (2.0 * R * r / (r * r + R * R));
  float g = exp(-r * r / (2.0 * R * R));
  f.a += s * g;
  f.z -= s * 70.0 * g;
}
float seg(vec2 p, vec2 a, vec2 b) { vec2 pa = p - a, ba = b - a; float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0); return length(pa - ba * h); }
void route(inout F f, vec2 p, vec2 a, vec2 b, float t, float s, float speed) {
  float d = seg(p, a, b);
  float along = clamp(dot(p - a, b - a) / dot(b - a, b - a), 0.0, 1.0);
  float lane = exp(-d * d / (s * s * 0.0035));
  float sig = exp(-pow((along - fract(t * speed)) * 6.0, 2.0));
  f.a += lane * (0.45 + 1.3 * sig);
  f.z += lane * sig * 30.0;
}
// One beat (1.5 s, src/cadence.ts) as an angular speed. Every motion below repeats in whole beats, so the
// field moves in step with the ripples, the symbols and the energy on the page.
const float OM = 4.1887902;
F mode(int m, vec2 p, vec4 rect, float t) {
  F f = F(0.0, vec2(0.0), 0.0);
  vec2 c = rect.xy, h = max(rect.zw, vec2(40.0));
  vec2 q = (p - c) / h;
  float s = min(h.x, h.y);
  float env = 1.0 - smoothstep(1.0, 1.6, max(abs(q.x), abs(q.y)));
  if (env <= 0.0) return f;
  if (m == 0) {                                   // vision: a mass, and waves radiating from it
    float r = length(p - c);
    well(f, p, c, s * 0.5, 1.1);
    float ring = 0.5 + 0.5 * sin(r / s * 9.0 - t * OM / 3.0);
    f.a += ring * exp(-r / (s * 1.05)) * 0.6;
    f.z += (ring - 0.5) * 34.0 * exp(-r / (s * 1.2));
  } else if (m == 1) {                            // layers: a forward pass
    float phase = fract(t / 4.5) * 5.0;
    for (int i = 0; i < 4; i++) {
      float xi = -0.75 + float(i) * 0.5;
      float col = exp(-pow((q.x - xi) / 0.075, 2.0));
      float neurons = pow(0.5 + 0.5 * cos(q.y * 3.14159 * ((i == 0 || i == 3) ? 4.0 : 6.0)), 8.0);
      float lit = exp(-pow(phase - float(i), 2.0) * 2.5);
      float a = col * (0.4 + neurons * 1.4) * (0.55 + lit * 1.1) * step(abs(q.y), 0.92);
      f.a += a; f.z += a * 40.0 * lit;
    }
    float k = floor((q.x + 0.75) / 0.5), x0 = -0.75 + k * 0.5, u = (q.x - x0) / 0.5;
    if (k >= 0.0 && k < 3.0) {
      float rows = pow(0.5 + 0.5 * cos(q.y * 3.14159 * 5.0 + k * 1.3), 12.0);
      float sig = rows * exp(-pow((u - (phase - k)) * 4.5, 2.0)) * 1.2 * step(abs(q.y), 0.9);
      f.a += sig; f.z += sig * 30.0;
    }
  } else if (m == 2) {                            // orbit: two masses in each other's orbit
    float w = t * OM / 10.0;
    vec2 o = vec2(cos(w), sin(w) * 0.55) * s * 0.52;
    well(f, p, c + o, s * 0.22, 1.35);
    well(f, p, c - o, s * 0.22, 1.35);
    float r = length(p - c) / s;
    f.a += exp(-pow((r - 0.62) * 11.0, 2.0)) * (0.45 + 0.45 * cos(atan(q.y, q.x) - w));
    f.a += exp(-pow((r - 0.62) * 11.0, 2.0)) * (0.45 + 0.45 * cos(atan(q.y, q.x) - w - 3.14159));
  } else if (m == 3) {                            // vortex: drawn inward, and down
    vec2 d = p - c; float r = length(d) + 0.001, th = atan(d.y, d.x);
    float arms = 0.5 + 0.5 * cos(th * 3.0 - log(r / s + 0.05) * 5.0 + t * OM / 4.0);
    float fall = exp(-r / (s * 0.8));
    f.a += pow(arms, 2.2) * fall * 1.9 + fall * 0.45;
    f.d += (vec2(-d.y, d.x) / r * 12.0 - d / r * 7.0) * fall;
    f.z -= fall * 90.0;
  } else if (m == 4) {                            // rise
    float up = smoothstep(1.2, -1.2, q.y);
    float crest = pow(0.5 + 0.5 * sin(q.y * 7.0 + t * OM / 3.0), 4.0);
    f.a += up * (0.28 + 0.55 * crest);
    f.z += up * crest * 36.0;
  } else if (m == 5 || m == 6) {                  // gather and hubs: masses and the paths between them
    vec2 P[5];
    int n;
    if (m == 5) { P[0] = vec2(-0.62, 0.42); P[1] = vec2(-0.12, -0.5); P[2] = vec2(0.34, 0.3); P[3] = vec2(0.72, -0.38); P[4] = vec2(0.02, 0.72); n = 5; }
    else { P[0] = vec2(-0.6, 0.38); P[1] = vec2(0.6, 0.38); P[2] = vec2(0.0, -0.5); P[3] = P[0]; P[4] = P[0]; n = 3; }
    for (int i = 0; i < 5; i++) {
      if (i >= n) break;
      vec2 a = c + P[i] * h;
      well(f, p, a, s * 0.17, 1.25);
      route(f, p, a, c + P[(i + 1) % n] * h, t + float(i) * 0.75, s, 1.0 / 3.0);
    }
  } else if (m == 7) {                            // ocean: three waves roll through the lattice in depth
    for (int i = 0; i < 3; i++) {
      float fi = float(i);
      float line = -0.42 + fi * 0.42 + 0.2 * sin(q.x * 2.3 - t * OM / 4.0 + fi * 0.8);
      float d = (q.y - line) * h.y / s;
      float near = exp(-d * d * 55.0);
      float crest = pow(0.5 + 0.5 * sin(q.x * 3.2 - t * OM / 2.0 + fi * 1.7), 3.0);
      f.a += near * (0.55 + 0.6 * crest) * step(abs(q.x), 1.05);
      f.d.y -= d * s * near * 0.35;
      f.z += near * (20.0 + 50.0 * crest);
    }
  } else if (m == 8 || m == 9) {                  // path and timeline: stations, and one pulse moving forward
    int n = m == 8 ? 6 : 5;
    float y = m == 8 ? 0.36 * sin(q.x * 3.14159 * 1.25) : 0.0;
    float d = abs(q.y - y) * h.y / s;
    float head = fract(t / 6.0) * 2.6 - 1.3;
    float pulse = exp(-pow((q.x - head) * 3.2, 2.0));
    float lane = exp(-d * d * 70.0) * step(abs(q.x), 1.02);
    f.a += lane * (0.3 + 1.2 * pulse);
    f.z += lane * pulse * 50.0;
    for (int i = 0; i < 6; i++) {
      if (i >= n) break;
      float xs = -0.9 + float(i) * (1.8 / float(n - 1));
      float ys = m == 8 ? 0.36 * sin(xs * 3.14159 * 1.25) : 0.0;
      well(f, p, c + vec2(xs, ys) * h, s * 0.1, 0.7 + 0.6 * step(xs, head));
    }
  } else if (m == 10) {                           // seed: grows with the form
    float R = s * (0.16 + 0.72 * uGrow);
    well(f, p, c, max(28.0, R * 0.55), 0.9 + uGrow * 0.7);
    f.a += exp(-pow((length(p - c) - R) / (s * 0.05), 2.0)) * (0.4 + 0.6 * uGrow);
  } else if (m == 11) {                           // bond: links carry it
    f.a += 0.18;
  } else if (m == 12) {                           // still
    f.a -= 0.25;
  } else if (m == 13) {                           // noise
    f.a += step(0.9, hash(floor(p / 9.0) + floor(t * 5.0))) * 0.9;
  }
  f.a *= env; f.d *= env; f.z *= env;
  return f;
}
F field(vec2 p, float t) {
  F f = F(0.0, vec2(0.0), 0.0);
  // The brand wave rolls across the whole field in depth, always.
  float w = sin(dot(p, vec2(0.0092, -0.003)) - t * OM / 6.0 + sin(p.y * 0.0042 + t * OM / 20.0) * 1.4);
  f.a += smoothstep(0.4, 1.0, w) * 0.34 * uAmb;
  // The ground itself rolls in depth: a long slow swell under the brand wave.
  float swell = sin(p.x * 0.0037 + t * OM / 18.0) * sin(p.y * 0.0029 - t * OM / 24.0 + 1.3);
  f.z += (w * 38.0 + swell * 54.0) * uAmb;
  F a = mode(uModeA, p, uRectA, t), b = mode(uModeB, p, uRectB, t);
  float ka = (1.0 - uMix) * uVisA, kb = uMix * uVisB;
  f.a += a.a * ka + b.a * kb; f.d += a.d * ka + b.d * kb; f.z += a.z * ka + b.z * kb;
  if (uPointer.z > 0.001) well(f, p, uPointer.xy, 130.0, uPointer.z * 0.8);
  if (uMover.z > 0.001) well(f, p, uMover.xy, uRes.x < 800.0 ? 34.0 : 60.0, uMover.z * 0.8);
  for (int k = 0; k < 4; k++) {
    float age = uTime - uPulses[k].z;
    if (age > 0.0 && age < 3.2 && uPulses[k].w > 0.0) {
      vec2 d = p - uPulses[k].xy; float r = length(d) + 0.001;
      float band = exp(-pow((r - age * 560.0) / 48.0, 2.0)) * uPulses[k].w * exp(-age * 1.1);
      f.a += band * 1.6; f.d += d / r * band * 8.0; f.z += band * 60.0;
    }
  }
  // An emerging network: each node is a lattice dot that lights, grows and rises; its neighbours lean in.
  if (uNodeN > 0 && p.x > uNetBox.x && p.x < uNetBox.z && p.y > uNetBox.y && p.y < uNetBox.w) {
    for (int k = 0; k < ${MAX_NODES}; k++) {
      if (k >= uNodeN) break;
      vec4 n = uNodes[k];
      vec2 d = n.xy - p; float r2 = dot(d, d);
      float g = exp(-r2 / (2.0 * uNodeR * uNodeR));
      if (g < 0.003) continue;
      f.a += n.z * g * (1.5 + n.w * 1.6);
      f.d += d * g * n.z * 0.8;
      f.z += n.z * g * (44.0 + n.w * 30.0);
    }
  }
  return f;
}
`;

const PROJECT = `
uniform vec2 uTilt;
uniform float uFocal;
uniform float uOpacity;
uniform sampler2D uMask;
// Project a point on the lattice (viewport px, with height z toward the viewer) through a tilted camera.
vec3 project(vec2 p, float z) {
  vec3 w = vec3(p.x - uRes.x * 0.5, uRes.y * 0.5 - p.y, z);
  float cp = cos(uTilt.x), sp = sin(uTilt.x), cy = cos(uTilt.y), sy = sin(uTilt.y);
  w = vec3(w.x, cp * w.y - sp * w.z, sp * w.y + cp * w.z);
  w = vec3(cy * w.x + sy * w.z, w.y, -sy * w.x + cy * w.z);
  float k = uFocal / max(60.0, uFocal - w.z);
  return vec3(uRes.x * 0.5 + w.x * k, uRes.y * 0.5 - w.y * k, k);
}
// How clear of content a screen point is: 0 on words and cards, 1 in open space.
float maskAt(vec2 s) { return texture(uMask, vec2(s.x / uRes.x, 1.0 - s.y / uRes.y)).r; }
vec4 toClip(vec2 s) { return vec4(s / uRes * 2.0 - 1.0, 0.0, 1.0) * vec4(1.0, -1.0, 1.0, 1.0); }
`;

const DOT_VS = `#version 300 es
precision highp float;
${FIELD}
${PROJECT}
uniform int uCols;
uniform vec2 uOrigin;
uniform float uSpacing, uBase, uGrowR, uLayerA, uDispK, uActK, uDpr, uDepth;
uniform vec3 uHue, uTintHue;
uniform vec4 uTint;
out vec3 vColor; out float vA; out float vEdge;
void main() {
  int i = gl_VertexID;
  vec2 base = uOrigin + vec2(float(i % uCols), float(i / uCols)) * uSpacing;
  F f = field(base, uTime);
  float act = clamp(f.a * uActK, 0.0, 2.8);
  vec2 pos = base + f.d * uDispK;
  vec3 s = project(pos, f.z * uDispK + uDepth);
  float m = maskAt(s.xy);
  float r = (uBase + act * uGrowR) * (1.0 + uScrollP * 0.35) * s.z * (0.55 + 0.45 * m);
  gl_PointSize = max(1.0, r * 2.0 * 1.5 * uDpr);
  vEdge = 1.0 / 1.5;
  gl_Position = toClip(s.xy);
  vec3 dim = vec3(0.26, 0.4, 0.7);
  float tint = uTint.w * exp(-pow(length(base - uTint.xy) / uTint.z, 2.0));
  vec3 hue = mix(uHue, uTintHue, clamp(tint, 0.0, 1.0));
  vColor = mix(dim, hue, clamp(act * 0.85 + tint * 0.5, 0.0, 1.0));
  vColor = mix(vColor, vec3(0.93, 0.99, 1.0), clamp((act - 1.15) * 0.7, 0.0, 0.8));
  // Nearer dots are brighter; far ones sink into the dark.
  float depthLight = clamp(0.8 + (s.z - 1.0) * 1.5, 0.5, 1.3);
  vA = uLayerA * uOpacity * depthLight * clamp(0.42 + act * 0.85 + uTrust * 0.08, 0.0, 1.0) * m;
}`;
const DOT_FS = `#version 300 es
precision highp float;
in vec3 vColor; in float vA; in float vEdge;
out vec4 o;
void main() {
  if (vA < 0.004) discard;
  float d = length(gl_PointCoord * 2.0 - 1.0);
  float disc = 1.0 - smoothstep(vEdge - 0.12, vEdge, d);
  float halo = exp(-d * d * 4.0) * 0.22;
  float a = (disc + halo) * vA;
  o = vec4(vColor * a, a);
}`;
const LINK_VS = `#version 300 es
precision highp float;
${FIELD}
${PROJECT}
uniform int uCols, uRows, uBond;
uniform vec2 uOrigin;
uniform float uSpacing, uDispK, uActK;
uniform vec3 uHue;
out float vA; out vec3 vColor;
void main() {
  int e = gl_VertexID / 2, end = gl_VertexID % 2;
  int node = e / 2, dir = e % 2;
  int col = node % uCols, row = node / uCols;
  if ((dir == 0 && col >= uCols - 1) || (dir == 1 && row >= uRows - 1)) { gl_Position = vec4(2.0, 2.0, 0.0, 1.0); vA = 0.0; vColor = vec3(0.0); return; }
  vec2 a = uOrigin + vec2(float(col), float(row)) * uSpacing;
  vec2 b = a + (dir == 0 ? vec2(uSpacing, 0.0) : vec2(0.0, uSpacing));
  F fa = field(a, uTime), fb = field(b, uTime);
  vec2 pa = a + fa.d * uDispK, pb = b + fb.d * uDispK;
  vec3 sa = project(pa, fa.z * uDispK), sb = project(pb, fb.z * uDispK);
  // A link lights only where both neighbours are active together: coordination made visible.
  float both = min(fa.a, fb.a) * uActK;
  float lit = smoothstep(0.5, 1.15, both);
  if (uBond == 1) {
    float k = hash(vec2(float(e), floor(uTime * 0.35 + hash(vec2(float(e), 3.0)) * 7.0)));
    float inside = smoothstep(1.3, 0.8, max(abs(a.x - uRectB.x) / uRectB.z, abs(a.y - uRectB.y) / uRectB.w));
    lit = max(lit, step(0.955, k) * inside * uMix * uVisB * (0.7 + uTrust * 0.3));
  }
  gl_Position = toClip(end == 0 ? sa.xy : sb.xy);
  vA = lit * 0.62 * uOpacity * maskAt((sa.xy + sb.xy) * 0.5);
  vColor = mix(uHue, vec3(0.9, 0.98, 1.0), clamp(both - 1.2, 0.0, 0.6));
}`;
const LINK_FS = `#version 300 es
precision highp float;
in float vA; in vec3 vColor;
out vec4 o;
void main() { if (vA < 0.004) discard; o = vec4(vColor * vA, vA); }`;

/* A connection in an emerging network: a thin line between two node dots, drawn where those dots really
   are (the same field and camera), growing from its source and carrying a signal toward its target. */
const EDGE_VS = `#version 300 es
precision highp float;
${FIELD}
${PROJECT}
uniform vec4 uEdgeAB[${MAX_EDGES}];
uniform vec4 uEdgeK[${MAX_EDGES}];
uniform float uEdgeW;
out float vT; out float vS; out float vMask; out vec4 vK;
void main() {
  int e = gl_VertexID / 6, c = gl_VertexID % 6;
  float t = (c == 1 || c == 4 || c == 5) ? 1.0 : 0.0;
  float side = (c == 2 || c == 3 || c == 5) ? 1.0 : -1.0;
  vec4 ab = uEdgeAB[e];
  F fa = field(ab.xy, uTime), fb = field(ab.zw, uTime);
  vec3 sa = project(ab.xy + fa.d, fa.z), sb = project(ab.zw + fb.d, fb.z);
  vec2 dir = sb.xy - sa.xy; float len = max(length(dir), 0.001);
  vec2 nrm = vec2(-dir.y, dir.x) / len;
  vec2 pos = mix(sa.xy, sb.xy, t) + nrm * side * uEdgeW;
  gl_Position = toClip(pos);
  vT = t; vS = side; vK = uEdgeK[e];
  vMask = maskAt(pos);
}`;
const EDGE_FS = `#version 300 es
precision highp float;
uniform float uTime;
uniform vec3 uHue;
uniform float uOpacity;
uniform sampler2D uMask;
uniform vec2 uCanvas;
in float vT; in float vS; in float vMask; in vec4 vK;
out vec4 o;
void main() {
  float grow = smoothstep(vK.x + 0.001, vK.x - 0.04, vT);
  float sig = exp(-pow((vT - fract(uTime * vK.w + vK.z)) * 7.0, 2.0));
  float across = exp(-vS * vS * 2.6);
  // Masked per pixel: a long connection never crosses a line of text.
  float m = texture(uMask, gl_FragCoord.xy / uCanvas).r;
  float a = across * (0.2 + 1.35 * sig) * vK.y * grow * m * uOpacity;
  if (a < 0.003) discard;
  vec3 col = mix(uHue, vec3(0.95, 1.0, 1.0), clamp(sig * 0.8, 0.0, 0.8));
  o = vec4(col * a, a);
}`;

/* The clearing mask: every block of content is drawn as a soft rounded box into a small texture, the
   smallest value wins, and the dots read it. Tight to the words, feathered out over about 40px. */
const MASK_VS = `#version 300 es
precision highp float;
layout(location = 0) in vec4 aRect;   // centre x, y and half width, height
layout(location = 1) in vec2 aMeta;   // fixed to the viewport, corner radius
uniform vec2 uRes;
uniform float uScroll, uOuter;
out vec2 vLocal; out vec3 vBox;
void main() {
  vec2 c = vec2(float(gl_VertexID & 1), float((gl_VertexID >> 1) & 1)) * 2.0 - 1.0;
  vec2 centre = aRect.xy - vec2(0.0, aMeta.x > 0.5 ? 0.0 : uScroll);
  vec2 half_ = aRect.zw + uOuter;
  vLocal = c * half_;
  vBox = vec3(aRect.zw, aMeta.y);
  vec2 p = centre + vLocal;
  gl_Position = vec4(p / uRes * 2.0 - 1.0, 0.0, 1.0) * vec4(1.0, -1.0, 1.0, 1.0);
}`;
const MASK_FS = `#version 300 es
precision highp float;
uniform float uInner, uOuter;
in vec2 vLocal; in vec3 vBox;
out vec4 o;
void main() {
  float r = min(vBox.z, min(vBox.x, vBox.y));
  vec2 q = abs(vLocal) - vBox.xy + r;
  float d = length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
  float m = smoothstep(uInner, uOuter, d);
  m = m * m * (3.0 - 2.0 * m);
  o = vec4(m, m, m, 1.0);
}`;

function compile(gl: WebGL2RenderingContext, vs: string, fs: string) {
  const make = (type: number, src: string) => {
    const s = gl.createShader(type)!;
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw Error(gl.getShaderInfoLog(s) || "shader");
    return s;
  };
  const p = gl.createProgram()!;
  gl.attachShader(p, make(gl.VERTEX_SHADER, vs));
  gl.attachShader(p, make(gl.FRAGMENT_SHADER, fs));
  gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw Error(gl.getProgramInfoLog(p) || "link");
  const cache = new Map<string, WebGLUniformLocation | null>();
  return { p, u: (name: string) => { if (!cache.has(name)) cache.set(name, gl.getUniformLocation(p, name)); return cache.get(name)!; } };
}
type Prog = ReturnType<typeof compile>;

const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const approach = (v: number, target: number, k: number, dt: number) => v + (target - v) * (1 - Math.exp(-k * dt));
const mix3 = (a: number[], b: number[], k: number) => a.map((v, i) => v + (b[i] - v) * k);
const smooth = (a: number, b: number, x: number) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

type Layer = { spacing: number; parallax: number; base: number; grow: number; alpha: number; disp: number; act: number; depth: number; cols: number; rows: number };
type NetNode = { lx: number; ly: number; delay: number; flash: number };
type NetEdge = { a: number; b: number; delay: number; phase: number; speed: number; last: number };
type Net = { nodes: NetNode[]; edges: NetEdge[]; t0: number; life: number };

export class Field {
  private gl: WebGL2RenderingContext;
  private dot: Prog; private link: Prog; private edge: Prog; private maskProg: Prog;
  private vao: WebGLVertexArrayObject;
  private maskVao: WebGLVertexArrayObject; private maskBuf: WebGLBuffer;
  private maskTex: WebGLTexture; private maskFbo: WebGLFramebuffer;
  private maskW = 1; private maskH = 1; private clearCount = 0;
  private layers: Layer[];
  readonly energy: Energy;
  private a: Anchor | null = null;
  private b: Anchor | null = null;
  private morphStart = -1; private mix = 1; private raf = 0; private running = false;
  private stirred = 0; private odd = false;
  private t0 = 0; private last = 0; // t0 = 0: the shared clock every loop on the page uses (src/cadence.ts)
  private dpr = 1; private w = 0; private h = 0;
  private pointer = { x: 0, y: 0, s: 0, target: 0, moved: 0 };
  private tilt = [0.2, 0];
  private mover = { x: 0, y: 0, s: 0 };
  private pulses = new Float32Array(16); private slot = 0;
  private nets: Net[] = [];
  private nodeData = new Float32Array(MAX_NODES * 4);
  private edgeAB = new Float32Array(MAX_EDGES * 4);
  private edgeK = new Float32Array(MAX_EDGES * 4);
  private visA = 0; private visB = 0;
  private hue = [0.36, 0.86, 1.0]; private hueTarget = [0.36, 0.86, 1.0];
  private tint = { x: 0, y: 0, r: 160, s: 0, target: 0, hue: [0.36, 0.86, 1.0] };
  private clears: Clear[] = [];
  // Places where the dots stay but no network may form, such as a scene drawn on its own canvas.
  private quiet: () => Clear[] = () => [];
  motion = true;
  trust = 0;
  grow = 1;
  opacity = 1;
  docHeight = 0;
  /** The scroll position, kept by the scroll listener: reading it inside a frame would force a style pass every frame. */
  sy = window.scrollY;

  constructor(private canvas: HTMLCanvasElement, energyCanvas: HTMLCanvasElement, private mobile: boolean) {
    const gl = canvas.getContext("webgl2", { alpha: true, premultipliedAlpha: true, antialias: true, powerPreference: "high-performance" });
    if (!gl) throw Error("webgl2 unavailable");
    this.gl = gl;
    this.dot = compile(gl, DOT_VS, DOT_FS);
    this.link = compile(gl, LINK_VS, LINK_FS);
    this.edge = compile(gl, EDGE_VS, EDGE_FS);
    this.maskProg = compile(gl, MASK_VS, MASK_FS);
    this.vao = gl.createVertexArray()!;
    // The mask: instanced rounded boxes into a quarter-resolution single-channel texture.
    this.maskVao = gl.createVertexArray()!;
    this.maskBuf = gl.createBuffer()!;
    gl.bindVertexArray(this.maskVao);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.maskBuf);
    gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 4, gl.FLOAT, false, 24, 0); gl.vertexAttribDivisor(0, 1);
    gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1, 2, gl.FLOAT, false, 24, 16); gl.vertexAttribDivisor(1, 1);
    gl.bindVertexArray(null);
    this.maskTex = gl.createTexture()!;
    this.maskFbo = gl.createFramebuffer()!;
    this.energy = new Energy(energyCanvas);
    const s = mobile ? 26 : 30;
    // Back to front: a deep, dense matrix far behind, an offset middle, and the front dots that carry the field.
    this.layers = [
      { spacing: s * 0.62, parallax: 0.08, base: 1.0, grow: 1.1, alpha: 0.3, disp: 0.35, act: 0.6, depth: -340, cols: 0, rows: 0 },
      { spacing: s, parallax: 0.16, base: 1.2, grow: 1.6, alpha: 0.42, disp: 0.6, act: 0.8, depth: -220, cols: 0, rows: 0 },
      { spacing: s, parallax: 0.3, base: mobile ? 2.2 : 2.1, grow: mobile ? 3.8 : 4.6, alpha: 0.9, disp: 1, act: 1, depth: 0, cols: 0, rows: 0 },
    ];
    this.resize();
  }

  resize() {
    const gl = this.gl;
    this.dpr = Math.min(window.devicePixelRatio || 1, this.mobile ? 2 : 1.75);
    this.w = window.innerWidth; this.h = window.innerHeight;
    this.canvas.width = Math.round(this.w * this.dpr);
    this.canvas.height = Math.round(this.h * this.dpr);
    this.energy.resize(this.w, this.h, this.dpr);
    // Deeper layers must span more of the plane to fill the screen once perspective shrinks them.
    for (const l of this.layers) { const k = 1 - l.depth / FOCAL; l.cols = Math.ceil((this.w * k * 1.18) / l.spacing) + 3; l.rows = Math.ceil((this.h * k * 1.3) / l.spacing) + 3; }
    this.maskW = Math.max(1, Math.ceil(this.w * MASK_SCALE)); this.maskH = Math.max(1, Math.ceil(this.h * MASK_SCALE));
    gl.deleteTexture(this.maskTex);
    this.maskTex = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D, this.maskTex);
    gl.texStorage2D(gl.TEXTURE_2D, 1, gl.R8, this.maskW, this.maskH);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.maskFbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.maskTex, 0);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    this.wake();
  }

  focus(anchor: Anchor | null) {
    if (sameRect(anchor, this.b)) return;
    this.a = this.b; this.visA = this.visB;
    this.b = anchor;
    if (!this.motion) { this.a = anchor; this.mix = 1; this.morphStart = -1; this.wake(); return; }
    this.mix = 0; this.morphStart = this.now();
    this.wake();
  }
  track(anchor: Anchor) { if (this.b && this.b.name === anchor.name) { this.b = anchor; this.wake(); } }
  /** Places networks must never form, read when one looks for space (a scene may be sticky, so it is read live). */
  setQuiet(list: () => Clear[]) { this.quiet = list; }
  /** Content to frame: measured on layout changes only, uploaded once, moved by the scroll in the shader. */
  setClears(list: Clear[]) {
    const gl = this.gl;
    this.clears = list;
    const data = new Float32Array(list.length * 6);
    list.forEach((c, i) => data.set([c.left + c.width / 2, c.top + c.height / 2, c.width / 2, c.height / 2, c.fixed ? 1 : 0, c.radius ?? Math.min(14, c.height / 2)], i * 6));
    gl.bindBuffer(gl.ARRAY_BUFFER, this.maskBuf);
    gl.bufferData(gl.ARRAY_BUFFER, data, gl.DYNAMIC_DRAW);
    this.clearCount = list.length;
    this.wake();
  }
  wave(x: number, y: number, strength = 1) {
    if (!this.motion) return;
    this.pulses.set([x, y, this.now(), strength], this.slot * 4);
    this.slot = (this.slot + 1) % 4;
    this.wake();
  }
  point(x: number, y: number, active = true) {
    this.pointer.x = x; this.pointer.y = y; this.pointer.target = active ? 1 : 0; this.pointer.moved = this.now();
    this.wake();
  }
  move(x: number, y: number, strength: number) { this.mover.x = x; this.mover.y = y; this.mover.s = strength; this.wake(); }
  setHue(rgb: number[]) { this.hueTarget = rgb; this.wake(); }
  touchTint(x: number, y: number, rgb: number[] | null) {
    if (rgb) { this.tint.x = x; this.tint.y = y; this.tint.hue = rgb; this.tint.target = 1; } else this.tint.target = 0;
    this.wake();
  }
  setMotion(on: boolean) { this.motion = on; if (!on) { this.a = this.b; this.mix = 1; this.morphStart = -1; this.nets = []; } this.wake(); }
  invalidate() { this.wake(); }
  wake() { this.stirred = this.now(); if (this.running) return; this.running = true; this.raf = requestAnimationFrame(this.frame); }
  stop() { cancelAnimationFrame(this.raf); this.running = false; }
  destroy() { this.stop(); }
  now() { return (performance.now() - this.t0) / 1000; }
  get networks() { return this.nets.length; }

  /** The largest open space in view: no words, no cards, no controls near it. Viewport pixels. */
  openRegion(within?: Region): Region | null {
    const cell = 20, W = this.w, H = this.h;
    const cols = Math.ceil(W / cell), rows = Math.ceil(H / cell);
    const free = new Uint8Array(cols * rows).fill(1);
    const pad = 28;
    for (const c of [...this.clears, ...this.quiet()]) {
      const top = c.fixed ? c.top : c.top - this.sy;
      if (top > H + pad || top + c.height < -pad) continue;
      const x0 = Math.max(0, Math.floor((c.left - pad) / cell)), x1 = Math.min(cols - 1, Math.floor((c.left + c.width + pad) / cell));
      const y0 = Math.max(0, Math.floor((top - pad) / cell)), y1 = Math.min(rows - 1, Math.floor((top + c.height + pad) / cell));
      for (let y = y0; y <= y1; y++) free.fill(0, y * cols + x0, y * cols + x1 + 1);
    }
    if (within) {
      const x0 = Math.floor(within.x / cell), x1 = Math.ceil((within.x + within.w) / cell), y0 = Math.floor(within.y / cell), y1 = Math.ceil((within.y + within.h) / cell);
      for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) if (x < x0 || x >= x1 || y < y0 || y >= y1) free[y * cols + x] = 0;
    }
    // Keep clear of the very edges of the screen.
    for (let y = 0; y < rows; y++) { free[y * cols] = 0; free[y * cols + cols - 1] = 0; }
    // Largest rectangle of free cells (histogram method).
    const hgt = new Int32Array(cols);
    let best = { area: 0, x: 0, y: 0, w: 0, h: 0 };
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) hgt[x] = free[y * cols + x] ? hgt[x] + 1 : 0;
      const stack: number[] = [];
      for (let x = 0; x <= cols; x++) {
        const hh = x < cols ? hgt[x] : 0;
        while (stack.length && hgt[stack[stack.length - 1]] >= hh) {
          const top = stack.pop()!, height = hgt[top];
          const left = stack.length ? stack[stack.length - 1] + 1 : 0, width = x - left;
          const aspectOk = width * cell >= 150 && height * cell >= 110;
          if (aspectOk && width * height > best.area) best = { area: width * height, x: left, y: y - height + 1, w: width, h: height };
        }
        stack.push(x);
      }
    }
    if (!best.area) return null;
    return { x: best.x * cell, y: best.y * cell, w: best.w * cell, h: best.h * cell };
  }

  /** A network organises itself out of the lattice inside a region of the screen. */
  emerge(region: Region, topology: Topology) {
    if (!this.motion || this.nets.length >= 2) return false;
    const used = this.nets.reduce((n, x) => n + x.nodes.length, 0);
    const edgesUsed = this.nets.reduce((n, x) => n + x.edges.length, 0);
    const front = this.layers[2], s = front.spacing;
    const spanW = (front.cols - 1) * s, spanH = (front.rows - 1) * s;
    const x0 = (this.w - spanW) / 2, y0 = (this.h - spanH) / 2, par = this.sy * front.parallax;
    // Snap to real lattice dots: nodes are dots that were already there.
    const snap = (x: number, y: number) => [x0 + Math.round((x - x0) / s) * s, y0 + Math.round((y + par - y0) / s) * s];
    const R = { x: region.x + 14, y: region.y + 14, w: Math.max(0, region.w - 28), h: Math.max(0, region.h - 28) };
    if (topology === "chain" ? R.w < 240 || R.h < 70 : R.w < 200 || R.h < 150) return false;
    const pts: { x: number; y: number; layer: number }[] = [];
    const edges: [number, number][] = [];
    const rnd = mulberry(Math.floor(this.now() * 1000) ^ 0x9e3779b1);
    const at = (fx: number, fy: number, layer: number) => { pts.push({ x: R.x + R.w * fx, y: R.y + R.h * fy, layer }); return pts.length - 1; };
    if (topology === "layers") {
      const cols = R.w > 480 ? 4 : 3, counts = cols === 4 ? [3, 4, 4, 2] : [3, 4, 2];
      const colIdx: number[][] = [];
      counts.forEach((n, c) => { colIdx.push([]); for (let j = 0; j < n; j++) colIdx[c].push(at(0.06 + (0.88 * c) / (cols - 1), (j + 0.5) / n, c)); });
      for (let c = 0; c < cols - 1; c++) for (const a of colIdx[c]) {
        const next = [...colIdx[c + 1]].sort((p, q) => Math.abs(pts[p].y - pts[a].y) - Math.abs(pts[q].y - pts[a].y)).slice(0, 2 + (rnd() < 0.35 ? 1 : 0));
        for (const b of next) edges.push([a, b]);
      }
    } else if (topology === "star") {
      const c = at(0.5, 0.5, 0), n = 7;
      const rx = 0.42, ry = 0.4;
      const ring: number[] = [];
      for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2 + rnd() * 0.3; ring.push(at(0.5 + Math.cos(a) * rx, 0.5 + Math.sin(a) * ry, 1)); }
      ring.forEach((r, i) => { edges.push([c, r]); if (rnd() < 0.55) edges.push([r, ring[(i + 1) % n]]); });
    } else if (topology === "hubs") {
      const hubs = [at(0.22, 0.34, 0), at(0.78, 0.36, 0), at(0.5, 0.78, 0)];
      edges.push([hubs[0], hubs[1]], [hubs[1], hubs[2]], [hubs[2], hubs[0]]);
      hubs.forEach((hb, k) => {
        const hx = [0.22, 0.78, 0.5][k], hy = [0.34, 0.36, 0.78][k];
        for (let j = 0; j < 3; j++) { const a = rnd() * Math.PI * 2; const sat = at(Math.min(0.97, Math.max(0.03, hx + Math.cos(a) * 0.18)), Math.min(0.97, Math.max(0.03, hy + Math.sin(a) * 0.2)), 1); edges.push([hb, sat]); }
      });
    } else if (topology === "chain") {
      const n = R.w > 600 ? 9 : 7;
      const ids: number[] = [];
      for (let i = 0; i < n; i++) ids.push(at(i / (n - 1), 0.5 + 0.34 * Math.sin(i * 1.1 + rnd() * 0.6), i));
      for (let i = 0; i < n - 1; i++) edges.push([ids[i], ids[i + 1]]);
      for (let i = 0; i < n - 2; i += 3) edges.push([ids[i], ids[i + 2]]);
    } else {
      const n = 11;
      for (let i = 0; i < n * 6 && pts.length < n; i++) {
        const fx = rnd(), fy = rnd();
        const x = R.x + R.w * fx, y = R.y + R.h * fy;
        if (pts.every(p => Math.hypot(p.x - x, p.y - y) > s * 2.6)) pts.push({ x, y, layer: Math.floor(fx * 4) });
      }
      pts.forEach((p, i) => {
        const near = pts.map((q, j) => [j, Math.hypot(q.x - p.x, q.y - p.y)] as [number, number]).filter(([j]) => j !== i).sort((u, v) => u[1] - v[1]).slice(0, 2);
        for (const [j] of near) if (!edges.some(([a, b]) => (a === j && b === i) || (a === i && b === j))) edges.push([i, j]);
      });
    }
    // Snap, merge nodes that land on the same dot, and keep within budget.
    const key = new Map<string, number>();
    const nodes: NetNode[] = [];
    const remap = pts.map(p => {
      const [lx, ly] = snap(p.x, p.y);
      const k = lx + ":" + ly;
      if (!key.has(k)) { key.set(k, nodes.length); nodes.push({ lx, ly, delay: p.layer * 0.34 + rnd() * 0.18, flash: 0 }); }
      return key.get(k)!;
    });
    if (nodes.length < 4 || used + nodes.length > MAX_NODES) return false;
    const netEdges: NetEdge[] = [];
    for (const [pa, pb] of edges) {
      const a = remap[pa], b = remap[pb];
      if (a === b || netEdges.some(e => (e.a === a && e.b === b) || (e.a === b && e.b === a))) continue;
      if (edgesUsed + netEdges.length >= MAX_EDGES) break;
      netEdges.push({ a, b, delay: nodes[a].delay + 0.18, phase: rnd(), speed: rnd() < 0.5 ? 1 / 3 : 1 / 4.5, last: 0 });
    }
    this.nets.push({ nodes, edges: netEdges, t0: this.now(), life: 7.5 + rnd() * 3 });
    this.wake();
    return true;
  }

  private rect(a: Anchor | null): [number, number, number, number] {
    if (!a) return [0, 0, 1, 1];
    const top = a.top - this.sy;
    return [a.left + a.width / 2, top + a.height / 2, a.width / 2, a.height / 2];
  }
  private visible(a: Anchor | null) {
    if (!a) return 0;
    const top = a.top - this.sy, bottom = top + a.height;
    const overlap = Math.min(bottom, this.h) - Math.max(top, 0);
    return Math.max(0, Math.min(1, overlap / Math.min(a.height, this.h * 0.5)));
  }

  /** Node strengths, positions and edge states for this frame. */
  private packNetworks(t: number, dt: number) {
    const front = this.layers[2];
    const par = this.sy * front.parallax;
    let n = 0, e = 0;
    let bx0 = Infinity, by0 = Infinity, bx1 = -Infinity, by1 = -Infinity;
    this.nets = this.nets.filter(net => t - net.t0 < net.life);
    for (const net of this.nets) {
      const age = t - net.t0;
      const fade = 1 - smooth(net.life - 1.6, net.life, age);
      const base = n;
      for (const nd of net.nodes) {
        const s = smooth(nd.delay, nd.delay + 0.55, age) * fade;
        nd.flash = Math.max(0, nd.flash - dt * 2.2);
        const x = nd.lx, y = nd.ly - par;
        this.nodeData.set([x, y, s, nd.flash], n * 4);
        bx0 = Math.min(bx0, x); by0 = Math.min(by0, y); bx1 = Math.max(bx1, x); by1 = Math.max(by1, y);
        n++;
      }
      for (const ed of net.edges) {
        const A = net.nodes[ed.a], B = net.nodes[ed.b];
        const growT = smooth(ed.delay, ed.delay + 0.7, age);
        const str = fade * smooth(ed.delay, ed.delay + 0.3, age);
        // A signal reaching its target makes that node flash.
        const pos = (t * ed.speed + ed.phase) % 1;
        if (growT >= 1 && pos < ed.last) B.flash = 1;
        ed.last = pos;
        this.edgeAB.set([A.lx, A.ly - par, B.lx, B.ly - par], e * 4);
        this.edgeK.set([growT, str * 0.9, ed.phase, ed.speed], e * 4);
        e++;
      }
      void base;
    }
    const m = front.spacing * 3;
    return { n, e, box: [bx0 - m, by0 - m, bx1 + m, by1 + m] };
  }

  private frame = () => {
    const t0 = this.now();
    // At rest the field breathes at half rate; anything that stirs it brings it back to full rate.
    const resting = this.motion && this.morphStart < 0 && t0 - this.stirred > 1.5 && this.pointer.s < 0.01 && !this.energy.busy && !this.nets.length;
    this.odd = !this.odd;
    if (resting && this.odd && !document.hidden) { this.raf = requestAnimationFrame(this.frame); return; }
    const gl = this.gl, t = t0, dt = Math.min(0.05, Math.max(0.001, t - (this.last || t)));
    this.last = t;
    let animating = this.motion;
    if (this.morphStart >= 0) {
      const k = Math.min(1, (t - this.morphStart) / 1.3);
      this.mix = ease(k);
      if (k >= 1) { this.a = this.b; this.mix = 1; this.morphStart = -1; }
      animating = true;
    }
    const va = this.visible(this.a), vb = this.visible(this.b);
    this.visA = this.motion ? approach(this.visA, va, 5, dt) : va;
    this.visB = this.motion ? approach(this.visB, vb, 5, dt) : vb;
    if (this.pointer.target && t - this.pointer.moved > 3) this.pointer.target = 0;
    this.pointer.s = this.motion ? approach(this.pointer.s, this.pointer.target, 4, dt) : 0;
    this.tint.s = approach(this.tint.s, this.tint.target, 4, dt);
    this.hue = mix3(this.hue, this.hueTarget, this.motion ? 1 - Math.exp(-2 * dt) : 1);
    const sy = this.sy;
    // The pointer tilts the whole 3D frame a little; scrolling leans it back as you go down.
    const scrollMax = Math.max(1, (this.docHeight || this.h) - this.h);
    const scrollP = Math.min(1, sy / scrollMax);
    const px = this.pointer.target ? this.pointer.x / this.w - 0.5 : 0, py = this.pointer.target ? this.pointer.y / this.h - 0.5 : 0;
    const tiltTarget = [0.2 + scrollP * 0.12 + py * 0.1, px * 0.14];
    this.tilt[0] = this.motion ? approach(this.tilt[0], tiltTarget[0], 2.2, dt) : tiltTarget[0];
    this.tilt[1] = this.motion ? approach(this.tilt[1], tiltTarget[1], 2.2, dt) : tiltTarget[1];
    if (Math.abs(this.visB - vb) > 0.002 || this.pointer.s > 0.002 || this.tint.s > 0.002 || Math.abs(this.tilt[0] - tiltTarget[0]) > 0.001) animating = true;
    const time = this.motion ? t : 12;
    if (this.motion) this.energy.step(dt, t); else this.energy.settle();
    const net = this.packNetworks(t, dt);

    // 1. The clearing mask.
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.maskFbo);
    gl.viewport(0, 0, this.maskW, this.maskH);
    gl.clearColor(1, 1, 1, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
    if (this.clearCount) {
      gl.enable(gl.BLEND);
      gl.blendEquation(gl.MIN);
      gl.blendFunc(gl.ONE, gl.ONE);
      gl.useProgram(this.maskProg.p);
      gl.uniform2f(this.maskProg.u("uRes"), this.w, this.h);
      gl.uniform1f(this.maskProg.u("uScroll"), sy);
      gl.uniform1f(this.maskProg.u("uInner"), 3);
      gl.uniform1f(this.maskProg.u("uOuter"), this.mobile ? 30 : 40);
      gl.bindVertexArray(this.maskVao);
      gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, this.clearCount);
      gl.blendEquation(gl.FUNC_ADD);
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);

    // 2. The lattice, the network and the dots.
    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.maskTex);
    gl.bindVertexArray(this.vao);
    const ra = this.rect(this.a), rb = this.rect(this.b);
    const modeIndex = (x: Anchor | null) => (x ? FIELD_MODES.indexOf(x.name) : 12);
    const shared = (p: Prog) => {
      gl.useProgram(p.p);
      gl.uniform2f(p.u("uRes"), this.w, this.h);
      gl.uniform1f(p.u("uTime"), time);
      gl.uniform1f(p.u("uMix"), this.mix);
      gl.uniform1f(p.u("uVisA"), this.a ? this.visA : 0);
      gl.uniform1f(p.u("uVisB"), this.b ? this.visB : 0);
      gl.uniform1f(p.u("uGrow"), this.grow);
      gl.uniform1f(p.u("uAmb"), this.motion ? 1 : 0.6);
      gl.uniform1f(p.u("uTrust"), this.trust);
      gl.uniform1f(p.u("uScrollP"), scrollP);
      gl.uniform1i(p.u("uModeA"), modeIndex(this.a));
      gl.uniform1i(p.u("uModeB"), modeIndex(this.b));
      gl.uniform4f(p.u("uRectA"), ra[0], ra[1], ra[2], ra[3]);
      gl.uniform4f(p.u("uRectB"), rb[0], rb[1], rb[2], rb[3]);
      gl.uniform3f(p.u("uPointer"), this.pointer.x, this.pointer.y, this.pointer.s);
      gl.uniform3f(p.u("uMover"), this.mover.x, this.mover.y, this.motion ? this.mover.s : 0);
      gl.uniform4fv(p.u("uPulses[0]"), this.pulses);
      gl.uniform4fv(p.u("uNodes[0]"), this.nodeData);
      gl.uniform1i(p.u("uNodeN"), net.n);
      gl.uniform4f(p.u("uNetBox"), net.box[0], net.box[1], net.box[2], net.box[3]);
      gl.uniform1f(p.u("uNodeR"), this.layers[2].spacing * 0.62);
      gl.uniform3f(p.u("uHue"), this.hue[0], this.hue[1], this.hue[2]);
      gl.uniform2f(p.u("uTilt"), this.tilt[0], this.tilt[1]);
      gl.uniform1f(p.u("uFocal"), FOCAL);
      gl.uniform1i(p.u("uMask"), 0);
      gl.uniform1f(p.u("uOpacity"), this.opacity);
    };
    const origin = (l: Layer) => {
      const shift = (sy * l.parallax) % l.spacing;
      const spanW = (l.cols - 1) * l.spacing, spanH = (l.rows - 1) * l.spacing;
      return [(this.w - spanW) / 2, (this.h - spanH) / 2 - shift];
    };
    const front = this.layers[2], fo = origin(front);
    shared(this.link);
    gl.uniform1i(this.link.u("uCols"), front.cols);
    gl.uniform1i(this.link.u("uRows"), front.rows);
    gl.uniform1i(this.link.u("uBond"), this.b && this.b.name === "bond" ? 1 : 0);
    gl.uniform2f(this.link.u("uOrigin"), fo[0], fo[1]);
    gl.uniform1f(this.link.u("uSpacing"), front.spacing);
    gl.uniform1f(this.link.u("uDispK"), front.disp);
    gl.uniform1f(this.link.u("uActK"), front.act);
    gl.drawArrays(gl.LINES, 0, front.cols * front.rows * 4);
    if (net.e) {
      shared(this.edge);
      gl.uniform4fv(this.edge.u("uEdgeAB[0]"), this.edgeAB);
      gl.uniform4fv(this.edge.u("uEdgeK[0]"), this.edgeK);
      gl.uniform1f(this.edge.u("uEdgeW"), this.mobile ? 1.5 : 1.8);
      gl.uniform2f(this.edge.u("uCanvas"), this.canvas.width, this.canvas.height);
      gl.drawArrays(gl.TRIANGLES, 0, net.e * 6);
    }
    shared(this.dot);
    gl.uniform1f(this.dot.u("uDpr"), this.dpr);
    gl.uniform3f(this.dot.u("uTintHue"), this.tint.hue[0], this.tint.hue[1], this.tint.hue[2]);
    gl.uniform4f(this.dot.u("uTint"), this.tint.x, this.tint.y, this.tint.r, this.tint.s);
    for (const l of this.layers) {
      const o = origin(l);
      gl.uniform1i(this.dot.u("uCols"), l.cols);
      gl.uniform2f(this.dot.u("uOrigin"), o[0], o[1]);
      gl.uniform1f(this.dot.u("uSpacing"), l.spacing);
      gl.uniform1f(this.dot.u("uBase"), l.base);
      gl.uniform1f(this.dot.u("uGrowR"), l.grow);
      gl.uniform1f(this.dot.u("uLayerA"), l.alpha);
      gl.uniform1f(this.dot.u("uDispK"), l.disp);
      gl.uniform1f(this.dot.u("uActK"), l.act);
      gl.uniform1f(this.dot.u("uDepth"), l.depth);
      gl.drawArrays(gl.POINTS, 0, l.cols * l.rows);
    }
    gl.bindVertexArray(null);
    // 3. The energy layer, above the page.
    this.energy.render(time, t, this.hue, sy);
    if (this.energy.active || net.n) animating = this.motion || animating;
    for (let k = 0; k < 4; k++) if (this.pulses[k * 4 + 3] > 0 && t - this.pulses[k * 4 + 2] < 3.2) animating = true;
    if (animating && !document.hidden) this.raf = requestAnimationFrame(this.frame);
    else this.running = false;
  };
}

function sameRect(a: Anchor | null, b: Anchor | null) {
  if (!a || !b) return a === b;
  return a.name === b.name && Math.abs(a.top - b.top) < 1 && Math.abs(a.left - b.left) < 1 && Math.abs(a.width - b.width) < 1 && Math.abs(a.height - b.height) < 1;
}
function mulberry(seed: number) {
  let a = seed >>> 0;
  return () => { a += 0x6d2b79f5; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
