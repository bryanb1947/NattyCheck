import { Tabs } from "expo-router";
import { View, Text } from "react-native";
import { useFonts, Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold } from "@expo-google-fonts/inter";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";

export default function RootLayout() {
  const [loaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  if (!loaded) {
    return (
      <View className="flex-1 bg-background items-center justify-center">
        <Text className="text-text">Loading…</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background">
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarStyle: {
            backgroundColor: "#0F0F0F",
            borderTopColor: "#2A2A2A",
            height: 64,
            paddingBottom: 10,
            paddingTop: 6,
          },
          tabBarActiveTintColor: "#00E0FF",
          tabBarInactiveTintColor: "#B3B3B3",
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: "Dashboard",
            tabBarIcon: ({ color, size }) => <Ionicons name="home-outline" size={size} color={color} />,
          }}
        />
        <Tabs.Screen
          name="analyze"
          options={{
            title: "Analyze",
            tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="camera-outline" size={size} color={color} />,
          }}
        />
        <Tabs.Screen
          name="progress"
          options={{
            title: "Progress",
            tabBarIcon: ({ color, size }) => <Ionicons name="trending-up-outline" size={size} color={color} />,
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: "Profile",
            tabBarIcon: ({ color, size }) => <Ionicons name="person-outline" size={size} color={color} />,
          }}
        />
      </Tabs>
    </View>
  );
}
