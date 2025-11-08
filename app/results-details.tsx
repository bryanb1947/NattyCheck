import React from "react";
import { SafeAreaView, ScrollView, View, Text, StyleSheet } from "react-native";
import { useLocalSearchParams } from "expo-router";

export default function ResultsDetails() {
  const { report } = useLocalSearchParams();
  let parsed: any = {};

  try {
    parsed = report ? JSON.parse(report as string) : {};
  } catch {
    parsed = {};
  }

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView contentContainerStyle={s.content}>
        <Text style={s.title}>Detailed Analysis</Text>
        <Text style={s.sub}>
          This screen shows the full breakdown by region, charts, posture metrics, and training suggestions.
        </Text>

        {parsed.details ? (
          Object.entries(parsed.details).map(([region, info]: any) => (
            <View key={region} style={s.card}>
              <Text style={s.region}>{region.toUpperCase()}</Text>
              <Text style={s.text}>{info.description}</Text>
              {info.suggestion && (
                <Text style={[s.text, s.suggestion]}>
                  Recommendation: {info.suggestion}
                </Text>
              )}
            </View>
          ))
        ) : (
          <View style={s.card}>
            <Text style={s.text}>No detailed data available yet.</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#0F0F0F" },
  content: { padding: 20, paddingBottom: 40 },
  title: { color: "#fff", fontSize: 26, fontWeight: "900" },
  sub: { color: "#9CA9AD", marginTop: 6, marginBottom: 16 },

  card: {
    backgroundColor: "#141818",
    borderColor: "#1E2A2B",
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  region: { color: "#B8FF47", fontWeight: "800", marginBottom: 6, fontSize: 16 },
  text: { color: "#DDE4E7", lineHeight: 20 },
  suggestion: { color: "#B8FF47", marginTop: 6 },
});
