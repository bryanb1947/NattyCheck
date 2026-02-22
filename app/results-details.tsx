// app/results-details.tsx
import React, { useEffect, useMemo, useState, useCallback } from "react";
import {
  SafeAreaView,
  ScrollView,
  View,
  Text,
  ActivityIndicator,
  StyleSheet,
  TouchableOpacity,
  Image,
  Dimensions,
  Modal,
  Pressable,
  StatusBar,
  Platform,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

import { supabase } from "@/lib/supabase";
import { getPhotoHistory } from "@/lib/photoHistory";

const { width, height } = Dimensions.get("window");
const GUTTER = 16;

const C = {
  bg: "#0B0D0F",
  card: "#111417",
  card2: "#0E1215",
  border: "rgba(255,255,255,0.08)",
  text: "#E8F0FF",
  dim: "#94A3B8",
  accentA: "#00E6C8",
  accentB: "#9AF65B",
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
  return Number.isFinite(n) ? n : null;
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

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metricBox}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
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

  const openViewer = useCallback((uri: string, label: string) => {
    setViewerUri(uri);
    setViewerLabel(label);
    setViewerOpen(true);
  }, []);

  const closeViewer = useCallback(() => {
    setViewerOpen(false);
    setTimeout(() => {
      setViewerUri(null);
      setViewerLabel("");
    }, 120);
  }, []);

  /* ---------------------------
     Load report from Supabase
  --------------------------- */
  useEffect(() => {
    if (!id) return;

    const load = async () => {
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
    };

    load();
  }, [id]);

  /* ---------------------------
     Load local photo history
  --------------------------- */
  useEffect(() => {
    if (!id) return;

    const loadPhotos = async () => {
      try {
        const entry = await getPhotoHistory(String(id));
        if (entry) setPhotos(entry);
      } catch (err) {
        console.log("Failed to load photo history:", id, err);
      } finally {
        setPhotosLoading(false);
      }
    };

    loadPhotos();
  }, [id]);

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={C.accentA} />
        </View>
      </SafeAreaView>
    );
  }

  if (!report) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <Text style={{ color: C.text, fontWeight: "800" }}>
            No report found.
          </Text>

          <TouchableOpacity
            onPress={() => router.back()}
            style={{ marginTop: 14 }}
          >
            <Text style={{ color: C.accentB, fontWeight: "900" }}>Go back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
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

  const createdLabel = new Date(created_at).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

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

  return (
    <>
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

              <TouchableOpacity
                onPress={closeViewer}
                style={styles.modalCloseBtn}
              >
                <Ionicons name="close" size={22} color="#EAF4F1" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalImageWrap}>
              {viewerUri ? (
                <Image
                  source={{ uri: viewerUri }}
                  style={styles.modalImage}
                  resizeMode="contain"
                />
              ) : null}
            </View>

            <Text style={styles.modalHint}>Tap outside to close</Text>
          </Pressable>
        </Pressable>
      </Modal>

      <SafeAreaView style={styles.safe}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.content}
        >
          {/* Custom header (fixes the off-center look + top spacing) */}
          <View style={styles.topRow}>
            <TouchableOpacity
              onPress={() => router.back()}
              style={styles.backBtn}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Ionicons name="chevron-back" size={26} color={C.text} />
            </TouchableOpacity>

            <View style={{ flex: 1 }}>
              <Text style={styles.title}>Full Analysis Report</Text>
              <Text style={styles.date}>{createdLabel}</Text>
            </View>

            <View style={{ width: 44 }} />
          </View>

          {/* Photos */}
          {!photosLoading && hasAnyPhotos && (
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Captured Photos</Text>
              <Text style={styles.cardHint}>
                Stored on your device only — never uploaded.
              </Text>

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
                      <Image
                        source={{ uri }}
                        style={styles.photoImage}
                        resizeMode="cover"
                      />

                      <View style={styles.photoLabelBadge}>
                        <Text style={styles.photoLabelText}>{slide.label}</Text>
                      </View>

                      <View style={styles.expandBadge}>
                        <Ionicons
                          name="expand-outline"
                          size={16}
                          color="#EAF4F1"
                        />
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          )}

          {/* Key Metrics (PremiumResults style) */}
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Key Metrics</Text>

            <View style={styles.metricsGrid}>
              <Metric label="SCORE" value={`${score ?? "—"}`} />
              <Metric
                label="BODY FAT"
                value={
                  safeNumber(bodyfat) !== null ? `${safeNumber(bodyfat)}%` : "—"
                }
              />
              <Metric
                label="SYMMETRY"
                value={
                  safeNumber(symmetry) !== null
                    ? `${safeNumber(symmetry)}%`
                    : "—"
                }
              />
              <Metric
                label="CONFIDENCE"
                value={
                  safeNumber(confidence) !== null
                    ? `${safeNumber(confidence)}%`
                    : "—"
                }
              />
            </View>

            <View style={[styles.metaCards, { marginTop: 12 }]}>
              <View style={styles.metaMini}>
                <Text style={styles.metaMiniLabel}>NATTY</Text>
                <Text
                  style={[
                    styles.metaMiniValue,
                    { color: natty ? C.accentB : "#FF6A6A" },
                  ]}
                >
                  {natty ? "Yes" : "No"}
                </Text>
              </View>

              <View style={styles.metaMini}>
                <Text style={styles.metaMiniLabel}>TYPE</Text>
                <Text style={styles.metaMiniValue}>{type ?? "—"}</Text>
              </View>
            </View>
          </View>

          {/* Muscle breakdown as Strength Bars (PremiumResults style) */}
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Muscle Group Strength Map</Text>
            <Text style={styles.cardHint}>
              These scores judge pure size & structure.
            </Text>

            {muscles ? (
              MUSCLE_ORDER.map((k) =>
                muscles?.[k] !== undefined ? (
                  <StrengthBar key={k} label={k} value={muscles[k]} />
                ) : null
              )
            ) : (
              <Text style={[styles.cardHint, { marginTop: 8 }]}>
                No muscle data saved.
              </Text>
            )}
          </View>

          {/* Symmetry (keep simple) */}
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Symmetry</Text>
            <Text style={{ color: C.text, fontSize: 18, fontWeight: "800" }}>
              {safeNumber(symmetry) !== null ? `${symmetry}%` : "—"}
            </Text>
          </View>

          <View style={{ height: 30 }} />
        </ScrollView>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  content: {
    paddingHorizontal: GUTTER,
    paddingTop: Platform.OS === "android" ? 10 : 6,
    paddingBottom: 30,
  },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },

  topRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  title: { color: C.text, fontSize: 26, fontWeight: "900" },
  date: { color: C.dim, marginTop: 4 },

  card: {
    backgroundColor: C.card,
    borderRadius: 18,
    padding: 16,
    marginTop: 14,
    borderWidth: 1,
    borderColor: C.border,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#C8FFD6",
    marginBottom: 10,
  },
  cardHint: { color: C.dim, fontSize: 12, marginBottom: 10 },

  metricsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  metricBox: {
    width: "48%",
    backgroundColor: C.card2,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
  },
  metricLabel: { color: "#83CDB7", fontSize: 12, fontWeight: "800" },
  metricValue: { color: "#FFF", fontSize: 26, fontWeight: "900", marginTop: 4 },

  metaCards: { flexDirection: "row", gap: 12 },
  metaMini: {
    flex: 1,
    backgroundColor: C.card2,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
  },
  metaMiniLabel: { color: "#83CDB7", fontSize: 12, fontWeight: "900" },
  metaMiniValue: { color: "#FFF", fontSize: 18, fontWeight: "900", marginTop: 6 },

  strRow: { marginBottom: 12 },
  strLabel: { color: "#E9F6F0", marginBottom: 6, fontSize: 16, fontWeight: "700" },
  strBarTrack: {
    height: 12,
    borderRadius: 8,
    backgroundColor: "#1B2125",
    overflow: "hidden",
  },
  strBarFill: { height: 12, borderRadius: 8 },
  strValue: { color: C.accentB, marginTop: 4, fontWeight: "800" },

  /* Photos */
  photoSlide: {
    width: width - GUTTER * 2,
    height: (width - GUTTER * 2) * 1.25,
    borderRadius: 16,
    overflow: "hidden",
    marginRight: 12,
    backgroundColor: "#050505",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
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
  photoLabelText: { color: "#FFFFFF", fontSize: 13, fontWeight: "800" },
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

  /* Modal */
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
    backgroundColor: "rgba(154,246,91,0.12)",
    borderWidth: 1,
    borderColor: "rgba(154,246,91,0.25)",
  },
  modalPillText: { color: C.accentB, fontWeight: "900", fontSize: 12 },
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