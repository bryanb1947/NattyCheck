import React, { useMemo } from "react";
import { SafeAreaView, ScrollView, View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Svg, { Path, Circle, Line } from "react-native-svg";

function Card({ children, style }: { children: React.ReactNode; style?: any }) {
  return (
    <View style={[styles.card, style]}>
      {children}
    </View>
  );
}

export default function Progress() {
  // mock data for the chart + history (replace with real later)
  const points = useMemo(() => [1.38, 1.41, 1.43, 1.45], []);
  const history = useMemo(
    () => [
      { date: "Oct 8, 2025", score: 85, tag: "Natty" },
      { date: "Sep 1, 2025", score: 82, tag: "Natty" },
      { date: "Aug 1, 2025", score: 78, tag: "Natty" },
      { date: "Jul 1, 2025", score: 75, tag: "Natty" },
    ],
    []
  );

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.header}>Progress Tracking</Text>
        <Text style={styles.sub}>Your physique evolution over time</Text>

        {/* KPIs */}
        <View style={styles.kpiRow}>
          <Card style={{ flex: 1 }}>
            <Text style={styles.kpiLabel}>Total Analyses</Text>
            <Text style={styles.kpiValue}>4</Text>
            <Text style={styles.kpiDelta}>+1 this month</Text>
          </Card>
          <Card style={{ flex: 1 }}>
            <Text style={styles.kpiLabel}>Overall Score</Text>
            <Text style={styles.kpiValue}>85</Text>
            <Text style={[styles.kpiDelta, { color: "#7CFF7A" }]}>+10 since Jul</Text>
          </Card>
        </View>

        {/* Ratio chart */}
        <Card>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.cardTitle}>Shoulder-to-Waist Ratio</Text>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>+5% growth</Text>
            </View>
          </View>
          <RatioChart series={points} />
          <Text style={styles.caption}>Ideal ratio: 1.4–1.5× · You’re in the optimal range</Text>
        </Card>

        {/* Recent changes */}
        <Card>
          <Text style={styles.cardTitle}>Recent Changes (Sep → Oct)</Text>
          <View style={{ height: 10 }} />
          <RowChange label="Quads" delta="+6%" positive />
          <RowChange label="Posture" delta="+8°" positive />
          <RowChange label="Lats" delta="-2%" positive={false} />
          <RowChange label="Overall Score" delta="+3%" positive />
        </Card>

        {/* Compare CTA */}
        <LinearGradient colors={["#0F2023", "#162610"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.card, { borderColor: "#223034" }]}>
          <Text style={styles.cardTitle}>Compare Analyses</Text>
          <Text style={styles.sub}>Side-by-side before/after view</Text>
          <TouchableOpacity activeOpacity={0.9} style={styles.compareBtn}>
            <Text style={styles.compareText}>Start Comparison  ›</Text>
          </TouchableOpacity>
        </LinearGradient>

        {/* History list */}
        <Text style={[styles.header, { marginTop: 18, fontSize: 18 }]}>Analysis History</Text>
        <View style={{ height: 8 }} />
        {history.map((h, i) => (
          <HistoryRow key={i} date={h.date} score={h.score} tag={h.tag} />
        ))}

        <View style={{ height: 28 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function RatioChart({ series }: { series: number[] }) {
  // simple normalized path within 300x140 viewbox
  const w = 300, h = 140, pad = 20;
  const xs = series.map((_, i) => pad + (i * (w - pad * 2)) / (series.length - 1));
  const min = Math.min(...series), max = Math.max(...series);
  const ys = series.map(v => pad + (h - pad * 2) * (1 - (v - min) / (max - min || 1)));

  let d = `M ${xs[0]} ${ys[0]}`;
  for (let i = 1; i < xs.length; i++) d += ` L ${xs[i]} ${ys[i]}`;

  return (
    <View style={{ alignItems: "center", marginTop: 6, marginBottom: 10 }}>
      <Svg width="100%" height={h} viewBox={`0 0 ${w} ${h}`}>
        {/* grid */}
        <Line x1={pad} y1={h - pad} x2={w - pad} y2={h - pad} stroke="#2A3A3E" strokeWidth={1} />
        <Line x1={pad} y1={pad} x2={pad} y2={h - pad} stroke="#2A3A3E" strokeWidth={1} />
        {/* line */}
        <Path d={d} fill="none" stroke="#12E1D6" strokeWidth={3} />
        {xs.map((x, i) => (
          <Circle key={i} cx={x} cy={ys[i]} r={4} fill="#12E1D6" />
        ))}
      </Svg>
    </View>
  );
}

function RowChange({ label, delta, positive }: { label: string; delta: string; positive: boolean }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={[styles.rowDelta, { color: positive ? "#7CFF7A" : "#FF6B8A" }]}>{delta}</Text>
    </View>
  );
}

function HistoryRow({ date, score, tag }: { date: string; score: number; tag: string }) {
  return (
    <View style={styles.historyRow}>
      <View style={styles.iconBox}>
        <Text style={{ color: "#9AE6B4", fontWeight: "800" }}>📅</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.historyTitle}>{date}</Text>
        <Text style={styles.historySub}>Score: {score} · {tag}</Text>
      </View>
      <Text style={{ color: "#9BA4B5" }}>›</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#0F0F0F" },
  scroll: { flex: 1 },
  content: { padding: 20 },
  header: { color: "#FFFFFF", fontSize: 22, fontWeight: "800" },
  sub: { color: "#B3B3B3", marginTop: 6 },
  kpiRow: { flexDirection: "row", gap: 12, marginTop: 12, marginBottom: 12 },
  card: {
    backgroundColor: "#151515",
    borderColor: "#2A2A2A",
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    marginTop: 8
  },
  cardHeaderRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  cardTitle: { color: "#EDEDED", fontWeight: "700", fontSize: 16 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, backgroundColor: "rgba(184,255,71,0.15)" },
  badgeText: { color: "#B8FF47", fontWeight: "700", fontSize: 12 },
  kpiLabel: { color: "#A7B0B4" },
  kpiValue: { color: "#FFFFFF", fontSize: 26, fontWeight: "800", marginTop: 2 },
  kpiDelta: { color: "#91C3FF", marginTop: 2 },
  caption: { color: "#7F8C92", marginTop: 8 },

  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 6 },
  rowLabel: { color: "#DDE4E7" },
  rowDelta: { fontWeight: "700" },

  historyRow: {
    flexDirection: "row", alignItems: "center", gap: 12,
    backgroundColor: "#151515", borderColor: "#2A2A2A", borderWidth: 1, borderRadius: 16,
    paddingHorizontal: 12, paddingVertical: 14, marginBottom: 10
  },
  iconBox: { width: 36, height: 36, borderRadius: 8, backgroundColor: "#0F2023", alignItems: "center", justifyContent: "center" },
  historyTitle: { color: "#EDEDED", fontWeight: "700" },
  historySub: { color: "#9BA4B5", marginTop: 2 }
});
