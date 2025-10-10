import { create } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";

type AuthState = {
  isSignedIn: boolean;
  isPro: boolean;
  hasActiveTrial: boolean;
  freeScansLeft: number;
  hydrateDone: boolean;
  // actions
  hydrate: () => Promise<void>;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
  startTrial: () => Promise<void>;
  upgradeToPro: () => Promise<void>;
  downgradeToFree: () => Promise<void>;
  consumeFreeScan: () => Promise<boolean>;
};

const KEY = "natty.auth.v1";

export const useAuthStore = create<AuthState>((set, get) => ({
  // defaults (safe)
  isSignedIn: true,
  isPro: false,
  hasActiveTrial: false,
  freeScansLeft: 3,
  hydrateDone: false,

  async hydrate() {
    try {
      const raw = await AsyncStorage.getItem(KEY);
      if (raw) {
        const v = JSON.parse(raw);
        set({
          isSignedIn: !!v.isSignedIn,
          isPro: !!v.isPro,
          hasActiveTrial: !!v.hasActiveTrial,
          freeScansLeft: typeof v.freeScansLeft === "number" ? v.freeScansLeft : 3,
        });
      }
    } finally {
      set({ hydrateDone: true });
    }
  },

  async signIn() {
    set({ isSignedIn: true });
    const s = get();
    await AsyncStorage.setItem(KEY, JSON.stringify({
      isSignedIn: true,
      isPro: s.isPro,
      hasActiveTrial: s.hasActiveTrial,
      freeScansLeft: s.freeScansLeft,
    }));
  },

  async signOut() {
    set({ isSignedIn: false, isPro: false, hasActiveTrial: false, freeScansLeft: 3 });
    await AsyncStorage.setItem(KEY, JSON.stringify({
      isSignedIn: false, isPro: false, hasActiveTrial: false, freeScansLeft: 3
    }));
  },

  async startTrial() {
    set({ hasActiveTrial: true });
    const s = get();
    await AsyncStorage.setItem(KEY, JSON.stringify({
      isSignedIn: s.isSignedIn, isPro: s.isPro, hasActiveTrial: true, freeScansLeft: s.freeScansLeft
    }));
  },

  async upgradeToPro() {
    set({ isPro: true, hasActiveTrial: false });
    const s = get();
    await AsyncStorage.setItem(KEY, JSON.stringify({
      isSignedIn: s.isSignedIn, isPro: true, hasActiveTrial: false, freeScansLeft: s.freeScansLeft
    }));
  },

  async downgradeToFree() {
    set({ isPro: false });
    const s = get();
    await AsyncStorage.setItem(KEY, JSON.stringify({
      isSignedIn: s.isSignedIn, isPro: false, hasActiveTrial: s.hasActiveTrial, freeScansLeft: s.freeScansLeft
    }));
  },

  async consumeFreeScan() {
    const { isPro, hasActiveTrial, freeScansLeft } = get();
    if (isPro || hasActiveTrial) return true;
    if (freeScansLeft > 0) {
      const next = freeScansLeft - 1;
      set({ freeScansLeft: next });
      const s = get();
      await AsyncStorage.setItem(KEY, JSON.stringify({
        isSignedIn: s.isSignedIn, isPro: s.isPro, hasActiveTrial: s.hasActiveTrial, freeScansLeft: next
      }));
      return true;
    }
    return false;
  },
}));

// kick off hydration
useAuthStore.getState().hydrate();
