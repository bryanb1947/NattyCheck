import { create } from "zustand";

export type AngleKey = "front" | "side" | "back";

type AngleData = {
  uri?: string;      // MUST store
  base64?: string;   // MUST store
};

type CaptureState = {
  front: AngleData;
  side: AngleData;
  back: AngleData;

  set: (k: AngleKey, data: AngleData) => void;
  clearAll: () => void;
  allSelected: () => boolean;
};

const empty = { front: {}, side: {}, back: {} };

export const useCaptureStore = create<CaptureState>((set, get) => ({
  ...empty,

  set: (k, data) =>
    set((state) => ({
      ...state,
      [k]: {
        uri: data.uri ?? state[k].uri,
        base64: data.base64 ?? state[k].base64,
      },
    })),

  clearAll: () => set({ ...empty }),

  allSelected: () => {
    const s = get();
    return Boolean(s.front.uri && s.side.uri && s.back.uri);
  },
}));
