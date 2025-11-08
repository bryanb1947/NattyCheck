import React, { useEffect, useState } from "react";
import { SafeAreaView, View, Text, StyleSheet } from "react-native";

export default function Analyzing() {
  const [pct, setPct] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setPct((prev) => (prev < 100 ? prev + Math.floor(Math.random() * 8) : 100));
    }, 400);
    return () => clearInterval(interval);
  }, []);

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.card}>
        <View style={s.circle}>
          <Text style={s.check}>✓</Text>
        </View>
        <Text style={s.title}>Analyzing Your Physique</Text>
        <Text style={s.sub}>Measuring symmetry & ratios…</Text>
        <View style={s.barWrap}>
          <View style={[s.barFill, { width: `${pct}%` }]} />
        </View>
        <Text style={s.pct}>{pct}% complete</Text>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#0F0F0F", alignItems: "center", justifyContent: "center" },
  card: { width: "88%", backgroundColor: "#101416", borderRadius: 18, padding: 24, borderWidth: 1, borderColor: "#1E2A2E", alignItems: "center" },
  circle: { width: 92, height: 92, borderRadius: 46, borderWidth: 5, borderColor: "#17F0E5", alignItems: "center", justifyContent: "center", marginBottom: 14 },
  check: { color: "#17F0E5", fontSize: 42, fontWeight: "900" },
  title: { color: "#E9F2F5", fontSize: 20, fontWeight: "900", marginTop: 2 },
  sub: { color: "#A4B5BB", marginTop: 4, marginBottom: 18 },
  barWrap: { width: "100%", height: 8, backgroundColor: "#142024", borderRadius: 999 },
  barFill: { height: "100%", backgroundColor: "#17F0E5", borderRadius: 999 },
  pct: { color: "#9EB2B8", marginTop: 10 },
});
