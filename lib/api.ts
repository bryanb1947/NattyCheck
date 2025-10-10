import { API_BASE } from "./config";

async function http<T>(path: string, opts?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...(opts?.headers || {}) },
    ...opts,
  });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json() as Promise<T>;
}

export const Api = {
  health: () => http<{ ok: boolean }>("/health"),
  analyze: (body: { frontUrl?: string; sideUrl?: string; backUrl?: string; userId?: string; }) =>
    http<{ jobId: string; status: string }>("/analyze", { method: "POST", body: JSON.stringify(body) }),
  job: (id: string) => http<any>(`/jobs/${id}`),
};
