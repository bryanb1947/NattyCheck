// app/reports/index.tsx
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/store/useAuthStore";

const colors = {
  bg: "#050707",
  card: "#101417",
  border: "#1B2429",
  text: "#FFFFFF",
  dim: "#9AA4AF",
  accent: "#B8FF47",
};

type DbRow = {
  id: string;
  created_at: string;
};

type MonthSummary = {
  key: string; // "2024-11"
  year: number;
  monthIndex: number; // 0–11
  label: string;
  firstDate: string;
  lastDate: string;
  count: number;
};

function formatMonthLabel(year: number, monthIndex: number) {
  const d = new Date(year, monthIndex, 1);
  return d.toLocaleDateString(undefined, { month: "long", year: "numeric" });
}

function formatShortDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export default function ReportsIndexScreen() {
  const router = useRouter();
  const { userId } = useAuthStore();
  const hasHydratedAuth = useAuthStore.persist.hasHydrated();

  const [loading, setLoading] = useState(true);
  const [months, setMonths] = useState<MonthSummary[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!hasHydratedAuth) return;

    if (!userId) {
      setLoading(false);
      setError("Login required");
      return;
    }

    const load = async () => {
      try {
        setLoading(true);
        const { data, error: dbError } = await supabase
          .from("analysis_history")
          .select("id, created_at")
          .eq("user_id", userId)
          .order("created_at", { ascending: true });

        if (dbError) {
          console.log("ReportsIndex fetch error:", dbError);
          setError(dbError.message);
          setMonths([]);
          return;
        }

        const rows = (data as DbRow[]) || [];

        const map = new Map<string, MonthSummary>();

        for (const row of rows) {
          const d = new Date(row.created_at);
          const y = d.getFullYear();
          const m = d.getMonth();
          const key = `${y}-${m}`;

          const existing = map.get(key);
          if (!existing) {
            map.set(key, {
              key,
              year: y,
              monthIndex: m,
              label: formatMonthLabel(y, m),
              firstDate: row.created_at,
              lastDate: row.created_at,
              count: 1,
            });
          } else {
            existing.lastDate = row.created_at;
            existing.count += 1;
          }
        }

        // Sort newest month first
        const arr = Array.from(map.values()).sort((a, b) => {
          const aDate = new Date(a.firstDate).getTime();
          const bDate = new Date(b.firstDate).getTime();
          return bDate - aDate;
        });

        setMonths(arr);
      } catch (e: any) {
        console.log("ReportsIndex unexpected error:", e);
        setError("Failed to load reports.");
        setMonths([]);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [userId, hasHydratedAuth]);

  const header = (
    <Stack.Screen
      options={{
        headerShown: true,
        headerTransparent: true,
        headerTitle: "",
        gestureEnabled: true,
        headerLeft: () => (
          <TouchableOpacity
            onPress={() => router.back()}
            style={{ paddingLeft: 10, paddingVertical: 10 }}
          >
            <Ionicons name="chevron-back" size={30} color="white" />
          </TouchableOpacity>
        ),
      }}
    />
  );

  if (!hasHydratedAuth || loading) {
    return (
      <>
        {header}
        <SafeAreaView style={styles.safe}>
          <View
            style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
          >
            <ActivityIndicator size="large" color={colors.accent} />
            <Text style={{ color: colors.dim, marginTop: 8 }}>
              Loading your reports…
            </Text>
          </View>
        </SafeAreaView>
      </>
    );
  }

  if (error === "Login required" || !userId) {
    return (
      <>
        {header}
        <SafeAreaView style={styles.safe}>
          <View
            style={{
              flex: 1,
              justifyContent: "center",
              alignItems: "center",
              padding: 24,
            }}
          >
            <Text
              style={{
                color: colors.text,
                fontSize: 18,
                fontWeight: "700",
                marginBottom: 6,
              }}
            >
              Sign in to view reports
            </Text>
            <Text style={{ color: colors.dim, textAlign: "center" }}>
              Your monthly reports are tied to your account so we can track
              changes month-to-month.
            </Text>
          </View>
        </SafeAreaView>
      </>
    );
  }

  return (
    <>
      {header}
      <SafeAreaView style={styles.safe}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={{ paddingBottom: 32 }}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <Text style={styles.title}>Monthly Reports</Text>
            <Text style={styles.sub}>
              Tap any month to open its full before/after breakdown.
            </Text>
          </View>

          {months.length === 0 && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>No reports yet</Text>
              <Text style={styles.dim}>
                Save at least one physique analysis to start generating monthly
                reports.
              </Text>
            </View>
          )}

          {months.map((m) => (
            <TouchableOpacity
              key={m.key}
              style={styles.row}
              activeOpacity={0.7}
              onPress={() =>
                router.push({
                  pathname: "/monthly-report",
                  params: {
                    year: String(m.year),
                    month: String(m.monthIndex),
                  },
                })
              }
            >
              <View style={styles.rowLeft}>
                <View style={styles.badge}>
                  <Ionicons
                    name="calendar-outline"
                    size={16}
                    color={colors.accent}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowTitle}>{m.label}</Text>
                  <Text style={styles.dim}>
                    {m.count} scan{m.count === 1 ? "" : "s"} ·{" "}
                    {formatShortDate(m.firstDate)} –{" "}
                    {formatShortDate(m.lastDate)}
                  </Text>
                </View>
              </View>

              <View style={styles.chev} />
            </TouchableOpacity>
          ))}
        </ScrollView>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  scroll: {
    flex: 1,
    paddingHorizontal: 16,
  },
  header: {
    paddingTop: 36,
    paddingBottom: 16,
  },
  title: {
    color: colors.text,
    fontSize: 22,
    fontWeight: "800",
    marginBottom: 4,
  },
  sub: {
    color: colors.dim,
    fontSize: 12,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: 12,
  },
  cardTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 6,
  },
  dim: {
    color: colors.dim,
    fontSize: 12,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  rowLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: 10,
  },
  badge: {
    width: 30,
    height: 30,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.accent,
    backgroundColor: "#0E1714",
    alignItems: "center",
    justifyContent: "center",
  },
  rowTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "700",
  },
  chev: {
    width: 8,
    height: 8,
    borderRightWidth: 2,
    borderTopWidth: 2,
    borderColor: colors.dim,
    transform: [{ rotate: "45deg" }],
  },
});
