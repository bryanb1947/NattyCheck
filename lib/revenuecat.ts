// lib/revenuecat.ts
import Purchases, { CustomerInfo, LOG_LEVEL } from "react-native-purchases";
import { supabase } from "@/lib/supabase";

/**
 * RevenueCat public SDK key (safe to be public).
 * Must be set in .env as EXPO_PUBLIC_REVENUECAT_IOS_KEY.
 */
const RC_IOS_API_KEY = process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY;

/**
 * Goals:
 * - Purchases.configure() exactly once per app launch
 * - Purchases.logIn(appUserID) at most once per distinct user id
 * - Never run concurrent logIn() calls (mutex)
 * - Make syncEntitlements safe even if called from multiple screens
 * - IMPORTANT: avoid "downgrade to free" from stale RC reads immediately after purchase
 */

// Runtime module state
let configuredOnce = false;
let currentAppUserId: string | null = null;

// Mutex / dedupe
let configureInFlight: Promise<boolean> | null = null;
let loginInFlight: Promise<CustomerInfo | undefined> | null = null;
let lastLoginTarget: string | null = null;

let syncInFlight: Promise<boolean> | null = null;

function hasApiKey(): boolean {
  return !!RC_IOS_API_KEY && String(RC_IOS_API_KEY).trim().length > 10;
}

function setLogs() {
  Purchases.setLogLevel(__DEV__ ? LOG_LEVEL.DEBUG : LOG_LEVEL.WARN);
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Configure Purchases exactly once.
 * Safe to call repeatedly, and mutex-protected.
 */
async function ensureConfigured(): Promise<boolean> {
  setLogs();

  if (!hasApiKey()) {
    console.warn(
      "[RevenueCat] Missing/invalid EXPO_PUBLIC_REVENUECAT_IOS_KEY. Purchases will NOT be configured."
    );
    return false;
  }

  if (configuredOnce) return true;
  if (configureInFlight) return configureInFlight;

  configureInFlight = (async () => {
    try {
      console.log("[RevenueCat] configure() (one-time)");
      Purchases.configure({
        apiKey: RC_IOS_API_KEY as string,
        // Do NOT set appUserID here; attach identity via logIn().
      });
      configuredOnce = true;
      currentAppUserId = null;
      return true;
    } catch (e: any) {
      console.warn("[RevenueCat] configure() failed:", e?.message ?? e);
      configuredOnce = false;
      currentAppUserId = null;
      return false;
    } finally {
      configureInFlight = null;
    }
  })();

  return configureInFlight;
}

/**
 * Align RevenueCat identity to the provided userId.
 *
 * IMPORTANT:
 * - If userId is null, we DO NOT force logOut() (avoids churn)
 * - Mutex-protected so multiple calls won't spam logIn()
 *
 * Returns CustomerInfo if identity changes, otherwise undefined.
 */
export async function initRevenueCat(userId: string | null) {
  const ok = await ensureConfigured();
  if (!ok) return;

  const target = userId ?? null;

  // If no userId, don’t churn identities—just leave RC as-is.
  if (!target) return;

  // Already aligned
  if (currentAppUserId === target) return;

  // If we already have an in-flight login to the same target, await it.
  if (loginInFlight && lastLoginTarget === target) {
    return await loginInFlight;
  }

  // If another login is in-flight to a different target, await it first,
  // then proceed (prevents concurrent RC identity operations).
  if (loginInFlight && lastLoginTarget !== target) {
    try {
      await loginInFlight;
    } catch {
      // ignore
    }
  }

  lastLoginTarget = target;

  loginInFlight = (async () => {
    try {
      console.log("[RevenueCat] logIn() with user:", target);

      // One retry on transient backend flakiness
      try {
        const { customerInfo } = await Purchases.logIn(target);
        currentAppUserId = target;
        return customerInfo;
      } catch (e1: any) {
        const msg = String(e1?.message ?? e1);
        console.warn("[RevenueCat] logIn() failed (attempt 1):", msg);

        // Retry only for vague backend errors / network-ish issues
        if (msg.toLowerCase().includes("unknown backend error")) {
          await sleep(350);
          const { customerInfo } = await Purchases.logIn(target);
          currentAppUserId = target;
          return customerInfo;
        }

        // Non-retryable
        throw e1;
      }
    } catch (e: any) {
      console.warn("[RevenueCat] logIn() failed:", e?.message ?? e);
      // Unknown state now
      currentAppUserId = null;
      return;
    } finally {
      loginInFlight = null;
      lastLoginTarget = null;
    }
  })();

  return await loginInFlight;
}

/**
 * Safely fetch customer info.
 * Assumes initRevenueCat(userId) was called at app boot / auth bootstrap.
 */
async function getCustomerInfoSafe(): Promise<CustomerInfo | null> {
  try {
    const ok = await ensureConfigured();
    if (!ok) return null;

    return await Purchases.getCustomerInfo();
  } catch (e: any) {
    console.warn("[RevenueCat] getCustomerInfoSafe() failed:", e?.message ?? e);
    return null;
  }
}

/**
 * Resolve Supabase identity robustly.
 * - Prefer getSession() for reliability.
 * - Fall back to getUser().
 */
async function getSupabaseIdentity(): Promise<{
  userId: string | null;
  email: string | null;
}> {
  try {
    const { data: sessData, error: sessErr } = await supabase.auth.getSession();
    if (!sessErr) {
      const s = sessData?.session ?? null;
      const uid = s?.user?.id ?? null;
      const em = s?.user?.email ?? null;
      if (uid) return { userId: uid, email: em };
    }
  } catch {
    // ignore
  }

  try {
    const { data, error } = await supabase.auth.getUser();
    if (error) return { userId: null, email: null };
    return { userId: data?.user?.id ?? null, email: data?.user?.email ?? null };
  } catch {
    return { userId: null, email: null };
  }
}

function extractPro(customerInfo: CustomerInfo | null): {
  isPro: boolean;
  productId: string | null;
} {
  if (!customerInfo) return { isPro: false, productId: null };
  const activePro = customerInfo.entitlements.active?.["pro"];
  const isPro = !!activePro;
  const productId = activePro?.productIdentifier ?? null;
  return { isPro, productId };
}

/**
 * Core: Fetch entitlements from RevenueCat and sync to Supabase `profiles`.
 *
 * KEY FIX:
 * - Avoid downgrading to "free" from a stale RC read right after purchase/restore.
 *
 * Options:
 * - customerInfoOverride: pass the fresh customerInfo from Purchases.purchasePackage() / restorePurchases()
 * - forceDowngrade: allow writing "free" even if Supabase currently says "pro"
 */
export async function syncEntitlementsToSupabase(opts?: {
  customerInfoOverride?: CustomerInfo | null;
  forceDowngrade?: boolean;
}): Promise<boolean> {
  // Mutex: prevent concurrent writes from multiple screens
  if (syncInFlight) return await syncInFlight;

  syncInFlight = (async () => {
    try {
      const { userId, email } = await getSupabaseIdentity();

      if (!userId) {
        console.warn("[RevenueCat] No Supabase user while syncing entitlements");
        return false;
      }

      // Ensure RC is aligned to this Supabase user id (mutex-protected)
      await initRevenueCat(userId);

      // Prefer fresh info if caller has it (prevents stale reads after purchase)
      const fresh = opts?.customerInfoOverride ?? null;
      const customerInfo = fresh ?? (await getCustomerInfoSafe());

      if (!customerInfo) {
        console.warn("[RevenueCat] No customer info available (not configured or RC error).");
        return false;
      }

      const { isPro, productId } = extractPro(customerInfo);

      console.log("[RevenueCat] Entitlements snapshot:", {
        isPro,
        productId,
        active: Object.keys(customerInfo.entitlements.active || {}),
        appUserId: (customerInfo as any)?.originalAppUserId,
      });

      // Read current profile to prevent accidental downgrade
      const { data: existing, error: existingErr } = await supabase
        .from("profiles")
        .select("user_id, plan_normalized, plan_raw")
        .eq("user_id", userId)
        .maybeSingle();

      if (existingErr) {
        console.warn("[RevenueCat] Failed to read existing profile (continuing):", existingErr);
      }

      const existingNorm = String(existing?.plan_normalized ?? "").toLowerCase();
      const existingIsPro = existingNorm === "pro";

      // Safety: if Supabase already says pro, do NOT downgrade unless forced.
      if (existingIsPro && !isPro && !opts?.forceDowngrade) {
        console.warn(
          "[RevenueCat] Prevented downgrade: Supabase says pro but RC read says free (likely stale)."
        );
        return true;
      }

      const plan_normalized = isPro ? "pro" : "free";

      // Keep the most informative plan_raw we can
      const plan_raw =
        isPro && productId
          ? `appstore:${productId}`
          : isPro
          ? String(existing?.plan_raw ?? "pro")
          : "free";

      const { error: upsertErr } = await supabase.from("profiles").upsert(
        {
          user_id: userId,
          email: email ?? null,
          plan_normalized,
          plan_raw,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" }
      );

      if (upsertErr) {
        console.warn("[RevenueCat] Failed to upsert profile plan:", upsertErr);
        // Still return entitlement state
        return isPro || existingIsPro;
      }

      return isPro;
    } catch (e: any) {
      console.warn("[RevenueCat] syncEntitlementsToSupabase() failed:", e?.message ?? e);
      return false;
    } finally {
      syncInFlight = null;
    }
  })();

  return await syncInFlight;
}

/**
 * Convenience: check Pro directly from RevenueCat (no Supabase write).
 */
export async function getIsProFromRevenueCat(): Promise<boolean> {
  const customerInfo = await getCustomerInfoSafe();
  return extractPro(customerInfo).isPro;
}

/**
 * Optional explicit identity control:
 * Use ONLY when you truly need it (rare).
 */
export async function revenueCatLogIn(appUserId: string): Promise<CustomerInfo | null> {
  try {
    const ok = await ensureConfigured();
    if (!ok) return null;

    const info = await initRevenueCat(appUserId);
    return info ?? (await getCustomerInfoSafe());
  } catch (e: any) {
    console.warn("[RevenueCat] revenueCatLogIn failed:", e?.message ?? e);
    currentAppUserId = null;
    return null;
  }
}

export async function revenueCatLogOut(): Promise<CustomerInfo | null> {
  try {
    const ok = await ensureConfigured();
    if (!ok) return null;

    const customerInfo = await Purchases.logOut();
    currentAppUserId = null;
    return customerInfo;
  } catch (e: any) {
    console.warn("[RevenueCat] revenueCatLogOut failed:", e?.message ?? e);
    currentAppUserId = null;
    return null;
  }
}
