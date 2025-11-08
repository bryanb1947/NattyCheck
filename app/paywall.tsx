import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

const { width, height } = Dimensions.get("window");

export default function PaywallScreen() {
  const router = useRouter();

  const handleSubscribe = (plan) => {
    console.log("Selected plan:", plan);
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{
        alignItems: "center",
        justifyContent: "center",
        minHeight: height * 0.95,
        paddingVertical: 40,
      }}
    >
      {/* HEADER ICON */}
      <LinearGradient
        colors={["#00FFE0", "#B8FF48"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.iconCircle}
      >
        <Ionicons name="flash" size={34} color="#0A0B0C" />
      </LinearGradient>

      {/* HEADER TEXT */}
      <Text style={styles.title}>Unlock Full Analysis</Text>
      <Text style={styles.subtitle}>
        Get detailed coaching and track your progress
      </Text>

      {/* FEATURE BOX */}
      <LinearGradient
        colors={["#00FFE0", "#B8FF48"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.featureBorder}
      >
        <View style={styles.featuresBox}>
          {[
            "Detailed muscle breakdown",
            "Custom workout plans",
            "Progress tracking",
            "Unlimited scans",
          ].map((feature, index) => (
            <View key={index} style={styles.featureRow}>
              <Ionicons name="checkmark-circle" size={22} color="#B8FF48" />
              <Text style={styles.featureText}>{feature}</Text>
            </View>
          ))}
        </View>
      </LinearGradient>

      {/* PRICING CARD */}
      <LinearGradient
        colors={["#00FFE0", "#B8FF48"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.priceBorder}
      >
        <TouchableOpacity
          onPress={() => handleSubscribe("annual")}
          activeOpacity={0.9}
          style={styles.priceCard}
        >
          <View style={styles.priceHeader}>
            <Text style={styles.priceTitle}>Annual</Text>
            <View style={styles.saveBadge}>
              <Text style={styles.saveText}>Save 40%</Text>
            </View>
          </View>

          {/* PRICE INLINE */}
          <View style={styles.priceInline}>
            <Text style={styles.priceValue}>$30.00</Text>
            <Text style={styles.pricePeriod}>/year</Text>
          </View>
          <Text style={styles.altPrice}>or $4.00 / month</Text>
        </TouchableOpacity>
      </LinearGradient>

      {/* CTA BUTTON */}
      <TouchableOpacity
        onPress={() => handleSubscribe("trial")}
        activeOpacity={0.9}
        style={styles.ctaWrapper}
      >
        <LinearGradient
          colors={["#00FFE0", "#B8FF48"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.ctaButton}
        >
          <Text style={styles.ctaText}>Start Free Trial</Text>
        </LinearGradient>
      </TouchableOpacity>

      <Text style={styles.trialText}>3-day free trial • Cancel anytime</Text>

      {/* BACK BUTTON */}
      <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
        <Text style={styles.backText}>← Back</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0A0B0C",
  },
  iconCircle: {
    width: 70,
    height: 70,
    borderRadius: 35,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 22,
    shadowColor: "#00FFE0",
    shadowOpacity: 0.4,
    shadowRadius: 12,
  },
  title: {
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: "600",
    marginBottom: 6,
  },
  subtitle: {
    color: "#9B9B9B",
    fontSize: 14,
    textAlign: "center",
    width: "80%",
    marginBottom: 26,
  },
  featureBorder: {
    width: width * 0.9,
    borderRadius: 22,
    padding: 2,
    marginBottom: 30,
  },
  featuresBox: {
    backgroundColor: "#121416",
    borderRadius: 20,
    padding: 22,
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 8,
  },
  featureText: {
    color: "#E8E8E8",
    fontSize: 15,
    marginLeft: 10,
  },
  priceBorder: {
    width: width * 0.9,
    borderRadius: 22,
    padding: 2,
    marginBottom: 20,
  },
  priceCard: {
    backgroundColor: "#0F1215",
    borderRadius: 20,
    paddingVertical: 26,
    alignItems: "center",
  },
  priceHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  priceTitle: {
    color: "#B8FF48",
    fontSize: 16,
    fontWeight: "600",
  },
  saveBadge: {
    backgroundColor: "#B8FF48",
    borderRadius: 10,
    marginLeft: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  saveText: {
    color: "#0A0B0C",
    fontSize: 12,
    fontWeight: "700",
  },

  // INLINE PRICE
  priceInline: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "center",
    marginTop: 4,
  },
  priceValue: {
    color: "#FFFFFF",
    fontSize: 32,
    fontWeight: "700",
  },
  pricePeriod: {
    color: "#A3A3A3",
    fontSize: 16,
    marginLeft: 6,
    marginBottom: 3,
  },
  altPrice: {
    color: "#A3A3A3",
    fontSize: 13,
    marginTop: 4,
  },

  ctaWrapper: {
    width: width * 0.9,
  },
  ctaButton: {
    width: "100%",
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  ctaText: {
    color: "#0A0B0C",
    fontWeight: "700",
    fontSize: 15,
  },
  trialText: {
    color: "#A3A3A3",
    fontSize: 12,
    textAlign: "center",
    marginTop: 10,
  },
  backButton: {
    marginTop: 30,
  },
  backText: {
    color: "#B8FF48",
    fontSize: 15,
    textAlign: "center",
  },
});
