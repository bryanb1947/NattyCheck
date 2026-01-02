// store/useCustomWorkoutsStore.ts
// -------------------------------------------------------
// CUSTOM WORKOUTS STORE (FINAL POLISHED VERSION)
// - Safe hydration with Zustand persist
// - Clean, reliable CRUD operations
// - Fully compatible with AI-generated temporary workouts
// -------------------------------------------------------

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";

/* ----------------------------------------------
   TYPES
---------------------------------------------- */
export type CustomExercise = {
  id: string;
  name: string;
  muscle: string;
  equipment?: string;
  sets: number;
  reps: string;
  notes?: string;
  videoUrl?: string;
};

export type CustomWorkoutDay = {
  id: string;
  name: string;
  exercises: CustomExercise[];
};

export type CustomWorkout = {
  id: string;
  name: string;
  description?: string;
  days: CustomWorkoutDay[];
  createdAt: string;
  updatedAt: string;
  /** Optional flag for AI-generated workouts */
  isAI?: boolean;
};

type CustomWorkoutState = {
  workouts: CustomWorkout[];

  // Workouts
  createWorkout: (name?: string, opts?: { isAI?: boolean }) => CustomWorkout;
  updateWorkout: (id: string, partial: Partial<CustomWorkout>) => void;
  deleteWorkout: (id: string) => void;

  // Days
  addDay: (workoutId: string, name?: string) => void;
  deleteDay: (workoutId: string, dayId: string) => void;

  // Exercises
  addExercise: (args: {
    workoutId: string;
    dayId: string;
    exercise: Omit<CustomExercise, "id">;
  }) => void;

  updateExercise: (args: {
    workoutId: string;
    dayId: string;
    exerciseId: string;
    partial: Partial<CustomExercise>;
  }) => void;

  deleteExercise: (args: {
    workoutId: string;
    dayId: string;
    exerciseId: string;
  }) => void;
};

/* ----------------------------------------------
   ID HELPER
---------------------------------------------- */
const makeId = (prefix = "id") =>
  `${prefix}_${Math.random().toString(36).slice(2)}_${Date.now()}`;

/* ----------------------------------------------
   STORE
---------------------------------------------- */
export const useCustomWorkoutsStore = create<CustomWorkoutState>()(
  persist(
    (set, get) => ({
      workouts: [],

      /* CREATE WORKOUT */
      createWorkout: (name = "Untitled Workout", opts = {}) => {
        const now = new Date().toISOString();

        const workout: CustomWorkout = {
          id: makeId("workout"),
          name,
          description: "",
          days: [],
          createdAt: now,
          updatedAt: now,
          ...(opts.isAI ? { isAI: true } : {}),
        };

        set((state) => ({
          workouts: [...state.workouts, workout],
        }));

        return workout;
      },

      /* UPDATE WORKOUT */
      updateWorkout: (id, partial) => {
        set((state) => ({
          workouts: state.workouts.map((w) =>
            w.id === id
              ? {
                  ...w,
                  ...partial,
                  updatedAt: new Date().toISOString(),
                }
              : w
          ),
        }));
      },

      /* DELETE WORKOUT */
      deleteWorkout: (id) => {
        set((state) => ({
          workouts: state.workouts.filter((w) => w.id !== id),
        }));
      },

      /* ADD DAY */
      addDay: (workoutId, name = "New Day") => {
        set((state) => ({
          workouts: state.workouts.map((w) => {
            if (w.id !== workoutId) return w;

            const newDay: CustomWorkoutDay = {
              id: makeId("day"),
              name,
              exercises: [],
            };

            return {
              ...w,
              days: [...w.days, newDay],
              updatedAt: new Date().toISOString(),
            };
          }),
        }));
      },

      /* DELETE DAY */
      deleteDay: (workoutId, dayId) => {
        set((state) => ({
          workouts: state.workouts.map((w) =>
            w.id === workoutId
              ? {
                  ...w,
                  days: w.days.filter((d) => d.id !== dayId),
                  updatedAt: new Date().toISOString(),
                }
              : w
          ),
        }));
      },

      /* ADD EXERCISE */
      addExercise: ({ workoutId, dayId, exercise }) => {
        const ex: CustomExercise = {
          ...exercise,
          id: makeId("ex"),
        };

        set((state) => ({
          workouts: state.workouts.map((w) =>
            w.id === workoutId
              ? {
                  ...w,
                  days: w.days.map((d) =>
                    d.id === dayId
                      ? { ...d, exercises: [...d.exercises, ex] }
                      : d
                  ),
                  updatedAt: new Date().toISOString(),
                }
              : w
          ),
        }));
      },

      /* UPDATE EXERCISE */
      updateExercise: ({ workoutId, dayId, exerciseId, partial }) => {
        set((state) => ({
          workouts: state.workouts.map((w) =>
            w.id === workoutId
              ? {
                  ...w,
                  days: w.days.map((d) =>
                    d.id === dayId
                      ? {
                          ...d,
                          exercises: d.exercises.map((ex) =>
                            ex.id === exerciseId ? { ...ex, ...partial } : ex
                          ),
                        }
                      : d
                  ),
                  updatedAt: new Date().toISOString(),
                }
              : w
          ),
        }));
      },

      /* DELETE EXERCISE */
      deleteExercise: ({ workoutId, dayId, exerciseId }) => {
        set((state) => ({
          workouts: state.workouts.map((w) =>
            w.id === workoutId
              ? {
                  ...w,
                  days: w.days.map((d) =>
                    d.id === dayId
                      ? {
                          ...d,
                          exercises: d.exercises.filter(
                            (ex) => ex.id !== exerciseId
                          ),
                        }
                      : d
                  ),
                  updatedAt: new Date().toISOString(),
                }
              : w
          ),
        }));
      },
    }),

    {
      name: "natty-custom-workouts-v1",
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
