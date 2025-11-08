import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  ScrollView,
  TouchableOpacity,
  Image,
} from "react-native";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";

const { width } = Dimensions.get("window");

export default function ResultsScreen() {
  const router = useRouter();
  const score = 85;
  const results = {
    upperBody: 88,
    lowerBody: 82,
    symmetry: 91,
    confidence: 94,
  };

  const handleUnlock = () => router.push("/paywall");

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ alignItems: "center", paddingBottom: 100 }}
    >
      {/* MAIN CARD */}
      <LinearGradient
        colors={["#0F1215", "#0A0B0C"]}
        style={styles.card}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        {/* HEADER */}
        <View style={styles.headerRow}>
          <View style={styles.iconBadge}>
            <Text style={styles.iconText}>N</Text>
          </View>
          <Text style={styles.dateText}>Nov 8, 2025</Text>
        </View>

        {/* SCORE */}
        <LinearGradient
          colors={["#00FFE0", "#B8FF48"]}
          style={styles.scoreCircle}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <Text style={styles.scoreText}>{score}</Text>
          <Text style={styles.scoreLabel}>Score</Text>
        </LinearGradient>

        <Text style={styles.title}>Physique Report</Text>
        <Text style={styles.subtitle}>AI Analysis Complete</Text>

        {/* STATS */}
        <View style={styles.statsGrid}>
          {Object.entries(results).map(([key, value]) => (
            <View key={key} style={styles.statBox}>
              <Text style={styles.statTitle}>
                {key.charAt(0).toUpperCase() + key.slice(1)}
              </Text>
              <Text style={styles.statValue}>{value}%</Text>
            </View>
          ))}
        </View>

        {/* --- Figma Accurate NATTY STATUS --- */}
        <View style={styles.nattyContainer}>
          <View style={styles.nattyLeft}>
            <LinearGradient
              colors={["#00FFE0", "#B8FF48"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.dnaCircle}
            >
              <Image
                source={{
                  uri: "https://cdn.jsdelivr.net/gh/bryanb1947/assets@main/icons/dna-transparent.png",
                }}
                style={styles.dnaIcon}
              />
            </LinearGradient>
            <Text style={styles.nattyLabel}>Natty Status</Text>
          </View>

          <LinearGradient
            colors={["#B8FF48", "#5FFF9A"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.nattyBadge}
          >
            <Text style={styles.nattyText}>NATURAL ✅</Text>
          </LinearGradient>
        </View>
      </LinearGradient>

      {/* LOCKED PREVIEW */}
      <TouchableOpacity onPress={handleUnlock} activeOpacity={0.9}>
        <View style={styles.analysisWrapper}>
          <BlurView intensity={80} tint="dark" style={styles.blurOverlay}>
            <Text style={styles.lockedText}>🔒 Unlock Full Analysis</Text>
          </BlurView>
          <View style={styles.analysisSection}>
            <View style={styles.bodyGraph}>
              <LinearGradient
                colors={["#7CF2D0", "#B78AFF"]}
                style={styles.bodyShape}
              />
              <LinearGradient
                colors={["#7CF2D0", "#B78AFF"]}
                style={styles.bodyShape}
              />
            </View>
          </View>
        </View>
      </TouchableOpacity>

      {/* CTA */}
      <TouchableOpacity style={styles.ctaButton} onPress={handleUnlock}>
        <LinearGradient colors={["#00FFE0", "#B8FF48"]} style={styles.ctaGradient}>
          <Text style={styles.ctaText}>
            View Full Breakdown & Recommendations →
          </Text>
        </LinearGradient>
      </TouchableOpacity>

      <Text style={styles.ctaSubtext}>
        Unlock your detailed muscle analysis, custom plans, and progress tracking.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0A0B0C" },
  card: {
    width: width * 0.9,
    borderRadius: 24,
    padding: 20,
    marginTop: 30,
  },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  iconBadge: {
    backgroundColor: "#B8FF48",
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  iconText: { fontWeight: "bold", color: "#0A0B0C" },
  dateText: { color: "#B8FF48", fontSize: 12 },
  scoreCircle: {
    width: 130,
    height: 130,
    borderRadius: 65,
    alignSelf: "center",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 20,
    marginBottom: 10,
  },
  scoreText: { fontSize: 36, color: "#0A0B0C", fontWeight: "700" },
  scoreLabel: { color: "#0A0B0C", fontSize: 14 },
  title: { textAlign: "center", color: "#fff", fontSize: 20, fontWeight: "600" },
  subtitle: { textAlign: "center", color: "#999", fontSize: 14, marginBottom: 20 },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  statBox: {
    backgroundColor: "#121416",
    width: "48%",
    borderRadius: 12,
    padding: 12,
    marginVertical: 6,
  },
  statTitle: { color: "#ccc", fontSize: 14 },
  statValue: { color: "#fff", fontWeight: "bold", fontSize: 18 },

  // NATTY FIX
  nattyContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#121416",
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginTop: 6,
  },
  nattyLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  dnaCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#B8FF48",
  },
  dnaIcon: {
    width: 14,
    height: 14,
    tintColor: "#0A0B0C",
  },
  nattyLabel: { color: "#E4E4E4", fontSize: 15, fontWeight: "500" },
  nattyBadge: {
    borderRadius: 10,
    paddingVertical: 6,
    paddingHorizontal: 14,
  },
  nattyText: { color: "#0A0B0C", fontWeight: "700", fontSize: 13, letterSpacing: 0.3 },

  // LOCKED PREVIEW
  analysisWrapper: { width: width * 0.9, marginTop: 30, borderRadius: 24, overflow: "hidden" },
  blurOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 24,
    zIndex: 5,
  },
  lockedText: { color: "#B8FF48", fontWeight: "600", fontSize: 16 },
  analysisSection: { backgroundColor: "#121416", borderRadius: 24, padding: 16 },
  bodyGraph: { flexDirection: "row", justifyContent: "center", marginVertical: 16 },
  bodyShape: { width: 60, height: 120, borderRadius: 30, marginHorizontal: 10 },

  // CTA
  ctaButton: { width: width * 0.9, marginTop: 30, borderRadius: 14, overflow: "hidden" },
  ctaGradient: { paddingVertical: 14, borderRadius: 14, alignItems: "center" },
  ctaText: { color: "#0A0B0C", fontWeight: "700", fontSize: 14 },
  ctaSubtext: {
    textAlign: "center",
    color: "#999",
    fontSize: 13,
    marginTop: 10,
    width: width * 0.85,
  },
});
