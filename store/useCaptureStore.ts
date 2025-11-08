import { create } from "zustand";

export type AngleKey = "front" | "side" | "back" | "legs";

type CaptureState = {
  front?: string; // file:// uri
  side?: string;
  back?: string;
  legs?: string;
  set: (k: AngleKey, uri?: string) => void;
  clearAll: () => void;
  allSelected: () => boolean;
};

export const useCaptureStore = create<CaptureState>((set, get) => ({
  front: undefined,
  side: undefined,
  back: undefined,
  legs: undefined,
  set: (k, uri) => set({ [k]: uri } as any),
  clearAll: () => set({ front: undefined, side: undefined, back: undefined, legs: undefined }),
  allSelected: () => {
    const s = get();
    return !!(s.front && s.side && s.back && s.legs);
  },
}));
