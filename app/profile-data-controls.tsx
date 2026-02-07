// app/profile-data-controls.tsx
// ------------------------------------------------------
// Data & Account Controls
// - Delete cloud data: DELETE /account/delete-data
// - Delete account:     DELETE /account/delete
//
// IMPORTANT:
// Uses Supabase JWT via lib/api (NOT userId in Authorization header).
// ------------------------------------------------------

import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Stack, useRouter } from "expo-router";

import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/store/useAuthStore";

// ✅ Use centralized account API helpers (JWT authed + fallback-safe)
import { deleteAccount, deleteAllData } from "@/lib/api/account";

const C = {
  bg: "#050707",
  card: "#101417",
  border: "#1B2429",
  text: "#FFFFFF",
  dim: "#9AA4AF",
  danger: "#FF4E4E",
  dangerSoft: "#FFB3B3",
  accentSoft: "#00F5A0",
};

export default function ProfileDataControlsScreen() {
  const router = useRouter();
  const { userId, setUser } = useAuthStore();

  const [deletingData, setDeletingData] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);

  // -----------------------------------------------
  // Not logged in UI
  // -----------------------------------------------
  if (!userId) {
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
        <SafeAreaView style={styles.center}>
          <Text style={styles.warnText}>You must be signed in.</Text>
        </SafeAreaView>
      </>
    );
  }

  // -----------------------------------------------
  // DELETE DATA (Cloud only)
  // -----------------------------------------------
  const handleDeleteData = () => {
    Alert.alert(
      "Delete all cloud data?",
      "This permanently deletes your physique analyses and workouts. Account stays active.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete data",
          style: "destructive",
          onPress: async () => {
            try {
              setDeletingData(true);

              const resp = await deleteAllData();
              if (!resp.success) {
                Alert.alert("Error", resp.message || "Unable to delete data.");
                return;
              }

              Alert.alert("Data Deleted", "Cloud data successfully wiped.");
            } catch (err: any) {
              Alert.alert("Error", err?.message || "Unable to delete data.");
            } finally {
              setDeletingData(false);
            }
          },
        },
      ]
    );
  };

  // -----------------------------------------------
  // DELETE ACCOUNT (Account + all data)
  // -----------------------------------------------
  const handleDeleteAccount = () => {
    Alert.alert(
      "Delete your account?",
      "This will permanently delete your ENTIRE account and ALL data.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete account",
          style: "destructive",
          onPress: async () => {
            try {
              setDeletingAccount(true);

              const resp = await deleteAccount();
              if (!resp.success) {
                Alert.alert("Error", resp.message || "Unable to delete account.");
                return;
              }

              // Log out locally
              await supabase.auth.signOut().catch(() => {});

              setUser({
                userId: null,
                email: null,
                plan: "free",
              } as any);

              router.replace("/login");
            } catch (err: any) {
              Alert.alert("Error", err?.message || "Unable to delete account.");
            } finally {
              setDeletingAccount(false);
            }
          },
        },
      ]
    );
  };

  // -----------------------------------------------
  // UI
  // -----------------------------------------------
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
              <Ionicons name="chevron-back" size={30} color="#FFFFFF" />
            </TouchableOpacity>
          ),
        }}
      />

      <SafeAreaView style={styles.safe}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={{ paddingBottom: 32 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Data & Account Controls</Text>
            <Text style={styles.headerSubtitle}>
              Permanently delete cloud data or your full NattyCheck account.
            </Text>
          </View>

          {/* Cloud data delete */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Delete cloud data</Text>
            <Text style={styles.cardText}>
              Removes your physique analyses & workout logs. Account remains active.
            </Text>

            <TouchableOpacity
              style={styles.dangerBtn}
              onPress={handleDeleteData}
              disabled={deletingData || deletingAccount}
            >
              {deletingData ? (
                <ActivityIndicator color="#FFECEC" />
              ) : (
                <Text style={styles.dangerBtnText}>Delete all cloud data</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Account delete */}
          <View style={[styles.card, styles.cardDangerOutline]}>
            <Text style={[styles.cardTitle, { color: C.danger }]}>
              Delete account & all data
            </Text>
            <Text style={styles.cardText}>
              Permanently removes your NattyCheck account and all associated data.
            </Text>

            <TouchableOpacity
              style={[styles.dangerBtn, { backgroundColor: C.danger }]}
              onPress={handleDeleteAccount}
              disabled={deletingAccount || deletingData}
            >
              {deletingAccount ? (
                <ActivityIndicator color="#FFECEC" />
              ) : (
                <Text style={[styles.dangerBtnText, { color: "#FFF" }]}>
                  Permanently delete account
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  scroll: { flex: 1, paddingHorizontal: 16 },

  header: { paddingTop: 36, paddingBottom: 16 },
  headerTitle: { color: C.text, fontSize: 22, fontWeight: "800" },
  headerSubtitle: { color: C.dim, fontSize: 13, marginTop: 6 },

  card: {
    backgroundColor: C.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: C.border,
    marginBottom: 16,
  },

  cardDangerOutline: {
    borderColor: C.danger,
  },

  cardTitle: {
    color: C.text,
    fontSize: 16,
    fontWeight: "800",
    marginBottom: 6,
  },

  cardText: {
    color: C.dim,
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 12,
  },

  dangerBtn: {
    borderRadius: 999,
    paddingVertical: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: C.danger,
  },

  dangerBtnText: {
    color: C.dangerSoft,
    fontSize: 14,
    fontWeight: "700",
  },

  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  warnText: { color: C.dim, fontSize: 15 },
});
