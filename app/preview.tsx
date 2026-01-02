// app/preview.tsx
import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  Dimensions,
} from "react-native";

import { useLocalSearchParams, useRouter } from "expo-router";
import { useCaptureStore } from "@/store/useCaptureStore";

const { width, height } = Dimensions.get("window");
const ANGLES: Array<"front" | "side" | "back"> = ["front", "side", "back"];

export default function PreviewScreen() {
  const router = useRouter();
  const { index } = useLocalSearchParams();

  const photoIndex = Number.isFinite(parseInt(index as string, 10))
    ? parseInt(index as string, 10)
    : 0;

  const frontUri = useCaptureStore((s) => s.front?.uri);
  const sideUri = useCaptureStore((s) => s.side?.uri);
  const backUri = useCaptureStore((s) => s.back?.uri);

  const angleKey = ANGLES[photoIndex];
  const uri = { front: frontUri, side: sideUri, back: backUri }[angleKey];

  if (!uri) {
    return (
      <View style={styles.center}>
        <Text style={styles.missingTitle}>No Photo Found</Text>
        <Text style={styles.missingMessage}>
          We couldn’t load your {angleKey.toUpperCase()} photo.
        </Text>

        <TouchableOpacity
          style={styles.missingButton}
          onPress={() =>
            router.push({
              pathname: "/capture",
              params: { photoIndex },
            })
          }
        >
          <Text style={styles.missingButtonText}>
            Retake {angleKey.toUpperCase()}
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  const isLast = photoIndex === ANGLES.length - 1;

  const handleNext = () => {
    if (!isLast) {
      router.push({
        pathname: "/capture",
        params: { photoIndex: photoIndex + 1 },
      });
      return;
    }

    // FINAL STEP → go straight to analyzing
    router.push("/analyzing");
  };

  const handleRetake = () => {
    router.push({
      pathname: "/capture",
      params: { photoIndex },
    });
  };

  return (
    <View style={styles.container}>
      <Image source={{ uri }} style={styles.image} resizeMode="cover" />

      <View style={styles.footer}>
        <Text style={styles.progressText}>
          {photoIndex + 1}/{ANGLES.length} Captured
        </Text>

        <View style={styles.buttons}>
          <TouchableOpacity onPress={handleRetake} style={styles.retakeButton}>
            <Text style={styles.retakeText}>Retake</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={handleNext} style={styles.nextButton}>
            <Text style={styles.nextText}>
              {isLast ? "Analyze" : "Next Angle"}
            </Text>
          </TouchableOpacity>
        </View>
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
  footer: {
    position: "absolute",
    bottom: 40,
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
  },
  nextText: {
    color: "#000",
    fontSize: 16,
    fontWeight: "700",
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
