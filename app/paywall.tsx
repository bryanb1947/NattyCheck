import React from "react";
import { SafeAreaView, View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import { useAuthStore } from "../store/useAuthStore";

export default function Paywall() {
  const { from } = useLocalSearchParams<{ from?: string }>();
  const { isPro, hasActiveTrial, startTrial, upgradeToPro } = useAuthStore();

  const onStartTrial = async () => {
    await startTrial();
    if (from) router.replace(from as any); else router.replace("/(tabs)/index");
  };

  const onUpgrade = async () => {
    await upgradeToPro();
    if (from) router.replace(from as any); else router.replace("/(tabs)/index");
  };

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.wrap}>
        <Text style={s.h1}>Unlock Full Analysis</Text>
        <Text style={s.sub}>Detailed breakdowns, progress tracking, and unlimited scans.</Text>

        <View style={s.card}>
          <View style={s.row}><Text style={s.check}>✓</Text><Text style={s.item}>Detailed muscle breakdown</Text></View>
          <View style={s.row}><Text style={s.check}>✓</Text><Text style={s.item}>Custom workout plans</Text></View>
          <View style={s.row}><Text style={s.check}>✓</Text><Text style={s.item}>Progress tracking</Text></View>
          <View style={s.row}><Text style={s.check}>✓</Text><Text style={s.item}>Unlimited scans</Text></View>
        </View>

        {!isPro && !hasActiveTrial ? (
          <>
            <TouchableOpacity style={s.cta}>
              <LinearGradient colors={["#00FFE0", "#B8FF47"]} start={{x:0,y:0.5}} end={{x:1,y:0.5}} style={s.ctaFill}>
                <Text style={s.ctaText} onPress={onStartTrial}>Start Free Trial</Text>
              </LinearGradient>
            </TouchableOpacity>
            <TouchableOpacity style={s.secondary} onPress={onUpgrade}>
              <Text style={s.secondaryText}>Upgrade $59.99 / year</Text>
            </TouchableOpacity>
          </>
        ) : (
          <TouchableOpacity style={s.secondary} onPress={() => router.replace("/(tabs)/index")}>
            <Text style={s.secondaryText}>You’re already unlocked — Back to Dashboard</Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#0F0F0F" },
  wrap: { flex: 1, padding: 20 },
  h1: { color: "#fff", fontWeight: "800", fontSize: 22 },
  sub: { color: "#9BA7AA", marginTop: 6 },
  card: { backgroundColor: "#151515", borderRadius: 16, borderWidth: 1, borderColor: "#243033", padding: 16, marginTop: 18, gap: 10 },
  row: { flexDirection: "row", gap: 10, alignItems: "center" },
  check: { color: "#B8FF47", fontWeight: "900" },
  item: { color: "#E5ECEF", fontWeight: "600" },
  cta: { marginTop: 18, borderRadius: 16, overflow: "hidden" },
  ctaFill: { height: 54, alignItems: "center", justifyContent: "center" },
  ctaText: { color: "#0B0B0B", fontWeight: "800" },
  secondary: { marginTop: 12, height: 50, borderRadius: 14, borderWidth: 1, borderColor: "#243033", alignItems: "center", justifyContent: "center" },
  secondaryText: { color: "#DDE4E7", fontWeight: "700" },
});
