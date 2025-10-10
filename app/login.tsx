import React, { useState } from "react";
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";

export default function Login() {
  const [username, setUsername] = useState("");
  const [pw, setPw] = useState("");

  const onLogin = () => {
    // Mock only — later: validate credentials
    router.replace("/capture-guide");
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <View style={styles.container}>
          <Text style={styles.header}>Welcome back</Text>
          <Text style={styles.sub}>Log in to continue</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Username</Text>
            <TextInput
              value={username}
              onChangeText={setUsername}
              placeholder="johndoe"
              placeholderTextColor="#7C7C7C"
              style={styles.input}
              autoCapitalize="none"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Password</Text>
            <TextInput
              value={pw}
              onChangeText={setPw}
              placeholder="••••••••"
              placeholderTextColor="#7C7C7C"
              style={styles.input}
              secureTextEntry
            />
          </View>

          {/* Login */}
          <TouchableOpacity activeOpacity={0.9} onPress={onLogin} style={{ width: "100%", marginTop: 10 }}>
            <LinearGradient colors={["#00FFE0", "#B8FF47"]} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={styles.cta}>
              <Text style={styles.ctaText}>Log In</Text>
            </LinearGradient>
          </TouchableOpacity>

          {/* Sign up link */}
          <TouchableOpacity onPress={() => router.replace("/signup")} style={{ marginTop: 14 }}>
            <Text style={styles.linkText}>New here? Create an account</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#0F0F0F" },
  container: { flex: 1, padding: 20, justifyContent: "center" },
  header: { color: "#fff", fontSize: 26, fontWeight: "700" },
  sub: { color: "#B3B3B3", marginTop: 6, marginBottom: 16 },
  inputGroup: { marginBottom: 12 },
  label: { color: "#FFFFFF", marginBottom: 6, fontWeight: "600" },
  input: {
    backgroundColor: "#151515",
    color: "#fff",
    borderColor: "#2A2A2A",
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  cta: { borderRadius: 999, paddingVertical: 14, alignItems: "center", justifyContent: "center" },
  ctaText: { color: "#0F0F0F", fontWeight: "700", fontSize: 16 },
  linkText: { color: "#FFFFFF", textAlign: "center", fontWeight: "600" },
});
