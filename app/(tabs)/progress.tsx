// app/(tabs)/progress.tsx
import React, { useEffect, useMemo, useState } from "react";
import {
  Dimensions,
  ScrollView,
  View,
  Text,
  Pressable,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import Svg, {
  Polyline,
  Line,
  Defs,
  LinearGradient as SvgLinearGradient,
  Stop,
  Circle,
} from "react-native-svg";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { supabase } from "@/lib/supabase";
import { router } from "expo-router";
import { useAuthStore } from "@/store/useAuthStore";

const { width: W } = Dimensions.get("window");

// ---- Style Palette ----
const colors = {
  bg: "#0B0F10",
  card: "#0F1418",
  border: "#1D2A2F",
  text: "#E8F3F1",
  dim: "#9AA7AD",
  accent: "#B8FF48",
  mint: "#00FFE0",
  chip: "#0F1B20",
  good: "#8DFF6A",
  bad: "#FF6A6A",
};

// -------------------------
// Types
// -------------------------
type MuscleKey =
  | "overall"
  | "chest"
  | "back"
  | "shoulders"
  | "arms"
  | "core"
  | "legs";

type DbAnalysisRow = {
  id: string;
  created_at: string;
  score: number;
  natty: boolean;
  bodyfat: number | null;
  symmetry: number | null;
  confidence: number | null;
  muscles: Record<string, number> | null;
  type: string;
};

type NormalizedAnalysis = {
  id: string;
  date: string;
  score: number;
  natty: boolean;
  muscles: Record<MuscleKey, number>;
};

const MUSCLE_LABEL: Record<MuscleKey, string> = {
  overall: "Overall",
  chest: "Chest",
  back: "Back",
  shoulders: "Shoulders",
  arms: "Arms",
  core: "Core",
  legs: "Legs",
};

// -------------------------
// Helpers
// -------------------------
const formatMMM = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, { month: "short" });

function pctDelta(current: number, prev: number) {
  if (prev === 0) return 0;
  return Math.round(((current - prev) / prev) * 100);
}

function avg(nums: (number | undefined)[]) {
  const filtered = nums.filter(
    (n): n is number => typeof n === "number" && !isNaN(n)
  );
  if (!filtered.length) return 0;
  return Math.round(filtered.reduce((s, n) => s + n, 0) / filtered.length);
}

// Normalize analysis
function normalizeRow(row: DbAnalysisRow): NormalizedAnalysis {
  const m = row.muscles || {};

  const shoulders =
    m["shoulders"] ??
    m["delts"] ??
    avg([m["front_delts"], m["side_delts"], m["rear_delts"]]) ??
    row.score;

  return {
    id: row.id,
    date: row.created_at,
    score: row.score,
    natty: !!row.natty,
    muscles: {
      overall: row.score,
      chest: m["chest"] ?? row.score,
      back: m["back"] ?? row.score,
      shoulders,
      arms:
        avg([m["biceps"] as number, m["triceps"] as number]) || row.score,
      core: m["core"] ?? m["abs"] ?? row.score,
      legs:
        avg([
          m["quads"] as number,
          m["hamstrings"] as number,
          m["calves"] as number,
        ]) || row.score,
    },
  };
}

// -------------------------
// Trend Chart
// -------------------------
const TrendChart = ({
  data,
  height = 170,
}: {
  data: { x: string; y: number }[];
  height?: number;
}) => {
  const PAD_X = 18;
  const PAD_Y = 14;
  const chartW = W - 32 - PAD_X * 2;
  const chartH = height - PAD_Y * 2;

  if (!data.length) {
    return (
      <View style={{ width: W - 32, height, alignItems: "center", justifyContent: "center" }}>
        <Text style={styles.dim}>No data yet</Text>
      </View>
    );
  }

  const ys = data.map((d) => d.y);
  const minY = Math.min(...ys) - 2;
  const maxY = Math.max(...ys) + 2;
  const span = Math.max(1, maxY - minY);

  const points = data.map((d, i) => {
    const x = (i / Math.max(1, data.length - 1)) * chartW + PAD_X;
    const y = chartH - ((d.y - minY) / span) * chartH + PAD_Y;
    return `${x},${y}`;
  });

  const last = data[data.length - 1];
  const lx =
    ((data.length - 1) / Math.max(1, data.length - 1)) * chartW + PAD_X;
  const ly = chartH - ((last.y - minY) / span) * chartH + PAD_Y;

  return (
    <Svg width={W - 32} height={height}>
      <Defs>
        <SvgLinearGradient id="g" x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0" stopColor={colors.mint} />
          <Stop offset="1" stopColor={colors.accent} />
        </SvgLinearGradient>
      </Defs>

      <Line
        x1={PAD_X}
        y1={height - PAD_Y}
        x2={W - 32 - PAD_X}
        y2={height - PAD_Y}
        stroke={colors.border}
        strokeWidth={1}
      />

      <Polyline
        points={points.join(" ")}
        fill="none"
        stroke="url(#g)"
        strokeWidth={3}
        strokeLinejoin="round"
        strokeLinecap="round"
      />

      <Circle cx={lx} cy={ly} r={4.5} fill={colors.mint} />
      <Circle cx={lx} cy={ly} r={8} fill="rgba(0,255,224,0.25)" />
    </Svg>
  );
};

// -------------------------
// Main Component
// -------------------------
export default function ProgressScreen() {
  const [muscle, setMuscle] = useState<MuscleKey>("overall");
  const [analyses, setAnalyses] = useState<NormalizedAnalysis[]>([]);
  const [loading, setLoading] = useState(true);
  const [historyLimit, setHistoryLimit] = useState(5);

  const { userId } = useAuthStore();
  const hasHydratedAuth = useAuthStore.persist.hasHydrated();

  // Load analyses
  useEffect(() => {
    if (!hasHydratedAuth) return;

    const load = async () => {
      setLoading(true);

      if (!userId) {
        setAnalyses([]);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("analysis_history")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: true });

      if (!error && data) {
        setAnalyses((data as DbAnalysisRow[]).map(normalizeRow));
      }

      setLoading(false);
    };

    load();
  }, [userId, hasHydratedAuth]);

  const latest = analyses.at(-1);
  const prev = analyses.at(-2);

  const overallDelta =
    latest && prev ? pctDelta(latest.score, prev.score) : 0;

  // Chart series
  const series = useMemo(
    () =>
      analyses.map((a) => ({
        x: formatMMM(a.date),
        y: a.muscles[muscle],
      })),
    [analyses, muscle]
  );

  const groups: MuscleKey[] = [
    "chest",
    "back",
    "shoulders",
    "arms",
    "core",
    "legs",
  ];

  const recentChanges =
    latest && prev
      ? groups.map((k) => ({
          key: k,
          label: MUSCLE_LABEL[k],
          delta: pctDelta(latest.muscles[k], prev.muscles[k]),
        }))
      : [];

  const empty = !loading && analyses.length === 0;

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        <Text style={styles.h1}>Progress Tracking</Text>
        <Text style={styles.sub}>Your physique evolution over time</Text>

        {/* Monthly Report */}
        <Pressable
          onPress={() => router.push("/monthly-report")}
          style={({ pressed }) => [
            styles.card,
            { marginTop: 12, paddingVertical: 18, opacity: pressed ? 0.7 : 1 },
          ]}
        >
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <View style={styles.iconWrap}>
              <Ionicons name="bar-chart-outline" size={18} color={colors.accent} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>Monthly Physique Report</Text>
              <Text style={[styles.dim, { marginTop: 2 }]}>
                See this month’s scans, improvements, and weak-point changes.
              </Text>
            </View>
            <View style={styles.chipPill}>
              <Text style={styles.chipPillText}>
                {new Date().toLocaleDateString(undefined, {
                  month: "long",
                  year: "numeric",
                })}
              </Text>
            </View>
          </View>
        </Pressable>

        {/* Past Reports */}
        <Pressable
          onPress={() => router.push("/reports")}
          style={({ pressed }) => [
            styles.card,
            { marginTop: 10, paddingVertical: 16, opacity: pressed ? 0.7 : 1 },
          ]}
        >
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <View style={[styles.iconWrap, { backgroundColor: "#10131E" }]}>
              <Ionicons name="time-outline" size={18} color={colors.mint} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>Previous Monthly Reports</Text>
              <Text style={[styles.dim, { marginTop: 2 }]}>
                Jump back to any month’s before/after report.
              </Text>
            </View>
            <View style={styles.historyChev} />
          </View>
        </Pressable>

        {/* No Analyses */}
        {loading && (
          <View style={{ paddingVertical: 24, alignItems: "center" }}>
            <ActivityIndicator color={colors.accent} />
            <Text style={[styles.dim, { marginTop: 8 }]}>
              Loading your analyses…
            </Text>
          </View>
        )}

        {empty && (
          <View style={[styles.card, { marginTop: 16 }]}>
            <Text style={styles.cardTitle}>No analyses yet</Text>
            <Text style={[styles.dim, { marginTop: 4 }]}>
              Save your first NattyCheck scan to start tracking progress.
            </Text>
          </View>
        )}

        {/* Main Content */}
        {latest && !empty && (
          <>
            {/* STATS */}
            <View style={styles.row}>
              <View style={styles.smallCard}>
                <Text style={styles.cardTitle}>Total Analyses</Text>
                <Text style={styles.bigNumber}>{analyses.length}</Text>
                <Text style={[styles.delta, { color: colors.good }]}>
                  {analyses.length > 1
                    ? `+${analyses.length - 1} since first`
                    : "First report saved"}
                </Text>
              </View>

              <View style={styles.smallCard}>
                <Text style={styles.cardTitle}>Overall Score</Text>
                <Text style={styles.bigNumber}>{latest.score}</Text>
                {prev && (
                  <Text
                    style={[
                      styles.delta,
                      {
                        color:
                          overallDelta >= 0 ? colors.good : colors.bad,
                      },
                    ]}
                  >
                    {overallDelta >= 0 ? "+" : ""}
                    {overallDelta}% since last
                  </Text>
                )}
              </View>
            </View>

            {/* TREND */}
            <View style={styles.card}>
              <View style={[styles.row, { marginBottom: 10 }]}>
                <Text style={styles.cardTitle}>Trend</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {(
                    [
                      "overall",
                      "chest",
                      "back",
                      "shoulders",
                      "arms",
                      "core",
                      "legs",
                    ] as MuscleKey[]
                  ).map((k) => (
                    <Pressable
                      key={k}
                      onPress={() => setMuscle(k)}
                      style={[
                        styles.chip,
                        {
                          borderColor: muscle === k ? colors.accent : colors.border,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.chipText,
                          { color: muscle === k ? colors.accent : colors.text },
                        ]}
                      >
                        {MUSCLE_LABEL[k]}
                      </Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </View>

              <TrendChart data={series} />

              <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 8 }}>
                {analyses.map((a) => (
                  <Text key={a.id} style={styles.axisLabel}>
                    {formatMMM(a.date)}
                  </Text>
                ))}
              </View>
            </View>

            {/* RECENT CHANGES */}
            {recentChanges.length > 0 && (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Recent Changes</Text>

                {recentChanges.map((r) => (
                  <View key={r.key} style={styles.changeRow}>
                    <Text style={styles.changeLabel}>{r.label}</Text>
                    <Text
                      style={[
                        styles.changeValue,
                        { color: r.delta >= 0 ? colors.good : colors.bad },
                      ]}
                    >
                      {r.delta >= 0 ? "+" : ""}
                      {r.delta}%
                    </Text>
                  </View>
                ))}
              </View>
            )}

            {/* HISTORY WITH LOAD MORE */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Analysis History</Text>

              {analyses
                .slice()
                .reverse()
                .slice(0, historyLimit)
                .map((a) => (
                  <Pressable
                    key={a.id}
                    onPress={() => router.push(`/results-details?id=${a.id}`)}
                    style={({ pressed }) => [
                      styles.historyRow,
                      { opacity: pressed ? 0.5 : 1 },
                    ]}
                  >
                    <View style={styles.historyBadge}>
                      <Ionicons
                        name="reader-outline"
                        size={14}
                        color={colors.accent}
                      />
                    </View>

                    <View style={{ flex: 1 }}>
                      <Text style={styles.historyDate}>
                        {new Date(a.date).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </Text>
                      <Text style={styles.dim}>
                        Score {a.score} · {a.natty ? "Natty" : "Enhanced"}
                      </Text>
                    </View>

                    <View style={styles.historyChev} />
                  </Pressable>
                ))}

              {historyLimit < analyses.length && (
                <Pressable
                  onPress={() => setHistoryLimit(historyLimit + 5)}
                  style={styles.loadMore}
                >
                  <Text style={styles.loadMoreText}>Load More</Text>
                </Pressable>
              )}
            </View>
          </>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// -------------------------
// Styles
// -------------------------
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  h1: { color: colors.text, fontSize: 22, fontWeight: "700" },
  sub: { color: colors.dim, marginTop: 4, marginBottom: 12 },

  row: { flexDirection: "row", gap: 12 },

  smallCard: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 14,
    borderColor: colors.border,
    borderWidth: StyleSheet.hairlineWidth,
    marginTop: 12,
  },

  bigNumber: {
    color: colors.text,
    fontSize: 28,
    fontWeight: "800",
    marginTop: 2,
  },

  delta: { marginTop: 4, fontSize: 12 },

  card: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 16,
    borderColor: colors.border,
    borderWidth: StyleSheet.hairlineWidth,
    marginTop: 12,
  },

  cardTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "700",
  },

  dim: { color: colors.dim, fontSize: 12 },

  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    marginLeft: 8,
    backgroundColor: colors.chip,
  },
  chipText: { fontSize: 12, fontWeight: "700" },

  axisLabel: { color: colors.dim, fontSize: 11 },

  changeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 10,
    borderBottomColor: colors.border,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },

  changeLabel: { color: colors.text, fontSize: 14, fontWeight: "600" },

  changeValue: { fontSize: 14, fontWeight: "800" },

  historyRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    gap: 12,
    borderBottomColor: colors.border,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },

  historyBadge: {
    width: 26,
    height: 26,
    borderRadius: 6,
    backgroundColor: "#0E1C15",
    borderColor: colors.accent,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  historyDate: { color: colors.text, fontWeight: "700" },

  historyChev: {
    width: 8,
    height: 8,
    borderRightWidth: 2,
    borderTopWidth: 2,
    borderColor: colors.dim,
    transform: [{ rotate: "45deg" }],
  },

  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: "#0E1A18",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },

  chipPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: "#102413",
  },

  chipPillText: {
    color: colors.accent,
    fontSize: 11,
    fontWeight: "700",
  },

  loadMore: {
    marginTop: 14,
    alignSelf: "center",
    paddingVertical: 8,
    paddingHorizontal: 22,
    borderRadius: 10,
    backgroundColor: "#131A1E",
    borderWidth: 1,
    borderColor: colors.border,
  },

  loadMoreText: {
    color: colors.accent,
    fontSize: 14,
    fontWeight: "700",
  },
});
