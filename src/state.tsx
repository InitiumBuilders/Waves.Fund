import { createContext, useContext, useEffect, useState } from "react";
import type { ReactNode, Dispatch, SetStateAction } from "react";
type Draft = { vision: string };
type Context = {
  state: Draft;
  setState: Dispatch<SetStateAction<Draft>>;
  motion: boolean;
  setMotion: Dispatch<SetStateAction<boolean>>;
  notify: (message: string) => void;
  message: string;
  storageAvailable: boolean;
};
const Store = createContext<Context | null>(null);
function restore() {
  try {
    const saved = JSON.parse(
      localStorage.getItem("waves-app-draft") ||
        localStorage.getItem("waves-mobile-v1") ||
        "null",
    );
    return {
      vision:
        typeof saved?.vision === "string" ? saved.vision.slice(0, 500) : "",
    };
  } catch {
    return { vision: "" };
  }
}
export function StateProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState(restore);
  const [motion, setMotion] = useState(() => {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return false;
    if ((navigator as Navigator & {connection?: {saveData?: boolean}}).connection?.saveData) return false;
    try {
      return localStorage.getItem("waves-motion") !== "off";
    } catch {
      return true;
    }
  });
  const [message, notify] = useState(""),
    [storageAvailable, setStorageAvailable] = useState(true);
  useEffect(() => {
    try {
      localStorage.setItem("waves-app-draft", JSON.stringify(state));
    } catch {
      setStorageAvailable(false);
    }
  }, [state]);
  useEffect(() => {
    document.documentElement.dataset.motion = motion ? "on" : "off";
    try {
      localStorage.setItem("waves-motion", motion ? "on" : "off");
    } catch {
      /* This preference applies for this visit. */
    }
  }, [motion]);
  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => notify(""), 3400);
      return () => clearTimeout(timer);
    }
  }, [message]);
  return (
    <Store.Provider
      value={{
        state,
        setState,
        motion,
        setMotion,
        notify,
        message,
        storageAvailable,
      }}
    >
      {children}
    </Store.Provider>
  );
}
export function useStateStore() {
  const state = useContext(Store);
  if (!state) throw Error("Missing app state");
  return state;
}
