// app/(auth)/_layout.tsx
import { Stack, useRouter, useSegments } from "expo-router";
import { useEffect } from "react";
import { useAuthStore } from "../../store/useAuthStore";

export default function AuthLayout() {
  const router = useRouter();
  const segments = useSegments();

  const { userId, hasHydrated } = useAuthStore();

  useEffect(() => {
    if (!hasHydrated) return;

    const inAuthFlow =
      segments[0] === "(auth)" ||
      segments[0] === "login" ||
      segments[0] === "signup";

    if (!userId && !inAuthFlow) {
      router.replace("/login");
      return;
    }

    if (userId && inAuthFlow) {
      router.replace("/(tabs)/analyze");
      return;
    }
  }, [hasHydrated, userId, segments]);

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        gestureEnabled: false,
        animation: "none",
      }}
    />
  );
}
