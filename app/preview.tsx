import React from "react";
import { View, Image, Text, TouchableOpacity, StyleSheet, Dimensions } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter, useLocalSearchParams } from "expo-router";

const { width } = Dimensions.get("window");

export default function PreviewScreen() {
  const router = useRouter();
  const { uri, index } = useLocalSearchParams();
  const currentIndex = parseInt(index || "0", 10);
  const TOTAL = 4;

  const handleRetake = () => router.back();

  const handleContinue = () => {
    if (currentIndex + 1 < TOTAL) {
      router.push({ pathname: "/capture", params: { photoIndex: currentIndex + 1 } });
    } else {
      router.push({ pathname: "/analyzing", params: { uri } });
    }
  };

  return (
    <View style={styles.container}>
      <Image source={{ uri }} style={styles.image} resizeMode="cover" />

      <View style={styles.bottomContainer}>
        <View style={styles.buttonRow}>
          <TouchableOpacity style={styles.retake} onPress={handleRetake}>
            <Text style={styles.retakeText}>Retake</Text>
          </TouchableOpacity>

          <LinearGradient
            colors={["#00FFE0", "#B8FF48"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.continue}
          >
            <TouchableOpacity onPress={handleContinue}>
              <Text style={styles.continueText}>
                {currentIndex + 1 < TOTAL ? "Next Angle" : "Continue"}
              </Text>
            </TouchableOpacity>
          </LinearGradient>
        </View>

        <Text style={styles.counter}>
          {currentIndex + 1}/{TOTAL} Captured
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  image: { width: "100%", height: "100%" },
  bottomContainer: {
    position: "absolute",
    bottom: 60,
    width: "100%",
    paddingHorizontal: 20,
  },
  buttonRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  retake: {
    flex: 1,
    backgroundColor: "#1A1A1A",
    borderRadius: 10,
    marginRight: 10,
    paddingVertical: 14,
    alignItems: "center",
  },
  retakeText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "600",
  },
  continue: {
    flex: 1,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
  },
  continueText: {
    color: "#0A0B0C",
    fontSize: 16,
    fontWeight: "700",
  },
  counter: {
    textAlign: "center",
    color: "#B8FF48",
    fontWeight: "600",
    marginTop: 15,
  },
});
