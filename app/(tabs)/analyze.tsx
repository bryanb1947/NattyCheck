import React from "react";
import { SafeAreaView, ScrollView, View, Text, StyleSheet, Image, TouchableOpacity, Alert } from "react-native";
import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { useCaptureStore } from "../../store/useCaptureStore";
import { useAuthStore } from "../../store/useAuthStore";
import { Api } from "../../lib/api";

export default function Analyze() {
  const { frontUri, sideUri, backUri, clearFront, clearSide, clearBack } = useCaptureStore();
  const { isPro, freeScansLeft, consumeFreeScan } = useAuthStore();
  const allSet = !!frontUri && !!sideUri && !!backUri;

  const onSubmit = async () => {
    if (!allSet) return;

    // free vs pro gate (unchanged)
    if (!isPro) {
      if (freeScansLeft <= 0) {
        router.push({ pathname: "/paywall", params: { from: "/(tabs)/analyze" } });
        return;
      }
      const ok = await consumeFreeScan();
      if (!ok) {
        router.push({ pathname: "/paywall", params: { from: "/(tabs)/analyze" } });
        return;
      }
    }

    try {
      // For MVP we just pass the local URIs along; the API ignores them for now.
      const resp = await Api.analyze({
        frontUrl: frontUri || undefined,
        sideUrl: sideUri || undefined,
        backUrl: backUri || undefined,
        userId: "demo-user",
      });
      router.push({ pathname: "/analyzing", params: { jobId: resp.jobId } });
    } catch (e: any) {
      Alert.alert("Error", e?.message ?? "Failed to start analysis.");
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.header}>Start New Analysis</Text>
        <Text style={styles.sub}>
          {isPro ? "Pro: unlimited analyses." : `Free: ${freeScansLeft} analyses left.`} Make sure lighting is even.
        </Text>

        <View style={styles.grid}>
          <Shot label="Front" uri={frontUri} onRetake={() => router.push("/capture?view=front&single=1")} onClear={clearFront} />
          <Shot label="Side" uri={sideUri} onRetake={() => router.push("/capture?view=side&single=1")} onClear={clearSide} />
          <Shot label="Back" uri={backUri} onRetake={() => router.push("/capture?view=back&single=1")} onClear={clearBack} />
        </View>

        <TouchableOpacity activeOpacity={0.9} disabled={!allSet} onPress={onSubmit} style={[styles.submitWrap, !allSet && { opacity: 0.5 }]}>
          <LinearGradient colors={["#00FFE0", "#B8FF47"]} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={styles.submitBtn}>
            <Text style={styles.submitText}>{allSet ? "Submit for Analysis" : "Capture All Views to Continue"}</Text>
          </LinearGradient>
        </TouchableOpacity>

        <View style={{ height: 28 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function Shot({ label, uri, onRetake, onClear }: { label: string; uri?: string | null; onRetake: () => void; onClear: () => void; }) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardLabel}>{label}</Text>
      <View style={styles.imageWrap}>
        {uri ? <Image source={{ uri }} style={styles.image} /> : <View style={styles.placeholder}><Text style={styles.placeholderText}>No photo</Text></View>}
      </View>
      <View style={styles.row}>
        <TouchableOpacity onPress={onRetake} style={[styles.smallBtn, { backgroundColor: "#1E2326" }]}><Text style={styles.smallBtnText}>Retake</Text></TouchableOpacity>
        {uri ? <TouchableOpacity onPress={onClear} style={[styles.smallBtn, { backgroundColor: "#2A2A2A" }]}><Text style={styles.smallBtnText}>Clear</Text></TouchableOpacity> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#0F0F0F" },
  scroll: { flex: 1 },
  content: { padding: 20 },
  header: { color: "#FFFFFF", fontSize: 26, fontWeight: "800" },
  sub: { color: "#B3B3B3", marginTop: 6, marginBottom: 10 },
  grid: { gap: 12, marginTop: 6 },
  card: { backgroundColor: "#151515", borderColor: "#2A2A2A", borderWidth: 1, borderRadius: 16, padding: 12 },
  cardLabel: { color: "#E3E3E3", marginBottom: 8, fontWeight: "700" },
  imageWrap: { height: 220, borderRadius: 12, overflow: "hidden", backgroundColor: "#0F1315", alignItems: "center", justifyContent: "center" },
  image: { width: "100%", height: "100%" },
  placeholder: { alignItems: "center", justifyContent: "center" },
  placeholderText: { color: "#52636A" },
  row: { flexDirection: "row", gap: 10, marginTop: 10 },
  smallBtn: { flex: 1, height: 44, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  smallBtnText: { color: "#DDE4E7", fontWeight: "700" },
  submitWrap: { marginTop: 18 },
  submitBtn: { height: 56, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  submitText: { color: "#0B0B0B", fontWeight: "800" },
});
