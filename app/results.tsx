import React, { useEffect, useState, useMemo } from "react";
import { SafeAreaView, ScrollView, View, Text, StyleSheet, TouchableOpacity, Share, Alert } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, router } from "expo-router";
import { Api } from "../lib/api";

type ResultJson = {
  completedAt?: string;
  confidence?: number;
  overallScore?: number;
  summary?: { upperBody?: number; lowerBody?: number; symmetry?: number; posture?: number };
  natty?: { status?: string; confidence?: number };
};

export default function Results() {
  const { jobId } = useLocalSearchParams<{ jobId?: string }>();
  const [data, setData] = useState<ResultJson | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!jobId) return;
      try {
        const job = await Api.job(jobId);
        if (mounted) setData(job?.results ?? null);
      } catch (e:any) {
        Alert.alert("Error", e?.message ?? "Failed to load results.");
      }
    })();
    return () => { mounted = false; };
  }, [jobId]);

  const dateLabel = useMemo(() => {
    if (!data?.completedAt) return "";
    try { return new Date(data.completedAt).toLocaleDateString(undefined, { year:"numeric", month:"short", day:"numeric" }); }
    catch { return ""; }
  }, [data?.completedAt]);

  const onShare = async () => {
    if (!data) return;
    const s = data.summary || {};
    const msg = `NattyCheck • Score ${data.overallScore ?? "-"}\nUpper: ${s.upperBody ?? "-"}  Lower: ${s.lowerBody ?? "-"}\nSymmetry: ${s.symmetry ?? "-"}  Confidence: ${Math.round((data.confidence ?? 0) * 100)}%`;
    try { await Share.share({ message: msg }); } catch {}
  };

  const score = data?.overallScore ?? 0;
  const s = data?.summary ?? {};
  const nattyStatus = data?.natty?.status ?? "NATURAL";
  const confPct = Math.round((data?.confidence ?? 0) * 100);

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <View style={styles.cardOuter}>
          <LinearGradient colors={["#0C2321", "#0D0F10"]} start={{x:0,y:0}} end={{x:1,y:1}} style={styles.card}>
            <View style={styles.topRow}>
              <View style={styles.badge}><Text style={styles.badgeText}>N</Text></View>
              {dateLabel ? <View style={styles.datePill}><Text style={styles.datePillText}>{dateLabel}</Text></View> : null}
            </View>

            <View style={styles.scoreWrap}>
              <LinearGradient colors={["#12E1D6", "#B8FF47"]} start={{x:0,y:0}} end={{x:1,y:1}} style={styles.scoreRing}>
                <View style={styles.scoreInner}>
                  <Text style={styles.scoreText}>{score}</Text>
                  <Text style={styles.scoreLabel}>Score</Text>
                </View>
              </LinearGradient>
            </View>

            <Text style={styles.title}>Physique Report</Text>
            <Text style={styles.subtitle}>AI Analysis Complete</Text>

            <View style={styles.statsGrid}>
              <StatPill label="Upper Body" value={`${s.upperBody ?? "-" }%`} />
              <StatPill label="Lower Body" value={`${s.lowerBody ?? "-" }%`} />
              <StatPill label="Symmetry" value={`${s.symmetry ?? "-" }%`} />
              <StatPill label="Confidence" value={`${confPct}%`} />
            </View>

            <View style={styles.nattyRow}>
              <View style={styles.nattyBadge}><Text style={styles.nattyBadgeIcon}>🧬</Text><Text style={styles.nattyBadgeText}>Natty Status</Text></View>
              <View style={styles.nattyPill}><Text style={styles.nattyPillText}>{nattyStatus}</Text><Text style={styles.nattyCheck}>▣</Text></View>
            </View>
          </LinearGradient>
        </View>

        {/* Actions */}
        <View style={{ height: 12 }} />
        <View style={styles.actions}>
          <TouchableOpacity onPress={() => router.replace("/(tabs)/analyze")} style={styles.actionBtn}>
            <Text style={styles.actionText}>Retake</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={onShare} style={styles.actionBtn}>
            <Text style={styles.actionText}>Share</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionBtnPrimary} onPress={() => router.push({ pathname: "/paywall", params: { from: "/results" } })}>
            <LinearGradient colors={["#00FFE0", "#B8FF47"]} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={styles.actionBtnPrimaryFill}>
              <Text style={styles.actionPrimaryText}>Upgrade</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => router.push("/results-details")} style={styles.actionBtn}>
            <Text style={styles.actionText}>View Details</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => router.replace("/(tabs)/index")} style={styles.actionBtnGhost}>
            <Text style={styles.actionGhostText}>Back to Dashboard</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function StatPill({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.statPill}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#0F0F0F" },
  scroll: { flex: 1 },
  content: { padding: 16, paddingBottom: 28 },
  cardOuter: { borderRadius: 20, borderWidth: 1, borderColor: "#173236", backgroundColor: "#0B0E0F", overflow: "hidden" },
  card: { padding: 18, borderRadius: 20, minHeight: 420 },
  topRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  badge: { width: 36, height: 36, borderRadius: 10, backgroundColor: "#A6FFCF", alignItems: "center", justifyContent: "center" },
  badgeText: { color: "#0C0C0C", fontWeight: "800" },
  datePill: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, backgroundColor: "#19341E" },
  datePillText: { color: "#B8FF47", fontWeight: "700", fontSize: 12 },
  scoreWrap: { alignItems: "center", marginTop: 22, marginBottom: 10 },
  scoreRing: { width: 150, height: 150, borderRadius: 999, padding: 4, alignItems: "center", justifyContent: "center" },
  scoreInner: { width: 142, height: 142, borderRadius: 999, backgroundColor: "#0F1719", alignItems: "center", justifyContent: "center" },
  scoreText: { color: "#FFFFFF", fontSize: 44, fontWeight: "800" },
  scoreLabel: { color: "#8FA3A8", marginTop: 4 },
  title: { color: "#FFFFFF", textAlign: "center", fontSize: 18, fontWeight: "800", marginTop: 6 },
  subtitle: { color: "#9DB1B5", textAlign: "center", marginTop: 2 },
  statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12, justifyContent: "space-between", marginTop: 16 },
  statPill: { width: "48%", backgroundColor: "#121517", borderColor: "#242E30", borderWidth: 1, borderRadius: 14, paddingHorizontal: 12, paddingVertical: 12 },
  statLabel: { color: "#9FB2B6", fontSize: 12 },
  statValue: { color: "#FFFFFF", fontWeight: "800", fontSize: 18, marginTop: 6 },
  nattyRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: "#0F1A11", borderColor: "#214423", borderWidth: 1, borderRadius: 16, padding: 12, marginTop: 16 },
  nattyBadge: { flexDirection: "row", alignItems: "center", gap: 8 },
  nattyBadgeIcon: { fontSize: 16, color: "#B8FF47" },
  nattyBadgeText: { color: "#CFE9CF", fontWeight: "700" },
  nattyPill: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, backgroundColor: "#19341E" },
  nattyPillText: { color: "#B8FF47", fontWeight: "800" },
  nattyCheck: { color: "#B8FF47", fontWeight: "900" },
  actions: { gap: 10, marginTop: 10 },
  actionBtn: { height: 52, borderRadius: 14, backgroundColor: "#151A1D", borderWidth: 1, borderColor: "#2A3438", alignItems: "center", justifyContent: "center" },
  actionText: { color: "#DDE4E7", fontWeight: "700" },
  actionBtnPrimary: { borderRadius: 14, overflow: "hidden" },
  actionBtnPrimaryFill: { height: 52, alignItems: "center", justifyContent: "center" },
  actionPrimaryText: { color: "#0A0A0A", fontWeight: "800" },
  actionBtnGhost: { height: 52, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  actionGhostText: { color: "#8AA0A7", fontWeight: "700" },
});
