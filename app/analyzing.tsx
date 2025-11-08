import { useEffect, useRef, useState } from "react";
import { View, Text, StyleSheet, Animated, Easing } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useResultsStore } from "../store/useResultsStore";

export default function Analyzing() {
  const [displayProgress, setDisplayProgress] = useState(0);
  const progress = useRef(new Animated.Value(0)).current;
  const { setLast } = useResultsStore();

  useEffect(() => {
    // Animate from 0 to 100 over 6 seconds
    Animated.timing(progress, {
      toValue: 100,
      duration: 6000,
      easing: Easing.linear,
      useNativeDriver: false,
    }).start();

    const interval = setInterval(() => {
      progress.addListener(({ value }) => setDisplayProgress(Math.floor(value)));
    }, 300);

    // Fake completion → navigate to results
    setTimeout(() => {
      setLast({
        date: new Date().toLocaleDateString(),
        upperBody: "88%",
        lowerBody: "82%",
        symmetry: "91%",
        confidence: "94%",
      });
      router.push("/results");
    }, 6500);

    return () => clearInterval(interval);
  }, []);

  const width = progress.interpolate({
    inputRange: [0, 100],
    outputRange: ["0%", "100%"],
  });

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <LinearGradient
          colors={["#00D0FF40", "#B8FF4830"]}
          style={styles.iconCircle}
        >
          <Text style={styles.icon}>⚡</Text>
        </LinearGradient>

        <Text style={styles.title}>Analyzing Your Physique</Text>
        <Text style={styles.subtitle}>
          Detecting proportions and identifying muscle development patterns…
        </Text>

        <View style={styles.progressBarContainer}>
          <Animated.View style={[styles.progressFill, { width }]} />
        </View>

        <Text style={styles.percentText}>{displayProgress}% complete</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0B0D0F", justifyContent: "center", alignItems: "center" },
  card: { width: "85%", backgroundColor: "#111418", borderRadius: 22, padding: 28, alignItems: "center" },
  iconCircle: { width: 90, height: 90, borderRadius: 45, justifyContent: "center", alignItems: "center", marginBottom: 20 },
  icon: { fontSize: 38, color: "#00D0FF" },
  title: { color: "#E8F0FF", fontSize: 18, fontWeight: "700", marginBottom: 6 },
  subtitle: { color: "#94A3B8", textAlign: "center", fontSize: 13, marginBottom: 24 },
  progressBarContainer: { width: "100%", height: 10, backgroundColor: "#1A1D22", borderRadius: 6, overflow: "hidden" },
  progressFill: { height: "100%", backgroundColor: "#00D0FF" },
  percentText: { color: "#94A3B8", marginTop: 12, fontSize: 13 },
});
