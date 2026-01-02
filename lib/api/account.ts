// lib/api/account.ts
// ------------------------------------------------------
// Frontend API helpers for:
// - Delete all cloud data
// - Delete entire account (auth + all data)
// ------------------------------------------------------

// ------------------------------------------------------
// FIXED: Correct backend prefix is /account
// ------------------------------------------------------
const RAW_BASE =
  process.env.EXPO_PUBLIC_API_URL ??
  "https://nattycheck-backend-production.up.railway.app";

const API_BASE = RAW_BASE.replace(/\/$/, "") + "/account";

// ------------------------------------------------------
// DELETE: /account/delete-data
// ------------------------------------------------------
export async function deleteAllData(userId: string) {
  try {
    const res = await fetch(`${API_BASE}/delete-data`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${userId}`,
      },
    });

    const json = await res.json().catch(() => null);

    if (!res.ok) {
      return {
        success: false,
        message: json?.detail || "Failed to delete user data.",
      };
    }

    return {
      success: true,
      message: json?.message,
      wipe_errors: json?.wipe_errors || [],
    };
  } catch (err) {
    console.log("❌ deleteAllData error:", err);
    return {
      success: false,
      message: "Network error while deleting data.",
    };
  }
}

// ------------------------------------------------------
// DELETE: /account/delete
// ------------------------------------------------------
export async function deleteAccount(userId: string) {
  try {
    const res = await fetch(`${API_BASE}/delete`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${userId}`,
      },
    });

    const json = await res.json().catch(() => null);

    if (!res.ok) {
      return {
        success: false,
        message: json?.detail || "Failed to delete account.",
      };
    }

    return {
      success: true,
      message: json?.message,
      wipe_errors: json?.wipe_errors || [],
    };
  } catch (err) {
    console.log("❌ deleteAccount error:", err);
    return {
      success: false,
      message: "Network error while deleting account.",
    };
  }
}
