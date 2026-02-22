// app/_layout.tsx
import {
  Stack,
  useSegments,
  useRouter,
  useLocalSearchParams,
} from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Platform,
  StyleSheet,
  Text,
  View,
} from "react-native";
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
  const onboardingComplete = useAuthStore(
    (s) => !!(s as any).onboardingComplete
  );
  const hasHydrated = useAuthStore((s) => s.hasHydrated);

  const startAuthListener = useAuthStore((s) => s.startAuthListener);
  const stopAuthListener = useAuthStore((s) => s.stopAuthListener);

  // Local boot gates (these must always resolve, even if hydration misbehaves)
  const [layoutReady, setLayoutReady] = useState(false);
  const [bootChecked, setBootChecked] = useState(false);
  const [hydrationTimedOut, setHydrationTimedOut] = useState(false);

  const didInitAuth = useRef(false);
  const didInitRevenueCatFor = useRef<string | null>(null);
  const didPostBootRedirect = useRef(false);

  // Prevent infinite replace loops
  const lastRedirectRef = useRef<string | null>(null);

  const safeReplace = (to: string, p?: any) => {
    const key = p ? `${to}?${JSON.stringify(p)}` : to;
    if (lastRedirectRef.current === key) return;
    lastRedirectRef.current = key;

    // Defer to next tick to avoid "navigation during render" edge cases
    setTimeout(() => {
      if (p) router.replace({ pathname: to as any, params: p } as any);
      else router.replace(to as any);
    }, 0);
  };

  useEffect(() => {
    resetZustandStorageOnce();
  }, []);

  /**
   * ✅ Start auth listener once
   * We keep the listener to receive auth changes.
   * We also suppress any "guest restore" behavior during cold start.
   */
  useEffect(() => {
    if (didInitAuth.current) return;
    didInitAuth.current = true;

    useAuthStore.setState({ suppressGuestRestore: true } as any);

    startAuthListener();
    return () => stopAuthListener();
  }, [startAuthListener, stopAuthListener]);

  /**
   * ✅ Layout ready immediately
   */
  useEffect(() => {
    setLayoutReady(true);
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
   * ✅ HYDRATION WATCHDOG
   * If Zustand hydration never flips hasHydrated=true, the app would otherwise
   * hang forever on the boot screen. This forces progress after a short timeout.
   */
  useEffect(() => {
    if (!layoutReady) return;
    if (hasHydrated) return;

    const t = setTimeout(() => {
      if (!useAuthStore.getState().hasHydrated) {
        console.log("🟧 [_layout] hydration timeout — continuing boot anyway.");
        setHydrationTimedOut(true);
      }
    }, 1500);

    return () => clearTimeout(t);
  }, [layoutReady, hasHydrated]);

  /**
   * ✅ BOOT CHECK (NO ANON CREATION)
   * - If existing session: bootstrapAuth() to fetch plan/onboarding gates
   * - If no session: do nothing (user decides Get Started / Log In)
   *
   * IMPORTANT: This MUST always set bootChecked=true in finally.
   */
  useEffect(() => {
    if (!layoutReady) return;
    if (bootChecked) return;

    // If hydration is required for bootstrapAuth in your store, we wait for it,
    // but we will not hang forever (hydrationTimedOut breaks the wait).
    if (!hasHydrated && !hydrationTimedOut) return;

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
            console.log(
              "🟨 [_layout] bootstrapAuth on boot failed:",
              e?.message ?? e
            );
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
  }, [layoutReady, hasHydrated, hydrationTimedOut, bootChecked]);

  /**
   * ✅ Post-boot routing + RevenueCat init
   */
  useEffect(() => {
    if (!layoutReady) return;
    if (!bootChecked) return;
    if (!hasHydrated && !hydrationTimedOut) return;

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
     */
    if (
      isEligibleForTabs &&
      (isIndex || routeInfo.isPaywall || routeInfo.isOnboarding)
    ) {
      safeReplace(ROUTES.tabsHome);
      return;
    }

    /**
     * ✅ OPTIONAL: once-per-install prompt to link identity (non-blocking)
     */
    (async () => {
      if (!userId) return;
      if (plan !== "pro") return;
      if (!onboardingComplete) return;

      if (routeInfo.inAuthSurface) return;
      if (routeInfo.inTabs) return;
      if (didPostBootRedirect.current) return;

      try {
        const key = "did_prompt_link_identity";
        const seen = await AsyncStorage.getItem(key);
        if (seen) return;

        await AsyncStorage.setItem(key, "true");
        didPostBootRedirect.current = true;

        safeReplace(ROUTES.link, { next: ROUTES.tabsHome });
      } catch {}
    })();

    // 🚫 Never auto-redirect off auth surface
    if (isLogin || inAuthSurface) return;
  }, [
    layoutReady,
    bootChecked,
    hasHydrated,
    hydrationTimedOut,
    userId,
    plan,
    onboardingComplete,
    routeInfo,
    params,
  ]);

  /**
   * ✅ In-app boot screen (this is what you currently see as a spinner).
   * We now show your splash logo while we finish boot checks.
   *
   * NOTE: Native splash is still controlled by app.config.js and requires rebuild to change.
   */
  if (!layoutReady || !bootChecked || (!hasHydrated && !hydrationTimedOut)) {
    return (
      <>
        <StatusBar style="light" />
        <LinearGradient colors={["#050505", "#0a0a0a"]} style={styles.splash}>
          <View style={styles.splashInner}>
            <Image
              source={require("../assets/images/splash-icon.png")}
              style={styles.logo}
              resizeMode="contain"
            />

            <View style={styles.loadingRow}>
              <ActivityIndicator size="small" color={C.accentA} />
              <Text style={styles.splashText}>
                {Platform.OS === "android" ? "Starting…" : "Loading…"}
              </Text>
            </View>
          </View>
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
  splashInner: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  logo: {
    width: 190,
    height: 190,
    marginBottom: 16,
  },
  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  splashText: {
    color: C.dim,
    fontSize: 13,
    fontWeight: "700",
  },
});