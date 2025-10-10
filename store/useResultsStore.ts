import { create } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";

export type MetricRow = {
  title: string;
  sub: string;
  percent: number; // 0–100
  tag?: { label: "balanced" | "strong" | "lagging"; bg?: string };
  color?: string;    // bar color hex
};

export type ResultsPayload = {
  completedAt: number;  // epoch ms
  score: number;        // 0–100
  upper: MetricRow[];
  lower: MetricRow[];
  posture: {
    label: "Excellent" | "Good" | "Fair" | "Poor";
    spinalAlignment: string;
    scapularBalance: string;
  };
  nattyStatus: "NATURAL" | "ENHANCED" | "UNKNOWN";
  notes?: string;
  // Optional progress metric we can chart (e.g., shoulder/waist ratio)
  shoulderToWaist?: number; // e.g., 1.38
};

type ResultsState = {
  last?: ResultsPayload;
  history: ResultsPayload[];

  hydrateDone: boolean;
  hydrate: () => Promise<void>;

  set: (r: ResultsPayload) => void;
  clear: () => void;
  addToHistory: (r: ResultsPayload) => Promise<void>;
};

const KEY = "natty.results.v1";

export const useResultsStore = create<ResultsState>((set, get) => ({
  last: undefined,
  history: [],
  hydrateDone: false,

  async hydrate() {
    try {
      const raw = await AsyncStorage.getItem(KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        set({
          last: parsed.last,
          history: Array.isArray(parsed.history) ? parsed.history : [],
        });
      }
    } finally {
      set({ hydrateDone: true });
    }
  },

  set(r) {
    set({ last: r });
    const s = get();
    AsyncStorage.setItem(KEY, JSON.stringify({ last: r, history: s.history })).catch(() => {});
  },

  clear() {
    set({ last: undefined, history: [] });
    AsyncStorage.setItem(KEY, JSON.stringify({ last: undefined, history: [] })).catch(() => {});
  },

  async addToHistory(r) {
    const next = [r, ...get().history].slice(0, 50); // keep recent 50
    set({ last: r, history: next });
    await AsyncStorage.setItem(KEY, JSON.stringify({ last: r, history: next }));
  },
}));

// auto-hydrate once
useResultsStore.getState().hydrate();
