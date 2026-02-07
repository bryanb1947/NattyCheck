// lib/api/analyzeFull.ts
// ------------------------------------------------------
// DEPRECATED DIRECT OPENAI CALL
// This version is now SAFE:
// - No OpenAI key is read or used client-side
// - We just forward to your backend, which owns the OpenAI key
// ------------------------------------------------------

const RAW_BASE =
  process.env.EXPO_PUBLIC_API_URL ??
  "https://nattycheck-backend-production.up.railway.app";

const BACKEND_BASE = RAW_BASE.replace(/\/$/, "");
const ANALYZE_URL = `${BACKEND_BASE}/analyze/`;

type AnalyzeFullArgs = {
  frontBase64: string;
  backBase64: string;
  sideBase64: string;
  legsBase64: string;
};

/**
 * analyzeFull
 *
 * Legacy helper that *used* to call OpenAI directly.
 * Now it simply forwards the four base64 images to your backend.
 *
 * IMPORTANT:
 * - Your backend must expose POST /analyze/ (or adjust ANALYZE_URL).
 * - The backend is responsible for calling OpenAI with its PRIVATE key.
 */
export async function analyzeFull({
  frontBase64,
  backBase64,
  sideBase64,
  legsBase64,
}: AnalyzeFullArgs) {
  // Basic input validation
  if (!frontBase64 || !backBase64 || !sideBase64 || !legsBase64) {
    throw new Error("Missing base64 image input");
  }

  try {
    const payload = {
      mode: "full_analysis",
      front_base64: frontBase64,
      back_base64: backBase64,
      side_base64: sideBase64,
      legs_base64: legsBase64,
    };

    console.log("📡 analyzeFull → backend:", {
      endpoint: ANALYZE_URL,
      mode: payload.mode,
    });

    const resp = await fetch(ANALYZE_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const raw = await resp.text();
    let json: any = null;

    try {
      json = raw ? JSON.parse(raw) : null;
    } catch (err) {
      console.warn("⚠️ analyzeFull: backend returned non-JSON body:", raw);
      throw new Error("Backend returned invalid JSON for full analysis");
    }

    if (!resp.ok) {
      console.warn("❌ analyzeFull backend error:", {
        status: resp.status,
        json,
      });

      const msg =
        json?.detail ||
        json?.message ||
        `Full analysis failed (HTTP ${resp.status})`;
      throw new Error(msg);
    }

    // Expect backend to already return the structured analysis
    return json;
  } catch (err) {
    console.error("analyzeFull ERROR (backend):", err);
    throw err;
  }
}
