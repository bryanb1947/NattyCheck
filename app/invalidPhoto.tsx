import React, { useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

const { width } = Dimensions.get("window");

const ANGLE_INDEX: Record<string, number> = {
  front: 0,
  side: 1,
  back: 2,
};

export default function InvalidPhotoScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();

  // REAL check: are params actually present?
  const badAngle = params.badAngle as string | undefined;
  const reason = params.reason as string | undefined;
  const message = params.message as string | undefined;

  useEffect(() => {
    console.log("📸 INVALID PHOTO PARAMS:", params);

    // If ANYTHING required is missing → DO NOT SHOW THIS SCREEN
    if (!badAngle || !reason || !message) {
      console.log("⚠️ Missing params → redirecting safely");
      router.replace("/capture");
    }
  }, []);

  // While redirecting just render nothing
  if (!badAngle || !reason || !message) {
    return <View style={{ flex: 1, backgroundColor: "black" }} />;
  }

  const photoIndex = ANGLE_INDEX[badAngle] ?? 0;

  const angleTips: Record<string, string[]> = {
    front: [
      "Stand facing the camera squarely",
      "Keep your entire body visible head-to-toe",
      "Arms relaxed at your sides",
      "Bright, even lighting — avoid shadows",
    ],
    side: [
      "Turn perfectly sideways, not angled",
      "Keep your posture tall and neutral",
      "Full body inside the oval outline",
      "Ensure your arm does not hide your torso",
    ],
    back: [
      "Stand straight with your back facing the camera",
      "Relax shoulders — do not flex excessively",
      "Make sure head and feet are fully visible",
      "Even lighting helps muscle outlines",
    ],
  };

  const tips = angleTips[badAngle] || angleTips.front;

  const handleRetake = () =>
    router.replace({ pathname: "/capture", params: { photoIndex } });

  return (
    <View style={styles.container}>
      <Ionicons
        name="alert-circle"
        size={80}
        color="#FF5757"
        style={{ marginBottom: 20 }}
      />

      <Text style={styles.title}>Invalid {badAngle.toUpperCase()} Photo</Text>

      <Text style={styles.message}>{message}</Text>

      <View style={styles.reasonBox}>
        <Text style={styles.reasonLabel}>Detected Issue</Text>
        <Text style={styles.reasonValue}>{reason}</Text>
        <Text style={styles.reasonValueAngle}>
          Problem Angle:{" "}
          <Text style={{ color: "#B8FF48", fontWeight: "700" }}>
            {badAngle.toUpperCase()}
          </Text>
        </Text>
      </View>

      <View style={styles.tipsBox}>
        <Text style={styles.tipTitle}>
          Tips for a Better {badAngle.toUpperCase()} Photo
        </Text>
        {tips.map((t, i) => (
          <Text key={i} style={styles.tip}>
            • {t}
          </Text>
        ))}
      </View>

      <TouchableOpacity
        onPress={handleRetake}
        activeOpacity={0.85}
        style={styles.button}
      >
        <Text style={styles.buttonText}>
          Retake {badAngle.toUpperCase()} Photo
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0B0D0F",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingTop: 100,
  },
  title: {
    color: "#FF5757",
    fontSize: 26,
    fontWeight: "800",
    marginBottom: 10,
    textAlign: "center",
  },
  message: {
    color: "#E8F0FF",
    fontSize: 16,
    textAlign: "center",
    marginBottom: 24,
    maxWidth: width * 0.82,
    lineHeight: 22,
  },
  reasonBox: {
    backgroundColor: "#121519",
    borderWidth: 1,
    borderColor: "#1E232B",
    padding: 16,
    borderRadius: 14,
    width: "100%",
    marginBottom: 22,
  },
  reasonLabel: {
    color: "#94A3B8",
    fontSize: 14,
    marginBottom: 6,
  },
  reasonValue: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  reasonValueAngle: {
    color: "#E8F0FF",
    fontSize: 14,
    marginTop: 8,
  },
  tipsBox: {
    width: "100%",
    backgroundColor: "#121519",
    borderWidth: 1,
    borderColor: "#1E232B",
    padding: 16,
    borderRadius: 14,
    marginBottom: 40,
  },
  tipTitle: {
    color: "#B8FF48",
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 10,
  },
  tip: {
    color: "#E8F0FF",
    fontSize: 14,
    marginBottom: 5,
  },
  button: {
    backgroundColor: "#00FFB0",
    paddingVertical: 14,
    paddingHorizontal: 40,
    borderRadius: 12,
  },
  buttonText: {
    color: "#0B0D0F",
    fontWeight: "700",
    fontSize: 16,
  },
});
