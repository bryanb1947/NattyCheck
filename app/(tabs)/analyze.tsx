// app/(tabs)/analyze.tsx
import React, { useMemo, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Platform,
  StatusBar,
  Alert,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons, MaterialIcons, Feather } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";

import { useCaptureStore } from "@/store/useCaptureStore";
import { useAuthStore } from "@/store/useAuthStore";

const C = {
  bg: "#0B0D0F",
  card: "#101417",
  card2: "#0E1215",
  border: "#1E232B",
  borderSoft: "rgba(255,255,255,0.08)",
  text: "#E8F0FF",
  dim: "#94A3B8",
  dim2: "#7C8A96",
  accentA: "#00D0FF",
  accentB: "#B8FF48",
  warn: "#FFD54F",
  warnBg: "rgba(255,213,79,0.10)",
  warnBorder: "rgba(255,213,79,0.22)",
};

type Tip = {
  icon: React.ReactNode;
  title: string;
  desc?: string;
};

export default function Analyze() {
  const tabBarHeight = useBottomTabBarHeight();
  const insets = useSafeAreaInsets();

  const clearCapture = useCaptureStore((s) => s.clearAll);

  const userId = useAuthStore((s) => s.userId);
  const onboardingComplete = useAuthStore((s) => s.onboardingComplete);

  // IMPORTANT:
  // - bootstrapAuth() is restore-only (no anon creation).
  // - ensureGuestSession() is the explicit anon creation path.
  const bootstrapAuth = useAuthStore((s) => s.bootstrapAuth);
  const ensureGuestSession = useAuthStore((s) => s.ensureGuestSession);

  const handleStart = useCallback(async () => {
    try {
      // prove tap is firing
      console.log("✅ Begin Capture pressed", {
        userId: useAuthStore.getState().userId,
        plan: useAuthStore.getState().plan,
        onboardingComplete: useAuthStore.getState().onboardingComplete,
      });

      // Gate onboarding from the store (source of truth)
      if (!onboardingComplete) {
        router.push("/onboarding");
        return;
      }

      // Ensure auth store is populated (restore session if needed)
      if (!useAuthStore.getState().userId) {
        await bootstrapAuth();
      }

      // If still no user, create guest session (this only happens if truly no session)
      if (!useAuthStore.getState().userId) {
        await ensureGuestSession();
      }

      const nextUserId = useAuthStore.getState().userId;
      if (!nextUserId) {
        Alert.alert(
          "Session not ready",
          "We couldn’t initialize a session. Fully close the app and reopen, then try again."
        );
        return;
      }

      // Clear capture state
      clearCapture();
      await AsyncStorage.removeItem("lastAnalysis");

      // Navigate
      router.push({
        pathname: "/capture",
        params: { photoIndex: "0" },
      });
    } catch (e: any) {
      console.log("❌ Analyze.handleStart error:", e?.message ?? e);
      Alert.alert("Error", "Could not start capture. Please try again.");
    }
  }, [onboardingComplete, bootstrapAuth, ensureGuestSession, clearCapture]);

  const tips = useMemo<Tip[]>(
    () => [
      {
        icon: <MaterialIcons name="emoji-objects" size={18} color="#FFD54F" />,
        title: "Bright lighting",
        desc: "Avoid harsh shadows.",
      },
      {
        icon: <MaterialIcons name="straighten" size={18} color="#BA68C8" />,
        title: "Chest height",
        desc: "Phone level + centered.",
      },
      {
        icon: <Feather name="user" size={18} color="#FF8A65" />,
        title: "Neutral posture",
        desc: "Arms slightly away.",
      },
      {
        icon: <Ionicons name="timer-outline" size={18} color="#69F0AE" />,
        title: "Use timer",
        desc: "Cleaner, less blur.",
      },
    ],
    []
  );

  const bottomPad = tabBarHeight + Math.max(insets.bottom, 12) + 24;

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      <StatusBar barStyle="light-content" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scroll, { paddingBottom: bottomPad }]}
      >
        {/* HERO */}
        <View style={styles.heroWrap}>
          <LinearGradient
            colors={["rgba(0,208,255,0.16)", "rgba(184,255,72,0.10)"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.heroGlow}
          >
            <View style={styles.heroCard}>
              <View style={styles.heroTopRow}>
                <LinearGradient
                  colors={[C.accentA, C.accentB]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.heroIcon}
                >
                  <Feather name="camera" size={28} color="#0B0D0F" />
                </LinearGradient>

                <View style={{ flex: 1 }}>
                  <Text style={styles.title}>Start your scan</Text>
                  <Text style={styles.subtitle}>
                    Take 3 photos (front • side • back). The AI has strict validation.
                  </Text>
                </View>
              </View>

              {/* micro-stats */}
              <View style={styles.metaRow}>
                <View style={styles.metaPill}>
                  <Ionicons name="time-outline" size={14} color="#CFFFA6" />
                  <Text style={styles.metaText}>~30s</Text>
                </View>
                <View style={styles.metaPill}>
                  <Ionicons name="lock-closed-outline" size={14} color="#CFFFA6" />
                  <Text style={styles.metaText}>On-device photos</Text>
                </View>
              </View>

              {/* strict requirements callout */}
              <View style={styles.strictBox}>
                <Ionicons name="warning-outline" size={16} color={C.warn} />
                <Text style={styles.strictText}>
                  <Text style={{ fontWeight: "900", color: C.text }}>
                    Strict requirements:
                  </Text>{" "}
                  shirts and covered legs will be rejected.
                </Text>
              </View>
            </View>
          </LinearGradient>
        </View>

        {/* REQUIREMENTS */}
        <Text style={styles.sectionTitle}>Required to scan</Text>

        <View style={styles.reqGrid}>
          <View style={styles.reqCard}>
            <View style={styles.reqIconWrap}>
              <Ionicons name="shirt-outline" size={18} color={C.warn} />
            </View>
            <Text style={styles.reqTitle}>Shirtless</Text>
            <Text style={styles.reqDesc}>No shirts, hoodies, or compression tops.</Text>
          </View>

          <View style={styles.reqCard}>
            <View style={styles.reqIconWrap}>
              <Ionicons name="body-outline" size={18} color={C.warn} />
            </View>
            <Text style={styles.reqTitle}>Shorts or underwear</Text>
            <Text style={styles.reqDesc}>Legs must be visible for accurate scoring.</Text>
          </View>
        </View>

        {/* TIPS */}
        <Text style={[styles.sectionTitle, { marginTop: 18 }]}>Pro tips</Text>

        <View style={styles.tipsGrid}>
          {tips.map((t, idx) => (
            <View key={idx} style={styles.tipCard}>
              <View style={styles.tipIcon}>{t.icon}</View>
              <Text style={styles.tipTitle}>{t.title}</Text>
              {!!t.desc && <Text style={styles.tipDesc}>{t.desc}</Text>}
            </View>
          ))}
        </View>

        {/* CTA */}
        <View style={styles.ctaWrap}>
          <TouchableOpacity onPress={handleStart} activeOpacity={0.9}>
            <LinearGradient
              colors={[C.accentA, C.accentB]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.cta}
            >
              <Ionicons name="sparkles" size={18} color="#0B0D0F" />
              <Text style={styles.ctaText}>Begin Photo Capture</Text>
            </LinearGradient>
          </TouchableOpacity>

          <Text style={styles.footerHint}>
            Tip: set your phone down + use the timer for the cleanest scan.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },

  scroll: {
    paddingHorizontal: 18,
    paddingTop: Platform.OS === "android" ? 10 : 6,
  },

  /* HERO */
  heroWrap: { marginTop: 6, marginBottom: 14 },
  heroGlow: { borderRadius: 20, padding: 2 },
  heroCard: {
    backgroundColor: C.card2,
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: C.borderSoft,
  },
  heroTopRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  heroIcon: {
    width: 58,
    height: 58,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    color: C.text,
    fontSize: 22,
    fontWeight: "900",
    letterSpacing: 0.2,
  },
  subtitle: {
    marginTop: 4,
    color: C.dim,
    fontSize: 13,
    lineHeight: 18,
  },
  metaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 12,
  },
  metaPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "rgba(185,255,72,0.10)",
    borderWidth: 1,
    borderColor: "rgba(185,255,72,0.20)",
  },
  metaText: { color: "#CFFFA6", fontSize: 12, fontWeight: "800" },

  strictBox: {
    marginTop: 12,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    padding: 10,
    borderRadius: 14,
    backgroundColor: C.warnBg,
    borderWidth: 1,
    borderColor: C.warnBorder,
  },
  strictText: {
    flex: 1,
    color: C.dim2,
    fontSize: 12,
    lineHeight: 16,
  },

  /* SECTIONS */
  sectionTitle: {
    color: C.text,
    fontSize: 14,
    fontWeight: "900",
    marginBottom: 10,
  },

  /* REQUIREMENTS */
  reqGrid: {
    flexDirection: "row",
    gap: 10,
  },
  reqCard: {
    flex: 1,
    backgroundColor: C.card,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: C.warnBorder,
  },
  reqIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.05)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  reqTitle: { color: C.text, fontSize: 14, fontWeight: "900" },
  reqDesc: { marginTop: 4, color: C.dim, fontSize: 12, lineHeight: 16 },

  /* TIPS */
  tipsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    rowGap: 10,
  },
  tipCard: {
    width: "48%",
    backgroundColor: C.card,
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: C.border,
    minHeight: 96,
  },
  tipIcon: {
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.05)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  tipTitle: { color: C.text, fontSize: 13, fontWeight: "900" },
  tipDesc: { marginTop: 4, color: C.dim, fontSize: 12, lineHeight: 16 },

  /* CTA */
  ctaWrap: { marginTop: 18 },
  cta: {
    width: "100%",
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  ctaText: { color: "#0B0D0F", fontWeight: "900", fontSize: 15 },
  footerHint: {
    marginTop: 10,
    color: C.dim,
    textAlign: "center",
    fontSize: 12,
  },
});