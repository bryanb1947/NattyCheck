// app/results.tsx
import React, { useCallback, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Modal,
  Pressable,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useFocusEffect } from "expo-router";

import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/store/useAuthStore";
import { useResultsStore } from "@/store/useResultsStore";
import { syncEntitlementsToSupabase } from "@/lib/revenuecat";

const { width } = Dimensions.get("window");

/**
 * ✅ Source of truth:
 * - profiles.plan_normalized: "free" | "pro"
 * - profiles.plan_raw: string (appstore:product_id) or "free"
 */
function normalizeProfileToProOrFree(profile: any): "pro" | "free" {
  const norm = String(profile?.plan_normalized ?? "").trim().toLowerCase();
  if (norm === "pro" || norm === "premium" || norm === "paid" || norm === "plus") return "pro";

  const raw = String(profile?.plan_raw ?? "").trim().toLowerCase();
  if (raw.includes("appstore:") || raw.includes("revenuecat:")) return "pro";

  return "free";
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const C = {
  bgTop: "#050505",
  bgBottom: "#0a0a0a",
  card: "rgba(14,18,20,0.82)",
  cardBorder: "rgba(255,255,255,0.08)",
  text: "#EAF2F6",
  dim: "rgba(234,242,246,0.72)",
  dim2: "rgba(234,242,246,0.55)",
  accentA: "#00f5a0",
  accentB: "#00d9f5",
  accentC: "#B9FF39",
};

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}

function scoreTier(score: number) {
  const s = clamp(score, 0, 100);
  if (s >= 80) return { label: "Elite potential", note: "Small tweaks = big visual jump." };
  if (s >= 65) return { label: "Above average", note: "You’re close — weak points are holding you back." };
  if (s >= 50) return { label: "Solid base", note: "Fix imbalances + definition for a major glow-up." };
  return { label: "Build phase", note: "The roadmap matters more than effort right now." };
}

export default function ResultsScreen() {
  const router = useRouter();

  const result = useResultsStore((s) => s.last);

  const hasHydratedAuth = useAuthStore.persist.hasHydrated();
  const plan = useAuthStore((s) => s.plan);
  const setPlan = useAuthStore((s) => s.setPlan);
  const bootstrapAuth = useAuthStore((s) => s.bootstrapAuth);
  const setIdentity = useAuthStore((s) => s.setIdentity);

  // NEW: "Save progress" prompt gate (we'll add this flag to the auth store)
  const didPromptSaveProgress = useAuthStore((s: any) => !!s.didPromptSaveProgress);
  const setDidPromptSaveProgress = useAuthStore((s: any) => s.setDidPromptSaveProgress);

  const [checking, setChecking] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // NEW: modal state
  const [showSavePrompt, setShowSavePrompt] = useState(false);
  const pendingNextRef = useRef<string | null>(null);

  const headerDate = useMemo(() => {
    const created = (result as any)?.created_at;
    const d = created ? new Date(created) : new Date();
    const safe = d instanceof Date && !isNaN(d.getTime()) ? d : new Date();

    return safe.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }, [result]);

  // Free-safe display fields
  const score = Number((result as any)?.score ?? (result as any)?.gptScore ?? 70);
  const bodyfat = (result as any)?.bodyfat ?? null;
  const symmetry = Number((result as any)?.symmetry ?? 70);
  const confidence = Number((result as any)?.confidence ?? 80);

  const tier = useMemo(() => scoreTier(score), [score]);

  /**
   * ✅ Entitlement check that:
   * - ensures a Supabase session exists (anon allowed if your bootstrapAuth is restore-only; this is fine)
   * - best-effort RC -> Supabase sync
   * - retries profile fetch for a few seconds
   * - routes:
   *    - pro => /premiumresults  (NO email requirement anymore)
   *    - free => stay here
   */
  const checkEntitlement = useCallback(
    async (opts?: { redirectIfPro?: boolean }) => {
      const redirectIfPro = opts?.redirectIfPro ?? true;

      if (!hasHydratedAuth) return;

      if (!result) {
        setChecking(false);
        return;
      }

      setChecking(true);

      try {
        // 1) Ensure there is a session
        let { data: sessData } = await supabase.auth.getSession();
        let session = sessData?.session ?? null;

        if (!session?.user?.id) {
          await bootstrapAuth();
          const again = await supabase.auth.getSession();
          session = again.data?.session ?? null;
        }

        const uid = session?.user?.id ?? null;
        const email = session?.user?.email ?? null;

        if (!uid) {
          setPlan("free");
          setChecking(false);
          return;
        }

        setIdentity({ userId: uid, email });

        // 2) Best-effort: sync RC -> Supabase (helps right-after-purchase)
        try {
          await syncEntitlementsToSupabase();
        } catch (e) {
          console.log("⚠️ Results syncEntitlementsToSupabase failed (non-blocking):", e);
        }

        // 3) Retry profile fetch a few times
        const attempts = 6; // ~3s
        for (let i = 0; i < attempts; i++) {
          const { data: profile, error } = await supabase
            .from("profiles")
            .select("user_id, plan_normalized, plan_raw, email")
            .eq("user_id", uid)
            .maybeSingle();

          if (error) {
            console.warn("[Results] profile fetch error:", error);
            setPlan("free");
            setChecking(false);
            return;
          }

          const normalized = normalizeProfileToProOrFree(profile);
          setPlan(normalized);

          if (normalized === "pro") {
            if (redirectIfPro) {
              router.replace("/premiumresults");
              return;
            }
            break;
          }

          await sleep(500);
        }

        setChecking(false);
      } catch (e: any) {
        console.warn("[Results] entitlement check failed:", e?.message ?? e);
        setChecking(false);
      }
    },
    [hasHydratedAuth, result, bootstrapAuth, router, setPlan, setIdentity]
  );

  useFocusEffect(
    useCallback(() => {
      checkEntitlement({ redirectIfPro: true });
    }, [checkEntitlement])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await checkEntitlement({ redirectIfPro: true });
    } finally {
      setRefreshing(false);
    }
  }, [checkEntitlement]);

  /**
   * NEW:
   * - When user tries to go to paywall, if they’re anon and haven’t been prompted,
   *   show “Save your progress” (skippable) once.
   * - If they skip, go straight to the original destination.
   * - If they choose save, go to /saveprogress?next=<destination>
   */
  const navigateWithOptionalSavePrompt = useCallback(
    async (dest: string) => {
      // Always allow if already pro (shouldn’t happen on this screen, but safe)
      if (plan === "pro") {
        router.push(dest as any);
        return;
      }

      // Determine if anon (no email) from current session
      let email: string | null = null;
      try {
        const { data } = await supabase.auth.getSession();
        email = (data?.session?.user?.email ?? null) as any;
      } catch {}

      const isAnon = !email;

      // Only prompt once, only for anon users
      if (isAnon && !didPromptSaveProgress) {
        pendingNextRef.current = dest;
        setShowSavePrompt(true);
        return;
      }

      router.push(dest as any);
    },
    [plan, router, didPromptSaveProgress]
  );

  const unlock = useCallback(() => {
    navigateWithOptionalSavePrompt("/paywall");
  }, [navigateWithOptionalSavePrompt]);

  const handleSaveNow = useCallback(() => {
    const dest = pendingNextRef.current ?? "/paywall";
    setShowSavePrompt(false);
    setDidPromptSaveProgress?.(true);

    router.push({
      pathname: "/saveprogress",
      params: { next: dest },
    } as any);
  }, [router, setDidPromptSaveProgress]);

  const handleNotNow = useCallback(() => {
    const dest = pendingNextRef.current ?? "/paywall";
    setShowSavePrompt(false);
    setDidPromptSaveProgress?.(true);

    router.push(dest as any);
  }, [router, setDidPromptSaveProgress]);

  // Loading states
  if (!hasHydratedAuth || checking) {
    return (
      <SafeAreaView style={styles.loadingScreen}>
        <ActivityIndicator size="large" color={C.accentA} />
        <Text style={styles.loadingText}>Loading results…</Text>
      </SafeAreaView>
    );
  }

  if (!result) {
    return (
      <SafeAreaView style={styles.loadingScreen}>
        <Text style={styles.loadingText}>No analysis found. Run a new scan.</Text>

        <TouchableOpacity
          onPress={() => router.replace("/(tabs)/analyze")}
          style={{ marginTop: 14 }}
          activeOpacity={0.85}
        >
          <Text style={{ color: C.accentC, fontWeight: "900" }}>Go to Analyze</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  // If local plan is pro, we should not render free results
  if (plan === "pro") {
    return (
      <SafeAreaView style={styles.loadingScreen}>
        <ActivityIndicator size="large" color={C.accentA} />
        <Text style={styles.loadingText}>Unlocking…</Text>
      </SafeAreaView>
    );
  }

  // Layout constants
  const bottomCtaHeight = 86;

  return (
    <LinearGradient colors={[C.bgTop, C.bgBottom]} style={{ flex: 1 }}>
      <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
        {/* Save Progress Prompt (one-time, skippable) */}
        <Modal
          visible={showSavePrompt}
          transparent
          animationType="fade"
          onRequestClose={() => setShowSavePrompt(false)}
        >
          <View style={styles.modalBackdrop}>
            <Pressable style={StyleSheet.absoluteFill} onPress={() => setShowSavePrompt(false)} />

            <View style={styles.modalCard}>
              <View style={styles.modalIconRow}>
                <LinearGradient colors={[C.accentA, C.accentB]} style={styles.modalIconCircle}>
                  <Ionicons name="shield-checkmark" size={22} color="#071012" />
                </LinearGradient>
              </View>

              <Text style={styles.modalTitle}>Save your progress</Text>
              <Text style={styles.modalBody}>
                Keep your scans, photos, and reports if you reinstall or switch devices.
                {"\n\n"}
                You can skip this — it won’t block your analysis.
              </Text>

              <TouchableOpacity activeOpacity={0.92} onPress={handleSaveNow} style={{ width: "100%" }}>
                <LinearGradient
                  colors={[C.accentA, C.accentB]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.modalPrimaryBtn}
                >
                  <Ionicons name="logo-apple" size={18} color="#071012" />
                  <Text style={styles.modalPrimaryText}>Continue with Apple / Google</Text>
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity activeOpacity={0.85} onPress={handleNotNow} style={styles.modalSecondaryBtn}>
                <Text style={styles.modalSecondaryText}>Not now — continue</Text>
              </TouchableOpacity>

              {Platform.OS === "ios" ? (
                <Text style={styles.modalTiny}>
                  Apple sign-in is fastest. Google is optional.
                </Text>
              ) : (
                <Text style={styles.modalTiny}>
                  Google sign-in is fastest. Apple is optional.
                </Text>
              )}
            </View>
          </View>
        </Modal>

        {/* CONTENT */}
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.pageContent, { paddingBottom: bottomCtaHeight + 22 }]}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.accentA} />
          }
        >
          {/* HEADER */}
          <View style={styles.headerRow}>
            <LinearGradient colors={[C.accentA, C.accentB]} style={styles.logoPill}>
              <Text style={styles.logoText}>N</Text>
            </LinearGradient>

            <Text style={styles.headerDate}>{headerDate}</Text>
          </View>

          {/* HERO */}
          <View style={styles.heroCard}>
            <View style={styles.heroTopRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.heroTitle}>Physique Summary</Text>
                <Text style={styles.heroSub}>
                  {tier.label} — <Text style={{ color: C.dim2 }}>Free preview</Text>
                </Text>
                <Text style={styles.heroNote}>{tier.note}</Text>
              </View>

              <View style={styles.scoreRing}>
                <Text style={styles.scoreValue}>{clamp(score, 0, 100)}</Text>
                <Text style={styles.scoreLabel}>Overall</Text>
              </View>
            </View>

            <View style={styles.metricsRow}>
              <MetricPill label="Body Fat" value={bodyfat ? `${bodyfat}%` : "—"} />
              <MetricPill label="Symmetry" value={`${clamp(symmetry, 0, 100)}%`} />
              <MetricPill label="Confidence" value={`${clamp(confidence, 0, 100)}%`} />
            </View>

            {/* Inline micro-CTA */}
            <TouchableOpacity activeOpacity={0.9} onPress={unlock} style={{ marginTop: 12 }}>
              <LinearGradient
                colors={["rgba(185,255,57,0.20)", "rgba(0,245,160,0.14)"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.inlineUnlock}
              >
                <Ionicons name="sparkles-outline" size={18} color={C.text} />
                <Text style={styles.inlineUnlockText}>See your weak points + exact plan</Text>
                <Ionicons name="chevron-forward" size={16} color={C.dim} />
              </LinearGradient>
            </TouchableOpacity>
          </View>

          {/* ONE premium teaser */}
          <View style={styles.card}>
            <View style={styles.cardHeaderRow}>
              <Text style={styles.sectionTitle}>Premium Preview</Text>
              <View style={styles.lockPill}>
                <Ionicons name="lock-closed" size={14} color={C.text} />
                <Text style={styles.lockPillText}>Pro</Text>
              </View>
            </View>

            <Text style={styles.sectionBody}>
              Your full report pinpoints what to fix first for the biggest visual change.
            </Text>

            <View style={styles.previewBlock}>
              <BlurView intensity={42} tint="dark" style={styles.previewBlur}>
                <Text style={styles.previewTitle}>Muscle Map + Imbalance Breakdown</Text>
                <Text style={styles.previewSub}>Unlock to reveal your lagging areas and priorities.</Text>

                <View style={styles.previewBars}>
                  <PreviewBar label="Shoulders" />
                  <PreviewBar label="Chest" />
                  <PreviewBar label="Back" />
                </View>

                <View style={styles.previewHintRow}>
                  <Ionicons name="eye-off-outline" size={16} color={C.dim} />
                  <Text style={styles.previewHintText}>Hidden in Free • Visible in Pro</Text>
                </View>
              </BlurView>
            </View>
          </View>

          {/* Compact value stack */}
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Unlock Pro Analysis</Text>

            <View style={{ marginTop: 10, gap: 10 }}>
              <ValueRow text="Full muscle map + symmetry hotspots" />
              <ValueRow text="Body proportion ratios + structure analysis" />
              <ValueRow text="AI physique classification + what it means" />
              <ValueRow text="Personalized recommendations (training + focus)" />
              <ValueRow text="Save reports + track progress over time" />
            </View>

            <Text style={styles.smallPrint}>
              Pro users convert faster because they know exactly what to do next.
            </Text>
          </View>

          {/* Social proof */}
          <View style={styles.testimonialCard}>
            <Text style={styles.testimonialTitle}>Most users upgrade after seeing their weak points.</Text>
            <Text style={styles.testimonialSub}>
              “The muscle map called out exactly what I’ve been missing. Finally made progress.”
            </Text>
            <Text style={styles.testimonialByline}>— NattyCheck user</Text>
          </View>

          <View style={{ height: 10 }} />
        </ScrollView>

        {/* STICKY CTA */}
        <View style={styles.stickyWrap} pointerEvents="box-none">
          <View style={styles.stickyInner}>
            <TouchableOpacity activeOpacity={0.92} onPress={unlock} style={{ width: "100%" }}>
              <LinearGradient
                colors={[C.accentA, C.accentB]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.ctaBtn}
              >
                <Text style={styles.ctaText}>Continue My Full Analysis →</Text>
              </LinearGradient>
            </TouchableOpacity>

            <Text style={styles.ctaSub}>Unlock instantly • Cancel anytime</Text>
          </View>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

function MetricPill({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metricPill}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
    </View>
  );
}

function ValueRow({ text }: { text: string }) {
  return (
    <View style={styles.valueRow}>
      <View style={styles.valueDot} />
      <Text style={styles.valueText}>{text}</Text>
    </View>
  );
}

function PreviewBar({ label }: { label: string }) {
  return (
    <View style={styles.previewBarRow}>
      <Text style={styles.previewBarLabel}>{label}</Text>
      <View style={styles.previewBarTrack}>
        <View style={styles.previewBarFill} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  pageContent: { paddingHorizontal: 16, paddingTop: 10 },

  loadingScreen: {
    flex: 1,
    backgroundColor: "#0B0D0F",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 18,
  },
  loadingText: { marginTop: 12, color: "#fff", textAlign: "center" },

  headerRow: {
    marginBottom: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  logoPill: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  logoText: { color: "#071012", fontWeight: "900", fontSize: 18 },
  headerDate: { color: C.accentC, fontSize: 14, fontWeight: "800" },

  heroCard: {
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.cardBorder,
    borderRadius: 20,
    padding: 16,
  },
  heroTopRow: { flexDirection: "row", gap: 14, alignItems: "center" },
  heroTitle: { color: C.text, fontSize: 22, fontWeight: "900" },
  heroSub: { marginTop: 4, color: C.accentC, fontSize: 13, fontWeight: "900" },
  heroNote: {
    marginTop: 8,
    color: C.dim,
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 18,
  },

  scoreRing: {
    width: 104,
    height: 104,
    borderRadius: 52,
    borderWidth: 2,
    borderColor: "rgba(0,245,160,0.65)",
    backgroundColor: "rgba(6,10,12,0.55)",
    alignItems: "center",
    justifyContent: "center",
  },
  scoreValue: { color: C.accentC, fontSize: 34, fontWeight: "900" },
  scoreLabel: { marginTop: 2, color: "rgba(234,242,246,0.55)", fontSize: 12, fontWeight: "800" },

  metricsRow: { marginTop: 14, flexDirection: "row", gap: 10 },
  metricPill: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    borderRadius: 14,
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  metricLabel: { color: "rgba(234,242,246,0.55)", fontSize: 11, fontWeight: "800" },
  metricValue: { marginTop: 4, color: C.text, fontSize: 18, fontWeight: "900" },

  inlineUnlock: {
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: "rgba(185,255,57,0.22)",
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  inlineUnlockText: { flex: 1, color: C.text, fontWeight: "900", fontSize: 13 },

  card: {
    marginTop: 14,
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.cardBorder,
    borderRadius: 20,
    padding: 16,
  },
  cardHeaderRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  sectionTitle: { color: C.text, fontSize: 18, fontWeight: "900" },
  sectionBody: { marginTop: 8, color: C.dim2, fontSize: 13, fontWeight: "700", lineHeight: 18 },

  lockPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "rgba(185,255,57,0.12)",
    borderWidth: 1,
    borderColor: "rgba(185,255,57,0.22)",
  },
  lockPillText: { color: C.text, fontWeight: "900", fontSize: 12 },

  previewBlock: {
    marginTop: 12,
    height: 170,
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "rgba(0,0,0,0.22)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
  },
  previewBlur: {
    ...StyleSheet.absoluteFillObject,
    padding: 14,
    justifyContent: "space-between",
  },
  previewTitle: { color: C.text, fontWeight: "900", fontSize: 14 },
  previewSub: { marginTop: 4, color: C.dim2, fontWeight: "700", fontSize: 12, lineHeight: 16 },

  previewBars: { marginTop: 10, gap: 10 },
  previewBarRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  previewBarLabel: { width: 82, color: "rgba(234,242,246,0.72)", fontSize: 12, fontWeight: "800" },
  previewBarTrack: {
    flex: 1,
    height: 10,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.08)",
    overflow: "hidden",
  },
  previewBarFill: {
    height: "100%",
    width: "62%",
    borderRadius: 999,
    backgroundColor: "rgba(185,255,57,0.55)",
  },

  previewHintRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 8 },
  previewHintText: { color: "rgba(234,242,246,0.58)", fontSize: 12, fontWeight: "800" },

  valueRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  valueDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: C.accentC,
    opacity: 0.95,
  },
  valueText: { flex: 1, color: C.text, fontSize: 13, fontWeight: "800", lineHeight: 18 },

  smallPrint: {
    marginTop: 12,
    color: "rgba(234,242,246,0.42)",
    fontSize: 11,
    fontWeight: "700",
    lineHeight: 15,
  },

  testimonialCard: {
    marginTop: 14,
    backgroundColor: "rgba(14,18,20,0.62)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
    borderRadius: 20,
    padding: 16,
  },
  testimonialTitle: { color: C.text, fontWeight: "900", fontSize: 14 },
  testimonialSub: { marginTop: 8, color: C.dim, fontWeight: "700", fontSize: 12, lineHeight: 18 },
  testimonialByline: { marginTop: 10, color: "rgba(234,242,246,0.48)", fontWeight: "800", fontSize: 11 },

  stickyWrap: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
  },
  stickyInner: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 12,
    backgroundColor: "rgba(5,5,5,0.88)",
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.08)",
  },
  ctaBtn: {
    borderRadius: 18,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  ctaText: { color: "#071012", fontWeight: "900", fontSize: 16 },
  ctaSub: {
    marginTop: 8,
    textAlign: "center",
    color: "rgba(234,242,246,0.55)",
    fontSize: 11,
    fontWeight: "800",
  },

  // Modal styles
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 18,
  },
  modalCard: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: "rgba(14,18,20,0.96)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    borderRadius: 22,
    padding: 16,
  },
  modalIconRow: { alignItems: "center", marginBottom: 10 },
  modalIconCircle: {
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: "center",
    justifyContent: "center",
  },
  modalTitle: { color: C.text, fontSize: 20, fontWeight: "900", textAlign: "center" },
  modalBody: {
    marginTop: 10,
    color: "rgba(234,242,246,0.70)",
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 18,
    textAlign: "center",
  },
  modalPrimaryBtn: {
    marginTop: 14,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 14,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 10,
  },
  modalPrimaryText: { color: "#071012", fontWeight: "900", fontSize: 15 },

  modalSecondaryBtn: {
    marginTop: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    backgroundColor: "rgba(255,255,255,0.05)",
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  modalSecondaryText: { color: "rgba(234,242,246,0.92)", fontWeight: "900", fontSize: 14 },

  modalTiny: {
    marginTop: 10,
    textAlign: "center",
    color: "rgba(234,242,246,0.38)",
    fontSize: 10,
    fontWeight: "800",
    lineHeight: 14,
  },
});
