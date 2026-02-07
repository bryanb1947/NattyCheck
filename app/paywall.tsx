// app/paywall.tsx
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams } from "expo-router";
import Purchases, { Offerings, CustomerInfo, PurchasesPackage } from "react-native-purchases";

import { supabase } from "@/lib/supabase";
import { initRevenueCat, syncEntitlementsToSupabase } from "@/lib/revenuecat";
import { useAuthStore } from "@/store/useAuthStore";

const { width, height } = Dimensions.get("window");

type PlanId = "annual" | "monthly";

type PlanOption = {
  id: PlanId;
  title: string;
  priceDisplay: string;
  periodDisplay: string;
  subtext: string;
  badge?: string;
  pkg: PurchasesPackage | null;
};

/* -------------------------------------------------------
   PACKAGE PICKER
------------------------------------------------------- */
function pickPackage(
  pkgs: PurchasesPackage[],
  opts: { annual?: boolean; monthly?: boolean }
): PurchasesPackage | null {
  if (!pkgs?.length) return null;

  const byType = (t: string) => pkgs.find((p) => String(p.packageType) === t) ?? null;

  const byRegex = (re: RegExp) =>
    pkgs.find((p) => re.test(p.identifier)) ??
    pkgs.find((p) => re.test(p.product.identifier)) ??
    null;

  if (opts.annual) {
    const monthly = byType("MONTHLY") ?? byRegex(/month|mo/i);
    return (
      byType("ANNUAL") ||
      byRegex(/annual|year|yr/i) ||
      pkgs.find((p) => p !== monthly) ||
      pkgs[0] ||
      null
    );
  }

  if (opts.monthly) {
    return byType("MONTHLY") || byRegex(/month|mo/i) || pkgs[0] || null;
  }

  return pkgs[0] ?? null;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function hasProEntitlement(customerInfo: CustomerInfo): boolean {
  return !!customerInfo?.entitlements?.active?.["pro"];
}

export default function PaywallScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ link?: string; next?: string }>();

  // ✅ readiness signal
  const hasBootstrappedSession = useAuthStore((s) => s.hasBootstrappedSession);

  // store identity
  const storedUserId = useAuthStore((s) => s.userId);
  const setPlan = useAuthStore((s) => s.setPlan);
  const setIdentity = useAuthStore((s) => s.setIdentity);

  const [selected, setSelected] = useState<PlanId>("annual");
  const [offerings, setOfferings] = useState<Offerings | null>(null);
  const [loadingOfferings, setLoadingOfferings] = useState(true);
  const [offeringsError, setOfferingsError] = useState<string | null>(null);
  const [purchasing, setPurchasing] = useState(false);

  const [finishingUnlock, setFinishingUnlock] = useState(false);
  const [unlockHint, setUnlockHint] = useState<string | null>(null);

  /* -------------------------------------------------------
     Ensure we have a usable Supabase session (anon ok)
  ------------------------------------------------------- */
  const ensureSessionReady = useCallback(async () => {
    // 1) existing session?
    try {
      const { data } = await supabase.auth.getSession();
      const sess = data?.session ?? null;
      if (sess?.user?.id) return { uid: sess.user.id, email: sess.user.email ?? null };
    } catch {}

    // 2) fallback: store id
    if (storedUserId) return { uid: storedUserId, email: null };

    // 3) last resort: create anon
    try {
      const { data, error } = await supabase.auth.signInAnonymously();
      if (error) throw error;
      const u = data?.user;
      if (u?.id) return { uid: u.id, email: u.email ?? null };
    } catch (e: any) {
      console.warn("[Paywall] Failed to ensure anon session:", e?.message ?? e);
    }

    return { uid: null as string | null, email: null as string | null };
  }, [storedUserId]);

  /* -------------------------------------------------------
     Resolve best identity for RC + store
  ------------------------------------------------------- */
  const getEffectiveIdentity = useCallback(async () => {
    const ensured = await ensureSessionReady();
    if (!ensured.uid)
      return { uid: null as string | null, email: null as string | null, isAuthed: false };

    try {
      const { data } = await supabase.auth.getSession();
      const sess = data?.session ?? null;
      const uid = sess?.user?.id ?? ensured.uid;
      const email = sess?.user?.email ?? ensured.email ?? null;

      setIdentity({ userId: uid, email });
      return { uid, email, isAuthed: !!email };
    } catch {
      setIdentity({ userId: ensured.uid, email: ensured.email ?? null });
      return { uid: ensured.uid, email: ensured.email ?? null, isAuthed: false };
    }
  }, [ensureSessionReady, setIdentity]);

  /* -------------------------------------------------------
     Confirm Pro in Supabase profiles (prevents paywall loops)
  ------------------------------------------------------- */
  const confirmProInProfile = useCallback(async (uid: string) => {
    const attempts = 8; // ~4s
    for (let i = 0; i < attempts; i++) {
      const { data, error } = await supabase
        .from("profiles")
        .select("user_id, plan_normalized, plan_raw, updated_at")
        .eq("user_id", uid)
        .maybeSingle();

      if (error) {
        console.log("❌ Paywall confirm profile error:", error);
        return { ok: false as const, reason: error.message };
      }

      const planNorm = String(data?.plan_normalized ?? "").toLowerCase();
      if (planNorm === "pro") return { ok: true as const, data };

      await sleep(500);
    }

    return { ok: false as const, reason: "Profile not updated yet." };
  }, []);

  /* -------------------------------------------------------
     Load offerings
  ------------------------------------------------------- */
  const loadOfferings = useCallback(async () => {
    setLoadingOfferings(true);
    setOfferingsError(null);

    try {
      const ident = await getEffectiveIdentity();
      if (!ident.uid) {
        setOfferings(null);
        setOfferingsError("Unable to start a session. Please restart the app and try again.");
        return;
      }

      await initRevenueCat(ident.uid);

      const o = await Purchases.getOfferings();
      setOfferings(o);

      const pkgs = o?.current?.availablePackages ?? [];
      if (!o?.current || pkgs.length === 0) {
        setOfferingsError(
          "Plans aren’t available yet.\n\n• In RevenueCat, Offering “default” must have Monthly + Annual packages.\n• Test on a real device / dev build.\n• Apple Sandbox: Settings → App Store → Sandbox Account."
        );
      }
    } catch (e: any) {
      console.warn("[Paywall] getOfferings() failed:", e);
      setOfferings(null);

      const msg = String(e?.message ?? e ?? "")
        .replace("There is no singleton instance.", "RevenueCat is not configured.")
        .trim();

      setOfferingsError(msg || "Failed to load plans.");
    } finally {
      setLoadingOfferings(false);
    }
  }, [getEffectiveIdentity]);

  useEffect(() => {
    if (!hasBootstrappedSession) return;
    loadOfferings();
  }, [hasBootstrappedSession, loadOfferings]);

  const productsReady = useMemo(() => {
    const pkgs = offerings?.current?.availablePackages ?? [];
    return !!offerings?.current && pkgs.length > 0;
  }, [offerings]);

  const plans: PlanOption[] = useMemo(() => {
    const current = offerings?.current;
    const pkgs = current?.availablePackages ?? [];

    const annualPkg = pickPackage(pkgs, { annual: true });
    const monthlyPkg = pickPackage(pkgs, { monthly: true });

    const ready = !!current && pkgs.length > 0;

    const annualPrice = ready ? annualPkg?.product.priceString ?? "—" : "—";
    const monthlyPrice = ready ? monthlyPkg?.product.priceString ?? "—" : "—";

    return [
      {
        id: "annual",
        title: "Annual",
        priceDisplay: annualPrice,
        periodDisplay: "/year",
        subtext: ready ? "Best value • discounted vs monthly" : "Loading…",
        badge: "Most Popular",
        pkg: ready ? annualPkg : null,
      },
      {
        id: "monthly",
        title: "Monthly",
        priceDisplay: monthlyPrice,
        periodDisplay: "/month",
        subtext: ready ? "Flexible • cancel anytime" : "Loading…",
        pkg: ready ? monthlyPkg : null,
      },
    ];
  }, [offerings]);

  const selectedPlan = useMemo(
    () => plans.find((p) => p.id === selected) ?? plans[0],
    [plans, selected]
  );

  /* -------------------------------------------------------
     Route AFTER unlock (NO EMAIL REQUIREMENT)
     - Always route to next.
     - Optionally suggest/link account recovery if `link=1` AND they are anon.
  ------------------------------------------------------- */
  const routeAfterUnlock = useCallback(
    async (ident: { uid: string; email: string | null }) => {
      const next =
        typeof params.next === "string" && params.next.length ? params.next : "/premiumresults";

      const wantsLink = String(params.link ?? "") === "1";
      const isAnon = !ident.email;

      // Optional: if caller asked to prompt linking and they're anon, send them to link flow first.
      if (wantsLink && isAnon) {
        router.replace({ pathname: "/linkaccount", params: { next } } as any);
        return;
      }

      router.replace(next as any);
    },
    [router, params.next, params.link]
  );

  const afterUnlock = useCallback(
    async (customerInfo: CustomerInfo) => {
      if (!hasProEntitlement(customerInfo)) {
        Alert.alert(
          "Not unlocked",
          "We couldn’t find an active Pro entitlement. If you already paid, try Restore Purchases."
        );
        return;
      }

      setUnlockHint(null);
      setFinishingUnlock(true);

      // ✅ immediate UX unlock
      setPlan("pro");

      const ident = await getEffectiveIdentity();
      if (!ident.uid) {
        setFinishingUnlock(false);
        Alert.alert("Error", "Missing user id. Please restart the app and try again.");
        return;
      }

      // ✅ Sync entitlements to Supabase using fresh customerInfo
      try {
        const synced = await syncEntitlementsToSupabase({
          customerInfoOverride: customerInfo,
        });
        if (!synced) console.warn("[Paywall] Entitlements sync failed (continuing).");
      } catch (e) {
        console.warn("[Paywall] syncEntitlementsToSupabase crashed (continuing):", e);
      }

      // ✅ confirm profile has flipped to pro (prevents paywall loop)
      const confirmed = await confirmProInProfile(ident.uid);
      if (!confirmed.ok) {
        setUnlockHint(
          "Purchase succeeded, but your account is still syncing.\n\nIf you see the paywall again, wait 5 seconds and hit Restore Purchases."
        );
      }

      setFinishingUnlock(false);

      await routeAfterUnlock({ uid: ident.uid, email: ident.email ?? null });
    },
    [setPlan, getEffectiveIdentity, confirmProInProfile, routeAfterUnlock]
  );

  /* -------------------------------------------------------
     Purchase
  ------------------------------------------------------- */
  const handleUnlock = useCallback(async () => {
    if (purchasing) return;

    if (!productsReady || !selectedPlan?.pkg) {
      if (offeringsError) Alert.alert("Not ready", offeringsError);
      return;
    }

    try {
      setPurchasing(true);

      const ident = await getEffectiveIdentity();
      if (!ident.uid) {
        Alert.alert("Error", "No session found. Please restart the app and try again.");
        return;
      }

      await initRevenueCat(ident.uid);

      const { customerInfo } = await Purchases.purchasePackage(selectedPlan.pkg);
      await afterUnlock(customerInfo);
    } catch (e: any) {
      if (e?.userCancelled) return;
      console.warn("[Paywall] Purchase failed:", e);
      Alert.alert("Purchase failed", e?.message ?? "Please try again.");
    } finally {
      setPurchasing(false);
    }
  }, [purchasing, productsReady, selectedPlan, offeringsError, getEffectiveIdentity, afterUnlock]);

  /* -------------------------------------------------------
     Restore
  ------------------------------------------------------- */
  const handleRestore = useCallback(async () => {
    if (purchasing) return;

    try {
      setPurchasing(true);

      const ident = await getEffectiveIdentity();
      if (!ident.uid) {
        Alert.alert("Error", "No session found. Please restart the app and try again.");
        return;
      }

      await initRevenueCat(ident.uid);

      const customerInfo = await Purchases.restorePurchases();
      await afterUnlock(customerInfo);
    } catch (e: any) {
      console.warn("[Paywall] Restore failed:", e);
      Alert.alert("Restore failed", e?.message ?? "Please try again.");
    } finally {
      setPurchasing(false);
    }
  }, [purchasing, getEffectiveIdentity, afterUnlock]);

  const handleBack = useCallback(() => {
    try {
      router.back();
    } catch {
      router.replace("/(tabs)/analyze");
    }
  }, [router]);

  const ctaDisabled =
    purchasing || loadingOfferings || !productsReady || !selectedPlan?.pkg || finishingUnlock;

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      <View style={styles.bgGlow} pointerEvents="none" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        style={{ flex: 1 }}
        contentContainerStyle={styles.scrollContent}
      >
        <LinearGradient colors={["#00FFE0", "#B8FF48"]} style={styles.iconCircle}>
          <Ionicons name="flash" size={36} color="#0A0B0C" />
        </LinearGradient>

        <Text style={styles.title}>Unlock Full Analysis</Text>
        <Text style={styles.subtitle}>
          Elite feedback, a brutal breakdown, and personalized recommendations.
        </Text>

        <LinearGradient colors={["#00FFE0", "#B8FF48"]} style={styles.glowBorder}>
          <View style={styles.featureContainer}>
            {[
              "Full muscle group & definition breakdown",
              "Proportions + symmetry insights",
              "Personalized training recommendations",
              "Unlimited scans & progress tracking",
            ].map((feature, idx) => (
              <View key={idx} style={styles.featureRow}>
                <Ionicons name="checkmark-circle" size={22} color="#B8FF48" />
                <Text style={styles.featureText}>{feature}</Text>
              </View>
            ))}
          </View>
        </LinearGradient>

        {loadingOfferings ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator color="#B8FF48" />
            <Text style={styles.loadingText}>Loading plans…</Text>
          </View>
        ) : offeringsError ? (
          <View style={styles.errorWrap}>
            <Text style={styles.errorText}>{offeringsError}</Text>

            <TouchableOpacity
              onPress={loadOfferings}
              activeOpacity={0.85}
              style={styles.refreshBtn}
              disabled={purchasing}
            >
              <Ionicons name="refresh" size={16} color="#C9D3DA" />
              <Text style={styles.refreshText}>Refresh plans</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {finishingUnlock ? (
          <View style={styles.finishingWrap}>
            <ActivityIndicator color="#B8FF48" />
            <Text style={styles.finishingText}>Finishing unlock…</Text>
          </View>
        ) : null}

        {!!unlockHint ? (
          <View style={styles.hintWrap}>
            <Text style={styles.hintText}>{unlockHint}</Text>
          </View>
        ) : null}

        <View style={styles.planWrap}>
          {plans.map((p) => {
            const active = p.id === selected;

            return (
              <TouchableOpacity
                key={p.id}
                activeOpacity={0.95}
                onPress={() => setSelected(p.id)}
                style={styles.planOuter}
              >
                <LinearGradient
                  colors={active ? ["#00FFE0", "#B8FF48"] : ["#20262B", "#20262B"]}
                  style={styles.planBorder}
                >
                  <View style={[styles.planCard, active && styles.planCardActive]}>
                    <View style={styles.planTopRow}>
                      <Text style={styles.planTitle}>{p.title}</Text>
                      {!!p.badge && (
                        <View style={styles.badge}>
                          <Text style={styles.badgeText}>{p.badge}</Text>
                        </View>
                      )}
                    </View>

                    <View style={styles.planPriceRow}>
                      <Text style={styles.planPrice}>{p.priceDisplay}</Text>
                      <Text style={styles.planPeriod}>{p.periodDisplay}</Text>
                    </View>

                    <Text style={styles.planSubtext}>{p.subtext}</Text>

                    <View style={styles.radioRow}>
                      <View style={[styles.radioOuter, active && styles.radioOuterActive]}>
                        {active ? <View style={styles.radioInner} /> : null}
                      </View>
                      <Text style={styles.radioText}>{active ? "Selected" : "Select"}</Text>
                    </View>
                  </View>
                </LinearGradient>
              </TouchableOpacity>
            );
          })}
        </View>

        <TouchableOpacity
          style={styles.ctaWrapper}
          activeOpacity={0.9}
          onPress={handleUnlock}
          disabled={ctaDisabled}
        >
          <LinearGradient
            colors={["#00FFE0", "#B8FF48"]}
            style={[styles.ctaButton, ctaDisabled && { opacity: 0.65 }]}
          >
            {purchasing || finishingUnlock ? (
              <ActivityIndicator color="#0A0B0C" />
            ) : (
              <Text style={styles.ctaText}>Continue • {selectedPlan.title} Plan</Text>
            )}
          </LinearGradient>
        </TouchableOpacity>

        <Text style={styles.trialText}>
          Subscriptions auto-renew unless cancelled in your App Store settings.
        </Text>

        <View style={styles.secondaryRow}>
          <TouchableOpacity
            onPress={handleRestore}
            activeOpacity={0.8}
            style={styles.secondaryBtn}
            disabled={purchasing || finishingUnlock}
          >
            <Ionicons name="refresh" size={16} color="#C9D3DA" />
            <Text style={styles.secondaryText}>Restore Purchases</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleBack}
            activeOpacity={0.8}
            style={styles.secondaryBtn}
            disabled={purchasing || finishingUnlock}
          >
            <Ionicons name="arrow-back" size={16} color="#C9D3DA" />
            <Text style={styles.secondaryText}>Back</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Payment is handled securely by the App Store. Cancel anytime in your account settings.
          </Text>

          {__DEV__ ? (
            <Text style={styles.devHint}>
              Dev note: For real IAP, use a dev build / TestFlight. Expo Go can behave inconsistently
              with purchases.
            </Text>
          ) : null}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#0A0B0C" },

  bgGlow: {
    position: "absolute",
    top: -120,
    left: -120,
    width: 320,
    height: 320,
    borderRadius: 160,
    backgroundColor: "rgba(0,255,224,0.12)",
    transform: [{ rotate: "18deg" }],
  },

  scrollContent: {
    alignItems: "center",
    paddingTop: 20,
    paddingBottom: 80,
    minHeight: height * 0.92,
  },

  iconCircle: {
    width: 78,
    height: 78,
    borderRadius: 39,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 18,
  },

  title: { color: "#FFFFFF", fontSize: 24, fontWeight: "800", marginBottom: 6 },

  subtitle: {
    color: "#9B9B9B",
    fontSize: 15,
    textAlign: "center",
    width: "84%",
    marginBottom: 18,
    lineHeight: 20,
  },

  glowBorder: {
    width: width * 0.9,
    borderRadius: 24,
    padding: 2,
    marginBottom: 16,
  },

  featureContainer: {
    backgroundColor: "#121416",
    borderRadius: 22,
    padding: 18,
  },

  featureRow: { flexDirection: "row", alignItems: "center", paddingVertical: 8 },

  featureText: { color: "#E8E8E8", fontSize: 15, marginLeft: 10 },

  loadingRow: {
    width: width * 0.9,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 8,
    marginTop: 2,
  },

  loadingText: { color: "#A3A3A3", fontSize: 13, fontWeight: "600" },

  finishingWrap: {
    width: width * 0.9,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 8,
    marginTop: 2,
  },
  finishingText: { color: "#A3A3A3", fontSize: 13, fontWeight: "700" },

  hintWrap: {
    width: width * 0.9,
    marginTop: 6,
    backgroundColor: "#121416",
    borderRadius: 14,
    padding: 12,
  },
  hintText: { color: "#C9D3DA", fontSize: 12, lineHeight: 16, textAlign: "center" },

  errorWrap: {
    width: width * 0.9,
    marginTop: 6,
    marginBottom: 2,
    alignItems: "center",
  },

  errorText: {
    color: "#A3A3A3",
    fontSize: 12,
    lineHeight: 16,
    textAlign: "center",
  },

  refreshBtn: {
    marginTop: 10,
    backgroundColor: "#121416",
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  refreshText: { color: "#C9D3DA", fontSize: 13, fontWeight: "700" },

  planWrap: { width: width * 0.9, gap: 12, marginTop: 6, marginBottom: 18 },

  planOuter: { width: "100%" },

  planBorder: { width: "100%", borderRadius: 22, padding: 2 },

  planCard: { backgroundColor: "#0F1215", borderRadius: 20, padding: 18 },

  planCardActive: { backgroundColor: "#0B0F12" },

  planTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },

  planTitle: { color: "#EAEAEA", fontSize: 16, fontWeight: "700" },

  badge: {
    backgroundColor: "#B8FF48",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },

  badgeText: { color: "#0A0B0C", fontSize: 12, fontWeight: "800" },

  planPriceRow: { flexDirection: "row", alignItems: "flex-end", gap: 6 },

  planPrice: { color: "#FFFFFF", fontSize: 30, fontWeight: "900" },

  planPeriod: { color: "#A3A3A3", fontSize: 14, marginBottom: 4 },

  planSubtext: { color: "#A3A3A3", fontSize: 13, marginTop: 6 },

  radioRow: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 14 },

  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: "#2A3238",
    alignItems: "center",
    justifyContent: "center",
  },

  radioOuterActive: { borderColor: "#B8FF48" },

  radioInner: { width: 10, height: 10, borderRadius: 5, backgroundColor: "#B8FF48" },

  radioText: { color: "#C9D3DA", fontSize: 13 },

  ctaWrapper: { width: width * 0.9, marginTop: 2 },

  ctaButton: { borderRadius: 14, paddingVertical: 15, alignItems: "center" },

  ctaText: { color: "#0A0B0C", fontWeight: "900", fontSize: 15 },

  trialText: {
    color: "#A3A3A3",
    fontSize: 12,
    marginTop: 10,
    textAlign: "center",
    width: "84%",
    lineHeight: 16,
  },

  secondaryRow: {
    width: width * 0.9,
    marginTop: 18,
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },

  secondaryBtn: {
    flex: 1,
    backgroundColor: "#121416",
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },

  secondaryText: { color: "#C9D3DA", fontSize: 13, fontWeight: "700" },

  footer: {
    width: width * 0.9,
    marginTop: 18,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: "#141A1F",
    alignItems: "center",
  },

  footerText: {
    color: "#6F7A83",
    fontSize: 11,
    textAlign: "center",
    lineHeight: 15,
    marginBottom: 6,
  },

  devHint: {
    marginTop: 10,
    color: "#49535C",
    fontSize: 10,
    textAlign: "center",
    lineHeight: 14,
    width: "90%",
  },
});
