// store/useAuthStore.ts
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";

/* ---------------------------------------------
   TYPES
--------------------------------------------- */
export type PlanType = "free" | "trial" | "pro";

type AuthState = {
  userId?: string;
  email?: string;

  // CACHE ONLY — DB is source of truth
  plan: PlanType;

  hasHydrated: boolean;

  setIdentity: (args: { userId: string; email?: string }) => void;
  setPlan: (plan: PlanType) => void;
  logout: () => void;

  setHydrated: () => void;
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      userId: undefined,
      email: undefined,
      plan: "free",
      hasHydrated: false,

      setHydrated: () => set({ hasHydrated: true }),

      setIdentity: ({ userId, email }) =>
        set((state) => ({
          userId,
          email: email ?? state.email,
        })),

      setPlan: (plan) => set({ plan }),

      logout: () =>
        set({
          userId: undefined,
          email: undefined,
          plan: "free",
        }),
    }),
    {
      name: "auth",
      version: 3,
      storage: createJSONStorage(() => AsyncStorage),

      migrate: (persistedState: any) => {
        if (!persistedState || typeof persistedState !== "object") {
          return {
            userId: undefined,
            email: undefined,
            plan: "free",
            hasHydrated: false,
          };
        }

        const raw = persistedState.plan;

        const normalizedPlan: PlanType =
          raw === "pro" ? "pro" : raw === "trial" ? "trial" : "free";

        return {
          userId: persistedState.userId,
          email: persistedState.email,
          plan: normalizedPlan,
          hasHydrated: false,
        };
      },

      onRehydrateStorage: () => (state) => {
        state?.setHydrated();
      },
    }
  )
);
