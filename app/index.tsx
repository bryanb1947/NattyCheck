import React from "react";
import { View, Text, Pressable, SafeAreaView, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";

const BG = "#0D0F10";
const GLOW: [string, string] = ["#2AF5FF", "#B9FF39"];

export default function WelcomeScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.wrap}>
        <Text style={styles.logo}>NattyCheck</Text>
        <Text style={styles.sub}>AI Physique Analysis & Training</Text>

        <Pressable onPress={() => router.push("/onboarding")}>
          <LinearGradient colors={GLOW} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.cta}>
            <Text style={styles.ctaTxt}>Get Started</Text>
          </LinearGradient>
        </Pressable>

        <Pressable onPress={() => router.push("/login")}>
          <View style={styles.loginBtn}>
            <Text style={styles.loginTxt}>Log In</Text>
          </View>
        </Pressable>

        <Text style={styles.footer}>Analyze. Improve. Stay Natty. 🧬</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BG },
  wrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  logo: {
    color: "#B9FF39",
    fontSize: 42,
    fontWeight: "900",
    marginBottom: 12,
  },
  sub: { color: "#9AA3AA", fontSize: 16, marginBottom: 40 },
  cta: { borderRadius: 16, paddingVertical: 16, paddingHorizontal: 80 },
  ctaTxt: { color: "#0D0F10", fontSize: 18, fontWeight: "800" },
  loginBtn: {
    borderWidth: 1,
    borderColor: "#2AF5FF",
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 90,
    marginTop: 16,
  },
  loginTxt: { color: "#E9F0F2", fontWeight: "700" },
  footer: { color: "#6C757D", position: "absolute", bottom: 30, fontSize: 14 },
});
