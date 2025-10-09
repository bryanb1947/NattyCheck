import { View, Text, ScrollView } from "react-native";
import { router } from "expo-router";
import Card from "../components/ui/Card";
import GradientButton from "../components/ui/GradientButton";

export default function CaptureGuide() {
  return (
    <ScrollView className="flex-1 bg-background px-6 pt-16" contentContainerStyle={{ paddingBottom: 24 }}>
      <Text className="text-text font-display text-2xl mb-2">How to Capture</Text>
      <Text className="text-text-muted mb-4">Follow these for best analysis accuracy.</Text>

      <Card>
        <View className="flex-row items-start mb-3">
          <Text className="text-text font-medium mr-3">1</Text>
          <View>
            <Text className="text-text font-medium">Good Lighting</Text>
            <Text className="text-text-muted">Stand in bright, even lighting</Text>
          </View>
        </View>

        <View className="flex-row items-start mb-3">
          <Text className="text-text font-medium mr-3">2</Text>
          <View>
            <Text className="text-text font-medium">Tight-Fitting Clothes</Text>
            <Text className="text-text-muted">Or shirtless for best results</Text>
          </View>
        </View>

        <View className="flex-row items-start mb-3">
          <Text className="text-text font-medium mr-3">3</Text>
          <View>
            <Text className="text-text font-medium">Neutral Pose</Text>
            <Text className="text-text-muted">Stand relaxed, arms at sides</Text>
          </View>
        </View>

        <View className="flex-row items-start">
          <Text className="text-text font-medium mr-3">4</Text>
          <View>
            <Text className="text-text font-medium">Three Angles</Text>
            <Text className="text-text-muted">Front, side, and back views</Text>
          </View>
        </View>
      </Card>

      <GradientButton
        title="Continue"
        style={{ marginTop: 16 }}
        onPress={() => router.push("/capture?view=front&step=1")}
      />
    </ScrollView>
  );
}
