import React from "react";
import { SafeAreaView, View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

export default function CaptureGuide() {
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <View style={styles.card}>
          <Text style={styles.title}>How to Capture</Text>

          {[
            ["1", "Good Lighting", "Stand in bright, even lighting"],
            ["2", "Tight-Fitting Clothes", "Or shirtless for best results"],
            ["3", "Neutral Pose", "Stand relaxed, arms at sides"],
            ["4", "Three Angles", "Front, side, and back views"],
          ].map(([n, h, s]) => (
            <View key={n} style={styles.row}>
              <View style={styles.numCircle}>
                <Text style={styles.numText}>{n}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowTitle}>{h}</Text>
                <Text style={styles.sub}>{s}</Text>
              </View>
            </View>
          ))}

          {/* Camera Buttons */}
          <View style={styles.cameraRow}>
            {["Front", "Side", "Back"].map((label) => (
              <TouchableOpacity
                key={label}
                activeOpacity={0.9}
                onPress={() => router.push(`/capture?view=${label.toLowerCase()}`)}
                style={styles.cameraButton}
              >
                <Ionicons name="camera-outline" size={24} color="#B3B3B3" />
                <Text style={styles.cameraLabel}>{label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Continue Button */}
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => router.push("/capture?view=front")}
            style={{ width: "100%", marginTop: 16 }}
          >
            <LinearGradient
              colors={["#00FFE0", "#B8FF47"]}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              style={styles.cta}
            >
              <Text style={styles.ctaText}>Continue</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#0F0F0F" },
  container: { flex: 1, padding: 20, justifyContent: "center" },
  card: {
    backgroundColor: "#151515",
    borderColor: "#2A2A2A",
    borderWidth: 1,
    borderRadius: 20,
    padding: 20,
    shadowColor: "#000",
    shadowOpacity: 0.35,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
  },
  title: { color: "#fff", fontSize: 22, fontWeight: "700", marginBottom: 12 },
  row: { flexDirection: "row", alignItems: "center", marginBottom: 14 },
  numCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,224,255,0.18)",
    marginRight: 12,
  },
  numText: { color: "#00E0FF", fontWeight: "700" },
  rowTitle: { color: "#fff", fontWeight: "600", marginBottom: 2 },
  sub: { color: "#B3B3B3" },

  cameraRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 20,
    marginBottom: 8,
  },
  cameraButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    backgroundColor: "#1A1A1A",
    borderRadius: 12,
    borderColor: "#2A2A2A",
    borderWidth: 1,
    marginHorizontal: 4,
  },
  cameraLabel: { color: "#B3B3B3", marginTop: 6, fontSize: 14, fontWeight: "500" },

  cta: { borderRadius: 999, paddingVertical: 14, alignItems: "center", justifyContent: "center" },
  ctaText: { color: "#0F0F0F", fontWeight: "700", fontSize: 16 },
});
