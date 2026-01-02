// app/workout-complete/[sessionId].tsx
// ----------------------------------------------------
// WORKOUT COMPLETED SUMMARY
// - Displays workout stats after finishing a session
// - Integrates with useWorkoutHistoryStore
// - Shows volume, muscles hit, sets, duration
// ----------------------------------------------------

import React, { useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

import { useWorkoutHistoryStore } from "../../store/useWorkoutHistoryStore";

export default function WorkoutCompleteScreen() {
  const router = useRouter();
  const { sessionId } = useLocalSearchParams<{ sessionId: string }>();

  const session = useWorkoutHistoryStore((state) =>
    state.history.find((s) => s.id === sessionId)
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

  // -----------------------------------------------------
  // DERIVED METRICS
  // -----------------------------------------------------

  const totalExercises = session.exercises.length;

  const totalSets = session.exercises.reduce(
    (sum, ex) => sum + ex.sets.length,
    0
  );

  const completedSets = session.exercises.reduce(
    (sum, ex) =>
      sum +
      ex.sets.filter((s) => s.actual !== null && s.actual >= 1).length,
    0
  );

  // Volume: sets per muscle
  const muscleVolume = useMemo(() => {
    const volume: Record<string, number> = {};
    session.exercises.forEach((ex) => {
      const muscle = ex.muscle || "Other";
      const setsCompleted = ex.sets.filter((s) => s.actual !== null).length;
      volume[muscle] = (volume[muscle] || 0) + setsCompleted;
    });
    return volume;
  }, [session]);

  const musclesHit = Object.keys(muscleVolume);

  // Duration calculation
  const start = new Date(session.startedAt);
  const end = new Date(session.finishedAt);
  const minutes = Math.round((end.getTime() - start.getTime()) / 60000);

  // -----------------------------------------------------

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 140 }}>
        {/* HEADER */}
        <Text style={styles.title}>Workout Completed</Text>
        <Text style={styles.subtitle}>{session.workoutName}</Text>

        {/* STATS CARD */}
        <LinearGradient
          colors={["#10151B", "#0B1115"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.card}
        >
          <View style={styles.statRow}>
            <Ionicons name="time-outline" size={20} color="#CFFFA6" />
            <Text style={styles.statLabel}>Duration</Text>
            <Text style={styles.statValue}>{minutes} min</Text>
          </View>

          <View style={styles.statRow}>
            <Ionicons name="barbell-outline" size={20} color="#7CF9FF" />
            <Text style={styles.statLabel}>Total Sets</Text>
            <Text style={styles.statValue}>{completedSets} / {totalSets}</Text>
          </View>

          <View style={styles.statRow}>
            <Ionicons name="list-outline" size={20} color="#B9FF39" />
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

        {musclesHit.map((muscle) => (
          <View key={muscle} style={styles.volumeRow}>
            <Text style={styles.volumeLabel}>{muscle}</Text>
            <Text style={styles.volumeValue}>{muscleVolume[muscle]} sets</Text>
          </View>
        ))}

        {/* EXERCISE SUMMARY */}
        <Text style={styles.sectionTitle}>Exercise Summary</Text>

        {session.exercises.map((ex) => (
          <View key={ex.id} style={styles.exerciseBox}>
            <Text style={styles.exerciseName}>{ex.name}</Text>
            <Text style={styles.exerciseMeta}>
              {ex.sets.filter((s) => s.actual !== null).length} /{" "}
              {ex.sets.length} sets completed
            </Text>
          </View>
        ))}
      </ScrollView>

      {/* BOTTOM CTA */}
      <View style={styles.bottomBar}>
        <Pressable
          onPress={() => router.replace("/(tabs)/progress")}
          style={({ pressed }) => [
            styles.primaryButtonWrap,
            pressed && { opacity: 0.9 },
          ]}
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
