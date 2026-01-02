// libapi.ts
// Centralized API wrapper for authenticated backend routes

import { supabase } from "@/lib/supabase";

// ------------------------------
// Backend Base URL
// ------------------------------
const BACKEND_URL =
  "https://nattycheck-backend-production.up.railway.app";

// ------------------------------
// Get Supabase JWT for backend auth
// ------------------------------
async function getJWT() {
  const { data } = await supabase.auth.getSession();
  return data?.session?.access_token ?? null;
}

// ------------------------------------------------------
// DELETE (authenticated)
// - Used for: Delete Account, Delete All Data
// ------------------------------------------------------
export async function authedDelete(path: string) {
  try {
    const token = await getJWT();
    if (!token) throw new Error("Not authenticated.");

    const res = await fetch(`${BACKEND_URL}${path}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    const json = await res.json();
    return { ok: res.ok, ...json };
  } catch (err: any) {
    console.log("❌ authedDelete error:", err.message);
    return { ok: false, error: err.message };
  }
}

// ------------------------------------------------------
// POST (authenticated)
// - Can be used later for things like preferences sync
// ------------------------------------------------------
export async function authedPost(path: string, body: any = {}) {
  try {
    const token = await getJWT();
    if (!token) throw new Error("Not authenticated.");

    const res = await fetch(`${BACKEND_URL}${path}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const json = await res.json();
    return { ok: res.ok, ...json };
  } catch (err: any) {
    console.log("❌ authedPost error:", err.message);
    return { ok: false, error: err.message };
  }
}
