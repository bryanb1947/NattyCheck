import { ScrollView, View, Text } from "react-native";
import Card from "../../components/ui/Card";
import { useResultsStore } from "../../store/useResultsStore";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";

const fallbackColors = {
  bg: "#0B0D0F",
  card: "#121519",
  text: "#E8F0FF",
  dim: "#94A3B8",
  accentA: "#00D0FF",
  accentB: "#B8FF48",
};

export default function Dashboard() {
  const { last } = useResultsStore();
  const colors = fallbackColors; // safety so bg never breaks

  return (
    <ScrollView
      style={{
        flex: 1,
        backgroundColor: colors.bg,
        paddingHorizontal: 20,
        paddingTop: 40,
      }}
      contentContainerStyle={{ paddingBottom: 100 }}
    >
      {/* Header */}
      <View style={{ alignItems: "center", marginBottom: 24 }}>
        <LinearGradient
          colors={[colors.accentA, colors.accentB]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            width: 70,
            height: 70,
            borderRadius: 35,
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 12,
          }}
        >
          <Feather name="bar-chart-2" size={32} color={colors.bg} />
        </LinearGradient>
        <Text
          style={{
            color: colors.text,
            fontWeight: "800",
            fontSize: 20,
            textAlign: "center",
          }}
        >
          Dashboard
        </Text>
        <Text
          style={{
            color: colors.dim,
            fontSize: 14,
            marginTop: 6,
            textAlign: "center",
            maxWidth: 300,
          }}
        >
          Track your latest analyses and improvements over time.
        </Text>
      </View>

      {/* Content */}
      {last ? (
        <>
          <Card
            style={{
              marginBottom: 16,
              backgroundColor: colors.card,
              borderRadius: 16,
              padding: 20,
            }}
          >
            <Text
              style={{
                color: colors.text,
                fontSize: 16,
                fontWeight: "700",
                marginBottom: 4,
              }}
            >
              Last Analysis
            </Text>
            <Text style={{ color: colors.dim, fontSize: 13 }}>
              {last.date || "Oct 8, 2025"}
            </Text>

            <View style={{ marginTop: 14, gap: 6 }}>
              <Text style={{ color: colors.text, fontSize: 14 }}>
                Upper Body: {last.upperBody ?? "88%"}
              </Text>
              <Text style={{ color: colors.text, fontSize: 14 }}>
                Lower Body: {last.lowerBody ?? "82%"}
              </Text>
              <Text style={{ color: colors.text, fontSize: 14 }}>
                Symmetry: {last.symmetry ?? "91%"}
              </Text>
              <Text style={{ color: colors.text, fontSize: 14 }}>
                Confidence: {last.confidence ?? "94%"}
              </Text>
            </View>
          </Card>

          <Card
            style={{
              backgroundColor: colors.card,
              borderRadius: 16,
              padding: 20,
            }}
          >
            <Text
              style={{
                color: colors.text,
                fontSize: 16,
                fontWeight: "700",
                marginBottom: 8,
              }}
            >
              Training Suggestion
            </Text>
            <Text style={{ color: colors.dim, fontSize: 13, marginBottom: 10 }}>
              Recommended split based on your weak points:
            </Text>
            <Text
              style={{
                color: colors.text,
                fontWeight: "600",
                fontSize: 15,
              }}
            >
              Push / Pull / Legs – Posterior emphasis (6 days/week)
            </Text>
            <Text
              style={{
                color: colors.dim,
                fontSize: 13,
                marginTop: 6,
              }}
            >
              Increased pulling volume to balance lat and hamstring lag.
            </Text>
          </Card>
        </>
      ) : (
        <View
          style={{
            backgroundColor: colors.card,
            borderRadius: 16,
            padding: 20,
            alignItems: "center",
          }}
        >
          <Feather name="camera" size={40} color={colors.dim} />
          <Text
            style={{
              color: colors.text,
              fontSize: 16,
              fontWeight: "600",
              marginTop: 14,
              textAlign: "center",
            }}
          >
            No Analyses Yet
          </Text>
          <Text
            style={{
              color: colors.dim,
              fontSize: 13,
              textAlign: "center",
              marginTop: 6,
            }}
          >
            Start your first analysis to view your progress here.
          </Text>
        </View>
      )}
    </ScrollView>
  );
}
