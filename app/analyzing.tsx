import React, { useEffect, useRef, useState } from "react";
import { SafeAreaView, View, Text, StyleSheet, Animated } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Api } from "../lib/api";

export default function Analyzing() {
  const { jobId } = useLocalSearchParams<{ jobId?: string }>();
  const [percent, setPercent] = useState(0);
  const progressAnim = useRef(new Animated.Value(0)).current;

  // Fake visual progress bar (independent of server state)
  useEffect(() => {
    const id = setInterval(() => {
      setPercent((p) => {
        const next = Math.min(95, p + 2); // stop at 95% until server says done
        Animated.timing(progressAnim, { toValue: next, duration: 300, useNativeDriver: false }).start();
        return next;
      });
    }, 400);
    return () => clearInterval(id);
  }, [progressAnim]);

  // Poll the job until done
  useEffect(() => {
    if (!jobId) return;
    let stop = false;

    const tick = async () => {
      try {
        const job = await Api.job(jobId);
        if (job.status === "done") {
          Animated.timing(progressAnim, { toValue: 100, duration: 300, useNativeDriver: false }).start(() => {
            router.replace({ pathname: "/results", params: { jobId } });
          });
          return;
        }
        if (job.status === "failed" || job.status === "needs_retakes") {
          router.replace({ pathname: "/(tabs)/analyze" });
          return;
        }
      } catch {
        // ignore and keep polling a bit
      }
      if (!stop) setTimeout(tick, 1000);
    };

    tick();
    return () => { stop = true; };
  }, [jobId, progressAnim]);

  const barWidth = progressAnim.interpolate({ inputRange: [0, 100], outputRange: ["0%", "100%"] });

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.wrap}>
        <View style={styles.card}>
          <Text style={styles.title}>Analyzing Your Physique</Text>
          <Text style={styles.subtitle}>Detecting proportions and posture…</Text>
          <View style={styles.progressTrack}><Animated.View style={[styles.progressFill, { width: barWidth }]} /></View>
          <Text style={styles.percentText}>{Math.round(percent)}%</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#0F0F0F" },
  wrap: { flex: 1, padding: 20, alignItems: "center", justifyContent: "center" },
  card: {
    width: "100%", maxWidth: 520, backgroundColor: "#151515", borderColor: "#2A2A2A",
    borderWidth: 1, borderRadius: 24, paddingVertical: 28, paddingHorizontal: 20, alignItems: "center"
  },
  title: { color: "#FFFFFF", fontSize: 18, fontWeight: "700" },
  subtitle: { color: "#B3B3B3", textAlign: "center", marginTop: 8 },
  progressTrack: { width: "100%", height: 10, backgroundColor: "#223034", borderRadius: 999, overflow: "hidden", marginTop: 14 },
  progressFill: { height: "100%", backgroundColor: "#12E1D6" },
  percentText: { color: "#B3B3B3", marginTop: 8 },
});
