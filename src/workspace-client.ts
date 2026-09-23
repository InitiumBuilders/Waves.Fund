export class WorkspaceError extends Error {
  status: number;
  constructor(message: string, status: number) { super(message); this.status = status; }
}

export async function workspaceRequest<T>(action: string, token: string | null, body?: unknown, id?: string): Promise<T> {
  const query = new URLSearchParams({ action });
  if (id) query.set("id", id);
  const response = await fetch(`/api/workspace?${query}`, {
    method: body === undefined ? "GET" : "POST",
    headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(body === undefined ? {} : { "Content-Type": "application/json" }) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    cache: "no-store",
  });
  const data = await response.json().catch(() => ({ error: "Unable to connect. Please try again." }));
  if (!response.ok) throw new WorkspaceError(data.error || "Unable to save. Please try again.", response.status);
  return data as T;
}

export async function waveRequest<T>(action: string, body?: unknown, slug?: string): Promise<T> {
  const query = new URLSearchParams();
  if (action) query.set("action", action);
  if (slug) query.set("slug", slug);
  const response = await fetch(`/api/waves?${query}`, {
    method: body === undefined ? "GET" : "POST",
    ...(body === undefined ? {} : { headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }),
    cache: "no-store",
  });
  const data = await response.json().catch(() => ({ error: "Unable to connect. Please try again." }));
  if (!response.ok) throw new WorkspaceError(data.error || "Unable to complete this request.", response.status);
  return data as T;
}

export function saveFile(name: string, data: unknown) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }));
  const link = document.createElement("a"); link.href = url; link.download = name; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function safeWebLink(value?: string) {
  if (!value) return undefined;
  try { const url = new URL(value); return ["https:", "http:"].includes(url.protocol) ? url.href : undefined; } catch { return undefined; }
}
