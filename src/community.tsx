import type { ReactNode } from "react";
import { createContext, useContext, useEffect, useState } from "react";
export const WAVE_TYPES = [
  { id: "growth", label: "Growth Wave" },
  { id: "funding", label: "Funding Wave" },
  { id: "innovation", label: "Innovation Wave" },
  { id: "story", label: "Story Wave" },
  { id: "hype", label: "Hype Wave" },
  { id: "maker", label: "Maker Wave" },
  { id: "work", label: "Work Wave" },
  { id: "brave", label: "Brave Wave" },
] as const;
export type WaveType = (typeof WAVE_TYPES)[number]["id"];
export const waveTypeLabel = (value: unknown) => WAVE_TYPES.find(type => type.id === value)?.label;
export type Project = {
  id: string;
  title: string;
  description: string;
  category: string;
  budget: number;
  milestone: string;
  signals: number;
  supported?: boolean;
  waveType?: WaveType;
};
export type Receipt = {
  id: string;
  receipt: string;
  title: string;
  kind: string;
  waveType?: WaveType;
};
export async function api(action: string, body?: unknown) {
  const response = await fetch(
    `/api/community?action=${action}`,
    body === undefined
      ? {}
      : {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        },
  );
  let data;
  try {
    data = await response.json();
  } catch {
    throw Error("Unable to connect. Please try again.");
  }
  if (!response.ok)
    throw Error(data.error || "Unable to complete this request.");
  return data;
}
const Context = createContext<{
  projects: Project[];
  guides: number;
  loading: boolean;
  error: string;
  refresh: () => void;
}>({ projects: [], guides: 0, loading: true, error: "", refresh: () => {} });
export function CommunityProvider({ children }: { children: ReactNode }) {
  const [projects, setProjects] = useState<Project[]>([]),
    [guides, setGuides] = useState(0),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [version, setVersion] = useState(0);
  useEffect(() => {
    let active = true;
    api("public")
      .then((data) => {
        if (active) {
          setProjects(data.projects);
          setGuides(data.guides);
          setError("");
        }
      })
      .catch((e) => {
        if (active) setError(e.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [version]);
  return (
    <Context.Provider
      value={{
        projects,
        guides,
        loading,
        error,
        refresh: () => setVersion((v) => v + 1),
      }}
    >
      {children}
    </Context.Provider>
  );
}
export const useCommunity = () => useContext(Context);
export function getReceipts(): Receipt[] {
  try {
    const data = JSON.parse(localStorage.getItem("waves-receipts") || "[]");
    return Array.isArray(data)
      ? data.filter(
          (v) =>
            typeof v.id === "string" &&
            typeof v.receipt === "string" &&
            typeof v.title === "string",
        )
      : [];
  } catch {
    return [];
  }
}
export function saveReceipt(receipt: Receipt) {
  try {
    localStorage.setItem(
      "waves-receipts",
      JSON.stringify([
        ...getReceipts().filter((x) => x.id !== receipt.id),
        receipt,
      ]),
    );
  } catch {
    /* The downloadable receipt remains available. */
  }
}
export function download(name: string, data: unknown) {
  const url = URL.createObjectURL(
    new Blob(
      [typeof data === "string" ? data : JSON.stringify(data, null, 2)],
      { type: "application/json" },
    ),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
