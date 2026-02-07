// lib/api/analyze.ts
// ------------------------------------------------------
// Physique analysis API (3-angle)
// - Primary (after backend fix):   POST /analyze
// - Fallback (current Railway):    POST /analyze/analyze
// - Adds timeout + safe JSON parsing
// ------------------------------------------------------

const BASE_URL =
  process.env.EXPO_PUBLIC_API_URL ??
  "https://nattycheck-backend-production.up.railway.app";

const CLEAN_BASE = BASE_URL.replace(/\/$/, "");

// ✅ correct AFTER backend router prefix fix
const ANALYZE_PRIMARY = `${CLEAN_BASE}/analyze`;
// ✅ correct on CURRENT Railway deploy (double prefix)
const ANALYZE_FALLBACK = `${CLEAN_BASE}/analyze/analyze`;

type AnalyzePayload = {
  frontBase64: string;
  sideBase64: string;
  backBase64: string;
};

async function postJsonPrimaryFallback(
  primaryUrl: string,
  fallbackUrl: string,
  body: any,
  timeoutMs = 45000
): Promise<{
  endpointUsed: string;
  status: number;
  ok: boolean;
  json: any | null;
  raw: string;
}> {
  const tryOnce = async (url: string) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const resp = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      const raw = await resp.text();
      let json: any | null = null;
      try {
        json = raw ? JSON.parse(raw) : null;
      } catch {
        json = null;
      }

      return { resp, raw, json };
    } finally {
      clearTimeout(timer);
    }
  };

  const first = await tryOnce(primaryUrl);
  if (first.resp.status === 404) {
    const second = await tryOnce(fallbackUrl);
    return {
      endpointUsed: fallbackUrl,
      status: second.resp.status,
      ok: second.resp.ok,
      json: second.json,
      raw: second.raw,
    };
  }

  return {
    endpointUsed: primaryUrl,
    status: first.resp.status,
    ok: first.resp.ok,
    json: first.json,
    raw: first.raw,
  };
}

function looksLikeFastApiError(json: any) {
  return !!json && typeof json === "object" && typeof json.detail === "string";
}

export async function analyzePhysique(payload: AnalyzePayload): Promise<any> {
  if (!payload?.frontBase64 || !payload?.sideBase64 || !payload?.backBase64) {
    return {
      ok: false,
      reason: "missing_images",
      message: "Missing one or more base64 images.",
    };
  }

  // Helpful log without dumping strings
  console.log("📨 analyzePhysique sending lengths:", {
    frontLen: payload.frontBase64.length,
    sideLen: payload.sideBase64.length,
    backLen: payload.backBase64.length,
  });

  try {
    const { endpointUsed, ok, status, json, raw } =
      await postJsonPrimaryFallback(ANALYZE_PRIMARY, ANALYZE_FALLBACK, payload);

    console.log("📨 analyzePhysique endpoint used:", endpointUsed);
    console.log("📥 analyzePhysique status:", status);

    // Non-JSON response
    if (!json && raw) {
      return {
        ok: false,
        reason: "non_json",
        message: "Backend returned a non-JSON response.",
        status,
      };
    }

    // HTTP error
    if (!ok) {
      const msg =
        (looksLikeFastApiError(json) && json.detail) ||
        json?.message ||
        `Analysis failed (HTTP ${status}).`;

      return {
        ok: false,
        reason: "http_error",
        message: msg,
        status,
      };
    }

    // App-level failure
    if (json?.ok === false || json?.success === false) {
      return {
        ok: false,
        badAngle: json?.badAngle || "front",
        reason: json?.reasonCode || json?.reason || "invalid_angle",
        message:
          json?.message ||
          "Your pose, clothing, or lighting prevented accurate analysis.",
      };
    }

    // Success
    return {
      ok: true,
      ...json,
    };
  } catch (e: any) {
    const isAbort = String(e?.name || "").toLowerCase().includes("abort");
    return {
      ok: false,
      reason: isAbort ? "timeout" : "network_error",
      message: isAbort
        ? "Request timed out. Please try again."
        : "Network error while analyzing. Please try again.",
    };
  }
}
