// app/custom-workout/[id].tsx
// FIXED KEYBOARD VERSION — STARTS BLANK (NO DEFAULT EXERCISES)

import React, { useState, useEffect, useMemo } from "react";
import {
  Alert,
  LayoutAnimation,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  UIManager,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";

import {
  useCustomWorkoutsStore,
  CustomWorkout,
  CustomExercise,
  CustomWorkoutDay,
} from "../../store/useCustomWorkoutsStore";

// Enable layout animation for Android
if (
  Platform.OS === "android" &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

function generateId(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2)}_${Date.now()}`;
}

export default function CustomWorkoutEditor() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string }>();
  const workoutId = params.id as string;

  const workouts = useCustomWorkoutsStore((s) => s.workouts);
  const updateWorkout = useCustomWorkoutsStore((s) => s.updateWorkout);
  const deleteWorkout = useCustomWorkoutsStore((s) => s.deleteWorkout);

  const workout = workouts.find((w) => w.id === workoutId);

  // Hydration tracker (hook-safe)
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);

  const workoutMissing = hydrated && !workout;

  // ----------------------------------------------------
  // LOCAL STATE
  // ----------------------------------------------------
  const [title, setTitle] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [exercises, setExercises] = useState<
    { id: string; name: string; muscle: string; sets: number; reps: number }[]
  >([]);

  // Initialize from store after hydration
  useEffect(() => {
    if (!hydrated || !workout) return;

    setTitle(workout.name || "Custom Workout");

    const day = workout.days[0];

    if (day?.exercises?.length) {
      // Existing workout with saved exercises
      setExercises(
        day.exercises.map((ex) => ({
          id: ex.id,
          name: ex.name,
          muscle: ex.muscle,
          sets: ex.sets,
          reps: Number(ex.reps),
        }))
      );
    } else {
      // NEW / EMPTY WORKOUT → start completely blank
      setExercises([]);
    }
  }, [hydrated, workout]);

  const totalSets = useMemo(
    () => exercises.reduce((acc, e) => acc + e.sets, 0),
    [exercises]
  );

  // ----------------------------------------------------
  // HELPERS
  // ----------------------------------------------------
  function toggleExpanded(id: string) {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedId((prev) => (prev === id ? null : id));
  }

  function updateExerciseLocal(
    id: string,
    patch: Partial<{ name: string; muscle: string; sets: number; reps: number }>
  ) {
    setExercises((prev) =>
      prev.map((ex) => (ex.id === id ? { ...ex, ...patch } : ex))
    );
  }

  function adjustNumeric(
    id: string,
    key: "sets" | "reps",
    delta: number,
    min: number,
    max: number
  ) {
    setExercises((prev) =>
      prev.map((ex) => {
        if (ex.id !== id) return ex;
        const next = Math.min(max, Math.max(min, ex[key] + delta));
        return { ...ex, [key]: next };
      })
    );
  }

  function addExercise() {
    const id = generateId("ex");
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);

    setExercises((prev) => [
      ...prev,
      { id, name: "New Exercise", muscle: "Custom", sets: 3, reps: 10 },
    ]);

    setExpandedId(id);
  }

  function removeExercise(id: string) {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExercises((prev) => prev.filter((e) => e.id !== id));
    if (expandedId === id) setExpandedId(null);
  }

  // ----------------------------------------------------
  // SAVE TO STORE
  // ----------------------------------------------------
  function persistWorkout() {
    if (!workout) return;

    const dayId = workout.days[0]?.id ?? generateId("day");

    const mapped: CustomExercise[] = exercises.map((ex) => ({
      id: ex.id,
      name: ex.name,
      muscle: ex.muscle,
      sets: ex.sets,
      reps: String(ex.reps),
      equipment: undefined,
      notes: undefined,
      videoUrl: undefined,
    }));

    const newDay: CustomWorkoutDay = {
      id: dayId,
      name: workout.days[0]?.name || "Day 1",
      exercises: mapped,
    };

    updateWorkout(workoutId, {
      name: title.trim(),
      days: [newDay],
      updatedAt: new Date().toISOString(),
    });
  }

  function handleSave() {
    if (workoutMissing) return;
    persistWorkout();
    Alert.alert("Saved", "Your custom workout has been updated.");
  }

  function handleStart() {
    if (workoutMissing) return;
    if (!exercises.length) {
      Alert.alert("Add exercises", "Your workout is empty.");
      return;
    }

    persistWorkout();

    router.push({
      pathname: "/workout-session/[sessionId]",
      params: {
        sessionId: String(Date.now()),
        workoutId,
        type: "custom",
      },
    });
  }

  function handleDelete() {
    if (workoutMissing) {
      router.back();
      return;
    }

    Alert.alert("Delete workout?", `Delete "${title || "Custom Workout"}"?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          deleteWorkout(workoutId);
          router.back();
        },
      },
    ]);
  }

  // ----------------------------------------------------
  // RENDER
  // ----------------------------------------------------
  return (
    <SafeAreaView style={styles.safeArea}>
      {/* HEADER */}
      <View style={styles.headerRow}>
        <Pressable onPress={() => router.back()} style={styles.headerIcon}>
          <Ionicons name="chevron-back" size={22} color="#D9E7F0" />
        </Pressable>

        <TextInput
          value={title}
          onChangeText={setTitle}
          placeholder="Workout name"
          placeholderTextColor="#6A7A86"
          style={styles.headerInput}
        />

        <Pressable onPress={handleDelete} style={styles.headerIcon}>
          <Ionicons name="trash-outline" size={20} color="#FF9CA3" />
        </Pressable>
      </View>

      {/* BODY WITH KEYBOARD HANDLING */}
      <KeyboardAwareScrollView
        showsVerticalScrollIndicator={false}
        enableOnAndroid={true}
        keyboardShouldPersistTaps="handled"
        extraScrollHeight={90}
        contentContainerStyle={{ paddingBottom: 160 }}
      >
        {/* SUMMARY CARD */}
        <LinearGradient
          colors={["#10151B", "#0B1115"]}
          style={styles.summaryCard}
        >
          <Text style={styles.summaryTitle}>Custom Workout</Text>
          <Text style={styles.summarySubtitle}>
            Tap an exercise to edit sets & reps.
          </Text>

          <View style={styles.summaryMeta}>
            <View style={styles.summaryPill}>
              <Ionicons name="barbell-outline" size={14} color="#CFFFA6" />
              <Text style={styles.summaryPillText}>
                {exercises.length} exercises
              </Text>
            </View>

            <View style={styles.summaryPill}>
              <Ionicons name="layers-outline" size={14} color="#7CF9FF" />
              <Text style={styles.summaryPillText}>{totalSets} total sets</Text>
            </View>
          </View>
        </LinearGradient>

        {/* EXERCISES HEADER */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Exercises</Text>
          <Pressable onPress={addExercise} style={styles.addButton}>
            <Ionicons name="add" size={18} color="#CFFFA6" />
            <Text style={styles.addButtonText}>Add</Text>
          </Pressable>
        </View>

        {/* EXERCISE LIST */}
        {exercises.map((ex, index) => {
          const expanded = expandedId === ex.id;

          return (
            <View key={ex.id} style={styles.exerciseCard}>
              {/* HEADER */}
              <Pressable
                onPress={() => toggleExpanded(ex.id)}
                style={styles.exerciseHeader}
              >
                <View style={styles.exerciseHeaderLeft}>
                  <View style={styles.exerciseIndexDot}>
                    <Text style={styles.exerciseIndexText}>{index + 1}</Text>
                  </View>

                  <View style={{ flex: 1 }}>
                    <Text style={styles.exerciseNameText}>{ex.name}</Text>
                    <Text style={styles.exerciseMuscleText}>{ex.muscle}</Text>
                  </View>
                </View>

                <View style={styles.exerciseHeaderRight}>
                  <Text style={styles.exerciseSetRepText}>
                    {ex.sets} × {ex.reps}
                  </Text>
                  <Ionicons
                    name={expanded ? "chevron-up" : "chevron-down"}
                    size={18}
                    color="#9EE7CF"
                  />
                </View>
              </Pressable>

              {/* BODY */}
              {expanded && (
                <View style={styles.exerciseBody}>
                  {/* NAME & MUSCLE */}
                  <View style={styles.inputRow}>
                    <View style={{ flex: 1, marginRight: 8 }}>
                      <Text style={styles.inputLabel}>Exercise name</Text>
                      <TextInput
                        value={ex.name}
                        onChangeText={(t) =>
                          updateExerciseLocal(ex.id, { name: t })
                        }
                        placeholder="Incline Dumbbell"
                        placeholderTextColor="#6A7A86"
                        style={styles.input}
                      />
                    </View>

                    <View style={{ width: 120 }}>
                      <Text style={styles.inputLabel}>Muscle</Text>
                      <TextInput
                        value={ex.muscle}
                        onChangeText={(t) =>
                          updateExerciseLocal(ex.id, { muscle: t })
                        }
                        placeholder="Chest"
                        placeholderTextColor="#6A7A86"
                        style={styles.input}
                      />
                    </View>
                  </View>

                  {/* SETS + REPS */}
                  <View style={styles.adjustRow}>
                    {/* SETS */}
                    <View style={styles.adjustBlock}>
                      <Text style={styles.inputLabel}>Sets</Text>
                      <View style={styles.stepperRow}>
                        <Pressable
                          onPress={() =>
                            adjustNumeric(ex.id, "sets", -1, 1, 8)
                          }
                          style={styles.stepperButton}
                        >
                          <Ionicons name="remove" size={16} color="#CFFFA6" />
                        </Pressable>

                        <Text style={styles.stepperValue}>{ex.sets}</Text>

                        <Pressable
                          onPress={() =>
                            adjustNumeric(ex.id, "sets", +1, 1, 8)
                          }
                          style={styles.stepperButton}
                        >
                          <Ionicons name="add" size={16} color="#CFFFA6" />
                        </Pressable>
                      </View>
                    </View>

                    {/* REPS */}
                    <View style={styles.adjustBlock}>
                      <Text style={styles.inputLabel}>Reps</Text>
                      <View style={styles.stepperRow}>
                        <Pressable
                          onPress={() =>
                            adjustNumeric(ex.id, "reps", -1, 3, 30)
                          }
                          style={styles.stepperButton}
                        >
                          <Ionicons name="remove" size={16} color="#7CF9FF" />
                        </Pressable>

                        <Text style={styles.stepperValue}>{ex.reps}</Text>

                        <Pressable
                          onPress={() =>
                            adjustNumeric(ex.id, "reps", +1, 3, 30)
                          }
                          style={styles.stepperButton}
                        >
                          <Ionicons name="add" size={16} color="#7CF9FF" />
                        </Pressable>
                      </View>

                      {/* QUICK REP BUTTONS */}
                      <View style={styles.repPresetRow}>
                        {["5", "8", "10", "12", "15"].map((v) => {
                          const val = Number(v);
                          const active = ex.reps === val;
                          return (
                            <Pressable
                              key={v}
                              onPress={() =>
                                updateExerciseLocal(ex.id, { reps: val })
                              }
                              style={[
                                styles.repPresetChip,
                                active && {
                                  backgroundColor: "rgba(124,249,255,0.2)",
                                  borderColor: "#7CF9FF",
                                },
                              ]}
                            >
                              <Text style={styles.repPresetText}>{v}</Text>
                            </Pressable>
                          );
                        })}
                      </View>
                    </View>
                  </View>

                  {/* DELETE EXERCISE */}
                  <Pressable
                    onPress={() =>
                      Alert.alert(
                        "Remove exercise?",
                        `Remove "${ex.name}"?`,
                        [
                          { text: "Cancel", style: "cancel" },
                          {
                            text: "Remove",
                            style: "destructive",
                            onPress: () => removeExercise(ex.id),
                          },
                        ]
                      )
                    }
                    style={styles.deleteButton}
                  >
                    <Ionicons name="trash-outline" size={16} color="#FF9CA3" />
                    <Text style={styles.deleteButtonText}>Remove exercise</Text>
                  </Pressable>
                </View>
              )}
            </View>
          );
        })}

        {/* EMPTY STATE */}
        {exercises.length === 0 && !workoutMissing && (
          <View style={styles.emptyStateBox}>
            <Text style={styles.emptyStateTitle}>No exercises yet</Text>
            <Text style={styles.emptyStateText}>
              Add a few movements to build your custom workout.
            </Text>

            <Pressable onPress={addExercise} style={styles.emptyAddButton}>
              <Text style={styles.emptyAddButtonText}>Add first exercise</Text>
            </Pressable>
          </View>
        )}
      </KeyboardAwareScrollView>

      {/* BOTTOM BAR */}
      <View style={styles.bottomBar}>
        <Pressable onPress={handleSave} style={styles.secondaryButton}>
          <Text style={styles.secondaryButtonText}>Save</Text>
        </Pressable>

        <Pressable onPress={handleStart} style={styles.primaryButtonWrap}>
          <LinearGradient
            colors={["#2AF5FF", "#B9FF39"]}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={styles.primaryButton}
          >
            <Ionicons name="flame" size={18} color="#052e1f" />
            <Text style={styles.primaryButtonText}>Start Workout</Text>
          </LinearGradient>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

// -------------------------------------------------------
// STYLES
// -------------------------------------------------------

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#05080C",
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    gap: 10,
  },
  headerIcon: {
    width: 36,
    height: 36,
    borderRadius: 999,
    backgroundColor: "#10151B",
    alignItems: "center",
    justifyContent: "center",
  },
  headerInput: {
    flex: 1,
    fontSize: 18,
    fontWeight: "700",
    color: "#E8FDF2",
  },

  summaryCard: {
    marginHorizontal: 16,
    marginTop: 10,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(185,255,57,0.13)",
  },
  summaryTitle: {
    color: "#E6FBF0",
    fontSize: 18,
    fontWeight: "800",
  },
  summarySubtitle: {
    color: "#8FA0A8",
    marginTop: 4,
    fontSize: 13,
    lineHeight: 18,
  },
  summaryMeta: {
    flexDirection: "row",
    gap: 8,
    marginTop: 10,
  },
  summaryPill: {
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(207,255,166,0.4)",
    backgroundColor: "rgba(9,32,25,0.8)",
    alignItems: "center",
  },
  summaryPillText: {
    color: "#CFFFA6",
    fontSize: 11,
    fontWeight: "600",
  },

  sectionHeaderRow: {
    marginTop: 22,
    paddingHorizontal: 16,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  sectionTitle: {
    color: "#D7FBE8",
    fontSize: 16,
    fontWeight: "700",
  },
  addButton: {
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(207,255,166,0.6)",
    backgroundColor: "rgba(24,38,26,0.9)",
    alignItems: "center",
  },
  addButtonText: {
    color: "#CFFFA6",
    fontSize: 12,
    fontWeight: "600",
  },

  exerciseCard: {
    marginHorizontal: 16,
    marginTop: 10,
    borderRadius: 14,
    backgroundColor: "#0A0F14",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.04)",
    overflow: "hidden",
  },
  exerciseHeader: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
  },
  exerciseHeaderLeft: {
    flexDirection: "row",
    gap: 12,
    flex: 1,
    alignItems: "center",
  },
  exerciseIndexDot: {
    width: 26,
    height: 26,
    borderRadius: 999,
    backgroundColor: "rgba(42,245,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  exerciseIndexText: {
    color: "#7CF9FF",
    fontWeight: "700",
    fontSize: 12,
  },
  exerciseNameText: {
    color: "#E8FDF2",
    fontSize: 14,
    fontWeight: "600",
  },
  exerciseMuscleText: {
    color: "#8FA0A8",
    fontSize: 12,
  },
  exerciseHeaderRight: {
    alignItems: "flex-end",
    gap: 4,
  },
  exerciseSetRepText: {
    color: "#CFFFA6",
    fontWeight: "700",
    fontSize: 12,
  },
  exerciseBody: {
    padding: 14,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.04)",
  },

  inputRow: {
    flexDirection: "row",
    marginTop: 8,
  },
  inputLabel: {
    color: "#9AB8BE",
    fontSize: 11,
    marginBottom: 4,
  },
  input: {
    backgroundColor: "#05090D",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
    paddingHorizontal: 10,
    paddingVertical: 8,
    color: "#E8FDF2",
    fontSize: 13,
  },

  adjustRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 12,
  },
  adjustBlock: {
    flex: 1,
  },
  stepperRow: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    marginTop: 4,
  },
  stepperButton: {
    width: 30,
    height: 30,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(207,255,166,0.5)",
    backgroundColor: "rgba(9,32,25,0.9)",
    alignItems: "center",
    justifyContent: "center",
  },
  stepperValue: {
    color: "#E8FDF2",
    fontSize: 14,
    fontWeight: "700",
    minWidth: 30,
    textAlign: "center",
  },

  repPresetRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 8,
  },
  repPresetChip: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: "rgba(124,249,255,0.5)",
  },
  repPresetText: {
    color: "#7CF9FF",
    fontWeight: "600",
    fontSize: 11,
  },

  deleteButton: {
    flexDirection: "row",
    gap: 6,
    marginTop: 16,
    alignItems: "center",
  },
  deleteButtonText: {
    color: "#FF9CA3",
    fontWeight: "600",
    fontSize: 12,
  },

  emptyStateBox: {
    marginTop: 18,
    marginHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    padding: 16,
    alignItems: "center",
  },
  emptyStateTitle: {
    color: "#E6FBF0",
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 6,
  },
  emptyStateText: {
    color: "#8FA0A8",
    fontSize: 13,
    textAlign: "center",
    marginBottom: 12,
  },
  emptyAddButton: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(207,255,166,0.6)",
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  emptyAddButtonText: {
    color: "#CFFFA6",
    fontSize: 13,
    fontWeight: "600",
  },

  bottomBar: {
    padding: 16,
    gap: 10,
    flexDirection: "row",
    backgroundColor: "rgba(5,8,12,0.97)",
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.06)",
  },
  secondaryButton: {
    flex: 1,
    height: 44,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#9EE7CF",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#081118",
  },
  secondaryButtonText: {
    color: "#9EE7CF",
    fontWeight: "700",
    fontSize: 14,
  },
  primaryButtonWrap: {
    flex: 1.4,
  },
  primaryButton: {
    height: 44,
    borderRadius: 999,
    justifyContent: "center",
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
  },
  primaryButtonText: {
    color: "#052e1f",
    fontSize: 15,
    fontWeight: "800",
  },
});
