import React from "react";
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";

export default function Results() {
  const params = useLocalSearchParams<{ report?: string }>();

  let report: any = {};
  try {
    if (params.report) report = JSON.parse(decodeURIComponent(params.report));
  } catch (e) {
    console.warn("Failed to parse report:", e);
  }

  const score = Number(report?.score ?? 0);
  const upperBody = Number(report?.upperBody ?? 0);
  const lowerBody = Number(report?.lowerBody ?? 0);
  const symmetry = Number(report?.symmetry ?? 0);
  const confidence = Number(report?.confidence ?? 0);
  const natty: boolean = !!report?.natty;
  const breakdown: Array<{ name: string; tag?: string; value?: number }> =
    Array.isArray(report?.breakdown) ? report.breakdown : [];

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView contentContainerStyle={s.content}>
        <View style={s.card}>
          {/* Score */}
          <View style={s.circle}>
            <Text style={s.score}>{isNaN(score) ? 0 : score}</Text>
            <Text style={s.scoreLabel}>Score</Text>
          </View>

          <Text style={s.title}>Physique Report</Text>
          <Text style={s.sub}>AI Analysis Complete</Text>

          {/* Top metrics */}
          <View style={s.metricsRow}>
            <Metric label="Upper Body" value={`${isNaN(upperBody) ? 0 : upperBody}%`} />
            <Metric label="Lower Body" value={`${isNaN(lowerBody) ? 0 : lowerBody}%`} />
          </View>
          <View style={s.metricsRow}>
            <Metric label="Symmetry" value={`${isNaN(symmetry) ? 0 : symmetry}%`} />
            <Metric label="Confidence" value={`${isNaN(confidence) ? 0 : confidence}%`} />
          </View>

          {/* Natty badge */}
          <View style={s.nattyRow}>
            <Text style={s.nattyLabel}>Natty Status</Text>
            <View
              style={[
                s.nattyBadge,
                { backgroundColor: natty ? "#B8FF47" : "#FF5A5A" },
              ]}
            >
              <Text style={s.nattyText}>{natty ? "NATURAL" : "ENHANCED"}</Text>
            </View>
          </View>

          {/* Breakdown */}
          {breakdown.length > 0 && (
            <View style={s.breakdownCard}>
              <Text style={s.breakdownTitle}>Muscle Breakdown</Text>
              {breakdown.map((b, i) => (
                <View key={`${b.name}-${i}`} style={s.breakdownRow}>
                  <Text style={s.breakdownName}>{b.name}</Text>
                  <Text style={s.breakdownTag}>
                    {(b.tag || "").toString().toUpperCase()}
                  </Text>
                  <Text style={s.breakdownValue}>
                    {typeof b.value === "number" ? `${b.value}%` : "-%"}
                  </Text>
                </View>
              ))}
            </View>
          )}

          {/* Actions */}
          <TouchableOpacity
            onPress={() => router.replace("/(tabs)")}
            style={s.btnPrimary}
            activeOpacity={0.9}
          >
            <Text style={s.btnPrimaryText}>Back to Dashboard</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.replace("/_capture?view=front")}
            style={s.btnSecondary}
            activeOpacity={0.9}
          >
            <Text style={s.btnSecondaryText}>Retake</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <View style={s.metric}>
      <Text style={s.metricLabel}>{label}</Text>
      <Text style={s.metricValue}>{value}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#0F0F0F" },
  content: { padding: 20, alignItems: "center", paddingBottom: 60 },
  card: {
    width: "100%",
    maxWidth: 520,
    borderRadius: 20,
    backgroundColor: "#111517",
    padding: 22,
    borderWidth: 1,
    borderColor: "#1E2A2E",
  },

  circle: {
    alignSelf: "center",
    width: 150,
    height: 150,
    borderRadius: 75,
    borderWidth: 6,
    borderColor: "#00FFE0",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  score: { color: "#FFF", fontSize: 48, fontWeight: "900" },
  scoreLabel: { color: "#9AA8AD", marginTop: 4 },

  title: { color: "#FFF", fontSize: 22, fontWeight: "800", textAlign: "center", marginTop: 6 },
  sub: { color: "#9AA8AD", textAlign: "center", marginBottom: 16 },

  metricsRow: { flexDirection: "row", gap: 10, marginBottom: 10 },
  metric: {
    flex: 1,
    backgroundColor: "#161C1F",
    borderRadius: 12,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: "#253238",
    alignItems: "center",
  },
  metricLabel: { color: "#A6B2B8", fontSize: 13 },
  metricValue: { color: "#FFF", fontSize: 18, fontWeight: "800" },

  nattyRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 16,
    marginBottom: 12,
  },
  nattyLabel: { color: "#DDE4E7", fontWeight: "700" },
  nattyBadge: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
  nattyText: { color: "#0F0F0F", fontWeight: "800" },

  breakdownCard: {
    marginTop: 8,
    backgroundColor: "#11181B",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#1E2A2E",
    paddingVertical: 10,
  },
  breakdownTitle: {
    color: "#FFFFFF",
    fontWeight: "800",
    fontSize: 16,
    paddingHorizontal: 12,
    paddingBottom: 6,
  },
  breakdownRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: "#1A2326",
  },
  breakdownName: { color: "#DDE4E7", flex: 1 },
  breakdownTag: { color: "#8FA3A8", width: 100, textAlign: "right" },
  breakdownValue: { color: "#B8FF47", fontWeight: "800", width: 60, textAlign: "right" },

  btnPrimary: {
    marginTop: 18,
    height: 54,
    borderRadius: 14,
    backgroundColor: "#B8FF47",
    alignItems: "center",
    justifyContent: "center",
  },
  btnPrimaryText: { color: "#0A0A0A", fontWeight: "900", fontSize: 16 },

  btnSecondary: {
    marginTop: 10,
    height: 54,
    borderRadius: 14,
    backgroundColor: "#1C1C1C",
    borderWidth: 1,
    borderColor: "#2A2A2A",
    alignItems: "center",
    justifyContent: "center",
  },
  btnSecondaryText: { color: "#FFFFFF", fontWeight: "800", fontSize: 16 },
});
