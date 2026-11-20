/* Building a WebGL program without holding the page still.

   Asking a program whether it linked makes the browser wait until the graphics process has finished compiling it.
   On a first visit, before the browser has kept the compiled shaders, that wait froze every page: about three
   seconds in Chrome on Windows for the field's four programs (measured 2026-11-20, a new browser profile each run).

   So begin() starts the compile and asks nothing. Where the browser can answer "is it done?" without waiting
   (KHR_parallel_shader_compile), settled() is asked once a frame and the scene draws nothing until it says yes.
   Where it cannot, settled() says yes at once and finish() waits, as before. */
export type Program = { p: WebGLProgram; v: WebGLShader; f: WebGLShader; u: (name: string) => WebGLUniformLocation | null };

export function begin(gl: WebGL2RenderingContext, vs: string, fs: string, attribs: string[] = []): Program {
  const make = (type: number, src: string) => { const s = gl.createShader(type)!; gl.shaderSource(s, src); gl.compileShader(s); return s; };
  const p = gl.createProgram()!, v = make(gl.VERTEX_SHADER, vs), f = make(gl.FRAGMENT_SHADER, fs);
  gl.attachShader(p, v); gl.attachShader(p, f);
  // Named attributes take fixed places, in order, so nobody has to ask the program where they went (asking waits).
  attribs.forEach((name, i) => gl.bindAttribLocation(p, i, name));
  gl.linkProgram(p);
  const cache = new Map<string, WebGLUniformLocation | null>();
  return { p, v, f, u: (name) => { if (!cache.has(name)) cache.set(name, gl.getUniformLocation(p, name)); return cache.get(name)!; } };
}

/** True when every program has finished compiling. Never waits. */
export function settled(gl: WebGL2RenderingContext, programs: Program[]) {
  const ext = gl.getExtension("KHR_parallel_shader_compile");
  return !ext || programs.every((x) => gl.getProgramParameter(x.p, ext.COMPLETION_STATUS_KHR));
}

/** Call once settled. The reason a program failed, or "" when every one linked. */
export function finish(gl: WebGL2RenderingContext, programs: Program[]) {
  for (const x of programs) if (!gl.getProgramParameter(x.p, gl.LINK_STATUS)) return gl.getShaderInfoLog(x.v) || gl.getShaderInfoLog(x.f) || gl.getProgramInfoLog(x.p) || "link";
  return "";
}
