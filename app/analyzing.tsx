// app/analyzing.tsx
import React, { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  ActivityIndicator,
} from "react-native";

import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useResultsStore } from "@/store/useResultsStore";

// ⭐ LEGACY API FOR BASE64 READ
import * as FileSystem from "expo-file-system/legacy";

// ⭐ LOCAL PHOTO STORAGE
import { savePhotoHistory } from "@/lib/photoHistory";

// ⭐ CAPTURE STORE
import { useCaptureStore } from "@/store/useCaptureStore";

// ⭐ UUID GENERATOR
import { nanoid } from "nanoid/non-secure";

const { width } = Dimensions.get("window");

// ✅ TEMP FIX: your deployed Railway backend is currently mounted at /analyze/analyze/*
const BACKEND_URL =
  "https://nattycheck-backend-production.up.railway.app/analyze/";

function looksLikeFastApiError(json: any) {
  return !!json && typeof json === "object" && typeof json.detail === "string";
}

/**
 * "Valid analysis" heuristics:
 * - must NOT be a FastAPI {detail} error
 * - must have at least one meaningful analysis field (score OR groups OR bodyfat OR symmetry)
 */
function looksLikeValidAnalysis(json: any) {
  if (!json || typeof json !== "object") return false;
  if (looksLikeFastApiError(json)) return false;

  const hasScore = typeof json.score === "number" || typeof json.score === "string";
  const hasGroups = json.groups && typeof json.groups === "object";
  const hasBodyfat = json.bodyfat !== undefined && json.bodyfat !== null;
  const hasSymmetry = json.symmetry !== undefined && json.symmetry !== null;

  return hasScore || hasGroups || hasBodyfat || hasSymmetry;
}

export default function AnalyzingScreen() {
  const router = useRouter();
  const saveResult = useResultsStore((s) => s.setLast);

  const hasRun = useRef(false);
  const [progress, setProgress] = useState(0);

  /* --------------------------------------------
   * Fake progress animation
   * ------------------------------------------ */
  useEffect(() => {
    const t = setInterval(() => {
      setProgress((p) => (p < 97 ? p + 2 : p));
    }, 120);
    return () => clearInterval(t);
  }, []);

  /* --------------------------------------------
   * Read URI → base64
   * ------------------------------------------ */
  const readBase64 = async (uri?: string) => {
    if (!uri) return "";
    try {
      const b64 = await FileSystem.readAsStringAsync(uri, { encoding: "base64" });
      return (b64 || "").trim();
    } catch (e) {
      console.log("❌ Base64 read error:", uri, e);
      return "";
    }
  };

  function goInvalid(params: { badAngle?: string; reason: string; message: string }) {
    router.replace({
      pathname: "/invalidPhoto",
      params: {
        badAngle: params.badAngle || "front",
        reason: params.reason,
        message: params.message,
      },
    });
  }

  /* --------------------------------------------
   * MAIN ANALYSIS LOGIC
   * ------------------------------------------ */
  useEffect(() => {
    const run = async () => {
      if (hasRun.current) return;
      hasRun.current = true;

      try {
        // 1️⃣ — Pull photo URIs from capture store
        const { front, side, back } = useCaptureStore.getState();
        const frontUri = front?.uri;
        const sideUri = side?.uri;
        const backUri = back?.uri;

        if (!frontUri || !sideUri || !backUri) {
          goInvalid({
            badAngle: "front",
            reason: "missing_uri",
            message: "One or more photos were missing. Please retake them.",
          });
          return;
        }

        // 2️⃣ — Convert to base64
        const front64 = await readBase64(frontUri);
        const side64 = await readBase64(sideUri);
        const back64 = await readBase64(backUri);

        if (!front64 || !side64 || !back64) {
          goInvalid({
            badAngle: "front",
            reason: "missing_photo",
            message: "One or more photos could not be read.",
          });
          return;
        }

        // 3️⃣ — Send to backend
        console.log("📨 Analyze POST:", {
          endpoint: BACKEND_URL,
          frontLen: front64.length,
          sideLen: side64.length,
          backLen: back64.length,
        });

        const res = await fetch(BACKEND_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            frontBase64: front64,
            sideBase64: side64,
            backBase64: back64,
          }),
        });

        const raw = await res.text();

        let json: any = null;
        try {
          json = JSON.parse(raw);
        } catch {
          console.log("❌ Backend returned non-JSON:", raw?.slice(0, 300));
          goInvalid({
            badAngle: "front",
            reason: "parse_error",
            message: "Bad response from server. Please try again.",
          });
          return;
        }

        // 🔎 Debug visibility (keep for now; remove later)
        console.log("🧾 Analyze response:", {
          ok: res.ok,
          status: res.status,
          keys: json && typeof json === "object" ? Object.keys(json) : [],
          sample: json,
        });

        // 3a) Hard fail if HTTP is not OK
        if (!res.ok) {
          const msg =
            (looksLikeFastApiError(json) && json.detail) ||
            json?.message ||
            "Server rejected the request. Please try again.";
          goInvalid({
            badAngle: json?.badAngle || "front",
            reason: "server_error",
            message: msg,
          });
          return;
        }

        // 3b) Fail if the JSON explicitly says it failed
        if (json?.ok === false || json?.success === false) {
          goInvalid({
            badAngle: json?.badAngle || "front",
            reason: json?.reasonCode || "invalid_angle",
            message:
              json?.reason ||
              json?.message ||
              "Your pose, clothing, or lighting prevented accurate analysis.",
          });
          return;
        }

        // 3c) Fail if it looks like a FastAPI error (detail)
        if (looksLikeFastApiError(json)) {
          goInvalid({
            badAngle: "front",
            reason: "api_detail_error",
            message: json.detail || "Server returned an error. Please try again.",
          });
          return;
        }

        // 3d) Fail if it doesn't look like a real analysis payload
        if (!looksLikeValidAnalysis(json)) {
          goInvalid({
            badAngle: "front",
            reason: "invalid_payload",
            message:
              "We couldn’t generate a full analysis from your photos. Please retake them (better lighting + full body in frame).",
          });
          return;
        }

        // 4️⃣ — Ensure ID + timestamp
        const analysisId = json.id || json.analysisId || json.report_id || nanoid();
        json.id = analysisId;
        json.created_at =
          typeof json.created_at === "string" ? json.created_at : new Date().toISOString();

        // 5️⃣ — Save photos locally
        savePhotoHistory(analysisId, { frontUri, sideUri, backUri });

        // 6️⃣ — Save result to Zustand (ONLY valid payloads reach here)
        saveResult(json);

        // 7️⃣ — Route to /results always (premium screen self-gates)
        router.replace("/results");
      } catch (e: any) {
        console.log("❌ analyze crash:", e);
        goInvalid({
          badAngle: "front",
          reason: "analysis_crash",
          message: "Something went wrong while analyzing your photos. Please try again.",
        });
      }
    };

    run();
  }, [router, saveResult]);

  /* --------------------------------------------
   * UI
   * ------------------------------------------ */
  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <LinearGradient colors={["#00FFE0", "#B8FF48"]} style={styles.iconCircle}>
          <Text style={styles.icon}>⚡</Text>
        </LinearGradient>

        <Text style={styles.title}>Analyzing Your Physique</Text>
        <Text style={styles.subtitle}>Combining angles and evaluating proportions…</Text>

        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${progress}%` }]} />
        </View>

        <Text style={styles.percent}>{progress}%</Text>

        <ActivityIndicator size="large" color="#00FFE0" style={{ marginTop: 20 }} />
      </View>
    </View>
  );
}

/* --------------------------------------------
 * Styles
 * ------------------------------------------ */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
    justifyContent: "center",
    alignItems: "center",
  },
  card: {
    width: width * 0.85,
    backgroundColor: "#0A0B0C",
    borderRadius: 24,
    paddingVertical: 40,
    paddingHorizontal: 20,
    alignItems: "center",
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  icon: {
    fontSize: 40,
    color: "#0A0B0C",
  },
  title: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 8,
  },
  subtitle: {
    color: "#bbb",
    fontSize: 14,
    marginBottom: 25,
    textAlign: "center",
  },
  progressTrack: {
    width: "90%",
    height: 10,
    backgroundColor: "#222",
    borderRadius: 6,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#00FFE0",
  },
  percent: {
    marginTop: 12,
    color: "#00FFE0",
    fontSize: 15,
    fontWeight: "600",
  },
});
