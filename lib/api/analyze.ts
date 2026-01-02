// lib/api/analyze.ts

const BACKEND_URL = "https://nattycheck-backend-production.up.railway.app/analyze/"; 
// MUST end with "/" to avoid Railway 307 redirects

export async function analyzePhysique(payload: {
  frontBase64: string;
  backBase64: string;
  sideBase64: string;
  legsBase64: string;
}) {
  try {
    // Validate required fields
    if (
      !payload.frontBase64 ||
      !payload.backBase64 ||
      !payload.sideBase64 ||
      !payload.legsBase64
    ) {
      throw new Error("Missing base64 images");
    }

    // Perform the POST request
    const res = await fetch(BACKEND_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    // If network error / backend crashed
    if (!res.ok) {
      const text = await res.text();
      console.log("❌ Backend error:", text);
      throw new Error("Analysis failed");
    }

    const json = await res.json();
    console.log("⬅️ Backend response:", json);

    // --------------------------------------------
    // 🔥 New logic: backend says success === false
    // --------------------------------------------
    if (json.success === false) {
      console.log("❌ Invalid photo detected:", json);
      return {
        success: false,
        reason: json.reason,
        message: json.message,
      };
    }

    // --------------------------------------------
    // 🔥 Old logic: success analysis object
    // --------------------------------------------
    return {
      success: true,
      ...json,
    };
  } catch (err) {
    console.error("❌ analyzePhysique error:", err);
    throw err;
  }
}
