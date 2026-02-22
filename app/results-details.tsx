// app/results-details.tsx
import React, { useEffect, useMemo, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Dimensions,
  Modal,
  Pressable,
  StatusBar,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, Stack, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

import { supabase } from "../lib/supabase";
import { getPhotoHistory } from "@/lib/photoHistory";

const { width, height } = Dimensions.get("window");
const GUTTER = 16;

const C = {
  bg: "#0B0D0F",
  card: "#111417",
  card2: "#0E1215",
  border: "#1F2A33",
  text: "#FFFFFF",
  dim: "#8DA6A8",
  accentA: "#00E6C8",
  accentB: "#9AF65B",
  accent: "#9AF65B",
};

type PhotoHistoryEntry = {
  frontUri?: string;
  sideUri?: string;
  backUri?: string;
};

type Slide = {
  key: keyof PhotoHistoryEntry;
  label: string;
};

function safeNumber(v: any): number | null {
  if (v === undefined || v === null) return null;
  const n = typeof v === "number" ? v : Number(v);
  return isNaN(n) ? null : n;
}

function getBarColors(value: number): string[] {
  if (value >= 80) return ["#B8FF48", "#E6FF8F"];
  if (value >= 65) return ["#00E6C8", "#9AF65B"];
  if (value >= 55) return ["#FFC857", "#FFEB8A"];
  return ["#FF5C7A", "#FF934F"];
}

function prettyLabel(raw: string) {
  const s = String(raw ?? "").trim();
  if (!s) return "";
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metricBox}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
    </View>
  );
}

function StrengthBar({ label, value }: { label: string; value: number }) {
  const colors = getBarColors(value);
  const w = Math.min(Math.max(value, 5), 100);

  return (
    <View style={styles.strRow}>
      <Text style={styles.strLabel}>{prettyLabel(label)}</Text>

      <View style={styles.strBarTrack}>
        <LinearGradient
          colors={colors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[styles.strBarFill, { width: `${w}%` }]}
        />
      </View>

      <Text style={styles.strValue}>{value}%</Text>
    </View>
  );
}

export default function ResultsDetails() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();

  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [photos, setPhotos] = useState<PhotoHistoryEntry | null>(null);
  const [photosLoading, setPhotosLoading] = useState(true);

  // Fullscreen viewer state
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerUri, setViewerUri] = useState<string | null>(null);
  const [viewerLabel, setViewerLabel] = useState<string>("");

  const slides: Slide[] = useMemo(
    () => [
      { key: "frontUri", label: "Front" },
      { key: "sideUri", label: "Side" },
      { key: "backUri", label: "Back" },
    ],
    []
  );

  const hasAnyPhotos =
    !!photos && (!!photos.frontUri || !!photos.sideUri || !!photos.backUri);

  const loadReport = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("analysis_history")
        .select("*")
        .eq("id", id)
        .single();

      if (error) {
        console.log("ResultsDetails load error:", error);
        setReport(null);
      } else {
        setReport(data);
      }
    } finally {
      setLoading(false);
    }
  }, [id]);

  const loadPhotos = useCallback(async () => {
    if (!id) return;
    try {
      setPhotosLoading(true);
      const entry = await getPhotoHistory(String(id));
      if (entry) setPhotos(entry);
    } catch (err) {
      console.log("Failed to load photo history for report:", id, err);
    } finally {
      setPhotosLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadReport();
  }, [loadReport]);

  useEffect(() => {
    loadPhotos();
  }, [loadPhotos]);

  const openViewer = (uri: string, label: string) => {
    setViewerUri(uri);
    setViewerLabel(label);
    setViewerOpen(true);
  };

  const closeViewer = () => {
    setViewerOpen(false);
    setTimeout(() => {
      setViewerUri(null);
      setViewerLabel("");
    }, 120);
  };

  const headerLeft = (
    <TouchableOpacity
      onPress={() => router.back()}
      activeOpacity={0.85}
      style={styles.backBtn}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
    >
      <Ionicons name="chevron-back" size={22} color="#EAF4F1" />
    </TouchableOpacity>
  );

  // Loading state
  if (loading) {
    return (
      <>
        <Stack.Screen
          options={{
            headerShown: true,
            headerTransparent: true,
            headerTitle: "",
            headerLeft: () => headerLeft,
          }}
        />
        <SafeAreaView style={styles.safe}>
          <View style={styles.center}>
            <ActivityIndicator size="large" color={C.accent} />
            <Text style={styles.loadingText}>Loading report…</Text>
          </View>
        </SafeAreaView>
      </>
    );
  }

  // Missing report
  if (!report) {
    return (
      <>
        <Stack.Screen
          options={{
            headerShown: true,
            headerTransparent: true,
            headerTitle: "",
            headerLeft: () => headerLeft,
          }}
        />
        <SafeAreaView style={styles.safe}>
          <View style={styles.center}>
            <Text style={styles.emptyTitle}>No report found</Text>
            <Text style={styles.emptySub}>This analysis may have been deleted or never saved.</Text>
          </View>
        </SafeAreaView>
      </>
    );
  }

  const {
    score,
    natty,
    bodyfat,
    symmetry,
    confidence,
    muscles,
    created_at,
    type,
  } = report;

  const headerDateLabel = new Date(created_at).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  // Normalize muscle keys to match premium ordering
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

  const musclesObj: Record<string, number> =
    muscles && typeof muscles === "object" && !Array.isArray(muscles) ? muscles : {};

  const hasMuscles = Object.keys(musclesObj).length > 0;

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          headerTransparent: true,
          headerTitle: "",
          gestureEnabled: true,
          headerLeft: () => headerLeft,
        }}
      />

      {/* Fullscreen Photo Viewer */}
      <Modal
        visible={viewerOpen}
        transparent
        animationType="fade"
        onRequestClose={closeViewer}
      >
        <StatusBar barStyle="light-content" />
        <Pressable style={styles.modalBackdrop} onPress={closeViewer}>
          <Pressable style={styles.modalCard} onPress={() => {}}>
            <View style={styles.modalTopBar}>
              <View style={styles.modalPill}>
                <Text style={styles.modalPillText}>{viewerLabel}</Text>
              </View>

              <TouchableOpacity onPress={closeViewer} style={styles.modalCloseBtn} activeOpacity={0.85}>
                <Ionicons name="close" size={20} color="#EAF4F1" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalImageWrap}>
              {viewerUri ? (
                <Image source={{ uri: viewerUri }} style={styles.modalImage} resizeMode="contain" />
              ) : null}
            </View>

            <Text style={styles.modalHint}>Tap outside to close</Text>
          </Pressable>
        </Pressable>
      </Modal>

      <SafeAreaView style={styles.safe} edges={["bottom", "left", "right"]}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.pageContent}
        >
          {/* TITLE */}
          <View style={styles.titleWrap}>
            <Text style={styles.title}>Full Analysis Report</Text>
            <Text style={styles.dim}>{headerDateLabel}</Text>
          </View>

          {/* CAPTURED PHOTOS */}
          {!photosLoading && hasAnyPhotos && (
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Captured Photos</Text>
              <Text style={styles.cardHint}>Stored on-device only — never uploaded.</Text>

              <ScrollView
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                style={{ marginTop: 10 }}
              >
                {slides.map((slide) => {
                  const uri = photos?.[slide.key];
                  if (!uri) return null;

                  return (
                    <TouchableOpacity
                      key={slide.key}
                      activeOpacity={0.9}
                      onPress={() => openViewer(uri, slide.label)}
                      style={styles.photoSlide}
                    >
                      <Image source={{ uri }} style={styles.photoImage} resizeMode="cover" />

                      <View style={styles.photoLabelBadge}>
                        <Text style={styles.photoLabelText}>{slide.label}</Text>
                      </View>

                      <View style={styles.expandBadge}>
                        <Ionicons name="expand-outline" size={16} color="#EAF4F1" />
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          )}

          {/* KEY METRICS (match premium feel) */}
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Key Metrics</Text>

            <View style={styles.metricsGrid}>
              <Metric label="SCORE" value={score !== undefined && score !== null ? String(score) : "—"} />
              <Metric
                label="BODY FAT"
                value={typeof bodyfat === "number" ? `${bodyfat}%` : "—"}
              />
              <Metric
                label="SYMMETRY"
                value={typeof symmetry === "number" ? `${symmetry}%` : "—"}
              />
              <Metric
                label="CONFIDENCE"
                value={typeof confidence === "number" ? `${confidence}%` : "—"}
              />
            </View>

            <View style={styles.miniRow}>
              <View style={styles.miniChip}>
                <Text style={styles.miniLabel}>NATTY</Text>
                <Text style={[styles.miniValue, { color: natty ? C.accent : "#FF6A6A" }]}>
                  {natty ? "Yes" : "No"}
                </Text>
              </View>

              <View style={styles.miniChip}>
                <Text style={styles.miniLabel}>TYPE</Text>
                <Text style={styles.miniValue}>{type ?? "—"}</Text>
              </View>
            </View>
          </View>

          {/* MUSCLE MAP (use same StrengthBar visual language) */}
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Muscle Group Strength Map</Text>
            <Text style={styles.cardHint}>These scores judge pure size & structure.</Text>

            {hasMuscles ? (
              <>
                {MUSCLE_ORDER.map((k) =>
                  musclesObj[k] !== undefined ? (
                    <StrengthBar key={k} label={k} value={Number(musclesObj[k])} />
                  ) : null
                )}

                {/* Render any extra keys not in MUSCLE_ORDER (so we don’t drop data) */}
                {Object.keys(musclesObj)
                  .filter((k) => !MUSCLE_ORDER.includes(k))
                  .sort()
                  .map((k) => (
                    <StrengthBar key={k} label={k} value={Number(musclesObj[k])} />
                  ))}
              </>
            ) : (
              <Text style={[styles.dim, { marginTop: 10 }]}>No muscle data saved.</Text>
            )}
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },

  pageContent: {
    paddingHorizontal: GUTTER,
    paddingTop: 18,
    paddingBottom: 40,
  },

  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  loadingText: { color: C.dim, marginTop: 10, fontWeight: "800" },

  emptyTitle: { color: C.text, fontSize: 18, fontWeight: "900", marginBottom: 6 },
  emptySub: { color: C.dim, textAlign: "center", paddingHorizontal: 18, lineHeight: 18 },

  // Title block
  titleWrap: { paddingTop: Platform.OS === "android" ? 12 : 6, marginBottom: 10 },
  title: { color: C.text, fontSize: 34, fontWeight: "900", letterSpacing: -0.2 },
  dim: { color: C.dim, marginTop: 6 },

  // Header back button (fix alignment)
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    marginLeft: 10,
  },

  // Cards
  card: {
    backgroundColor: C.card,
    borderRadius: 18,
    padding: 16,
    marginTop: 16,
    borderWidth: 1,
    borderColor: C.border,
  },
  sectionTitle: { fontSize: 20, fontWeight: "700", color: "#C8FFD6", marginBottom: 10 },
  cardHint: { color: "#7D8A90", fontSize: 12, marginTop: -2 },

  // Metrics grid
  metricsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12, marginTop: 8 },
  metricBox: { width: "48%", backgroundColor: C.card2, borderRadius: 16, padding: 14 },
  metricLabel: { color: "#83CDB7", fontSize: 12 },
  metricValue: { color: "#FFF", fontSize: 26, fontWeight: "700" },

  miniRow: { flexDirection: "row", gap: 10, marginTop: 12 },
  miniChip: {
    flex: 1,
    backgroundColor: C.card2,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
  },
  miniLabel: { color: "#83CDB7", fontSize: 12, fontWeight: "800" },
  miniValue: { color: C.text, fontSize: 16, fontWeight: "900", marginTop: 4 },

  // Strength bars
  strRow: { marginTop: 12 },
  strLabel: { color: "#E9F6F0", marginBottom: 6, fontSize: 16, textTransform: "capitalize" },
  strBarTrack: { height: 12, borderRadius: 8, backgroundColor: "#1B2125", overflow: "hidden" },
  strBarFill: { height: 12, borderRadius: 8 },
  strValue: { color: C.accent, marginTop: 4, fontWeight: "800" },

  // Photos
  photoSlide: {
    width: width - GUTTER * 2,
    height: (width - GUTTER * 2) * 1.4,
    borderRadius: 16,
    overflow: "hidden",
    marginRight: 12,
    backgroundColor: "#050505",
    borderWidth: 1,
    borderColor: "#1C2627",
  },
  photoImage: { width: "100%", height: "100%" },
  photoLabelBadge: {
    position: "absolute",
    bottom: 12,
    left: 12,
    backgroundColor: "rgba(0,0,0,0.6)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  photoLabelText: { color: "#FFFFFF", fontSize: 13, fontWeight: "700" },
  expandBadge: {
    position: "absolute",
    top: 12,
    right: 12,
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: "rgba(0,0,0,0.55)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },

  // Modal viewer
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.75)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 14,
  },
  modalCard: {
    width: "100%",
    maxWidth: 520,
    backgroundColor: "#0A0E0F",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    overflow: "hidden",
  },
  modalTopBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 10,
  },
  modalPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: "rgba(184,255,71,0.12)",
    borderWidth: 1,
    borderColor: "rgba(184,255,71,0.25)",
  },
  modalPillText: { color: "#B8FF47", fontWeight: "800", fontSize: 12 },
  modalCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.06)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
  },
  modalImageWrap: {
    width: "100%",
    height: Math.min(height * 0.72, 640),
    backgroundColor: "#060909",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 10,
    paddingBottom: 6,
  },
  modalImage: { width: "100%", height: "100%" },
  modalHint: {
    color: "rgba(255,255,255,0.45)",
    fontSize: 11,
    textAlign: "center",
    paddingVertical: 10,
  },
});