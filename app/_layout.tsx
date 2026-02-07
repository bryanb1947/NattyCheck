// app/_layout.tsx
import { Stack, useSegments, useRouter, useLocalSearchParams } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Platform, StyleSheet, Text } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/store/useAuthStore";
import { initRevenueCat, syncEntitlementsToSupabase } from "@/lib/revenuecat";

async function resetZustandStorageOnce() {
  try {
    const done = await AsyncStorage.getItem("zustand_reset_done");
    if (!done) {
      console.log("🧹 Resetting persisted Zustand storage...");
      await AsyncStorage.multiRemove(["results", "capture"]);
      await AsyncStorage.setItem("zustand_reset_done", "true");
      console.log("✅ Zustand storage cleared (results + capture).");
    }
  } catch (e) {
    console.log("Zustand reset failed:", e);
  }
}

const ROUTES = {
  index: "/",
  login: "/login",
  onboarding: "/onboarding",
  link: "/linkaccount",
  tabsHome: "/(tabs)/analyze",
};

const C = {
  bg: "#07090A",
  dim: "rgba(234,242,246,0.70)",
  accentA: "#00f5a0",
  accentB: "#00d9f5",
};

export default function RootLayout() {
  const router = useRouter();
  const segments = useSegments();
  const params = useLocalSearchParams<{ force?: string }>();

  const userId = useAuthStore((s) => s.userId);
  const plan = useAuthStore((s) => s.plan); // "free" | "pro"
  const onboardingComplete = useAuthStore((s) => !!(s as any).onboardingComplete);
  const hasHydrated = useAuthStore((s) => s.hasHydrated);

  const startAuthListener = useAuthStore((s) => s.startAuthListener);
  const stopAuthListener = useAuthStore((s) => s.stopAuthListener);

  const [layoutReady, setLayoutReady] = useState(false);

  // ✅ Cold-start gate to prevent “login flash”
  const [bootChecked, setBootChecked] = useState(false);

  const didInitAuth = useRef(false);
  const didInitRevenueCatFor = useRef<string | null>(null);
  const didPostBootRedirect = useRef(false);

  // Prevent infinite replace loops
  const lastRedirectRef = useRef<string | null>(null);

  const safeReplace = (to: string, p?: any) => {
    const key = p ? `${to}?${JSON.stringify(p)}` : to;
    if (lastRedirectRef.current === key) return;
    lastRedirectRef.current = key;

    setTimeout(() => {
      if (p) router.replace({ pathname: to as any, params: p } as any);
      else router.replace(to as any);
    }, 0);
  };

  useEffect(() => {
    resetZustandStorageOnce();
  }, []);

  /**
   * ✅ IMPORTANT:
   * - No anon creation on boot.
   * - Listener is allowed, but we suppress guest restore to prevent
   *   “signed out => create anon” behavior during cold start.
   */
  useEffect(() => {
    if (didInitAuth.current) return;
    didInitAuth.current = true;

    useAuthStore.setState({ suppressGuestRestore: true } as any);

    startAuthListener();
    return () => stopAuthListener();
  }, [startAuthListener, stopAuthListener]);

  useEffect(() => {
    const t = setTimeout(() => setLayoutReady(true), 0);
    return () => clearTimeout(t);
  }, []);

  const routeInfo = useMemo(() => {
    const first = segments[0] ?? "";
    const inTabs = first === "(tabs)";
    const isIndex = first === "";
    const isLogin = first === "login";
    const isOnboarding = first === "onboarding";
    const isLink = first === "linkaccount";
    const isSignup = first === "signup";
    const isPaywall = first === "paywall";
    const isAuthCallback = first === "auth-callback";

    const inAuthSurface = isLogin || isSignup || isLink;

    return {
      first,
      inTabs,
      isIndex,
      isLogin,
      isOnboarding,
      isLink,
      isSignup,
      isPaywall,
      isAuthCallback,
      inAuthSurface,
    };
  }, [segments]);

  useEffect(() => {
    lastRedirectRef.current = null;
  }, [routeInfo.first]);

  /**
   * ✅ BOOT CHECK (NO ANON CREATION)
   * - If existing session: bootstrapAuth() to fetch plan/onboarding gates
   * - If no session: do nothing (user decides Get Started / Log In)
   */
  useEffect(() => {
    if (!layoutReady || !hasHydrated) return;
    if (bootChecked) return;

    (async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) console.log("🟦 [_layout] getSession error:", error.message);

        const session = data?.session ?? null;

        if (session?.user?.id) {
          console.log("🟩 [_layout] existing session on boot:", {
            uid: session.user.id,
            email: session.user.email ?? "",
          });

          try {
            await useAuthStore.getState().bootstrapAuth();
          } catch (e: any) {
            console.log("🟨 [_layout] bootstrapAuth on boot failed:", e?.message ?? e);
          }
        } else {
          console.log("🟦 [_layout] no session on boot (no anon created).");
        }
      } catch (e: any) {
        console.log("🟦 [_layout] boot check crash:", e?.message ?? e);
      } finally {
        setBootChecked(true);
      }
    })();
  }, [bootChecked, hasHydrated, layoutReady]);

  useEffect(() => {
    if (!layoutReady || !hasHydrated || !bootChecked) return;

    const { inTabs, isLogin, inAuthSurface, isIndex } = routeInfo;

    // ✅ new eligibility rule (NO EMAIL GATE)
    const isEligibleForTabs = plan === "pro" && onboardingComplete;

    // Init RevenueCat once per userId (only when there IS a session/userId)
    if (userId && didInitRevenueCatFor.current !== userId) {
      didInitRevenueCatFor.current = userId;

      (async () => {
        await initRevenueCat(userId);
        await syncEntitlementsToSupabase();
      })().catch((e) => console.log("🟨 RevenueCat init/sync failed:", e));
    }

    // If user explicitly forced login, never redirect off login
    const forceLogin = isLogin && String(params?.force ?? "") === "1";
    if (forceLogin) return;

    // Don’t fight auth callback routing
    if (routeInfo.isAuthCallback) return;

    /**
     * ✅ HARD GATE: only enforce requirements when user tries to enter tabs
     * - pro required
     * - onboardingComplete required
     */
    if (inTabs) {
      if (plan !== "pro") {
        safeReplace(ROUTES.login);
        return;
      }
      if (!onboardingComplete) {
        safeReplace(ROUTES.onboarding);
        return;
      }
      return;
    }

    /**
     * ✅ QUALITY: if eligible user opens app, skip index/onboarding/paywall
     * This prevents the “login/index flash” experience for signed-in pro users.
     */
    if (isEligibleForTabs && (isIndex || routeInfo.isPaywall || routeInfo.isOnboarding)) {
      safeReplace(ROUTES.tabsHome);
      return;
    }

    /**
     * ✅ OPTIONAL: after a successful purchase / when pro becomes true,
     * you can *optionally* prompt them to secure their account via Apple/Google.
     * We do it only once per install using AsyncStorage.
     *
     * This will NOT block access to the app.
     */
    (async () => {
      if (!userId) return;
      if (plan !== "pro") return;
      if (!onboardingComplete) return;

      if (routeInfo.inAuthSurface) return; // don't redirect off login/link
      if (routeInfo.inTabs) return; // don't interrupt in-app
      if (didPostBootRedirect.current) return;

      try {
        const key = "did_prompt_link_identity";
        const seen = await AsyncStorage.getItem(key);
        if (seen) return;

        // Mark seen first to avoid loops even if user backs out.
        await AsyncStorage.setItem(key, "true");

        didPostBootRedirect.current = true;

        // Push them to link account, but it’s not required.
        safeReplace(ROUTES.link, { next: ROUTES.tabsHome });
      } catch {}
    })();

    // 🚫 Never auto-redirect off auth surface
    if (isLogin || inAuthSurface) return;
  }, [
    layoutReady,
    hasHydrated,
    bootChecked,
    userId,
    plan,
    onboardingComplete,
    routeInfo,
    params,
  ]);

  // ✅ Neutral splash while we check for an existing session (prevents login flash)
  if (!layoutReady || !hasHydrated || !bootChecked) {
    return (
      <>
        <StatusBar style="light" />
        <LinearGradient colors={["#050505", "#0a0a0a"]} style={styles.splash}>
          <ActivityIndicator size="large" color={C.accentA} />
          <Text style={styles.splashText}>
            {Platform.OS === "android" ? "Starting…" : "Loading…"}
          </Text>
        </LinearGradient>
      </>
    );
  }

  return (
    <>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerShown: false,
          gestureEnabled: false,
          animation: "none",
        }}
      />
    </>
  );
}

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: C.bg,
  },
  splashText: {
    marginTop: 12,
    color: C.dim,
    fontSize: 13,
    fontWeight: "700",
  },
});
