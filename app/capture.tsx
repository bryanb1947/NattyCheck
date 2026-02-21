// app/capture.tsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  ActivityIndicator,
  Alert,
  Platform,
} from "react-native";

import { CameraView, useCameraPermissions } from "expo-camera";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useNavigation, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// ⭐ USE LEGACY API — fixes iOS crashes & warnings
import * as FileSystem from "expo-file-system/legacy";

import { useCaptureStore } from "@/store/useCaptureStore";
import { useAuthStore } from "@/store/useAuthStore";
import { supabase } from "@/lib/supabase";
import { uploadUserPhotoBase64 } from "@/lib/photos";

const { width, height } = Dimensions.get("window");
const ANGLES: Array<"front" | "side" | "back"> = ["front", "side", "back"];

/* -------------------------------------------------------------
   LIGHTWEIGHT VALIDATION
------------------------------------------------------------- */
function validateFinalPhoto(photo: any) {
  const w = photo?.width;
  const h = photo?.height;

  if (!w || !h) return "Image corrupted — retake photo.";
  if (h < 600 || w < 300) return "Step back slightly — more body needed.";

  const ratio = h / w;
  if (ratio < 1.15) return "Hold your phone vertically for a full-body shot.";

  return null;
}

function clampIndex(v: number) {
  if (!Number.isFinite(v)) return 0;
  return Math.min(Math.max(v, 0), 2);
}

export default function CaptureScreen() {
  const insets = useSafeAreaInsets();
  const cameraRef = useRef<CameraView | null>(null);

  const router = useRouter();
  const navigation = useNavigation();
  const params = useLocalSearchParams<{ photoIndex?: string; index?: string }>();

  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState<"front" | "back">("front");

  const [isCapturing, setIsCapturing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const [countdown, setCountdown] = useState(0);
  const countdownTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [photoIndex, setPhotoIndex] = useState(0);

  const [outlineColor, setOutlineColor] = useState("#FF5C7A");
  const [bodyHint, setBodyHint] = useState("Step fully into the outline.");

  const currentAngle = useMemo(() => ANGLES[photoIndex], [photoIndex]);

  // store helpers (works with your updated store + older versions)
  const setAngle =
    (useCaptureStore as any)((s: any) => s.setAngle) ??
    useCaptureStore((s) => s.set as any);

  const resetAngle =
    (useCaptureStore as any)((s: any) => s.resetAngle) ?? null;

  const ensureGuestSession = useAuthStore((s) => s.ensureGuestSession);

  const anyBusy = isCapturing || isUploading;

  /* -------------------------------------------------------------
     INITIAL SETUP
  ------------------------------------------------------------- */
  useEffect(() => {
    requestPermission();

    const p = params?.photoIndex ?? params?.index;
    if (p != null) {
      const idx = clampIndex(parseInt(String(p), 10));
      setPhotoIndex(idx);
    }

    return () => {
      if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
      countdownTimerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // slight delay reduces iOS camera flicker
  useEffect(() => {
    if (!permission?.granted) return;
    const t = setTimeout(() => setFacing("front"), 60);
    return () => clearTimeout(t);
  }, [permission?.granted]);

  /* -------------------------------------------------------------
     ENABLE NATIVE iOS SWIPE BACK
  ------------------------------------------------------------- */
  useEffect(() => {
    navigation.setOptions?.({
      gestureEnabled: photoIndex === 0 && !anyBusy,
    });
  }, [navigation, photoIndex, anyBusy]);

  /* -------------------------------------------------------------
     BACK OUT
  ------------------------------------------------------------- */
  const handleBackOut = useCallback(() => {
    if (photoIndex === 0 && !anyBusy) router.back();
  }, [photoIndex, anyBusy, router]);

  /* -------------------------------------------------------------
     COUNTDOWN HELPERS
  ------------------------------------------------------------- */
  const clearCountdown = useCallback(() => {
    if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
    countdownTimerRef.current = null;
    setCountdown(0);
  }, []);

  /* -------------------------------------------------------------
     CAPTURE LOGIC
  ------------------------------------------------------------- */
  const capturePhoto = useCallback(async () => {
    if (!cameraRef.current) return;
    if (anyBusy) return;

    try {
      setIsCapturing(true);
      setOutlineColor("#FF5C7A");
      setBodyHint("Hold still…");

      // If user is retaking, wipe old refs for this angle
      if (resetAngle) resetAngle(currentAngle);

      // best-effort: ensure anon session BEFORE upload
      try {
        const { data } = await supabase.auth.getSession();
        if (!data?.session?.user?.id) {
          await ensureGuestSession();
        }
      } catch (e) {
        console.log(
          "🟨 ensure session failed (non-fatal):",
          (e as any)?.message ?? e
        );
      }

      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.85,
        base64: true,
        skipProcessing: false,
        // @ts-ignore — expo-camera internal flag (some builds)
        convertResponseToBase64: true,
      });

      const err = validateFinalPhoto(photo);
      if (err) {
        setBodyHint(err);
        setIsCapturing(false);
        return;
      }

      if (!photo?.base64) {
        setBodyHint("Photo data missing — retake.");
        setIsCapturing(false);
        return;
      }

      // SAVE LOCAL (always)
      const filePath =
        FileSystem.documentDirectory + `${currentAngle}_${Date.now()}.jpg`;

      await FileSystem.writeAsStringAsync(filePath, photo.base64, {
        encoding: "base64",
      });

      // UPLOAD (best-effort)
      setIsUploading(true);
      setBodyHint("Saving…");

      let uploaded: { id: string; storage_path: string } | null = null;

      try {
        uploaded = await uploadUserPhotoBase64({
          base64: photo.base64,
          ext: "jpg",
          kind: "original",
        } as any);
      } catch (uploadErr) {
        console.log("❌ Photo upload failed:", uploadErr);
        // keep flow smooth; local file is enough to continue
      } finally {
        setIsUploading(false);
      }

      // STORE IN ZUSTAND
      setAngle(currentAngle, {
        uri: filePath,
        base64: photo.base64,
        photoId: uploaded?.id,
        storagePath: uploaded?.storage_path,
      });

      setIsCapturing(false);

      // ✅ Use CURRENT photoIndex so preview matches angle
      router.push({
        pathname: "/preview",
        params: { index: String(photoIndex) },
      });
    } catch (e: any) {
      console.log("CAPTURE ERROR:", e?.message ?? e);
      setBodyHint("Capture failed — retry.");
      setIsUploading(false);
      setIsCapturing(false);
      Alert.alert("Capture failed", "Please try again.");
    }
  }, [
    anyBusy,
    currentAngle,
    photoIndex,
    router,
    ensureGuestSession,
    resetAngle,
    setAngle,
  ]);

  /* -------------------------------------------------------------
     COUNTDOWN → CAPTURE
     ✅ IMPORTANT: depends on capturePhoto to avoid stale closure
  ------------------------------------------------------------- */
  const startCountdown = useCallback(() => {
    if (anyBusy) return;

    clearCountdown();

    let sec = 3;
    setCountdown(sec);

    countdownTimerRef.current = setInterval(() => {
      sec -= 1;
      setCountdown(sec);

      if (sec <= 0) {
        clearCountdown();
        void capturePhoto();
      }
    }, 1000);
  }, [anyBusy, clearCountdown, capturePhoto]);

  /* -------------------------------------------------------------
     PERMISSION UI
  ------------------------------------------------------------- */
  if (!permission) return <View style={styles.permissionContainer} />;

  if (!permission.granted) {
    return (
      <View style={styles.permissionContainer}>
        <Text style={styles.permissionText}>Camera access required</Text>

        <TouchableOpacity
          onPress={requestPermission}
          style={styles.permissionButton}
        >
          <Text style={styles.permissionButtonText}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  /* -------------------------------------------------------------
     UI
  ------------------------------------------------------------- */
  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {photoIndex === 0 && (
        <View style={styles.topBar}>
          <TouchableOpacity
            onPress={handleBackOut}
            style={styles.backIconWrapper}
            hitSlop={{ top: 14, bottom: 14, left: 14, right: 14 }}
            disabled={anyBusy}
          >
            <Ionicons
              name="chevron-back"
              size={32}
              color={anyBusy ? "rgba(255,255,255,0.35)" : "#fff"}
            />
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.cameraFrame}>
        <CameraView ref={cameraRef} style={styles.camera} facing={facing} />

        <View style={styles.overlay}>
          <View style={[styles.ovalOutline, { borderColor: outlineColor }]} />
        </View>
      </View>

      <Text style={styles.angleText}>
        {currentAngle.toUpperCase()} ({photoIndex + 1}/3)
      </Text>

      <Text style={styles.instruction}>{bodyHint}</Text>

      {countdown > 0 && <Text style={styles.countdown}>{countdown}</Text>}

      <View style={styles.controls}>
        <TouchableOpacity
          style={styles.flipButton}
          onPress={() => setFacing(facing === "front" ? "back" : "front")}
          disabled={anyBusy}
        >
          <Ionicons name="camera-reverse-outline" size={32} color="#fff" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.captureButton}
          disabled={anyBusy}
          onPress={startCountdown}
        >
          {anyBusy ? (
            <ActivityIndicator size="small" color="#00FFE0" />
          ) : (
            <View style={styles.innerCircle} />
          )}
        </TouchableOpacity>
      </View>

      {isUploading && (
        <Text style={styles.uploadingText}>Backing up photo…</Text>
      )}

      {Platform.OS === "ios" && (
        <Text style={styles.bottomHint}>
          Tip: keep your full body in frame (head to feet).
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000", alignItems: "center" },

  topBar: { width: "100%", paddingHorizontal: 12, marginBottom: 8 },

  backIconWrapper: {
    width: 46,
    height: 46,
    borderRadius: 23,
    justifyContent: "center",
    alignItems: "center",
  },

  cameraFrame: {
    width: width * 0.9,
    height: height * 0.62,
    borderRadius: 28,
    overflow: "hidden",
    position: "relative",
    marginTop: 6,
  },

  camera: { width: "100%", height: "100%" },

  overlay: {
    position: "absolute",
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },

  ovalOutline: {
    width: width * 0.62,
    height: height * 0.52,
    borderRadius: 320,
    borderWidth: 3,
  },

  angleText: { marginTop: 16, color: "#B8FF48", fontSize: 20, fontWeight: "800" },

  instruction: {
    color: "#fff",
    fontSize: 15,
    marginTop: 6,
    textAlign: "center",
    width: "80%",
  },

  countdown: {
    color: "#00FFE0",
    fontSize: 48,
    fontWeight: "900",
    position: "absolute",
    top: height * 0.42,
  },

  controls: { flexDirection: "row", alignItems: "center", marginTop: 32 },

  flipButton: { marginRight: 40 },

  captureButton: {
    width: 82,
    height: 82,
    borderRadius: 41,
    borderWidth: 4,
    borderColor: "#00FFE0",
    justifyContent: "center",
    alignItems: "center",
  },

  innerCircle: { width: 60, height: 60, borderRadius: 30, backgroundColor: "#00FFE0" },

  uploadingText: { marginTop: 14, color: "rgba(255,255,255,0.75)", fontSize: 12 },

  bottomHint: { marginTop: 10, color: "rgba(255,255,255,0.35)", fontSize: 11 },

  permissionContainer: {
    flex: 1,
    backgroundColor: "#000",
    justifyContent: "center",
    alignItems: "center",
  },

  permissionText: { color: "#fff", fontSize: 16, marginBottom: 16 },

  permissionButton: {
    backgroundColor: "#00FFE0",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
  },

  permissionButtonText: { fontSize: 16, color: "#000", fontWeight: "800" },
});