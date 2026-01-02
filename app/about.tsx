// app/about.tsx
// ------------------------------------------------------
// About NattyCheck
// - Clean brand messaging
// - iOS-native swipe-back (same as Privacy/Terms)
// - What the app does, how it works, accuracy disclaimers,
//   founder transparency, and safety notes.
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

export default function AboutScreen() {
  const router = useRouter();

  return (
    <>
      {/* Enables native iOS swipe-back (gestureEnabled true) */}
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
            <Text style={styles.appName}>About NattyCheck</Text>
            <Text style={styles.tagline}>
              AI Physique Analysis · Honest · Private · Built for lifters
            </Text>

            <Text style={styles.introText}>
              NattyCheck is built for one purpose: helping lifters understand
              their physique, track progress intelligently, and train with
              confidence — without judgement, gimmicks, or fake promises.
            </Text>
          </View>

          {/* MISSION */}
          <Section title="Our Mission">
            <Text style={styles.paragraph}>
              Fitness apps often focus on surface-level motivation. NattyCheck
              focuses on clarity — delivering real quantitative insights about
              your physique so you can make smarter decisions about training,
              nutrition, and recovery.
            </Text>
            <Text style={styles.paragraph}>
              No filters. No sugar-coated feedback. Just honest analysis backed
              by real data and practical training logic.
            </Text>
          </Section>

          {/* HOW IT WORKS */}
          <Section title="How NattyCheck Works">
            <Text style={styles.paragraph}>
              NattyCheck uses a combination of:
            </Text>

            <Text style={styles.bullet}>• Computer vision</Text>
            <Text style={styles.bullet}>• AI physique scoring models</Text>
            <Text style={styles.bullet}>
              • Custom measurement heuristics (lighting, angles, symmetry)
            </Text>
            <Text style={styles.bullet}>
              • Strength & hypertrophy science (volume, intensity, progression)
            </Text>

            <Text style={[styles.paragraph, { marginTop: 8 }]}>
              These systems work together to estimate body fat, muscle balance,
              symmetry, weak points, strengths, and optimal training strategy.
            </Text>
          </Section>

          {/* PHOTO STORAGE */}
          <Section title="Your Photos & Privacy">
            <Text style={styles.paragraph}>
              Physique photos are extremely sensitive — and we treat them that way.
            </Text>

            <Text style={styles.bullet}>
              • Your photos are stored **locally on your device**.
            </Text>
            <Text style={styles.bullet}>
              • Nothing uploads to our servers unless you explicitly turn on
                "Allow photos for AI training".
            </Text>
            <Text style={styles.bullet}>
              • We cannot access your photos unless you choose to share them.
            </Text>

            <Text style={[styles.paragraph, { marginTop: 8 }]}>
              Privacy is not a feature — it’s the default.
            </Text>
          </Section>

          {/* ACCURACY DISCLAIMER */}
          <Section title="Accuracy & Limitations">
            <Text style={styles.paragraph}>
              NattyCheck provides estimates based on image analysis — not medical
              diagnostics. Photo quality, lighting, and pose can affect results.
            </Text>

            <Text style={styles.paragraph}>
              You should always use the app as a tool for guidance, not a
              substitute for professional medical advice.
            </Text>
          </Section>

          {/* WHO BUILT THIS */}
          <Section title="Who Built NattyCheck?">
            <Text style={styles.paragraph}>
              NattyCheck is built by lifters who were tired of:
            </Text>

            <Text style={styles.bullet}>• Fake influencers</Text>
            <Text style={styles.bullet}>• Guesswork about progress</Text>
            <Text style={styles.bullet}>
              • Apps that cared more about ads than results
            </Text>

            <Text style={[styles.paragraph, { marginTop: 8 }]}>
              Every feature in NattyCheck exists because it solves a real problem
              we personally dealt with in our own fitness journeys.
            </Text>
          </Section>

          {/* CONTACT */}
          <Section title="Contact & Support">
            <Text style={styles.paragraph}>
              Questions, bugs, or suggestions? We want to hear from you.
            </Text>

            <Text style={styles.highlight}>support@nattycheck.app</Text>
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
  appName: { color: C.text, fontSize: 20, fontWeight: "800" },
  tagline: { color: C.dim, fontSize: 12, marginTop: 4 },
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
    marginBottom: 14,
  },
  sectionTitle: {
    color: C.text,
    fontSize: 15,
    fontWeight: "800",
    marginBottom: 8,
  },
  paragraph: {
    color: C.text,
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 6,
  },
  bullet: {
    color: C.text,
    fontSize: 13,
    marginLeft: 6,
    marginBottom: 4,
  },
  highlight: {
    color: C.accentA,
    fontSize: 14,
    fontWeight: "700",
    marginTop: 6,
  },
});
