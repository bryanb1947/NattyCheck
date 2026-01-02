// app/profile-notifications.tsx
// ------------------------------------------------------
// Notification Settings
// - Uses native iOS swipe-back (Stack.Screen gesture)
// - Matches privacy & terms header behavior
// - Keeps all existing notification preference logic
// ------------------------------------------------------

import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  Platform,
  Pressable,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { Stack, useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_KEY = "nc_notification_prefs_v1";

type NotificationPrefs = {
  workoutReminders: boolean;
  scanReady: boolean;
  productUpdates: boolean;
};

const DEFAULT_PREFS: NotificationPrefs = {
  workoutReminders: true,
  scanReady: true,
  productUpdates: false,
};

export default function ProfileNotificationsScreen() {
  const router = useRouter();
  const [prefs, setPrefs] = useState<NotificationPrefs>(DEFAULT_PREFS);
  const [loading, setLoading] = useState(true);

  // ------------------------------
  // LOAD EXISTING PREFS
  // ------------------------------
  useEffect(() => {
    const load = async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          setPrefs({ ...DEFAULT_PREFS, ...parsed });
        }
      } catch (e) {
        console.log("Notification prefs load error:", e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // ------------------------------
  // SAVE PREF
  // ------------------------------
  async function updatePref<K extends keyof NotificationPrefs>(
    key: K,
    value: boolean
  ) {
    const next = { ...prefs, [key]: value };
    setPrefs(next);
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch (e) {
      console.log("Notification prefs save error:", e);
    }
  }

  return (
    <>
      {/* -------------------------------------------- */}
      {/* NATIVE SWIPE-BACK HEADER (identical to privacy/terms) */}
      {/* -------------------------------------------- */}
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
          contentContainerStyle={{ paddingBottom: 32 }}
          showsVerticalScrollIndicator={false}
        >
          {/* TOP BADGE CARD */}
          <LinearGradient
            colors={["#00E6C8", "#9AF65B"]}
            style={styles.badgeCard}
          >
            <Text style={styles.badgeTitle}>Stay dialed in</Text>
            <Text style={styles.badgeText}>
              Control how NattyCheck notifies you about scans, workouts, and updates.
            </Text>
          </LinearGradient>

          {/* TRAINING & RESULTS */}
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Training & Results</Text>

            <Row
              label="Workout reminders"
              description="Gentle nudges to hit your planned training days."
              value={prefs.workoutReminders}
              onChange={(v) => updatePref("workoutReminders", v)}
              disabled={loading}
            />

            <Row
              label="Scan ready alerts"
              description="Notifies you when physique analysis finishes."
              value={prefs.scanReady}
              onChange={(v) => updatePref("scanReady", v)}
              disabled={loading}
              last
            />
          </View>

          {/* PRODUCT & ACCOUNT */}
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Product & Account</Text>

            <Row
              label="Product news"
              description="Emails when we ship major features or upgrades."
              value={prefs.productUpdates}
              onChange={(v) => updatePref("productUpdates", v)}
              disabled={loading}
              last
            />
          </View>

          <Text style={styles.footerHint}>
            Actual notification delivery is controlled by iOS system settings.  
            You can adjust permissions anytime in your device settings.
          </Text>
        </ScrollView>
      </SafeAreaView>
    </>
  );
}

// ------------------------------------------------------
// ROW COMPONENT
// ------------------------------------------------------
function Row(props: {
  label: string;
  description?: string;
  value: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
  last?: boolean;
}) {
  return (
    <View
      style={[
        styles.row,
        props.last && { borderBottomWidth: 0, paddingBottom: 2 },
      ]}
    >
      <View style={{ flex: 1, paddingRight: 12 }}>
        <Text style={styles.rowLabel}>{props.label}</Text>
        {!!props.description && (
          <Text style={styles.rowDesc}>{props.description}</Text>
        )}
      </View>

      <Switch
        value={props.value}
        onValueChange={props.onChange}
        disabled={props.disabled}
        trackColor={{ false: "#34393E", true: "#1B593A" }}
        thumbColor={props.value ? "#9AF65B" : "#C6CED6"}
      />
    </View>
  );
}

// ------------------------------------------------------
// STYLES
// ------------------------------------------------------
const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#0B0D0F",
  },
  scroll: {
    flex: 1,
    paddingHorizontal: 16,
  },

  badgeCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 18,
    marginTop: 60, // accounts for transparent header
  },
  badgeTitle: {
    color: "#00110A",
    fontSize: 16,
    fontWeight: "800",
    marginBottom: 6,
  },
  badgeText: {
    color: "#052218",
    fontSize: 13,
  },

  card: {
    backgroundColor: "#111417",
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 14,
    marginBottom: 14,
  },
  sectionTitle: {
    color: "#C8FFD6",
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 8,
  },

  row: {
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#1B2228",
    paddingVertical: 10,
  },
  rowLabel: {
    color: "#F5FAFF",
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 2,
  },
  rowDesc: {
    color: "#88929A",
    fontSize: 12,
  },

  footerHint: {
    marginTop: 12,
    paddingHorizontal: 16,
    color: "#88929A",
    fontSize: 11,
    textAlign: "center",
    marginBottom: 40,
  },
});
