// app/premiumresults.tsx
// ------------------------------------------------------
// Premium Results Screen
// - Gated by /profiles entitlements (free/trial/paid)
// - Renders full physique analysis (score, bodyfat, symmetry,
//   muscle groups, definition, ratios, AI notes)
// - Saves report → analysis_history
// - Generates workout via backend /workout/generate
//   (backend uses onboarding + cardio/abs logic
//    + training_summary from workout history)
// ------------------------------------------------------

import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Platform,
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

const GUTTER = 16;

const BACKEND_BASE = "https://nattycheck-backend-production.up.railway.app";

/* ---------------------------------------------------------
 * TRAINING SUMMARY HELPERS (for GPT)
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

  // Chest
  if (
    muscle.includes("chest") ||
    name.includes("bench") ||
    (name.includes("press") && !name.includes("shoulder"))
  ) {
    buckets.add("chest");
  }

  // Back
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

  // Delts / shoulders
  if (
    muscle.includes("rear") &&
    (muscle.includes("delt") || muscle.includes("shoulder"))
  ) {
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

  // Arms
  if (muscle.includes("bicep") || name.includes("curl")) {
    buckets.add("biceps");
  }
  if (
    muscle.includes("tricep") ||
    name.includes("skullcrusher") ||
    name.includes("tricep") ||
    name.includes("pushdown") ||
    name.includes("dip")
  ) {
    buckets.add("triceps");
  }

  // Legs
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
  if (muscle.includes("calf") || name.includes("calf")) {
    buckets.add("calves");
  }

  // Core
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
    const d = new Date(s.date);
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

  // Include zero-volume buckets so "undertrained" is meaningful.
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
 * ENTITLEMENT HELPERS (free / trial / paid)
 * --------------------------------------------------------*/

function normalizePlanToProOrFree(profile: any): "pro" | "free" {
  const rawPlan = String(profile?.plan || "").toLowerCase();
  const isPremium = profile?.is_premium === true;

  const premiumUntilStr = profile?.premium_until;
  const premiumUntil =
    typeof premiumUntilStr === "string" ? new Date(premiumUntilStr) : null;
  const premiumStillActive =
    premiumUntil instanceof Date &&
    !isNaN(premiumUntil.getTime()) &&
    premiumUntil.getTime() > Date.now();

  const trialActive = profile?.trial_active === true;

  const paidPlan =
    rawPlan === "pro" ||
    rawPlan === "premium" ||
    rawPlan === "paid" ||
    rawPlan === "plus";

  // store supports only "free" | "pro"
  // trial behaves like pro for unlock.
  if (isPremium || paidPlan || premiumStillActive || trialActive) return "pro";
  return "free";
}

/* ---------------------------------------------------------
 * RESULT SHAPE HELPERS (prevents "blank screen" on wrapper)
 * --------------------------------------------------------*/

function unwrapAnalysis(obj: any): any {
  if (!obj || typeof obj !== "object") return obj;

  const cand =
    obj.result ||
    obj.analysis ||
    obj.data ||
    obj.payload ||
    obj.output ||
    obj.response;

  if (cand && typeof cand === "object") return cand;
  return obj;
}

function isNonEmptyRecord(v: any): boolean {
  return (
    !!v &&
    typeof v === "object" &&
    !Array.isArray(v) &&
    Object.keys(v).length > 0
  );
}

function pickFirst<T>(...vals: T[]): T | undefined {
  for (const v of vals) {
    if (v !== undefined && v !== null) return v;
  }
  return undefined;
}

function safeNumber(v: any): number | null {
  if (v === undefined || v === null) return null;
  const n = typeof v === "number" ? v : Number(v);
  return isNaN(n) ? null : n;
}

/* ---------------------------------------------------------
 * COMPONENT
 * --------------------------------------------------------*/

export default function PremiumResults() {
  const router = useRouter();

  const rawResult = useResultsStore((s) => s.last);
  const result = useMemo(() => unwrapAnalysis(rawResult), [rawResult]);

  const userId = useAuthStore((s) => s.userId);
  const email = useAuthStore((s) => s.email);
  const setIdentity = useAuthStore((s) => s.setIdentity);
  const setPlan = useAuthStore((s) => s.setPlan);
  const hasHydrated = useAuthStore.persist.hasHydrated();

  const setWorkout = useWorkoutStore((s) => s.setWorkout);
  const workoutSessions = useWorkoutHistoryStore((s) => s.sessions);

  const trainingSummary = useMemo(
    () => buildTrainingSummary(workoutSessions || []),
    [workoutSessions]
  );

  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (!hasHydrated) return;
    validateAccess();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasHydrated]);

  async function validateAccess() {
    try {
      if (!userId) {
        router.replace("/login");
        return;
      }

      // Keep identity synced (plan comes from DB)
      setIdentity({ userId, email });

      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();

      if (error) {
        console.log("❌ Profile fetch error in PremiumResults:", error);
        setPlan("free");
        router.replace("/paywall");
        return;
      }

      if (!data) {
        console.log("⚠️ No profiles row found. Treating as FREE → paywall.");
        setPlan("free");
        router.replace("/paywall");
        return;
      }

      const normalized = normalizePlanToProOrFree(data);
      setPlan(normalized);

      if (normalized !== "pro") {
        router.replace("/paywall");
        return;
      }
    } catch (e) {
      console.log("❌ validateAccess crashed:", e);
      setPlan("free");
      router.replace("/paywall");
      return;
    } finally {
      setChecking(false);
    }
  }

  useEffect(() => {
    if (!rawResult) return;

    const unwrapped = unwrapAnalysis(rawResult);

    const dbgGroups =
      pickFirst(
        (unwrapped as any)?.groups,
        (unwrapped as any)?.muscles,
        (unwrapped as any)?.muscle_groups,
        (unwrapped as any)?.muscleScores
      ) || {};

    const dbgDefinition =
      pickFirst(
        (unwrapped as any)?.definition,
        (unwrapped as any)?.def,
        (unwrapped as any)?.definition_scores
      ) || {};

    console.log("✅ PremiumResults hydrated, result snapshot:", {
      raw_keys: Object.keys(rawResult || {}),
      unwrapped_keys: Object.keys(unwrapped || {}),
      id:
        (unwrapped as any)?.id ??
        (unwrapped as any)?.analysisId ??
        (unwrapped as any)?.report_id,
      score: (unwrapped as any)?.score ?? (unwrapped as any)?.overall_score,
      hasGroups: isNonEmptyRecord(dbgGroups),
      hasDefinition: isNonEmptyRecord(dbgDefinition),
      created_at: (unwrapped as any)?.created_at,
    });

    console.log("📊 Training summary for GPT:", trainingSummary);
  }, [rawResult, trainingSummary]);

  if (!hasHydrated || checking || !rawResult) {
    return (
      <SafeAreaView style={styles.loadingScreen}>
        <Text style={{ color: "white" }}>Loading full analysis…</Text>
      </SafeAreaView>
    );
  }

  // Backend may return { ok:false } OR { success:false }
  if ((result as any)?.ok === false || (result as any)?.success === false) {
    return (
      <SafeAreaView style={styles.loadingScreen}>
        <Text style={{ color: "white", textAlign: "center", paddingHorizontal: 20 }}>
          We couldn’t read your photos. Please retake your shots.
        </Text>
      </SafeAreaView>
    );
  }

  const parsed: any = result || {};

  const analysisId: string | undefined =
    parsed.id || parsed.analysisId || parsed.report_id;

  const createdAtISO: string =
    typeof parsed.created_at === "string"
      ? parsed.created_at
      : new Date().toISOString();

  const headerDateLabel = new Date(createdAtISO).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  const groups: Record<string, number> =
    pickFirst(
      parsed.groups,
      parsed.muscles,
      parsed.muscle_groups,
      parsed.muscleScores
    ) || {};

  const advanced: Record<string, number> =
    pickFirst(parsed.advanced, parsed.ratios, parsed.metrics) || {};

  const definition: Record<string, number> =
    pickFirst(parsed.definition, parsed.def, parsed.definition_scores) || {};

  const definitionNotes: string =
    pickFirst(parsed.definitionNotes, parsed.definition_notes, parsed.def_notes) ||
    "";

  const definitionSource: string =
    pickFirst(parsed.definitionSource, parsed.definition_source) || "rule_only";

  const score = pickFirst(parsed.score, parsed.overall_score, parsed.gptScore);
  const bodyfat = pickFirst(parsed.bodyfat, parsed.body_fat);
  const symmetry = pickFirst(parsed.symmetry, parsed.symmetry_score);
  const confidence = pickFirst(parsed.confidence, parsed.confidence_score);

  const trainingLevel = pickFirst(
    parsed.trainingLevel,
    parsed.type,
    parsed.physique_type
  );

  const detailedSummary = pickFirst(
    parsed.detailedSummary,
    parsed.summary,
    parsed.notes
  );

  const hasAnything =
    score !== undefined ||
    bodyfat !== undefined ||
    symmetry !== undefined ||
    isNonEmptyRecord(groups) ||
    isNonEmptyRecord(definition);

  if (!hasAnything) {
    return (
      <SafeAreaView style={styles.loadingScreen}>
        <Text style={{ color: "white", textAlign: "center", paddingHorizontal: 20 }}>
          PremiumResults loaded, but the analysis payload is missing the fields
          needed to render (score / groups / definition).
          {"\n\n"}
          This usually means analyzing.tsx stored a wrapper object or only an id.
        </Text>
        <TouchableOpacity
          onPress={() => router.replace("/(tabs)/analyze")}
          style={{ marginTop: 18 }}
        >
          <Text style={{ color: "#9AF65B", fontWeight: "800" }}>
            Back to Analyze
          </Text>
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

  const swr = safeNumber(advanced.shoulder_waist_ratio);
  const ltr = safeNumber(advanced.leg_torso_ratio);
  const armImb = safeNumber(advanced.arm_imbalance);
  const qh = safeNumber(advanced.quad_hamstring_ratio);

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
    if (!userId) {
      Alert.alert("Login required", "Please sign in again.");
      router.replace("/login");
      return;
    }

    if (!analysisId) {
      console.log("❌ No analysisId found:", parsed);
      Alert.alert("Unable to save", "Missing analysis ID.");
      return;
    }

    try {
      setSaving(true);

      const payload = {
        id: analysisId,
        user_id: userId,
        score: safeNumber(score),
        natty: parsed.natty ?? null,
        bodyfat: safeNumber(bodyfat),
        symmetry: safeNumber(symmetry),
        confidence: safeNumber(confidence),
        type: trainingLevel ?? null,
        // Store the strength map (your table column is named "muscles")
        muscles: isNonEmptyRecord(groups) ? groups : null,
        created_at: createdAtISO,
      };

      console.log("💾 Upserting analysis_history:", payload);

      const { error } = await supabase
        .from("analysis_history")
        .upsert(payload, { onConflict: "id" });

      if (error) {
        console.log("❌ Save error:", error);
        Alert.alert("Save failed", error.message);
      } else {
        Alert.alert("Saved!", "Your analysis is stored correctly.");
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleGenerateWorkout() {
    if (!userId) {
      Alert.alert("Login required", "Please sign in again.");
      router.replace("/login");
      return;
    }

    if (!analysisId) {
      Alert.alert("Missing analysis", "No analysisId found.");
      return;
    }

    try {
      setGenerating(true);

      // ✅ FIXED: no double /workout/workout
      const endpoint = `${BACKEND_BASE}/workout/generate`;

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

      console.log("📨 Sending workout generation request…", {
        endpoint,
        workoutPayload,
      });

      const resp = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(workoutPayload),
      });

      const json = await resp.json().catch(() => null);
      console.log("📥 Workout plan response:", json);

      if (!resp.ok) {
        const msg =
          json?.detail ||
          json?.message ||
          `Workout generation failed (HTTP ${resp.status}).`;
        Alert.alert("Generation failed", msg);
        return;
      }

      if (!json || json.ok !== true || !json.plan) {
        Alert.alert(
          "Generation failed",
          json?.message || "Could not generate a workout plan."
        );
        return;
      }

      try {
        setWorkout(json.plan);
        console.log("💪 Workout saved to useWorkoutStore.", json.plan);
      } catch (err) {
        console.log("⚠️ Zustand workout save error:", err);
      }

      Alert.alert(
        "Workout Ready",
        "Your custom routine (lifting + cardio + abs) has been generated."
      );
      router.push("/workout");
    } catch (err: any) {
      console.log("❌ WORKOUT GENERATION ERROR:", err);
      Alert.alert("Error", "Something went wrong while generating your routine.");
    } finally {
      setGenerating(false);
    }
  }

  function handleCancel() {
    router.replace("/(tabs)/analyze");
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.pageContent}
      >
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
          <Text style={styles.subtitle}>
            Brutal breakdown of size, symmetry & definition
          </Text>
        </View>

        {/* KEY METRICS */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Key Metrics</Text>

          <View style={styles.metricsGrid}>
            <Metric label="SCORE" value={`${score ?? "—"}`} />
            <Metric
              label="BODY FAT"
              value={
                bodyfat !== undefined && bodyfat !== null ? `${bodyfat}%` : "—"
              }
            />
            <Metric
              label="SYMMETRY"
              value={
                symmetry !== undefined && symmetry !== null ? `${symmetry}%` : "—"
              }
            />
            <Metric
              label="CONFIDENCE"
              value={
                confidence !== undefined && confidence !== null
                  ? `${confidence}%`
                  : "—"
              }
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

        {/* MUSCLE GROUP STRENGTH */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Muscle Group Strength Map</Text>
          <Text style={styles.cardHint}>These scores judge pure size & structure.</Text>

          {MUSCLE_ORDER.map((muscle) =>
            groups?.[muscle] !== undefined ? (
              <StrengthBar key={muscle} label={muscle} value={groups[muscle] as number} />
            ) : null
          )}
        </View>

        {/* DEFINITION */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Muscle Definition Breakdown</Text>
          <Text style={styles.cardHint}>This is how sharp you look — not just size.</Text>

          {DEF_ORDER.map((key) =>
            definition?.[key] !== undefined ? (
              <StrengthBar key={key} label={key} value={definition[key] as number} />
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

        {/* PROPORTION RATIOS */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Proportion Ratios</Text>

          <View style={styles.ratioRow}>
            <Ratio
              label="Shoulder / Waist"
              value={fmt(swr, 2)}
              note={describeSWR(swr)}
            />
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

        {/* SAVE REPORT */}
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

        {/* WORKOUT PLAN */}
        <TouchableOpacity
          style={styles.ctaOuter}
          onPress={handleGenerateWorkout}
          activeOpacity={0.9}
          disabled={generating}
        >
          <LinearGradient colors={["#00E6C8", "#9AF65B"]} style={styles.ctaInner}>
            <Text style={styles.ctaText}>
              {generating ? "Generating…" : "View Workout Plan"}
            </Text>
          </LinearGradient>
        </TouchableOpacity>

        {/* CANCEL */}
        <TouchableOpacity
          style={[styles.ctaOuter, { marginBottom: 30 }]}
          onPress={handleCancel}
          activeOpacity={0.8}
        >
          <View
            style={[
              styles.ctaInner,
              { backgroundColor: "#1A1D21", borderRadius: 14 },
            ]}
          >
            <Text style={[styles.ctaText, { color: "#C7D0D8" }]}>Cancel</Text>
          </View>
        </TouchableOpacity>

        <View style={{ height: 50 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

/************************ COMPONENTS ************************/

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

function Ratio({
  label,
  value,
  note,
}: {
  label: string;
  value: string;
  note: string;
}) {
  return (
    <View style={styles.ratioBox}>
      <Text style={styles.ratioLabel}>{label}</Text>
      <Text style={styles.ratioValue}>{value}</Text>
      <Text style={styles.ratioNote}>{note}</Text>
    </View>
  );
}

/************************ STYLES ************************/

const styles = StyleSheet.create({
  loadingScreen: {
    flex: 1,
    backgroundColor: "#0B0D0F",
    justifyContent: "center",
    alignItems: "center",
  },
  safeArea: {
    flex: 1,
    backgroundColor: "#0B0D0F",
  },
  pageContent: {
    paddingHorizontal: GUTTER,
    paddingBottom: 30,
  },
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
  logoText: {
    color: "#0B0D0F",
    fontWeight: "800",
    fontSize: 18,
  },
  headerDate: {
    color: "#9AF65B",
    fontSize: 14,
  },
  titleSection: {
    marginBottom: 12,
    alignItems: "center",
  },
  titleCard: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  titleText: {
    color: "#0B0D0F",
    fontWeight: "800",
    fontSize: 20,
  },
  subtitle: {
    marginTop: 8,
    color: "#8DA6A8",
    fontSize: 14,
    textAlign: "center",
  },
  card: {
    backgroundColor: "#111417",
    borderRadius: 18,
    padding: 16,
    marginTop: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#C8FFD6",
    marginBottom: 10,
  },
  cardHint: {
    color: "#7D8A90",
    fontSize: 12,
    marginBottom: 10,
  },
  metricsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  metricBox: {
    width: "48%",
    backgroundColor: "#0E1215",
    borderRadius: 16,
    padding: 14,
  },
  metricLabel: {
    color: "#83CDB7",
    fontSize: 12,
  },
  metricValue: {
    color: "#FFF",
    fontSize: 26,
    fontWeight: "700",
  },
  typeCard: {
    backgroundColor: "#0E1215",
    borderRadius: 16,
    padding: 16,
    alignItems: "center",
  },
  typeIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  typeIconGlyph: {
    fontSize: 36,
    color: "#0B0D0F",
  },
  typeName: {
    color: "#FFF",
    fontSize: 22,
    fontWeight: "800",
    marginBottom: 6,
  },
  typeDesc: {
    color: "#A8B4B9",
    textAlign: "center",
    lineHeight: 20,
  },
  strRow: {
    marginBottom: 12,
  },
  strLabel: {
    color: "#E9F6F0",
    marginBottom: 6,
    fontSize: 16,
    textTransform: "capitalize",
  },
  strBarTrack: {
    height: 12,
    borderRadius: 8,
    backgroundColor: "#1B2125",
    overflow: "hidden",
  },
  strBarFill: {
    height: 12,
    borderRadius: 8,
  },
  strValue: {
    color: "#9AF65B",
    marginTop: 4,
  },
  ratioRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 10,
  },
  ratioBox: {
    width: "48%",
    backgroundColor: "#0E1215",
    borderRadius: 14,
    padding: 12,
  },
  ratioLabel: {
    color: "#9AB8BE",
    fontSize: 12,
    marginBottom: 4,
  },
  ratioValue: {
    color: "#FFF",
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 4,
  },
  ratioNote: {
    color: "#8FA0A8",
    fontSize: 11,
    lineHeight: 16,
  },
  ctaOuter: {
    marginTop: 16,
  },
  ctaInner: {
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  ctaText: {
    color: "#0B0D0F",
    fontWeight: "800",
    fontSize: 16,
  },
  definitionNotesBox: {
    marginTop: 12,
    padding: 12,
    borderRadius: 10,
    backgroundColor: "#10151A",
    borderWidth: 1,
    borderColor: "#1F2A33",
  },
  definitionNotesLabel: {
    color: "#9AF65B",
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 4,
  },
  definitionNotesText: {
    color: "#DDE6EA",
    fontSize: 13,
    lineHeight: 18,
  },
});
