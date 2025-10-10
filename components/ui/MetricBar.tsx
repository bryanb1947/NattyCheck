import React from "react";
import { View, Text, StyleSheet } from "react-native";

export default function MetricBar({
  title,
  sub,
  percent,
  color = "#B8FF47",
  tag,
}: {
  title: string;
  sub?: string;
  percent: number; // 0..100
  color?: string;
  tag?: { label: string; bg?: string };
}) {
  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <View style={{ flex: 1, paddingRight: 12 }}>
          <Text style={styles.title}>{title}</Text>
          {!!sub && <Text style={styles.sub}>{sub}</Text>}
        </View>
        {tag?.label ? (
          <View style={[styles.pill, { backgroundColor: tag.bg ?? "rgba(0,255,224,0.18)" }]}>
            <Text style={styles.pillText}>{tag.label}</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.track}>
        <View style={[styles.fill, { width: `${Math.max(0, Math.min(100, percent))}%`, backgroundColor: color }]} />
      </View>

      <Text style={styles.percent}>{percent}%</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#151515",
    borderColor: "#2A2A2A",
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOpacity: 0.35,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  title: { color: "#FFFFFF", fontSize: 16, fontWeight: "600" },
  sub: { color: "#B3B3B3", fontSize: 12, marginTop: 4 },
  track: {
    height: 8,
    backgroundColor: "#1A1A1A",
    borderRadius: 999,
    overflow: "hidden",
    marginTop: 12,
  },
  fill: { height: 8, borderRadius: 999 },
  percent: { color: "#B3B3B3", fontSize: 12, marginTop: 8 },
  pill: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 },
  pillText: { color: "#FFFFFF", fontSize: 12, fontWeight: "600" },
});
