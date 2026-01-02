import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";

export interface WorkoutExercise {
  name: string;
  muscle: string;
  sets: number;
  reps: string;
  why?: string;
}

export interface WorkoutDay {
  day: string;
  label: string;
  exercises: WorkoutExercise[];
}

export interface WorkoutPlan {
  split_name: string;
  days_per_week: number;
  plan: WorkoutDay[];
  notes: string;
  generatedAt: string;       // when the plan was created
  analysisId?: string;       // which analysis created it (optional)
}

type WorkoutState = {
  current?: WorkoutPlan;
  history: WorkoutPlan[];
  setWorkout: (plan: WorkoutPlan) => void;
  clear: () => void;
};

/**
 * We sanitize the plan so we never accidentally store undefined values.
 */
function sanitizePlan(plan: any): WorkoutPlan {
  return {
    split_name: String(plan.split_name),
    days_per_week: Number(plan.days_per_week),
    notes: String(plan.notes || ""),
    generatedAt: plan.generatedAt || new Date().toISOString(),
    analysisId: plan.analysisId || undefined,
    plan: Array.isArray(plan.plan)
      ? plan.plan.map((d: any) => ({
          day: String(d.day),
          label: String(d.label),
          exercises: Array.isArray(d.exercises)
            ? d.exercises.map((ex: any) => ({
                name: String(ex.name),
                muscle: String(ex.muscle),
                sets: Number(ex.sets),
                reps: String(ex.reps),
                why: ex.why ? String(ex.why) : undefined,
              }))
            : [],
        }))
      : [],
  };
}

export const useWorkoutStore = create<WorkoutState>()(
  persist(
    (set, get) => ({
      current: undefined,
      history: [],

      setWorkout: (plan) => {
        const clean = sanitizePlan(plan);
        set({
          current: clean,
          history: [clean, ...get().history].slice(0, 20),
        });
      },

      clear: () => set({ current: undefined, history: [] }),
    }),
    {
      name: "workoutStore",
      storage: createJSONStorage(() => AsyncStorage),
      version: 1,

      migrate: (state: any, version: number) => {
        if (!state) return { current: undefined, history: [] };
        return state;
      },
    }
  )
);
