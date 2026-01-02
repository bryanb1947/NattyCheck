// lib/profile.ts (or wherever ensureProfile lives)
import { supabase } from "./supabase";

export type DBPlan = "free" | "trial" | "pro";

// Ensure a profile row exists when a user logs in or signs up
export async function ensureProfile(userId: string, email: string, username?: string) {
  // 1) Check if profile exists
  const { data: existing, error: selectError } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (selectError) {
    console.error("Profile SELECT error:", selectError);
  }

  if (existing) return existing;

  // 2) Create a new profile (first-time login)
  const insertPayload = {
    user_id: userId,
    email,
    username: username ?? "User",
    full_name: null,
    avatar_url: null,

    // ✅ Default should be TRIAL (since you want trial on first login)
    plan: "trial" as DBPlan,

    // Keep these if your schema expects them
    is_premium: false,
    premium_until: null,
    trial_active: true,
  };

  const { data, error } = await supabase
    .from("profiles")
    .insert(insertPayload)
    .select("*")
    .single();

  if (error) console.error("Profile creation failed:", error);

  return data;
}
