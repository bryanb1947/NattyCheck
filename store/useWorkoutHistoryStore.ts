// store/useWorkoutHistoryStore.ts
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "./useAuthStore";

/* -------------------------------------------------------
   TYPES
------------------------------------------------------- */
export type LoggedSet = {
  target: number | string;
  actual?: number;
};

export type LoggedExercise = {
  id: string;
  name: string;
  muscle: string;
  sets: LoggedSet[];
};

export type WorkoutSession = {
  id: string; // UUID for local
  date: string;
  workoutType: "ai" | "custom";
  workoutId?: string;
  dayId?: string;
  dayName?: string;
  exercises: LoggedExercise[];
  durationMinutes?: number;
};

type WorkoutHistoryState = {
  sessions: WorkoutSession[];

  logSession: (session: Omit<WorkoutSession, "id" | "date">) => Promise<WorkoutSession>;
  updateSession: (sessionId: string, partial: Partial<WorkoutSession>) => Promise<void>;
  deleteSession: (sessionId: string) => Promise<void>;

  getSessionsForMonth: (year: number, month: number) => WorkoutSession[];
};

/* -------------------------------------------------------
   LOCAL ID HELPER
------------------------------------------------------- */
function makeId(prefix = "sess"): string {
  return `${prefix}_${Math.random().toString(36).slice(2)}_${Date.now()}`;
}

/* -------------------------------------------------------
   STORE
------------------------------------------------------- */
export const useWorkoutHistoryStore = create<WorkoutHistoryState>()(
  persist(
    (set, get) => ({
      sessions: [],

      /* -------------------------------------------------------
         LOG NEW SESSION (LOCAL + SUPABASE)
      ------------------------------------------------------- */
      logSession: async (session) => {
        const userId = useAuthStore.getState().userId;
        if (!userId) throw new Error("Cannot log workout — user not logged in.");

        const newSession: WorkoutSession = {
          id: makeId("session"),
          date: new Date().toISOString(),
          ...session,
        };

        // 1. Save to local state immediately
        set((state) => ({
          sessions: [...state.sessions, newSession],
        }));

        // 2. Save to Supabase
        const { error } = await supabase
          .from("workout_sessions")
          .insert({
            id: newSession.id,
            user_id: userId,
            date: newSession.date,
            workout_type: newSession.workoutType,
            workout_id: newSession.workoutId ?? null,
            day_id: newSession.dayId ?? null,
            day_name: newSession.dayName ?? null,
            exercises: newSession.exercises,
            duration_minutes: newSession.durationMinutes ?? null,
          });

        if (error) {
          console.warn("❗Failed to sync workout to Supabase:", error);
        }

        return newSession;
      },

      /* -------------------------------------------------------
         UPDATE SESSION
      ------------------------------------------------------- */
      updateSession: async (sessionId, partial) => {
        const session = get().sessions.find((s) => s.id === sessionId);
        if (!session) return;

        const updated = { ...session, ...partial };

        // 1. LOCAL update
        set((state) => ({
          sessions: state.sessions.map((s) =>
            s.id === sessionId ? updated : s
          ),
        }));

        // 2. SUPABASE update
        const { error } = await supabase
          .from("workout_sessions")
          .update({
            date: updated.date,
            workout_type: updated.workoutType,
            workout_id: updated.workoutId ?? null,
            day_id: updated.dayId ?? null,
            day_name: updated.dayName ?? null,
            exercises: updated.exercises,
            duration_minutes: updated.durationMinutes ?? null,
          })
          .eq("id", sessionId);

        if (error) {
          console.warn("❗Failed to update workout in Supabase:", error);
        }
      },

      /* -------------------------------------------------------
         DELETE SESSION
      ------------------------------------------------------- */
      deleteSession: async (sessionId) => {
        // 1. LOCAL delete
        set((state) => ({
          sessions: state.sessions.filter((s) => s.id !== sessionId),
        }));

        // 2. SUPABASE delete
        const { error } = await supabase
          .from("workout_sessions")
          .delete()
          .eq("id", sessionId);

        if (error) {
          console.warn("❗Failed to delete workout from Supabase:", error);
        }
      },

      /* -------------------------------------------------------
         FILTERING FOR MONTHLY ANALYSIS
         month = 0–11
      ------------------------------------------------------- */
      getSessionsForMonth: (year, month) => {
        return get().sessions.filter((s) => {
          const d = new Date(s.date);
          return d.getFullYear() === year && d.getMonth() === month;
        });
      },
    }),

    {
      name: "natty-workout-history-v1",
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
