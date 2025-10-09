import { View, Text, ScrollView, StyleSheet } from "react-native";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import MetricBar from "../components/ui/MetricBar";

export default function Dashboard() {
  return (
    <ScrollView
      className="flex-1 bg-background px-5 pt-16"
      contentContainerStyle={styles.fallbackContainer}
    >
      {/* Header */}
      <View className="mb-6">
        <Text className="text-text font-display text-3xl" style={styles.fallbackTitle}>
          NattyCheck
        </Text>
        <Text className="text-text-muted mt-1" style={styles.fallbackMuted}>
          Your Physique Report
        </Text>
      </View>

      {/* Upper Body */}
      <Card style={{ marginBottom: 16 }}>
        <Text className="text-text font-semibold text-lg mb-2" style={styles.fallbackText}>
          Your Physique Report
        </Text>
        <Text className="text-text-muted mb-4" style={styles.fallbackMuted}>
          Analysis completed • Oct 8, 2025
        </Text>

        <MetricBar title="Shoulders" sub="1.45× waist" percent={92} color="#B8FF47" tag={{ label: "balanced" }} />
        <MetricBar title="Chest" sub="1.2× waist" percent={88} color="#00E0FF" tag={{ label: "strong", bg: "#00FFAE33" }} />
        <MetricBar title="Lats" sub="1.25× waist" percent={65} color="#FF5277" tag={{ label: "lagging", bg: "#FF527733" }} />
        <MetricBar title="Traps" sub="0.85× shoulders" percent={78} color="#B8FF47" tag={{ label: "balanced" }} />

        {/* Lower Body */}
        <View className="mt-6">
          <MetricBar title="Quads" sub="0.6× height" percent={85} color="#B8FF47" tag={{ label: "balanced" }} />
          <MetricBar title="Hamstrings" sub="0.45× height" percent={68} color="#FF5277" tag={{ label: "lagging", bg: "#FF527733" }} />
          <MetricBar title="Glutes" sub="1.1× waist" percent={90} color="#00E0FF" tag={{ label: "strong", bg: "#00FFAE33" }} />
          <MetricBar title="Calves" sub="0.4× thigh" percent={75} color="#B8FF47" tag={{ label: "balanced" }} />
        </View>
      </Card>

      {/* Posture & Symmetry */}
      <Card style={{ marginBottom: 16 }}>
        <View className="flex-row justify-between mb-2">
          <Text className="text-text font-semibold text-lg" style={styles.fallbackText}>Posture & Symmetry</Text>
          <Text style={[styles.fallbackText, { color: "#B8FF47" }]}>Excellent</Text>
        </View>
        <View className="flex-row justify-between">
          <Text className="text-text-muted" style={styles.fallbackMuted}>Spinal Alignment</Text>
          <Text style={[styles.fallbackText, { color: "#B8FF47" }]}>+2° improvement</Text>
        </View>
        <View className="flex-row justify-between mt-1">
          <Text className="text-text-muted" style={styles.fallbackMuted}>Scapular Balance</Text>
          <Text className="text-text" style={styles.fallbackText}>Symmetrical</Text>
        </View>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  fallbackContainer: { paddingBottom: 28, backgroundColor: "#0F0F0F" }, // works even if tailwind off
  fallbackTitle: { color: "#FFFFFF" },
  fallbackText: { color: "#FFFFFF" },
  fallbackMuted: { color: "#B3B3B3" },
});
