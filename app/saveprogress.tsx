// app/saveprogress.tsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as Linking from "expo-linking";
import * as AppleAuthentication from "expo-apple-authentication";
import * as Crypto from "expo-crypto";

import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/store/useAuthStore";

const C = {
  bg: "#FFFFFF",
  text: "#0A0B0C",
  dim: "rgba(10,11,12,0.55)",
  dim2: "rgba(10,11,12,0.40)",
  border: "rgba(10,11,12,0.10)",
  appleBtn: "#000000",
  googleBtn: "#FFFFFF",
  googleBorder: "rgba(10,11,12,0.12)",
};

function normalizeRoute(v: string) {
  const raw = String(v || "").trim();
  if (!raw) return "/(tabs)/analyze";
  return raw.startsWith("/") ? raw : `/${raw}`;
}

/**
 * Some runtimes don’t support URLSearchParams reliably.
 * We parse both query and hash manually.
 */
function parseParams(url: string) {
  const out: Record<string, string> = {};

  // query (?a=b&c=d)
  const qIndex = url.indexOf("?");
  if (qIndex !== -1) {
    const q = url.slice(qIndex + 1).split("#")[0];
    q.split("&")
      .filter(Boolean)
      .forEach((pair) => {
        const [k, v] = pair.split("=");
        if (!k) return;
        out[decodeURIComponent(k)] = decodeURIComponent(v ?? "");
      });
  }

  // hash (#a=b&c=d) — some providers return tokens here
  const hIndex = url.indexOf("#");
  if (hIndex !== -1) {
    const h = url.slice(hIndex + 1);
    h.split("&")
      .filter(Boolean)
      .forEach((pair) => {
        const [k, v] = pair.split("=");
        if (!k) return;
        out[decodeURIComponent(k)] = decodeURIComponent(v ?? "");
      });
  }

  return out;
}

async function withTimeout<T>(p: Promise<T>, ms = 12000, label = "Request") {
  return new Promise<T>((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`${label} timed out`)), ms);
    p.then((v) => {
      clearTimeout(t);
      resolve(v);
    }).catch((e) => {
      clearTimeout(t);
      reject(e);
    });
  });
}

/**
 * Nonce generator
 * - We will send SHA256(nonce) to Apple
 * - We will send the raw nonce to Supabase
 */
function makeNonce() {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}-${Math.random()
    .toString(36)
    .slice(2)}`;
}

export default function SaveProgress() {
  const router = useRouter();
  const params = useLocalSearchParams<{ next?: string; from?: string }>();

  const nextRoute = useMemo(
    () => normalizeRoute(params?.next ?? "/(tabs)/analyze"),
    [params?.next]
  );

  const userId = useAuthStore((s) => s.userId);
  const setDidPromptSaveProgress = useAuthStore(
    (s) => s.setDidPromptSaveProgress
  );
  const ensureGuestSession = useAuthStore((s) => s.ensureGuestSession);
  const bootstrapAuth = useAuthStore((s) => s.bootstrapAuth);

  const [busy, setBusy] = useState<null | "apple" | "google" | "finishing">(null);
  const finalizedRef = useRef(false);

  // We deep-link back to THIS screen for OAuth (Google).
  const redirectTo = useMemo(() => {
    return Linking.createURL("/saveprogress", {
      queryParams: { next: nextRoute },
    });
  }, [nextRoute]);

  // Ensure we have a Supabase user (anon is fine) so scans/results are attached.
  useEffect(() => {
    (async () => {
      try {
        const { data } = await supabase.auth.getSession();
        if (data?.session?.user?.id) {
          await bootstrapAuth();
          return;
        }
        await ensureGuestSession();
      } catch (e: any) {
        console.log("🟨 [saveprogress] session ensure failed:", e?.message ?? e);
      }
    })();
  }, [ensureGuestSession, bootstrapAuth]);

  const finalizeAndContinue = useCallback(async () => {
    if (finalizedRef.current) return;
    finalizedRef.current = true;

    setDidPromptSaveProgress(true);

    // IMPORTANT: clear loading state so UI doesn’t “stick”
    setBusy(null);

    router.replace(nextRoute as any);
  }, [router, nextRoute, setDidPromptSaveProgress]);

  const completeFromUrl = useCallback(
    async (url: string) => {
      try {
        if (busy === "finishing") return;

        const p = parseParams(url);

        // Supabase OAuth (PKCE) returns `code=...`
        const code = p["code"];
        if (code) {
          setBusy("finishing");

          const res = await withTimeout(
            supabase.auth.exchangeCodeForSession(url),
            12000,
            "exchangeCodeForSession"
          );

          if ((res as any)?.error) {
            console.log(
              "❌ [saveprogress] exchangeCodeForSession error:",
              (res as any).error.message
            );
            setBusy(null);
            Alert.alert("Sign-in failed", "Couldn’t complete sign-in. Please try again.");
            return;
          }

          await finalizeAndContinue();
          return;
        }

        // Some flows might return tokens in hash
        const access_token = p["access_token"];
        const refresh_token = p["refresh_token"];
        if (access_token && refresh_token) {
          setBusy("finishing");

          const res = await withTimeout(
            supabase.auth.setSession({ access_token, refresh_token }),
            12000,
            "setSession"
          );

          if ((res as any)?.error) {
            console.log("❌ [saveprogress] setSession error:", (res as any).error.message);
            setBusy(null);
            Alert.alert("Sign-in failed", "Couldn’t complete sign-in. Please try again.");
            return;
          }

          await finalizeAndContinue();
          return;
        }
      } catch (e: any) {
        console.log("❌ [saveprogress] completeFromUrl failed:", e?.message ?? e);
        setBusy(null);
        Alert.alert("Sign-in failed", e?.message ?? "Please try again.");
      }
    },
    [busy, finalizeAndContinue]
  );

  // Warm app deep link handling (Google OAuth completion)
  useEffect(() => {
    const sub = Linking.addEventListener("url", async ({ url }) => {
      console.log("🔁 [saveprogress] url event:", url);
      await completeFromUrl(url);
    });

    return () => sub.remove();
  }, [completeFromUrl]);

  // Cold start deep link handling (Google OAuth completion)
  useEffect(() => {
    (async () => {
      try {
        const initial = await Linking.getInitialURL();
        if (initial) {
          console.log("🧊 [saveprogress] initial url:", initial);
          await completeFromUrl(initial);
        }
      } catch {}
    })();
  }, [completeFromUrl]);

  /**
   * ✅ Native Apple Sign-In (NO browser)
   * IMPORTANT:
   * - Apple should receive SHA256(nonce)
   * - Supabase should receive raw nonce
   */
  const startAppleNative = useCallback(async () => {
    if (busy) return;

    try {
      setBusy("apple");

      // Ensure anon session exists so scans/results remain attached pre-login
      if (!userId) {
        await ensureGuestSession();
      }

      if (Platform.OS !== "ios") {
        throw new Error("Apple Sign-In is only available on iOS.");
      }

      const available = await AppleAuthentication.isAvailableAsync();
      if (!available) {
        throw new Error("Sign in with Apple is not available on this device.");
      }

      const rawNonce = makeNonce();
      const hashedNonce = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        rawNonce
      );

      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
        nonce: hashedNonce, // ✅ hashed sent to Apple
      });

      const idToken = credential?.identityToken;
      if (!idToken) {
        throw new Error("Apple Sign-In failed (missing identity token).");
      }

      // Create Supabase session without browser OAuth
      const res = await withTimeout(
        supabase.auth.signInWithIdToken({
          provider: "apple",
          token: idToken,
          nonce: rawNonce, // ✅ raw nonce sent to Supabase
        }),
        12000,
        "signInWithIdToken"
      );

      if ((res as any)?.error) {
        throw (res as any).error;
      }

      await finalizeAndContinue();
    } catch (e: any) {
      const msg = e?.message ?? String(e);

      // User canceled
      if (msg.includes("ERR_REQUEST_CANCELED")) {
        setBusy(null);
        return;
      }

      console.log("❌ [saveprogress] apple native error:", msg);
      setBusy(null);
      Alert.alert("Couldn’t sign in", msg || "Please try again.");
    }
  }, [busy, userId, ensureGuestSession, finalizeAndContinue]);

  /**
   * Google OAuth can remain web-based.
   * If you still get “cannot connect”, it’s a redirect/deeplink config issue,
   * and we’ll fix that next (scheme + Supabase redirect URLs).
   */
  const startGoogleOAuth = useCallback(async () => {
    if (busy) return;

    try {
      setBusy("google");

      if (!userId) {
        await ensureGuestSession();
      }

      const { data, error } = await withTimeout(
        supabase.auth.signInWithOAuth({
          provider: "google",
          options: {
            redirectTo,
          },
        }),
        12000,
        "signInWithOAuth"
      );

      if (error) throw error;

      const url = (data as any)?.url as string | undefined;
      if (url) {
        const can = await Linking.canOpenURL(url);
        if (!can) throw new Error("Cannot open sign-in URL");
        await Linking.openURL(url);
      }
    } catch (e: any) {
      console.log("❌ [saveprogress] google oauth error:", e?.message ?? e);
      Alert.alert("Couldn’t sign in", e?.message ?? "Please try again.");
      setBusy(null);
    }
  }, [busy, userId, ensureGuestSession, redirectTo]);

  const skip = useCallback(async () => {
    setDidPromptSaveProgress(true);
    router.replace(nextRoute as any);
  }, [router, nextRoute, setDidPromptSaveProgress]);

  const back = useCallback(() => {
    try {
      router.back();
    } catch {
      router.replace(nextRoute as any);
    }
  }, [router, nextRoute]);

  const isAppleBusy = busy === "apple" || busy === "finishing";
  const isGoogleBusy = busy === "google" || busy === "finishing";
  const anyBusy = !!busy;

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      <View style={styles.topRow}>
        <TouchableOpacity
          onPress={back}
          activeOpacity={0.85}
          style={styles.backBtn}
          disabled={anyBusy}
        >
          <Ionicons name="arrow-back" size={18} color={C.text} />
        </TouchableOpacity>
      </View>

      <View style={styles.wrap}>
        <Text style={styles.title}>Save your progress</Text>
        <Text style={styles.sub}>
          Keep your scans, photos, and results if you reinstall or switch phones.
        </Text>

        <View style={{ height: 22 }} />

        {/* Apple (native) */}
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={startAppleNative}
          style={[styles.appleBtn, anyBusy && styles.disabled]}
          disabled={anyBusy}
        >
          <View style={styles.btnRow}>
            {isAppleBusy ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Ionicons name="logo-apple" size={20} color="#FFFFFF" />
            )}
            <Text style={styles.appleText}>Sign in with Apple</Text>
          </View>
        </TouchableOpacity>

        {/* Google (OAuth) */}
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={startGoogleOAuth}
          style={[styles.googleBtn, anyBusy && styles.disabled]}
          disabled={anyBusy}
        >
          <View style={styles.btnRow}>
            {isGoogleBusy ? (
              <ActivityIndicator color="#0A0B0C" />
            ) : (
              <Ionicons name="logo-google" size={18} color="#0A0B0C" />
            )}
            <Text style={styles.googleText}>Sign in with Google</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={skip}
          activeOpacity={0.85}
          style={styles.skipBtn}
          disabled={anyBusy}
        >
          <Text style={styles.skipText}>Not now</Text>
        </TouchableOpacity>

        <LinearGradient
          colors={["rgba(255,255,255,0)", "rgba(255,255,255,1)"]}
          style={styles.bottomFade}
          pointerEvents="none"
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  topRow: {
    paddingHorizontal: 16,
    paddingTop: 6,
    height: 46,
    justifyContent: "center",
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: "rgba(255,255,255,0.85)",
  },

  wrap: {
    flex: 1,
    paddingHorizontal: 22,
    paddingTop: 26,
    alignItems: "center",
  },

  title: {
    fontSize: 36,
    fontWeight: "900",
    color: C.text,
    textAlign: "center",
    letterSpacing: -0.2,
  },
  sub: {
    marginTop: 10,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "700",
    color: C.dim,
    textAlign: "center",
    width: "92%",
  },

  appleBtn: {
    width: "100%",
    height: 56,
    borderRadius: 28,
    backgroundColor: C.appleBtn,
    alignItems: "center",
    justifyContent: "center",
  },
  appleText: {
    color: "#FFFFFF",
    fontWeight: "900",
    fontSize: 16,
    marginLeft: 10,
  },

  googleBtn: {
    width: "100%",
    height: 56,
    borderRadius: 28,
    backgroundColor: C.googleBtn,
    borderWidth: 1,
    borderColor: C.googleBorder,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 14,
  },
  googleText: {
    color: C.text,
    fontWeight: "900",
    fontSize: 16,
    marginLeft: 10,
  },

  btnRow: { flexDirection: "row", alignItems: "center", justifyContent: "center" },

  skipBtn: { marginTop: 18, paddingVertical: 10, paddingHorizontal: 14 },
  skipText: { color: C.dim2, fontWeight: "900", fontSize: 14 },

  disabled: { opacity: 0.7 },

  bottomFade: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 140,
  },
});
