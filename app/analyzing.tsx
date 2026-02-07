// app/analyzing.tsx
import React, { useEffect, useRef, useState, useCallback, useMemo } from "react";
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
import { useCaptureStore } from "@/store/useCaptureStore";
import { useAuthStore } from "@/store/useAuthStore";
import { savePhotoHistory } from "@/lib/photoHistory";
import { postAnalyze } from "@/lib/api";
import * as FileSystem from "expo-file-system/legacy";
import { nanoid } from "nanoid/non-secure";
import { supabase } from "@/lib/supabase";

const { width } = Dimensions.get("window");

// Force the progress screen to actually be seen
const MIN_SCREEN_MS = 1600;
const COMPLETE_PAUSE_MS = 250;

// Hard watchdog so we never spin forever
const HARD_TIMEOUT_MS = 110_000;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function normalizeBadAngle(v: any): "front" | "side" | "back" {
  const s = String(v ?? "").toLowerCase();
  if (s.includes("side")) return "side";
  if (s.includes("back")) return "back";
  return "front";
}

function normalizeFailureReason(v: any): string {
  const s = String(v ?? "").trim();
  return s || "invalid_photo";
}

function normalizeFailureMessage(v: any): string {
  const s = String(v ?? "").trim();
  return s || "We couldn’t confidently analyze your photos. Please retake them.";
}

function isSuccessPayload(json: any): boolean {
  if (!json || typeof json !== "object") return false;
  if (json.success === true) return true;
  if (json.ok === true) return true;

  const hasScore =
    typeof json.score === "number" || typeof json.gptScore === "number";
  const hasGroups = !!json.groups && typeof json.groups === "object";
  const hasBodyfat = json.bodyfat !== undefined && json.bodyfat !== null;
  return hasScore || (hasGroups && hasBodyfat);
}

export default function AnalyzingScreen() {
  const router = useRouter();
  const saveResult = useResultsStore((s) => s.setLast);

  // ✅ use STORE hydration flags (reactive) instead of persist.hasHydrated()
  const hasHydratedAuth = useAuthStore((s) => s.hasHydrated);
  const hasBootstrappedSession = useAuthStore((s) => s.hasBootstrappedSession);

  const hasRun = useRef(false);
  const startedAtRef = useRef<number>(Date.now());

  const [progress, setProgress] = useState(0);
  const [isFinishing, setIsFinishing] = useState(false);
  const [stage, setStage] = useState<
    "preparing" | "session" | "reading" | "request" | "finishing"
  >("preparing");

  // Fake progress animation
  useEffect(() => {
    const t = setInterval(() => {
      setProgress((p) => {
        if (isFinishing) return p;
        if (p >= 92) return 92;
        return p + 2;
      });
    }, 110);

    return () => clearInterval(t);
  }, [isFinishing]);

  const readBase64 = useCallback(async (uri?: string) => {
    if (!uri) return "";
    try {
      const b64 = await FileSystem.readAsStringAsync(uri, { encoding: "base64" });
      return (b64 || "").trim();
    } catch (e) {
      console.log("❌ Base64 read error:", uri, e);
      return "";
    }
  }, []);

  const goInvalid = useCallback(
    (params: { badAngle?: string; reason: string; message: string }) => {
      console.log("📸 INVALID PHOTO PARAMS:", {
        badAngle: params.badAngle || "front",
        reason: params.reason,
        message: params.message,
      });

      router.replace({
        pathname: "/invalidPhoto",
        params: {
          badAngle: params.badAngle || "front",
          reason: params.reason,
          message: params.message,
        },
      });
    },
    [router]
  );

  const finishAndNavigate = useCallback(
    async (finalJson: any) => {
      const elapsed = Date.now() - startedAtRef.current;
      if (elapsed < MIN_SCREEN_MS) await sleep(MIN_SCREEN_MS - elapsed);

      setStage("finishing");
      setIsFinishing(true);

      setProgress((p) => Math.max(p, 92));
      for (let v = 92; v <= 100; v += 2) {
        setProgress(v);
        await sleep(35);
      }

      await sleep(COMPLETE_PAUSE_MS);

      saveResult(finalJson);
      router.replace("/results");
    },
    [router, saveResult]
  );

  const ensureSessionReady = useCallback(async () => {
    // up to ~4s (covers “just logged in” hydration)
    const attempts = 14;

    for (let i = 0; i < attempts; i++) {
      const { data } = await supabase.auth.getSession();
      const session = data?.session ?? null;

      if (session?.user?.id) {
        const expiresAt = (session as any)?.expires_at;
        const nowSec = Math.floor(Date.now() / 1000);
        if (typeof expiresAt === "number" && expiresAt - nowSec < 30) {
          try {
            await supabase.auth.refreshSession();
          } catch (e) {
            console.log(
              "🟨 refreshSession failed (non-fatal):",
              (e as any)?.message ?? e
            );
          }
        }
        return session;
      }

      await sleep(300);
    }

    return null;
  }, []);

  const subtitle = useMemo(() => {
    if (!hasHydratedAuth) return "Preparing login…";
    if (!hasBootstrappedSession) return "Restoring session…";
    if (stage === "session") return "Preparing secure session…";
    if (stage === "reading") return "Preparing photos…";
    if (stage === "request") return "Sending to AI…";
    if (stage === "finishing") return "Finalizing…";
    return "Combining angles and evaluating proportions…";
  }, [hasHydratedAuth, hasBootstrappedSession, stage]);

  useEffect(() => {
    // ✅ don’t run until auth store is hydrated AND bootstrap finished
    if (!hasHydratedAuth) return;
    if (!hasBootstrappedSession) return;

    const run = async () => {
      if (hasRun.current) return;
      hasRun.current = true;
      startedAtRef.current = Date.now();

      const watchdog = setTimeout(() => {
        goInvalid({
          badAngle: "front",
          reason: "analysis_timeout",
          message:
            "Analysis is taking too long. Please try again (or check your connection).",
        });
      }, HARD_TIMEOUT_MS);

      const clearWatchdog = () => clearTimeout(watchdog);

      try {
        setStage("session");

        const session = await ensureSessionReady();
        if (!session?.user?.id) {
          clearWatchdog();
          goInvalid({
            badAngle: "front",
            reason: "not_authenticated",
            message:
              "You’re signed out. Please log in again and retry.",
          });
          return;
        }

        // Pull photo URIs
        const { front, side, back } = useCaptureStore.getState();
        const frontUri = front?.uri;
        const sideUri = side?.uri;
        const backUri = back?.uri;

        if (!frontUri || !sideUri || !backUri) {
          clearWatchdog();
          goInvalid({
            badAngle: "front",
            reason: "missing_uri",
            message: "One or more photos were missing. Please retake them.",
          });
          return;
        }

        // Convert to base64
        setStage("reading");
        const [front64, side64, back64] = await Promise.all([
          readBase64(frontUri),
          readBase64(sideUri),
          readBase64(backUri),
        ]);

        if (!front64 || !side64 || !back64) {
          clearWatchdog();
          goInvalid({
            badAngle: "front",
            reason: "missing_photo",
            message: "One or more photos could not be read.",
          });
          return;
        }

        console.log("📨 Analyze authed POST:", {
          uid: session.user.id,
          frontLen: front64.length,
          sideLen: side64.length,
          backLen: back64.length,
        });

        // Send to backend
        setStage("request");
        let res = await postAnalyze({
          frontBase64: front64,
          sideBase64: side64,
          backBase64: back64,
        });

        console.log("🧾 Analyze response:", {
          ok: res.ok,
          status: res.status,
          endpointUsed: res.endpointUsed,
          keys:
            res.data && typeof res.data === "object" ? Object.keys(res.data) : [],
          rawPreview: (res.raw || "").slice(0, 120),
        });

        // If 401, refresh once and retry once
        if (res.status === 401) {
          try {
            await supabase.auth.refreshSession();
          } catch {}

          const retry = await postAnalyze({
            frontBase64: front64,
            sideBase64: side64,
            backBase64: back64,
          });

          console.log("🧾 Analyze retry:", {
            ok: retry.ok,
            status: retry.status,
            endpointUsed: retry.endpointUsed,
          });

          res = retry;

          if (res.status === 401) {
            clearWatchdog();
            goInvalid({
              badAngle: "front",
              reason: "not_authenticated",
              message: "Your session expired. Please log in again.",
            });
            return;
          }
        }

        // Network / timeout from wrapper
        if (res.status === 0) {
          clearWatchdog();
          goInvalid({
            badAngle: "front",
            reason: "network_error",
            message: res.errorMessage || "Network error. Please try again.",
          });
          return;
        }

        if (res.status === 429) {
          clearWatchdog();
          goInvalid({
            badAngle: "front",
            reason: "rate_limited",
            message:
              "You’re analyzing too frequently. Please wait a moment and try again.",
          });
          return;
        }

        if (res.status === 413) {
          clearWatchdog();
          goInvalid({
            badAngle: "front",
            reason: "payload_too_large",
            message:
              "Those photos are too large for analysis. Retake them a bit farther away and try again.",
          });
          return;
        }

        if (!res.ok) {
          clearWatchdog();
          goInvalid({
            badAngle: "front",
            reason: "server_error",
            message: res.errorMessage || "Server error. Please try again.",
          });
          return;
        }

        const json = res.data;

        if (
          json &&
          typeof json === "object" &&
          ((json as any).success === false || (json as any).ok === false)
        ) {
          clearWatchdog();
          goInvalid({
            badAngle: normalizeBadAngle((json as any).badAngle),
            reason: normalizeFailureReason(
              (json as any).reason || (json as any).reasonCode
            ),
            message: normalizeFailureMessage(
              (json as any).message || (json as any).reason
            ),
          });
          return;
        }

        if (!isSuccessPayload(json)) {
          clearWatchdog();
          goInvalid({
            badAngle: "front",
            reason: "invalid_payload",
            message:
              "We couldn’t generate a full analysis from your photos. Please retake them (better lighting + full body in frame).",
          });
          return;
        }

        // Ensure id + timestamp
        const analysisId =
          (json as any).id ||
          (json as any).analysisId ||
          (json as any).report_id ||
          nanoid();

        (json as any).id = analysisId;
        (json as any).created_at =
          typeof (json as any).created_at === "string"
            ? (json as any).created_at
            : new Date().toISOString();

        // Save photos locally
        savePhotoHistory(analysisId, { frontUri, sideUri, backUri });

        clearWatchdog();
        await finishAndNavigate(json);
      } catch (e: any) {
        console.log("❌ analyze crash:", e);
        goInvalid({
          badAngle: "front",
          reason: "analysis_crash",
          message:
            "Something went wrong while analyzing your photos. Please try again.",
        });
      }
    };

    run();
  }, [
    hasHydratedAuth,
    hasBootstrappedSession,
    ensureSessionReady,
    readBase64,
    goInvalid,
    finishAndNavigate,
  ]);

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <LinearGradient colors={["#00FFE0", "#B8FF48"]} style={styles.iconCircle}>
          <Text style={styles.icon}>⚡</Text>
        </LinearGradient>

        <Text style={styles.title}>Analyzing Your Physique</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>

        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${progress}%` }]} />
        </View>

        <Text style={styles.percent}>{progress}%</Text>

        <ActivityIndicator size="large" color="#00FFE0" style={{ marginTop: 20 }} />
      </View>
    </View>
  );
}

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
