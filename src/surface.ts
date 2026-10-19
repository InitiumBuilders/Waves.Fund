import { still } from "./cadence";
import "./surface.css";

/* Words surface. When a heading comes into view its words rise into place from below a waterline, line by line and
   left to right along each line, the way a wave passes along a shore.
   The heading's own text never changes and stays where it is, for reading tools and for React, which owns it. A copy
   split into words (aria-hidden) is laid exactly over it, and only the copy moves. If the copy would wrap
   differently from the original, it is taken away and the heading simply stays as it is. */

// Headings, and his line at the foot of every page.
const SELECTOR = "main h1, main h2, .app-footer > p[data-mind='bond']";
// Forms, live previews and the workspace change their headings as people type or act; they keep plain headings.
const SKIP = "form, dialog, .yw, .yw-offer, .workspace-page, .tour, .tour-card, .receipt-panel, [data-no-surface]";
const LINE = 0.11, WORD = 0.034, MAX = 0.9;

let io: IntersectionObserver | null = null;

function splitText(root: Node) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const texts: Text[] = [];
  for (let n = walker.nextNode(); n; n = walker.nextNode()) texts.push(n as Text);
  for (const t of texts) {
    const parts = (t.nodeValue || "").split(/(\s+)/);
    const frag = document.createDocumentFragment();
    for (const part of parts) {
      if (!part) continue;
      if (/^\s+$/.test(part)) { frag.append(part); continue; }
      const w = document.createElement("sf-w"), i = document.createElement("sf-i");
      // The letters are drawn from an attribute, so the copy adds nothing to the page's text.
      i.dataset.w = part;
      w.append(i);
      frag.append(w);
    }
    t.replaceWith(frag);
  }
}

/* Each word's delay: its line, then its place along the line. Words inside a gradient keep one continuous gradient
   across the line by carrying their own slice of it. */
function settle(h: HTMLElement, layer: HTMLElement) {
  if (!layer.isConnected || h.clientHeight === 0) return true;
  const words = [...layer.querySelectorAll<HTMLElement>("sf-w")];
  // A different wrap would put the moving words somewhere the real words are not: the last word's line must end
  // where the heading ends. Layout positions only; the words' waiting offset is a transform and does not count.
  const last = words[words.length - 1];
  if (last) {
    const half = last.offsetHeight / 2, end = last.offsetTop + last.offsetHeight;
    if (Math.abs(end - (layer.clientHeight - parseFloat(getComputedStyle(layer).paddingBottom || "0"))) > half) { unsurface(h); return false; }
  }
  let line = -1, top = -Infinity, k = 0;
  for (const w of words) {
    if (w.offsetTop > top + 4) { line++; top = w.offsetTop; k = 0; }
    w.firstElementChild!.setAttribute("style", `--sf-d:${Math.min(MAX, line * LINE + k++ * WORD).toFixed(3)}s`);
  }
  for (const g of layer.querySelectorAll<HTMLElement>("*:not(sf-w):not(sf-i)")) {
    // Once found, a gradient span's own background is cleared, so later checks (a font arriving, a resize) read the
    // gradient it kept and measure the slices again.
    let bg = g.classList.contains("sf-gp") ? g.style.getPropertyValue("--sf-bg") : "";
    if (!bg) {
      const cs = getComputedStyle(g);
      if (!cs.backgroundImage.includes("gradient") || !/text/.test(cs.backgroundClip + cs.webkitBackgroundClip)) continue;
      bg = cs.backgroundImage;
    }
    // Word boxes, not the moving letters: the words' waiting offset is a transform on the letters.
    const gr = g.getBoundingClientRect();
    g.style.setProperty("--sf-bg", bg);
    g.style.setProperty("--sf-bs", `${gr.width.toFixed(1)}px ${gr.height.toFixed(1)}px`);
    for (const w of g.querySelectorAll<HTMLElement>("sf-w")) {
      const r = w.getBoundingClientRect(), i = w.firstElementChild as HTMLElement;
      i.style.setProperty("--sf-bp", `${(gr.left - r.left).toFixed(1)}px ${(gr.top - r.top).toFixed(1)}px`);
      i.classList.add("sf-g");
    }
    g.classList.add("sf-gp");
  }
  return true;
}

function build(h: HTMLElement) {
  h.querySelector(":scope > sf-layer")?.remove();
  const layer = document.createElement("sf-layer");
  // Words set one by one measure a fraction wider than the same words set as one run of text, so a heading that is
  // exactly as wide as its longest line would wrap one more word in the copy. The copy gets 2px of room on the side
  // its lines grow toward.
  const align = getComputedStyle(h).textAlign;
  layer.style.inset = align === "center" ? "0 -1px" : align === "right" || align === "end" ? "0 0 0 -2px" : "0 -2px 0 0";
  layer.setAttribute("aria-hidden", "true");
  // The real words go unseen but would still cast their shadow; the copy carries it instead.
  const shadow = h.classList.contains("sf") ? h.dataset.sfShadow || "none" : getComputedStyle(h).textShadow;
  h.dataset.sfShadow = shadow;
  layer.style.textShadow = shadow;
  for (const c of h.childNodes) if (c.nodeName !== "SF-LAYER") layer.append(c.cloneNode(true));
  splitText(layer);
  h.append(layer);
  h.classList.add("sf");
  return layer;
}

function unsurface(h: HTMLElement) {
  h.querySelector(":scope > sf-layer")?.remove();
  h.classList.remove("sf", "sf-on");
  h.dataset.sf = "off";
}

function surface(h: HTMLElement) {
  if (h.dataset.sf || h.closest(SKIP) || h.querySelector("a, button, input, img, svg, video")) return;
  if (!h.textContent?.trim() || /text/.test(getComputedStyle(h).backgroundClip)) return;
  h.dataset.sf = "1";
  build(h);
  // Checked when its size settles or changes, and again as it comes into view, when its layout is certainly real.
  new ResizeObserver(() => { const l = h.querySelector<HTMLElement>(":scope > sf-layer"); if (l && h.dataset.sf === "1") settle(h, l); }).observe(h);
  io!.observe(h);
  // React may change the heading's words later (a count, a name). The copy follows, already in place.
  new MutationObserver((records) => {
    if (records.every((r) => (r.target as Element).closest?.("sf-layer") || [...r.addedNodes].every((n) => n.nodeName === "SF-LAYER"))) return;
    if (h.dataset.sf !== "1") return;
    const fresh = build(h);
    h.classList.add("sf-on", "sf-now");
    requestAnimationFrame(() => settle(h, fresh));
  }).observe(h, { childList: true, characterData: true, subtree: true });
}

function scan(root: ParentNode) {
  root.querySelectorAll<HTMLElement>(SELECTOR).forEach(surface);
}

/** Starts surfacing headings on every page, including pages that load later. Nothing happens with motion off. */
export function startSurfacing() {
  if (still() || typeof IntersectionObserver === "undefined") return;
  io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (!e.isIntersecting) continue;
      const h = e.target as HTMLElement, l = h.querySelector<HTMLElement>(":scope > sf-layer");
      io!.unobserve(h);
      if (l && h.dataset.sf === "1" && settle(h, l)) h.classList.add("sf-on");
    }
  }, { rootMargin: "0px 0px -6% 0px", threshold: 0.15 });
  let queued = false;
  new MutationObserver(() => {
    if (queued) return;
    queued = true;
    queueMicrotask(() => { queued = false; scan(document); });
  }).observe(document.body, { childList: true, subtree: true });
  scan(document);
  // A web font arriving changes word widths without always changing a heading's size; every copy is measured again.
  const again = () => document.querySelectorAll<HTMLElement>("[data-sf='1']").forEach((h) => {
    const l = h.querySelector<HTMLElement>(":scope > sf-layer");
    if (l) settle(h, l);
  });
  document.fonts?.ready.then(again);
  document.fonts?.addEventListener?.("loadingdone", again);
}
