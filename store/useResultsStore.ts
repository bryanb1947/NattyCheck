import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { AnalysisResult } from "../lib/api";

type ResultsState = {
  last?: AnalysisResult;
  history: AnalysisResult[];
  setLast: (r: AnalysisResult) => void;
  clear: () => void;
};

export const useResultsStore = create<ResultsState>()(
  persist(
    (set, get) => ({
      last: undefined,
      history: [],
      setLast: (r) =>
        set({
          last: r,
          history: [r, ...get().history].slice(0, 50),
        }),
      clear: () => set({ last: undefined, history: [] }),
    }),
    { name: "results", storage: createJSONStorage(() => AsyncStorage) }
  )
);
