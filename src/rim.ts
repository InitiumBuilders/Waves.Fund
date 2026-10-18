import "./rim.css";

/* Light has a source. With a mouse, a card's rim catches the light where the pointer is and fades round the rest of
   the card, so the light on the glass always comes from somewhere. Phones have no hovering pointer and keep the
   resting rim. One listener; once a frame the light inside the card's rim moves to the pointer, by transform only. */

const CARDS = ".panel";

export function startRim() {
  if (!matchMedia("(hover: hover) and (pointer: fine)").matches) return;
  let card: HTMLElement | null = null, x = 0, y = 0, raf = 0;
  const paint = () => {
    raf = 0;
    const glow = card?.querySelector<HTMLElement>(":scope > rim-light > rim-glow");
    if (!card || !glow) return;
    const r = card.getBoundingClientRect();
    glow.style.transform = `translate3d(${(x - r.left).toFixed(0)}px, ${(y - r.top).toFixed(0)}px, 0)`;
  };
  const enter = (next: HTMLElement | null) => {
    if (next === card) return;
    card?.classList.remove("rim-on");
    card = next;
    if (!card) return;
    if (!card.querySelector(":scope > rim-light")) card.appendChild(document.createElement("rim-light")).appendChild(document.createElement("rim-glow"));
    paint();
    card.classList.add("rim-on");
  };
  addEventListener("pointermove", (e) => {
    if (e.pointerType !== "mouse") return;
    x = e.clientX; y = e.clientY;
    enter((e.target as Element | null)?.closest?.<HTMLElement>(CARDS) || null);
    if (card && !raf) raf = requestAnimationFrame(paint);
  }, { passive: true });
  document.documentElement.addEventListener("pointerleave", () => enter(null));
}
