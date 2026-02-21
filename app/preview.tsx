// app/preview.tsx
import React, { useCallback, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
  Alert,
} from "react-native";

import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useCaptureStore } from "@/store/useCaptureStore";
import { useAuthStore } from "@/store/useAuthStore";
import { supabase } from "@/lib/supabase";
import { uploadUserPhotoBase64 } from "@/lib/photos";

import * as FileSystem from "expo-file-system/legacy";

const { width, height } = Dimensions.get("window");
const ANGLES: Array<"front" | "side" | "back"> = ["front", "side", "back"];

function clamp(n: number, min: number, max: number) {
  return Math.min(Math.max(n, min), max);
}

function safeParseIndex(v: any) {
  const n = parseInt(String(v ?? ""), 10);
  return Number.isFinite(n) ? clamp(n, 0, 2) : 0;
}

export default function PreviewScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { index } = useLocalSearchParams<{ index?: string }>();

  const photoIndex = safeParseIndex(index);
  const angleKey = ANGLES[photoIndex];
  const isLast = photoIndex === ANGLES.length - 1;

  const ensureGuestSession = useAuthStore((s) => s.ensureGuestSession);

  const angle = useCaptureStore((s) => s.getAngle?.(angleKey) ?? (s as any)[angleKey]);
  const setAngle =
    (useCaptureStore as any)((s: any) => s.setAngle) ??
    useCaptureStore((s) => s.set as any);

  const uri = angle?.uri as string | undefined;
  const base64 = angle?.base64 as string | undefined;
  const photoId = angle?.photoId as string | undefined;
  const storagePath = angle?.storagePath as string | undefined;

  const [busy, setBusy] = useState(false);

  const title = useMemo(() => {
    return angleKey === "front"
      ? "Front Angle"
      : angleKey === "side"
      ? "Side Angle"
      : "Back Angle";
  }, [angleKey]);

  const retakeParams = useMemo(() => ({ photoIndex }), [photoIndex]);

  const handleRetake = useCallback(() => {
    if (busy) return;
    router.push({ pathname: "/capture", params: retakeParams as any });
  }, [busy, router, retakeParams]);

  /**
   * ✅ Critical: guarantee cloud backup exists before moving on.
   * - If upload already happened (photoId/storagePath exists), do nothing.
   * - Else: try to upload using base64 (preferred) or read from file uri.
   * - Never blocks retake; only blocks Next/Analyze while running.
   */
  const ensureCloudBackup = useCallback(async (): Promise<boolean> => {
    if (photoId && storagePath) return true;

    // Need something to upload
    let b64 = (base64 || "").trim();

    if (!b64 && uri) {
      try {
        b64 = await FileSystem.readAsStringAsync(uri, { encoding: "base64" });
        b64 = (b64 || "").trim();
      } catch (e) {
        console.log("❌ preview base64 read failed:", e);
      }
    }

    if (!b64) {
      Alert.alert(
        "Photo missing",
        "We couldn’t prepare this photo for backup. Please retake it."
      );
      return false;
    }

    // Ensure we have a supabase user (anon ok) before upload
    try {
      const { data } = await supabase.auth.getSession();
      if (!data?.session?.user?.id) {
        await ensureGuestSession();
      }
    } catch (e) {
      console.log("🟨 ensure session failed:", (e as any)?.message ?? e);
      // still attempt upload; uploadUserPhotoBase64 may throw if no auth
    }

    try {
      const uploaded = await uploadUserPhotoBase64({
        base64: b64,
        ext: "jpg",
        kind: "original",
        // optional: angle: angleKey,
      } as any);

      setAngle(angleKey, {
        // keep existing local fields
        uri,
        base64: b64,
        photoId: uploaded?.id,
        storagePath: uploaded?.storage_path,
      });

      return Boolean(uploaded?.id && uploaded?.storage_path);
    } catch (e) {
      console.log("❌ backup upload failed:", e);
      Alert.alert(
        "Backup failed",
        "We saved this photo locally, but cloud backup failed. Check your connection and try again, or retake."
      );
      return false;
    }
  }, [photoId, storagePath, base64, uri, angleKey, setAngle, ensureGuestSession]);

  const handleNext = useCallback(async () => {
    if (busy) return;

    setBusy(true);
    try {
      const ok = await ensureCloudBackup();
      if (!ok) return;

      if (!isLast) {
        router.push({
          pathname: "/capture",
          params: { photoIndex: photoIndex + 1 } as any,
        });
        return;
      }

      // FINAL STEP → analyzing
      router.push("/analyzing");
    } finally {
      setBusy(false);
    }
  }, [busy, ensureCloudBackup, isLast, photoIndex, router]);

  if (!uri) {
    return (
      <View style={styles.center}>
        <Text style={styles.missingTitle}>No Photo Found</Text>
        <Text style={styles.missingMessage}>
          We couldn’t load your {angleKey.toUpperCase()} photo.
        </Text>

        <TouchableOpacity
          style={styles.missingButton}
          onPress={() => router.push({ pathname: "/capture", params: retakeParams as any })}
        >
          <Text style={styles.missingButtonText}>
            Retake {angleKey.toUpperCase()}
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Image source={{ uri }} style={styles.image} resizeMode="cover" />

      {/* top label */}
      <View style={[styles.topPill, { top: insets.top + 12 }]}>
        <Text style={styles.topPillText}>
          {title} • {photoIndex + 1}/{ANGLES.length}
        </Text>
      </View>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 18 }]}>
        <Text style={styles.progressText}>
          {photoIndex + 1}/{ANGLES.length} Captured
        </Text>

        <View style={styles.buttons}>
          <TouchableOpacity
            onPress={handleRetake}
            style={[styles.retakeButton, busy && { opacity: 0.6 }]}
            disabled={busy}
          >
            <Text style={styles.retakeText}>Retake</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleNext}
            style={[styles.nextButton, busy && { opacity: 0.75 }]}
            disabled={busy}
          >
            {busy ? (
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <ActivityIndicator size="small" color="#00110A" />
                <Text style={[styles.nextText, { marginLeft: 8 }]}>
                  Saving…
                </Text>
              </View>
            ) : (
              <Text style={styles.nextText}>{isLast ? "Analyze" : "Next Angle"}</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* subtle status */}
        {!busy && (!photoId || !storagePath) && (
          <Text style={styles.backupHint}>
            Backing up this photo before you continue.
          </Text>
        )}
      </View>
    </View>
  );
}

/* ---------------- STYLES ---------------- */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
    justifyContent: "center",
    alignItems: "center",
  },
  image: {
    width,
    height: height * 0.78,
  },

  topPill: {
    position: "absolute",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "rgba(10,11,12,0.72)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },
  topPillText: {
    color: "rgba(255,255,255,0.9)",
    fontSize: 12,
    fontWeight: "700",
  },

  footer: {
    position: "absolute",
    bottom: 0,
    width: "100%",
    alignItems: "center",
  },
  progressText: {
    color: "#B8FF48",
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 12,
  },
  buttons: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "80%",
  },
  retakeButton: {
    backgroundColor: "#111",
    paddingVertical: 14,
    paddingHorizontal: 35,
    borderRadius: 12,
  },
  retakeText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  nextButton: {
    backgroundColor: "#00FFB0",
    paddingVertical: 14,
    paddingHorizontal: 35,
    borderRadius: 12,
    minWidth: 150,
    alignItems: "center",
    justifyContent: "center",
  },
  nextText: {
    color: "#00110A",
    fontSize: 16,
    fontWeight: "800",
  },

  backupHint: {
    marginTop: 10,
    color: "rgba(255,255,255,0.55)",
    fontSize: 12,
  },

  center: {
    flex: 1,
    backgroundColor: "#000",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  missingTitle: {
    color: "#FF5757",
    fontSize: 24,
    fontWeight: "800",
    marginBottom: 10,
  },
  missingMessage: {
    color: "#D0D6E0",
    fontSize: 16,
    textAlign: "center",
    marginBottom: 20,
  },
  missingButton: {
    backgroundColor: "#00FFB0",
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 12,
  },
  missingButtonText: {
    color: "#000",
    fontSize: 16,
    fontWeight: "700",
  },
});