import { useEffect, useRef, useState } from "react";
import { useStateStore } from "../state";

/* A waveguide, drawn from its physics. A glass core sits inside a cladding with a slightly lower refractive
   index. Light launched into the core at a shallow angle meets the wall beyond the critical angle and
   reflects back in, again and again: total internal reflection. The light stays inside and carries its
   energy the whole length. Inside the core the guided mode shows as a bright band with its travelling
   phase, and a faint evanescent glow reaches just into the cladding. At the far end the light leaves as a
   spreading wave.

   "hero" runs on its own with the light always guided. "study" lets you steer the launch angle with the
   pointer (or the arrow keys): past the critical angle the rays stop reflecting and escape through the
   cladding, which is the whole point of a guide. */

const VS = `#version 300 es
in vec2 aPos; void main() { gl_Position = vec4(aPos, 0.0, 1.0); }`;
const FS = `#version 300 es
precision highp float;
uniform vec2 uRes;
uniform float uTime, uDpr, uAngle, uStudy, uCurve;
out vec4 o;
const float PI = 3.14159265;
float tri(float x) { return abs(fract(x) * 2.0 - 1.0) * 2.0 - 1.0; }
float h1(float n) { return fract(sin(n * 78.233) * 43758.5453); }
// The fibre's centre line: a gentle S across the frame.
float centre(float x) { return uRes.y * 0.5 + uCurve * uRes.y * 0.09 * sin((x / uRes.x) * PI * 1.1 - 0.35); }
float slope(float x) { return uCurve * uRes.y * 0.09 * cos((x / uRes.x) * PI * 1.1 - 0.35) * PI * 1.1 / uRes.x; }
void main() {
  vec2 p = vec2(gl_FragCoord.x, uRes.y * uDpr - gl_FragCoord.y) / uDpr;
  float x0 = uRes.x * 0.14, x1 = uRes.x * 0.85;
  float w = uRes.y * (uStudy > 0.5 ? 0.11 : 0.085);   // core half width
  float wc = w * 2.0;                                  // cladding half width
  float u = p.x;
  float v = (p.y - centre(u)) * cos(atan(slope(u)));
  float av = abs(v);
  float along = smoothstep(x0 - 6.0, x0 + 6.0, u) * smoothstep(x1 + 6.0, x1 - 6.0, u);
  vec3 col = vec3(0.0); float a = 0.0;
  vec3 cyan = vec3(0.36, 0.9, 1.0), blue = vec3(0.18, 0.45, 1.0), violet = vec3(0.58, 0.46, 1.0), white = vec3(0.94, 1.0, 1.0);

  // Cladding and core: glass, lit at the interfaces.
  float clad = step(av, wc) * along;
  col += blue * 0.07 * clad; a += 0.07 * clad;
  float edge = exp(-pow((av - wc) / 1.1, 2.0)) * along * 0.35;
  float iface = exp(-pow((av - w) / 0.9, 2.0)) * along * 0.45;
  col += vec3(0.55, 0.8, 1.0) * edge + cyan * iface; a += edge + iface * 0.8;
  // The guided mode: the fundamental shape across the core, with its phase travelling along it.
  float k = 2.0 * PI / (w * 2.6);
  float shape = pow(cos(clamp(v / w, -1.0, 1.0) * PI * 0.5), 2.0) * step(av, w);
  float phase = 0.55 + 0.45 * cos(k * u - uTime * 4.1887902);   // one beat (src/cadence.ts)
  float mode = shape * phase * along * (uAngle <= 1.0 ? 0.42 : 0.42 * max(0.0, 1.6 - uAngle));
  col += mix(blue, cyan, phase) * mode; a += mode * 0.8;
  // Evanescent field: a thin glow that reaches just past the core, dying exponentially.
  float ev = (av > w && av < wc) ? exp(-(av - w) / (w * 0.22)) * 0.22 * along : 0.0;
  col += violet * ev; a += ev * 0.7;

  // Rays and photons.
  float thetaC = 0.42;                                  // critical angle from the axis, drawn wide to read
  for (int i = 0; i < 5; i++) {
    float fi = float(i);
    float th = thetaC * uAngle * (0.45 + 0.13 * fi);
    float ph = h1(fi + 1.0);
    float t = tan(th);
    float du = u - x0;
    if (du < -60.0) continue;
    float vr; float lost = 1.0;
    if (th < thetaC) {
      vr = w * 0.96 * tri(du * t / (2.0 * w) + ph);
    } else {
      // Beyond the critical angle: no reflection. The ray leaves the core and the light is lost.
      float v0 = w * (ph * 2.0 - 1.0) * 0.8;
      vr = v0 + du * t;
      lost = exp(-max(abs(vr) - w, 0.0) / (w * 1.4));
    }
    float d = abs(v - vr) * cos(th);
    float inside = du > 0.0 ? 1.0 : smoothstep(-60.0, 0.0, du);
    float ray = exp(-d * d / 1.3) * 0.5 * inside * lost * smoothstep(x1 + 40.0, x1 - 10.0, u);
    // A photon rides each ray: a bright head with a short tail.
    float head = x0 + fract(uTime / 9.0 + ph) * (x1 - x0 + 120.0) - 60.0;
    float dh = u - head;
    float ph2 = exp(-d * d / 2.2) * (exp(-dh * dh / 30.0) * 2.2 + (dh < 0.0 ? exp(dh / 26.0) * 0.8 : 0.0)) * inside * lost;
    vec3 rc = mix(cyan, white, 0.35);
    col += rc * ray + white * ph2; a += ray * 0.8 + ph2 * 0.9;
  }

  // The source: light gathered and launched into the core.
  vec2 src = vec2(x0 - 34.0, centre(x0));
  float r = length(p - src);
  float orb = exp(-r * r / 160.0) * 1.2 + exp(-r / 16.0) * 0.32;
  vec2 dsrc = p - src;
  float cone = exp(-pow(atan(dsrc.y, max(dsrc.x, 0.01)) / 0.34, 2.0)) * step(0.0, dsrc.x) * smoothstep(40.0, 0.0, dsrc.x) * 0.4;
  col += white * orb + cyan * cone; a += orb + cone;

  // The outcome: at the far end the light leaves as a spreading wave.
  vec2 out_ = vec2(x1, centre(x1));
  vec2 dq = p - out_;
  float rr = length(dq);
  if (dq.x > 0.0) {
    float fan = exp(-pow(atan(dq.y, dq.x) / 0.7, 2.0));
    float rings = 0.5 + 0.5 * sin(rr * 0.22 - uTime * 4.1887902);
    float spread = fan * rings * exp(-rr / (uRes.x * 0.055)) * 0.55;
    col += mix(cyan, violet, smoothstep(0.0, 80.0, rr)) * spread; a += spread * 0.8;
  }
  float bloom = exp(-rr * rr / 90.0) * 0.8;
  col += white * bloom; a += bloom;
  a = clamp(a, 0.0, 1.0);
  if (a < 0.004) discard;
  o = vec4(clamp(col, 0.0, 1.0), a);
}`;

export function WaveguideScene({ variant = "hero", className = "" }: { variant?: "hero" | "study"; className?: string }) {
  const box = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const { motion } = useStateStore();
  const [angle, setAngle] = useState(0.62);
  const angleRef = useRef(angle);
  angleRef.current = angle;

  useEffect(() => {
    const c = canvas.current, b = box.current;
    if (!c || !b) return;
    const gl = c.getContext("webgl2", { alpha: true, premultipliedAlpha: true, antialias: false });
    if (!gl) { b.dataset.still = "on"; return; }
    const make = (type: number, src: string) => { const s = gl.createShader(type)!; gl.shaderSource(s, src); gl.compileShader(s); return s; };
    const prog = gl.createProgram()!;
    gl.attachShader(prog, make(gl.VERTEX_SHADER, VS)); gl.attachShader(prog, make(gl.FRAGMENT_SHADER, FS));
    gl.bindAttribLocation(prog, 0, "aPos");
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) { if (import.meta.env.DEV) console.error(gl.getProgramInfoLog(prog)); b.dataset.still = "on"; return; }
    const vao = gl.createVertexArray()!;
    gl.bindVertexArray(vao);
    const buf = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    const u = (n: string) => gl.getUniformLocation(prog, n);
    let w = 0, h = 0, dpr = 1, raf = 0, visible = true, t0 = 0; // the shared clock, so the guide pulses in step with the field
    const resize = () => {
      const r = b.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = Math.max(1, r.width); h = Math.max(1, r.height);
      c.width = Math.round(w * dpr); c.height = Math.round(h * dpr);
      draw();
    };
    const draw = () => {
      const t = motion ? (performance.now() - t0) / 1000 : 6.5;
      gl.viewport(0, 0, c.width, c.height);
      gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
      gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
      gl.useProgram(prog);
      gl.uniform2f(u("uRes"), w, h);
      gl.uniform1f(u("uTime"), t);
      gl.uniform1f(u("uDpr"), dpr);
      gl.uniform1f(u("uAngle"), variant === "hero" ? 0.62 + 0.18 * Math.sin(t * 0.21) : angleRef.current);
      gl.uniform1f(u("uStudy"), variant === "study" ? 1 : 0);
      gl.uniform1f(u("uCurve"), variant === "hero" ? 1 : 0.25);
      gl.bindVertexArray(vao);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };
    const loop = () => { draw(); if (motion && visible && !document.hidden) raf = requestAnimationFrame(loop); else raf = 0; };
    const start = () => { if (!raf && motion && visible) raf = requestAnimationFrame(loop); };
    const ro = new ResizeObserver(resize);
    ro.observe(b);
    const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible) start(); });
    io.observe(b);
    const onVis = () => { if (!document.hidden) start(); };
    document.addEventListener("visibilitychange", onVis);
    resize();
    start();
    (b as HTMLDivElement & { redraw?: () => void }).redraw = draw;
    return () => { cancelAnimationFrame(raf); ro.disconnect(); io.disconnect(); document.removeEventListener("visibilitychange", onVis); };
  }, [motion, variant]);

  // In the study, the angle follows the pointer or the arrow keys, and a still frame redraws when motion is off.
  useEffect(() => { (box.current as (HTMLDivElement & { redraw?: () => void }) | null)?.redraw?.(); }, [angle]);
  const guided = angle < 1;
  // Only the fibre's own band is kept clear of dots; the rest of the frame stays open to the field.
  if (variant === "hero") return <div ref={box} className={"waveguide-scene " + className}><canvas ref={canvas} aria-hidden="true" /><div className="waveguide-band" data-clear aria-hidden="true" /></div>;
  return (
    <div className={"waveguide-study " + className}>
      <div
        ref={box}
        className="waveguide-scene"
        role="slider"
        tabIndex={0}
        aria-label="Launch angle of the light"
        aria-valuemin={20}
        aria-valuemax={150}
        aria-valuenow={Math.round(angle * 100)}
        aria-valuetext={guided ? "Inside the critical angle: the light is guided" : "Past the critical angle: the light escapes"}
        onPointerMove={e => { const r = e.currentTarget.getBoundingClientRect(); setAngle(0.2 + ((e.clientY - r.top) / r.height) * 1.3); }}
        onKeyDown={e => { if (e.key === "ArrowUp" || e.key === "ArrowLeft") { e.preventDefault(); setAngle(a => Math.max(0.2, a - 0.05)); } if (e.key === "ArrowDown" || e.key === "ArrowRight") { e.preventDefault(); setAngle(a => Math.min(1.5, a + 0.05)); } }}
      >
        <canvas ref={canvas} aria-hidden="true" />
        <div className="waveguide-band is-study" data-clear aria-hidden="true" />
      </div>
      <p className={"waveguide-readout" + (guided ? "" : " is-lost")} aria-hidden="true" data-clear>
        <span>{guided ? "Guided" : "Escaping"}</span>
        {guided ? "Inside the critical angle, the light reflects back into the core." : "Past the critical angle, the light leaves the core and is lost."}
      </p>
    </div>
  );
}
