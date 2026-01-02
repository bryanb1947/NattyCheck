// app/profile-help.tsx
// ------------------------------------------------------
// Help & Support
// - Native iOS swipe-back (Stack.Screen gesture)
// - Clean support UI for NattyCheck
// ------------------------------------------------------

import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Linking,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Stack, useRouter } from "expo-router";

const C = {
  bg: "#0B0D0F",
  card: "#111417",
  border: "#1B2228",
  text: "#FFFFFF",
  dim: "#88929A",
  accentA: "#00E6C8",
  accentB: "#9AF65B",
};

function Section({ title, children }: { title: string; children: any }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

export default function HelpSupportScreen() {
  const router = useRouter();
  const APP_VERSION = "1.0.0"; // You can pull this dynamically if needed

  return (
    <>
      {/* HEADER CONFIG — identical to Notifications/Privacy/Terms */}
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
              <Ionicons name="chevron-back" size={30} color="#ffffff" />
            </Pressable>
          ),
        }}
      />

      <SafeAreaView style={styles.safe}>
        <ScrollView
          style={styles.scroll}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 40 }}
        >
          {/* TOP CARD */}
          <View style={styles.topCard}>
            <Text style={styles.topTitle}>Need help?</Text>
            <Text style={styles.topText}>
              We’re here to support you with anything related to physique scans,
              subscriptions, or workout programming.
            </Text>
          </View>

          {/* CONTACT SECTION */}
          <Section title="Contact Support">
            <Pressable
              style={styles.row}
              onPress={() => Linking.openURL("mailto:support@nattycheck.app")}
            >
              <Ionicons name="mail-outline" size={20} color={C.accentA} />
              <Text style={styles.rowText}>support@nattycheck.app</Text>
            </Pressable>

            <Pressable
              style={styles.row}
              onPress={() => router.push("/privacy")}
            >
              <Ionicons name="document-text-outline" size={20} color={C.accentA} />
              <Text style={styles.rowText}>View Privacy Policy</Text>
            </Pressable>

            <Pressable
              style={[styles.row, { borderBottomWidth: 0 }]}
              onPress={() => router.push("/terms")}
            >
              <Ionicons name="shield-checkmark-outline" size={20} color={C.accentA} />
              <Text style={styles.rowText}>View Terms of Service</Text>
            </Pressable>
          </Section>

          {/* FAQ */}
          <Section title="FAQ">
            <Text style={styles.faqQ}>Why is my scan taking long?</Text>
            <Text style={styles.faqA}>
              Most scans finish within 15–30 seconds. If it takes longer, check
              your connection or retry the upload.
            </Text>

            <Text style={styles.faqQ}>Why do poses matter?</Text>
            <Text style={styles.faqA}>
              The AI model relies on consistent angles and lighting. Follow the
              in-app example poses for best accuracy.
            </Text>

            <Text style={styles.faqQ}>How is my data stored?</Text>
            <Text style={styles.faqA}>
              Your photos stay local unless you explicitly enable AI-training
              sharing. Scans and metrics are securely tied to your account.
            </Text>

            <Text style={styles.faqQ}>Why is my physique score different each time?</Text>
            <Text style={styles.faqA}>
              Changes in lighting, pose, and camera distance can impact the
              AI confidence. We recommend consistent scanning conditions.
            </Text>
          </Section>

          {/* TROUBLESHOOTING */}
          <Section title="Troubleshooting">
            <Text style={styles.troubleItem}>• Restart the app if scans freeze.</Text>
            <Text style={styles.troubleItem}>• Check internet connection during uploads.</Text>
            <Text style={styles.troubleItem}>• Make sure camera permissions are enabled.</Text>
            <Text style={styles.troubleItem}>
              • Update to the latest version for stability fixes.
            </Text>
          </Section>

          {/* APP VERSION */}
          <Text style={styles.version}>NattyCheck v{APP_VERSION}</Text>
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
  scroll: {
    flex: 1,
    paddingHorizontal: 16,
  },

  topCard: {
    backgroundColor: C.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: C.border,
    marginTop: 60,
    marginBottom: 16,
  },
  topTitle: {
    color: C.text,
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 6,
  },
  topText: {
    color: C.dim,
    fontSize: 13,
    lineHeight: 18,
  },

  section: {
    backgroundColor: C.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: C.border,
    marginBottom: 16,
  },
  sectionTitle: {
    color: C.text,
    fontSize: 15,
    fontWeight: "800",
    marginBottom: 10,
  },

  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  rowText: {
    color: C.text,
    fontSize: 14,
    marginLeft: 10,
  },

  faqQ: {
    color: C.text,
    fontSize: 14,
    fontWeight: "700",
    marginTop: 8,
  },
  faqA: {
    color: C.dim,
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 6,
  },

  troubleItem: {
    color: C.dim,
    fontSize: 13,
    marginBottom: 4,
  },

  version: {
    color: C.dim,
    textAlign: "center",
    fontSize: 12,
    marginTop: 12,
    marginBottom: 24,
  },
});
