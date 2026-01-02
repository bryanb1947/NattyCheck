// app/signup.tsx
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
  Alert,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";

import { supabase } from "../lib/supabase";
import { ensureProfile } from "../lib/profile";
import { useAuthStore } from "../store/useAuthStore";

/**
 * App-side gating normalization:
 * - "premium" / "pro" / "paid" => pro
 * - "trial" => pro (CHANGE HERE if you want trial to be treated as free)
 * - everything else => free
 */
function normalizePlan(plan: any): "free" | "pro" {
  const v = String(plan ?? "").trim().toLowerCase();
  if (v === "trial") return "pro";
  if (v === "premium" || v === "pro" || v === "paid") return "pro";
  return "free";
}

export default function SignUp() {
  const router = useRouter();

  const setIdentity = useAuthStore((s) => s.setIdentity);
  const setPlan = useAuthStore((s) => s.setPlan);

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [loading, setLoading] = useState(false);

  const onCreate = async () => {
    const emailTrim = email.trim().toLowerCase();
    const userTrim = username.trim();

    if (!userTrim || !emailTrim || !pw.trim()) {
      return Alert.alert(
        "Missing info",
        "Please fill in username, email, and password."
      );
    }

    setLoading(true);

    try {
      // 🔐 Create user in Supabase Auth (password is stored/verified by Supabase Auth, not your DB)
      const { data, error } = await supabase.auth.signUp({
        email: emailTrim,
        password: pw,
      });

      if (error) {
        Alert.alert("Sign Up Failed", error.message);
        return;
      }

      // NOTE: Depending on your Supabase Auth settings (email confirmation),
      // data.user may exist but there may be no session yet.
      const user = data.user;

      if (!user?.id) {
        Alert.alert(
          "Check your email",
          "Account created. Please confirm your email, then log in."
        );
        router.replace("/login");
        return;
      }

      // ✅ Ensure profile row exists (creates if missing)
      await ensureProfile(user.id, user.email ?? emailTrim, userTrim);

      // ✅ Fetch profile plan (avoid .single() crash cases)
      const { data: profile, error: profileErr } = await supabase
        .from("profiles")
        .select("user_id, email, plan, is_premium, trial_active, premium_until")
        .eq("user_id", user.id)
        .maybeSingle();

      if (profileErr) {
        console.log("❌ Profile fetch failed after signup:", profileErr);
        Alert.alert("Error", "Profile created, but failed to load it. Please log in.");
        router.replace("/login");
        return;
      }

      // Prefer explicit plan; otherwise fall back to flags
      let planRaw = profile?.plan;
      if (!planRaw) {
        const isPremium = !!profile?.is_premium;
        const trialActive = !!profile?.trial_active;
        planRaw = isPremium ? "premium" : trialActive ? "trial" : "free";
      }

      const normalized = normalizePlan(planRaw);

      // ✅ Sync Zustand auth store (matches your current useAuthStore.ts)
      setIdentity({
        userId: user.id,
        email: user.email ?? profile?.email ?? emailTrim,
      });
      setPlan(normalized);

      console.log("✅ Signed up:", {
        email: user.email,
        plan_raw: planRaw,
        plan_normalized: normalized,
      });

      // ✔ Send into your main flow
      router.replace("/(tabs)/analyze");
    } catch (e: any) {
      console.log("❌ Signup crash:", e);
      Alert.alert("Error", "Something went wrong during signup.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.container}>
          <Text style={styles.header}>Create Account</Text>
          <Text style={styles.sub}>Let’s set up your profile</Text>

          {/* Username */}
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

          {/* Email */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="john@domain.com"
              placeholderTextColor="#7C7C7C"
              style={styles.input}
              autoCapitalize="none"
              keyboardType="email-address"
            />
          </View>

          {/* Password */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Create Password</Text>
            <TextInput
              value={pw}
              onChangeText={setPw}
              placeholder="••••••••"
              placeholderTextColor="#7C7C7C"
              style={styles.input}
              secureTextEntry
            />
          </View>

          {/* CREATE BUTTON */}
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={onCreate}
            disabled={loading}
            style={{ width: "100%", marginTop: 10 }}
          >
            <LinearGradient
              colors={["#00FFE0", "#B8FF47"]}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              style={[styles.cta, loading && { opacity: 0.6 }]}
            >
              <Text style={styles.ctaText}>
                {loading ? "Creating..." : "Create Account"}
              </Text>
            </LinearGradient>
          </TouchableOpacity>

          {/* BACK TO LOGIN */}
          <TouchableOpacity
            onPress={() => router.replace("/login")}
            style={{ marginTop: 14 }}
          >
            <Text style={styles.linkText}>Already have an account? Log in</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

/* ------------------------------ Styles ------------------------------ */

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
  cta: {
    borderRadius: 999,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  ctaText: { color: "#0F0F0F", fontWeight: "700", fontSize: 16 },
  linkText: { color: "#FFFFFF", textAlign: "center", fontWeight: "600" },
});
