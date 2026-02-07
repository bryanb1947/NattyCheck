// lib/profile.ts
import { supabase } from "./supabase";

/**
 * New plan model (single source of truth):
 * - plan_normalized: "free" | "pro"
 * - plan_raw: metadata string like "free" or "appstore:<product_id>"
 *
 * IMPORTANT:
 * We DO NOT create "trial" in Supabase anymore.
 * Trials are managed by RevenueCat/App Store and synced into plan_normalized.
 */
export type DBPlanNormalized = "free" | "pro";

export type EnsureProfileResult = {
  user_id: string;
  email: string | null;
  username: string | null;
  plan_normalized: DBPlanNormalized;
  plan_raw: string | null;
};

const SELECT_FIELDS =
  "user_id, email, username, plan_normalized, plan_raw, onboarding_complete, updated_at";

export async function ensureProfile(
  userId: string,
  email: string,
  username?: string
): Promise<EnsureProfileResult> {
  // 1) Check if profile exists
  const { data: existing, error: selectError } = await supabase
    .from("profiles")
    .select(SELECT_FIELDS)
    .eq("user_id", userId)
    .maybeSingle();

  if (selectError) {
    console.error("Profile SELECT error:", selectError);
    // don't hard-fail; attempt insert below if it's a "row missing" scenario
  }

  if (existing) {
    return {
      user_id: existing.user_id,
      email: existing.email ?? null,
      username: existing.username ?? null,
      plan_normalized:
        String(existing.plan_normalized).toLowerCase() === "pro" ? "pro" : "free",
      plan_raw: existing.plan_raw ?? null,
    };
  }

  // 2) Create new profile (first-time login)
  const insertPayload = {
    user_id: userId,
    email,
    username: username ?? "User",
    plan_normalized: "free" as DBPlanNormalized,
    plan_raw: "free",
  };

  const { data, error } = await supabase
    .from("profiles")
    .insert(insertPayload)
    .select(SELECT_FIELDS)
    .single();

  if (error || !data) {
    console.error("Profile creation failed:", error);
    throw error ?? new Error("Profile creation failed (no data returned).");
  }

  return {
    user_id: data.user_id,
    email: data.email ?? null,
    username: data.username ?? null,
    plan_normalized:
      String(data.plan_normalized).toLowerCase() === "pro" ? "pro" : "free",
    plan_raw: data.plan_raw ?? null,
  };
}
