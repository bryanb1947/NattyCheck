// lib/api.ts
// Single place for all network calls. Provides safe fallbacks so the app
// doesn't crash if the backend isn't running.

const BASE_URL =
  process.env.EXPO_PUBLIC_API_URL?.replace(/\/+$/, "") || "";

// -------- Types you can tweak later ----------
export type AnalyzeRequest = {
  frontUri: string;
  sideUri: string;
  backUri: string;
};

export type QueueResponse = { jobId: string };

export type JobStatus =
  | "queued"
  | "processing"
  | "done"
  | "error";

export type JobResponse = {
  status: JobStatus;
  // When done, return a report payload your results screen can read
  report?: any;
  error?: string;
};

// -------- Helpers ----------
async function uploadMultipart(
  url: string,
  { frontUri, sideUri, backUri }: AnalyzeRequest
): Promise<QueueResponse> {
  const form = new FormData();

  const file = (uri: string, name: string) =>
    ({
      uri,
      name,
      type: "image/jpeg",
    } as any);

  form.append("front", file(frontUri, "front.jpg"));
  form.append("side", file(sideUri, "side.jpg"));
  form.append("back", file(backUri, "back.jpg"));

  const res = await fetch(url, {
    method: "POST",
    body: form,
    headers: {
      // NOTE: Do NOT set Content-Type here; fetch will set multipart boundary
    },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Analyze failed (${res.status}): ${text}`);
  }

  const data = (await res.json()) as QueueResponse;
  if (!data?.jobId) throw new Error("No jobId in response");
  return data;
}

// -------- Public API ----------
export const Api = {
  /**
   * Queue an analysis job.
   * If EXPO_PUBLIC_API_URL is set (Render, etc.), it will POST there.
   * Otherwise it returns a local mock job so the app can be demoed offline.
   */
  async analyze(payload: AnalyzeRequest): Promise<QueueResponse> {
    if (BASE_URL) {
      // Live backend path (adjust if your FastAPI route differs)
      return uploadMultipart(`${BASE_URL}/analyze`, payload);
    }
    // Fallback: local mock job
    return { jobId: "mock-1" };
  },

  /**
   * Poll a job by id.
   * If we’re using the live backend, call /jobs/:id.
   * Otherwise, instantly return a mock "done" job with a sample report.
   */
  async getJob(jobId: string): Promise<JobResponse> {
    if (BASE_URL && !jobId.startsWith("mock")) {
      const res = await fetch(`${BASE_URL}/jobs/${encodeURIComponent(jobId)}`);
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`Job fetch failed (${res.status}): ${text}`);
      }
      return (await res.json()) as JobResponse;
    }

    // Mock report (shape it to what your Results screen expects)
    return {
      status: "done",
      report: {
        date: new Date().toISOString(),
        score: 85,
        upperBody: 88,
        lowerBody: 82,
        symmetry: 91,
        confidence: 94,
        natty: true,
        breakdown: [
          { name: "Shoulders", tag: "balanced", value: 92 },
          { name: "Chest", tag: "strong", value: 88 },
          { name: "Lats", tag: "lagging", value: 65 },
          { name: "Traps", tag: "balanced", value: 78 },
          { name: "Quads", tag: "balanced", value: 85 },
          { name: "Hamstrings", tag: "lagging", value: 68 },
          { name: "Glutes", tag: "strong", value: 90 },
          { name: "Calves", tag: "balanced", value: 75 },
        ],
      },
    };
  },
};

export type ApiType = typeof Api;
