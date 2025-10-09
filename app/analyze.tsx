import { useState } from "react";
import { View, Text, Image, ActivityIndicator, ScrollView } from "react-native";
import * as ImagePicker from "expo-image-picker";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import GradientButton from "../components/ui/GradientButton";

type Picked = { uri: string } | null;

export default function Analyze() {
  const [front, setFront] = useState<Picked>(null);
  const [side, setSide] = useState<Picked>(null);
  const [back, setBack] = useState<Picked>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const pick = async (setter: (img: Picked) => void) => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") return;
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.9,
    });
    if (!res.canceled && res.assets?.length) setter({ uri: res.assets[0].uri });
  };

  const analyze = async () => {
    if (!front || !side || !back) return;
    setLoading(true);
    setDone(false);
    setTimeout(() => {
      setLoading(false);
      setDone(true);
    }, 2000);
  };

  return (
    <ScrollView className="flex-1 bg-background px-5 pt-12">
      <View className="items-center mb-6">
        <View className="w-20 h-20 rounded-full items-center justify-center" style={{ backgroundColor: "#0F3530" }}>
          <Text className="text-text">📷</Text>
        </View>
        <Text className="text-text font-display text-xl mt-4">Start New Analysis</Text>
        <Text className="text-text-muted mt-2 text-center">
          Capture three photos (front, side, back) and our AI will analyze your physique.
        </Text>
      </View>

      {/* Tips list */}
      <Card>
        <Text className="text-text font-medium mb-3">Tips</Text>
        <Text className="text-text-muted">• Stand in bright, even lighting</Text>
        <Text className="text-text-muted mt-1">• Tight-fitting clothes or shirtless</Text>
        <Text className="text-text-muted mt-1">• Neutral, relaxed posture</Text>
        <Text className="text-text-muted mt-1">• Keep camera at chest height</Text>
      </Card>

      {/* Pickers */}
      <View className="flex-row gap-3 mt-4">
        {[{ label: "Front", v: front, set: setFront }, { label: "Side", v: side, set: setSide }, { label: "Back", v: back, set: setBack }].map(
          ({ label, v, set }) => (
            <Card key={label} style={{ flex: 1, alignItems: "center" }}>
              <Text className="text-text font-medium mb-2">{label}</Text>
              {v ? (
                <Image source={{ uri: v.uri }} className="w-full h-32 rounded-xl" resizeMode="cover" />
              ) : (
                <View className="w-full h-32 rounded-xl border border-border items-center justify-center">
                  <Text className="text-text-muted">No image</Text>
                </View>
              )}
              <Button title={v ? "Replace" : "Upload"} onPress={() => pick(set)} style={{ marginTop: 10, width: "100%" }} />
            </Card>
          )
        )}
      </View>

      {/* Analyze CTA */}
      <View className="mt-5">
        <GradientButton title="Begin Photo Capture" onPress={analyze} />
        <Text className="text-text-muted text-center mt-2">Analysis takes ~30 seconds</Text>
      </View>

      {/* Loading / Done */}
      {loading && (
        <Card style={{ marginTop: 12 }}>
          <View className="flex-row items-center gap-3">
            <ActivityIndicator />
            <Text className="text-text">Analyzing your physique… 67% complete</Text>
          </View>
        </Card>
      )}
      {done && !loading && (
        <Card style={{ marginTop: 12 }}>
          <Text className="text-text">Done! View results on Dashboard.</Text>
        </Card>
      )}
    </ScrollView>
  );
}
