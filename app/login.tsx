import { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform } from "react-native";
import { router } from "expo-router";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const onLogin = async () => {
    // TODO: call your real auth. For now, just proceed.
    router.replace("/(tabs)"); // goes to the tab navigator (Dashboard default)
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={s.wrap}>
      <View style={s.card}>
        <Text style={s.title}>Log In</Text>

        <Text style={s.label}>Email</Text>
        <TextInput
          value={email}
          onChangeText={setEmail}
          placeholder="you@email.com"
          placeholderTextColor="#6C7A7F"
          keyboardType="email-address"
          autoCapitalize="none"
          style={s.input}
        />

        <Text style={s.label}>Password</Text>
        <TextInput
          value={password}
          onChangeText={setPassword}
          placeholder="••••••••"
          placeholderTextColor="#6C7A7F"
          secureTextEntry
          style={s.input}
        />

        <TouchableOpacity style={s.cta} onPress={onLogin}>
          <Text style={s.ctaText}>Continue</Text>
        </TouchableOpacity>

        <TouchableOpacity style={s.linkBtn} onPress={() => router.replace("/signup")}>
          <Text style={s.link}>Create an account</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: "#0F0F0F", alignItems: "center", justifyContent: "center", padding: 20 },
  card: { width: "100%", borderRadius: 16, backgroundColor: "#121618", padding: 24, borderColor: "#1f2a2e", borderWidth: 1 },
  title: { color: "white", fontSize: 24, fontWeight: "800", marginBottom: 14, textAlign: "center" },
  label: { color: "#BFC8CB", marginTop: 10, marginBottom: 6, fontWeight: "700" },
  input: { backgroundColor: "#0B0E10", color: "white", borderRadius: 12, borderWidth: 1, borderColor: "#263238", paddingHorizontal: 12, height: 48 },
  cta: { height: 52, borderRadius: 14, backgroundColor: "#B8FF47", alignItems: "center", justifyContent: "center", marginTop: 18 },
  ctaText: { color: "#0A0A0A", fontWeight: "800", fontSize: 16 },
  linkBtn: { marginTop: 14, alignSelf: "center" },
  link: { color: "#8ee6ff" },
});
