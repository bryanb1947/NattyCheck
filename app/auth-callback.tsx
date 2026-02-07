// app/auth-callback.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { View, ActivityIndicator, Text, StyleSheet } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import * as Linking from "expo-linking";
import { supabase } from "@/lib/supabase";

/**
 * Auth Callback
 * ------------------------------------------------------------
 * Deep-link landing page for Supabase email confirmation.
 *
 * Handles:
 * - PKCE: nattycheck://auth-callback?code=...
 * - Implicit: nattycheck://auth-callback#access_token=...&refresh_token=...
 *
 * Always routes to `next` if provided (default: /(tabs)/analyze)
 */

function parseHashParams(url: string) {
  const hashIndex = url.indexOf("#");
  if (hashIndex === -1) return {};
  const hash = url.slice(hashIndex + 1);
  const params = new URLSearchParams(hash);
  const out: Record<string, string> = {};
  params.forEach((val, key) => (out[key] = val));
  return out;
}

export default function AuthCallback() {
  const router = useRouter();
  const params = useLocalSearchParams<{ next?: string }>();

  const nextRoute = useMemo(() => {
    const raw = params?.next ? String(params.next) : "/(tabs)/analyze";
    return raw.startsWith("/") ? raw : `/${raw}`;
  }, [params?.next]);

  const [status, setStatus] = useState("Completing sign-in…");

  // Only navigate once.
  const doneRef = useRef(false);

  const goNext = (path: string) => {
    if (doneRef.current) return;
    doneRef.current = true;
    router.replace(path as any);
  };

  const finish = async (url: string) => {
    if (doneRef.current) return;

    try {
      setStatus("Finishing…");

      if (url.includes("code=")) {
        const { error } = await supabase.auth.exchangeCodeForSession(url);
        if (error) {
          console.log("❌ exchangeCodeForSession error:", error.message);
        }
      } else {
        const hash = parseHashParams(url);
        const access_token = hash["access_token"];
        const refresh_token = hash["refresh_token"];

        if (access_token && refresh_token) {
          const { error } = await supabase.auth.setSession({
            access_token,
            refresh_token,
          });
          if (error) console.log("❌ setSession error:", error.message);
        } else {
          console.log("⚠️ No code or tokens found in callback URL.");
        }
      }
    } catch (e: any) {
      console.log("❌ AuthCallback crashed:", e?.message ?? e);
    } finally {
      // Always route somewhere — caller screens re-check entitlements.
      goNext(nextRoute);
    }
  };

  useEffect(() => {
    // 1) Cold start (app opened via deep link)
    Linking.getInitialURL().then((url) => {
      if (doneRef.current) return;
      if (url) {
        console.log("🔗 [AuthCallback] initialURL:", url);
        finish(url);
      }
    });

    // 2) Warm start (app already open / background)
    const sub = Linking.addEventListener("url", ({ url }) => {
      if (doneRef.current) return;
      console.log("🔁 [AuthCallback] url event:", url);
      finish(url);
    });

    // 3) Safety: if neither fires, check session once and continue
    const timeout = setTimeout(async () => {
      if (doneRef.current) return;

      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (session?.user?.id) {
          console.log("✅ [AuthCallback] session already present; continuing.");
          goNext(nextRoute);
          return;
        }
      } catch (e) {
        // ignore
      }

      console.log("⚠️ [AuthCallback] timeout waiting for URL; continuing.");
      goNext(nextRoute);
    }, 6000);

    return () => {
      sub.remove();
      clearTimeout(timeout);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nextRoute]);

  return (
    <View style={styles.wrap}>
      <ActivityIndicator />
      <Text style={styles.text}>{status}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, alignItems: "center", justifyContent: "center" },
  text: { marginTop: 10, color: "#9B9B9B", fontWeight: "700" },
});
