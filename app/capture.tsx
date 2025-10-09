import { View, Text, ScrollView } from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import Card from "../components/ui/Card";
import GradientButton from "../components/ui/GradientButton";
import Button from "../components/ui/Button";

const STEPS = ["front", "side", "back"] as const;
type StepKey = (typeof STEPS)[number];

export default function Capture() {
  const { view = "front", step = "1" } = useLocalSearchParams<{ view?: StepKey; step?: string }>();
  const idx = Math.max(0, STEPS.indexOf(view as StepKey));
  const label = STEPS[idx] ?? "front";
  const stepNum = Number(step) || idx + 1;

  const next = () => {
    const nextIdx = idx + 1;
    if (nextIdx >= STEPS.length) {
      // finished → go back to Analyze (or Dashboard)
      router.replace("/analyze");
    } else {
      router.replace(`/capture?view=${STEPS[nextIdx]}&step=${nextIdx + 1}`);
    }
  };

  return (
    <ScrollView className="flex-1 bg-background px-6 pt-16" contentContainerStyle={{ paddingBottom: 24 }}>
      <View className="items-center mb-6">
        <View className="px-3 py-1 rounded-pill" style={{ backgroundColor: "#00E0FF22" }}>
          <Text className="text-text">{label.toUpperCase()} VIEW ({stepNum}/3)</Text>
        </View>
      </View>

      <Card style={{ padding: 20 }}>
        {/* Placeholder capture guide silhouette */}
        <View className="h-72 rounded-2xl border border-border items-center justify-center" style={{ backgroundColor: "#0F3530" }}>
          <Text className="text-text-muted">Align body with guide</Text>
        </View>

        <Text className="text-text-muted mt-3 text-center">
          Face {label === "back" ? "away from" : "toward"} the camera
        </Text>
      </Card>

      <View className="flex-row gap-10 mt-6 justify-center">
        <Button title="Skip" variant="ghost" onPress={next} />
        <GradientButton title="Capture" onPress={next} />
      </View>
    </ScrollView>
  );
}
