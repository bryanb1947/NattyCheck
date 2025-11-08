import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";

type AuthState = {
  userId?: string;
  email?: string;
  plan?: "free" | "pro";
  setUser: (u: { userId: string; email?: string; plan?: AuthState["plan"] }) => void;
  logout: () => void;
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      userId: undefined,
      email: undefined,
      plan: "free",
      setUser: (u) => set(u),
      logout: () => set({ userId: undefined, email: undefined, plan: "free" }),
    }),
    { name: "auth", storage: createJSONStorage(() => AsyncStorage) }
  )
);
