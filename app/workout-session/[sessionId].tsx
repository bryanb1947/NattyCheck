// app/workout-session/[sessionId].tsx
// -------------------------------------------------------
// LIVE WORKOUT SESSION (APPLE FITNESS STYLE, HOOK-SAFE)
// - Uses real workout data (AI or Custom)
// - Tracks actual completed sets
// - Saves session locally + uploads to Supabase
// -------------------------------------------------------

import React, { useState, useEffect, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";

import { supabase } from "../../lib/supabase"; // << ADDED
import { useCustomWorkoutsStore } from "../../store/useCustomWorkoutsStore";
import { useWorkoutHistoryStore } from "../../store/useWorkoutHistoryStore";

type SetEntry = {
  target: number;
  actual: number | null;
};

export default function WorkoutSessionScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    workoutId?: string;
    sessionId?: string;
  }>();

  const workoutId = (params.workoutId as string) || "";
  const sessionId = (params.sessionId as string) || "";

  // -----------------------------
  // LOAD WORKOUT
  // -----------------------------
  const workouts = useCustomWorkoutsStore((s) => s.workouts);
  const workout = workouts.find((w) => w.id === workoutId) || null;

  const logSessionLocal = useWorkoutHistoryStore((s) => s.logSession);

  // -----------------------------
  // PREP EXERCISES
  // -----------------------------
  const exercises = useMemo(
    () =>
      workout
        ? workout.days.flatMap((day) =>
            day.exercises.map((ex) => ({
              ...ex,
              dayName: day.name,
              dayId: day.id,
            }))
          )
        : [],
    [workout]
  );

  const hasWorkout = !!workout;
  const hasExercises = exercises.length > 0;
  const valid = hasWorkout && hasExercises;

  // -----------------------------
  // STATE
  // -----------------------------
  const [i, setI] = useState(0);
  const current = valid ? exercises[i] : null;

  const [setEntries, setSetEntries] = useState<SetEntry[]>(() => {
    if (!valid || !current) return [];
    const repsNum = Number(current.reps) || 0;
    return Array.from({ length: current.sets }).map(() => ({
      target: repsNum,
      actual: null,
    }));
  });

  // reset reps when exercise changes
  useEffect(() => {
    if (!valid || !current) return;
    const repsNum = Number(current.reps) || 0;
    setSetEntries(
      Array.from({ length: current.sets }).map(() => ({
        target: repsNum,
        actual: null,
      }))
    );
  }, [i, valid, current]);

  // -----------------------------
  // UPDATE SET VALUE
  // -----------------------------
  const setReps = (idx: number, val: number) => {
    const safe = Math.max(1, Math.min(50, val)); // clamp 1–50
    setSetEntries((prev) =>
      prev.map((s, j) => (j === idx ? { ...s, actual: safe } : s))
    );
  };

  // -----------------------------
  // FINISH WORKOUT (LOCAL + SUPABASE)
  // -----------------------------
  const finishWorkout = async () => {
    if (!valid || !workout) return;

    // build final session object
    const finalSession = {
      sessionId,
      workoutId: workout.id,
      workoutName: workout.name,
      timestamp: Date.now(),
      entries: exercises.map((ex, index) => ({
        ...ex,
        sets:
          index === i
            ? setEntries
            : Array.from({ length: ex.sets }).map(() => ({
                target: Number(ex.reps) || 0,
                actual: null,
              })),
      })),
    };

    // -----------------------------------
    // 1) SAVE LOCALLY (ALREADY WORKING)
    // -----------------------------------
    logSessionLocal(finalSession);

    // -----------------------------------
    // 2) SAVE TO SUPABASE
    // -----------------------------------
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        console.warn("⚠️ No logged-in user → cannot sync to Supabase.");
      } else {
        const { error } = await supabase.from("workout_sessions").insert({
          user_id: user.id,
          workout_id: workout.id,
          workout_name: workout.name,
          session_id: sessionId,
          timestamp: new Date(finalSession.timestamp).toISOString(),
          entries: finalSession.entries, // full detailed sets
          total_sets: finalSession.entries.reduce(
            (sum, ex) => sum + ex.sets.length,
            0
          ),
        });

        if (error) {
          console.error("❌ Supabase workout insert failed:", error);
        } else {
          console.log("✅ Workout synced to Supabase!");
        }
      }
    } catch (e) {
      console.error("❌ Unexpected Supabase sync error:", e);
    }

    // -----------------------------------
    // 3) NAVIGATE OUT
    // -----------------------------------
    router.replace("/(tabs)/progress");
  };

  // -----------------------------
  // NAVIGATION
  // -----------------------------
  const goNext = () => {
    if (!valid) return;

    if (i >= exercises.length - 1) {
      finishWorkout();
    } else {
      setI((n) => n + 1);
    }
  };

  const goBack = () => {
    if (i > 0) setI((n) => n - 1);
  };

  // -------------------------------------------------------
  // JSX
  // -------------------------------------------------------
  return (
    <SafeAreaView style={styles.safeArea}>
      {/* HEADER */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color="#D7FBE8" />
        </Pressable>

        <Text style={styles.headerTitle}>
          {workout ? workout.name : "Workout"}
        </Text>

        <View style={{ width: 36 }} />
      </View>

      {/* INVALID */}
      {!valid && (
        <View style={styles.centerBox}>
          <Text style={styles.errorText}>
            {!hasWorkout ? "Workout not found." : "No exercises in this workout."}
          </Text>
        </View>
      )}

      {/* VALID */}
      {valid && current && (
        <>
          <View style={styles.progressRow}>
            <Text style={styles.progressText}>
              {i + 1} / {exercises.length}
            </Text>
          </View>

          <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === "ios" ? "padding" : undefined}
          >
            <ScrollView
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ padding: 20, paddingBottom: 140 }}
            >
              {/* IMAGE PLACEHOLDER */}
              <LinearGradient
                colors={["#0b1014", "#111a20"]}
                style={styles.imageBox}
              >
                <Ionicons name="image-outline" size={60} color="#1C2A30" />
                <Text style={styles.placeholderText}>
                  Exercise photo coming soon
                </Text>
              </LinearGradient>

              <Text style={styles.exerciseName}>{current.name}</Text>
              <Text style={styles.exerciseMuscle}>{current.muscle}</Text>

              <Text style={styles.setHeader}>Sets</Text>

              <View style={styles.setList}>
                {setEntries.map((set, idx) => {
                  const done = set.actual !== null;
                  const display = done ? set.actual : set.target;

                  return (
                    <View
                      key={idx}
                      style={[
                        styles.setCard,
                        done && {
                          borderColor: "#B9FF39",
                          backgroundColor: "#0f1a11",
                        },
                      ]}
                    >
                      <Text style={styles.setLabel}>Set {idx + 1}</Text>

                      <View style={styles.repRow}>
                        <Text style={styles.repText}>
                          {display} {done ? "reps" : "target"}
                        </Text>

                        <Pressable
                          style={styles.repAddBtn}
                          onPress={() => {
                            const base = Number(set.actual ?? set.target);
                            setReps(idx, base + 1);
                          }}
                        >
                          <Ionicons name="add" size={16} color="#B9FF39" />
                        </Pressable>

                        <Pressable
                          style={styles.repSubBtn}
                          onPress={() => {
                            const base = Number(set.actual ?? set.target);
                            setReps(idx, base - 1);
                          }}
                        >
                          <Ionicons name="remove" size={16} color="#FF6E6E" />
                        </Pressable>
                      </View>
                    </View>
                  );
                })}
              </View>
            </ScrollView>
          </KeyboardAvoidingView>

          {/* NAV BAR */}
          <View style={styles.bottomBar}>
            <Pressable
              style={[styles.navBtn, i === 0 && { opacity: 0.3 }]}
              disabled={i === 0}
              onPress={goBack}
            >
              <Ionicons name="arrow-back" size={20} color="#9EE7CF" />
            </Pressable>

            <Pressable style={{ flex: 1 }} onPress={goNext}>
              <LinearGradient
                colors={["#2AF5FF", "#B9FF39"]}
                start={{ x: 0, y: 0.5 }}
                end={{ x: 1, y: 0.5 }}
                style={styles.primaryBtn}
              >
                <Ionicons
                  name={
                    i === exercises.length - 1 ? "checkmark" : "arrow-forward"
                  }
                  size={18}
                  color="#052e1f"
                />
                <Text style={styles.primaryText}>
                  {i === exercises.length - 1 ? "Finish" : "Next"}
                </Text>
              </LinearGradient>
            </Pressable>
          </View>
        </>
      )}
    </SafeAreaView>
  );
}

// -------------------------------------------------------
// STYLES
// -------------------------------------------------------
const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#05080C" },

  centerBox: { marginTop: 120, alignItems: "center" },

  errorText: {
    color: "#fff",
    fontSize: 16,
    textAlign: "center",
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 99,
    backgroundColor: "#0E141A",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    flex: 1,
    textAlign: "center",
    color: "#E8FDF2",
    fontSize: 18,
    fontWeight: "700",
    marginRight: 36,
  },

  progressRow: { alignItems: "center", marginBottom: 6 },
  progressText: { color: "#8FA0A8", fontSize: 12 },

  imageBox: {
    height: 200,
    borderRadius: 16,
    marginBottom: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  placeholderText: { color: "#1C2A30", marginTop: 6 },

  exerciseName: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "800",
    textAlign: "center",
    marginTop: 4,
  },
  exerciseMuscle: {
    color: "#9AA9B2",
    fontSize: 14,
    textAlign: "center",
    marginBottom: 20,
  },

  setHeader: {
    color: "#D7FBE8",
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 10,
  },

  setList: { gap: 14 },

  setCard: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    backgroundColor: "#0A1014",
  },
  setLabel: { color: "#9EE7CF", fontSize: 12 },

  repRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
    justifyContent: "space-between",
  },
  repText: { color: "#fff", fontSize: 18, fontWeight: "700" },

  repAddBtn: {
    padding: 8,
    borderRadius: 10,
    backgroundColor: "rgba(185,255,57,0.15)",
  },
  repSubBtn: {
    padding: 8,
    borderRadius: 10,
    backgroundColor: "rgba(255,110,110,0.15)",
  },

  bottomBar: {
    flexDirection: "row",
    gap: 12,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.06)",
    backgroundColor: "rgba(5,8,12,0.95)",
  },

  navBtn: {
    width: 46,
    height: 46,
    borderRadius: 99,
    borderWidth: 1,
    borderColor: "#9EE7CF",
    backgroundColor: "#081118",
    alignItems: "center",
    justifyContent: "center",
  },

  primaryBtn: {
    height: 46,
    borderRadius: 99,
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    justifyContent: "center",
  },

  primaryText: {
    color: "#052e1f",
    fontWeight: "800",
    fontSize: 16,
  },
});
