import { create } from "zustand";

type UserPlan = "free" | "pro";

interface UserState {
  user: {
    userId: string | null;
    email: string | null;
    plan: UserPlan;
  } | null;
  setUser: (payload: { userId: string; email: string; plan: UserPlan }) => void;
  clearUser: () => void;
}

export const useUserStore = create<UserState>((set) => ({
  user: null,

  setUser: (payload) =>
    set({
      user: {
        userId: payload.userId,
        email: payload.email,
        plan: payload.plan,
      },
    }),

  clearUser: () => set({ user: null }),
}));
