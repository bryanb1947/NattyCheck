// app/privacy.tsx
// ------------------------------------------------------
// Privacy Policy Screen
// - Full legal policy (ALL original content preserved)
// - Native iOS swipe-back using Stack.Screen gesture
// - Matches monthly-report swipe behavior exactly
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
  accentB: "#B8FF48",
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

export default function PrivacyPolicy() {
  const router = useRouter();

  return (
    <>
      {/* HEADER CONFIG - identical to monthly-report */}
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
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* INTRO CARD */}
          <View style={styles.introCard}>
            <Text style={styles.appName}>NattyCheck</Text>
            <Text style={styles.tagline}>
              AI Physique Analysis · Made for lifters
            </Text>
            <Text style={styles.updated}>Last updated: December 6, 2025</Text>

            <Text style={styles.introText}>
              This Privacy Policy explains how NattyCheck ("we," "us," or "our")
              collects, uses, and protects your information when you use our
              mobile application and related services (the "App").
            </Text>
          </View>

          {/* ----------------------------- */}
          {/* 1. What We Collect            */}
          {/* ----------------------------- */}
          <Section title="1. Information We Collect">
            <Text style={styles.paragraph}>
              We collect the minimum amount of data needed to provide accurate
              physique analysis, workout guidance, and your account experience.
            </Text>

            <Text style={styles.subheading}>1.1 Account Information</Text>
            <Bullet>Email address (for login, account recovery, and receipts).</Bullet>
            <Bullet>Username or display name.</Bullet>
            <Bullet>Subscription status (free, trial, premium).</Bullet>

            <Text style={styles.subheading}>1.2 Physique Photos & Analysis Data</Text>
            <Bullet>
              Photos you choose to upload for analysis (front, side, back, or other
              angles supported by the App).
            </Bullet>
            <Bullet>
              Derived AI metrics: body fat %, muscle scores, symmetry ratios,
              definition scores, “natty” score, and related outputs.
            </Bullet>
            <Bullet>
              Confidence scores based on lighting/pose — this reflects model
              certainty, not personal judgment.
            </Bullet>

            <Text style={styles.subheading}>1.3 Workout & Activity Data</Text>
            <Bullet>Logged workouts, exercises, sets, reps.</Bullet>
            <Bullet>Auto-generated workout plans + training summaries.</Bullet>
            <Bullet>Feature usage data to improve the product.</Bullet>

            <Text style={styles.subheading}>1.4 Device & Usage Information</Text>
            <Bullet>Device model, OS version, app version.</Bullet>
            <Bullet>Crash logs & diagnostic data.</Bullet>
            <Bullet>Approximate region/locale (never precise GPS).</Bullet>
          </Section>

          {/* ----------------------------- */}
          {/* 2. How We Use Data            */}
          {/* ----------------------------- */}
          <Section title="2. How We Use Your Information">
            <Bullet>To perform physique analysis + generate programs.</Bullet>
            <Bullet>To improve accuracy, stability, and AI reliability.</Bullet>
            <Bullet>To personalize training and recommendations.</Bullet>
            <Bullet>To process payments + subscriptions.</Bullet>
            <Bullet>To send important account or policy notifications.</Bullet>
          </Section>

          {/* ----------------------------- */}
          {/* 3. Photos & AI Training       */}
          {/* ----------------------------- */}
          <Section title="3. Photos, AI Models & Training">
            <Text style={styles.paragraph}>
              Physique photos are extremely sensitive, and we treat them that way.
            </Text>

            <Text style={styles.subheading}>3.1 Use of Your Photos</Text>
            <Bullet>
              Photos are used only to generate your analysis & display results to you.
            </Bullet>
            <Bullet>Photos are **never shared** publicly or with other users.</Bullet>

            <Text style={styles.subheading}>3.2 AI Training & Improvement</Text>
            <Text style={styles.paragraph}>
              In the app, you may see an option like “Allow photos for AI training.”
            </Text>

            <Bullet>
              If <Text style={styles.bold}>OFF</Text>: photos stay on your device and are
              **not** used for training.
            </Bullet>
            <Bullet>
              If <Text style={styles.bold}>ON</Text>: you give permission for anonymized
              photos + analysis data to be used to improve AI models.
            </Bullet>

            <Text style={styles.paragraph}>
              You can change this setting anytime inside the app.
            </Text>
          </Section>

          {/* ----------------------------- */}
          {/* 4. Legal Bases                */}
          {/* ----------------------------- */}
          <Section title="4. Legal Bases (Where Applicable)">
            <Bullet>Performance of contract (providing services).</Bullet>
            <Bullet>Legitimate interest (security, improvement, fraud prevention).</Bullet>
            <Bullet>Your consent (AI training opt-in, notifications).</Bullet>
          </Section>

          {/* ----------------------------- */}
          {/* 5. Sharing                    */}
          {/* ----------------------------- */}
          <Section title="5. Sharing of Your Information">
            <Text style={styles.paragraph}>We do NOT sell your personal data.</Text>

            <Text style={styles.subheading}>5.1 Service Providers</Text>
            <Bullet>Hosting, databases, payment processors, analytics.</Bullet>
            <Bullet>Vendors may only use data for services we request.</Bullet>

            <Text style={styles.subheading}>5.2 Legal & Safety</Text>
            <Bullet>Required by law, subpoena, or government request.</Bullet>
            <Bullet>To protect NattyCheck and its users.</Bullet>
          </Section>

          {/* ----------------------------- */}
          {/* 6. Retention                  */}
          {/* ----------------------------- */}
          <Section title="6. Data Retention">
            <Bullet>Account data retained while active + short period after.</Bullet>
            <Bullet>
              Photos/analyses removed upon account deletion where legally permitted.
            </Bullet>
          </Section>

          {/* ----------------------------- */}
          {/* 7. Rights                     */}
          {/* ----------------------------- */}
          <Section title="7. Your Rights & Choices">
            <Bullet>Access your data</Bullet>
            <Bullet>Request correction</Bullet>
            <Bullet>Request deletion (subject to limits)</Bullet>
            <Bullet>Object to certain processing</Bullet>
            <Bullet>Withdraw consent anytime</Bullet>

            <Text style={styles.paragraph}>
              Contact:{" "}
              <Text style={styles.highlight}>support@nattycheck.app</Text>
            </Text>
          </Section>

          {/* ----------------------------- */}
          {/* 8. Children                   */}
          {/* ----------------------------- */}
          <Section title="8. Children’s Privacy">
            <Text style={styles.paragraph}>
              NattyCheck is intended for adults. We do not knowingly collect data from
              children under 13.
            </Text>
          </Section>

          {/* ----------------------------- */}
          {/* 9. Security                   */}
          {/* ----------------------------- */}
          <Section title="9. Data Security">
            <Text style={styles.paragraph}>
              We implement reasonable safeguards, but no system is 100% secure. Keep
              your device and login protected.
            </Text>
          </Section>

          {/* ----------------------------- */}
          {/* 10. Changes                   */}
          {/* ----------------------------- */}
          <Section title="10. Changes to This Policy">
            <Text style={styles.paragraph}>
              Updates will reflect a new “Last updated” date and may be announced
              in-app or via email.
            </Text>
          </Section>

          {/* ----------------------------- */}
          {/* 11. Contact                   */}
          {/* ----------------------------- */}
          <Section title="11. Contact Us">
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
  safe: {
    flex: 1,
    backgroundColor: C.bg,
  },
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
  subheading: {
    color: C.text,
    fontSize: 13,
    fontWeight: "700",
    marginTop: 8,
    marginBottom: 4,
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
  bold: { fontWeight: "700" },
});
