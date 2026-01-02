// app/_layout.tsx
import { Stack, useSegments, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAuthStore } from "../store/useAuthStore";

// Cleanup once
async function resetZustandStorageOnce() {
  try {
    const done = await AsyncStorage.getItem("zustand_reset_done");
    if (!done) {
      console.log("🧹 Resetting persisted Zustand storage...");
      await AsyncStorage.multiRemove(["results", "auth", "capture"]);
      await AsyncStorage.setItem("zustand_reset_done", "true");
      console.log("✅ Zustand storage cleared.");
    }
  } catch (e) {
    console.log("Zustand reset failed:", e);
  }
}

export default function RootLayout() {
  const router = useRouter();
  const segments = useSegments();
  const { userId, hasHydrated } = useAuthStore();

  const [layoutReady, setLayoutReady] = useState(false);

  useEffect(() => {
    resetZustandStorageOnce();
  }, []);

  useEffect(() => {
    setTimeout(() => setLayoutReady(true), 0);
  }, []);

  useEffect(() => {
    if (!layoutReady || !hasHydrated) return;

    const current = segments[0] || "";

    // 🚫 NEVER redirect during scan flow
    const protectedFlowScreens = [
      "capture",
      "preview",
      "analyzing",
      "results",
      "invalidPhoto",
      "paywall",
      "premiumresults", // do not fight premiumresults internal gating
    ];

    if (protectedFlowScreens.includes(current)) return;

    const inAuth = current === "login" || current === "signup";

    // Public routes (allowed without auth)
    const publicRoutes = ["", "index", "login", "signup", "paywall", "results"];
    const isPublic = publicRoutes.includes(current);

    // Not logged in → login (unless public)
    if (!userId && !isPublic) {
      router.replace("/login");
      return;
    }

    // Logged in → block login/signup
    if (userId && inAuth) {
      router.replace("/(tabs)/analyze");
      return;
    }

    // ✅ IMPORTANT CHANGE:
    // DO NOT auto-redirect paywall → premiumresults here.
    // PremiumResults will verify plan/profile and route accordingly.
  }, [layoutReady, hasHydrated, userId, segments, router]);

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
