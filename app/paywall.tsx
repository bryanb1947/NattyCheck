// app/paywall.tsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams } from "expo-router";
import Purchases, {
  Offerings,
  CustomerInfo,
  PurchasesPackage,
  PurchasesError,
} from "react-native-purchases";

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
  // optional free trial copy, pulled from StoreKit where possible
  trialText?: string;
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function hasProEntitlement(customerInfo: CustomerInfo): boolean {
  return !!customerInfo?.entitlements?.active?.["pro"];
}

function normalizeOfferingsError(e: any): string {
  const raw = String(e?.message ?? e ?? "").trim();

  if (!raw) return "Failed to load plans.";

  // common SDK message if Purchases.configure wasn't called
  if (raw.includes("There is no singleton instance")) return "RevenueCat is not configured.";

  return raw;
}

/**
 * Best-effort: determine annual/monthly packages.
 * Prefers packageType, then falls back to identifier regexes.
 */
function pickAnnualAndMonthly(pkgs: PurchasesPackage[]) {
  const byType = (t: string) => pkgs.find((p) => String(p.packageType) === t) ?? null;

  const byRegex = (re: RegExp) =>
    pkgs.find((p) => re.test(p.identifier)) ??
    pkgs.find((p) => re.test(p.product.identifier)) ??
    null;

  const monthly =
    byType("MONTHLY") ||
    byRegex(/month|monthly|\bmo\b/i) ||
    pkgs[0] ||
    null;

  const annual =
    byType("ANNUAL") ||
    byRegex(/annual|year|yearly|\byr\b/i) ||
    pkgs.find((p) => p !== monthly) ||
    pkgs[0] ||
    null;

  return { annual, monthly };
}

/**
 * iOS only: display introductory/free trial messaging if present.
 * The SDK exposes intro info on iOS; on Android it may differ.
 */
function getTrialText(pkg: PurchasesPackage | null): string | undefined {
  if (!pkg) return undefined;
  const p: any = pkg.product as any;

  // RevenueCat iOS: product.introPrice / introductoryPrice can exist depending on versions.
  // We keep it defensive to avoid crashes.
  const intro = p?.introPrice ?? p?.introductoryPrice ?? null;
  const introPeriod = intro?.period ?? intro?.subscriptionPeriod ?? null;

  // Some versions provide `introPricePeriod` or `introPrice` already formatted
  const introDuration = introPeriod?.value ?? introPeriod?.numberOfUnits ?? null;
  const introUnit = introPeriod?.unit ?? introPeriod?.unitType ?? null;

  // If you specifically set "3-day free trial", this usually appears as price = 0 for 3 days.
  // We'll try to show something like "3-day free trial" when we can infer.
  const price = intro?.priceString ?? intro?.price ?? null;

  const isFree =
    price === 0 ||
    price === "0" ||
    String(price ?? "").includes("0.00") ||
    String(intro?.priceString ?? "").includes("0");

  if (introDuration && introUnit) {
    const unit =
      String(introUnit).toLowerCase().includes("day") || introUnit === "DAY" ? "day" :
      String(introUnit).toLowerCase().includes("week") || introUnit === "WEEK" ? "week" :
      String(introUnit).toLowerCase().includes("month") || introUnit === "MONTH" ? "month" :
      String(introUnit).toLowerCase().includes("year") || introUnit === "YEAR" ? "year" :
      "day";

    const plural = Number(introDuration) === 1 ? "" : "s";
    if (isFree) return `${introDuration}-${unit}${plural} free trial`;
    return `${introDuration}-${unit}${plural} intro offer`;
  }

  // Fallback to common expectation
  return undefined;
}

export default function PaywallScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ link?: string; next?: string }>();

  // readiness signal from app bootstrap
  const hasBootstrappedSession = useAuthStore((s) => s.hasBootstrappedSession);

  // auth store fields
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

  const didAutoLoad = useRef(false);

  /**
   * Ensure we have a usable Supabase session (anon ok).
   */
  const ensureSessionReady = useCallback(async () => {
    // existing session?
    try {
      const { data } = await supabase.auth.getSession();
      const sess = data?.session ?? null;
      if (sess?.user?.id) return { uid: sess.user.id, email: sess.user.email ?? null };
    } catch {}

    // fallback: store userId
    if (storedUserId) return { uid: storedUserId, email: null };

    // last resort: sign in anonymously
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

  /**
   * Resolve best identity for RC + store.
   */
  const getEffectiveIdentity = useCallback(async () => {
    const ensured = await ensureSessionReady();
    if (!ensured.uid) {
      return { uid: null as string | null, email: null as string | null, isAuthed: false };
    }

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

  /**
   * Confirm Pro in Supabase profiles (prevents paywall loop).
   */
  const confirmProInProfile = useCallback(async (uid: string) => {
    const attempts = 10; // ~5s
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

  /**
   * Route AFTER unlock.
   * - Always route to next (defaults to /premiumresults).
   * - Optionally prompt linking if link=1 and they are anon.
   */
  const routeAfterUnlock = useCallback(
    async (ident: { uid: string; email: string | null }) => {
      const next =
        typeof params.next === "string" && params.next.length
          ? params.next
          : "/premiumresults";

      const wantsLink = String(params.link ?? "") === "1";
      const isAnon = !ident.email;

      if (wantsLink && isAnon) {
        router.replace({ pathname: "/linkaccount", params: { next } } as any);
        return;
      }

      router.replace(next as any);
    },
    [router, params.next, params.link]
  );

  /**
   * Load offerings from RevenueCat.
   */
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
          "Plans aren’t available yet.\n\n• In RevenueCat, Offering “default” must have Monthly + Annual packages.\n• If you just changed products, wait a minute then refresh.\n• Test on a real device / dev build (TestFlight works best).\n• Apple Sandbox: Settings → App Store → Sandbox Account."
        );
      }
    } catch (e: any) {
      console.warn("[Paywall] getOfferings() failed:", e);
      setOfferings(null);
      setOfferingsError(normalizeOfferingsError(e));
    } finally {
      setLoadingOfferings(false);
    }
  }, [getEffectiveIdentity]);

  /**
   * Auto-load once app auth bootstrap is complete.
   */
  useEffect(() => {
    if (!hasBootstrappedSession) return;
    if (didAutoLoad.current) return;
    didAutoLoad.current = true;
    loadOfferings();
  }, [hasBootstrappedSession, loadOfferings]);

  const productsReady = useMemo(() => {
    const pkgs = offerings?.current?.availablePackages ?? [];
    return !!offerings?.current && pkgs.length > 0;
  }, [offerings]);

  const plans: PlanOption[] = useMemo(() => {
    const current = offerings?.current;
    const pkgs = current?.availablePackages ?? [];
    const ready = !!current && pkgs.length > 0;

    const { annual, monthly } = pickAnnualAndMonthly(pkgs);

    const annualPrice = ready ? annual?.product.priceString ?? "—" : "—";
    const monthlyPrice = ready ? monthly?.product.priceString ?? "—" : "—";

    const annualTrial = Platform.OS === "ios" ? getTrialText(annual) : undefined;
    const monthlyTrial = Platform.OS === "ios" ? getTrialText(monthly) : undefined;

    return [
      {
        id: "annual",
        title: "Annual",
        priceDisplay: annualPrice,
        periodDisplay: "/year",
        subtext: ready ? "Best value • discounted vs monthly" : "Loading…",
        badge: "Most Popular",
        pkg: ready ? annual : null,
        trialText: annualTrial,
      },
      {
        id: "monthly",
        title: "Monthly",
        priceDisplay: monthlyPrice,
        periodDisplay: "/month",
        subtext: ready ? "Flexible • cancel anytime" : "Loading…",
        pkg: ready ? monthly : null,
        trialText: monthlyTrial,
      },
    ];
  }, [offerings]);

  const selectedPlan = useMemo(
    () => plans.find((p) => p.id === selected) ?? plans[0],
    [plans, selected]
  );

  /**
   * Post-purchase success handling.
   */
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

      // immediate UX unlock (local)
      setPlan("pro");

      const ident = await getEffectiveIdentity();
      if (!ident.uid) {
        setFinishingUnlock(false);
        Alert.alert("Error", "Missing user id. Please restart the app and try again.");
        return;
      }

      // Sync entitlements to Supabase with the freshest customerInfo
      try {
        const synced = await syncEntitlementsToSupabase({
          customerInfoOverride: customerInfo,
        });
        if (!synced) console.warn("[Paywall] Entitlements sync failed (continuing).");
      } catch (e) {
        console.warn("[Paywall] syncEntitlementsToSupabase crashed (continuing):", e);
      }

      // Confirm profile updated to pro
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

  /**
   * Purchase
   */
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

      const res = await Purchases.purchasePackage(selectedPlan.pkg);
      await afterUnlock(res.customerInfo);
    } catch (e: any) {
      const cancelled = !!(e as PurchasesError)?.userCancelled;
      if (cancelled) return;

      console.warn("[Paywall] Purchase failed:", e);
      Alert.alert("Purchase failed", normalizeOfferingsError(e));
    } finally {
      setPurchasing(false);
    }
  }, [
    purchasing,
    productsReady,
    selectedPlan,
    offeringsError,
    getEffectiveIdentity,
    afterUnlock,
  ]);

  /**
   * Restore
   */
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
      Alert.alert("Restore failed", normalizeOfferingsError(e));
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

  // Copy: if you want a specific “3-day free trial” line, keep it static
  // (actual eligibility is controlled by App Store subscription intro offer).
  const staticTrialLine = "Start with a 3-day free trial. Cancel anytime.";

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

        {/* status / error */}
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

        {/* plans */}
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

                    {/* trial line - prefer actual intro info if present, otherwise your static copy */}
                    <Text style={styles.trialInline}>
                      {p.trialText ? p.trialText : staticTrialLine}
                    </Text>

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

        {/* CTA */}
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

        {/* Secondary actions */}
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
    paddingTop: 18,
    paddingBottom: 80,
    minHeight: height * 0.92,
  },

  iconCircle: {
    width: 78,
    height: 78,
    borderRadius: 39,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },

  title: { color: "#FFFFFF", fontSize: 24, fontWeight: "800", marginBottom: 6 },

  subtitle: {
    color: "#9B9B9B",
    fontSize: 15,
    textAlign: "center",
    width: "86%",
    marginBottom: 16,
    lineHeight: 20,
  },

  glowBorder: {
    width: width * 0.9,
    borderRadius: 24,
    padding: 2,
    marginBottom: 14,
  },

  featureContainer: {
    backgroundColor: "#121416",
    borderRadius: 22,
    padding: 16,
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

  planWrap: { width: width * 0.9, gap: 12, marginTop: 6, marginBottom: 16 },

  planOuter: { width: "100%" },

  planBorder: { width: "100%", borderRadius: 22, padding: 2 },

  planCard: { backgroundColor: "#0F1215", borderRadius: 20, padding: 16 },

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

  trialInline: {
    color: "#6F7A83",
    fontSize: 12,
    marginTop: 8,
    lineHeight: 16,
  },

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
    width: "86%",
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