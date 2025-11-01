import React, { useEffect, useRef, useState } from "react";
import { SafeAreaView, View, Text, StyleSheet, Animated, Alert } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, router } from "expo-router";
import { Api } from "../lib/api";

type Params = { frontUri?: string; sideUri?: string; backUri?: string };

export default function Analyzing() {
  const { frontUri, sideUri, backUri } = useLocalSearchParams<Params>();
  const progressAnim = useRef(new Animated.Value(0)).current;
  const [started, setStarted] = useState(false);

  // Smooth fake progress while uploading/analyzing
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(progressAnim, { toValue: 0.7, duration: 2000, useNativeDriver: false }),
        Animated.timing(progressAnim, { toValue: 0.85, duration: 1800, useNativeDriver: false }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [progressAnim]);

  useEffect(() => {
    if (started) return;
    if (!frontUri || !sideUri || !backUri) {
      Alert.alert("Missing photos", "Please capture front, side, and back first.");
      router.replace("/(tabs)/analyze");
      return;
    }
    setStarted(true);

    (async () => {
      try {
        const result = await Api.analyzeWithFiles(frontUri, sideUri, backUri);
        Animated.timing(progressAnim, { toValue: 1, duration: 500, useNativeDriver: false }).start(() => {
          router.replace({ pathname: "/results", params: { payload: JSON.stringify(result) } });
        });
      } catch (e: any) {
        Alert.alert("Analysis error", e?.message ?? "Please try again.");
        router.replace("/(tabs)/analyze");
      }
    })();
  }, [started, frontUri, sideUri, backUri, progressAnim]);

  const pct = Math.round(((progressAnim as any).__getValue?.() ?? 0) * 100);

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.card}>
        <View style={s.iconWrap}>
          <LinearGradient colors={["#12E1D6", "#0EA371"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.iconRing}>
            <View style={s.iconInner}><Text style={s.iconBolt}>⚡️</Text></View>
          </LinearGradient>
        </View>
        <Text style={s.h1}>Analyzing Your Physique</Text>
        <Text style={s.sub}>Detecting proportions, symmetry, and posture…</Text>
        <View style={s.barBg}>
          <Animated.View style={[s.barFill, {
            width: progressAnim.interpolate({ inputRange: [0, 1], outputRange: ["0%", "100%"] })
          }]} />
        </View>
        <Text style={s.pct}>{pct}% complete</Text>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#0F0F0F", padding: 16 },
  card: { flex: 1, borderRadius: 20, borderWidth: 1, borderColor: "#173236", backgroundColor: "#0B0E0F", padding: 20, alignItems: "center", justifyContent: "center" },
  iconWrap: { marginBottom: 18 },
  iconRing: { width: 110, height: 110, borderRadius: 999, padding: 4, alignItems: "center", justifyContent: "center" },
  iconInner: { width: 102, height: 102, borderRadius: 999, backgroundColor: "#0F1719", alignItems: "center", justifyContent: "center" },
  iconBolt: { fontSize: 28, color: "#A8FFE7" },
  h1: { color: "#fff", fontSize: 20, fontWeight: "800", textAlign: "center" },
  sub: { color: "#9DB1B5", textAlign: "center", marginTop: 6 },
  barBg: { width: "100%", height: 8, backgroundColor: "#1A2326", borderRadius: 8, overflow: "hidden", marginTop: 16 },
  barFill: { height: 8, backgroundColor: "#1DE3D2" },
  pct: { color: "#8FA3A8", marginTop: 8 },
});
