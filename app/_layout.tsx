import React from "react";
import { Stack } from "expo-router";

export default function RootLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: "#0F0F0F" } }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="onboarding" />
      <Stack.Screen name="signup" />
      <Stack.Screen name="capture" />
      <Stack.Screen name="capture-guide" />
      <Stack.Screen name="paywall" />
      <Stack.Screen name="analyzing" />
      <Stack.Screen name="results" />
    </Stack>
  );
}
