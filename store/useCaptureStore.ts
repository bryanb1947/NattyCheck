import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";

type CaptureState = {
  frontUri: string | null;
  sideUri: string | null;
  backUri: string | null;
  setFront: (uri: string) => void;
  setSide: (uri: string) => void;
  setBack: (uri: string) => void;
  clear: () => void;
};

export const useCaptureStore = create<CaptureState>()(
  persist(
    (set) => ({
      frontUri: null,
      sideUri: null,
      backUri: null,
      setFront: (uri) => set({ frontUri: uri }),
      setSide: (uri) => set({ sideUri: uri }),
      setBack: (uri) => set({ backUri: uri }),
      clear: () => set({ frontUri: null, sideUri: null, backUri: null }),
    }),
    {
      name: "nattycheck-captures",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({ frontUri: s.frontUri, sideUri: s.sideUri, backUri: s.backUri }),
    }
  )
);
