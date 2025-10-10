import React from "react";
import { SafeAreaView, View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";

export default function Onboarding() {
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        {/* Card */}
        <View style={styles.card}>
          {/* Brand icon */}
          <LinearGradient colors={["#00FFE0", "#B8FF47"]} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={styles.logoCircle}>
            <Text style={styles.logoBolt}>⚡</Text>
          </LinearGradient>

          <Text style={styles.title}>NattyCheck</Text>
          <Text style={styles.subtitle}>
            AI-powered physique analysis and personalized training recommendations
          </Text>

          {/* Get Started */}
          <TouchableOpacity activeOpacity={0.9} onPress={() => router.push("/signup")} style={{ width: "100%", marginTop: 20 }}>
            <LinearGradient
              colors={["#00FFE0", "#B8FF47"]}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              style={styles.cta}
            >
              <Text style={styles.ctaText}>Get Started</Text>
            </LinearGradient>
          </TouchableOpacity>

          {/* Login link */}
          <TouchableOpacity onPress={() => router.push("/login")} style={{ marginTop: 12 }}>
            <Text style={styles.linkText}>I have an account</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#0F0F0F" },
  container: { flex: 1, paddingHorizontal: 20, justifyContent: "center" },
  card: {
    backgroundColor: "#151515",
    borderColor: "#2A2A2A",
    borderWidth: 1,
    borderRadius: 20,
    padding: 24,
    shadowColor: "#000",
    shadowOpacity: 0.35,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
  },
  logoCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    marginBottom: 18,
  },
  logoBolt: { fontSize: 28, color: "#0F0F0F", fontWeight: "800" },
  title: { color: "#fff", fontSize: 24, fontWeight: "700", textAlign: "center" },
  subtitle: { color: "#B3B3B3", marginTop: 8, textAlign: "center", lineHeight: 20 },
  cta: { borderRadius: 999, paddingVertical: 14, alignItems: "center", justifyContent: "center" },
  ctaText: { color: "#0F0F0F", fontWeight: "700", fontSize: 16 },
  linkText: { color: "#FFFFFF", textAlign: "center", fontWeight: "600" },
});
