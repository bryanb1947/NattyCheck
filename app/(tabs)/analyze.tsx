import { View, Text, TouchableOpacity } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons, MaterialIcons, Feather } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";

export default function Analyze() {
  const handleStart = async () => {
    try {
      const existing = await AsyncStorage.getItem("lastAnalysis");
      if (existing) {
        router.push("/capture");
      } else {
        router.push("/capture"); // now same route for new users too
      }
    } catch {
      router.push("/capture");
    }
  };

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: "#0B0D0F",
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 24,
      }}
    >
      <LinearGradient
        colors={["#00D0FF", "#B8FF48"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          width: 90,
          height: 90,
          borderRadius: 45,
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 20,
        }}
      >
        <Feather name="camera" size={38} color="#0B0D0F" />
      </LinearGradient>

      <Text
        style={{
          color: "#E8F0FF",
          fontWeight: "800",
          fontSize: 20,
          textAlign: "center",
          marginBottom: 8,
        }}
      >
        Start New Analysis
      </Text>
      <Text
        style={{
          color: "#94A3B8",
          textAlign: "center",
          fontSize: 14,
          marginBottom: 24,
          maxWidth: 320,
          lineHeight: 20,
        }}
      >
        Capture four photos (front, side, back, legs) and our AI will analyze
        your physique in seconds.
      </Text>

      <View style={{ width: "100%", gap: 10, marginBottom: 30 }}>
        {[
          {
            icon: (
              <MaterialIcons name="emoji-objects" size={18} color="#FFD54F" />
            ),
            text: "Stand in bright, even lighting",
          },
          {
            icon: <Ionicons name="shirt-outline" size={18} color="#69F0AE" />,
            text: "Wear tight-fitting clothes or go shirtless",
          },
          {
            icon: <Feather name="user" size={18} color="#FF8A65" />,
            text: "Maintain neutral, relaxed posture",
          },
          {
            icon: <MaterialIcons name="straighten" size={18} color="#BA68C8" />,
            text: "Keep camera at chest height",
          },
        ].map((item, i) => (
          <View
            key={i}
            style={{
              flexDirection: "row",
              alignItems: "center",
              backgroundColor: "#121519",
              borderRadius: 14,
              paddingVertical: 12,
              paddingHorizontal: 14,
              borderWidth: 1,
              borderColor: "#1E232B",
            }}
          >
            {item.icon}
            <Text
              style={{
                color: "#E8F0FF",
                fontSize: 14,
                marginLeft: 10,
                flexShrink: 1,
              }}
            >
              {item.text}
            </Text>
          </View>
        ))}
      </View>

      {/* ✅ FULL BUTTON IS NOW PRESSABLE */}
      <TouchableOpacity
        onPress={handleStart}
        activeOpacity={0.9}
        style={{ width: "100%", maxWidth: 360 }}
      >
        <LinearGradient
          colors={["#00D0FF", "#B8FF48"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            width: "100%",
            borderRadius: 12,
            paddingVertical: 14,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text
            style={{
              color: "#0B0D0F",
              fontWeight: "700",
              fontSize: 15,
            }}
          >
            Begin Photo Capture
          </Text>
        </LinearGradient>
      </TouchableOpacity>

      <Text
        style={{
          color: "#94A3B8",
          textAlign: "center",
          fontSize: 13,
          marginTop: 10,
        }}
      >
        Analysis takes ~30 seconds
      </Text>
    </View>
  );
}
