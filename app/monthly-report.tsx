// app/monthly-report.tsx
import React, { useEffect, useState, useMemo, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Share,
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { Stack, useRouter, useLocalSearchParams } from "expo-router";

import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/store/useAuthStore";
import { getPhotoHistory } from "@/lib/photoHistory";

const { width } = Dimensions.get("window");

const colors = {
  bg: "#050707",
  card: "#101417",
  cardBorder: "#1B2429",
  text: "#FFFFFF",
  dim: "#9AA4AF",
  accent: "#B8FF47",
  accentSoft: "#00F5A0",
  accent2: "#00D9F5",
};

const gradient = [colors.accentSoft, colors.accent2];

type AnalysisRow = {
  id: string;
  user_id: string;
  score: number | null;
  bodyfat: number | null;
  symmetry: number | null;
  confidence: number | null;
  type: string | null;
  muscles: Record<string, number> | null;
  created_at: string;
};

type PhotoSet = {
  frontUri?: string;
  sideUri?: string;
  backUri?: string;
};

type LoggedSetDb = {
  target: number | string;
  actual?: number | null;
};

type LoggedExerciseDb = {
  id?: string;
  name: string;
  muscle: string;
  sets: LoggedSetDb[];
  day_id?: string;
  day_name?: string;
};

type WorkoutSessionRow = {
  id: string;
  user_id: string;

  timestamp?: string | null;
  date?: string | null;

  workout_type?: "ai" | "custom" | string | null;
  workout_id?: string | null;
  workout_name?: string | null;

  exercises?: LoggedExerciseDb[] | null;
  entries?: LoggedExerciseDb[] | null;

  total_sets?: number | null;
  completed_sets?: number | null;
  completed_reps?: number | null;
};

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

const BUCKET_LABEL: Record<VolumeBucket, string> = {
  chest: "Chest",
  back: "Back",
  front_delts: "Front Delts",
  side_delts: "Side Delts",
  rear_delts: "Rear Delts",
  biceps: "Biceps",
  triceps: "Triceps",
  quads: "Quads",
  hamstrings: "Hamstrings",
  glutes: "Glutes",
  calves: "Calves",
  core: "Core / Abs",
};

/* ---------------------------------------------------------
 * Helpers
 * --------------------------------------------------------*/

function safeNumber(v: any): number | null {
  if (v === undefined || v === null) return null;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

function normalizeText(v: any) {
  return String(v ?? "")
    .toLowerCase()
    .trim()
    .replace(/[_\-]/g, " ")
    .replace(/\s+/g, " ");
}

function getMonthRange(year: number, monthIndex: number) {
  const start = new Date(year, monthIndex, 1, 0, 0, 0, 0);
  const nextMonthStart = new Date(year, monthIndex + 1, 1, 0, 0, 0, 0);
  const endOfMonth = new Date(nextMonthStart.getTime() - 1);
  return { start, nextMonthStart, endOfMonth };
}

function formatMonthLabel(d: Date) {
  return d.toLocaleDateString(undefined, { month: "long", year: "numeric" });
}

function daysUntil(date: Date) {
  const now = new Date();
  const ms = date.getTime() - now.getTime();
  const days = Math.ceil(ms / (1000 * 60 * 60 * 24));
  return days < 0 ? 0 : days;
}

function formatDelta(
  newVal?: number | null,
  oldVal?: number | null,
  suffix: string = ""
) {
  if (newVal == null || oldVal == null) return "—";
  const diff = newVal - oldVal;
  if (Math.abs(diff) < 0.01) return `0${suffix}`;
  const sign = diff > 0 ? "+" : "";
  return `${sign}${diff.toFixed(1)}${suffix}`;
}

function formatDeltaInt(newVal?: number | null, oldVal?: number | null) {
  if (newVal == null || oldVal == null) return "—";
  const diff = newVal - oldVal;
  if (diff === 0) return "0";
  const sign = diff > 0 ? "+" : "";
  return `${sign}${Math.round(diff)}`;
}

function formatShortDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function getSessionExercises(s: WorkoutSessionRow): LoggedExerciseDb[] {
  const exs =
    (Array.isArray(s.exercises) && s.exercises) ||
    (Array.isArray(s.entries) && s.entries) ||
    [];
  return exs.filter(Boolean) as LoggedExerciseDb[];
}

/**
 * ✅ Improved bucket mapping:
 * - Recognizes "legs", "lower body", "quadriceps", "hamstrings", etc.
 * - Uses both muscle field AND exercise name heuristics.
 * - Designed to never miss leg work if you logged it.
 */
function mapExerciseToBuckets(ex: LoggedExerciseDb): VolumeBucket[] {
  const muscle = normalizeText(ex.muscle);
  const name = normalizeText(ex.name);

  const buckets: Set<VolumeBucket> = new Set();

  // Chest
  if (
    muscle.includes("chest") ||
    muscle.includes("pec") ||
    name.includes("bench") ||
    (name.includes("press") &&
      !name.includes("shoulder") &&
      !name.includes("overhead"))
  ) {
    buckets.add("chest");
  }

  // Back
  if (
    muscle.includes("back") ||
    muscle.includes("lat") ||
    muscle.includes("lats") ||
    muscle.includes("trap") ||
    muscle.includes("traps") ||
    name.includes("row") ||
    name.includes("pulldown") ||
    name.includes("pull down") ||
    name.includes("pullup") ||
    name.includes("pull up") ||
    name.includes("chinup") ||
    name.includes("chin up") ||
    name.includes("deadlift") ||
    name.includes("rack pull")
  ) {
    buckets.add("back");
  }

  // Delts / shoulders
  const isDelt = muscle.includes("delt") || muscle.includes("shoulder");

  if (
    isDelt &&
    (muscle.includes("rear") ||
      name.includes("rear delt") ||
      name.includes("face pull"))
  ) {
    buckets.add("rear_delts");
  }

  if (
    isDelt &&
    (muscle.includes("side") ||
      muscle.includes("lateral") ||
      name.includes("lateral raise") ||
      name.includes("upright row"))
  ) {
    buckets.add("side_delts");
  }

  if (
    isDelt &&
    (muscle.includes("front") ||
      muscle.includes("anterior") ||
      name.includes("front raise") ||
      name.includes("overhead press") ||
      name.includes("shoulder press") ||
      name.includes("military press"))
  ) {
    buckets.add("front_delts");
  }

  // generic shoulders/delts
  if (
    (muscle.includes("shoulder") || muscle.includes("delt")) &&
    !buckets.has("front_delts") &&
    !buckets.has("side_delts") &&
    !buckets.has("rear_delts")
  ) {
    buckets.add("front_delts");
    buckets.add("side_delts");
  }

  // Arms
  if (
    muscle.includes("bicep") ||
    muscle.includes("biceps") ||
    name.includes("curl")
  ) {
    buckets.add("biceps");
  }

  if (
    muscle.includes("tricep") ||
    muscle.includes("triceps") ||
    name.includes("skullcrusher") ||
    name.includes("pushdown") ||
    name.includes("tricep") ||
    name.includes("dip") ||
    name.includes("close grip bench")
  ) {
    buckets.add("triceps");
  }

  // Legs (critical)
  const saysLegs =
    muscle.includes("leg") ||
    muscle.includes("lower body") ||
    muscle.includes("lower") ||
    muscle.includes("legs") ||
    muscle.includes("quad") ||
    muscle.includes("quadricep") ||
    muscle.includes("ham") ||
    muscle.includes("hamstring") ||
    muscle.includes("glute") ||
    muscle.includes("calf");

  // Quads
  if (
    muscle.includes("quad") ||
    muscle.includes("quadricep") ||
    name.includes("squat") ||
    name.includes("hack squat") ||
    name.includes("leg press") ||
    name.includes("leg extension") ||
    name.includes("front squat") ||
    name.includes("split squat") ||
    name.includes("bulgarian") ||
    name.includes("lunge") ||
    name.includes("step up")
  ) {
    buckets.add("quads");
  }

  // Hamstrings
  if (
    muscle.includes("ham") ||
    muscle.includes("hamstring") ||
    name.includes("leg curl") ||
    name.includes("romanian") ||
    name.includes("rdl") ||
    name.includes("stiff leg") ||
    name.includes("good morning") ||
    name.includes("hip hinge")
  ) {
    buckets.add("hamstrings");
  }

  // Glutes
  if (
    muscle.includes("glute") ||
    name.includes("hip thrust") ||
    name.includes("glute") ||
    name.includes("bridge") ||
    name.includes("kickback")
  ) {
    buckets.add("glutes");
  }

  // Calves
  if (muscle.includes("calf") || name.includes("calf")) {
    buckets.add("calves");
  }

  // Fallback for generic "legs/lower body"
  if (
    saysLegs &&
    !buckets.has("quads") &&
    !buckets.has("hamstrings") &&
    !buckets.has("glutes") &&
    !buckets.has("calves")
  ) {
    buckets.add("quads");
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
    name.includes("ab wheel") ||
    name.includes("hanging knee raise")
  ) {
    buckets.add("core");
  }

  return Array.from(buckets);
}

/* ---------------------------------------------------------
 * Component
 * --------------------------------------------------------*/

export default function MonthlyPhysiqueReportScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ year?: string; month?: string }>();

  const { userId } = useAuthStore();
  const hasHydratedAuth = useAuthStore.persist.hasHydrated();

  const [loading, setLoading] = useState(true);
  const [analyses, setAnalyses] = useState<AnalysisRow[]>([]);
  const [workouts, setWorkouts] = useState<WorkoutSessionRow[]>([]);
  const [firstPhotos, setFirstPhotos] = useState<PhotoSet | null>(null);
  const [lastPhotos, setLastPhotos] = useState<PhotoSet | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Fullscreen photo viewer
  const [photoViewer, setPhotoViewer] = useState<{
    open: boolean;
    uri: string | null;
    label?: string;
  }>({ open: false, uri: null });

  const openPhoto = useCallback((uri: string, label?: string) => {
    setPhotoViewer({ open: true, uri, label });
  }, []);

  const closePhoto = useCallback(() => {
    setPhotoViewer({ open: false, uri: null });
  }, []);

  const now = new Date();
  const targetYear = params.year
    ? parseInt(String(params.year), 10)
    : now.getFullYear();
  const targetMonthIndex = params.month
    ? parseInt(String(params.month), 10)
    : now.getMonth();

  const { start: monthStart, nextMonthStart, endOfMonth } = useMemo(
    () => getMonthRange(targetYear, targetMonthIndex),
    [targetYear, targetMonthIndex]
  );

  const monthLabel = formatMonthLabel(monthStart);
  const today = new Date();
  const daysRemaining = daysUntil(endOfMonth);
  const monthComplete = today >= endOfMonth;

  /* ---------------------------------------------------------
   * Load month analyses + workout sessions from Supabase
   * --------------------------------------------------------*/
  useEffect(() => {
    if (!hasHydratedAuth) return;

    if (!userId) {
      setError("Login required");
      setLoading(false);
      return;
    }

    const load = async () => {
      try {
        setLoading(true);
        setError(null);

        const analysisPromise = supabase
          .from("analysis_history")
          .select("*")
          .eq("user_id", userId)
          .gte("created_at", monthStart.toISOString())
          .lt("created_at", nextMonthStart.toISOString())
          .order("created_at", { ascending: true });

        const workoutsPrimary = supabase
          .from("workout_sessions")
          .select("*")
          .eq("user_id", userId)
          .gte("timestamp", monthStart.toISOString())
          .lt("timestamp", nextMonthStart.toISOString())
          .order("timestamp", { ascending: true });

        const [analysisRes, workoutResPrimary] = await Promise.all([
          analysisPromise,
          workoutsPrimary,
        ]);

        if (analysisRes.error) {
          console.log("Monthly report analyses error:", analysisRes.error);
          setError(analysisRes.error.message);
          setAnalyses([]);
        } else {
          setAnalyses((analysisRes.data as AnalysisRow[]) || []);
        }

        if (workoutResPrimary.error) {
          console.log(
            "Monthly report workouts (timestamp) error:",
            workoutResPrimary.error
          );

          const workoutResFallback = await supabase
            .from("workout_sessions")
            .select("*")
            .eq("user_id", userId)
            .gte("date", monthStart.toISOString())
            .lt("date", nextMonthStart.toISOString())
            .order("date", { ascending: true });

          if (workoutResFallback.error) {
            console.log(
              "Monthly report workouts (date) error:",
              workoutResFallback.error
            );
            setWorkouts([]);
          } else {
            setWorkouts(
              (workoutResFallback.data as WorkoutSessionRow[]) || []
            );
          }
        } else {
          setWorkouts((workoutResPrimary.data as WorkoutSessionRow[]) || []);
        }
      } catch (e: any) {
        console.log("Monthly report unexpected error:", e);
        setError("Failed to load monthly report.");
        setAnalyses([]);
        setWorkouts([]);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [userId, hasHydratedAuth, monthStart, nextMonthStart]);

  /* ---------------------------------------------------------
   * Load before/after photos for first + last analysis
   * --------------------------------------------------------*/
  useEffect(() => {
    const loadPhotos = async () => {
      if (!analyses.length) {
        setFirstPhotos(null);
        setLastPhotos(null);
        return;
      }

      const first = analyses[0];
      const last = analyses[analyses.length - 1];

      try {
        const [firstEntry, lastEntry] = await Promise.all([
          getPhotoHistory(first.id),
          getPhotoHistory(last.id),
        ]);

        setFirstPhotos(firstEntry);
        setLastPhotos(lastEntry);
      } catch (e) {
        console.log("Monthly report photoHistory error:", e);
        setFirstPhotos(null);
        setLastPhotos(null);
      }
    };

    loadPhotos();
  }, [analyses]);

  /* ---------------------------------------------------------
   * Derived stats (first/last of month)
   * --------------------------------------------------------*/
  const firstAnalysis = analyses[0];
  const lastAnalysis = analyses[analyses.length - 1];
  const hasDataThisMonth = !!firstAnalysis;

  const keyImprovements = useMemo(() => {
    if (!firstAnalysis || !lastAnalysis) {
      return {
        scoreDelta: "—",
        bodyfatDelta: "—",
        symmetryDelta: "—",
        scansThisMonth: analyses.length.toString(),
      };
    }

    return {
      scoreDelta: formatDeltaInt(
        lastAnalysis.score ?? null,
        firstAnalysis.score ?? null
      ),
      bodyfatDelta: formatDelta(
        lastAnalysis.bodyfat ?? null,
        firstAnalysis.bodyfat ?? null,
        "%"
      ),
      symmetryDelta: formatDeltaInt(
        lastAnalysis.symmetry ?? null,
        firstAnalysis.symmetry ?? null
      ),
      scansThisMonth: analyses.length.toString(),
    };
  }, [firstAnalysis, lastAnalysis, analyses.length]);

  const muscleProgress = useMemo(() => {
    if (!firstAnalysis || !lastAnalysis) return [];

    const firstMuscles = (firstAnalysis.muscles || {}) as Record<string, number>;
    const lastMuscles = (lastAnalysis.muscles || {}) as Record<string, number>;

    const keys: { key: string; label: string }[] = [
      { key: "shoulders", label: "Shoulders" },
      { key: "chest", label: "Chest" },
      { key: "back", label: "Back" },
      { key: "arms", label: "Arms" },
      { key: "core", label: "Core" },
      { key: "glutes", label: "Glutes" },
      { key: "quads", label: "Quads" },
      { key: "hamstrings", label: "Hamstrings" },
      { key: "calves", label: "Calves" },
    ];

    return keys.map(({ key, label }) => {
      const before = firstMuscles[key];
      const after = lastMuscles[key];
      if (before == null || after == null) return { label, value: "—" };
      const diff = after - before;
      const sign = diff > 0 ? "+" : diff < 0 ? "" : "";
      return { label, value: `${sign}${diff.toFixed(0)} pts` };
    });
  }, [firstAnalysis, lastAnalysis]);

  /* ---------------------------------------------------------
   * TRAINING STATS (NO TRAINING TIME)
   * --------------------------------------------------------*/
  const trainingStats = useMemo(() => {
    if (!workouts.length) {
      return {
        sessions: 0,
        totalSets: 0,
        completedSets: 0,
        completedReps: 0,
        volume: {} as Record<VolumeBucket, number>,
        mostWorked: [] as VolumeBucket[],
        underTrained: [] as VolumeBucket[],
      };
    }

    const volume: Record<VolumeBucket, number> = {
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

    let totalSets = 0;
    let completedSets = 0;
    let completedReps = 0;

    for (const session of workouts) {
      const hasTotalCols =
        safeNumber(session.total_sets) != null ||
        safeNumber(session.completed_sets) != null ||
        safeNumber(session.completed_reps) != null;

      if (safeNumber(session.total_sets) != null)
        totalSets += safeNumber(session.total_sets)!;
      if (safeNumber(session.completed_sets) != null)
        completedSets += safeNumber(session.completed_sets)!;
      if (safeNumber(session.completed_reps) != null)
        completedReps += safeNumber(session.completed_reps)!;

      const exs = getSessionExercises(session);
      const shouldDeriveTotals = !hasTotalCols;

      for (const ex of exs) {
        const setCount = Array.isArray(ex.sets) ? ex.sets.length : 0;
        if (!setCount) continue;

        if (shouldDeriveTotals) totalSets += setCount;

        if (shouldDeriveTotals) {
          for (const s of ex.sets || []) {
            const actual = safeNumber((s as any).actual);
            if (actual != null) {
              completedSets += 1;
              completedReps += actual;
            }
          }
        }

        const buckets = mapExerciseToBuckets(ex);
        for (const b of buckets) volume[b] += setCount;
      }
    }

    const nonZeroEntries = (Object.entries(volume) as [VolumeBucket, number][])
      .filter(([, v]) => v > 0)
      .sort((a, b) => b[1] - a[1]);

    const mostWorked = nonZeroEntries.slice(0, 2).map(([b]) => b);
    const underTrained = nonZeroEntries.slice(-2).map(([b]) => b).reverse();

    return {
      sessions: workouts.length,
      totalSets,
      completedSets,
      completedReps,
      volume,
      mostWorked,
      underTrained,
    };
  }, [workouts]);

  /* ---------------------------------------------------------
   * Share handler
   * --------------------------------------------------------*/
  const handleShare = async () => {
    try {
      await Share.share({
        message:
          "Just got my Monthly Physique Report on NattyCheck. Tracking progress angle by angle 💪",
      });
    } catch (e) {
      console.log("Share error:", e);
    }
  };

  /* ---------------------------------------------------------
   * Workout Activity card
   * --------------------------------------------------------*/
  const renderWorkoutActivityCard = () => {
    const {
      sessions,
      totalSets,
      completedSets,
      completedReps,
      volume,
      mostWorked,
      underTrained,
    } = trainingStats;

    return (
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Workout Activity (Training Volume)</Text>

        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Workouts Logged</Text>
          <Text style={styles.summaryValue}>{sessions}</Text>
        </View>

        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Total Sets</Text>
          <Text style={styles.summaryValue}>{totalSets}</Text>
        </View>

        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Completed Sets</Text>
          <Text style={styles.summaryValue}>{completedSets}</Text>
        </View>

        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Completed Reps</Text>
          <Text style={styles.summaryValue}>{completedReps}</Text>
        </View>

        {sessions > 0 && (
          <>
            <View style={{ height: 10 }} />

            <Text style={{ color: colors.dim, fontSize: 12, marginBottom: 6 }}>
              Muscle volume this month
            </Text>

            <View style={styles.muscleGrid}>
              {(Object.entries(volume) as [VolumeBucket, number][])
                .filter(([, v]) => v > 0)
                .sort((a, b) => b[1] - a[1])
                .map(([bucket, v]) => (
                  <View key={bucket} style={styles.muscleItem}>
                    <Text style={styles.muscleLabel}>
                      {BUCKET_LABEL[bucket]}
                    </Text>
                    <Text style={styles.muscleValue}>
                      {v} set{v === 1 ? "" : "s"}
                    </Text>
                  </View>
                ))}
            </View>

            {(mostWorked.length > 0 || underTrained.length > 0) && (
              <View style={{ marginTop: 8 }}>
                {mostWorked.length > 0 && (
                  <Text style={styles.trainingHint}>
                    <Text style={{ fontWeight: "700", color: colors.accent }}>
                      Most worked:
                    </Text>{" "}
                    {mostWorked.map((b) => BUCKET_LABEL[b]).join(", ")}
                  </Text>
                )}
                {underTrained.length > 0 && (
                  <Text style={styles.trainingHint}>
                    <Text
                      style={{
                        fontWeight: "700",
                        color: "rgba(255,255,255,0.9)",
                      }}
                    >
                      Undertrained:
                    </Text>{" "}
                    {underTrained.map((b) => BUCKET_LABEL[b]).join(", ")}
                  </Text>
                )}
              </View>
            )}
          </>
        )}

        {sessions === 0 && (
          <Text style={{ color: colors.dim, fontSize: 12, marginTop: 8 }}>
            No workouts logged in NattyCheck this month yet. Start a session
            from the Workouts tab to see your training volume here.
          </Text>
        )}
      </View>
    );
  };

  /* ---------------------------------------------------------
   * Angle card with tappable photos → fullscreen modal
   * --------------------------------------------------------*/
  const renderAngleCard = (title: string, angle: "front" | "side" | "back") => {
    const beforeUri = firstPhotos?.[
      `${angle}Uri` as keyof PhotoSet
    ] as string | undefined;
    const afterUri = lastPhotos?.[
      `${angle}Uri` as keyof PhotoSet
    ] as string | undefined;

    const PhotoBox = ({ uri, label }: { uri?: string; label: string }) => {
      const canOpen = !!uri;
      return (
        <Pressable
          disabled={!canOpen}
          onPress={() => canOpen && openPhoto(uri!, label)}
          style={({ pressed }) => [
            styles.photoSlot,
            canOpen && pressed ? { opacity: 0.85 } : null,
          ]}
        >
          <View style={styles.photoInner}>
            {uri ? (
              <Image
                source={{ uri }}
                style={{ width: "100%", height: "100%" }}
                resizeMode="cover"
              />
            ) : (
              <Ionicons name="camera-outline" size={26} color={colors.dim} />
            )}
          </View>
          <Text style={styles.photoLabel}>{label}</Text>
        </Pressable>
      );
    };

    return (
      <View style={styles.card}>
        <Text style={styles.cardTitle}>{title}</Text>

        <View style={styles.angleRow}>
          <PhotoBox uri={beforeUri} label="First scan" />

          <View style={styles.arrowWrapper}>
            <Ionicons
              name="arrow-forward"
              size={22}
              color={colors.accentSoft}
            />
          </View>

          <PhotoBox uri={afterUri} label="Last scan" />
        </View>
      </View>
    );
  };

  /* ---------------------------------------------------------
   * Header config
   * --------------------------------------------------------*/
  const header = (
    <Stack.Screen
      options={{
        headerShown: true,
        headerTransparent: true,
        headerTitle: "",
        gestureEnabled: true,
        headerLeft: () => (
          <TouchableOpacity
            onPress={() => router.back()}
            style={{ paddingLeft: 10, paddingVertical: 10 }}
          >
            <Ionicons name="chevron-back" size={30} color="white" />
          </TouchableOpacity>
        ),
      }}
    />
  );

  /* ---------------------------------------------------------
   * Render body
   * --------------------------------------------------------*/
  const body = () => {
    if (!hasHydratedAuth || loading) {
      return (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.accent} />
          <Text style={{ color: colors.dim, marginTop: 8 }}>
            Building your monthly report…
          </Text>
        </View>
      );
    }

    if (error === "Login required" || !userId) {
      return (
        <View style={[styles.center, { padding: 24 }]}>
          <Text
            style={{
              color: colors.text,
              fontSize: 18,
              fontWeight: "700",
              marginBottom: 6,
            }}
          >
            Sign in to view your report
          </Text>
          <Text style={{ color: colors.dim, textAlign: "center" }}>
            Monthly reports are linked to your account so we can track your
            progress over time.
          </Text>
        </View>
      );
    }

    if (!hasDataThisMonth) {
      return (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={{
            paddingBottom: 32,
            paddingTop: insets.top + 8,
            flexGrow: 1,
          }}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Monthly Physique Report</Text>
            <View style={styles.headerRow}>
              <View style={styles.monthPill}>
                <Text style={styles.monthText}>{monthLabel}</Text>
              </View>
            </View>
          </View>

          <View style={[styles.card, { marginTop: 8 }]}>
            <Text style={styles.cardTitle}>No scans for this month</Text>
            <Text style={{ color: colors.dim, fontSize: 13, marginTop: 4 }}>
              Do at least one NattyCheck scan this month and we’ll build a full
              before/after report using your first and last scan.
            </Text>
          </View>

          {renderWorkoutActivityCard()}
        </ScrollView>
      );
    }

    if (!monthComplete) {
      return (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={{
            paddingBottom: 32,
            paddingTop: insets.top + 8,
          }}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Monthly Physique Report</Text>

            <View style={styles.headerRow}>
              <View style={styles.monthPill}>
                <Text style={styles.monthText}>{monthLabel}</Text>
              </View>
            </View>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Report unlocks soon</Text>
            <Text style={{ color: colors.dim, fontSize: 13, marginTop: 4 }}>
              We’ll generate your full monthly report using your first and last
              scan of {monthLabel}.
            </Text>

            <View style={{ marginTop: 16, alignItems: "center" }}>
              <Text
                style={{
                  color: colors.text,
                  fontSize: 32,
                  fontWeight: "800",
                }}
              >
                {daysRemaining} day{daysRemaining === 1 ? "" : "s"}
              </Text>
              <Text style={{ color: colors.dim, marginTop: 4 }}>
                Check back on{" "}
                {endOfMonth.toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                })}
              </Text>
            </View>

            <View style={{ marginTop: 18 }}>
              <Text style={{ color: colors.dim, fontSize: 12, marginBottom: 4 }}>
                Scans so far this month
              </Text>
              <Text
                style={{
                  color: colors.accent,
                  fontSize: 20,
                  fontWeight: "800",
                }}
              >
                {analyses.length}
              </Text>
            </View>

            <View style={{ marginTop: 10 }}>
              <Text style={{ color: colors.dim, fontSize: 12, marginBottom: 4 }}>
                Workouts logged this month
              </Text>
              <Text
                style={{
                  color: colors.accent,
                  fontSize: 20,
                  fontWeight: "800",
                }}
              >
                {trainingStats.sessions}
              </Text>
            </View>
          </View>

          {renderWorkoutActivityCard()}
        </ScrollView>
      );
    }

    // Month complete → full report
    const showTrendPill =
      keyImprovements.scoreDelta.startsWith("+") ||
      keyImprovements.scoreDelta.startsWith("-");

    return (
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{ paddingBottom: 32, paddingTop: insets.top + 8 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Monthly Physique Report</Text>

          <View style={styles.headerRow}>
            <View style={styles.monthPill}>
              <Text style={styles.monthText}>{monthLabel}</Text>
            </View>

            {/* ✅ Removed "Stable" concept:
                only show this pill if it's clearly Improved/Declined */}
            {showTrendPill && (
              <View style={styles.trendPill}>
                <Ionicons
                  name={
                    keyImprovements.scoreDelta.startsWith("+")
                      ? "trending-up-outline"
                      : "trending-down-outline"
                  }
                  size={14}
                  color="#043315"
                  style={{ marginRight: 4 }}
                />
                <Text style={styles.trendText}>
                  {keyImprovements.scoreDelta.startsWith("+")
                    ? "Improved"
                    : "Declined"}
                </Text>
              </View>
            )}
          </View>

          <Text style={{ color: colors.dim, fontSize: 12, marginTop: 4 }}>
            Based on scans from {formatShortDate(firstAnalysis.created_at)} to{" "}
            {formatShortDate(lastAnalysis.created_at)}
          </Text>
        </View>

        {renderAngleCard("Front Angle Progress", "front")}
        {renderAngleCard("Side Angle Progress", "side")}
        {renderAngleCard("Back Angle Progress", "back")}

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Key Improvements</Text>

          <View style={styles.keyRow}>
            <View style={styles.keyItem}>
              <Text style={styles.keyLabel}>Physique Score</Text>
              <Text style={styles.keyValuePositive}>
                {keyImprovements.scoreDelta}
              </Text>
            </View>

            <View style={styles.keyItem}>
              <Text style={styles.keyLabel}>Body Fat</Text>
              <Text style={styles.keyValuePositive}>
                {keyImprovements.bodyfatDelta}
              </Text>
            </View>
          </View>

          <View style={[styles.keyRow, { marginTop: 14 }]}>
            <View style={styles.keyItem}>
              <Text style={styles.keyLabel}>Symmetry</Text>
              <Text style={styles.keyValuePositive}>
                {keyImprovements.symmetryDelta}
              </Text>
            </View>

            <View style={styles.keyItem}>
              <Text style={styles.keyLabel}>Scans</Text>
              <Text style={styles.keyValueNeutral}>
                {keyImprovements.scansThisMonth}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Muscle Group Progress</Text>

          <View style={styles.muscleGrid}>
            {muscleProgress.map((m) => (
              <View key={m.label} style={styles.muscleItem}>
                <Text style={styles.muscleLabel}>{m.label}</Text>
                <Text style={styles.muscleValue}>{m.value}</Text>
              </View>
            ))}
          </View>
        </View>

        {renderWorkoutActivityCard()}

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Scan Activity Summary</Text>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Total Scans</Text>
            <Text style={styles.summaryValue}>{analyses.length}</Text>
          </View>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>First Scan</Text>
            <Text style={styles.summaryValue}>
              {formatShortDate(firstAnalysis.created_at)}
            </Text>
          </View>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Last Scan</Text>
            <Text style={styles.summaryValue}>
              {formatShortDate(lastAnalysis.created_at)}
            </Text>
          </View>
        </View>

        <TouchableOpacity onPress={handleShare} style={styles.shareWrapper}>
          <LinearGradient colors={gradient} style={styles.shareButton}>
            <Ionicons
              name="share-outline"
              size={18}
              color="#00110A"
              style={{ marginRight: 6 }}
            />
            <Text style={styles.shareText}>Share</Text>
          </LinearGradient>
        </TouchableOpacity>

        <Text style={styles.footerHint}>
          You’re the only one who sees this until you share it.
        </Text>
      </ScrollView>
    );
  };

  return (
    <>
      {header}
      <SafeAreaView style={styles.safe}>{body()}</SafeAreaView>

      {/* ✅ Fullscreen photo modal (renders once, works everywhere) */}
      <Modal
        visible={photoViewer.open}
        transparent
        animationType="fade"
        onRequestClose={closePhoto}
      >
        <Pressable
          onPress={closePhoto}
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.92)",
            justifyContent: "center",
            alignItems: "center",
            padding: 16,
          }}
        >
          <Pressable
            onPress={(e) => e.stopPropagation()}
            style={{
              width: "100%",
              maxWidth: 420,
              borderRadius: 16,
              overflow: "hidden",
              borderWidth: 1,
              borderColor: "rgba(255,255,255,0.12)",
              backgroundColor: "#000",
            }}
          >
            {!!photoViewer.uri && (
              <Image
                source={{ uri: photoViewer.uri }}
                style={{ width: "100%", height: 520 }}
                resizeMode="contain"
              />
            )}

            <View
              style={{
                padding: 12,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <Text style={{ color: "#fff", fontWeight: "700" }}>
                {photoViewer.label ?? "Photo"}
              </Text>
              <TouchableOpacity onPress={closePhoto} style={{ padding: 6 }}>
                <Ionicons name="close" size={22} color="#fff" />
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

/* -------------------------------------- */
/* STYLES */
/* -------------------------------------- */

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  scroll: { flex: 1, paddingHorizontal: 16 },

  center: { flex: 1, justifyContent: "center", alignItems: "center" },

  header: {
    // NOTE: actual top padding is handled via ScrollView contentContainerStyle
    paddingBottom: 16,
  },
  headerTitle: {
    color: colors.text,
    fontSize: 22,
    fontWeight: "800",
    marginBottom: 8,
  },
  headerRow: { flexDirection: "row", alignItems: "center" },

  monthPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: "#10181A",
    borderWidth: 1,
    borderColor: "#203236",
    marginRight: 8,
  },
  monthText: { color: colors.dim, fontSize: 12, fontWeight: "600" },

  trendPill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: "#B8FF47",
  },
  trendText: { color: "#043315", fontSize: 12, fontWeight: "700" },

  card: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    marginBottom: 14,
  },
  cardTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 12,
  },

  angleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  photoSlot: { flex: 1, alignItems: "center" },
  photoInner: {
    width: width * 0.28,
    height: width * 0.45,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#2A353A",
    backgroundColor: "#061012",
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  photoLabel: { marginTop: 6, color: colors.dim, fontSize: 11 },
  arrowWrapper: { width: 40, alignItems: "center" },

  keyRow: { flexDirection: "row", justifyContent: "space-between" },
  keyItem: { flex: 1, paddingVertical: 6 },
  keyLabel: { color: colors.dim, fontSize: 12, marginBottom: 2 },
  keyValuePositive: { color: colors.accent, fontSize: 18, fontWeight: "800" },
  keyValueNeutral: { color: colors.text, fontSize: 18, fontWeight: "700" },

  muscleGrid: { flexDirection: "row", flexWrap: "wrap", marginTop: 8 },
  muscleItem: {
    width: "48%",
    paddingVertical: 10,
    paddingHorizontal: 10,
    marginBottom: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#212C31",
    backgroundColor: "#050B0D",
  },
  muscleLabel: { color: colors.dim, fontSize: 12, marginBottom: 4 },
  muscleValue: { color: colors.accent, fontSize: 16, fontWeight: "800" },

  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 6,
  },
  summaryLabel: { color: colors.dim, fontSize: 13 },
  summaryValue: { color: colors.text, fontSize: 13, fontWeight: "600" },

  shareWrapper: { marginTop: 4 },
  shareButton: {
    width: "100%",
    borderRadius: 999,
    paddingVertical: 13,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  shareText: { color: "#00110A", fontSize: 16, fontWeight: "800" },
  footerHint: {
    marginTop: 8,
    textAlign: "center",
    color: colors.dim,
    fontSize: 11,
  },

  trainingHint: { color: colors.dim, fontSize: 12, marginTop: 2 },
});
