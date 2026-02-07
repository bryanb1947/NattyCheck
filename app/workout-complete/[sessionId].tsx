// app/workout-complete/[sessionId].tsx
// ----------------------------------------------------
// WORKOUT COMPLETED SUMMARY (NO DURATION)
// - Displays workout stats after finishing a session
// - Integrates with useWorkoutHistoryStore
// - Shows volume, muscles hit, sets, completed reps
// ----------------------------------------------------

import React, { useMemo } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

import { useWorkoutHistoryStore } from "../../store/useWorkoutHistoryStore";

type LoggedSet = {
  target: number | string;
  actual?: number | null;
};

type LoggedExercise = {
  id?: string;
  name: string;
  muscle: string;
  sets: LoggedSet[];
};

function safeNum(v: any): number | null {
  if (v === undefined || v === null) return null;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

function getExercisesFromSession(session: any): LoggedExercise[] {
  const exs =
    (Array.isArray(session?.exercises) && session.exercises) ||
    (Array.isArray(session?.entries) && session.entries) ||
    [];
  return exs.filter(Boolean);
}

export default function WorkoutCompleteScreen() {
  const router = useRouter();
  const { sessionId } = useLocalSearchParams<{ sessionId: string }>();

  const session = useWorkoutHistoryStore((state) =>
    state.sessions.find((s: any) => String(s?.id) === String(sessionId))
  );

  if (!session) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <Text style={{ color: "#FFF", textAlign: "center", marginTop: 40 }}>
          Workout not found.
        </Text>
      </SafeAreaView>
    );
  }

  const exercises = getExercisesFromSession(session);

  // -----------------------------------------------------
  // DERIVED METRICS (NO DURATION)
  // -----------------------------------------------------

  const totalExercises = exercises.length;

  const totalSets = exercises.reduce((sum, ex) => sum + (ex.sets?.length || 0), 0);

  const completedSets = exercises.reduce(
    (sum, ex) =>
      sum + (ex.sets || []).filter((s) => safeNum((s as any).actual) != null).length,
    0
  );

  const completedReps = exercises.reduce((sum, ex) => {
    return (
      sum +
      (ex.sets || []).reduce((acc, s) => {
        const a = safeNum((s as any).actual);
        return acc + (a != null ? a : 0);
      }, 0)
    );
  }, 0);

  // Volume: completed sets per muscle
  const muscleVolume = useMemo(() => {
    const volume: Record<string, number> = {};
    exercises.forEach((ex) => {
      const muscle = (ex.muscle || "Other").trim() || "Other";
      const setsCompleted = (ex.sets || []).filter((s) => safeNum((s as any).actual) != null).length;
      volume[muscle] = (volume[muscle] || 0) + setsCompleted;
    });
    return volume;
  }, [exercises]);

  const musclesHit = useMemo(() => {
    return Object.entries(muscleVolume)
      .filter(([, v]) => v > 0)
      .sort((a, b) => b[1] - a[1])
      .map(([k]) => k);
  }, [muscleVolume]);

  const workoutName = (session as any).workoutName ?? (session as any).workout_name ?? "Workout";

  // -----------------------------------------------------

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 140 }}>
        {/* HEADER */}
        <Text style={styles.title}>Workout Completed</Text>
        <Text style={styles.subtitle}>{workoutName}</Text>

        {/* STATS CARD */}
        <LinearGradient
          colors={["#10151B", "#0B1115"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.card}
        >
          <View style={styles.statRow}>
            <Ionicons name="barbell-outline" size={20} color="#7CF9FF" />
            <Text style={styles.statLabel}>Sets</Text>
            <Text style={styles.statValue}>
              {completedSets} / {totalSets}
            </Text>
          </View>

          <View style={styles.statRow}>
            <Ionicons name="repeat-outline" size={20} color="#B9FF39" />
            <Text style={styles.statLabel}>Completed Reps</Text>
            <Text style={styles.statValue}>{completedReps}</Text>
          </View>

          <View style={styles.statRow}>
            <Ionicons name="list-outline" size={20} color="#CFFFA6" />
            <Text style={styles.statLabel}>Exercises</Text>
            <Text style={styles.statValue}>{totalExercises}</Text>
          </View>

          <View style={styles.statRow}>
            <Ionicons name="body-outline" size={20} color="#F6F6A6" />
            <Text style={styles.statLabel}>Muscles Hit</Text>
            <Text style={styles.statValue}>{musclesHit.length}</Text>
          </View>
        </LinearGradient>

        {/* MUSCLE VOLUME SECTION */}
        <Text style={styles.sectionTitle}>Volume Breakdown</Text>

        {musclesHit.length === 0 ? (
          <Text style={{ color: "#7C9AA4", fontSize: 12, marginBottom: 10 }}>
            No completed sets logged yet. Tap + during your session to log actual reps.
          </Text>
        ) : (
          musclesHit.map((muscle) => (
            <View key={muscle} style={styles.volumeRow}>
              <Text style={styles.volumeLabel}>{muscle}</Text>
              <Text style={styles.volumeValue}>
                {muscleVolume[muscle]} set{muscleVolume[muscle] === 1 ? "" : "s"}
              </Text>
            </View>
          ))
        )}

        {/* EXERCISE SUMMARY */}
        <Text style={styles.sectionTitle}>Exercise Summary</Text>

        {exercises.map((ex, idx) => {
          const sets = ex.sets || [];
          const done = sets.filter((s) => safeNum((s as any).actual) != null).length;

          return (
            <View key={String(ex.id ?? `${ex.name}-${idx}`)} style={styles.exerciseBox}>
              <Text style={styles.exerciseName}>{ex.name}</Text>
              <Text style={styles.exerciseMeta}>
                {done} / {sets.length} sets completed
              </Text>
            </View>
          );
        })}
      </ScrollView>

      {/* BOTTOM CTA */}
      <View style={styles.bottomBar}>
        <Pressable
          onPress={() => router.replace("/(tabs)/progress")}
          style={({ pressed }) => [styles.primaryButtonWrap, pressed && { opacity: 0.9 }]}
        >
          <LinearGradient
            colors={["#2AF5FF", "#B9FF39"]}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={styles.primaryButton}
          >
            <Ionicons name="bar-chart-outline" size={18} color="#052e1f" />
            <Text style={styles.primaryButtonText}>View Progress</Text>
          </LinearGradient>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

// -----------------------------------------------------
// STYLES
// -----------------------------------------------------

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#05080C" },

  title: {
    color: "#E8FDF2",
    fontSize: 26,
    fontWeight: "800",
    textAlign: "center",
    marginTop: 10,
  },
  subtitle: {
    color: "#8FA0A8",
    fontSize: 15,
    textAlign: "center",
    marginTop: 4,
    marginBottom: 20,
  },

  card: {
    borderRadius: 16,
    padding: 18,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: "rgba(185,255,57,0.15)",
  },

  statRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
    gap: 10,
  },
  statLabel: {
    color: "#D7FBE8",
    fontSize: 14,
    flex: 1,
  },
  statValue: {
    color: "#CFFFA6",
    fontSize: 14,
    fontWeight: "700",
  },

  sectionTitle: {
    color: "#D7FBE8",
    fontSize: 17,
    fontWeight: "700",
    marginBottom: 10,
    marginTop: 10,
  },

  volumeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  volumeLabel: { color: "#9EE7CF", fontSize: 14 },
  volumeValue: { color: "white", fontSize: 14, fontWeight: "700" },

  exerciseBox: {
    backgroundColor: "#0A0F14",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
  },
  exerciseName: { color: "white", fontSize: 15, fontWeight: "600" },
  exerciseMeta: { color: "#7C9AA4", fontSize: 12, marginTop: 2 },

  bottomBar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.08)",
    backgroundColor: "rgba(5,8,12,0.97)",
  },

  primaryButtonWrap: { flex: 1 },
  primaryButton: {
    height: 48,
    borderRadius: 999,
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryButtonText: {
    color: "#052e1f",
    fontSize: 15,
    fontWeight: "800",
  },
});
