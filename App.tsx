// App.tsx
import { SafeAreaProvider } from "react-native-safe-area-context";
import { Slot } from "expo-router";

export default function App() {
  return (
    <SafeAreaProvider>
      <Slot />
    </SafeAreaProvider>
  );
}
