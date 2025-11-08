import { View, Text, ScrollView } from "react-native";
import { useResultsStore } from "../../store/useResultsStore";
import Card from "../../components/ui/Card";
import { colors } from "../../constants/theme";

export default function ProgressScreen() {
  const { history } = useResultsStore();

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg, padding: 16 }}>
      <Card style={{ marginBottom: 16 }}>
        <Text style={{ color: colors.text, fontWeight: "700" }}>Progress Tracking</Text>
        <Text style={{ color: colors.dim, marginTop: 6 }}>
          Your physique evolution over time
        </Text>
      </Card>

      <Card>
        <Text style={{ color: colors.text, fontWeight: "700", marginBottom: 10 }}>Analysis History</Text>
        {history.length === 0 && <Text style={{ color: colors.dim }}>No history yet.</Text>}
        {history.map((r) => (
          <View key={r.id} style={{
            borderTopColor: "#1E232B", borderTopWidth: 1, paddingVertical: 12
          }}>
            <Text style={{ color: colors.text, fontWeight: "700" }}>
              {new Date(r.completedAt).toLocaleDateString()} — Score {Math.round(r.score)}
            </Text>
            <Text style={{ color: colors.dim }}>Natty: {r.natty ? "Yes" : "No"} • Confidence {Math.round(r.confidence*100)}%</Text>
          </View>
        ))}
      </Card>
    </ScrollView>
  );
}
