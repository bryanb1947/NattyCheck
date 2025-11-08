import { Tabs } from "expo-router";
import { View, Text } from "react-native";
import { Feather } from "@expo/vector-icons";

const COLORS = {
  bg: "#0B0D0F",
  tab: "#101418",
  active: "#B8FF48",
  inactive: "#98A2B3",
};

function TabIcon({
  icon,
  label,
  focused,
}: {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  focused: boolean;
}) {
  return (
    <View
      style={{
        alignItems: "center",
        justifyContent: "center",
        top: 2,
        width: 70,
      }}
    >
      <Feather
        name={icon}
        size={20}
        color={focused ? COLORS.active : COLORS.inactive}
      />
      <Text
        numberOfLines={1}
        style={{
          color: focused ? COLORS.active : COLORS.inactive,
          fontSize: 12,
          marginTop: 4,
          fontWeight: focused ? "700" : "500",
          textAlign: "center",
        }}
      >
        {label}
      </Text>
    </View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarStyle: {
          position: "absolute",
          bottom: 20,
          left: 20,
          right: 20,
          backgroundColor: COLORS.tab,
          borderRadius: 30,
          height: 70,
          borderTopWidth: 0,
          elevation: 10,
          shadowColor: "#000",
          shadowOpacity: 0.25,
          shadowRadius: 8,
          shadowOffset: { width: 0, height: 4 },
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon icon="home" label="Dashboard" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="analyze"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon icon="camera" label="Analyze" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="progress"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon icon="bar-chart-2" label="Progress" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon icon="user" label="Profile" focused={focused} />
          ),
        }}
      />
    </Tabs>
  );
}
