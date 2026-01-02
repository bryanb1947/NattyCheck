// store/useResultsStore.ts

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { AnalysisResult as BackendAnalysisResult } from "../lib/api";

/**
 * This is what we actually keep in storage.
 * We extend whatever the backend returns, and guarantee:
 * - `created_at`: ISO timestamp of when the analysis finished
 * - `id`: optional analysis ID from backend / Supabase
 */
export type StoredAnalysisResult = BackendAnalysisResult & {
  id?: string;
  created_at: string; // always present in-store
};

type ResultsState = {
  last?: StoredAnalysisResult;
  history: StoredAnalysisResult[];
  setLast: (
    result: BackendAnalysisResult & {
      id?: string;
      created_at?: string;
    }
  ) => void;
  clear: () => void;
};

/**
 * Normalize + clean a result:
 * - Ensure `created_at` is set (now if missing)
 * - Ensure `id` (if present) is a string
 * - Strip `undefined` fields so storage doesn't bloat
 */
function normalizeResult(
  result: BackendAnalysisResult & { id?: string; created_at?: string }
): StoredAnalysisResult {
  const nowIso = new Date().toISOString();

  const base: any = {
    ...result,
  };

  // Backfill timestamp if backend didn't send one
  if (!base.created_at) {
    base.created_at = nowIso;
  }

  // Force id → string if present
  if (base.id != null) {
    base.id = String(base.id);
  }

  // Strip undefined keys
  const clean: any = {};
  Object.keys(base).forEach((key) => {
    if (base[key] !== undefined) {
      clean[key] = base[key];
    }
  });

  return clean as StoredAnalysisResult;
}

export const useResultsStore = create<ResultsState>()(
  persist(
    (set, get) => ({
      last: undefined,
      history: [],

      setLast: (result) => {
        const clean = normalizeResult(result as any);

        set((state) => ({
          last: clean,
          history: [clean, ...state.history].slice(0, 50),
        }));
      },

      clear: () => set({ last: undefined, history: [] }),
    }),

    {
      name: "results",
      storage: createJSONStorage(() => AsyncStorage),
      version: 4,

      /** Migrate old persisted shapes → v4 normalized shape */
      migrate: (persistedState: any, oldVersion: number) => {
        console.log("🛠 Migrating results store from", oldVersion);

        if (!persistedState || typeof persistedState !== "object") {
          return { last: undefined, history: [] } as ResultsState;
        }

        // v1 / v2 / v3 → v4
        if (oldVersion < 4) {
          const rawLast = persistedState.last;
          const rawHistory = Array.isArray(persistedState.history)
            ? persistedState.history
            : [];

          const migratedLast = rawLast
            ? normalizeResult(rawLast as any)
            : undefined;

          const migratedHistory: StoredAnalysisResult[] = rawHistory.map(
            (entry: any) => normalizeResult(entry as any)
          );

          return {
            last: migratedLast,
            history: migratedHistory,
          } as ResultsState;
        }

        // Already v4 – trust the structure
        return persistedState as ResultsState;
      },
    }
  )
);
