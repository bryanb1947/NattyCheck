import React from "react";
import { SafeAreaView, View, Text, ScrollView, StyleSheet, Platform } from "react-native";
import MetricBar from "../../components/ui/MetricBar";

export default function Dashboard() {
  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        {/* Header */}
        <View style={{ marginBottom: 16 }}>
          <Text style={styles.h1}>NattyCheck</Text>
          <Text style={styles.muted}>Your Physique Report</Text>
        </View>

        {/* Body Composition Map (placeholder card) */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Your Physique Report</Text>
          <Text style={[styles.muted, { marginBottom: 12 }]}>Analysis completed • Oct 8, 2025</Text>
          <View style={styles.mapPlaceholder}>
            <Text style={styles.muted}>[Body Composition Map]</Text>
          </View>
        </View>

        {/* Upper Body */}
        <Text style={[styles.sectionTitle, { marginTop: 16, marginBottom: 8 }]}>Upper Body</Text>
        <MetricBar title="Shoulders" sub="1.45× waist" percent={92} color="#B8FF47" tag={{ label: "balanced" }} />
        <MetricBar title="Chest" sub="1.2× waist" percent={88} color="#00E0FF" tag={{ label: "strong", bg: "rgba(0,255,174,0.2)" }} />
        <MetricBar title="Lats" sub="1.25× waist" percent={65} color="#FF5277" tag={{ label: "lagging", bg: "rgba(255,82,119,0.2)" }} />
        <MetricBar title="Traps" sub="0.85× shoulders" percent={78} color="#B8FF47" tag={{ label: "balanced" }} />

        {/* Lower Body */}
        <Text style={[styles.sectionTitle, { marginTop: 8, marginBottom: 8 }]}>Lower Body</Text>
        <MetricBar title="Quads" sub="0.6× height" percent={85} color="#B8FF47" tag={{ label: "balanced" }} />
        <MetricBar title="Hamstrings" sub="0.45× height" percent={68} color="#FF5277" tag={{ label: "lagging", bg: "rgba(255,82,119,0.2)" }} />
        <MetricBar title="Glutes" sub="1.1× waist" percent={90} color="#00E0FF" tag={{ label: "strong", bg: "rgba(0,255,174,0.2)" }} />
        <MetricBar title="Calves" sub="0.4× thigh" percent={75} color="#B8FF47" tag={{ label: "balanced" }} />

        {/* Posture & Symmetry */}
        <View style={[styles.card, { marginTop: 8 }]}>
          <View style={styles.rowBetween}>
            <Text style={styles.cardTitle}>Posture & Symmetry</Text>
            <View style={[styles.pill, { backgroundColor: "rgba(184,255,71,0.2)" }]}>
              <Text style={styles.pillText}>Excellent</Text>
            </View>
          </View>

          <View style={[styles.rowBetween, { marginTop: 12 }]}>
            <Text style={styles.muted}>Spinal Alignment</Text>
            <Text style={[styles.text, { color: "#B8FF47" }]}>+2° improvement</Text>
          </View>
          <View style={[styles.rowBetween, { marginTop: 6 }]}>
            <Text style={styles.muted}>Scapular Balance</Text>
            <Text style={styles.text}>Symmetrical</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#0F0F0F", paddingTop: Platform.OS === "ios" ? 8 : 0 },
  container: { paddingHorizontal: 20, paddingBottom: 28 },
  h1: { color: "#FFFFFF", fontSize: 28, fontWeight: "700" },
  text: { color: "#FFFFFF" },
  muted: { color: "#B3B3B3" },
  sectionTitle: { color: "#FFFFFF", fontSize: 16, fontWeight: "600" },
  card: {
    backgroundColor: "#151515",
    borderColor: "#2A2A2A",
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOpacity: 0.35,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  cardTitle: { color: "#FFFFFF", fontSize: 18, fontWeight: "700" },
  rowBetween: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  mapPlaceholder: {
    height: 160,
    borderRadius: 16,
    backgroundColor: "#1A1A1A",
    borderWidth: 1,
    borderColor: "#2A2A2A",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  pill: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 },
  pillText: { color: "#FFFFFF", fontSize: 12, fontWeight: "600" },
});
