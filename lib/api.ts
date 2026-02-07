// lib/api.ts
// Centralized API wrapper for authenticated backend routes
// ✅ Adds Supabase JWT automatically
// ✅ Creates/Restores anonymous session for onboarding flows (unless explicitly logged out)
// ✅ Safe JSON parsing (handles HTML/text error bodies)
// ✅ AbortController timeout support
// ✅ Normalized error shape for UI
// ✅ No expensive retries (only one auth-retry on 401)

import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/store/useAuthStore";

// ------------------------------------
// Backend Base URL (single source of truth)
// ------------------------------------
export const BACKEND_BASE =
  process.env.EXPO_PUBLIC_API_BASE?.replace(/\/+$/, "") ||
  "https://nattycheck-backend-production.up.railway.app";

type RouteSpec =
  | string
  | {
      primary: string;
      fallback?: string;
    };

export type ApiResult<T = any> = {
  ok: boolean;
  status: number; // 0 = network/unknown
  endpointUsed: string; // which path was hit (primary/fallback)
  data: T | null; // parsed JSON when possible
  raw: string; // raw text body
  errorMessage?: string; // normalized for UI
};

// ------------------------------------
// Helpers
// ------------------------------------
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function resolveRoute(route: RouteSpec): { primary: string; fallback?: string } {
  if (typeof route === "string") return { primary: route };
  return { primary: route.primary, fallback: route.fallback };
}

function toUrl(path: string) {
  let p = path || "";
  if (!p.startsWith("/")) p = `/${p}`;
  return `${BACKEND_BASE}${p}`;
}

async function parseResponse(res: Response): Promise<{ json: any | null; raw: string }> {
  const raw = await res.text();
  if (!raw) return { json: null, raw: "" };

  try {
    return { json: JSON.parse(raw), raw };
  } catch {
    return { json: null, raw };
  }
}

function normalizeErrorMessage(status: number, data: any | null, raw: string): string {
  const detail =
    (data && (data.detail || data.message || data.error)) ||
    (typeof raw === "string" && raw.trim().length ? raw.trim() : "");

  // IMPORTANT: for anon onboarding, "log in again" is misleading.
  if (status === 401) return "Authentication failed. Please retry.";
  if (status === 403) return "You don’t have access to this action.";
  if (status === 404) return "Endpoint not found (check backend routing).";
  if (status === 413) return "Image too large. Retake with full body in frame and try again.";
  if (status === 429) return "Too many requests. Please wait a moment and try again.";
  if (status >= 500) return "Server error. Try again in a moment.";

  if (detail) {
    const d = String(detail);
    if (d.startsWith("<!DOCTYPE") || d.startsWith("<html")) {
      return "Unexpected server response. Try again in a moment.";
    }
    return d.slice(0, 280);
  }

  return "Request failed. Please try again.";
}

/**
 * Returns whether we're allowed to restore/create anonymous sessions.
 * If the user explicitly logged out, your store sets suppressGuestRestore=true
 * and we must NOT recreate a guest session.
 */
function canRestoreGuest(): boolean {
  try {
    return !useAuthStore.getState().suppressGuestRestore;
  } catch {
    // If store isn't ready, default to allowing (better UX than breaking onboarding)
    return true;
  }
}

/**
 * Ensure we have *some* Supabase session.
 * - If none exists and allowed => create anonymous session (guest)
 * - If creation fails => still return null
 */
async function ensureSessionAllowAnon(): Promise<void> {
  if (!canRestoreGuest()) return;

  try {
    const { data } = await supabase.auth.getSession();
    if (data?.session?.access_token) return;

    // create anon
    const { error } = await supabase.auth.signInAnonymously();
    if (error) {
      console.log("🟦 ensureSessionAllowAnon signInAnonymously error:", error.message);
    }
  } catch (e: any) {
    console.log("🟦 ensureSessionAllowAnon crash:", e?.message ?? e);
  }
}

/**
 * Get JWT robustly:
 * 1) getSession fast path
 * 2) short hydration poll
 * 3) if still missing and allowed => create anon and retry
 * 4) refreshSession once
 */
async function getJwtRobust(opts?: {
  allowAnonymous?: boolean;
}): Promise<{
  token: string | null;
  reason?: "no_session" | "no_token" | "refresh_failed";
}> {
  const allowAnonymous = opts?.allowAnonymous !== false;

  // 1) Fast path
  {
    const { data } = await supabase.auth.getSession();
    const tok = data?.session?.access_token ?? null;
    if (tok) return { token: tok };
  }

  // 2) Short poll (~2s) covers cold start hydration
  for (let i = 0; i < 5; i++) {
    await sleep(400);
    const { data } = await supabase.auth.getSession();
    const tok = data?.session?.access_token ?? null;
    if (tok) return { token: tok };
  }

  // 3) If still missing, try anon restore/create once (if allowed)
  if (allowAnonymous && canRestoreGuest()) {
    await ensureSessionAllowAnon();

    // poll again briefly
    for (let i = 0; i < 5; i++) {
      await sleep(300);
      const { data } = await supabase.auth.getSession();
      const tok = data?.session?.access_token ?? null;
      if (tok) return { token: tok };
    }
  }

  // 4) One refresh attempt
  try {
    const { data, error } = await supabase.auth.refreshSession();
    if (error) return { token: null, reason: "refresh_failed" };
    const tok = data?.session?.access_token ?? null;
    if (tok) return { token: tok };
  } catch {
    return { token: null, reason: "refresh_failed" };
  }

  return { token: null, reason: "no_token" };
}

function withTimeout(
  init: RequestInit,
  timeoutMs?: number
): { init: RequestInit; controller?: AbortController } {
  if (!timeoutMs || timeoutMs <= 0) return { init };

  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);

  const nextInit: RequestInit = init.signal ? init : { ...init, signal: controller.signal };

  (controller as any).__timeoutId = t;
  return { init: nextInit, controller };
}

function clearTimeoutIfAny(controller?: AbortController) {
  if (!controller) return;
  const t = (controller as any).__timeoutId;
  if (t) clearTimeout(t);
}

// ------------------------------------
// Core authed request
// - Only retries on 404 fallback if enabled
// - Does NOT retry on 500/429 to avoid double-charging expensive endpoints
// - ONE auth-retry on 401 (refresh/anon restore), then give up
// ------------------------------------
async function authedRequest<T>(
  route: RouteSpec,
  init: Omit<RequestInit, "headers"> & {
    headers?: Record<string, string>;
    timeoutMs?: number;
    allow404Fallback?: boolean; // default true
    allowAnonymous?: boolean; // default true
  }
): Promise<ApiResult<T>> {
  const { primary, fallback } = resolveRoute(route);
  const allow404Fallback = init.allow404Fallback !== false;
  const allowAnonymous = init.allowAnonymous !== false;

  async function doFetch(path: string, token: string): Promise<ApiResult<T>> {
    const { timeoutMs, headers, allow404Fallback: _ignore, allowAnonymous: _a, ...rest } = init;

    const { init: nextInit, controller } = withTimeout(
      {
        ...rest,
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          ...(headers || {}),
        },
      },
      timeoutMs
    );

    try {
      const res = await fetch(toUrl(path), nextInit);
      const { json, raw } = await parseResponse(res);

      const result: ApiResult<T> = {
        ok: res.ok,
        status: res.status,
        endpointUsed: path,
        data: (json as T) ?? null,
        raw,
      };

      if (!res.ok) result.errorMessage = normalizeErrorMessage(res.status, json, raw);
      return result;
    } catch (err: any) {
      const isAbort = err?.name === "AbortError";
      return {
        ok: false,
        status: 0,
        endpointUsed: path,
        data: null,
        raw: isAbort ? "Request timed out." : String(err?.message || err || "Network error"),
        errorMessage: isAbort
          ? "Request timed out. Please try again."
          : "Network error. Check your connection.",
      };
    } finally {
      clearTimeoutIfAny(controller);
    }
  }

  // 1) Get JWT (optionally create anon)
  const jwt1 = await getJwtRobust({ allowAnonymous });

  if (!jwt1.token) {
    return {
      ok: false,
      status: 401,
      endpointUsed: primary,
      data: null,
      raw: jwt1.reason ? `Not authenticated (${jwt1.reason}).` : "Not authenticated.",
      errorMessage: canRestoreGuest()
        ? "Authentication not ready yet. Please retry."
        : "Not authenticated. Please log in again.",
    };
  }

  // 2) Try primary
  const first = await doFetch(primary, jwt1.token);

  // 3) 404 fallback (only)
  if (allow404Fallback && first.status === 404 && fallback) {
    return await doFetch(fallback, jwt1.token);
  }

  // 4) ONE auth retry on 401 (session changed, token stale, signed-out mid-flight)
  if (first.status === 401) {
    try {
      // best effort: refresh, and if still missing and allowed -> anon restore
      await supabase.auth.refreshSession();
    } catch {}
    if (allowAnonymous) {
      await ensureSessionAllowAnon();
    }

    const jwt2 = await getJwtRobust({ allowAnonymous });
    if (!jwt2.token) return first;

    const retry = await doFetch(primary, jwt2.token);
    return retry;
  }

  return first;
}

// ------------------------------------------------------
// Convenience methods
// ------------------------------------------------------
export async function authedPost<T = any>(
  route: RouteSpec,
  body: any = {},
  opts?: { timeoutMs?: number; allow404Fallback?: boolean; allowAnonymous?: boolean }
): Promise<ApiResult<T>> {
  return authedRequest<T>(route, {
    method: "POST",
    body: JSON.stringify(body ?? {}),
    timeoutMs: opts?.timeoutMs,
    allow404Fallback: opts?.allow404Fallback,
    allowAnonymous: opts?.allowAnonymous,
  });
}

export async function authedDelete<T = any>(
  route: RouteSpec,
  opts?: { timeoutMs?: number; allow404Fallback?: boolean; allowAnonymous?: boolean }
): Promise<ApiResult<T>> {
  return authedRequest<T>(route, {
    method: "DELETE",
    timeoutMs: opts?.timeoutMs,
    allow404Fallback: opts?.allow404Fallback,
    allowAnonymous: opts?.allowAnonymous,
  });
}

export async function authedPatch<T = any>(
  route: RouteSpec,
  body: any = {},
  opts?: { timeoutMs?: number; allow404Fallback?: boolean; allowAnonymous?: boolean }
): Promise<ApiResult<T>> {
  return authedRequest<T>(route, {
    method: "PATCH",
    body: JSON.stringify(body ?? {}),
    timeoutMs: opts?.timeoutMs,
    allow404Fallback: opts?.allow404Fallback,
    allowAnonymous: opts?.allowAnonymous,
  });
}

export async function authedPut<T = any>(
  route: RouteSpec,
  body: any = {},
  opts?: { timeoutMs?: number; allow404Fallback?: boolean; allowAnonymous?: boolean }
): Promise<ApiResult<T>> {
  return authedRequest<T>(route, {
    method: "PUT",
    body: JSON.stringify(body ?? {}),
    timeoutMs: opts?.timeoutMs,
    allow404Fallback: opts?.allow404Fallback,
    allowAnonymous: opts?.allowAnonymous,
  });
}

// ------------------------------------------------------
// NattyCheck-specific route helpers
// ------------------------------------------------------
export async function postAnalyze(payload: {
  frontBase64: string;
  sideBase64: string;
  backBase64: string;
}) {
  // Analyze can take longer + large payloads
  // ✅ allowAnonymous: true (required for onboarding scan flow)
  return authedPost(
    { primary: "/analyze", fallback: "/analyze/" },
    payload,
    { timeoutMs: 90_000, allow404Fallback: false, allowAnonymous: true }
  );
}

export async function postWorkoutGenerate(payload: any) {
  // Workout generation should also work for anon users *after purchase*,
  // but if you want to force account before workout generation,
  // set allowAnonymous: false here.
  return authedPost(
    { primary: "/workout/generate", fallback: "/workout/workout/generate" },
    payload,
    { timeoutMs: 60_000, allow404Fallback: true, allowAnonymous: true }
  );
}
