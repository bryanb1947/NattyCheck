// store/useCaptureStore.ts
import { create } from "zustand";

export type AngleKey = "front" | "side" | "back";

export type AngleData = {
  // Local (for instant preview + sending to your API)
  uri?: string;
  base64?: string;

  // Cloud (for persistence across reinstall/devices)
  photoId?: string; // public.user_photos.id
  storagePath?: string; // storage path in bucket (e.g. `${userId}/file.jpg`)
};

type CaptureState = {
  front: AngleData;
  side: AngleData;
  back: AngleData;

  // Backward-compatible setter (keep for existing call sites)
  set: (k: AngleKey, data: Partial<AngleData>) => void;

  // Preferred explicit setter (optional to use)
  setAngle: (k: AngleKey, data: Partial<AngleData>) => void;

  // Clears everything
  clearAll: () => void;

  // Clears one angle (useful on retake)
  resetAngle: (k: AngleKey) => void;

  // Existing behavior
  allSelected: () => boolean;

  // Cloud helpers
  hasAllPhotoIds: () => boolean;
  hasAllStoragePaths: () => boolean;

  // Getter
  getAngle: (k: AngleKey) => AngleData;
};

const emptyAngles: Pick<CaptureState, "front" | "side" | "back"> = {
  front: {},
  side: {},
  back: {},
};

function mergeAngle(prev: AngleData, next: Partial<AngleData>): AngleData {
  return {
    uri: next.uri ?? prev.uri,
    base64: next.base64 ?? prev.base64,
    photoId: next.photoId ?? prev.photoId,
    storagePath: next.storagePath ?? prev.storagePath,
  };
}

export const useCaptureStore = create<CaptureState>((set, get) => ({
  ...emptyAngles,

  set: (k, data) =>
    set((state) => ({
      ...state,
      [k]: mergeAngle(state[k], data),
    })),

  setAngle: (k, data) =>
    set((state) => ({
      ...state,
      [k]: mergeAngle(state[k], data),
    })),

  resetAngle: (k) =>
    set((state) => ({
      ...state,
      [k]: {},
    })),

  clearAll: () => set({ ...emptyAngles }),

  allSelected: () => {
    const s = get();
    return Boolean(s.front.uri && s.side.uri && s.back.uri);
  },

  hasAllPhotoIds: () => {
    const s = get();
    return Boolean(s.front.photoId && s.side.photoId && s.back.photoId);
  },

  hasAllStoragePaths: () => {
    const s = get();
    return Boolean(s.front.storagePath && s.side.storagePath && s.back.storagePath);
  },

  getAngle: (k) => get()[k],
}));