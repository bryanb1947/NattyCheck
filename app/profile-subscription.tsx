// app/profile-subscription.tsx
// ------------------------------------------------------
// Subscription Screen
// - iOS-native swipe-back (gestureEnabled)
// - Matches About / Privacy / Terms behavior
// - Clean premium vs free details, polished copy
// ------------------------------------------------------

import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { Stack, useRouter } from "expo-router";

import { useAuthStore } from "../store/useAuthStore";

export default function ProfileSubscriptionScreen() {
  const router = useRouter();
  const { plan, email } = useAuthStore();

  const normalizedPlan =
    plan === "premium" || plan === "pro" ? "Premium" : "Free";

  function handleManage() {
    Alert.alert(
      "Manage Subscription",
      "Connect this button to Stripe, RevenueCat, or your App Store billing portal."
    );
  }

  return (
    <>
      {/* Enables swipe-back like other profile subpages */}
      <Stack.Screen
        options={{
          headerShown: true,
          headerTransparent: true,
          headerTitle: "",
          gestureEnabled: true,
          headerLeft: () => (
            <TouchableOpacity
              onPress={() => router.back()}
              style={{ paddingLeft: 10, paddingVertical: 10 }}
            >
              <Ionicons name="chevron-back" size={30} color="white" />
            </TouchableOpacity>
          ),
        }}
      />

      <SafeAreaView style={styles.safe}>
        <ScrollView
          style={styles.scroll}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 40 }}
        >
          {/* CURRENT PLAN CARD */}
          <LinearGradient
            colors={["#00E6C8", "#9AF65B"]}
            style={styles.planCard}
          >
            <Text style={styles.planLabel}>Current Plan</Text>
            <Text style={styles.planName}>{normalizedPlan}</Text>
            {!!email && <Text style={styles.planEmail}>{email}</Text>}
          </LinearGradient>

          {/* WHAT YOU GET */}
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>What you get</Text>

            {normalizedPlan === "Premium" ? (
              <>
                <Bullet text="Unlimited physique scans with full advanced AI breakdown." />
                <Bullet text="AI-powered workout plans adapted to your training history." />
                <Bullet text="Monthly progress reports using your first and last scan each month." />
                <Bullet text="Advanced symmetry, weak point, and hypertrophy targeting analysis." />
              </>
            ) : (
              <>
                <Bullet text="Basic physique scans with simplified results." />
                <Bullet text="Unlock Premium for full analysis, training analytics, and monthly reports." />
              </>
            )}
          </View>

          {/* CTA */}
          <TouchableOpacity activeOpacity={0.9} onPress={handleManage}>
            <LinearGradient
              colors={["#00E6C8", "#9AF65B"]}
              style={styles.cta}
            >
              <Text style={styles.ctaText}>
                {normalizedPlan === "Premium"
                  ? "Manage Subscription"
                  : "Upgrade to Premium"}
              </Text>
            </LinearGradient>
          </TouchableOpacity>

          <Text style={styles.footerHint}>
            Purchases and billing are securely handled by the App Store or Play
            Store. NattyCheck never stores your card details.
          </Text>
        </ScrollView>
      </SafeAreaView>
    </>
  );
}

function Bullet({ text }: { text: string }) {
  return (
    <View style={styles.bulletRow}>
      <View style={styles.bulletDot} />
      <Text style={styles.bulletText}>{text}</Text>
    </View>
  );
}

/* ------------------------------------------------------ */
/* STYLES */
/* ------------------------------------------------------ */

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#0B0D0F",
  },
  scroll: {
    flex: 1,
    paddingHorizontal: 16,
  },

  /* PLAN CARD */
  planCard: {
    borderRadius: 18,
    padding: 20,
    marginTop: 60,
    marginBottom: 18,
  },
  planLabel: {
    color: "#022119",
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 4,
  },
  planName: {
    color: "#00110A",
    fontSize: 24,
    fontWeight: "800",
    marginBottom: 6,
  },
  planEmail: {
    color: "#063328",
    fontSize: 12,
  },

  /* CARD SECTIONS */
  card: {
    backgroundColor: "#111417",
    borderRadius: 18,
    padding: 18,
    marginBottom: 18,
  },
  sectionTitle: {
    color: "#C8FFD6",
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 10,
  },

  /* BULLETS */
  bulletRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 10,
  },
  bulletDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "#9AF65B",
    marginRight: 10,
    marginTop: 6,
  },
  bulletText: {
    color: "#D6E3EA",
    fontSize: 13,
    flex: 1,
    lineHeight: 18,
  },

  /* CTA */
  cta: {
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  ctaText: {
    color: "#00110A",
    fontSize: 16,
    fontWeight: "800",
  },

  footerHint: {
    marginTop: 12,
    color: "#8B97A0",
    fontSize: 11,
    textAlign: "center",
    marginBottom: 30,
    paddingHorizontal: 16,
  },
});
