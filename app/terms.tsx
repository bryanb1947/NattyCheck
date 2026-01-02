// app/terms.tsx
// ------------------------------------------------------
// Terms of Service Screen (NattyCheck LLC - Delaware)
// - Full legal ToS
// - Native iOS swipe-back using Stack.Screen gesture
// - Matches monthly-report & privacy screen behavior exactly
// ------------------------------------------------------

import React from "react";
import {
  ScrollView,
  Text,
  StyleSheet,
  Pressable,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Stack, useRouter } from "expo-router";

const C = {
  bg: "#0B0F10",
  card: "#0F1418",
  border: "#1D2A2F",
  text: "#E7F2EF",
  dim: "#9AA7AD",
  accentA: "#00FFE0",
};

function Section({ title, children }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function Bullet({ children }) {
  return (
    <View style={styles.bulletRow}>
      <Text style={styles.bulletDot}>•</Text>
      <Text style={styles.bulletText}>{children}</Text>
    </View>
  );
}

export default function TermsOfService() {
  const router = useRouter();

  return (
    <>
      {/* IDENTICAL TO MONTHLY-REPORT */}
      <Stack.Screen
        options={{
          headerShown: true,
          headerTransparent: true,
          headerTitle: "",
          gestureEnabled: true,
          headerLeft: () => (
            <Pressable
              onPress={() => router.back()}
              style={{ paddingLeft: 10, paddingVertical: 10 }}
            >
              <Ionicons name="chevron-back" size={30} color="white" />
            </Pressable>
          ),
        }}
      />

      <SafeAreaView style={styles.safe}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* INTRO CARD */}
          <View style={styles.introCard}>
            <Text style={styles.appName}>NattyCheck</Text>
            <Text style={styles.tagline}>AI Physique Analysis · Made for lifters</Text>
            <Text style={styles.updated}>Last updated: December 2025</Text>

            <Text style={styles.introText}>
              These Terms of Service ("Terms") govern your use of the NattyCheck mobile
              application and related services ("App"), operated by NattyCheck LLC
              ("we", "us", "our"). By using the App, you agree to these Terms.
            </Text>
          </View>

          {/* -------------------------------------------------- */}
          {/* 1. Eligibility */}
          {/* -------------------------------------------------- */}
          <Section title="1. Eligibility">
            <Bullet>You must be at least 18 years old to use NattyCheck.</Bullet>
            <Bullet>You must provide accurate account information.</Bullet>
            <Bullet>You may not use the App where prohibited by law.</Bullet>
          </Section>

          {/* -------------------------------------------------- */}
          {/* 2. Account */}
          {/* -------------------------------------------------- */}
          <Section title="2. Your Account">
            <Text style={styles.paragraph}>
              You are responsible for maintaining the confidentiality of your login
              credentials and for all activities that occur under your account.
            </Text>
            <Text style={styles.paragraph}>
              Notify us at <Text style={styles.highlight}>support@nattycheck.app</Text>{" "}
              if you suspect unauthorized access.
            </Text>
          </Section>

          {/* -------------------------------------------------- */}
          {/* 3. Subscriptions */}
          {/* -------------------------------------------------- */}
          <Section title="3. Subscriptions, Billing & Refunds">
            <Bullet>NattyCheck may offer free, trial, and paid tiers.</Bullet>
            <Bullet>
              Payments are processed by Apple/Google and follow their billing rules.
            </Bullet>
            <Bullet>
              Trials automatically convert to paid unless canceled 24 hours before
              renewal.
            </Bullet>
            <Bullet>All fees are non-refundable except where required by law.</Bullet>
            <Bullet>Manage your subscription in your App Store settings.</Bullet>
          </Section>

          {/* -------------------------------------------------- */}
          {/* 4. AI Content */}
          {/* -------------------------------------------------- */}
          <Section title="4. AI-Generated Content & Limitations">
            <Bullet>AI outputs are estimates and may be incomplete or inaccurate.</Bullet>
            <Bullet>
              Confidence scores reflect model certainty based on lighting/pose.
            </Bullet>
            <Bullet>
              AI results are for informational & entertainment purposes only.
            </Bullet>
            <Bullet>
              AI outputs do NOT constitute medical or professional fitness advice.
            </Bullet>
          </Section>

          {/* -------------------------------------------------- */}
          {/* 5. Fitness Disclaimer */}
          {/* -------------------------------------------------- */}
          <Section title="5. Health & Fitness Disclaimer">
            <Bullet>NattyCheck does not provide medical care or diagnosis.</Bullet>
            <Bullet>
              Consult a qualified medical or fitness professional before starting any
              exercise program.
            </Bullet>
            <Bullet>You assume all risks associated with physical training.</Bullet>
          </Section>

          {/* -------------------------------------------------- */}
          {/* 6. User Conduct */}
          {/* -------------------------------------------------- */}
          <Section title="6. Acceptable Use">
            <Bullet>No illegal, harmful, explicit, or abusive content.</Bullet>
            <Bullet>No reverse-engineering or tampering with the App.</Bullet>
            <Bullet>No attempts to bypass subscription paywalls.</Bullet>
          </Section>

          {/* -------------------------------------------------- */}
          {/* 7. User Content */}
          {/* -------------------------------------------------- */}
          <Section title="7. User Content & Licensing">
            <Text style={styles.paragraph}>
              You retain ownership of photos and content you upload.
            </Text>
            <Bullet>We process your photos to generate your analysis.</Bullet>
            <Bullet>We never show your photos publicly or to other users.</Bullet>
            <Bullet>
              We only use your photos for AI training if you explicitly opt in.
            </Bullet>
          </Section>

          {/* -------------------------------------------------- */}
          {/* 8. Intellectual Property */}
          {/* -------------------------------------------------- */}
          <Section title="8. Intellectual Property">
            <Bullet>
              All rights in the App (excluding your content) belong to NattyCheck LLC.
            </Bullet>
            <Bullet>You receive a revocable license for personal use only.</Bullet>
          </Section>

          {/* -------------------------------------------------- */}
          {/* 9. Termination */}
          {/* -------------------------------------------------- */}
          <Section title="9. Suspension & Termination">
            <Bullet>We may suspend accounts violating these Terms.</Bullet>
            <Bullet>You may delete your account at any time.</Bullet>
            <Bullet>No refunds are issued upon termination unless legally required.</Bullet>
          </Section>

          {/* -------------------------------------------------- */}
          {/* 10. Liability */}
          {/* -------------------------------------------------- */}
          <Section title="10. Limitation of Liability">
            <Bullet>
              We are not liable for indirect, incidental, or consequential damages.
            </Bullet>
            <Bullet>
              We are not liable for injuries related to workouts or training decisions.
            </Bullet>
            <Bullet>
              Your use of AI-generated outputs is solely at your own risk.
            </Bullet>
          </Section>

          {/* -------------------------------------------------- */}
          {/* 11. Governing Law */}
          {/* -------------------------------------------------- */}
          <Section title="11. Governing Law — State of Delaware">
            <Text style={styles.paragraph}>
              These Terms are governed by the laws of the State of Delaware, without
              regard to conflict-of-law principles.
            </Text>
          </Section>

          {/* -------------------------------------------------- */}
          {/* 12. Arbitration */}
          {/* -------------------------------------------------- */}
          <Section title="12. Dispute Resolution & Arbitration">
            <Text style={styles.paragraph}>
              Any disputes will be resolved exclusively through binding, individual
              arbitration. You waive the right to participate in class actions.
            </Text>
          </Section>

          {/* -------------------------------------------------- */}
          {/* 13. App Store Terms */}
          {/* -------------------------------------------------- */}
          <Section title="13. App Store Terms">
            <Bullet>Your use must also comply with Apple/Google policies.</Bullet>
            <Bullet>
              Third-party services used in the App follow their own terms.
            </Bullet>
          </Section>

          {/* -------------------------------------------------- */}
          {/* 14. Changes */}
          {/* -------------------------------------------------- */}
          <Section title="14. Changes to These Terms">
            <Text style={styles.paragraph}>
              We may update these Terms periodically. Continued use constitutes
              acceptance of changes.
            </Text>
          </Section>

          {/* -------------------------------------------------- */}
          {/* 15. Contact */}
          {/* -------------------------------------------------- */}
          <Section title="15. Contact Us">
            <Bullet>
              Email: <Text style={styles.highlight}>support@nattycheck.app</Text>
            </Bullet>
          </Section>

          <View style={{ height: 80 }} />
        </ScrollView>
      </SafeAreaView>
    </>
  );
}

/* ------------------------------------------------------ */
/* STYLES */
/* ------------------------------------------------------ */

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingBottom: 32 },

  introCard: {
    backgroundColor: C.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: C.border,
    marginTop: 60,
    marginBottom: 16,
  },
  appName: { color: C.text, fontSize: 18, fontWeight: "800" },
  tagline: { color: C.dim, fontSize: 13, marginTop: 4 },
  updated: { color: C.dim, fontSize: 12, marginTop: 6 },
  introText: {
    color: C.text,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 10,
  },

  section: {
    backgroundColor: C.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: C.border,
    marginBottom: 12,
  },
  sectionTitle: {
    color: C.text,
    fontSize: 14,
    fontWeight: "800",
    marginBottom: 8,
  },
  paragraph: {
    color: C.text,
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 4,
  },

  bulletRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 4,
  },
  bulletDot: {
    color: C.text,
    fontSize: 14,
    marginRight: 6,
    lineHeight: 18,
  },
  bulletText: {
    flex: 1,
    color: C.text,
    fontSize: 13,
    lineHeight: 18,
  },

  highlight: {
    color: C.accentA,
    fontWeight: "700",
  },
});
