// store/useAuthStore.ts
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "@/lib/supabase";

/* ---------------------------------------------
   TYPES
--------------------------------------------- */
export type PlanType = "free" | "pro";

type SetUserInput =
  | {
      id: string;
      email?: string | null;
    }
  | null;

type AuthState = {
  // Supabase session user
  userId: string | null;
  email: string | null;

  // Gate fields (DB is source of truth)
  plan: PlanType;
  onboardingComplete: boolean;

  // UX flags
  didPromptSaveProgress: boolean;

  // Boot flags
  hasHydrated: boolean;
  hasBootstrappedSession: boolean;

  // Cold-start behavior flags (used by app/_layout.tsx)
  suppressGuestRestore: boolean;

  // Actions
  setHydrated: () => void;
  setSuppressGuestRestore: (v: boolean) => void;

  setIdentity: (args: { userId: string; email?: string | null }) => void;
  setUser: (user: SetUserInput) => void;

  setPlan: (plan: PlanType) => void;
  setOnboardingComplete: (v: boolean) => void;

  setDidPromptSaveProgress: (v: boolean) => void;

  // Boot
  bootstrapAuth: () => Promise<void>; // restore only (NO anon)
  ensureGuestSession: () => Promise<void>; // explicit anon creation when user hits "Get Started"
  startAuthListener: () => void;
  stopAuthListener: () => void;

  // Logout
  logoutToLanding: () => Promise<void>; // signOut -> go back to landing state (no anon auto-create)
  hardReset: () => Promise<void>; // wipe persisted auth
};

let authUnsub: (() => void) | null = null;

let ensureSessionInFlight: Promise<{
  userId: string | null;
  email: string | null;
  source: "existing" | "anon" | "none";
}> | null = null;

/* ---------------------------------------------
   HELPERS
--------------------------------------------- */
function sanitizePlan(v: any): PlanType {
  const s = String(v ?? "").trim().toLowerCase();
  return s === "pro" ? "pro" : "free";
}

function normalizeProfileToProOrFree(profile: any): PlanType {
  const norm = String(profile?.plan_normalized ?? "").trim().toLowerCase();
  if (
    norm === "pro" ||
    norm === "premium" ||
    norm === "paid" ||
    norm === "plus"
  )
    return "pro";

  const raw = String(profile?.plan_raw ?? "").trim().toLowerCase();
  if (raw.includes("appstore:") || raw.includes("revenuecat:")) return "pro";

  return "free";
}

function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  let t: any;
  const timeout = new Promise<T>((_resolve, reject) => {
    t = setTimeout(() => reject(new Error(`timeout:${label}`)), ms);
  });

  return Promise.race([p, timeout]).finally(() => clearTimeout(t));
}

/**
 * Restore session if exists.
 * If allowAnonymous=true and none exists => create anon.
 *
 * IMPORTANT: allowAnonymous defaults to FALSE now.
 */
async function ensureSupabaseSession(opts?: { allowAnonymous?: boolean }) {
  if (ensureSessionInFlight) return ensureSessionInFlight;

  const allowAnonymous = opts?.allowAnonymous === true;

  ensureSessionInFlight = (async () => {
    // 1) restore existing
    try {
      const { data, error } = await withTimeout(
        supabase.auth.getSession(),
        4000,
        "getSession"
      );
      if (error) console.log("🟦 Supabase getSession error:", error.message);

      const session = data?.session ?? null;
      if (session?.user?.id) {
        return {
          userId: session.user.id,
          email: session.user.email ?? null,
          source: "existing" as const,
        };
      }
    } catch (e: any) {
      console.log("🟦 getSession crash:", e?.message ?? e);
    }

    // 2) optionally create anon
    if (!allowAnonymous) {
      return { userId: null, email: null, source: "none" as const };
    }

    try {
      const { data, error } = await withTimeout(
        supabase.auth.signInAnonymously(),
        6000,
        "signInAnonymously"
      );
      if (error) {
        console.log("🟦 signInAnonymously error:", error.message);
        return { userId: null, email: null, source: "none" as const };
      }

      const u = data?.user ?? null;
      if (u?.id) {
        console.log("🟩 Anonymous session created:", { uid: u.id });
        return {
          userId: u.id,
          email: u.email ?? null,
          source: "anon" as const,
        };
      }
    } catch (e: any) {
      console.log("🟦 signInAnonymously crash:", e?.message ?? e);
    }

    return { userId: null, email: null, source: "none" as const };
  })();

  try {
    return await ensureSessionInFlight;
  } finally {
    ensureSessionInFlight = null;
  }
}

/**
 * Ensure profiles row exists WITHOUT overwriting plan fields.
 * - If row missing => insert with free defaults
 * - If row exists => optionally update email (only if different)
 *
 * CRITICAL: do NOT write plan_normalized/plan_raw on existing rows.
 */
async function ensureProfileRow(userId: string, email: string | null) {
  try {
    const { data: existing, error: selErr } = await withTimeout(
      supabase
        .from("profiles")
        .select("user_id, email")
        .eq("user_id", userId)
        .maybeSingle(),
      5000,
      "profiles.select"
    );

    if (selErr) {
      console.log("🟨 profiles select error (non-fatal):", selErr.message);
      return;
    }

    if (!existing?.user_id) {
      const { error: insErr } = await withTimeout(
        supabase.from("profiles").insert({
          user_id: userId,
          email: email ?? null,
          plan_normalized: "free",
          plan_raw: "free",
        }),
        5000,
        "profiles.insert"
      );

      if (insErr)
        console.log("🟨 profiles insert error (non-fatal):", insErr.message);
      else console.log("✅ profiles row created for user:", userId);
      return;
    }

    // If row exists, update email only when needed.
    const existingEmail = (existing?.email ?? null) as string | null;
    const incomingEmail = email ?? null;

    if (incomingEmail && incomingEmail !== existingEmail) {
      const { error: upErr } = await withTimeout(
        supabase
          .from("profiles")
          .update({ email: incomingEmail })
          .eq("user_id", userId),
        5000,
        "profiles.updateEmail"
      );

      if (upErr)
        console.log("🟨 profiles email update error (non-fatal):", upErr.message);
      else console.log("✅ profiles email updated:", userId);
    }
  } catch (e: any) {
    console.log("🟨 ensureProfileRow crash (non-fatal):", e?.message ?? e);
  }
}

/**
 * Pull gate fields from DB
 */
async function fetchProfileGate(userId: string): Promise<{
  plan: PlanType;
  onboardingComplete: boolean;
  email: string | null;
}> {
  try {
    const { data: profile, error } = await withTimeout(
      supabase
        .from("profiles")
        .select("email, plan_normalized, plan_raw, onboarding_complete")
        .eq("user_id", userId)
        .maybeSingle(),
      5000,
      "profiles.fetchGate"
    );

    if (error) {
      console.log("🟨 profiles fetch error (non-fatal):", error.message);
      return { plan: "free", onboardingComplete: false, email: null };
    }

    return {
      plan: normalizeProfileToProOrFree(profile),
      onboardingComplete: !!profile?.onboarding_complete,
      email: (profile?.email ?? null) as string | null,
    };
  } catch (e: any) {
    console.log("🟨 fetchProfileGate crash (non-fatal):", e?.message ?? e);
    return { plan: "free", onboardingComplete: false, email: null };
  }
}

/* ---------------------------------------------
   STORE
--------------------------------------------- */
export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      userId: null,
      email: null,

      plan: "free",
      onboardingComplete: false,

      didPromptSaveProgress: false,

      hasHydrated: false,
      hasBootstrappedSession: false,

      suppressGuestRestore: false,

      setHydrated: () => set({ hasHydrated: true }),
      setSuppressGuestRestore: (v) => set({ suppressGuestRestore: !!v }),

      setIdentity: ({ userId, email }) =>
        set((state) => ({ userId, email: email ?? state.email })),

      setUser: (user) => {
        if (!user) {
          set({
            userId: null,
            email: null,
            plan: "free",
            onboardingComplete: false,
          });
          return;
        }

        set((state) => ({
          userId: user.id,
          email: user.email ?? state.email,
        }));
      },

      setPlan: (plan) => set({ plan: sanitizePlan(plan) }),
      setOnboardingComplete: (v) => set({ onboardingComplete: !!v }),

      setDidPromptSaveProgress: (v) =>
        set({ didPromptSaveProgress: !!v }),

      /**
       * Restore-only bootstrap (NO anon creation)
       * Must never hang; all remote calls are timeout-wrapped.
       */
      bootstrapAuth: async () => {
        try {
          const { userId, email, source } = await ensureSupabaseSession({
            allowAnonymous: false,
          });

          if (!userId) {
            console.log("🟦 No Supabase session found (restore-only).");
            set({
              userId: null,
              email: null,
              plan: "free",
              onboardingComplete: false,
              hasBootstrappedSession: true,
            });
            return;
          }

          console.log("🟩 Supabase session restored:", {
            uid: userId,
            em: email ?? "",
            source,
          });

          // Set identity immediately so UI can proceed even if DB is slow
          set((state) => ({
            userId,
            email: email ?? state.email,
            hasBootstrappedSession: true,
          }));

          // Best-effort DB sync + gate fetch
          await ensureProfileRow(userId, email ?? null);

          const gate = await fetchProfileGate(userId);
          set((state) => ({
            userId,
            email: email ?? gate.email ?? state.email,
            plan: gate.plan,
            onboardingComplete: gate.onboardingComplete,
            hasBootstrappedSession: true,
          }));
        } catch (e: any) {
          console.log("🟦 bootstrapAuth crash:", e?.message ?? e);
          set({
            userId: null,
            email: null,
            plan: "free",
            onboardingComplete: false,
            hasBootstrappedSession: true,
          });
        }
      },

      /**
       * Explicit anon creation (call ONLY when user hits Get Started / first scan)
       */
      ensureGuestSession: async () => {
        try {
          // If already have a session, do nothing
          const existing = await ensureSupabaseSession({
            allowAnonymous: false,
          });
          if (existing.userId) {
            console.log("🟦 GuestSession skipped: session already exists.");
            return;
          }

          const created = await ensureSupabaseSession({
            allowAnonymous: true,
          });
          if (!created.userId) {
            console.log("🟦 GuestSession failed: no user created.");
            return;
          }

          // Set identity immediately
          set({
            userId: created.userId,
            email: created.email ?? null,
            hasBootstrappedSession: true,
          });

          await ensureProfileRow(created.userId, created.email ?? null);

          const gate = await fetchProfileGate(created.userId);

          set((state) => ({
            userId: created.userId,
            email: created.email ?? gate.email ?? state.email,
            plan: gate.plan,
            onboardingComplete: gate.onboardingComplete,
            hasBootstrappedSession: true,
          }));
        } catch (e: any) {
          console.log("🟦 ensureGuestSession crash:", e?.message ?? e);
        }
      },

      startAuthListener: () => {
        if (authUnsub) return;

        const { data } = supabase.auth.onAuthStateChange(
          async (_event, session) => {
            const user = session?.user ?? null;

            if (!user?.id) {
              console.log("🟦 Auth change: signed out");

              // IMPORTANT: do NOT auto-create anon here.
              set({
                userId: null,
                email: null,
                plan: "free",
                onboardingComplete: false,
                hasBootstrappedSession: true,
              });
              return;
            }

            console.log("🟩 Auth change: signed in", {
              email: user.email ?? "",
              uid: user.id,
            });

            // Set identity immediately so app doesn't hang if DB is slow
            set((state) => ({
              userId: user.id,
              email: (user.email ?? state.email ?? null) as any,
              hasBootstrappedSession: true,
            }));

            // Best-effort profile ensure + gate fetch (non-blocking to UI)
            try {
              await ensureProfileRow(user.id, user.email ?? null);
              const gate = await fetchProfileGate(user.id);

              set((state) => ({
                userId: user.id,
                email: (user.email ?? gate.email ?? state.email ?? null) as any,
                plan: gate.plan,
                onboardingComplete: gate.onboardingComplete,
                hasBootstrappedSession: true,
              }));
            } catch (e: any) {
              console.log("🟨 Auth listener gate fetch failed (non-fatal):", e?.message ?? e);
            }
          }
        );

        authUnsub = () => data.subscription.unsubscribe();
      },

      stopAuthListener: () => {
        if (authUnsub) {
          authUnsub();
          authUnsub = null;
        }
      },

      /**
       * Sign out and return to landing (no anon auto-create)
       */
      logoutToLanding: async () => {
        try {
          await withTimeout(supabase.auth.signOut(), 4000, "signOut");
        } catch {}

        set({
          userId: null,
          email: null,
          plan: "free",
          onboardingComplete: false,
          hasBootstrappedSession: true,
        });
      },

      /**
       * Hard reset: wipe persisted auth store
       */
      hardReset: async () => {
        try {
          await withTimeout(supabase.auth.signOut(), 4000, "signOut");
        } catch {}

        try {
          await AsyncStorage.removeItem("auth");
        } catch {}

        set({
          userId: null,
          email: null,
          plan: "free",
          onboardingComplete: false,
          didPromptSaveProgress: false,
          hasHydrated: true,
          hasBootstrappedSession: true,
          suppressGuestRestore: false,
        });
      },
    }),
    {
      name: "auth",
      version: 102, // bump because we added suppressGuestRestore + behavior changes
      storage: createJSONStorage(() => AsyncStorage),

      // Persist only stable UI/state (NOT identity)
      partialize: (state) => ({
        plan: state.plan,
        onboardingComplete: state.onboardingComplete,
        didPromptSaveProgress: state.didPromptSaveProgress,
      }),

      migrate: (persistedState: any) => ({
        userId: null,
        email: null,
        plan: sanitizePlan(persistedState?.plan),
        onboardingComplete: !!persistedState?.onboardingComplete,
        didPromptSaveProgress: !!persistedState?.didPromptSaveProgress,
        hasHydrated: false,
        hasBootstrappedSession: false,
        suppressGuestRestore: false,
      }),

      onRehydrateStorage: () => (state) => {
        // Mark hydrated as soon as Zustand rehydrates persisted state.
        state?.setHydrated?.();

        // Extra safety: if something weird happens, we still flip hydration soon.
        setTimeout(() => {
          const s = useAuthStore.getState();
          if (!s.hasHydrated) {
            console.log("🟧 [auth] hydration fallback — forcing hasHydrated=true");
            useAuthStore.setState({ hasHydrated: true });
          }
        }, 750);
      },
    }
  )
);