// app/paywall.tsx
import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  ScrollView,
  Pressable,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

const { width, height } = Dimensions.get("window");

type PlanId = "annual" | "monthly";

type PlanOption = {
  id: PlanId;
  title: string;
  price: string;
  period: string;
  subtext: string;
  badge?: string;
};

export default function PaywallScreen() {
  const router = useRouter();
  const [selected, setSelected] = useState<PlanId>("annual");
  const [showStubModal, setShowStubModal] = useState(false);

  // ✅ UI-only pricing placeholders (replace later with RevenueCat / StoreKit)
  const plans: PlanOption[] = useMemo(
    () => [
      {
        id: "annual",
        title: "Annual",
        price: "$59.99",
        period: "/year",
        subtext: "Best value • ~ $4.99/month",
        badge: "Most Popular",
      },
      {
        id: "monthly",
        title: "Monthly",
        price: "$9.99",
        period: "/month",
        subtext: "Flexible • cancel anytime",
      },
    ],
    []
  );

  const selectedPlan = useMemo(
    () => plans.find((p) => p.id === selected) ?? plans[0],
    [plans, selected]
  );

  /**
   * IMPORTANT:
   * This screen must NOT upgrade the user.
   * It only initiates purchase UI (later) or shows placeholder.
   * plan="pro" is set ONLY after confirmed purchase elsewhere.
   */
  const handleUnlock = () => {
    // TEMP: purchase flow not wired
    setShowStubModal(true);
  };

  const handleRestore = () => {
    // TEMP: restore flow not wired
    setShowStubModal(true);
  };

  const handleBack = () => {
    // Choose ONE:
    // 1) Go back to blurred/locked results screen if you have it:
    // router.replace("/lockedresults");

    // 2) Or send them to analyze screen:
    router.replace("/analyze");
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      <View style={styles.bgGlow} pointerEvents="none" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        style={{ flex: 1 }}
        contentContainerStyle={styles.scrollContent}
      >
        {/* HEADER ICON */}
        <LinearGradient colors={["#00FFE0", "#B8FF48"]} style={styles.iconCircle}>
          <Ionicons name="flash" size={36} color="#0A0B0C" />
        </LinearGradient>

        <Text style={styles.title}>Unlock Full Analysis</Text>
        <Text style={styles.subtitle}>
          Get elite feedback, a brutal breakdown, and personalized recommendations.
        </Text>

        {/* FEATURE LIST CARD */}
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

        {/* PLAN PICKER */}
        <View style={styles.planWrap}>
          {plans.map((p) => {
            const active = p.id === selected;
            return (
              <TouchableOpacity
                key={p.id}
                activeOpacity={0.9}
                onPress={() => setSelected(p.id)}
                style={styles.planOuter}
              >
                <LinearGradient
                  colors={active ? ["#00FFE0", "#B8FF48"] : ["#20262B", "#20262B"]}
                  style={styles.planBorder}
                >
                  <View style={[styles.planCard, active && styles.planCardActive]}>
                    <View style={styles.planTopRow}>
                      <Text style={[styles.planTitle, active && styles.planTitleActive]}>
                        {p.title}
                      </Text>

                      {!!p.badge && (
                        <View style={styles.badge}>
                          <Text style={styles.badgeText}>{p.badge}</Text>
                        </View>
                      )}
                    </View>

                    <View style={styles.planPriceRow}>
                      <Text style={[styles.planPrice, active && styles.planPriceActive]}>
                        {p.price}
                      </Text>
                      <Text style={styles.planPeriod}>{p.period}</Text>
                    </View>

                    <Text style={styles.planSubtext}>{p.subtext}</Text>

                    <View style={styles.radioRow}>
                      <View style={[styles.radioOuter, active && styles.radioOuterActive]}>
                        {active ? <View style={styles.radioInner} /> : null}
                      </View>
                      <Text style={styles.radioText}>
                        {active ? "Selected" : "Select"}
                      </Text>
                    </View>
                  </View>
                </LinearGradient>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* CTA */}
        <TouchableOpacity style={styles.ctaWrapper} activeOpacity={0.9} onPress={handleUnlock}>
          <LinearGradient colors={["#00FFE0", "#B8FF48"]} style={styles.ctaButton}>
            <Text style={styles.ctaText}>
              Start Free Trial • {selectedPlan.title}
            </Text>
          </LinearGradient>
        </TouchableOpacity>

        <Text style={styles.trialText}>
          3-day free trial • Then {selectedPlan.price} {selectedPlan.period} • Cancel anytime
        </Text>

        {/* SECONDARY ACTIONS */}
        <View style={styles.secondaryRow}>
          <TouchableOpacity onPress={handleRestore} activeOpacity={0.8} style={styles.secondaryBtn}>
            <Ionicons name="refresh" size={16} color="#C9D3DA" />
            <Text style={styles.secondaryText}>Restore Purchases</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={handleBack} activeOpacity={0.8} style={styles.secondaryBtn}>
            <Ionicons name="arrow-back" size={16} color="#C9D3DA" />
            <Text style={styles.secondaryText}>Back</Text>
          </TouchableOpacity>
        </View>

        {/* FOOTER */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Payment will be charged to your Apple ID at confirmation of purchase.
          </Text>
          <Text style={styles.footerText}>
            Subscription auto-renews unless cancelled at least 24 hours before end of period.
          </Text>

          <View style={styles.footerLinksRow}>
            <Text style={styles.footerLink}>Terms</Text>
            <Text style={styles.footerDot}>•</Text>
            <Text style={styles.footerLink}>Privacy</Text>
            <Text style={styles.footerDot}>•</Text>
            <Text style={styles.footerLink}>Support</Text>
          </View>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* PLACEHOLDER MODAL (no Alert spam) */}
      {showStubModal && (
        <View style={styles.modalOverlay}>
          <Pressable style={styles.modalOverlayPress} onPress={() => setShowStubModal(false)} />
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Payments not wired yet</Text>
            <Text style={styles.modalBody}>
              This is a placeholder paywall UI. When we hook up purchases, this button will
              pull real App Store prices and start checkout.
            </Text>

            <TouchableOpacity
              activeOpacity={0.9}
              onPress={() => setShowStubModal(false)}
              style={{ width: "100%" }}
            >
              <LinearGradient colors={["#00FFE0", "#B8FF48"]} style={styles.modalBtn}>
                <Text style={styles.modalBtnText}>Got it</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

/* ---------------------------------------------
   STYLES
--------------------------------------------- */

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#0A0B0C",
  },

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

  title: {
    color: "#FFFFFF",
    fontSize: 24,
    fontWeight: "800",
    marginBottom: 6,
  },

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

  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
  },

  featureText: {
    color: "#E8E8E8",
    fontSize: 15,
    marginLeft: 10,
  },

  planWrap: {
    width: width * 0.9,
    gap: 12,
    marginTop: 6,
    marginBottom: 18,
  },

  planOuter: {
    width: "100%",
  },

  planBorder: {
    width: "100%",
    borderRadius: 22,
    padding: 2,
  },

  planCard: {
    backgroundColor: "#0F1215",
    borderRadius: 20,
    padding: 18,
  },

  planCardActive: {
    backgroundColor: "#0B0F12",
  },

  planTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },

  planTitle: {
    color: "#EAEAEA",
    fontSize: 16,
    fontWeight: "700",
  },

  planTitleActive: {
    color: "#0A0B0C",
  },

  badge: {
    backgroundColor: "#B8FF48",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },

  badgeText: {
    color: "#0A0B0C",
    fontSize: 12,
    fontWeight: "800",
  },

  planPriceRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 6,
  },

  planPrice: {
    color: "#FFFFFF",
    fontSize: 30,
    fontWeight: "900",
  },

  planPriceActive: {
    color: "#0A0B0C",
  },

  planPeriod: {
    color: "#A3A3A3",
    fontSize: 14,
    marginBottom: 4,
  },

  planSubtext: {
    color: "#A3A3A3",
    fontSize: 13,
    marginTop: 6,
  },

  radioRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 14,
  },

  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: "#2A3238",
    alignItems: "center",
    justifyContent: "center",
  },

  radioOuterActive: {
    borderColor: "#0A0B0C",
  },

  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#0A0B0C",
  },

  radioText: {
    color: "#C9D3DA",
    fontSize: 13,
  },

  ctaWrapper: {
    width: width * 0.9,
    marginTop: 2,
  },

  ctaButton: {
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: "center",
  },

  ctaText: {
    color: "#0A0B0C",
    fontWeight: "900",
    fontSize: 15,
  },

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

  secondaryText: {
    color: "#C9D3DA",
    fontSize: 13,
    fontWeight: "700",
  },

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

  footerLinksRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 6,
  },

  footerLink: {
    color: "#B8FF48",
    fontSize: 12,
    fontWeight: "700",
  },

  footerDot: {
    color: "#40505B",
    fontSize: 12,
  },

  // Modal
  modalOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.55)",
    padding: 16,
  },

  modalOverlayPress: {
    flex: 1,
  },

  modalCard: {
    backgroundColor: "#0F1215",
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: "#1B2228",
    ...Platform.select({
      ios: { shadowColor: "#000", shadowOpacity: 0.35, shadowRadius: 18, shadowOffset: { width: 0, height: 8 } },
      android: { elevation: 10 },
      default: {},
    }),
  },

  modalTitle: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "900",
    marginBottom: 8,
  },

  modalBody: {
    color: "#A3A3A3",
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 14,
  },

  modalBtn: {
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
  },

  modalBtnText: {
    color: "#0A0B0C",
    fontSize: 14,
    fontWeight: "900",
  },
});
