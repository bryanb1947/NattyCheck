// app/profile-subscription.tsx
// ------------------------------------------------------
// Subscription Screen
// - Uses ONLY plan_normalized ("free" | "pro")
// - No legacy plan guessing
// - Clean, deterministic rendering
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

  // 🔒 SINGLE SOURCE OF TRUTH
  const plan = useAuthStore((s) => s.plan); // "free" | "pro"
  const email = useAuthStore((s) => s.email);

  const isPro = plan === "pro";

  function handleManage() {
    Alert.alert(
      isPro ? "Manage Subscription" : "Upgrade to Premium",
      "Wire this button to RevenueCat / App Store billing portal."
    );
  }

  return (
    <>
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
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 40 }}
          style={styles.scroll}
        >
          {/* CURRENT PLAN */}
          <LinearGradient
            colors={["#00E6C8", "#9AF65B"]}
            style={styles.planCard}
          >
            <Text style={styles.planLabel}>Current Plan</Text>
            <Text style={styles.planName}>{isPro ? "Premium" : "Free"}</Text>
            {!!email && <Text style={styles.planEmail}>{email}</Text>}
          </LinearGradient>

          {/* BENEFITS */}
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>What you get</Text>

            {isPro ? (
              <>
                <Bullet text="Unlimited physique scans with full AI breakdown." />
                <Bullet text="Advanced muscle symmetry & weak-point analysis." />
                <Bullet text="AI-generated workout plans tailored to your history." />
                <Bullet text="Monthly progress reports and trend insights." />
              </>
            ) : (
              <>
                <Bullet text="Basic physique scans with limited results." />
                <Bullet text="Upgrade to unlock full AI analysis and workouts." />
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
                {isPro ? "Manage Subscription" : "Upgrade to Premium"}
              </Text>
            </LinearGradient>
          </TouchableOpacity>

          <Text style={styles.footerHint}>
            Billing is securely handled by the App Store. NattyCheck never stores
            your payment details.
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
  },
  planName: {
    color: "#00110A",
    fontSize: 24,
    fontWeight: "800",
    marginVertical: 6,
  },
  planEmail: {
    color: "#063328",
    fontSize: 12,
  },

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
    paddingHorizontal: 16,
  },
});
