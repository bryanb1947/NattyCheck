import { View, Text, ScrollView } from "react-native";
import { Link } from "expo-router";
import Card from "../components/ui/Card";
import GradientButton from "../components/ui/GradientButton";
import Button from "../components/ui/Button";
import MetricBar from "../components/ui/MetricBar";

export default function Dashboard() {
  return (
    <ScrollView className="flex-1 bg-background px-5 pt-12" contentContainerStyle={{ paddingBottom: 28 }}>
      {/* Header */}
      <Text className="text-text font-display text-2xl mb-2">Your Physique Report</Text>
      <Text className="text-text-muted mb-4">Analysis completed • Oct 8, 2025</Text>

      {/* Body Composition Map placeholder */}
      <Card style={{ marginBottom: 16 }}>
        <Text className="text-text font-medium mb-3">Body Composition Map</Text>
        <View className="h-40 rounded-2xl bg-surface2 border border-border items-center justify-center">
          <Text className="text-text-muted">[diagram]</Text>
        </View>
      </Card>

      {/* Upper Body group (examples) */}
      <Text className="text-text font-medium mb-2">Upper Body</Text>
      <MetricBar title="Shoulders" sub="1.45× waist" percent={92} color="#B8FF47" tag={{ label: "balanced" }} />
      <MetricBar title="Chest" sub="1.2× waist" percent={88} color="#00E0FF" tag={{ label: "strong", bg: "#00FFAE33" }} />
      <MetricBar title="Lats" sub="1.25× waist" percent={65} color="#FF5277" tag={{ label: "lagging", bg: "#FF527733"" }} />
      <MetricBar title="Traps" sub="0.85× shoulders" percent={78} color="#B8FF47" tag={{ label: "balanced" }} />

      {/* Lower Body */}
      <Text className="text-text font-medium mt-3 mb-2">Lower Body</Text>
      <MetricBar title="Quads" sub="0.6× height" percent={85} color="#B8FF47" tag={{ label: "balanced" }} />
      <MetricBar title="Hamstrings" sub="0.45× height" percent={68} color="#FF5277" tag={{ label: "lagging", bg: "#FF527733" }} />
      <MetricBar title="Glutes" sub="1.1× waist" percent={90} color="#00E0FF" tag={{ label: "strong", bg: "#00FFAE33" }} />
      <MetricBar title="Calves" sub="0.4× thigh" percent={75} color="#B8FF47" tag={{ label: "balanced" }} />

      {/* Posture & Symmetry */}
      <Card style={{ marginTop: 8 }}>
        <View className="flex-row items-center justify-between">
          <Text className="text-text font-medium">Posture & Symmetry</Text>
          <View className="px-2 py-1 rounded-pill" style={{ backgroundColor: "#B8FF4733" }}>
            <Text className="text-text text-xs">Excellent</Text>
          </View>
        </View>
        <View className="mt-3">
          <View className="flex-row justify-between">
            <Text className="text-text-muted">Spinal Alignment</Text>
            <Text className="text-text text-right">+2° improvement</Text>
          </View>
          <View className="flex-row justify-between mt-1">
            <Text className="text-text-muted">Scapular Balance</Text>
            <Text className="text-text text-right">Symmetrical</Text>
          </View>
        </View>
      </Card>

      {/* Natty Status */}
      <Card style={{ marginTop: 12, borderColor: "#3C5C2A" }}>
        <Text className="text-text-muted text-xs mb-1">Natty Status</Text>
        <View className="flex-row items-center justify-between">
          <Text className="text-text font-medium">NATURAL ✅</Text>
          <View className="bg-lime px-3 py-1 rounded-pill">
            <Text className="text-background">Natty</Text>
          </View>
        </View>
        <Text className="text-text-muted mt-2">Natural progression detected based on realistic proportions</Text>
      </Card>

      {/* Recommended Split */}
      <Card style={{ marginTop: 12 }}>
        <Text className="text-text-muted text-xs">RECOMMENDED TRAINING SPLIT</Text>
        <Text className="text-text font-medium mt-1">Push / Pull / Legs</Text>
        <Text className="text-text-muted mt-1">Posterior emphasis • 6 days/week</Text>
        <View className="mt-3">
          <Button title="View Sample Plan  →" />
        </View>
      </Card>

      {/* Actions */}
      <View className="flex-row gap-3 mt-4">
        <Button title="Retake" style={{ flex: 1 }} />
        <Button title="Share" style={{ flex: 1 }} />
        <Link href="/profile" asChild>
          <GradientButton title="Upgrade" />
        </Link>
      </View>
    </ScrollView>
  );
}
