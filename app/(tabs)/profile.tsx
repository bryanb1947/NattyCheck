// app/(tabs)/profile.tsx
// ------------------------------------------------------
// Profile Home Screen (canonical)
// - Loads Supabase profile
// - Shows username, email, plan (FREE / PREMIUM)
// - Uses ONLY profiles.plan_normalized
// - Redirects to /login if not authenticated
// - Logout uses ONLY useAuthStore.logout() (no direct supabase.signOut here)
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

import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/store/useAuthStore";

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

type CanonPlan = "free" | "pro";

function normalizePlan(v: any): CanonPlan {
  const s = String(v ?? "").trim().toLowerCase();
  return s === "pro" ? "pro" : "free";
}

function planLabel(plan: CanonPlan) {
  return plan === "pro" ? "Premium" : "Free";
}

export default function ProfileScreen() {
  const router = useRouter();

  const userId = useAuthStore((s) => s.userId);
  const email = useAuthStore((s) => s.email);
  const hasHydrated = useAuthStore((s) => s.hasHydrated);
  const hasBootstrappedSession = useAuthStore((s) => s.hasBootstrappedSession);

  const setIdentity = useAuthStore((s) => s.setIdentity);
  const setPlanInStore = useAuthStore((s) => s.setPlan);
  const logoutStore = useAuthStore((s) => s.logout);

  const [loading, setLoading] = useState(true);
  const [username, setUsername] = useState("User");
  const [plan, setPlan] = useState<CanonPlan>("free");

  const loadProfile = useCallback(async () => {
    setLoading(true);

    try {
      // Session is source of truth
      const {
        data: { session },
        error: sessErr,
      } = await supabase.auth.getSession();

      if (sessErr) console.log("❌ getSession error:", sessErr.message);

      const u = session?.user ?? null;
      const uid = u?.id ?? null;
      const em = u?.email ?? null;

      if (!uid) {
        // Not authenticated -> go login
        setUsername("User");
        setPlan("free");
        setPlanInStore("free");
        router.replace("/login");
        return;
      }

      // Keep auth store aligned (even if store was stale)
      setIdentity({ userId: uid, email: em ?? null });

      const { data, error } = await supabase
        .from("profiles")
        .select("user_id, email, username, plan_normalized")
        .eq("user_id", uid)
        .maybeSingle();

      if (error) {
        console.log("❌ Profile lookup error:", error.message);
        setUsername("User");
        setPlan("free");
        setPlanInStore("free");
        return;
      }

      if (!data) {
        console.log("⚠️ No profile row found. Treating as FREE.");
        setUsername("User");
        setPlan("free");
        setPlanInStore("free");
        return;
      }

      setUsername(data.username ?? "User");

      const normalized = normalizePlan(data.plan_normalized);
      setPlan(normalized);
      setPlanInStore(normalized);

      const nextEmail = data.email ?? em ?? "";
      if (nextEmail && nextEmail !== email) {
        setIdentity({ userId: uid, email: nextEmail });
      }
    } catch (e: any) {
      console.log("❌ Profile load exception:", e?.message ?? e);
      setUsername("User");
      setPlan("free");
      setPlanInStore("free");
    } finally {
      setLoading(false);
    }
  }, [router, setIdentity, setPlanInStore, email]);

  useEffect(() => {
    // Wait for auth bootstrap so we don't read stale session/store
    if (!hasHydrated || !hasBootstrappedSession) return;

    // If store says logged out, confirm session before redirect
    // (avoids flicker on cold start)
    (async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.user?.id && !userId) {
        router.replace("/login");
        return;
      }

      loadProfile();
    })();
  }, [hasHydrated, hasBootstrappedSession, userId, loadProfile, router]);

  const handleLogout = async () => {
    try {
      // ✅ Only use store logout (it calls supabase.auth.signOut internally)
      await logoutStore();
    } catch (e) {
      console.log("Logout error:", e);
    } finally {
      router.replace("/login");
    }
  };

  if (!hasHydrated || !hasBootstrappedSession || loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={C.accentA} />
          <Text style={styles.loadingText}>Loading profile…</Text>
        </View>
      </SafeAreaView>
    );
  }

  const label = planLabel(plan);

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
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
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
                  <Text style={styles.badgeText}>{label}</Text>
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
            trailingText={label}
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
              { text: "Log Out", style: "destructive", onPress: handleLogout },
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

function Section({ title, children }: { title: string; children: React.ReactNode }) {
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
    <View style={[styles.row, { borderBottomWidth: 0 }]}>
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
