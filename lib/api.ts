import { API_BASE, REQUEST_TIMEOUT_MS } from "./config";
import * as FileSystem from "expo-file-system";

export type AnalysisRequest = {
  frontUri: string;
  sideUri: string;
  backUri: string;
  legsUri: string;
  userId?: string;
};

export type MuscleRegion =
  | "shoulders" | "chest" | "lats" | "traps" | "quads" | "hamstrings" | "glutes" | "calves";

export type RegionStatus = "balanced" | "strong" | "lagging";

export type AnalysisResult = {
  id: string;
  completedAt: string;  // ISO
  score: number;        // 0..100
  confidence: number;   // 0..1
  natty: boolean;
  summary: string;
  regions: Array<{ key: MuscleRegion; status: RegionStatus; percent: number }>;
  posture?: { spinalAlignmentDeltaDeg?: number; scapularBalance?: "Symmetrical" | "Asymmetric" };
  charts?: { shoulderToWaistRatio?: Array<{ month: string; value: number }> };
};

function timeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error("Request timed out")), ms);
    p.then(v => { clearTimeout(t); resolve(v); }, e => { clearTimeout(t); reject(e); });
  });
}

export async function analyzePhysique(payload: AnalysisRequest): Promise<AnalysisResult> {
  const form = new FormData();
  form.append("front", { uri: payload.frontUri, name: "front.jpg", type: "image/jpeg" } as any);
  form.append("side",  { uri: payload.sideUri,  name: "side.jpg",  type: "image/jpeg" } as any);
  form.append("back",  { uri: payload.backUri,  name: "back.jpg",  type: "image/jpeg" } as any);
  form.append("legs",  { uri: payload.legsUri,  name: "legs.jpg",  type: "image/jpeg" } as any);
  if (payload.userId) form.append("userId", payload.userId);

  const res = await timeout(fetch(`${API_BASE}/analyze`, {
    method: "POST",
    headers: { Accept: "application/json" },
    body: form,
  }), REQUEST_TIMEOUT_MS);

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Analyze failed: ${res.status} ${text}`);
  }
  const json = await res.json();

  // You can map server fields → client shape here if needed.
  return json as AnalysisResult;
}
