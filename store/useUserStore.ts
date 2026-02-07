// store/useUserStore.ts
import { create } from "zustand";

export type PlanNormalized = "free" | "pro";

export type UserPayload = {
  userId: string | null;
  email: string | null;

  // ✅ canonical, matches Supabase columns
  plan_normalized?: PlanNormalized | null;
  plan_raw?: string | null;

  // ⚠️ legacy support (some old code may still call setUser({ plan: "pro" }))
  plan?: PlanNormalized | null;
};

type UserState = {
  user: {
    userId: string | null;
    email: string | null;
    plan_normalized: PlanNormalized;
    plan_raw: string; // "free" or "appstore:<product_id>"
  } | null;

  setUser: (payload: UserPayload) => void;
  clearUser: () => void;

  // Convenience (optional but nice)
  isPro: () => boolean;
};

function normalizePlanNormalized(v: any): PlanNormalized {
  const s = String(v ?? "").trim().toLowerCase();
  return s === "pro" ? "pro" : "free";
}

function normalizePlanRaw(v: any): string {
  const s = String(v ?? "").trim();
  return s.length ? s : "free";
}

export const useUserStore = create<UserState>((set, get) => ({
  user: null,

  setUser: (payload) => {
    const planNormalized = normalizePlanNormalized(
      payload.plan_normalized ?? payload.plan ?? "free"
    );

    const planRaw = normalizePlanRaw(payload.plan_raw ?? "free");

    set({
      user: {
        userId: payload.userId ?? null,
        email: payload.email ?? null,
        plan_normalized: planNormalized,
        plan_raw: planRaw,
      },
    });
  },

  clearUser: () => set({ user: null }),

  isPro: () => {
    const u = get().user;
    return u?.plan_normalized === "pro";
  },
}));
