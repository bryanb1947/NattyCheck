// app/results.tsx
import React, { useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";

import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import { useRouter } from "expo-router";

import { useAuthStore } from "@/store/useAuthStore";
import { useResultsStore } from "@/store/useResultsStore";

const { width } = Dimensions.get("window");

export default function ResultsScreen() {
  const router = useRouter();

  const result = useResultsStore((s) => s.last);
  const hasHydratedAuth = useAuthStore.persist.hasHydrated();

  // Wait for auth hydration (prevents flicker / stale persisted values)
  if (!hasHydratedAuth) {
    return (
      <SafeAreaView style={styles.loadingScreen}>
        <ActivityIndicator size="large" color="#00FFE0" />
        <Text style={styles.loadingText}>Loading results…</Text>
      </SafeAreaView>
    );
  }

  if (!result) {
    return (
      <SafeAreaView style={styles.loadingScreen}>
        <Text style={styles.loadingText}>No analysis found. Run a new scan.</Text>
      </SafeAreaView>
    );
  }

  /* --------------------------------------------
     Extract public-safe fields (unchanged)
  -------------------------------------------- */
  const score = result.score ?? 70;
  const bodyfat = result.bodyfat ?? null;
  const symmetry = result.symmetry ?? 70;
  const confidence = result.confidence ?? 80;

  const headerDate = useMemo(() => {
    const d =
      result.created_at !== undefined && result.created_at !== null
        ? new Date(result.created_at)
        : new Date();
    return d.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }, [result.created_at]);

  const unlock = () => router.push("/paywall");

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.pageContent}
      >
        {/* HEADER */}
        <View style={styles.headerRow}>
          <LinearGradient
            colors={["#00E6C8", "#9AF65B"]}
            style={styles.logoPill}
          >
            <Text style={styles.logoText}>N</Text>
          </LinearGradient>

          <Text style={styles.headerDate}>{headerDate}</Text>
        </View>

        {/* TITLE */}
        <View style={styles.titleSection}>
          <LinearGradient
            colors={["#00E6C8", "#9AF65B"]}
            style={styles.titleCard}
          >
            <Text style={styles.titleText}>Physique Summary</Text>
          </LinearGradient>
          <Text style={styles.subtitle}>Free Version — Limited View</Text>
        </View>

        {/* SCORE CARD */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Your Score</Text>

          <View style={styles.scoreCircle}>
            <Text style={styles.scoreValue}>{score}</Text>
            <Text style={styles.scoreLabel}>Overall</Text>
          </View>

          {/* Basic metrics */}
          <View style={styles.metricsGrid}>
            <Metric label="Body Fat" value={bodyfat ? `${bodyfat}%` : "—"} />
            <Metric label="Symmetry" value={`${symmetry}%`} />
            <Metric label="Confidence" value={`${confidence}%`} />
          </View>
        </View>

        {/* BLURRED PREMIUM SECTIONS */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Muscle Group Strength</Text>
          <BlurBlock label="Unlock full muscle map" />
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Muscle Definition</Text>
          <BlurBlock label="Unlock full definition breakdown" />
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Body Proportion Ratios</Text>
          <BlurBlock label="Unlock structure ratios & analysis" />
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Physique Classification</Text>
          <BlurBlock label="Unlock AI physique classification" />
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>AI Notes & Recommendations</Text>
          <BlurBlock label="Unlock AI personalized insights" />
        </View>

        {/* CTA */}
        <TouchableOpacity
          style={styles.ctaOuter}
          onPress={unlock}
          activeOpacity={0.9}
        >
          <LinearGradient
            colors={["#00E6C8", "#9AF65B"]}
            style={styles.ctaInner}
          >
            <Text style={styles.ctaText}>Unlock Full Analysis →</Text>
          </LinearGradient>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

/* --------------------------------------------
   COMPONENTS
-------------------------------------------- */

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metricBox}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
    </View>
  );
}

function BlurBlock({ label }: { label: string }) {
  return (
    <View style={styles.blurBlock}>
      <BlurView intensity={40} tint="dark" style={styles.blurFill}>
        <Text style={styles.blurText}>🔒 {label}</Text>
      </BlurView>
    </View>
  );
}

/* --------------------------------------------
   STYLES
-------------------------------------------- */

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#0B0D0F",
  },
  pageContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  loadingScreen: {
    flex: 1,
    backgroundColor: "#0B0D0F",
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: { marginTop: 12, color: "#fff" },

  headerRow: {
    marginTop: 10,
    marginBottom: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  logoPill: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  logoText: {
    color: "#0B0D0F",
    fontWeight: "800",
    fontSize: 18,
  },
  headerDate: {
    color: "#9AF65B",
    fontSize: 14,
  },

  titleSection: {
    marginBottom: 12,
    alignItems: "center",
  },
  titleCard: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  titleText: {
    color: "#0B0D0F",
    fontWeight: "800",
    fontSize: 20,
  },
  subtitle: {
    marginTop: 8,
    color: "#8DA6A8",
    fontSize: 14,
    textAlign: "center",
  },

  card: {
    backgroundColor: "#111417",
    borderRadius: 18,
    padding: 16,
    marginTop: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#C8FFD6",
    marginBottom: 10,
  },

  scoreCircle: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: "#0E1215",
    borderWidth: 3,
    borderColor: "#00E6C8",
    alignSelf: "center",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  scoreValue: {
    fontSize: 42,
    fontWeight: "800",
    color: "#9AF65B",
  },
  scoreLabel: {
    color: "#8FA0A8",
    fontSize: 14,
    marginTop: 4,
  },

  metricsGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
  },
  metricBox: {
    width: "30%",
    backgroundColor: "#0E1215",
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
  },
  metricLabel: { color: "#7BA8A6", fontSize: 12 },
  metricValue: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 20,
    marginTop: 4,
  },

  blurBlock: {
    height: 120,
    borderRadius: 14,
    overflow: "hidden",
    backgroundColor: "#0E1215",
    marginTop: 8,
  },
  blurFill: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
  },
  blurText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
  },

  ctaOuter: {
    marginTop: 22,
  },
  ctaInner: {
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  ctaText: {
    color: "#0B0D0F",
    fontWeight: "800",
    fontSize: 16,
  },
});
