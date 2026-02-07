// app/premiumresults.tsx
// ------------------------------------------------------
// Premium Results Screen (ANON-FIRST + NO PAYWALL LOOP + FORCED CLAIM)
// - Supports anonymous users (guest sessions) for onboarding + scan
// - Gates full render by profiles.plan_normalized === "pro"
// - Prevents paywall loop right after purchase by:
//   1) best-effort RevenueCat -> Supabase sync
//   2) retrying profile fetch briefly
// - FORCED CLAIM:
//   ✅ If user is Pro but session user has no email (anon), force /claimaccount
// - If results store is empty, fetch latest analysis_history for this user
// - Generates workout via POST /workout/generate (AUTH REQUIRED)
//   ✅ uses lib/api.ts authedPost to attach Supabase JWT
// ------------------------------------------------------

import React, { useEffect, useMemo, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Platform,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";

import { supabase } from "../lib/supabase";
import { useAuthStore } from "../store/useAuthStore";
import { useResultsStore } from "../store/useResultsStore";
import { useWorkoutStore } from "../store/useWorkoutStore";
import {
  useWorkoutHistoryStore,
  type WorkoutSession,
  type LoggedExercise,
} from "../store/useWorkoutHistoryStore";

import { syncEntitlementsToSupabase } from "@/lib/revenuecat";
import { authedPost } from "@/lib/api";

const GUTTER = 16;

/* ---------------------------------------------------------
 * TRAINING SUMMARY HELPERS
 * --------------------------------------------------------*/
type VolumeBucket =
  | "chest"
  | "back"
  | "front_delts"
  | "side_delts"
  | "rear_delts"
  | "biceps"
  | "triceps"
  | "quads"
  | "hamstrings"
  | "glutes"
  | "calves"
  | "core";

type TrainingSummaryForGPT = {
  sessions_last_30_days: number;
  total_sets: number;
  volume: Record<VolumeBucket, number>;
  most_worked: VolumeBucket[];
  undertrained: VolumeBucket[];
};

function makeEmptyVolume(): Record<VolumeBucket, number> {
  return {
    chest: 0,
    back: 0,
    front_delts: 0,
    side_delts: 0,
    rear_delts: 0,
    biceps: 0,
    triceps: 0,
    quads: 0,
    hamstrings: 0,
    glutes: 0,
    calves: 0,
    core: 0,
  };
}

function mapExerciseToBuckets(ex: LoggedExercise): VolumeBucket[] {
  const muscle = (ex.muscle || "").toLowerCase();
  const name = (ex.name || "").toLowerCase();
  const buckets = new Set<VolumeBucket>();

  if (
    muscle.includes("chest") ||
    name.includes("bench") ||
    (name.includes("press") && !name.includes("shoulder"))
  ) {
    buckets.add("chest");
  }

  if (
    muscle.includes("back") ||
    name.includes("row") ||
    name.includes("pulldown") ||
    name.includes("pull-down") ||
    name.includes("pullup") ||
    name.includes("pull-up") ||
    name.includes("pull up") ||
    name.includes("chinup") ||
    name.includes("chin-up") ||
    name.includes("chin up")
  ) {
    buckets.add("back");
  }

  if (muscle.includes("rear") && (muscle.includes("delt") || muscle.includes("shoulder"))) {
    buckets.add("rear_delts");
  } else if (
    (muscle.includes("lateral") || muscle.includes("side")) &&
    (muscle.includes("delt") || muscle.includes("shoulder"))
  ) {
    buckets.add("side_delts");
  } else if (
    (muscle.includes("front") || muscle.includes("anterior")) &&
    (muscle.includes("delt") || muscle.includes("shoulder"))
  ) {
    buckets.add("front_delts");
  } else if (
    muscle.includes("shoulder") ||
    muscle.includes("delt") ||
    name.includes("overhead press") ||
    name.includes("shoulder press") ||
    name.includes("lateral raise") ||
    name.includes("rear delt") ||
    name.includes("face pull")
  ) {
    buckets.add("side_delts");
    buckets.add("front_delts");
  }

  if (muscle.includes("bicep") || name.includes("curl")) buckets.add("biceps");

  if (
    muscle.includes("tricep") ||
    name.includes("skullcrusher") ||
    name.includes("tricep") ||
    name.includes("pushdown") ||
    name.includes("dip")
  ) {
    buckets.add("triceps");
  }

  if (
    muscle.includes("quad") ||
    name.includes("squat") ||
    name.includes("leg press") ||
    name.includes("leg extension")
  ) {
    buckets.add("quads");
  }

  if (
    muscle.includes("hamstring") ||
    name.includes("leg curl") ||
    name.includes("rdl") ||
    name.includes("romanian") ||
    name.includes("good morning")
  ) {
    buckets.add("hamstrings");
  }

  if (muscle.includes("glute") || name.includes("hip thrust") || name.includes("glute")) {
    buckets.add("glutes");
  }

  if (muscle.includes("calf") || name.includes("calf")) buckets.add("calves");

  if (
    muscle.includes("core") ||
    muscle.includes("abs") ||
    name.includes("crunch") ||
    name.includes("plank") ||
    name.includes("leg raise") ||
    name.includes("leg-raise") ||
    name.includes("dead bug") ||
    name.includes("pallof") ||
    name.includes("ab wheel")
  ) {
    buckets.add("core");
  }

  return Array.from(buckets);
}

function buildTrainingSummary(sessions: WorkoutSession[]): TrainingSummaryForGPT {
  const safeSessions = Array.isArray(sessions) ? sessions : [];
  const now = new Date();
  const cutoff = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const recent = safeSessions.filter((s) => {
    const d = new Date((s as any).date);
    return d >= cutoff && !isNaN(d.getTime());
  });

  const volume = makeEmptyVolume();
  let totalSets = 0;

  for (const sess of recent) {
    const exercises = (sess as any).exercises || [];
    for (const ex of exercises) {
      const setCount = Array.isArray(ex.sets) ? ex.sets.length : 0;
      if (!setCount) continue;

      totalSets += setCount;
      const buckets = mapExerciseToBuckets(ex);
      for (const b of buckets) volume[b] += setCount;
    }
  }

  const entries = (Object.entries(volume) as [VolumeBucket, number][])
    .slice()
    .sort((a, b) => b[1] - a[1]);

  const most_worked = entries.slice(0, 2).map(([b]) => b);
  const undertrained = entries.slice(-2).map(([b]) => b).reverse();

  return {
    sessions_last_30_days: recent.length,
    total_sets: totalSets,
    volume,
    most_worked,
    undertrained,
  };
}

/* ---------------------------------------------------------
 * RESULT SHAPE HELPERS
 * --------------------------------------------------------*/
function unwrapAnalysis(obj: any): any {
  if (!obj || typeof obj !== "object") return obj;
  const cand = obj.result || obj.analysis || obj.data || obj.payload || obj.output || obj.response;
  if (cand && typeof cand === "object") return cand;
  return obj;
}

function isNonEmptyRecord(v: any): boolean {
  return !!v && typeof v === "object" && !Array.isArray(v) && Object.keys(v).length > 0;
}

function pickFirst<T>(...vals: T[]): T | undefined {
  for (const v of vals) if (v !== undefined && v !== null) return v;
  return undefined;
}

function safeNumber(v: any): number | null {
  if (v === undefined || v === null) return null;
  const n = typeof v === "number" ? v : Number(v);
  return isNaN(n) ? null : n;
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

/* ---------------------------------------------------------
 * COMPONENT
 * --------------------------------------------------------*/
export default function PremiumResults() {
  const router = useRouter();

  // store result (may be empty on cold boot / restore)
  const rawResult = useResultsStore((s) => s.last);
  const resultFromStore = useMemo(() => unwrapAnalysis(rawResult), [rawResult]);

  // auth store
  const email = useAuthStore((s) => s.email);
  const setIdentity = useAuthStore((s) => s.setIdentity);
  const setPlan = useAuthStore((s) => s.setPlan);
  const hasBootstrappedSession = useAuthStore((s) => s.hasBootstrappedSession);

  // workout
  const setWorkout = useWorkoutStore((s) => s.setWorkout);
  const workoutSessions = useWorkoutHistoryStore((s) => s.sessions);

  const trainingSummary = useMemo(
    () => buildTrainingSummary(workoutSessions || []),
    [workoutSessions]
  );

  // UI states
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);

  // gate state
  const [checking, setChecking] = useState(true);
  const [entitlementError, setEntitlementError] = useState<string | null>(null);
  const [uid, setUid] = useState<string | null>(null);

  // if store is empty, we’ll fetch latest from DB
  const [fallbackAnalysis, setFallbackAnalysis] = useState<any | null>(null);

  const effectiveResult = useMemo(() => {
    return fallbackAnalysis ? unwrapAnalysis(fallbackAnalysis) : resultFromStore;
  }, [fallbackAnalysis, resultFromStore]);

  /* ---------------------------------------------------------
     Fetch latest analysis_history if results store is empty
  --------------------------------------------------------*/
  const fetchLatestAnalysisIfMissing = useCallback(
    async (_uid: string) => {
      if (resultFromStore) return;

      try {
        const { data, error } = await supabase
          .from("analysis_history")
          .select("*")
          .eq("user_id", _uid)
          .order("created_at", { ascending: false })
          .limit(1);

        if (error) {
          console.log("🟨 PremiumResults latest analysis fetch error:", error.message);
          return;
        }

        const row = Array.isArray(data) ? data[0] : null;
        if (row) {
          setFallbackAnalysis(row);
          console.log("✅ PremiumResults loaded latest analysis_history fallback:", {
            id: row.id,
            created_at: row.created_at,
          });
        }
      } catch (e: any) {
        console.log("🟨 PremiumResults latest analysis fetch crash:", e?.message ?? e);
      }
    },
    [resultFromStore]
  );

  /* ---------------------------------------------------------
     Validate Pro access + FORCE CLAIM if anon Pro
  --------------------------------------------------------*/
  const validateAccess = useCallback(async () => {
    setChecking(true);
    setEntitlementError(null);

    try {
      const { data: sessData, error: sessErr } = await supabase.auth.getSession();
      if (sessErr) console.log("🟦 PremiumResults getSession error:", sessErr);

      const session = sessData?.session ?? null;
      const user = session?.user ?? null;

      // IMPORTANT: PremiumResults requires a session (anon or authed)
      if (!user?.id) {
        setPlan("free");
        router.replace({ pathname: "/paywall", params: { next: "/premiumresults" } } as any);
        return;
      }

      const _uid = user.id;
      const _email = user.email ?? null;

      setUid(_uid);
      setIdentity({ userId: _uid, email: _email ?? email ?? null });

      // best-effort RC -> Supabase sync
      try {
        await syncEntitlementsToSupabase();
      } catch (e) {
        console.log("⚠️ syncEntitlementsToSupabase failed (non-blocking):", e);
      }

      const attempts = 8; // ~4s
      for (let i = 0; i < attempts; i++) {
        const { data: profile, error } = await supabase
          .from("profiles")
          .select("user_id, plan_normalized, plan_raw, updated_at")
          .eq("user_id", _uid)
          .maybeSingle();

        if (error) {
          setPlan("free");
          setEntitlementError(error.message ?? "Failed to check entitlement.");
          break;
        }

        const normalized = profile?.plan_normalized === "pro" ? "pro" : "free";
        setPlan(normalized);

        if (normalized === "pro") {
          // ✅ FORCED CLAIM: pro but no email => must claim before seeing premium
          if (!_email) {
            router.replace({ pathname: "/claimaccount", params: { next: "/premiumresults" } } as any);
            return;
          }

          await fetchLatestAnalysisIfMissing(_uid);
          setEntitlementError(null);
          return;
        }

        await sleep(500);
      }

      // Not pro -> paywall
      router.replace({ pathname: "/paywall", params: { next: "/premiumresults" } } as any);
    } catch (e: any) {
      console.log("❌ validateAccess crashed:", e?.message ?? e);
      setPlan("free");
      router.replace({ pathname: "/paywall", params: { next: "/premiumresults" } } as any);
    } finally {
      setChecking(false);
    }
  }, [router, email, setIdentity, setPlan, fetchLatestAnalysisIfMissing]);

  useEffect(() => {
    if (!hasBootstrappedSession) return;
    validateAccess();
  }, [hasBootstrappedSession, validateAccess]);

  // Loading / gating UI
  if (!hasBootstrappedSession || checking) {
    return (
      <SafeAreaView style={styles.loadingScreen}>
        <ActivityIndicator size="large" color="#00E6C8" />
        <Text style={styles.loadingText}>Checking your Pro access…</Text>
        <Text style={styles.loadingSub}>
          If you just purchased, this can take a moment to sync.
        </Text>
      </SafeAreaView>
    );
  }

  if (entitlementError) {
    return (
      <SafeAreaView style={styles.loadingScreen}>
        <Text style={styles.errorTitle}>We can’t confirm Pro access yet</Text>
        <Text style={styles.errorBody}>{entitlementError}</Text>

        <TouchableOpacity onPress={validateAccess} activeOpacity={0.85} style={{ marginTop: 16 }}>
          <LinearGradient colors={["#00E6C8", "#9AF65B"]} style={styles.retryBtn}>
            <Text style={styles.retryText}>Retry</Text>
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() =>
            router.replace({ pathname: "/paywall", params: { next: "/premiumresults" } } as any)
          }
          activeOpacity={0.85}
          style={{ marginTop: 12 }}
        >
          <Text style={{ color: "#9AF65B", fontWeight: "800" }}>Back to Paywall</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  // Missing analysis (store empty AND db empty)
  if (!effectiveResult) {
    return (
      <SafeAreaView style={styles.loadingScreen}>
        <Text style={styles.emptyText}>
          We couldn’t find your latest analysis.{"\n\n"}
          Please run a new scan to see your premium breakdown.
        </Text>

        <TouchableOpacity onPress={() => router.replace("/(tabs)/analyze")} style={{ marginTop: 18 }}>
          <Text style={{ color: "#9AF65B", fontWeight: "800" }}>Go to Analyze</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  // Analyze failed
  if ((effectiveResult as any)?.ok === false || (effectiveResult as any)?.success === false) {
    return (
      <SafeAreaView style={styles.loadingScreen}>
        <Text style={styles.emptyText}>We couldn’t read your photos. Please retake your shots.</Text>
      </SafeAreaView>
    );
  }

  const parsed: any = effectiveResult || {};

  const analysisId: string | undefined = parsed.id || parsed.analysisId || parsed.report_id;
  const createdAtISO: string =
    typeof parsed.created_at === "string" ? parsed.created_at : new Date().toISOString();

  const headerDateLabel = new Date(createdAtISO).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  const groups: Record<string, number> =
    pickFirst(parsed.groups, parsed.muscles, parsed.muscle_groups, parsed.muscleScores) || {};

  const advanced: Record<string, number> =
    pickFirst(parsed.advanced, parsed.ratios, parsed.metrics) || {};

  const definition: Record<string, number> =
    pickFirst(parsed.definition, parsed.def, parsed.definition_scores) || {};

  const definitionNotes: string =
    pickFirst(parsed.definitionNotes, parsed.definition_notes, parsed.def_notes) || "";

  const definitionSource: string =
    pickFirst(parsed.definitionSource, parsed.definition_source) || "rule_only";

  const score = pickFirst(parsed.score, parsed.overall_score, parsed.gptScore);
  const bodyfat = pickFirst(parsed.bodyfat, parsed.body_fat);
  const symmetry = pickFirst(parsed.symmetry, parsed.symmetry_score);
  const confidence = pickFirst(parsed.confidence, parsed.confidence_score);

  const trainingLevel = pickFirst(parsed.trainingLevel, parsed.type, parsed.physique_type);
  const detailedSummary = pickFirst(parsed.detailedSummary, parsed.summary, parsed.notes);

  const hasAnything =
    score !== undefined ||
    bodyfat !== undefined ||
    symmetry !== undefined ||
    isNonEmptyRecord(groups) ||
    isNonEmptyRecord(definition);

  if (!hasAnything) {
    return (
      <SafeAreaView style={styles.loadingScreen}>
        <Text style={styles.emptyText}>
          PremiumResults loaded, but the analysis payload is missing fields needed to render.
          {"\n\n"}
          This usually means you stored a wrapper object or only an id.
        </Text>
        <TouchableOpacity onPress={() => router.replace("/(tabs)/analyze")} style={{ marginTop: 18 }}>
          <Text style={{ color: "#9AF65B", fontWeight: "800" }}>Back to Analyze</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const MUSCLE_ORDER = [
    "shoulders",
    "chest",
    "arms",
    "back",
    "core",
    "glutes",
    "quads",
    "hamstrings",
    "calves",
  ];

  const DEF_ORDER = [
    "overall",
    "abs",
    "shoulders",
    "chest",
    "arms",
    "back",
    "quads",
    "hamstrings",
    "calves",
  ];

  const swr = safeNumber((advanced as any).shoulder_waist_ratio);
  const ltr = safeNumber((advanced as any).leg_torso_ratio);
  const armImb = safeNumber((advanced as any).arm_imbalance);
  const qh = safeNumber((advanced as any).quad_hamstring_ratio);

  function fmt(num: any, digits = 1) {
    const n = safeNumber(num);
    if (n === null) return "—";
    return Number(n).toFixed(digits);
  }

  function describeSWR(num: number | null) {
    if (num === null) return "Unknown V-taper.";
    if (num >= 1.6) return "Very strong V-taper; wide up top.";
    if (num >= 1.4) return "Noticeable V-taper; good shoulder width.";
    if (num >= 1.25) return "Decent taper; room for more width.";
    return "Straight torso; delts & lats should be priority.";
  }

  function describeLTR(num: number | null) {
    if (num === null) return "Unknown leg/torso balance.";
    if (num >= 1.1) return "Legs dominate; strong lower body.";
    if (num >= 0.95) return "Balanced proportions.";
    if (num >= 0.8) return "Slightly short legs visually.";
    return "Legs appear undersized.";
  }

  function describeArmImb(num: number | null) {
    if (num === null) return "Balance unknown.";
    if (num <= 5) return "Balanced arms.";
    if (num <= 12) return "Minor imbalance.";
    if (num <= 25) return "Noticeable imbalance.";
    return "Strong imbalance; focus needed.";
  }

  function describeQH(num: number | null) {
    if (num === null) return "Unknown.";
    if (num >= 1.3) return "Quads dominate.";
    if (num >= 1.0) return "Quad-focused.";
    if (num >= 0.8) return "Balanced.";
    return "Hamstrings dominate.";
  }

  async function saveReport() {
    // session MUST exist already
    const { data: sessData } = await supabase.auth.getSession();
    const _uid = sessData?.session?.user?.id ?? uid;

    if (!_uid) {
      Alert.alert("Error", "Missing user session. Please restart the app.");
      return;
    }

    if (!analysisId) {
      Alert.alert("Unable to save", "Missing analysis ID.");
      return;
    }

    try {
      setSaving(true);

      const payload = {
        id: analysisId,
        user_id: _uid,
        score: safeNumber(score),
        natty: parsed.natty ?? null,
        bodyfat: safeNumber(bodyfat),
        symmetry: safeNumber(symmetry),
        confidence: safeNumber(confidence),
        type: trainingLevel ?? null,
        muscles: isNonEmptyRecord(groups) ? groups : null,
        created_at: createdAtISO,
      };

      const { error } = await supabase.from("analysis_history").upsert(payload, {
        onConflict: "id",
      });

      if (error) {
        Alert.alert("Save failed", error.message);
      } else {
        Alert.alert("Saved!", "Your analysis is stored correctly.");
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleGenerateWorkout() {
    const { data: sessData } = await supabase.auth.getSession();
    const _uid = sessData?.session?.user?.id ?? uid;

    if (!_uid) {
      Alert.alert("Error", "Missing user session. Please restart the app.");
      return;
    }

    if (!analysisId) {
      Alert.alert("Missing analysis", "No analysisId found.");
      return;
    }

    try {
      setGenerating(true);

      const workoutPayload = {
        score: Number(safeNumber(score) ?? 0),
        bodyfat: Number(safeNumber(bodyfat) ?? 0),
        symmetry: Number(safeNumber(symmetry) ?? 0),
        trainingLevel: trainingLevel ?? "Intermediate",
        groups: isNonEmptyRecord(groups) ? groups : {},
        advanced: isNonEmptyRecord(advanced) ? advanced : {},
        confidence: safeNumber(confidence),
        detailedSummary: detailedSummary ?? null,
        training_summary: trainingSummary,
      };

      const resp = await authedPost("/workout/generate", workoutPayload);

      if (!resp.ok) {
        const msg =
          (resp.data as any)?.detail ||
          (resp.data as any)?.message ||
          (resp.raw ? resp.raw.slice(0, 200) : null) ||
          `Workout generation failed (HTTP ${resp.status}).`;

        Alert.alert("Generation failed", msg);
        return;
      }

      const json: any = resp.data;
      if (!json || json.ok !== true || !json.plan) {
        Alert.alert("Generation failed", json?.message || "Could not generate a workout plan.");
        return;
      }

      setWorkout(json.plan);
      Alert.alert("Workout Ready", "Your routine (lifting + cardio + abs) has been generated.");
      router.push("/workout");
    } catch (err: any) {
      Alert.alert("Error", err?.message || "Something went wrong while generating your routine.");
    } finally {
      setGenerating(false);
    }
  }

  function handleCancel() {
    router.replace("/(tabs)/analyze");
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.pageContent}>
        {/* HEADER */}
        <View style={styles.headerRow}>
          <LinearGradient colors={["#00E6C8", "#9AF65B"]} style={styles.logoPill}>
            <Text style={styles.logoText}>N</Text>
          </LinearGradient>
          <Text style={styles.headerDate}>{headerDateLabel}</Text>
        </View>

        {/* TITLE */}
        <View style={styles.titleSection}>
          <LinearGradient colors={["#00E6C8", "#9AF65B"]} style={styles.titleCard}>
            <Text style={styles.titleText}>Premium Physique Analysis</Text>
          </LinearGradient>
          <Text style={styles.subtitle}>Brutal breakdown of size, symmetry & definition</Text>
        </View>

        {/* KEY METRICS */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Key Metrics</Text>

          <View style={styles.metricsGrid}>
            <Metric label="SCORE" value={`${score ?? "—"}`} />
            <Metric
              label="BODY FAT"
              value={bodyfat !== undefined && bodyfat !== null ? `${bodyfat}%` : "—"}
            />
            <Metric
              label="SYMMETRY"
              value={symmetry !== undefined && symmetry !== null ? `${symmetry}%` : "—"}
            />
            <Metric
              label="CONFIDENCE"
              value={confidence !== undefined && confidence !== null ? `${confidence}%` : "—"}
            />
          </View>
        </View>

        {/* PHYSIQUE TYPE */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Your Physique Type</Text>

          <View style={styles.typeCard}>
            <LinearGradient colors={["#00E6C8", "#9AF65B"]} style={styles.typeIcon}>
              <Text style={styles.typeIconGlyph}>⚡</Text>
            </LinearGradient>

            <Text style={styles.typeName}>{trainingLevel ?? "Unknown"}</Text>
            <Text style={styles.typeDesc}>{detailedSummary ?? ""}</Text>
          </View>
        </View>

        {/* MUSCLE GROUPS */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Muscle Group Strength Map</Text>
          <Text style={styles.cardHint}>These scores judge pure size & structure.</Text>

          {MUSCLE_ORDER.map((muscle) =>
            (groups as any)?.[muscle] !== undefined ? (
              <StrengthBar key={muscle} label={muscle} value={(groups as any)[muscle] as number} />
            ) : null
          )}
        </View>

        {/* DEFINITION */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Muscle Definition Breakdown</Text>
          <Text style={styles.cardHint}>This is how sharp you look — not just size.</Text>

          {DEF_ORDER.map((key) =>
            (definition as any)?.[key] !== undefined ? (
              <StrengthBar key={key} label={key} value={(definition as any)[key] as number} />
            ) : null
          )}

          {!!definitionNotes && (
            <View style={styles.definitionNotesBox}>
              <Text style={styles.definitionNotesLabel}>
                Definition critique{definitionSource === "hybrid_gpt" ? " (AI-assisted)" : ""}
              </Text>
              <Text style={styles.definitionNotesText}>{definitionNotes}</Text>
            </View>
          )}
        </View>

        {/* RATIOS */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Proportion Ratios</Text>

          <View style={styles.ratioRow}>
            <Ratio label="Shoulder / Waist" value={fmt(swr, 2)} note={describeSWR(swr)} />
            <Ratio label="Leg / Torso" value={fmt(ltr, 2)} note={describeLTR(ltr)} />
          </View>

          <View style={styles.ratioRow}>
            <Ratio
              label="Arm Imbalance"
              value={armImb === null ? "—" : `${fmt(armImb, 1)}%`}
              note={describeArmImb(armImb)}
            />
            <Ratio label="Quad / Hamstring" value={fmt(qh, 2)} note={describeQH(qh)} />
          </View>
        </View>

        {/* CTA: SAVE */}
        <TouchableOpacity
          style={styles.ctaOuter}
          onPress={saveReport}
          activeOpacity={0.9}
          disabled={saving}
        >
          <LinearGradient colors={["#00E6C8", "#9AF65B"]} style={styles.ctaInner}>
            <Text style={styles.ctaText}>{saving ? "Saving…" : "Save Report"}</Text>
          </LinearGradient>
        </TouchableOpacity>

        {/* CTA: WORKOUT */}
        <TouchableOpacity
          style={styles.ctaOuter}
          onPress={handleGenerateWorkout}
          activeOpacity={0.9}
          disabled={generating}
        >
          <LinearGradient colors={["#00E6C8", "#9AF65B"]} style={styles.ctaInner}>
            <Text style={styles.ctaText}>{generating ? "Generating…" : "View Workout Plan"}</Text>
          </LinearGradient>
        </TouchableOpacity>

        {/* CANCEL */}
        <TouchableOpacity
          style={[styles.ctaOuter, { marginBottom: 30 }]}
          onPress={handleCancel}
          activeOpacity={0.8}
        >
          <View style={[styles.ctaInner, { backgroundColor: "#1A1D21", borderRadius: 14 }]}>
            <Text style={[styles.ctaText, { color: "#C7D0D8" }]}>Cancel</Text>
          </View>
        </TouchableOpacity>

        <View style={{ height: 50 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

/* ------------------------ UI Components ------------------------ */

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metricBox}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
    </View>
  );
}

function getBarColors(value: number): string[] {
  if (value >= 80) return ["#B8FF48", "#E6FF8F"];
  if (value >= 65) return ["#00E6C8", "#9AF65B"];
  if (value >= 55) return ["#FFC857", "#FFEB8A"];
  return ["#FF5C7A", "#FF934F"];
}

function StrengthBar({ label, value }: { label: string; value: number }) {
  const colors = getBarColors(value);
  const pretty = label.charAt(0).toUpperCase() + label.slice(1).toLowerCase();

  return (
    <View style={styles.strRow}>
      <Text style={styles.strLabel}>{pretty}</Text>

      <View style={styles.strBarTrack}>
        <LinearGradient
          colors={colors}
          style={[
            styles.strBarFill,
            { width: `${Math.min(Math.max(value, 5), 100)}%` },
          ]}
        />
      </View>

      <Text style={styles.strValue}>{value}%</Text>
    </View>
  );
}

function Ratio({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <View style={styles.ratioBox}>
      <Text style={styles.ratioLabel}>{label}</Text>
      <Text style={styles.ratioValue}>{value}</Text>
      <Text style={styles.ratioNote}>{note}</Text>
    </View>
  );
}

/* ------------------------ Styles ------------------------ */

const styles = StyleSheet.create({
  loadingScreen: {
    flex: 1,
    backgroundColor: "#0B0D0F",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  loadingText: { color: "white", marginTop: 10, fontWeight: "800" },
  loadingSub: { color: "#7D8A90", marginTop: 6, textAlign: "center", lineHeight: 18 },

  errorTitle: { color: "white", fontSize: 18, fontWeight: "900", textAlign: "center" },
  errorBody: { color: "#A8B4B9", marginTop: 10, textAlign: "center", lineHeight: 18 },

  retryBtn: { borderRadius: 14, paddingVertical: 14, paddingHorizontal: 22 },
  retryText: { color: "#0B0D0F", fontWeight: "900" },

  emptyText: {
    color: "white",
    textAlign: "center",
    paddingHorizontal: 20,
    lineHeight: 20,
  },

  safeArea: { flex: 1, backgroundColor: "#0B0D0F" },
  pageContent: { paddingHorizontal: GUTTER, paddingBottom: 30 },

  headerRow: {
    marginTop: Platform.OS === "android" ? 10 : 0,
    marginBottom: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  logoPill: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  logoText: { color: "#0B0D0F", fontWeight: "800", fontSize: 18 },
  headerDate: { color: "#9AF65B", fontSize: 14 },

  titleSection: { marginBottom: 12, alignItems: "center" },
  titleCard: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12 },
  titleText: { color: "#0B0D0F", fontWeight: "800", fontSize: 20 },
  subtitle: { marginTop: 8, color: "#8DA6A8", fontSize: 14, textAlign: "center" },

  card: { backgroundColor: "#111417", borderRadius: 18, padding: 16, marginTop: 16 },
  sectionTitle: { fontSize: 20, fontWeight: "700", color: "#C8FFD6", marginBottom: 10 },
  cardHint: { color: "#7D8A90", fontSize: 12, marginBottom: 10 },

  metricsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  metricBox: { width: "48%", backgroundColor: "#0E1215", borderRadius: 16, padding: 14 },
  metricLabel: { color: "#83CDB7", fontSize: 12 },
  metricValue: { color: "#FFF", fontSize: 26, fontWeight: "700" },

  typeCard: { backgroundColor: "#0E1215", borderRadius: 16, padding: 16, alignItems: "center" },
  typeIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  typeIconGlyph: { fontSize: 36, color: "#0B0D0F" },
  typeName: { color: "#FFF", fontSize: 22, fontWeight: "800", marginBottom: 6 },
  typeDesc: { color: "#A8B4B9", textAlign: "center", lineHeight: 20 },

  strRow: { marginBottom: 12 },
  strLabel: { color: "#E9F6F0", marginBottom: 6, fontSize: 16, textTransform: "capitalize" },
  strBarTrack: { height: 12, borderRadius: 8, backgroundColor: "#1B2125", overflow: "hidden" },
  strBarFill: { height: 12, borderRadius: 8 },
  strValue: { color: "#9AF65B", marginTop: 4 },

  ratioRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 10 },
  ratioBox: { width: "48%", backgroundColor: "#0E1215", borderRadius: 14, padding: 12 },
  ratioLabel: { color: "#9AB8BE", fontSize: 12, marginBottom: 4 },
  ratioValue: { color: "#FFF", fontSize: 18, fontWeight: "700", marginBottom: 4 },
  ratioNote: { color: "#8FA0A8", fontSize: 11, lineHeight: 16 },

  ctaOuter: { marginTop: 16 },
  ctaInner: { borderRadius: 14, paddingVertical: 16, alignItems: "center", justifyContent: "center" },
  ctaText: { color: "#0B0D0F", fontWeight: "800", fontSize: 16 },

  definitionNotesBox: {
    marginTop: 12,
    padding: 12,
    borderRadius: 10,
    backgroundColor: "#10151A",
    borderWidth: 1,
    borderColor: "#1F2A33",
  },
  definitionNotesLabel: { color: "#9AF65B", fontSize: 13, fontWeight: "700", marginBottom: 4 },
  definitionNotesText: { color: "#DDE6EA", fontSize: 13, lineHeight: 18 },
});
