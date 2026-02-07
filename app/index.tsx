// app/index.tsx
// ------------------------------------------------------
// NattyCheck Welcome (Immersive Auth Landing)
// RULE:
// - DO NOT create anon on app boot.
// - ONLY create/ensure anon when user taps "Get Started".
// - "Log In" always goes to /login?force=1 (no anon).
// ------------------------------------------------------

import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  Pressable,
  SafeAreaView,
  StyleSheet,
  StatusBar,
  Platform,
  ActivityIndicator,
  Alert,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/store/useAuthStore";

const C = {
  bg: "#07090A",
  text: "#EAF2F6",
  dim: "rgba(234,242,246,0.70)",
  dim2: "rgba(234,242,246,0.50)",
  card: "rgba(14,18,20,0.72)",
  border2: "rgba(255,255,255,0.06)",
  accentA: "#2AF5FF",
  accentB: "#B9FF39",
  ink: "#071012",
};

const GLOW: [string, string] = [C.accentA, C.accentB];

export default function WelcomeScreen() {
  const router = useRouter();
  const [starting, setStarting] = useState(false);

  const bootstrapAuth = useAuthStore((s) => s.bootstrapAuth);

  const goLogin = useCallback(() => {
    // IMPORTANT: no anon creation here.
    // force=1 means: "user explicitly tapped Login, do not auto-skip login UI"
    router.push("/login?force=1");
  }, [router]);

  const goOnboarding = useCallback(async () => {
    if (starting) return;
    setStarting(true);

    try {
      // 1) Check if any session exists already
      const { data: sessData, error: sessErr } = await supabase.auth.getSession();
      if (sessErr) console.log("🟦 [Welcome] getSession error:", sessErr.message);

      const session = sessData?.session ?? null;

      // 2) If no session, create anon ONLY now (Get Started)
      if (!session?.user?.id) {
        const { data, error } = await supabase.auth.signInAnonymously();
        if (error) {
          console.log("🟦 [Welcome] signInAnonymously error:", error.message);
          Alert.alert("Network issue", "Couldn’t start a session. Try again.");
          return;
        }
        if (data?.user?.id) {
          console.log("🟩 [Welcome] anon created:", { uid: data.user.id });
        }
      } else {
        console.log("🟩 [Welcome] session exists:", { uid: session.user.id });
      }

      // 3) IMPORTANT: hydrate Zustand auth store NOW
      // This prevents “userId is null” / gating weirdness right after creating anon.
      await bootstrapAuth();

      // 4) Continue into onboarding
      router.push("/onboarding");
    } catch (e: any) {
      console.log("🟦 [Welcome] Get Started crash:", e?.message ?? e);
      Alert.alert("Error", "Couldn’t start onboarding. Try again.");
    } finally {
      setStarting(false);
    }
  }, [router, starting, bootstrapAuth]);

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" />

      {/* Cinematic background layers */}
      <View pointerEvents="none" style={styles.bg}>
        <LinearGradient
          colors={[
            "rgba(42,245,255,0.22)",
            "rgba(185,255,57,0.10)",
            "rgba(7,9,10,0)",
          ]}
          start={{ x: 0.15, y: 0.0 }}
          end={{ x: 0.85, y: 1 }}
          style={styles.bgTop}
        />
        <LinearGradient
          colors={[
            "rgba(185,255,57,0)",
            "rgba(185,255,57,0.10)",
            "rgba(42,245,255,0.12)",
            "rgba(42,245,255,0)",
          ]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.bgBeam}
        />
        <LinearGradient
          colors={["rgba(7,9,10,0)", "rgba(7,9,10,0.55)", "rgba(7,9,10,0.92)"]}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={styles.bgVignette}
        />
      </View>

      <View style={styles.wrap}>
        {/* Top / Brand */}
        <View style={styles.top}>
          <View style={styles.brandRow}>
            <View style={styles.brandDotWrap}>
              <LinearGradient
                colors={GLOW}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.brandDot}
              />
            </View>
            <Text style={styles.brand}>NattyCheck</Text>
          </View>

          <Text style={styles.h1}>
            Your physique.{"\n"}
            <Text style={styles.h1Accent}>Scored brutally.</Text>
          </Text>

          <Text style={styles.sub}>
            3-angle capture → strict validation → full breakdown of symmetry, bodyfat, proportions,
            and weak points.
          </Text>

          <View style={styles.trustRow}>
            <TrustPill icon="shield-checkmark-outline" label="Private by default" />
            <TrustPill icon="checkmark-circle-outline" label="Strict validation" />
            <TrustPill icon="time-outline" label="~30 seconds" />
          </View>

          <View style={styles.journeyOuter}>
            <LinearGradient
              colors={["rgba(42,245,255,0.14)", "rgba(185,255,57,0.10)"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.journeyBorder}
            >
              <View style={styles.journeyCard}>
                <Text style={styles.journeyTitle}>How it works</Text>

                <Step
                  index={1}
                  title="Capture 3 angles"
                  desc="Front, side, back — guided for consistency."
                  icon="scan-outline"
                />
                <Divider />
                <Step
                  index={2}
                  title="AI validates the photo"
                  desc="If landmarks are blocked, it won’t accept it."
                  icon="sparkles-outline"
                />
                <Divider />
                <Step
                  index={3}
                  title="Get your breakdown"
                  desc="Scores + weak points + recommendations."
                  icon="stats-chart-outline"
                />
              </View>
            </LinearGradient>
          </View>
        </View>

        {/* Bottom / CTAs */}
        <View style={styles.bottom}>
          <Pressable
            onPress={goOnboarding}
            disabled={starting}
            style={({ pressed }) => [
              styles.press,
              pressed && !starting && styles.pressed,
              starting && { opacity: 0.75 },
            ]}
          >
            <LinearGradient
              colors={GLOW}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.cta}
            >
              {starting ? (
                <>
                  <ActivityIndicator color={C.ink} />
                  <Text style={[styles.ctaTxt, { marginLeft: 10 }]}>Starting…</Text>
                </>
              ) : (
                <>
                  <Text style={styles.ctaTxt}>Get Started</Text>
                  <Ionicons name="arrow-forward" size={18} color={C.ink} />
                </>
              )}
            </LinearGradient>
          </Pressable>

          <Pressable
            onPress={goLogin}
            disabled={starting}
            style={({ pressed }) => [styles.press, pressed && !starting && styles.pressed]}
          >
            <View style={styles.loginBtn}>
              <Ionicons name="log-in-outline" size={18} color="rgba(234,242,246,0.92)" />
              <Text style={styles.loginTxt}>Log In</Text>
            </View>
          </Pressable>

          <Text style={styles.footer}>Analyze. Improve. Stay Natty. 🧬</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

function TrustPill({ icon, label }: { icon: any; label: string }) {
  return (
    <View style={styles.trustPill}>
      <Ionicons name={icon} size={14} color="rgba(234,242,246,0.92)" />
      <Text style={styles.trustText}>{label}</Text>
    </View>
  );
}

function Step({
  index,
  title,
  desc,
  icon,
}: {
  index: number;
  title: string;
  desc: string;
  icon: any;
}) {
  return (
    <View style={styles.stepRow}>
      <View style={styles.stepLeft}>
        <LinearGradient
          colors={["rgba(42,245,255,0.25)", "rgba(185,255,57,0.18)"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.stepBadge}
        >
          <Text style={styles.stepNum}>{index}</Text>
        </LinearGradient>

        <View style={styles.stepIconWrap}>
          <Ionicons name={icon} size={18} color="rgba(234,242,246,0.92)" />
        </View>
      </View>

      <View style={{ flex: 1 }}>
        <Text style={styles.stepTitle}>{title}</Text>
        <Text style={styles.stepDesc}>{desc}</Text>
      </View>
    </View>
  );
}

function Divider() {
  return <View style={styles.divider} />;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },

  bg: { ...StyleSheet.absoluteFillObject },
  bgTop: {
    position: "absolute",
    top: -100,
    left: -70,
    right: -70,
    height: 480,
    borderBottomLeftRadius: 280,
    borderBottomRightRadius: 280,
  },
  bgBeam: {
    position: "absolute",
    top: 120,
    left: -120,
    width: 520,
    height: 520,
    transform: [{ rotate: "18deg" }],
    borderRadius: 999,
  },
  bgVignette: { ...StyleSheet.absoluteFillObject },

  wrap: {
    flex: 1,
    paddingHorizontal: 22,
    paddingTop: Platform.OS === "android" ? 14 : 6,
    paddingBottom: 18,
    justifyContent: "space-between",
  },

  top: { paddingTop: 10 },

  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    marginTop: 8,
  },
  brandDotWrap: {
    width: 18,
    height: 18,
    borderRadius: 999,
    padding: 2,
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  brandDot: { flex: 1, borderRadius: 999 },
  brand: { color: C.text, fontSize: 16, fontWeight: "900", letterSpacing: 0.3 },

  h1: {
    marginTop: 16,
    color: C.text,
    fontSize: 40,
    fontWeight: "950" as any,
    lineHeight: 44,
    textAlign: "center",
    letterSpacing: 0.2,
  },
  h1Accent: { color: C.accentB },

  sub: {
    marginTop: 12,
    color: C.dim,
    fontSize: 13,
    lineHeight: 18,
    textAlign: "center",
  },

  trustRow: {
    marginTop: 14,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    justifyContent: "center",
  },
  trustPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 999,
  },
  trustText: { color: "rgba(234,242,246,0.86)", fontSize: 12, fontWeight: "800" },

  journeyOuter: { marginTop: 18 },
  journeyBorder: { borderRadius: 22, padding: 2 },
  journeyCard: {
    borderRadius: 20,
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.border2,
    padding: 16,
  },
  journeyTitle: {
    color: C.text,
    fontSize: 14,
    fontWeight: "900",
    letterSpacing: 0.2,
    marginBottom: 10,
  },

  stepRow: { flexDirection: "row", gap: 12, alignItems: "center", paddingVertical: 10 },
  stepLeft: { flexDirection: "row", gap: 10, alignItems: "center" },
  stepBadge: {
    width: 28,
    height: 28,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  stepNum: { color: C.text, fontWeight: "900", fontSize: 12 },

  stepIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  stepTitle: { color: C.text, fontSize: 14, fontWeight: "900" },
  stepDesc: { color: C.dim2, fontSize: 12, marginTop: 3, lineHeight: 16 },

  divider: { height: 1, backgroundColor: "rgba(255,255,255,0.06)" },

  bottom: { paddingTop: 8 },

  press: { width: "100%" },
  pressed: { opacity: 0.92, transform: [{ scale: 0.995 }] },

  cta: {
    borderRadius: 18,
    paddingVertical: 16,
    paddingHorizontal: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  ctaTxt: { color: C.ink, fontSize: 17, fontWeight: "900", letterSpacing: 0.2 },

  loginBtn: {
    marginTop: 14,
    borderWidth: 1,
    borderColor: "rgba(42,245,255,0.50)",
    backgroundColor: "rgba(14,18,20,0.55)",
    borderRadius: 18,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 10,
  },
  loginTxt: { color: C.text, fontWeight: "900", fontSize: 15, letterSpacing: 0.2 },

  footer: {
    marginTop: 14,
    color: "rgba(234,242,246,0.42)",
    textAlign: "center",
    fontSize: 13,
    fontWeight: "700",
  },
});
