import { useState } from "react";
import { View, Text, Image, ScrollView, ActivityIndicator } from "react-native";
import { router } from "expo-router";
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
  const [result, setResult] = useState<any>(null);

  const pickFromLibrary = async (setter: (img: Picked) => void) => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") return;
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.9,
    });
    if (!res.canceled && res.assets?.length) setter({ uri: res.assets[0].uri });
  };

  const analyzeNow = async () => {
    if (!front || !side || !back) return;
    setLoading(true);
    setResult(null);
    setTimeout(() => {
      setLoading(false);
      setResult({
        symmetry: { upper: "good", lower: "needs_work" },
        highlights: ["Great delts", "Lat flare improving"],
        focus: ["Hamstrings", "Rear delts"],
        split: "ULPPL",
        natty_score: 0.82,
      });
    }, 1800);
  };

  return (
    <ScrollView className="flex-1 bg-background px-6 pt-16" contentContainerStyle={{ paddingBottom: 28 }}>
      {/* Header */}
      <View className="items-center mb-6">
        <View className="w-20 h-20 rounded-full items-center justify-center" style={{ backgroundColor: "#0F3530" }}>
          <Text className="text-text text-2xl">📷</Text>
        </View>
        <Text className="text-text font-display text-2xl mt-4">Start New Analysis</Text>
        <Text className="text-text-muted mt-2 text-center">
          Capture three photos (front, side, back) and our AI will analyze your physique.
        </Text>
      </View>

      {/* Tips */}
      <Card style={{ marginBottom: 12 }}>
        <Text className="text-text font-medium mb-3">Tips</Text>
        <Text className="text-text-muted">• Stand in bright, even lighting</Text>
        <Text className="text-text-muted mt-1">• Tight-fitting clothes or shirtless</Text>
        <Text className="text-text-muted mt-1">• Neutral, relaxed posture</Text>
        <Text className="text-text-muted mt-1">• Keep camera at chest height</Text>
      </Card>

      {/* Primary CTA → Capture Guide */}
      <GradientButton title="Begin Photo Capture" onPress={() => router.push("/capture-guide")} />
      <Text className="text-text-muted text-center mt-2">Analysis takes ~30 seconds</Text>

      {/* OR: Pick from library */}
      <Text className="text-text-muted mt-5 mb-2">…or upload from your library</Text>

      {/* Pickers */}
      <View className="flex-row gap-3">
        <Card style={{ flex: 1, alignItems: "center" }}>
          <Text className="text-text font-medium mb-2">Front</Text>
          {front ? (
            <Image source={{ uri: front.uri }} className="w-full h-32 rounded-xl" resizeMode="cover" />
          ) : (
            <View className="w-full h-32 rounded-xl border border-border items-center justify-center">
              <Text className="text-text-muted">No image</Text>
            </View>
          )}
          <Button
            title={front ? "Replace" : "Upload"}
            onPress={() => pickFromLibrary(setFront)}
            style={{ marginTop: 10, width: "100%" }}
          />
        </Card>

        <Card style={{ flex: 1, alignItems: "center" }}>
          <Text className="text-text font-medium mb-2">Side</Text>
          {side ? (
            <Image source={{ uri: side.uri }} className="w-full h-32 rounded-xl" resizeMode="cover" />
          ) : (
            <View className="w-full h-32 rounded-xl border border-border items-center justify-center">
              <Text className="text-text-muted">No image</Text>
            </View>
          )}
          <Button
            title={side ? "Replace" : "Upload"}
            onPress={() => pickFromLibrary(setSide)}
            style={{ marginTop: 10, width: "100%" }}
          />
        </Card>

        <Card style={{ flex: 1, alignItems: "center" }}>
          <Text className="text-text font-medium mb-2">Back</Text>
          {back ? (
            <Image source={{ uri: back.uri }} className="w-full h-32 rounded-xl" resizeMode="cover" />
          ) : (
            <View className="w-full h-32 rounded-xl border border-border items-center justify-center">
              <Text className="text-text-muted">No image</Text>
            </View>
          )}
          <Button
            title={back ? "Replace" : "Upload"}
            onPress={() => pickFromLibrary(setBack)}
            style={{ marginTop: 10, width: "100%" }}
          />
        </Card>
      </View>

      {/* Analyze from library images */}
      <View className="mt-5">
        <Button title="Analyze Selected Photos" onPress={analyzeNow} />
      </View>

      {/* Loading / Result */}
      {loading && (
        <Card style={{ marginTop: 12 }}>
          <View className="flex-row items-center gap-3">
            <ActivityIndicator />
            <Text className="text-text">Analyzing your physique…</Text>
          </View>
        </Card>
      )}

      {result && !loading && (
        <Card style={{ marginTop: 12 }}>
          <Text className="text-text font-medium text-lg">Report (mock)</Text>
          <Text className="text-text-muted mt-1">
            Upper: {result.symmetry.upper} · Lower: {result.symmetry.lower}
          </Text>
          <Text className="text-text mt-3">Highlights: {result.highlights.join(", ")}</Text>
          <Text className="text-text mt-1">Focus: {result.focus.join(", ")}</Text>
          <Text className="text-text mt-1">Suggested Split: {result.split}</Text>
          <Text className="text-text mt-1">Natty Score: {(result.natty_score * 100).toFixed(0)}%</Text>
        </Card>
      )}
    </ScrollView>
  );
}
