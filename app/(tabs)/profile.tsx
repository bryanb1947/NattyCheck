// app/(tabs)/profile.tsx
// ------------------------------------------------------
// Profile Home Screen
// - Clean UI
// - Correct routing
// - Loads Supabase profile
// - Shows username, email, plan
// - Sections: Account / Privacy & Data / Support
// - Redirects to login if not authenticated
// ------------------------------------------------------

import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  Image,
  ActivityIndicator,
  Switch,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

import { supabase } from "../../lib/supabase";
import { useAuthStore } from "../../store/useAuthStore";

const C = {
  bg: "#0B0F10",
  card: "#0F1418",
  border: "#1C262C",
  text: "#F2FBF9",
  dim: "#9AA7AD",
  accentA: "#00FFE0",
  accentB: "#B8FF48",
  danger: "#FF4E4E",
};

type LocalPlan = "free" | "premium" | "trial";

function normalizeToLocalPlan(raw: any): LocalPlan {
  const v = String(raw ?? "").trim().toLowerCase();
  if (v === "pro" || v === "premium" || v === "paid") return "premium";
  if (v === "trial") return "trial";
  return "free";
}

function normalizeToAuthPlan(raw: any): "free" | "pro" {
  const v = String(raw ?? "").trim().toLowerCase();
  if (v === "pro" || v === "premium" || v === "paid") return "pro";
  return "free";
}

/* ------------------------------------------------------ */
/* MAIN PROFILE SCREEN */
/* ------------------------------------------------------ */

export default function ProfileScreen() {
  const router = useRouter();

  const userId = useAuthStore((s) => s.userId);
  const email = useAuthStore((s) => s.email);
  const hasHydrated = useAuthStore((s) => s.hasHydrated);
  const authPlan = useAuthStore((s) => s.plan);

  const setIdentity = useAuthStore((s) => s.setIdentity);
  const setPlanInStore = useAuthStore((s) => s.setPlan);
  const logoutLocal = useAuthStore((s) => s.logout);

  const [loading, setLoading] = useState(true);
  const [username, setUsername] = useState("User");
  const [plan, setPlan] = useState<LocalPlan>("free");

  /* --------------------------
     LOAD PROFILE FROM SUPABASE
  --------------------------- */
  const loadProfile = useCallback(async () => {
    if (!userId) return;

    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();

      if (error) {
        console.log("Profile lookup error:", error.message);
        return;
      }

      if (!data) {
        // No profile row found — treat as free (but don’t crash)
        console.log("⚠️ No profile row found for user. Treating as free.");
        setUsername("User");
        setPlan("free");
        setPlanInStore("free");
        return;
      }

      setUsername(data.username ?? "User");

      const localPlan = normalizeToLocalPlan(data.plan);
      setPlan(localPlan);

      // Keep Zustand store updated using the NEW API
      setPlanInStore(normalizeToAuthPlan(data.plan));

      // Keep email in store consistent (optional)
      const nextEmail = data.email ?? email;
      if (nextEmail && nextEmail !== email) {
        setIdentity({ userId, email: nextEmail });
      }
    } catch (err) {
      console.log("Profile load exception:", err);
    } finally {
      setLoading(false);
    }
  }, [userId, email, setIdentity, setPlanInStore]);

  useEffect(() => {
    if (!hasHydrated) return;

    if (!userId) {
      router.replace("/login");
      return;
    }

    loadProfile();
  }, [hasHydrated, userId, loadProfile, router]);

  /* --------------------------
     LOGOUT
  --------------------------- */
  const logout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.log("Supabase signOut error:", e);
    }

    // Clear local store properly
    logoutLocal();

    router.replace("/login");
  };

  /* --------------------------
     HEADER LOADING STATE
  --------------------------- */
  if (!hasHydrated || loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={C.accentA} />
          <Text style={styles.loadingText}>Loading profile…</Text>
        </View>
      </SafeAreaView>
    );
  }

  const planLabel =
    plan === "premium" ? "Premium" : plan === "trial" ? "Free Trial" : "Free";

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* TOP PROFILE CARD */}
        <LinearGradient
          colors={["#10181C", "#0F1418"]}
          start={[0, 0]}
          end={[1, 1]}
          style={styles.headerCard}
        >
          <View style={styles.headerRow}>
            <View style={styles.avatar}>
              <Ionicons name="person-outline" size={30} color="#E8F3F1" />
            </View>

            <View style={{ flex: 1 }}>
              <Text style={styles.username}>{username}</Text>
              <Text style={styles.email}>{email || "No email on file"}</Text>

              <View style={styles.badgeRow}>
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{planLabel}</Text>
                </View>

                {/* Optional: show store plan (debug) */}
                <View style={[styles.badge, { marginLeft: 8 }]}>
                  <Text style={styles.badgeText}>
                    Store: {authPlan === "pro" ? "Pro" : "Free"}
                  </Text>
                </View>
              </View>
            </View>

            <Image
              source={{
                uri: "https://cdn-icons-png.flaticon.com/512/6018/6018479.png",
              }}
              style={styles.armIcon}
            />
          </View>
        </LinearGradient>

        {/* ACCOUNT SECTION */}
        <Section title="Account">
          <Row
            icon="person-outline"
            label="Edit Profile"
            onPress={() => router.push("/profile-edit")}
          />
          <Row
            icon="notifications-outline"
            label="Notifications"
            onPress={() => router.push("/profile-notifications")}
          />
          <Row
            icon="card-outline"
            label="Subscription"
            trailingText={planLabel}
            onPress={() => router.push("/profile-subscription")}
          />
        </Section>

        {/* PRIVACY & DATA */}
        <Section title="Privacy & Data">
          <ToggleRow label="Allow photos for AI training" />
          <Row
            icon="shield-checkmark-outline"
            label="Data & Account Controls"
            onPress={() => router.push("/profile-data-controls")}
          />
        </Section>

        {/* SUPPORT SECTION */}
        <Section title="Support & Info">
          <Row
            icon="help-circle-outline"
            label="Help & Support"
            onPress={() => router.push("/support")}
          />
          <Row
            icon="information-circle-outline"
            label="About NattyCheck"
            onPress={() => router.push("/about")}
          />
          <Row
            icon="shield-checkmark-outline"
            label="Privacy Policy"
            onPress={() => router.push("/privacy")}
          />
          <Row
            icon="document-text-outline"
            label="Terms of Service"
            onPress={() => router.push("/terms")}
          />
        </Section>

        {/* LOGOUT BUTTON */}
        <Pressable
          style={styles.logoutBtn}
          onPress={() => {
            Alert.alert("Log Out", "Are you sure?", [
              { text: "Cancel", style: "cancel" },
              { text: "Log Out", style: "destructive", onPress: logout },
            ]);
          }}
        >
          <Text style={styles.logoutText}>Log Out</Text>
        </Pressable>

        {/* FOOTER */}
        <View style={{ alignItems: "center", marginTop: 24 }}>
          <Text style={styles.footer}>NattyCheck v1.0.8</Text>
          <Text style={styles.footer}>AI Physique Analysis · Made for lifters</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

/* ------------------------------------------------------ */
/* COMPONENTS */
/* ------------------------------------------------------ */

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function Row({
  icon,
  label,
  trailingText,
  onPress,
}: {
  icon: any;
  label: string;
  trailingText?: string;
  onPress: () => void;
}) {
  return (
    <Pressable style={styles.row} onPress={onPress}>
      <View style={styles.rowLeft}>
        <Ionicons name={icon} size={18} color={C.text} />
        <Text style={styles.rowText}>{label}</Text>
      </View>

      {trailingText ? (
        <Text style={styles.trailing}>{trailingText}</Text>
      ) : (
        <Ionicons name="chevron-forward" size={18} color={C.dim} />
      )}
    </Pressable>
  );
}

function ToggleRow({ label }: { label: string }) {
  const [value, setValue] = useState(false);

  return (
    <View style={styles.row}>
      <Text style={styles.rowText}>{label}</Text>
      <Switch
        value={value}
        onValueChange={setValue}
        trackColor={{ false: "#394147", true: C.accentA }}
        thumbColor={value ? C.bg : "#68757D"}
      />
    </View>
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
    padding: 16,
    paddingBottom: 40,
  },

  /* Loading */
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  loadingText: { color: C.text, marginTop: 10 },

  /* Header Card */
  headerCard: {
    borderRadius: 18,
    padding: 16,
    marginBottom: 16,
    position: "relative",
  },
  headerRow: { flexDirection: "row", alignItems: "center" },
  avatar: {
    width: 54,
    height: 54,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.05)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  username: { color: "#fff", fontWeight: "800", fontSize: 18 },
  email: { color: C.dim, fontSize: 13, marginTop: 2 },

  badgeRow: { flexDirection: "row", marginTop: 8, flexWrap: "wrap" },
  badge: {
    backgroundColor: "rgba(255,255,255,0.08)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  badgeText: { color: "#ECF5F2", fontWeight: "700", fontSize: 11 },

  armIcon: {
    width: 36,
    height: 36,
    position: "absolute",
    right: 8,
    top: 8,
    opacity: 0.8,
  },

  /* Sections */
  section: {
    backgroundColor: C.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: C.border,
    marginBottom: 16,
  },
  sectionTitle: {
    color: C.text,
    fontSize: 14,
    fontWeight: "800",
    marginBottom: 8,
  },

  /* Row */
  row: {
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: C.border,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  rowLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  rowText: { color: C.text, fontSize: 14, fontWeight: "600" },
  trailing: { color: C.dim, fontSize: 14, fontWeight: "700" },

  /* Logout */
  logoutBtn: {
    marginTop: 4,
    paddingVertical: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: C.danger,
    alignItems: "center",
  },
  logoutText: { color: C.danger, fontWeight: "700", fontSize: 15 },

  /* Footer */
  footer: { color: C.dim, fontSize: 11, textAlign: "center" },
});
