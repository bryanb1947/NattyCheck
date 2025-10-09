import { View, Text, ScrollView } from "react-native";
import { router } from "expo-router";
import Card from "../components/ui/Card";
import GradientButton from "../components/ui/GradientButton";

export default function Onboarding() {
  return (
    <ScrollView className="flex-1 bg-background px-6 pt-16" contentContainerStyle={{ paddingBottom: 28 }}>
      <View className="items-center mb-8">
        <View className="w-20 h-20 rounded-full items-center justify-center" style={{ backgroundColor: "#0F3530" }}>
          <Text className="text-text text-2xl">⚡</Text>
        </View>
        <Text className="text-text font-display text-3xl mt-4">NattyCheck</Text>
        <Text className="text-text-muted mt-2 text-center">
          AI-powered physique analysis and personalized training recommendations
        </Text>
      </View>

      <Card>
        <Text className="text-text font-medium mb-3">How it works</Text>
        <Text className="text-text-muted">• Upload or capture 3 photos (front, side, back)</Text>
        <Text className="text-text-muted mt-1">• Get an instant breakdown of strengths & lagging areas</Text>
        <Text className="text-text-muted mt-1">• Receive a suggested split and a playful “natty” check</Text>
      </Card>

      <GradientButton title="Get Started" style={{ marginTop: 16 }} onPress={() => router.push("/analyze")} />
      <Text className="text-text-muted text-center mt-3">I have an account</Text>
    </ScrollView>
  );
}
