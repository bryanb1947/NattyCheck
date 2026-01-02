// app/(tabs)/workout.tsx
// ----------------------------------------------------
// Workout Tab (Updated + AI “Start Workout” fully working)
// - AI Plan hero redesigned to match session UI
// - AI Start Workout now launches full workout-session UI
// - No placeholders, fully functional
// ----------------------------------------------------

import React, { useMemo, useState } from "react";
import {
  LayoutAnimation,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  UIManager,
  View,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

import { useWorkoutStore } from "../../store/useWorkoutStore";
import { useCustomWorkoutsStore } from "../../store/useCustomWorkoutsStore";

if (
  Platform.OS === "android" &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

type WorkoutTabKey = "ai" | "custom";

export default function WorkoutScreen() {
  const router = useRouter();

  // AI Plan (already generated from analysis)
  const { current: plan } = useWorkoutStore();

  // Custom workout store
  const customStore = useCustomWorkoutsStore();
  const { workouts, createWorkout, updateWorkout } = customStore;

  const [activeTab, setActiveTab] = useState<WorkoutTabKey>("ai");
  const [expandedDayKey, setExpandedDayKey] = useState<string | null>(null);

  // Pick first training day (not a rest day)
  const activeDayIndex = useMemo(() => {
    if (!plan) return 0;
    const idx = plan.plan.findIndex((d: any) => d.exercises?.length > 0);
    return idx === -1 ? 0 : idx;
  }, [plan]);

  const firstDay = plan?.plan[activeDayIndex];

  const toggleDay = (key: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedDayKey((cur) => (cur === key ? null : key));
  };

  // -------------------------------------------------------
  // 🎯 START WORKOUT (AI → LIVE SESSION)
  // -------------------------------------------------------
  const handleStartWorkoutAi = () => {
    if (!plan || !firstDay) {
      Alert.alert("No workout plan", "Generate your AI plan first.");
      return;
    }

    // STEP 1 — Convert the AI day into a custom workout structure
    const workoutName = `${plan.split_name} — ${firstDay.day}`;
    const sessionId = `ai_${Date.now()}`;

    const newWorkout = createWorkout(workoutName);

    // Replace its blank day list with our AI day
    updateWorkout(newWorkout.id, {
      days: [
        {
          id: `ai_day_${Date.now()}`,
          name: firstDay.day,
          exercises: firstDay.exercises.map((ex: any) => ({
            id: `ai_ex_${Math.random().toString(36).slice(2)}`,
            name: ex.name,
            muscle: ex.muscle,
            sets: ex.sets,
            reps: `${ex.reps}`,
          })),
        },
      ],
    });

    // STEP 2 — Navigate to the REAL workout-session screen
    router.push({
      pathname: "/workout-session/[sessionId]",
      params: { sessionId, workoutId: newWorkout.id },
    });
  };

  // -------------------------------------------------------
  // CREATE CUSTOM WORKOUT
  // -------------------------------------------------------
  const handleCreateCustomWorkout = () => {
    const workout = createWorkout("New Custom Workout");
    router.push({
      pathname: "/custom-workout/[id]",
      params: { id: workout.id },
    });
  };

  // -------------------------------------------------------
  // OPEN CUSTOM WORKOUT
  // -------------------------------------------------------
  const handleOpenCustomWorkout = (id: string) => {
    router.push({
      pathname: "/custom-workout/[id]",
      params: { id },
    });
  };

  // -------------------------------------------------------
  // Segmented control
  // -------------------------------------------------------
  const renderSegmentedControl = () => (
    <View style={styles.segmentWrapper}>
      <View style={styles.segmentPill}>
        {[
          { key: "ai", label: "AI Plan" },
          { key: "custom", label: "Custom" },
        ].map((seg) => {
          const isActive = activeTab === seg.key;
          return (
            <Pressable
              key={seg.key}
              onPress={() => setActiveTab(seg.key)}
              style={styles.segmentItem}
            >
              {isActive ? (
                <LinearGradient
                  colors={["#00E6C8", "#9AF65B"]}
                  start={{ x: 0, y: 0.5 }}
                  end={{ x: 1, y: 0.5 }}
                  style={styles.segmentGradient}
                >
                  <Text style={styles.segmentLabelActive}>{seg.label}</Text>
                </LinearGradient>
              ) : (
                <Text style={styles.segmentLabel}>{seg.label}</Text>
              )}
            </Pressable>
          );
        })}
      </View>
    </View>
  );

  // -------------------------------------------------------
  // AI PLAN TAB + New Start Workout UI
  // -------------------------------------------------------
  const renderAiPlanTab = () => (
    <>
      {plan && firstDay ? (
        <View style={styles.aiHeroContainer}>
          <LinearGradient
            colors={["#2AF5FF20", "#B9FF3920"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.aiHeroBorder}
          >
            <View style={styles.aiHeroInner}>
              <Text style={styles.planTitle}>{plan.split_name}</Text>

              <View style={styles.metaRow}>
                <Ionicons name="calendar-outline" size={14} color="#9EE7CF" />
                <Text style={styles.metaText}>
                  {plan.days_per_week} days / week
                </Text>
              </View>

              <View style={styles.nextPill}>
                <Ionicons
                  name="arrow-forward-circle"
                  size={14}
                  color="#B9FF39"
                />
                <Text style={styles.nextPillText}>
                  Next: {firstDay.label} ({firstDay.day})
                </Text>
              </View>

              {/* REAL Start Workout Button */}
              <Pressable onPress={handleStartWorkoutAi} style={{ marginTop: 18 }}>
                <LinearGradient
                  colors={["#2AF5FF", "#B9FF39"]}
                  start={{ x: 0, y: 0.5 }}
                  end={{ x: 1, y: 0.5 }}
                  style={styles.sessionStartBtn}
                >
                  <Ionicons name="flame" size={18} color="#052e1f" />
                  <Text style={styles.sessionStartText}>Start Workout</Text>
                </LinearGradient>
              </Pressable>
            </View>
          </LinearGradient>
        </View>
      ) : (
        <View style={styles.noPlanHero}>
          <Text style={styles.noPlanTitle}>No AI Plan Yet</Text>
          <Text style={styles.noPlanDesc}>
            Complete a physique analysis to generate your adaptive plan.
          </Text>
        </View>
      )}

      {/* Weekly Split */}
      {plan && (
        <>
          <Text style={styles.sectionTitle}>Weekly Split</Text>

          {plan.plan.map((day: any, index: number) => {
            const key = `${index}-${day.day}`;
            const isRest = !day.exercises || day.exercises.length === 0;
            const isExpanded = expandedDayKey === key;

            return (
              <View key={key} style={styles.dayCard}>
                <Pressable
                  onPress={() => (!isRest ? toggleDay(key) : null)}
                  style={styles.dayHeader}
                >
                  <View style={styles.dayHeaderLeft}>
                    <Text style={styles.dayTitle}>{day.day}</Text>
                    <Text
                      style={[
                        styles.dayLabel,
                        isRest && { color: "#93A3AF" },
                      ]}
                    >
                      {day.label}
                    </Text>
                  </View>

                  <View style={styles.dayHeaderRight}>
                    <Text style={styles.exerciseCount}>
                      {isRest
                        ? "Rest"
                        : `${day.exercises!.length} exercises`}
                    </Text>
                    {!isRest && (
                      <Ionicons
                        name={isExpanded ? "chevron-up" : "chevron-down"}
                        size={18}
                        color="#9EE7CF"
                      />
                    )}
                  </View>
                </Pressable>

                {!isRest && isExpanded && (
                  <View style={styles.exerciseList}>
                    {day.exercises.map((ex: any, i: number) => (
                      <View key={i} style={styles.exerciseRow}>
                        <View style={styles.exerciseLeft}>
                          <View style={styles.bullet} />
                          <Text style={styles.exerciseName}>{ex.name}</Text>
                        </View>

                        <View style={styles.exerciseMeta}>
                          <Text style={styles.exerciseSmall}>{ex.muscle}</Text>
                          <Text style={styles.exerciseSmall}>
                            {ex.sets} × {ex.reps}
                          </Text>
                        </View>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            );
          })}

          <View style={{ paddingTop: 18, paddingBottom: 8 }}>
            <Text style={styles.disclaimer}>
              Your AI plan updates as your physique changes.
            </Text>
          </View>
        </>
      )}
    </>
  );

  // -------------------------------------------------------
  // CUSTOM TAB
  // -------------------------------------------------------
  const renderCustomTab = () => (
    <>
      <View style={[styles.customHero, styles.aiHeroContainer]}>
        <Text style={styles.customHeroTitle}>Your Custom Workouts</Text>
        <Text style={styles.customHeroSubtitle}>
          Build and tailor your own routines.
        </Text>

        <Pressable onPress={handleCreateCustomWorkout} style={{ marginTop: 16 }}>
          <LinearGradient
            colors={["#00E6C8", "#9AF65B"]}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={styles.customHeroButton}
          >
            <Ionicons name="add" size={18} color="#021015" />
            <Text style={styles.customHeroButtonText}>
              Create Custom Workout
            </Text>
          </LinearGradient>
        </Pressable>
      </View>

      {/* List */}
      {workouts.length === 0 ? (
        <View style={styles.customEmptyCard}>
          <Text style={styles.customEmptyTitle}>No custom workouts</Text>
          <Text style={styles.customEmptyText}>
            Create your own routines—push/pull/legs, home workouts, anything.
          </Text>
        </View>
      ) : (
        <View style={{ marginTop: 16 }}>
          {workouts.map((w) => {
            const totalDays = w.days.length;
            const totalExercises = w.days.reduce(
              (sum, d) => sum + d.exercises.length,
              0
            );

            return (
              <Pressable
                key={w.id}
                onPress={() => handleOpenCustomWorkout(w.id)}
                style={({ pressed }) => [
                  styles.customCard,
                  pressed && { opacity: 0.7 },
                ]}
              >
                <View style={{ flex: 1, paddingRight: 10 }}>
                  <Text style={styles.customName}>{w.name}</Text>
                  <Text style={styles.customMeta}>
                    {totalDays} day{totalDays === 1 ? "" : "s"} ·{" "}
                    {totalExercises} exercise
                    {totalExercises === 1 ? "" : "s"}
                  </Text>
                </View>

                <View style={styles.customOpenButton}>
                  <Ionicons
                    name="chevron-forward"
                    size={18}
                    color="#9AF65B"
                  />
                </View>
              </Pressable>
            );
          })}
        </View>
      )}
    </>
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 16, paddingBottom: 160 }}
      >
        {/* Header */}
        <View style={styles.headerRow}>
          <Text style={styles.headerTitle}>Workouts</Text>
        </View>

        {renderSegmentedControl()}

        {activeTab === "ai" ? renderAiPlanTab() : renderCustomTab()}
      </ScrollView>
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
    justifyContent: "space-between",
    marginBottom: 12,
    marginTop: 4,
  },
  headerTitle: {
    color: "#F5FFFB",
    fontSize: 22,
    fontWeight: "800",
  },

  segmentWrapper: { marginBottom: 18 },
  segmentPill: {
    flexDirection: "row",
    backgroundColor: "#12171C",
    borderRadius: 999,
    padding: 4,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.04)",
  },
  segmentItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 6,
  },
  segmentGradient: {
    borderRadius: 999,
    paddingVertical: 8,
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
  },
  segmentLabel: {
    color: "#8A9BA8",
    fontSize: 13,
    fontWeight: "600",
  },
  segmentLabelActive: {
    color: "#021015",
    fontSize: 13,
    fontWeight: "800",
  },

  aiHeroContainer: { marginBottom: 20 },
  aiHeroBorder: { padding: 2, borderRadius: 20 },
  aiHeroInner: {
    backgroundColor: "#0A1014",
    padding: 18,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
  },

  planTitle: { color: "#E8FDF2", fontSize: 20, fontWeight: "800" },

  metaRow: { flexDirection: "row", alignItems: "center", marginTop: 8 },
  metaText: { color: "#A7F3D0", fontSize: 12, marginLeft: 6 },

  nextPill: {
    marginTop: 12,
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "rgba(185,255,57,0.10)",
    borderWidth: 1,
    borderColor: "rgba(185,255,57,0.25)",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  nextPillText: {
    color: "#CFFFA6",
    fontSize: 12,
    fontWeight: "600",
  },

  sessionStartBtn: {
    height: 46,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  sessionStartText: {
    color: "#052e1f",
    fontSize: 16,
    fontWeight: "800",
  },

  noPlanHero: {
    padding: 18,
    borderRadius: 20,
    backgroundColor: "#0D1318",
    marginBottom: 20,
  },
  noPlanTitle: {
    color: "#E6FBF0",
    fontSize: 18,
    fontWeight: "800",
  },
  noPlanDesc: {
    color: "#9AA9B2",
    fontSize: 13,
    lineHeight: 19,
    marginTop: 6,
  },

  sectionTitle: {
    color: "#D7FBE8",
    fontSize: 16,
    fontWeight: "700",
    marginTop: 6,
    marginBottom: 10,
  },

  dayCard: {
    backgroundColor: "#0d1115",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
    marginBottom: 10,
  },
  dayHeader: {
    paddingHorizontal: 16,
    paddingVertical: 15,
    flexDirection: "row",
    alignItems: "center",
  },
  dayHeaderLeft: { flex: 1 },
  dayTitle: { color: "#E6FBF0", fontSize: 15, fontWeight: "700" },
  dayLabel: { marginTop: 4, color: "#A0B8C2", fontSize: 12 },

  dayHeaderRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  exerciseCount: {
    color: "#9EE7CF",
    fontSize: 12,
    fontWeight: "600",
  },

  exerciseList: { paddingHorizontal: 14, paddingBottom: 10, gap: 10 },

  exerciseRow: {
    backgroundColor: "#0a0f13",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.04)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  exerciseLeft: {
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
    flex: 1,
  },
  bullet: {
    width: 8,
    height: 8,
    borderRadius: 999,
    backgroundColor: "#2AF5FF",
  },
  exerciseName: {
    color: "#E8FDF2",
    fontSize: 14,
    fontWeight: "600",
    flexShrink: 1,
  },
  exerciseMeta: { alignItems: "flex-end" },
  exerciseSmall: { color: "#96A8B2", fontSize: 12, fontWeight: "600" },

  disclaimer: { color: "#7C9AA4", fontSize: 12, textAlign: "center" },

  customHero: {
    padding: 18,
    borderRadius: 20,
    backgroundColor: "#10151B",
    borderColor: "rgba(0,230,200,0.25)",
    borderWidth: 1,
  },
  customHeroTitle: {
    color: "#F5FFFB",
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 4,
  },
  customHeroSubtitle: { color: "#9FB1BD", fontSize: 13 },

  customHeroButton: {
    borderRadius: 14,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  customHeroButtonText: {
    color: "#021015",
    fontWeight: "800",
    fontSize: 15,
  },

  customEmptyCard: {
    backgroundColor: "#111417",
    borderRadius: 16,
    padding: 14,
    marginTop: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.03)",
  },
  customEmptyTitle: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 6,
  },
  customEmptyText: {
    color: "#7C8A96",
    fontSize: 13,
    lineHeight: 18,
  },

  customCard: {
    backgroundColor: "#111417",
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.03)",
  },
  customName: { color: "#FFFFFF", fontSize: 15, fontWeight: "700" },
  customMeta: { color: "#7C8A96", fontSize: 13 },
  customOpenButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#161A1F",
    alignItems: "center",
    justifyContent: "center",
  },
});
