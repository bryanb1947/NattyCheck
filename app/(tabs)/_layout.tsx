// app/(tabs)/_layout.tsx — REPLACE ENTIRE FILE
import { Tabs } from "expo-router";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: { backgroundColor: "#0F0F0F", borderTopColor: "#2A2A2A", height: 64, paddingBottom: 10, paddingTop: 6 },
        tabBarActiveTintColor: "#00E0FF",
        tabBarInactiveTintColor: "#B3B3B3",
      }}
    >
      <Tabs.Screen name="index" options={{ title: "Dashboard", tabBarIcon: ({ color, size }) => <Ionicons name="home-outline" size={size} color={color} /> }} />
      <Tabs.Screen name="analyze" options={{ title: "Analyze", tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="camera-outline" size={size} color={color} /> }} />
      <Tabs.Screen name="progress" options={{ title: "Progress", tabBarIcon: ({ color, size }) => <Ionicons name="trending-up-outline" size={size} color={color} /> }} />
      <Tabs.Screen name="profile" options={{ title: "Profile", tabBarIcon: ({ color, size }) => <Ionicons name="person-outline" size={size} color={color} /> }} />
    </Tabs>
  );
}
