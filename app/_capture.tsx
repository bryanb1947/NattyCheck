import React, { useEffect, useRef, useState } from "react";
import { SafeAreaView, View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { CameraView, useCameraPermissions, type CameraCapturedPicture } from "expo-camera";
import { useCaptureStore } from "../store/useCaptureStore";

const STEPS = ["front", "side", "back"] as const;
type StepKey = (typeof STEPS)[number];

export default function Capture() {
  const params = useLocalSearchParams<{ view?: StepKey; single?: string }>();
  const { view = "front", single } = params;
  const idx = Math.max(0, STEPS.indexOf((view as StepKey) ?? "front"));
  const label = (STEPS[idx] ?? "front") as StepKey;
  const singleMode = single === "1" || single === "true";

  const [permission, requestPermission] = useCameraPermissions();
  const camRef = useRef<CameraView>(null);

  const { setFront, setSide, setBack } = useCaptureStore();

  const [countdown, setCountdown] = useState<number | null>(null);
  const [shooting, setShooting] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!permission?.granted) requestPermission();
  }, [permission?.granted]);

  useEffect(() => {
    if (countdown === null) {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      return;
    }
    if (countdown <= 0) {
      setCountdown(null);
      requestAnimationFrame(() => takeShot());
      return;
    }
    timerRef.current = setTimeout(() => {
      setCountdown((c) => (c ?? 1) - 1);
    }, 1000);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = null;
    };
  }, [countdown]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  if (!permission?.granted) {
    return (
      <SafeAreaView style={styles.safe}>
        <Text style={styles.loading}>Requesting camera permission…</Text>
      </SafeAreaView>
    );
  }

  const nextStep = () => {
    if (singleMode) {
      router.replace("/(tabs)/analyze"); // return to Analyze after single retake
      return;
    }
    const nextIdx = idx + 1;
    if (nextIdx >= STEPS.length) router.replace("/(tabs)/analyze");
    else router.replace(`/capture?view=${STEPS[nextIdx]}`);
  };

  const help =
    label === "back"
      ? "Turn around and face away. Center your body, even lighting."
      : label === "side"
      ? "Stand sideways, arms relaxed. Center yourself; even lighting."
      : "Face the camera, stand back a bit, and center yourself in the oval.";

  const startCountdown = (secs = 3) => {
    if (shooting || countdown !== null) return;
    setCountdown(secs);
  };

  const takeShot = async () => {
    const anyRef = camRef.current as unknown as {
      takePictureAsync: (opts?: object) => Promise<CameraCapturedPicture>;
    } | null;
    if (!anyRef?.takePictureAsync || shooting) return;

    setShooting(true);
    try {
      const photo = await anyRef.takePictureAsync({ quality: 0.9, skipProcessing: true });
      if (photo?.uri) {
        if (label === "front") setFront(photo.uri);
        if (label === "side") setSide(photo.uri);
        if (label === "back") setBack(photo.uri);
      }
      nextStep();
    } finally {
      setShooting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.wrap}>
        {/* Step pill */}
        <View style={[styles.pill, { backgroundColor: pillBg(label) }]}>
          <Text style={[styles.pillText, { color: pillFg(label) }]}>
            {label === "front" && `Front View ${singleMode ? "" : "(1/3)"}`}
            {label === "side" && `Side View ${singleMode ? "" : "(2/3)"}`}
            {label === "back" && `Back View ${singleMode ? "" : "(3/3)"}`}
          </Text>
        </View>

        {/* Card */}
        <View style={styles.card}>
          <View style={styles.previewWrap}>
            {/* FRONT CAMERA so user sees themselves */}
            <CameraView
              ref={camRef}
              style={styles.cameraPreview}
              facing="front"
              animateShutter={false}
              mute
            />
            {/* FaceID-style guide */}
            <View pointerEvents="none" style={styles.overlay}>
              <View style={[styles.oval, { borderColor: stroke(label) }]} />
              {countdown !== null && <Text style={styles.countdown}>{countdown}</Text>}
            </View>
          </View>

          <Text style={styles.helper}>{help}</Text>

          {/* Capture with 3s countdown */}
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => startCountdown(3)}
            disabled={shooting || countdown !== null}
            style={styles.captureWrap}
          >
            <LinearGradient
              colors={["#00FFE0", "#B8FF47"]}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              style={[styles.captureBtn, (shooting || countdown !== null) && { opacity: 0.5 }]}
            />
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

function stroke(step: StepKey) { return step === "back" ? "#B8FF47" : "#00E0FF"; }
function pillBg(step: StepKey) { return step === "back" ? "rgba(184,255,71,0.18)" : "rgba(0,224,255,0.18)"; }
function pillFg(step: StepKey) { return step === "back" ? "#B8FF47" : "#00E0FF"; }

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#0F0F0F" },
  wrap: { flex: 1, padding: 20, alignItems: "center" },
  pill: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, marginBottom: 10 },
  pillText: { fontWeight: "700" },
  card: {
    width: "100%",
    maxWidth: 500,
    backgroundColor: "#151515",
    borderColor: "#2A2A2A",
    borderWidth: 1,
    borderRadius: 20,
    paddingVertical: 18,
    paddingHorizontal: 14
  },
  previewWrap: { width: "100%", height: 420, borderRadius: 20, overflow: "hidden", marginBottom: 10 },
  cameraPreview: { width: "100%", height: "100%" },
  overlay: { position: "absolute", inset: 0, alignItems: "center", justifyContent: "center" },
  oval: { width: "66%", height: "70%", borderRadius: 999, borderWidth: 3, opacity: 0.85 },
  countdown: { position: "absolute", bottom: 20, fontSize: 42, fontWeight: "800", color: "#FFFFFF" },
  helper: { color: "#B3B3B3", textAlign: "center", marginTop: 8 },
  captureWrap: { alignItems: "center", marginTop: 16 },
  captureBtn: { width: 72, height: 72, borderRadius: 36 },
  loading: { color: "#FFFFFF", textAlign: "center", marginTop: 48 }
});