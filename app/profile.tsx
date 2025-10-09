import { ScrollView, Text, View } from "react-native";
import Card from "../components/ui/Card";
import ToggleRow from "../components/ui/ToggleRow";
import Button from "../components/ui/Button";
import GradientButton from "../components/ui/GradientButton";

export default function Profile() {
  return (
    <ScrollView className="flex-1 bg-background px-5 pt-12" contentContainerStyle={{ paddingBottom: 32 }}>
      {/* User card */}
      <Card>
        <Text className="text-text font-medium text-lg">John Doe</Text>
        <Text className="text-text-muted mt-1">john.doe@email.com</Text>
        <View className="mt-2 px-2 py-1 rounded-pill" style={{ backgroundColor: "#2A2A2A" }}>
          <Text className="text-text-muted text-xs">Free Plan</Text>
        </View>
      </Card>

      {/* Upgrade panel */}
      <Card style={{ marginTop: 12, borderColor: "#2C5F3A" }}>
        <Text className="text-text font-medium">Upgrade to Pro</Text>
        <Text className="text-text-muted mt-1">
          Unlock unlimited analyses, custom workout plans, and progress tracking.
        </Text>
        <GradientButton title="Upgrade Now • $59.99/year" style={{ marginTop: 12 }} />
      </Card>

      {/* Account */}
      <Text className="text-text-muted mt-6 mb-2">ACCOUNT</Text>
      <Card>
        <View className="py-3 border-b border-border">
          <Text className="text-text">Edit Profile</Text>
        </View>
        <View className="py-3 border-b border-border">
          <Text className="text-text">Notifications</Text>
        </View>
        <View className="py-3">
          <View className="flex-row items-center justify-between">
            <Text className="text-text">Subscription</Text>
            <Text className="text-text-muted">Free</Text>
          </View>
        </View>
      </Card>

      {/* Privacy & Data */}
      <Text className="text-text-muted mt-6 mb-2">PRIVACY & DATA</Text>
      <Card>
        <View className="py-3 border-b border-border">
          <Text className="text-text">Data & Privacy</Text>
        </View>
        <ToggleRow label="Allow photos for AI training" helper="Help improve our models" />
      </Card>

      {/* App settings */}
      <Text className="text-text-muted mt-6 mb-2">APP SETTINGS</Text>
      <Card>
        <ToggleRow label="Dark Mode" initial />
      </Card>

      {/* Support */}
      <Text className="text-text-muted mt-6 mb-2">SUPPORT & INFO</Text>
      <Card>
        {["Help & Support", "About NattyCheck", "Privacy Policy", "Terms of Service"].map((t, i, arr) => (
          <View key={t} className={`py-3 ${i < arr.length - 1 ? "border-b border-border" : ""}`}>
            <Text className="text-text">{t}</Text>
          </View>
        ))}
      </Card>

      {/* Log out */}
      <View className="mt-5">
        <Button title="Log Out" />
      </View>

      <View className="items-center mt-6">
        <Text className="text-text-muted">NattyCheck v1.0.0</Text>
        <Text className="text-text-muted">AI Physique Analysis · Made for gym enthusiasts</Text>
      </View>
    </ScrollView>
  );
}
