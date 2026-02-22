// app/(tabs)/_layout.tsx
import React from "react";
import { View, StyleSheet } from "react-native";
import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

/**
 * TabsLayout should be "dumb":
 * - No auth redirects here.
 * - Root layout (app/_layout.tsx) is the single source of truth for routing/gating.
 *
 * This prevents router.replace() "fighting" during cold start and removes
 * flash/loop edge cases caused by multiple redirect layers.
 */
export default function TabsLayout() {
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