import React, { useState } from "react";
import {
  SafeAreaView,
  ScrollView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Switch,
} from "react-native";
import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { useAuthStore } from "../../store/useAuthStore";

export default function ProfileScreen() {
  const {
    isSignedIn,
    isPro,
    hasActiveTrial,
    freeScansLeft,
    signOut,
    startTrial,
    upgradeToPro,
  } = useAuthStore();

  // local-only toggles (MVP)
  const [darkMode, setDarkMode] = useState(true);
  const [allowTrainingPhotos, setAllowTrainingPhotos] = useState(false);

  const planLabel = isPro ? "Pro" : hasActiveTrial ? "Trial" : "Free";

  const onStartTrial = async () => {
    await startTrial();
  };

  const onUpgrade = async () => {
    await upgradeToPro();
  };

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
        {/* Header card */}
        <View style={s.headerCard}>
          <View style={s.avatar}>
            <Text style={s.avatarText}>N</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.name}>John Doe</Text>
            <Text style={s.email}>john.doe@email.com</Text>
            <View style={s.badgeRow}>
              <Text style={[s.badge, planLabel === "Pro" ? s.badgePro : planLabel === "Trial" ? s.badgeTrial : s.badgeFree]}>
                {planLabel}
              </Text>
              {!isPro && !hasActiveTrial ? (
                <Text style={s.infoText}>{freeScansLeft} free scans left</Text>
              ) : null}
            </View>
          </View>
        </View>

        {/* Upgrade banner / CTA */}
        {!isPro ? (
          <View style={s.ctaCard}>
            <Text style={s.ctaTitle}>Upgrade to Pro</Text>
            <Text style={s.ctaSub}>Unlimited scans, detailed breakdowns, and progress tracking.</Text>

            {!hasActiveTrial ? (
              <TouchableOpacity style={s.ctaBtn}>
                <LinearGradient
                  colors={["#00FFE0", "#B8FF47"]}
                  start={{ x: 0, y: 0.5 }}
                  end={{ x: 1, y: 0.5 }}
                  style={s.ctaBtnFill}
                >
                  <Text style={s.ctaBtnText} onPress={onStartTrial}>
                    Start Free Trial
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            ) : null}

            <TouchableOpacity style={s.outlineBtn} onPress={onUpgrade}>
              <Text style={s.outlineBtnText}>Upgrade Now • $59.99 / year</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={s.proCard}>
            <Text style={s.proTitle}>Pro Unlocked</Text>
            <Text style={s.proSub}>Thanks for supporting NattyCheck. Enjoy unlimited analysis.</Text>
            <TouchableOpacity style={s.outlineBtn} onPress={() => router.push("/results-details")}>
              <Text style={s.outlineBtnText}>View Detailed Results</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Account */}
        <Section title="Account">
          <ListItem label="Edit Profile" onPress={() => { /* TODO */ }} />
          <ListItem label="Notifications" onPress={() => { /* TODO */ }} />
          <ListItem
            label="Subscription"
            valueRight={isPro ? "Pro" : hasActiveTrial ? "Trial" : "Free"}
            onPress={() => router.push({ pathname: "/paywall", params: { from: "/(tabs)/profile" } })}
          />
        </Section>

        {/* Privacy & Data */}
        <Section title="Privacy & Data">
          <ListSwitch
            label="Allow photos for AI training"
            desc="Help improve our models"
            value={allowTrainingPhotos}
            onValueChange={setAllowTrainingPhotos}
          />
          <ListItem label="Data & Privacy" onPress={() => { /* TODO */ }} />
          <ListItem label="Delete All Data" destructive onPress={() => { /* TODO */ }} />
        </Section>

        {/* App Settings */}
        <Section title="App Settings">
          <ListSwitch
            label="Dark Mode"
            desc="Currently enabled"
            value={darkMode}
            onValueChange={setDarkMode}
          />
          <ListItem label="Help & Support" onPress={() => { /* TODO */ }} />
          <ListItem label="Privacy Policy" onPress={() => { /* TODO */ }} />
          <ListItem label="Terms of Service" onPress={() => { /* TODO */ }} />
        </Section>

        {/* Logout */}
        {isSignedIn ? (
          <TouchableOpacity style={s.logoutBtn} onPress={signOut}>
            <Text style={s.logoutText}>Log Out</Text>
          </TouchableOpacity>
        ) : null}

        <View style={{ height: 12 }} />
        <Text style={s.footerText}>NattyCheck v1.0.0</Text>
        <Text style={[s.footerText, { color: "#8CA0A6", marginTop: 2 }]}>
          AI Physique Analysis · Made for gym enthusiasts
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

/* ---------- UI helpers ---------- */

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={{ marginTop: 18 }}>
      <Text style={s.sectionTitle}>{title}</Text>
      <View style={s.sectionCard}>{children}</View>
    </View>
  );
}

function ListItem({
  label,
  valueRight,
  destructive,
  onPress,
}: {
  label: string;
  valueRight?: string;
  destructive?: boolean;
  onPress?: () => void;
}) {
  return (
    <TouchableOpacity style={s.row} onPress={onPress} activeOpacity={0.7}>
      <Text style={[s.rowLabel, destructive ? { color: "#FF6B6B" } : null]}>{label}</Text>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
        {valueRight ? <Text style={s.rowValue}>{valueRight}</Text> : null}
        <Text style={s.chev}>›</Text>
      </View>
    </TouchableOpacity>
  );
}

function ListSwitch({
  label,
  desc,
  value,
  onValueChange,
}: {
  label: string;
  desc?: string;
  value: boolean;
  onValueChange: (v: boolean) => void;
}) {
  return (
    <View style={s.row}>
      <View style={{ flex: 1 }}>
        <Text style={s.rowLabel}>{label}</Text>
        {desc ? <Text style={s.rowDesc}>{desc}</Text> : null}
      </View>
      <Switch value={value} onValueChange={onValueChange} />
    </View>
  );
}

/* ---------- styles ---------- */

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#0F0F0F" },

  headerCard: {
    flexDirection: "row",
    gap: 14,
    alignItems: "center",
    padding: 16,
    borderRadius: 16,
    backgroundColor: "#121517",
    borderWidth: 1,
    borderColor: "#243033",
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 12,
    backgroundColor: "#A6FFCF",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { color: "#0A0A0A", fontWeight: "900", fontSize: 18 },
  name: { color: "#FFFFFF", fontWeight: "800", fontSize: 18 },
  email: { color: "#9BA7AA", marginTop: 2 },
  badgeRow: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 6 },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    overflow: "hidden",
    color: "#0A0A0A",
    fontWeight: "800",
  },
  badgePro: { backgroundColor: "#B8FF47" },
  badgeTrial: { backgroundColor: "#7DF6EA" },
  badgeFree: { backgroundColor: "#C4C9CC" },
  infoText: { color: "#9BA7AA" },

  ctaCard: {
    marginTop: 14,
    padding: 16,
    borderRadius: 16,
    backgroundColor: "#0F1415",
    borderWidth: 1,
    borderColor: "#1E2C2F",
  },
  ctaTitle: { color: "#EFFFF8", fontWeight: "800", fontSize: 18 },
  ctaSub: { color: "#A9C1C6", marginTop: 6 },
  ctaBtn: { marginTop: 14, borderRadius: 14, overflow: "hidden" },
  ctaBtnFill: { height: 50, alignItems: "center", justifyContent: "center" },
  ctaBtnText: { color: "#0B0B0B", fontWeight: "800" },
  outlineBtn: {
    marginTop: 10,
    height: 50,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#2A3438",
    alignItems: "center",
    justifyContent: "center",
  },
  outlineBtnText: { color: "#DDE4E7", fontWeight: "700" },

  proCard: {
    marginTop: 14,
    padding: 16,
    borderRadius: 16,
    backgroundColor: "#0F1816",
    borderWidth: 1,
    borderColor: "#1C362E",
  },
  proTitle: { color: "#B8FF47", fontWeight: "800", fontSize: 18 },
  proSub: { color: "#CFE9CF", marginTop: 6 },

  sectionTitle: { color: "#9BA7AA", marginTop: 6, marginBottom: 8 },
  sectionCard: {
    borderRadius: 16,
    backgroundColor: "#121517",
    borderWidth: 1,
    borderColor: "#243033",
    overflow: "hidden",
  },

  row: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#243033",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  rowLabel: { color: "#E5ECEF", fontWeight: "600" },
  rowValue: { color: "#9BA7AA" },
  rowDesc: { color: "#8CA0A6", fontSize: 12, marginTop: 2 },
  chev: { color: "#6E7E83", fontSize: 20, lineHeight: 20 },

  logoutBtn: {
    marginTop: 16,
    height: 52,
    borderRadius: 14,
    backgroundColor: "#231517",
    borderWidth: 1,
    borderColor: "#3a262a",
    alignItems: "center",
    justifyContent: "center",
  },
  logoutText: { color: "#FFB3B3", fontWeight: "800" },

  footerText: { textAlign: "center", color: "#6F848A" },
});
