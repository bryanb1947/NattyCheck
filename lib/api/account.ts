// lib/api/account.ts
// ------------------------------------------------------
// Frontend API helpers for account actions (authenticated)
// - Delete all cloud data
// - Delete entire account (auth + all data)
// ------------------------------------------------------
//
// IMPORTANT:
// These endpoints must be called with Supabase JWT (access_token),
// NOT a userId. We use authedDelete() which injects the JWT.
//
// Also supports primary → fallback retry on 404 to survive
// Railway "double prefix" deploys (rare but we've seen it).
// ------------------------------------------------------

import { authedDelete } from "@/lib/api";

type AccountDeleteResponse = {
  message?: string;
  wipe_errors?: any[];
  detail?: string; // FastAPI errors
  error?: string;
  [k: string]: any;
};

function pickMessage(obj: any, fallback: string) {
  return (
    obj?.message ||
    obj?.detail ||
    obj?.error ||
    fallback
  );
}

// ------------------------------------------------------
// DELETE: /account/delete-data
// ------------------------------------------------------
export async function deleteAllData() {
  try {
    const res = await authedDelete({
      primary: "/account/delete-data",
      fallback: "/account/account/delete-data",
    });

    const data = (res.data || {}) as AccountDeleteResponse;

    if (!res.ok) {
      return {
        success: false,
        message: pickMessage(data, "Failed to delete user data."),
      };
    }

    return {
      success: true,
      message: pickMessage(data, "Deleted user data."),
      wipe_errors: Array.isArray(data.wipe_errors) ? data.wipe_errors : [],
    };
  } catch (err: any) {
    console.log("❌ deleteAllData error:", err?.message || err);
    return {
      success: false,
      message: "Network error while deleting data.",
    };
  }
}

// ------------------------------------------------------
// DELETE: /account/delete
// ------------------------------------------------------
export async function deleteAccount() {
  try {
    const res = await authedDelete({
      primary: "/account/delete",
      fallback: "/account/account/delete",
    });

    const data = (res.data || {}) as AccountDeleteResponse;

    if (!res.ok) {
      return {
        success: false,
        message: pickMessage(data, "Failed to delete account."),
      };
    }

    return {
      success: true,
      message: pickMessage(data, "Deleted account."),
      wipe_errors: Array.isArray(data.wipe_errors) ? data.wipe_errors : [],
    };
  } catch (err: any) {
    console.log("❌ deleteAccount error:", err?.message || err);
    return {
      success: false,
      message: "Network error while deleting account.",
    };
  }
}
