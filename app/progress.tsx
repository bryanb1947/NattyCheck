import { ScrollView, Text, View } from "react-native";
import Card from "../components/ui/Card";

export default function Progress() {
  return (
    <ScrollView className="flex-1 bg-background px-5 pt-12" contentContainerStyle={{ paddingBottom: 24 }}>
      <Text className="text-text font-display text-2xl mb-2">Progress Tracking</Text>
      <Text className="text-text-muted mb-4">Your physique evolution over time</Text>

      <View className="flex-row gap-3">
        <Card style={{ flex: 1, alignItems: "center" }}>
          <Text className="text-text text-3xl">4</Text>
          <Text className="text-text-muted mt-1">Total Analyses</Text>
        </Card>
        <Card style={{ flex: 1, alignItems: "center" }}>
          <Text className="text-text text-3xl">85</Text>
          <Text className="text-text-muted mt-1">Overall Score</Text>
          <Text className="text-text text-xs mt-1">+10 since Jul</Text>
        </Card>
      </View>

      {/* simple chart placeholder */}
      <Card style={{ marginTop: 12 }}>
        <View className="h-40 bg-surface2 rounded-xl border border-border items-center justify-center">
          <Text className="text-text-muted">[Shoulder-to-Waist Ratio Chart]</Text>
        </View>
        <View className="mt-2 items-end">
          <View className="px-2 py-1 rounded-pill" style={{ backgroundColor: "#B8FF4733" }}>
            <Text className="text-text text-xs">+5% growth</Text>
          </View>
        </View>
      </Card>

      <Card style={{ marginTop: 12 }}>
        <Text className="text-text font-medium mb-2">Recent Changes (Sep → Oct)</Text>
        {[
          ["Quads", "+6%"],
          ["Posture", "+8°"],
          ["Lats", "-2%"],
          ["Overall Score", "+3%"],
        ].map(([k, v]) => (
          <View key={k} className="flex-row justify-between py-2">
            <Text className="text-text">{k}</Text>
            <Text className="text-text">{v}</Text>
          </View>
        ))}
      </Card>

      <Text className="text-text font-medium mt-6 mb-2">Analysis History</Text>
      {["Oct 8, 2025", "Sep 1, 2025", "Aug 1, 2025", "Jul 1, 2025"].map((d) => (
        <Card key={d} style={{ marginBottom: 10 }}>
          <View className="flex-row justify-between items-center">
            <Text className="text-text">{d}</Text>
            <Text className="text-text-muted">Score: 85 · Natty ✅</Text>
          </View>
        </Card>
      ))}
    </ScrollView>
  );
}
