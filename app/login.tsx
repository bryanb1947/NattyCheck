// app/login.tsx
import React, { useMemo, useState, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  StatusBar,
  ScrollView,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/store/useAuthStore";

/**
 * LOGIN RULE (YOUR REQUIREMENT):
 * - If user is on /login, ALWAYS show login UI (no auto-redirect away).
 * - Only navigate AFTER a successful email/password login.
 *
 * IMPORTANT FIXES:
 * - DO NOT call ensureGuestSession() (not in your store).
 * - After signInWithPassword succeeds, we MUST hydrate gate fields
 *   (plan/onboarding/email) BEFORE routing, otherwise you'll get bounced
 *   or paywalled due to timing.
 * - "Get Started" should create anon ONLY when tapped (start onboarding).
 */

const C = {
  bg: "#07090A",
  text: "#EAF2F6",
  dim: "rgba(234,242,246,0.70)",
  dim2: "rgba(234,242,246,0.50)",
  card: "rgba(14,18,20,0.80)",
  cardBorder: "rgba(255,255,255,0.08)",
  inputBg: "rgba(255,255,255,0.06)",
  inputBorder: "rgba(255,255,255,0.10)",
  accentA: "#00f5a0",
  accentB: "#00d9f5",
  accentC: "#B9FF39",
};

function normalizeEmail(v: string) {
  return String(v || "").trim().toLowerCase();
}
function hasAtEmail(v: any) {
  const s = String(v ?? "").trim();
  return s.includes("@") && s.includes(".");
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export default function Login() {
  const router = useRouter();

  // Boot UI only (NO routing off login page from here)
  const hasHydrated = useAuthStore((s) => s.hasHydrated);
  const hasBootstrappedSession = useAuthStore((s) => s.hasBootstrappedSession);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loggingIn, setLoggingIn] = useState(false);
  const [startingOnboarding, setStartingOnboarding] = useState(false);

  const gradient = useMemo(() => [C.accentA, C.accentB] as [string, string], []);

  const routeAfterLogin = useCallback(() => {
    const s = useAuthStore.getState();
    const plan = s.plan;
    const onboarded = !!s.onboardingComplete;
    const emailOk = hasAtEmail(s.email);

    // Your global gate for tabs is:
    // pro + onboardingComplete + email
    // Route in a stable order.
    if (plan !== "pro") {
      router.replace("/paywall");
      return;
    }
    if (!onboarded) {
      router.replace("/onboarding");
      return;
    }
    if (!emailOk) {
      router.replace({ pathname: "/claimaccount", params: { next: "/(tabs)/analyze" } } as any);
      return;
    }
    router.replace("/(tabs)/analyze");
  }, [router]);

  /**
   * Wait for gate fields to be correct after login.
   * This prevents the “premium account paywalled” timing issue:
   * - RevenueCat / profile updates can lag for a moment
   * - bootstrapAuth() pulls gate fields from DB
   *
   * Strategy:
   * - call bootstrapAuth()
   * - check state
   * - retry a few times (short) before making a decision
   */
  const hydrateGateWithRetries = useCallback(async () => {
    const maxTries = 8; // ~2.4s total at 300ms
    for (let i = 0; i < maxTries; i++) {
      try {
        await useAuthStore.getState().bootstrapAuth();
      } catch (e: any) {
        console.log("🟨 [Login] bootstrapAuth retry failed:", e?.message ?? e);
      }

      const s = useAuthStore.getState();
      const emailOk = hasAtEmail(s.email);

      // If plan says pro, we’re good.
      if (s.plan === "pro") return;

      // If user is mid-onboarding, also okay to continue; don’t force paywall yet.
      // (This keeps flow smooth even if plan hasn't updated.)
      if (!s.onboardingComplete) return;

      // If they have an email and onboarding is done but plan still free,
      // give it another moment for entitlement sync.
      if (emailOk) {
        await sleep(300);
        continue;
      }

      await sleep(300);
    }
  }, []);

  /**
   * Get Started:
   * - Create anon session ONLY when user taps this.
   * - Then bootstrapAuth so the store has userId + profile row.
   * - Then route onboarding.
   */
  const goOnboarding = useCallback(async () => {
    if (startingOnboarding || loggingIn) return;
    setStartingOnboarding(true);

    try {
      const { data: sessData, error: sessErr } = await supabase.auth.getSession();
      if (sessErr) console.log("🟦 [Login] getSession error:", sessErr.message);

      const session = sessData?.session ?? null;
      if (!session?.user?.id) {
        const { data, error } = await supabase.auth.signInAnonymously();
        if (error) {
          console.log("🟦 [Login] signInAnonymously error:", error.message);
          Alert.alert("Network issue", "Couldn’t start a guest session. Try again.");
          return;
        }
        if (data?.user?.id) {
          console.log("🟩 [Login] anon created (Get Started):", { uid: data.user.id });
        }
      } else {
        console.log("🟩 [Login] session exists (Get Started):", { uid: session.user.id });
      }

      // Pull userId/email + ensure profile row + fetch gate fields
      await useAuthStore.getState().bootstrapAuth();

      router.replace("/onboarding");
    } catch (e: any) {
      console.log("🟦 [Login] Get Started crash:", e?.message ?? e);
      Alert.alert("Error", "Couldn’t start onboarding. Try again.");
    } finally {
      setStartingOnboarding(false);
    }
  }, [loggingIn, router, startingOnboarding]);

  const handleLogin = useCallback(async () => {
    if (loggingIn || startingOnboarding) return;

    const em = normalizeEmail(email);
    if (!em || !password) {
      Alert.alert("Missing Info", "Please enter both email and password.");
      return;
    }

    setLoggingIn(true);
    try {
      console.log("🔐 [Login] signInWithPassword start:", em);

      const { data, error } = await supabase.auth.signInWithPassword({
        email: em,
        password,
      });

      if (error) {
        Alert.alert("Login Failed", error.message);
        return;
      }

      if (!data?.user?.id) {
        Alert.alert("Error", "No user returned after login.");
        return;
      }

      console.log("✅ [Login] signInWithPassword ok:", {
        email: data.user.email ?? "",
        uid: data.user.id,
      });

      // ✅ Hydrate gate fields with short retries to avoid timing paywall/bounce.
      await hydrateGateWithRetries();

      // Sanity log
      const sess = await supabase.auth.getSession();
      console.log("🧾 [Login] session after login:", {
        hasSession: !!sess.data?.session,
        uid: sess.data?.session?.user?.id ?? null,
        email: sess.data?.session?.user?.email ?? null,
        gate: {
          plan: useAuthStore.getState().plan,
          onboardingComplete: !!useAuthStore.getState().onboardingComplete,
          email: useAuthStore.getState().email ?? null,
        },
      });

      // Now route based on gate fields
      routeAfterLogin();
    } catch (e: any) {
      console.log("❌ Login crash:", e?.message ?? e);
      Alert.alert("Error", "Something went wrong during login.");
    } finally {
      setLoggingIn(false);
    }
  }, [email, hydrateGateWithRetries, loggingIn, password, routeAfterLogin, startingOnboarding]);

  // Only show a short boot screen until hydration + restore-only bootstrap is done
  const showBoot = !hasHydrated || !hasBootstrappedSession;
  const busy = loggingIn || startingOnboarding;

  if (showBoot) {
    return (
      <LinearGradient colors={["#050505", "#0a0a0a"]} style={{ flex: 1 }}>
        <StatusBar barStyle="light-content" />
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <ActivityIndicator size="large" color={C.accentA} />
          <Text style={{ color: "rgba(234,242,246,0.62)", marginTop: 12 }}>
            Preparing login…
          </Text>
        </View>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={["#050505", "#0a0a0a"]} style={{ flex: 1 }}>
      <StatusBar barStyle="light-content" />

      {/* Soft glow */}
      <View pointerEvents="none" style={styles.bgGlowWrap}>
        <LinearGradient
          colors={[
            "rgba(0,245,160,0.14)",
            "rgba(0,217,245,0.10)",
            "rgba(7,9,10,0)",
          ]}
          start={{ x: 0.2, y: 0 }}
          end={{ x: 0.8, y: 1 }}
          style={styles.bgGlow}
        />
      </View>

      <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
        <KeyboardAvoidingView
          style={styles.kav}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={Platform.OS === "ios" ? 8 : 0}
        >
          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.scrollContent}
          >
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.brand}>NattyCheck</Text>
              <Text style={styles.headerSub}>Log in to continue where you left off</Text>
            </View>

            {/* Card */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Welcome back</Text>
              <Text style={styles.cardBody}>Log in to sync your progress across devices.</Text>

              <Text style={styles.label}>Email</Text>
              <TextInput
                placeholder="you@example.com"
                placeholderTextColor="rgba(234,242,246,0.35)"
                style={styles.input}
                autoCapitalize="none"
                keyboardType="email-address"
                value={email}
                onChangeText={setEmail}
                autoCorrect={false}
                editable={!busy}
                returnKeyType="next"
              />

              <Text style={[styles.label, { marginTop: 14 }]}>Password</Text>
              <TextInput
                placeholder="••••••••"
                placeholderTextColor="rgba(234,242,246,0.35)"
                style={styles.input}
                secureTextEntry
                value={password}
                onChangeText={setPassword}
                autoCorrect={false}
                editable={!busy}
                returnKeyType="done"
                onSubmitEditing={handleLogin}
              />

              <TouchableOpacity
                onPress={handleLogin}
                activeOpacity={0.9}
                disabled={busy}
                style={{ marginTop: 16 }}
              >
                <LinearGradient
                  colors={gradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={[styles.primaryBtn, busy && { opacity: 0.65 }]}
                >
                  {loggingIn ? (
                    <ActivityIndicator size="small" color="#071012" />
                  ) : (
                    <Ionicons name="log-in-outline" size={18} color="#071012" />
                  )}
                  <Text style={styles.primaryBtnText}>
                    {loggingIn ? "Logging in…" : "Log In"}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => Alert.alert("Reset Link", "Password reset coming soon.")}
                style={styles.linkBtn}
                activeOpacity={0.8}
                disabled={busy}
              >
                <Text style={styles.linkText}>Forgot password?</Text>
              </TouchableOpacity>
            </View>

            {/* New users CTA */}
            <View style={styles.newUserWrap}>
              <TouchableOpacity onPress={goOnboarding} activeOpacity={0.9} disabled={busy}>
                <View style={styles.secondaryBtn}>
                  {startingOnboarding ? (
                    <ActivityIndicator size="small" color="rgba(234,242,246,0.9)" />
                  ) : (
                    <Ionicons
                      name="sparkles-outline"
                      size={18}
                      color="rgba(234,242,246,0.92)"
                    />
                  )}
                  <Text style={styles.secondaryBtnText}>
                    {startingOnboarding ? "Preparing…" : "New here? Get Started"}
                  </Text>
                </View>
              </TouchableOpacity>

              <Text style={styles.note}>
                Get Started creates a guest session only when you begin onboarding.
              </Text>
            </View>

            {/* Footer */}
            <Text style={styles.footer}>Analyze. Improve. Stay Natty. 🧬</Text>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  kav: { flex: 1 },

  bgGlowWrap: {
    position: "absolute",
    top: -90,
    left: -60,
    right: -60,
    height: 420,
  },
  bgGlow: {
    flex: 1,
    borderBottomLeftRadius: 260,
    borderBottomRightRadius: 260,
  },

  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 22,
    paddingTop: Platform.OS === "android" ? 18 : 10,
    paddingBottom: 22,
    justifyContent: "center",
  },

  header: { alignItems: "center", marginBottom: 18 },
  brand: {
    color: C.accentC,
    fontSize: 40,
    fontWeight: "900",
    letterSpacing: 0.2,
  },
  headerSub: {
    color: C.dim,
    marginTop: 8,
    fontSize: 14,
    fontWeight: "700",
    textAlign: "center",
  },

  card: {
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.cardBorder,
    borderRadius: 18,
    padding: 16,
  },
  cardTitle: { color: C.text, fontSize: 16, fontWeight: "900" },
  cardBody: { color: C.dim2, fontSize: 12, marginTop: 6, lineHeight: 17 },

  label: {
    color: C.dim,
    fontSize: 12,
    fontWeight: "800",
    marginTop: 14,
    marginBottom: 8,
  },
  input: {
    backgroundColor: C.inputBg,
    borderWidth: 1,
    borderColor: C.inputBorder,
    color: C.text,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 15,
  },

  primaryBtn: {
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 10,
  },
  primaryBtnText: { color: "#071012", fontWeight: "900", fontSize: 16 },

  linkBtn: { marginTop: 14, alignItems: "center" },
  linkText: {
    color: "rgba(0,217,245,0.92)",
    fontSize: 13,
    fontWeight: "800",
  },

  newUserWrap: { marginTop: 16, alignItems: "stretch" },
  secondaryBtn: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(185,255,57,0.35)",
    backgroundColor: "rgba(14,18,20,0.55)",
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 10,
  },
  secondaryBtnText: { color: C.text, fontWeight: "900", fontSize: 15 },

  note: {
    marginTop: 10,
    textAlign: "center",
    color: "rgba(234,242,246,0.42)",
    fontSize: 12,
    fontWeight: "700",
  },

  footer: {
    marginTop: 18,
    textAlign: "center",
    color: "rgba(234,242,246,0.35)",
    fontSize: 12,
    fontWeight: "700",
  },
});
