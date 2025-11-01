import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { router } from "expo-router";

export default function Onboarding() {
  return (
    <View style={s.wrap}>
      <View style={s.card}>
        <Text style={s.logo}>⚡️</Text>
        <Text style={s.title}>NattyCheck</Text>
        <Text style={s.sub}>AI-powered physique analysis and personalized training recommendations</Text>

        <TouchableOpacity style={s.cta} onPress={() => router.replace("/(tabs)/analyze")}>
          <Text style={s.ctaText}>Get Started</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.push("/login")} style={s.linkBtn}>
          <Text style={s.link}>I have an account</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: "#0F0F0F", alignItems: "center", justifyContent: "center", padding: 20 },
  card: { width: "100%", borderRadius: 16, backgroundColor: "#121618", padding: 24, borderColor: "#1f2a2e", borderWidth: 1 },
  logo: { fontSize: 42, textAlign: "center", marginBottom: 12 },
  title: { color: "white", fontSize: 26, fontWeight: "800", textAlign: "center" },
  sub: { color: "#95A2A7", textAlign: "center", marginTop: 8 },
  cta: { height: 52, borderRadius: 14, backgroundColor: "#B8FF47", alignItems: "center", justifyContent: "center", marginTop: 18 },
  ctaText: { color: "#0A0A0A", fontWeight: "800", fontSize: 16 },
  linkBtn: { marginTop: 14, alignSelf: "center" },
  link: { color: "#8ee6ff" },
});
