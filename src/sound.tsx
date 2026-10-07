import { useEffect, useState } from "react";
import { Volume2, VolumeX } from "lucide-react";

/* Sound, off until someone turns it on. The engine (sound-engine.ts) is synthesized in the browser: no audio files, and
   it loads only when sound is on. Parts of the site call `sound(kind, i)` when something happens; with sound off the
   call does nothing.
   - the sea: a low swell that rises with the visual wave every eight beats and breaks as it reaches the shore
   - land: the circuit's pulse reaching a card (the notes climb card by card)
   - tour: the tour moving to a step
   - light: a light on the sea is tapped; tap: the water is tapped (the note follows where you touched)
   - page: the page changes */

export type SoundKind = "land" | "tour" | "light" | "tap" | "page" | "on";
const KEY = "waves-sound";
const EVENT = "waves:sound";
let on = false;
try { on = localStorage.getItem(KEY) === "on"; } catch { /* storage blocked: stays off */ }

export function sound(kind: SoundKind, i = 0) {
  if (on) dispatchEvent(new CustomEvent(EVENT, { detail: { kind, i } }));
}

let engine: Promise<typeof import("./sound-engine")> | null = null;
const start = () => (engine ??= import("./sound-engine")).then((m) => m.start(EVENT));
const stop = () => engine?.then((m) => m.stop());

/** The header button. A browser lets sound start only from a tap or a key, so a visitor who left it on last time hears
    it again from their first tap. */
export function SoundButton() {
  const [state, setState] = useState(on);
  useEffect(() => {
    if (!on) return;
    const first = () => { if (on) void start(); };
    addEventListener("pointerdown", first, { once: true });
    addEventListener("keydown", first, { once: true });
    return () => { removeEventListener("pointerdown", first); removeEventListener("keydown", first); };
  }, []);
  const toggle = () => {
    on = !on;
    setState(on);
    try { localStorage.setItem(KEY, on ? "on" : "off"); } catch { /* not kept */ }
    if (on) void start().then(() => sound("on")); else void stop();
  };
  return (
    <button className="icon-button sound-button" aria-pressed={state} aria-label={state ? "Turn Sound Off" : "Turn Sound On"} onClick={toggle}>
      {state ? <Volume2 size={18} /> : <VolumeX size={18} />}
    </button>
  );
}
