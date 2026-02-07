// app/workout-session/[sessionId].tsx
// -------------------------------------------------------
// LIVE WORKOUT SESSION (HOOK-SAFE)
//
// Supports 2 launch modes:
//  1) Custom workout: params.workoutId
//  2) AI workout (Option A): params.aiPayload (JSON string)
//
// AI Mode guarantees:
//   ✅ NEVER touches CustomWorkouts store (read/write) for AI
//   ✅ workout_type = "ai"
//
// DB FIX (based on your error):
//   ✅ workout_sessions.workout_id is NOT NULL in your DB
//   ✅ Therefore AI must send a non-null workout_id
//      → we use a synthetic stable id: `ai:<routeSessionId>`
//
// FIXES (aligned to YOUR DB screenshot):
//   ✅ ALWAYS writes `entries` (jsonb NOT NULL)
//   ✅ ALWAYS writes `workout_name` (text NOT NULL)
//   ✅ ALWAYS writes `workout_id` (text NOT NULL in your DB)
//   ✅ NEVER sends non-uuid into `id` (uuid PK) — we generate a real UUID
//   ✅ Uses INSERT (not upsert) to avoid ON CONFLICT constraint issues
//   ✅ Writes `date` + `timestamp` for compatibility
//   ✅ Optionally writes day_id/day_name, workout_type, completed_sets, completed_reps
//   ✅ DOES NOT send duration_minutes / duration fields
// -------------------------------------------------------

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Modal,
  TextInput,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";

import { supabase } from "@/lib/supabase";
import { useCustomWorkoutsStore } from "@/store/useCustomWorkoutsStore";
import { useWorkoutHistoryStore } from "@/store/useWorkoutHistoryStore";

/* -----------------------------
   Types (DB-friendly)
----------------------------- */
type SetEntry = {
  target: number;
  actual: number | null;
};

type SessionExerciseDb = {
  id: string;
  name: string;
  muscle: string;
  sets: SetEntry[];
};

// AI payload passed from workout tab (Option A)
type AiPayload = {
  workoutName: string;
  dayName?: string;
  exercises: Array<{
    id: string;
    name: string;
    muscle: string;
    sets: number | string;
    reps: number | string;
  }>;
};

function safeInt(v: any, fallback = 0) {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? Math.trunc(n) : fallback;
}

function clampInt(v: any, min: number, max: number, fallback: number) {
  const n = safeInt(v, fallback);
  return Math.max(min, Math.min(max, n));
}

function uuidv4Fallback() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function makeUuid(): string {
  const c = (globalThis as any)?.crypto;
  if (c?.randomUUID) return c.randomUUID();
  return uuidv4Fallback();
}

function nonEmptyString(v: any, fallback: string) {
  const s = typeof v === "string" ? v.trim() : "";
  return s.length ? s : fallback;
}

function safeJsonParse<T>(raw: any): T | null {
  if (!raw || typeof raw !== "string") return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export default function WorkoutSessionScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    workoutId?: string; // custom
    sessionId?: string; // route param; NOT the DB PK
    type?: string; // "custom" | "ai"
    aiPayload?: string; // JSON string (Option A)
  }>();

  // Keep route session id only for navigation continuity / debugging
  const routeSessionId = (params.sessionId as string) || `sess_${Date.now()}`;

  // DB PK uuid — stable per screen instance
  const dbIdRef = useRef<string>(makeUuid());
  const savingRef = useRef(false);

  const logSessionLocal = useWorkoutHistoryStore((s) => s.logSession);

  // -----------------------------
  // MODE DETECTION
  // -----------------------------
  const aiPayload = useMemo(
    () => safeJsonParse<AiPayload>(params.aiPayload),
    [params.aiPayload]
  );
  const isAi = !!aiPayload || params.type === "ai";

  // -----------------------------
  // CUSTOM WORKOUT LOAD (only if not AI)
  // -----------------------------
  const workoutId = (params.workoutId as string) || "";
  const workouts = useCustomWorkoutsStore((s) => s.workouts);

  const customWorkout = useMemo(() => {
    if (isAi) return null;
    return workouts.find((w) => w.id === workoutId) || null;
  }, [isAi, workouts, workoutId]);

  // -----------------------------
  // BUILD SESSION "WORKOUT" VIEW MODEL
  // -----------------------------
  const workoutName = useMemo(() => {
    if (aiPayload?.workoutName)
      return nonEmptyString(aiPayload.workoutName, "Workout");
    if (customWorkout?.name)
      return nonEmptyString(customWorkout.name, "Workout");
    return "Workout";
  }, [aiPayload?.workoutName, customWorkout?.name]);

  // Flatten exercises:
  // - AI: from aiPayload.exercises
  // - Custom: flatten day->exercises like before
  const exercises = useMemo(() => {
    // AI MODE
    if (aiPayload && Array.isArray(aiPayload.exercises)) {
      return aiPayload.exercises.map((ex) => ({
        id: nonEmptyString(
          ex.id,
          `ai_ex_${Math.random().toString(36).slice(2)}`
        ),
        name: nonEmptyString(ex.name, "Exercise"),
        muscle: nonEmptyString(ex.muscle, "Other"),
        sets: safeInt(ex.sets, 0),
        reps: ex.reps,
        day_id: null as string | null,
        day_name: aiPayload.dayName
          ? nonEmptyString(aiPayload.dayName, "")
          : null,
      }));
    }

    // CUSTOM MODE
    if (!customWorkout) return [];
    const out: Array<{
      id: string;
      name: string;
      muscle: string;
      sets: number;
      reps: string | number;
      day_id?: string | null;
      day_name?: string | null;
    }> = [];

    for (const day of customWorkout.days || []) {
      for (const ex of day.exercises || []) {
        out.push({
          id: ex.id,
          name: ex.name,
          muscle: ex.muscle,
          sets: safeInt(ex.sets, 0),
          reps: ex.reps,
          day_id: day.id,
          day_name: day.name,
        });
      }
    }
    return out;
  }, [aiPayload, customWorkout]);

  const valid = exercises.length > 0;

  // -----------------------------
  // STATE
  // -----------------------------
  const [i, setI] = useState(0);
  const current = valid ? exercises[i] : null;

  const [setEntries, setSetEntries] = useState<SetEntry[]>([]);

  // Rep chips modal
  const [repModalOpen, setRepModalOpen] = useState(false);
  const [repModalSetIndex, setRepModalSetIndex] = useState<number | null>(null);
  const [repInput, setRepInput] = useState<string>("");

  // Reset setEntries when current exercise changes
  useEffect(() => {
    if (!valid || !current) {
      setSetEntries([]);
      return;
    }

    const repsNum = clampInt(current.reps, 1, 50, 10);
    const setCount = Math.max(0, safeInt(current.sets, 0));

    setSetEntries(
      Array.from({ length: setCount }).map(() => ({
        target: repsNum,
        actual: null,
      }))
    );
  }, [valid, current, i]);

  const setReps = (idx: number, val: number) => {
    const safe = clampInt(val, 1, 50, 1);
    setSetEntries((prev) =>
      prev.map((s, j) => (j === idx ? { ...s, actual: safe } : s))
    );
  };

  const clearSet = (idx: number) => {
    setSetEntries((prev) =>
      prev.map((s, j) => (j === idx ? { ...s, actual: null } : s))
    );
  };

  const REP_PRESETS = useMemo(() => [6, 8, 10, 12, 15], []);
  const lastActualReps = useMemo(() => {
    for (let k = setEntries.length - 1; k >= 0; k--) {
      const v = setEntries[k]?.actual;
      if (v != null) return v;
    }
    return null;
  }, [setEntries]);

  const openOtherModal = (setIdx: number) => {
    setRepModalSetIndex(setIdx);
    const currentVal =
      setEntries[setIdx]?.actual != null ? String(setEntries[setIdx].actual) : "";
    setRepInput(currentVal);
    setRepModalOpen(true);
  };

  const closeOtherModal = () => {
    setRepModalOpen(false);
    setRepModalSetIndex(null);
    setRepInput("");
  };

  const confirmOtherModal = () => {
    if (repModalSetIndex == null) return;
    const n = clampInt(repInput, 1, 50, 0);
    if (!n) {
      Alert.alert("Enter reps", "Please enter a number between 1 and 50.");
      return;
    }
    setReps(repModalSetIndex, n);
    closeOtherModal();
  };

  // -----------------------------
  // BUILD DB ENTRIES (NEVER NULL)
  // -----------------------------
  const buildEntriesForDb = (): SessionExerciseDb[] => {
    return exercises.map((ex, index) => {
      const repsNum = clampInt(ex.reps, 1, 50, 10);
      const setCount = Math.max(0, safeInt(ex.sets, 0));

      const sets: SetEntry[] =
        index === i
          ? setEntries
          : Array.from({ length: setCount }).map(() => ({
              target: repsNum,
              actual: null,
            }));

      return {
        id: nonEmptyString(ex.id, `ex_${index}`),
        name: nonEmptyString(ex.name, "Exercise"),
        muscle: nonEmptyString(ex.muscle, "Other"),
        sets,
      };
    });
  };

  const computeTotals = (entries: SessionExerciseDb[]) => {
    let total_sets = 0;
    let completed_sets = 0;
    let completed_reps = 0;

    for (const ex of entries) {
      const sets = ex.sets || [];
      total_sets += sets.length;

      for (const s of sets) {
        if (s.actual != null) {
          completed_sets += 1;
          completed_reps += safeInt(s.actual, 0);
        }
      }
    }

    return { total_sets, completed_sets, completed_reps };
  };

  async function syncToSupabase(args: {
    id: string; // uuid PK
    session_id: string; // routeSessionId (text)
    workout_id: string; // ✅ NOT NULL (fix)
    workout_name: string; // NOT NULL
    workout_type: string | null; // "ai" or "custom"
    timestampIso: string;
    dateIso: string;
    entries: SessionExerciseDb[]; // NOT NULL
    totals: { total_sets: number; completed_sets: number; completed_reps: number };
    day_id?: string | null;
    day_name?: string | null;
  }) {
    const {
      data: { user },
      error: userErr,
    } = await supabase.auth.getUser();

    if (userErr || !user) {
      console.warn("⚠️ No user; cannot sync workout.");
      return { ok: false as const, error: userErr ?? { message: "no_user" } };
    }

    const payload: any = {
      id: args.id,
      user_id: user.id,

      session_id: args.session_id,

      workout_id: nonEmptyString(args.workout_id, `ai:${args.session_id}`), // ✅ double safety
      workout_name: nonEmptyString(args.workout_name, "Workout"),
      workout_type: args.workout_type,

      timestamp: args.timestampIso,
      date: args.dateIso,

      day_id: args.day_id ?? null,
      day_name: args.day_name ?? null,

      entries: args.entries,
      total_sets: args.totals.total_sets ?? 0,

      completed_sets: args.totals.completed_sets ?? null,
      completed_reps: args.totals.completed_reps ?? null,
    };

    const { error } = await supabase.from("workout_sessions").insert(payload);

    if (error) {
      console.warn("❗Failed to sync workout to Supabase:", error);
      return { ok: false as const, error };
    }

    console.log("✅ Workout synced to Supabase!");
    return { ok: true as const };
  }

  // -----------------------------
  // FINISH
  // -----------------------------
  const finishWorkout = async () => {
    if (!valid) return;
    if (savingRef.current) return;
    savingRef.current = true;

    const finishedAt = new Date();
    const iso = finishedAt.toISOString();

    const entries = buildEntriesForDb();
    const totals = computeTotals(entries);

    const day_id = (current as any)?.day_id ?? null;
    const day_name = (current as any)?.day_name ?? null;

    // ✅ workout_id must be NON-NULL in your DB:
    // - Custom: use real customWorkout.id
    // - AI: use synthetic stable id
    const dbWorkoutId = isAi
      ? `ai:${routeSessionId}`
      : nonEmptyString(customWorkout?.id ?? workoutId, `custom:${routeSessionId}`);

    // 1) Local save
    try {
      await logSessionLocal({
        workoutType: (isAi ? "ai" : "custom") as any,
        // keep this consistent: store workoutId for AI too (synthetic id)
        workoutId: dbWorkoutId,
        workoutName,
        dayId: day_id ?? undefined,
        dayName: day_name ?? undefined,
        exercises: entries.map((ex) => ({
          id: ex.id,
          name: ex.name,
          muscle: ex.muscle,
          sets: ex.sets.map((s) => ({
            target: s.target,
            actual: s.actual,
          })),
        })),
        totals,
      } as any);
    } catch (e) {
      console.warn("⚠️ Local session save failed:", e);
    }

    // 2) Cloud save
    try {
      const res = await syncToSupabase({
        id: dbIdRef.current,
        session_id: routeSessionId,
        workout_id: dbWorkoutId,
        workout_name: workoutName,
        workout_type: isAi ? "ai" : "custom",
        timestampIso: iso,
        dateIso: iso,
        entries,
        totals,
        day_id,
        day_name,
      });

      if (!res.ok) {
        Alert.alert(
          "Saved locally",
          "Workout saved on device, but cloud sync failed. Check console logs."
        );
      }
    } catch (e) {
      console.error("❌ Unexpected Supabase sync error:", e);
      Alert.alert(
        "Saved locally",
        "Workout saved on device, but cloud sync failed unexpectedly."
      );
    } finally {
      savingRef.current = false;
    }

    router.replace("/(tabs)/progress");
  };

  const goNext = () => {
    if (!valid) return;
    if (i >= exercises.length - 1) finishWorkout();
    else setI((n) => n + 1);
  };

  const goBack = () => {
    if (i > 0) setI((n) => n - 1);
  };

  // -----------------------------
  // UI: Rep chips
  // -----------------------------
  const renderRepChips = (setIdx: number) => {
    const isDone = setEntries[setIdx]?.actual != null;
    const activeVal = setEntries[setIdx]?.actual;

    return (
      <View style={styles.chipsWrap}>
        <Pressable
          disabled={lastActualReps == null}
          onPress={() => {
            if (lastActualReps != null) setReps(setIdx, lastActualReps);
          }}
          style={[
            styles.chip,
            styles.chipSoft,
            lastActualReps == null && { opacity: 0.35 },
          ]}
        >
          <Ionicons name="repeat" size={14} color="#9EE7CF" />
          <Text style={styles.chipTextSoft}>
            Same{lastActualReps != null ? ` (${lastActualReps})` : ""}
          </Text>
        </Pressable>

        {REP_PRESETS.map((n) => {
          const active = activeVal === n;
          return (
            <Pressable
              key={n}
              onPress={() => setReps(setIdx, n)}
              style={[
                styles.chip,
                active && styles.chipActive,
                !active && styles.chipSoft,
              ]}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>
                {n}
              </Text>
            </Pressable>
          );
        })}

        <Pressable onPress={() => openOtherModal(setIdx)} style={[styles.chip, styles.chipSoft]}>
          <Ionicons name="create-outline" size={14} color="#B9FF39" />
          <Text style={styles.chipTextSoft}>Other</Text>
        </Pressable>

        <Pressable
          disabled={!isDone}
          onPress={() => clearSet(setIdx)}
          style={[
            styles.chip,
            styles.chipDanger,
            !isDone && { opacity: 0.35 },
          ]}
        >
          <Ionicons name="refresh" size={14} color="#FF9CA3" />
          <Text style={styles.chipTextDanger}>Undo</Text>
        </Pressable>
      </View>
    );
  };

  // -----------------------------
  // RENDER
  // -----------------------------
  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Manual reps modal */}
      <Modal
        visible={repModalOpen}
        transparent
        animationType="fade"
        onRequestClose={closeOtherModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Enter reps</Text>
            <Text style={styles.modalSubtitle}>1–50</Text>

            <TextInput
              value={repInput}
              onChangeText={(t) => setRepInput(t.replace(/[^0-9]/g, ""))}
              keyboardType="number-pad"
              placeholder="e.g. 11"
              placeholderTextColor="#6B7C86"
              style={styles.modalInput}
              autoFocus
              maxLength={2}
              returnKeyType="done"
              onSubmitEditing={confirmOtherModal}
            />

            <View style={styles.modalRow}>
              <Pressable
                onPress={closeOtherModal}
                style={styles.modalBtnSecondary}
              >
                <Text style={styles.modalBtnSecondaryText}>Cancel</Text>
              </Pressable>

              <Pressable
                onPress={confirmOtherModal}
                style={styles.modalBtnPrimaryWrap}
              >
                <LinearGradient
                  colors={["#2AF5FF", "#B9FF39"]}
                  start={{ x: 0, y: 0.5 }}
                  end={{ x: 1, y: 0.5 }}
                  style={styles.modalBtnPrimary}
                >
                  <Text style={styles.modalBtnPrimaryText}>Done</Text>
                </LinearGradient>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color="#D7FBE8" />
        </Pressable>

        <Text style={styles.headerTitle}>{workoutName}</Text>

        <View style={{ width: 36 }} />
      </View>

      {!valid && (
        <View style={styles.centerBox}>
          <Text style={styles.errorText}>No exercises found.</Text>
          {isAi ? (
            <Text style={[styles.errorText, { opacity: 0.7, marginTop: 8 }]}>
              AI payload missing or invalid.
            </Text>
          ) : (
            <Text style={[styles.errorText, { opacity: 0.7, marginTop: 8 }]}>
              Custom workout not found or empty.
            </Text>
          )}
        </View>
      )}

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
              {/* Removed placeholder image box so the workout looks intentional + clean */}

              <Text style={styles.exerciseName}>{current.name}</Text>
              <Text style={styles.exerciseMuscle}>{current.muscle}</Text>

              {!!(current as any).day_name && (
                <Text style={styles.dayLabel}>
                  Day: {(current as any).day_name}
                </Text>
              )}

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
                      <View style={styles.setTopRow}>
                        <Text style={styles.setLabel}>Set {idx + 1}</Text>

                        <Pressable
                          onPress={() => openOtherModal(idx)}
                          style={({ pressed }) => [
                            styles.editPill,
                            pressed && { opacity: 0.85 },
                          ]}
                        >
                          <Ionicons
                            name="create-outline"
                            size={14}
                            color="#9EE7CF"
                          />
                          <Text style={styles.editPillText}>Edit</Text>
                        </Pressable>
                      </View>

                      <Text style={styles.repText}>
                        {display} {done ? "reps" : "target"}
                      </Text>

                      {renderRepChips(idx)}
                    </View>
                  );
                })}
              </View>
            </ScrollView>
          </KeyboardAvoidingView>

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
                  name={i === exercises.length - 1 ? "checkmark" : "arrow-forward"}
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

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#05080C" },
  centerBox: { marginTop: 120, alignItems: "center", paddingHorizontal: 16 },
  errorText: { color: "#fff", fontSize: 16, textAlign: "center" },

  header: { flexDirection: "row", alignItems: "center", padding: 16 },
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
    marginBottom: 10,
  },
  dayLabel: {
    color: "#7CF9FF",
    fontSize: 12,
    textAlign: "center",
    marginBottom: 16,
    opacity: 0.9,
  },

  setHeader: {
    color: "#D7FBE8",
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 10,
    marginTop: 10,
  },

  setList: { gap: 14 },

  setCard: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    backgroundColor: "#0A1014",
  },

  setTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },

  setLabel: { color: "#9EE7CF", fontSize: 12 },

  repText: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "800",
    marginBottom: 10,
  },

  editPill: {
    flexDirection: "row",
    gap: 6,
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(158,231,207,0.35)",
    backgroundColor: "rgba(8,17,24,0.9)",
  },
  editPillText: {
    color: "#9EE7CF",
    fontSize: 12,
    fontWeight: "700",
  },

  chipsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 2,
  },
  chip: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  chipSoft: {
    borderColor: "rgba(255,255,255,0.10)",
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  chipActive: {
    borderColor: "rgba(185,255,57,0.65)",
    backgroundColor: "rgba(185,255,57,0.14)",
  },
  chipText: { color: "#D7FBE8", fontSize: 13, fontWeight: "800" },
  chipTextActive: { color: "#CFFFA6" },
  chipTextSoft: { color: "#B7C7D1", fontSize: 12, fontWeight: "700" },
  chipDanger: {
    borderColor: "rgba(255,156,163,0.35)",
    backgroundColor: "rgba(255,156,163,0.10)",
  },
  chipTextDanger: { color: "#FF9CA3", fontSize: 12, fontWeight: "800" },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.65)",
    alignItems: "center",
    justifyContent: "center",
    padding: 18,
  },
  modalCard: {
    width: "100%",
    maxWidth: 420,
    borderRadius: 18,
    backgroundColor: "#0A1014",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    padding: 16,
  },
  modalTitle: { color: "#E8FDF2", fontSize: 18, fontWeight: "900" },
  modalSubtitle: { color: "#8FA0A8", fontSize: 12, marginTop: 4 },

  modalInput: {
    marginTop: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    backgroundColor: "#05080C",
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: "#E8FDF2",
    fontSize: 18,
    fontWeight: "800",
    textAlign: "center",
  },

  modalRow: { flexDirection: "row", gap: 10, marginTop: 14 },
  modalBtnSecondary: {
    flex: 1,
    height: 46,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(158,231,207,0.35)",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#081118",
  },
  modalBtnSecondaryText: { color: "#9EE7CF", fontSize: 14, fontWeight: "800" },

  modalBtnPrimaryWrap: { flex: 1 },
  modalBtnPrimary: {
    height: 46,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },
  modalBtnPrimaryText: { color: "#052e1f", fontSize: 14, fontWeight: "900" },

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

  primaryText: { color: "#052e1f", fontWeight: "800", fontSize: 16 },
});
