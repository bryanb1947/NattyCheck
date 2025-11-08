import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";

export default function RootLayout() {
  return (
    <>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: "#0B0D0F" },
        }}
      >
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="capture" />
        <Stack.Screen name="analyzing" />
        <Stack.Screen name="results" />
        <Stack.Screen name="login" />
        <Stack.Screen name="signup" />
        <Stack.Screen name="onboarding" />
      </Stack>
    </>
  );
}
