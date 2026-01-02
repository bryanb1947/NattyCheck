// app/login.tsx
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";

import { supabase } from "../lib/supabase";
import { ensureProfile } from "../lib/profile";
import { useAuthStore } from "../store/useAuthStore";

/**
 * App-side gating normalization:
 * - "premium" / "pro" / "paid" => pro
 * - "trial" => pro (CHANGE HERE if you want trial treated as free)
 * - everything else => free
 */
function normalizePlan(plan: any): "free" | "pro" {
  const v = String(plan ?? "").trim().toLowerCase();

  // ✅ Treat trial as PRO for gating (change to "free" if trial should NOT unlock premium)
  if (v === "trial") return "pro";

  if (v === "premium" || v === "pro" || v === "paid") return "pro";
  return "free";
}

export default function Login() {
  const router = useRouter();

  const setIdentity = useAuthStore((s) => s.setIdentity);
  const setPlan = useAuthStore((s) => s.setPlan);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const gradient = ["#00f5a0", "#00d9f5"];

  // Debug: show existing session user (helps detect stale sessions)
  useEffect(() => {
    (async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (session?.user?.email) {
          console.log("🟦 Existing Supabase session:", session.user.email);
        } else {
          console.log("🟦 No existing Supabase session.");
        }
      } catch (e) {
        console.log("Session check failed:", e);
      }
    })();
  }, []);

  const handleLogin = async () => {
    const emailTrim = email.trim().toLowerCase();

    if (!emailTrim || !password) {
      Alert.alert("Missing Info", "Please enter both email and password.");
      return;
    }

    setLoading(true);

    try {
      // 🔐 Supabase password login (passwords are verified by Supabase Auth)
      const { data, error } = await supabase.auth.signInWithPassword({
        email: emailTrim,
        password,
      });

      if (error) {
        Alert.alert("Login Failed", error.message);
        return;
      }

      const user = data.user;
      if (!user?.id) {
        Alert.alert("Error", "User not found after login.");
        return;
      }

      // ✅ Ensure profile row exists (creates if missing)
      await ensureProfile(user.id, user.email ?? emailTrim);

      // ✅ Fetch profile plan (avoid .single() crash cases)
      const { data: profile, error: profileErr } = await supabase
        .from("profiles")
        .select("user_id, email, plan, is_premium, trial_active, premium_until")
        .eq("user_id", user.id)
        .maybeSingle();

      if (profileErr) {
        console.log("❌ Profile fetch failed:", profileErr);
        Alert.alert("Error", "Failed to load profile.");
        return;
      }

      // Prefer explicit "plan"; fallback to flags
      let planRaw = profile?.plan;
      if (!planRaw) {
        planRaw = profile?.is_premium
          ? "premium"
          : profile?.trial_active
          ? "trial"
          : "free";
      }

      const normalized = normalizePlan(planRaw);

      // ✅ Update Zustand auth store (matches your current useAuthStore.ts)
      setIdentity({
        userId: user.id,
        email: user.email ?? profile?.email ?? emailTrim,
      });
      setPlan(normalized);

      console.log("✅ Logged in:", {
        email: user.email,
        plan_raw: planRaw,
        plan_normalized: normalized,
      });

      router.replace("/(tabs)/analyze");
    } catch (e: any) {
      console.log("❌ Login crash:", e);
      Alert.alert("Error", "Something went wrong during login.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient colors={["#050505", "#0a0a0a"]} style={{ flex: 1 }}>
      <KeyboardAvoidingView
        style={{
          flex: 1,
          justifyContent: "center",
          paddingHorizontal: 30,
        }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        {/* Header */}
        <View style={{ marginBottom: 40 }}>
          <Text
            style={{
              color: "#BFFF00",
              fontSize: 36,
              fontWeight: "800",
              textAlign: "center",
            }}
          >
            Welcome Back 👋
          </Text>
          <Text
            style={{
              color: "#999",
              textAlign: "center",
              marginTop: 8,
              fontSize: 16,
            }}
          >
            Log in to continue your AI analysis
          </Text>
        </View>

        {/* Email */}
        <TextInput
          placeholder="Email"
          placeholderTextColor="#666"
          style={{
            backgroundColor: "#121212",
            color: "white",
            borderRadius: 12,
            padding: 16,
            marginBottom: 20,
            fontSize: 16,
          }}
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
          autoCorrect={false}
          autoComplete="off"
          textContentType="none"
          importantForAutofill="no"
        />

        {/* Password */}
        <TextInput
          placeholder="Password"
          placeholderTextColor="#666"
          style={{
            backgroundColor: "#121212",
            color: "white",
            borderRadius: 12,
            padding: 16,
            marginBottom: 30,
            fontSize: 16,
          }}
          secureTextEntry
          value={password}
          onChangeText={setPassword}
          autoCorrect={false}
          autoComplete="off"
          textContentType="none"
          importantForAutofill="no"
        />

        {/* Login Button */}
        <TouchableOpacity onPress={handleLogin} disabled={loading}>
          <LinearGradient
            colors={gradient}
            style={{
              borderRadius: 14,
              paddingVertical: 14,
              shadowColor: "#00f5a0",
              shadowOpacity: 0.3,
              shadowRadius: 8,
              elevation: 5,
              opacity: loading ? 0.6 : 1,
            }}
          >
            <Text
              style={{
                color: "black",
                fontWeight: "700",
                fontSize: 18,
                textAlign: "center",
              }}
            >
              {loading ? "Loading..." : "Log In"}
            </Text>
          </LinearGradient>
        </TouchableOpacity>

        {/* Forgot password */}
        <TouchableOpacity
          onPress={() => Alert.alert("Reset Link", "Password reset coming soon.")}
          style={{ marginTop: 16 }}
        >
          <Text
            style={{
              color: "#00d9f5",
              textAlign: "center",
              fontSize: 14,
            }}
          >
            Forgot Password?
          </Text>
        </TouchableOpacity>

        {/* Sign up */}
        <TouchableOpacity
          onPress={() => router.push("/signup")}
          style={{ marginTop: 24 }}
        >
          <Text
            style={{
              color: "#999",
              textAlign: "center",
              fontSize: 14,
            }}
          >
            Don’t have an account?{" "}
            <Text style={{ color: "#7CFFB2", fontWeight: "600" }}>Sign Up</Text>
          </Text>
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}
