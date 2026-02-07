// app/linkaccount.tsx
import React, { useCallback, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams } from "expo-router";

import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/store/useAuthStore";

/**
 * LinkAccount (OAuth Linking — No Data Loss)
 * ------------------------------------------------
 * Goal: attach Apple/Google identity to the CURRENT signed-in user (anon or real).
 *
 * Why this is best:
 * - Keeps SAME Supabase user_id (so all your onboarding/workouts/scans stay)
 * - No "confirm email" weirdness
 * - No new-user migration scripts required
 *
 * Requirements (Supabase):
 * - Enable Apple + Google providers
 * - Enable "Manual Linking"
 * - Configure deep links / redirect URLs for OAuth
 *
 * Ref: supabase.auth.linkIdentity({ provider }) requires manual linking enabled.
 */

const C = {
  text: "#EAF2F6",
  dim: "rgba(234,242,246,0.70)",
  dim2: "rgba(234,242,246,0.50)",
  card: "rgba(14,18,20,0.80)",
  cardBorder: "rgba(255,255,255,0.08)",
  accentA: "#00f5a0",
  accentB: "#00d9f5",
  accentC: "#B9FF39",
};

function normalizeRoute(v: string) {
  const raw = String(v || "").trim();
  if (!raw) return "/(tabs)/analyze";
  return raw.startsWith("/") ? raw : `/${raw}`;
}

function withTimeout<T>(p: Promise<T>, ms = 20000, label = "Request") {
  return new Promise<T>((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`${label} timed out`)), ms);
    p.then((v) => {
      clearTimeout(t);
      resolve(v);
    }).catch((e) => {
      clearTimeout(t);
      reject(e);
    });
  });
}

export default function LinkAccount() {
  const router = useRouter();
  const params = useLocalSearchParams<{ next?: string }>();

  const nextRoute = useMemo(() => normalizeRoute(params?.next ?? "/(tabs)/analyze"), [params?.next]);

  const storedUserId = useAuthStore((s) => s.userId);
  const setIdentity = useAuthStore((s) => s.setIdentity);

  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  // Prevent double taps / double alerts
  const doneRef = useRef(false);

  const ensureSession = useCallback(async () => {
    // If session exists, good. If not, user must go through onboarding first.
    const { data } = await supabase.auth.getSession();
    const sess = data?.session ?? null;
    if (sess?.user?.id) return sess.user;

    // Fallback to storedUserId (shouldn't happen often)
    if (storedUserId) {
      // We still need a real session for linkIdentity; stored id isn't enough.
      return null;
    }

    return null;
  }, [storedUserId]);

  const finalize = useCallback(async () => {
    const { data } = await supabase.auth.getSession();
    const sess = data?.session ?? null;
    const u = sess?.user ?? null;

    if (!u?.id) return false;

    setIdentity({ userId: u.id, email: u.email ?? null });

    // Optional: mirror email to profiles (non-fatal)
    if (u.email && u.email.includes("@")) {
      try {
        await supabase
          .from("profiles")
          .upsert({ user_id: u.id, email: u.email, updated_at: new Date().toISOString() }, { onConflict: "user_id" });
      } catch {}
    }

    return true;
  }, [setIdentity]);

  const linkProvider = useCallback(
    async (provider: "apple" | "google") => {
      if (busy || doneRef.current) return;

      setBusy(true);
      setStatus(`Connecting ${provider === "apple" ? "Apple" : "Google"}…`);

      try {
        const user = await withTimeout(ensureSession(), 12000, "Ensure session");
        if (!user?.id) {
          Alert.alert(
            "Start a session first",
            "You need an active session before linking.\n\nGo through onboarding (Get Started) first, then come back here."
          );
          return;
        }

        // This opens the provider flow and returns URL (PKCE).
        const { data, error } = await withTimeout(
          supabase.auth.linkIdentity({ provider }),
          20000,
          "linkIdentity"
        );

        if (error) {
          const msg = String(error.message || "Linking failed.");

          // Common: Manual Linking not enabled OR identity already linked somewhere.
          Alert.alert(
            "Couldn’t link",
            msg.includes("Manual Linking") || msg.toLowerCase().includes("manual")
              ? msg + "\n\nFix: enable Manual Linking in Supabase Auth settings."
              : msg
          );
          return;
        }

        // In native apps, Supabase will handle redirect; we just wait for session to update.
        setStatus("Finalizing…");

        const ok = await withTimeout(finalize(), 12000, "Finalize");
        if (!ok) {
          Alert.alert(
            "Almost there",
            "We started linking, but your session didn’t update yet.\n\nTry again or reopen the app after completing the provider prompt."
          );
          return;
        }

        if (!doneRef.current) {
          doneRef.current = true;
          Alert.alert("Backed up!", "Your account is now recoverable on reinstall.");
        }

        router.replace(nextRoute as any);
      } catch (e: any) {
        Alert.alert("Error", e?.message ?? "Something went wrong.");
      } finally {
        setBusy(false);
        setStatus(null);
      }
    },
    [busy, ensureSession, finalize, nextRoute, router]
  );

  const skip = useCallback(() => {
    try {
      router.back();
    } catch {
      router.replace("/(tabs)/analyze");
    }
  }, [router]);

  return (
    <LinearGradient colors={["#050505", "#0a0a0a"]} style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }} edges={["top", "left", "right"]}>
        <View style={styles.wrap}>
          <Text style={styles.title}>Backup your progress</Text>
          <Text style={styles.sub}>
            Optional: link Apple/Google so you don’t lose scans, workouts, and photos if you reinstall.
          </Text>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Choose a login</Text>
            <Text style={styles.cardBody}>
              This links to your current account (same user). No weird email confirmation.
            </Text>

            <TouchableOpacity
              onPress={() => linkProvider("apple")}
              activeOpacity={0.9}
              disabled={busy}
              style={{ marginTop: 14 }}
            >
              <View style={[styles.providerBtn, busy && { opacity: 0.65 }]}>
                {busy ? (
                  <ActivityIndicator size="small" color="#EAF2F6" />
                ) : (
                  <Ionicons name="logo-apple" size={18} color="#EAF2F6" />
                )}
                <Text style={styles.providerText}>Continue with Apple</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => linkProvider("google")}
              activeOpacity={0.9}
              disabled={busy}
              style={{ marginTop: 12 }}
            >
              <View style={[styles.providerBtnAlt, busy && { opacity: 0.65 }]}>
                {busy ? (
                  <ActivityIndicator size="small" color="#071012" />
                ) : (
                  <Ionicons name="logo-google" size={18} color="#071012" />
                )}
                <Text style={styles.providerTextAlt}>Continue with Google</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity onPress={skip} activeOpacity={0.85} style={styles.skipBtn} disabled={busy}>
              <Text style={styles.skipText}>Not now</Text>
            </TouchableOpacity>

            {!!status ? <Text style={styles.status}>{status}</Text> : null}

            <Text style={styles.note}>
              You can do this later in Profile → Backup.
            </Text>

            {__DEV__ ? (
              <Text style={styles.devNote}>
                Dev: Requires Supabase Auth “Manual Linking” enabled + Apple/Google configured.
              </Text>
            ) : null}
          </View>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, paddingHorizontal: 22, paddingTop: 18, justifyContent: "center" },

  title: { color: C.accentC, fontSize: 30, fontWeight: "900", textAlign: "center" },
  sub: {
    color: C.dim,
    marginTop: 10,
    fontSize: 13,
    fontWeight: "700",
    textAlign: "center",
    lineHeight: 18,
  },

  card: {
    marginTop: 18,
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.cardBorder,
    borderRadius: 18,
    padding: 16,
  },

  cardTitle: { color: C.text, fontSize: 16, fontWeight: "900" },
  cardBody: { color: C.dim2, fontSize: 12, marginTop: 6, lineHeight: 17 },

  providerBtn: {
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 10,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },
  providerText: { color: C.text, fontWeight: "900", fontSize: 16 },

  providerBtnAlt: {
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 10,
    backgroundColor: C.accentA,
  },
  providerTextAlt: { color: "#071012", fontWeight: "900", fontSize: 16 },

  skipBtn: { marginTop: 14, alignItems: "center" },
  skipText: { color: "rgba(234,242,246,0.65)", fontWeight: "800" },

  status: {
    marginTop: 12,
    textAlign: "center",
    color: "rgba(234,242,246,0.72)",
    fontSize: 12,
    fontWeight: "800",
    lineHeight: 16,
  },

  note: {
    marginTop: 12,
    textAlign: "center",
    color: "rgba(234,242,246,0.40)",
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 16,
  },

  devNote: {
    marginTop: 10,
    textAlign: "center",
    color: "rgba(234,242,246,0.28)",
    fontSize: 11,
    fontWeight: "700",
    lineHeight: 15,
  },
});
