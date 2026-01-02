// store/useCustomExercisesStore.ts
// ------------------------------------------------------
// Handles ALL custom user-created exercises.
// Persisted locally, with optional Supabase sync.
// ------------------------------------------------------

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { supabase } from "../lib/supabase";
import uuid from "react-native-uuid";

export interface CustomExercise {
  id: string;
  user_id: string | null;
  name: string;
  primary_muscle: string;
  equipment: string;
  description?: string;
  video_url?: string | null;
  created_at: string;
}

interface CustomExercisesState {
  exercises: CustomExercise[];

  // CRUD
  addExercise: (exercise: Omit<CustomExercise, "id" | "created_at">) => Promise<string>;
  updateExercise: (id: string, updates: Partial<CustomExercise>) => Promise<void>;
  deleteExercise: (id: string) => Promise<void>;
  loadFromSupabase: (user_id: string) => Promise<void>;
}

export const useCustomExercisesStore = create<CustomExercisesState>()(
  persist(
    (set, get) => ({
      exercises: [],

      // ------------------------------------
      // CREATE
      // ------------------------------------
      addExercise: async (exercise) => {
        const id = uuid.v4().toString();
        const created_at = new Date().toISOString();

        const newExercise: CustomExercise = {
          id,
          created_at,
          ...exercise,
        };

        // Local
        set({ exercises: [...get().exercises, newExercise] });

        // Supabase sync
        if (exercise.user_id) {
          await supabase.from("custom_exercises").upsert(newExercise);
        }

        return id;
      },

      // ------------------------------------
      // UPDATE
      // ------------------------------------
      updateExercise: async (id, updates) => {
        set({
          exercises: get().exercises.map((e) =>
            e.id === id ? { ...e, ...updates } : e
          ),
        });

        if (updates?.user_id) {
          await supabase
            .from("custom_exercises")
            .update(updates)
            .eq("id", id);
        }
      },

      // ------------------------------------
      // DELETE
      // ------------------------------------
      deleteExercise: async (id) => {
        set({
          exercises: get().exercises.filter((x) => x.id !== id),
        });

        await supabase.from("custom_exercises").delete().eq("id", id);
      },

      // ------------------------------------
      // SYNC FROM SUPABASE
      // ------------------------------------
      loadFromSupabase: async (user_id) => {
        const { data, error } = await supabase
          .from("custom_exercises")
          .select("*")
          .eq("user_id", user_id);

        if (!error && data) {
          set({ exercises: data });
        }
      },
    }),

    {
      name: "customExercisesStore",
      version: 1,
    }
  )
);
