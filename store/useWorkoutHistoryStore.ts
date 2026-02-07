// store/useWorkoutHistoryStore.ts
// -------------------------------------------------------
// WORKOUT HISTORY STORE (LOCAL ONLY)
// ✅ Single source of truth for cloud logging is workout-session/[sessionId].tsx
// ✅ This store is ONLY for local UX (recent sessions, offline cache, etc.)
// ✅ Removes ALL Supabase writes to prevent double-inserts + schema mismatch errors
// ✅ No duration_minutes anywhere
// -------------------------------------------------------

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";

/* -------------------------------------------------------
   TYPES
------------------------------------------------------- */
export type LoggedSet = {
  target: number | string;
  actual?: number | null;
};

export type LoggedExercise = {
  id: string;
  name: string;
  muscle: string;
  sets: LoggedSet[];
  // optional (nice to keep for reporting/grouping)
  day_id?: string;
  day_name?: string;
};

export type WorkoutSession = {
  session_id: string;
  date: string; // ISO string (timestamp)

  workoutType: "ai" | "custom";
  workoutId?: string;

  // ✅ MUST exist (fallback to "Workout")
  workoutName: string;

  dayId?: string;
  dayName?: string;

  exercises: LoggedExercise[];

  totals?: {
    total_sets: number;
    completed_sets: number;
    completed_reps: number;
  };
};

type WorkoutHistoryState = {
  sessions: WorkoutSession[];

  // LOCAL ONLY (no Supabase)
  logSession: (session: Omit<WorkoutSession, "session_id" | "date">) => Promise<WorkoutSession>;
  updateSession: (session_id: string, partial: Partial<WorkoutSession>) => Promise<void>;
  deleteSession: (session_id: string) => Promise<void>;

  getSessionsForMonth: (year: number, month: number) => WorkoutSession[];
  clearAll: () => void;
};

/* -------------------------------------------------------
   UUID HELPER (NO DEPS)
------------------------------------------------------- */
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

function safeIso(iso?: any) {
  const d = iso ? new Date(iso) : new Date();
  return isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
}

/* -------------------------------------------------------
   DERIVED TOTALS (if caller doesn't provide)
------------------------------------------------------- */
function computeTotals(exercises: LoggedExercise[]) {
  let total_sets = 0;
  let completed_sets = 0;
  let completed_reps = 0;

  for (const ex of exercises || []) {
    const sets = Array.isArray(ex.sets) ? ex.sets : [];
    total_sets += sets.length;

    for (const s of sets) {
      const actual = typeof s?.actual === "number" ? s.actual : null;
      if (actual != null) {
        completed_sets += 1;
        completed_reps += actual;
      }
    }
  }

  return { total_sets, completed_sets, completed_reps };
}

/* -------------------------------------------------------
   STORE (LOCAL ONLY)
------------------------------------------------------- */
export const useWorkoutHistoryStore = create<WorkoutHistoryState>()(
  persist(
    (set, get) => ({
      sessions: [],

      // ------------------------------------------------------
      // LOG NEW SESSION (LOCAL ONLY)
      // ------------------------------------------------------
      logSession: async (session) => {
        const safeWorkoutName = nonEmptyString((session as any)?.workoutName, "Workout");

        const date = safeIso((session as any)?.date);
        const exercises = Array.isArray((session as any)?.exercises) ? (session as any).exercises : [];

        const totals =
          (session as any)?.totals &&
          typeof (session as any).totals.total_sets === "number" &&
          typeof (session as any).totals.completed_sets === "number" &&
          typeof (session as any).totals.completed_reps === "number"
            ? (session as any).totals
            : computeTotals(exercises);

        const newSession: WorkoutSession = {
          session_id: makeUuid(),
          date,
          ...session,
          workoutName: safeWorkoutName,
          exercises,
          totals,
        };

        set((state) => ({
          sessions: [newSession, ...state.sessions],
        }));

        return newSession;
      },

      // ------------------------------------------------------
      // UPDATE SESSION (LOCAL ONLY)
      // ------------------------------------------------------
      updateSession: async (session_id, partial) => {
        const current = get().sessions.find((s) => s.session_id === session_id);
        if (!current) return;

        const nextWorkoutName = nonEmptyString(
          (partial as any)?.workoutName ?? current.workoutName,
          "Workout"
        );

        const nextExercises = Array.isArray((partial as any)?.exercises)
          ? (partial as any).exercises
          : current.exercises;

        const nextDate = partial.date ? safeIso(partial.date) : current.date;

        const nextTotals =
          (partial as any)?.totals &&
          typeof (partial as any).totals.total_sets === "number" &&
          typeof (partial as any).totals.completed_sets === "number" &&
          typeof (partial as any).totals.completed_reps === "number"
            ? (partial as any).totals
            : computeTotals(nextExercises);

        const updated: WorkoutSession = {
          ...current,
          ...partial,
          date: nextDate,
          workoutName: nextWorkoutName,
          exercises: nextExercises,
          totals: nextTotals,
        };

        set((state) => ({
          sessions: state.sessions.map((s) => (s.session_id === session_id ? updated : s)),
        }));
      },

      // ------------------------------------------------------
      // DELETE SESSION (LOCAL ONLY)
      // ------------------------------------------------------
      deleteSession: async (session_id) => {
        set((state) => ({
          sessions: state.sessions.filter((s) => s.session_id !== session_id),
        }));
      },

      // ------------------------------------------------------
      // FILTER FOR MONTH (LOCAL ONLY)
      // month = 0–11
      // ------------------------------------------------------
      getSessionsForMonth: (year, month) => {
        return get().sessions.filter((s) => {
          const d = new Date(s.date);
          return !isNaN(d.getTime()) && d.getFullYear() === year && d.getMonth() === month;
        });
      },

      clearAll: () => set({ sessions: [] }),
    }),
    {
      name: "natty-workout-history-v4",
      storage: createJSONStorage(() => AsyncStorage),

      // Keep storage lean-ish
      partialize: (state) => ({ sessions: state.sessions }),
    }
  )
);
