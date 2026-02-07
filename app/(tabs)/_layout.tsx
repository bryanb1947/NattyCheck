// app/(tabs)/_layout.tsx
import { useEffect } from "react";
import { View, StyleSheet } from "react-native";
import { Tabs, useRouter, useSegments } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuthStore } from "@/store/useAuthStore";

const AUTH_LOGIN_ROUTE = "/login";

export default function TabsLayout() {
  const router = useRouter();
  const segments = useSegments();

  const userId = useAuthStore((s) => s.userId);
  const hasHydrated = useAuthStore((s) => s.hasHydrated);
  const hasBootstrappedSession = useAuthStore((s) => s.hasBootstrappedSession);

  useEffect(() => {
    if (!hasHydrated || !hasBootstrappedSession) return;

    // If logged out, leave tabs. Avoid spamming replace if already in auth.
    const first = segments[0] ?? "";
    const inAuth = first === "login";

    if (!userId && !inAuth) {
      router.replace(AUTH_LOGIN_ROUTE);
    }
  }, [hasHydrated, hasBootstrappedSession, userId, router, segments]);

  return (
    <View style={styles.container}>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarStyle: styles.tabBar,
          tabBarActiveTintColor: "#B9FF39",
          tabBarInactiveTintColor: "#6C7A80",
          gestureEnabled: false,
        }}
      >
        <Tabs.Screen
          name="analyze"
          options={{
            title: "Analyze",
            unmountOnBlur: true, // optional: camera-heavy screen
            tabBarIcon: ({ color }) => (
              <Ionicons name="camera-outline" size={22} color={color} />
            ),
          }}
        />

        <Tabs.Screen
          name="progress"
          options={{
            title: "Progress",
            tabBarIcon: ({ color }) => (
              <Ionicons name="bar-chart-outline" size={22} color={color} />
            ),
          }}
        />

        <Tabs.Screen
          name="workout"
          options={{
            title: "Workout",
            tabBarIcon: ({ color }) => (
              <Ionicons name="barbell-outline" size={22} color={color} />
            ),
          }}
        />

        <Tabs.Screen
          name="profile"
          options={{
            title: "Profile",
            tabBarIcon: ({ color }) => (
              <Ionicons name="person-outline" size={22} color={color} />
            ),
          }}
        />
      </Tabs>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0B0E11" },
  tabBar: {
    backgroundColor: "#0B0E11",
    borderTopColor: "rgba(255,255,255,0.05)",
    height: 80,
    paddingBottom: 14,
    paddingTop: 6,
  },
});
