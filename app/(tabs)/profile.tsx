import { View, Text, Switch, Pressable, ScrollView } from "react-native";
import Card from "../../components/ui/Card";
import GradientButton from "../../components/ui/GradientButton";
import { colors } from "../../constants/theme";
import { useAuthStore } from "../../store/useAuthStore";
import { useResultsStore } from "../../store/useResultsStore";

export default function ProfileScreen() {
  const { email, plan, logout } = useAuthStore();
  const { clear } = useResultsStore();

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg, padding: 16 }}>
      <Card style={{ marginBottom: 16 }}>
        <Text style={{ color: colors.text, fontWeight: "800", fontSize: 18 }}>John Doe</Text>
        <Text style={{ color: colors.dim, marginTop: 6 }}>{email ?? "john.doe@email.com"}</Text>
        <Text style={{ color: "#94f9b3", marginTop: 2 }}>{plan === "pro" ? "Pro Plan" : "Free Plan"}</Text>
      </Card>

      <Card style={{ marginBottom: 16 }}>
        <Text style={{ color: colors.text, fontWeight: "700" }}>Upgrade to Pro</Text>
        <Text style={{ color: colors.dim, marginTop: 6 }}>Unlimited scans • Custom plans • Advanced analytics</Text>
        <GradientButton title="Upgrade Now — $59.99/yr" style={{ marginTop: 12 }} onPress={() => {}} />
      </Card>

      <Card style={{ marginBottom: 16 }}>
        <Text style={{ color: colors.dim }}>Data & Privacy</Text>
        <View style={{ marginTop: 12, flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <Text style={{ color: colors.text }}>Allow photos for AI training</Text>
          <Switch />
        </View>
        <Pressable onPress={clear} style={{ marginTop: 14, borderColor: "#3A1E25", borderWidth: 1, borderRadius: 12, padding: 12, backgroundColor: "#1B0E11" }}>
          <Text style={{ color: "#F87171", textAlign: "center", fontWeight: "700" }}>Delete All Data</Text>
        </Pressable>
      </Card>

      <Pressable onPress={logout} style={{ borderColor: "#3A1E25", borderWidth: 1, borderRadius: 14, padding: 14, backgroundColor: "#1B0E11" }}>
        <Text style={{ color: "#F87171", textAlign: "center", fontWeight: "900" }}>Log Out</Text>
      </Pressable>

      <Text style={{ color: colors.dim, textAlign: "center", marginTop: 14 }}>NattyCheck v0.10.0</Text>
    </ScrollView>
  );
}
