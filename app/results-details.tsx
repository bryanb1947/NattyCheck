// app/results-details.tsx

import React, { useEffect, useMemo, useState } from "react";
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
} from "react-native";
import { useLocalSearchParams, Stack, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "../lib/supabase";
import { getPhotoHistory } from "@/lib/photoHistory";

const { width, height } = Dimensions.get("window");

const colors = {
  bg: "#0B0F0F",
  card: "#141818",
  border: "#1E2A2B",
  text: "#FFFFFF",
  dim: "#9CA9AD",
  accent: "#B8FF47",
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

export default function ResultsDetails() {
  const router = useRouter();
  const { id } = useLocalSearchParams();

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

  /* ---------------------------------------
     Load report from Supabase
  --------------------------------------- */
  useEffect(() => {
    if (!id) return;

    const load = async () => {
      const { data, error } = await supabase
        .from("analysis_history")
        .select("*")
        .eq("id", id)
        .single();

      if (error) {
        console.log("Load error:", error);
      } else {
        setReport(data);
      }

      setLoading(false);
    };

    load();
  }, [id]);

  /* ---------------------------------------
     Load local photo history (AsyncStorage)
  --------------------------------------- */
  useEffect(() => {
    if (!id) return;

    const loadPhotos = async () => {
      try {
        const entry = await getPhotoHistory(String(id));
        if (entry) setPhotos(entry);
      } catch (err) {
        console.log("Failed to load photo history for report:", id, err);
      } finally {
        setPhotosLoading(false);
      }
    };

    loadPhotos();
  }, [id]);

  const openViewer = (uri: string, label: string) => {
    setViewerUri(uri);
    setViewerLabel(label);
    setViewerOpen(true);
  };

  const closeViewer = () => {
    setViewerOpen(false);
    // slight delay so close animation feels clean (optional)
    setTimeout(() => {
      setViewerUri(null);
      setViewerLabel("");
    }, 120);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.accent} />
        </View>
      </SafeAreaView>
    );
  }

  if (!report) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <Text style={styles.text}>No report found.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const { score, natty, bodyfat, symmetry, confidence, muscles, created_at, type } =
    report;

  return (
    <>
      {/* ✅ Header */}
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

      {/* Fullscreen Photo Viewer */}
      <Modal
        visible={viewerOpen}
        transparent
        animationType="fade"
        onRequestClose={closeViewer}
      >
        <StatusBar barStyle="light-content" />
        <Pressable style={styles.modalBackdrop} onPress={closeViewer}>
          <Pressable
            style={styles.modalCard}
            onPress={() => {
              // Prevent closing when tapping the image container
            }}
          >
            <View style={styles.modalTopBar}>
              <View style={styles.modalPill}>
                <Text style={styles.modalPillText}>{viewerLabel}</Text>
              </View>

              <TouchableOpacity onPress={closeViewer} style={styles.modalCloseBtn}>
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
        <ScrollView contentContainerStyle={styles.content}>
          {/* HEADER */}
          <Text style={styles.title}>Full Analysis Report</Text>
          <Text style={styles.dim}>
            {new Date(created_at).toLocaleDateString(undefined, {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </Text>

          {/* CAPTURED PHOTOS CAROUSEL */}
          {!photosLoading && hasAnyPhotos && (
            <View style={styles.card}>
              <Text style={[styles.label, { marginBottom: 10 }]}>
                Captured Photos
              </Text>

              <ScrollView
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                style={styles.photoCarousel}
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

                      {/* label */}
                      <View style={styles.photoLabelBadge}>
                        <Text style={styles.photoLabelText}>{slide.label}</Text>
                      </View>

                      {/* subtle “tap to expand” icon */}
                      <View style={styles.expandBadge}>
                        <Ionicons name="expand-outline" size={16} color="#EAF4F1" />
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              <Text style={styles.photoPrivacyNote}>
                Stored securely on your device only — never uploaded.
              </Text>
            </View>
          )}

          {/* MAIN STATS */}
          <View style={styles.card}>
            <Text style={styles.label}>Score</Text>
            <Text style={styles.value}>{score}</Text>

            <View style={styles.row}>
              <View style={styles.statBlock}>
                <Text style={styles.label}>Natty</Text>
                <Text
                  style={[
                    styles.valueSmall,
                    { color: natty ? colors.accent : "#FF6A6A" },
                  ]}
                >
                  {natty ? "Yes" : "No"}
                </Text>
              </View>

              <View style={styles.statBlock}>
                <Text style={styles.label}>Body Fat</Text>
                <Text style={styles.valueSmall}>
                  {typeof bodyfat === "number" ? `${bodyfat}%` : "—"}
                </Text>
              </View>

              <View style={styles.statBlock}>
                <Text style={styles.label}>Confidence</Text>
                <Text style={styles.valueSmall}>
                  {typeof confidence === "number" ? `${confidence}%` : "—"}
                </Text>
              </View>
            </View>

            <Text style={[styles.label, { marginTop: 12 }]}>Type</Text>
            <Text style={styles.valueSmall}>{type ?? "—"}</Text>
          </View>

          {/* MUSCLE BREAKDOWN */}
          <View style={styles.card}>
            <Text style={styles.label}>Muscle Breakdown</Text>

            {muscles ? (
              Object.entries(muscles).map(([muscle, val]: any) => (
                <View key={muscle} style={styles.muscleRow}>
                  <Text style={styles.muscleLabel}>{String(muscle).toUpperCase()}</Text>
                  <Text style={styles.muscleVal}>
                    {typeof val === "number" ? `${val}%` : "—"}
                  </Text>
                </View>
              ))
            ) : (
              <Text style={[styles.dim, { marginTop: 10 }]}>No muscle data saved.</Text>
            )}
          </View>

          {/* SYMMETRY */}
          <View style={styles.card}>
            <Text style={styles.label}>Symmetry</Text>
            <Text style={styles.valueSmall}>
              {typeof symmetry === "number" ? `${symmetry}%` : "—"}
            </Text>
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 20, paddingBottom: 40 },

  center: { flex: 1, justifyContent: "center", alignItems: "center" },

  title: {
    color: colors.text,
    fontSize: 26,
    fontWeight: "900",
    marginBottom: 6,
  },
  text: { color: colors.text },
  dim: { color: colors.dim, marginBottom: 16 },

  card: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    marginBottom: 18,
  },

  label: { color: colors.dim, fontSize: 13 },
  value: { color: colors.accent, fontSize: 28, fontWeight: "800" },
  valueSmall: { color: colors.text, fontSize: 18, fontWeight: "700" },

  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 14,
    gap: 12,
  },
  statBlock: { flex: 1 },

  muscleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
    borderBottomColor: colors.border,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  muscleLabel: { color: colors.text, fontSize: 14, fontWeight: "700" },
  muscleVal: { color: colors.accent, fontSize: 14, fontWeight: "800" },

  /* Photos */
  photoCarousel: {
    marginTop: 10,
  },
  photoSlide: {
    width: width - 40, // padding 20 on each side
    height: (width - 40) * 1.4,
    borderRadius: 16,
    overflow: "hidden",
    marginRight: 12,
    backgroundColor: "#050505",
    borderWidth: 1,
    borderColor: "#1C2627",
  },
  photoImage: {
    width: "100%",
    height: "100%",
  },
  photoLabelBadge: {
    position: "absolute",
    bottom: 12,
    left: 12,
    backgroundColor: "rgba(0,0,0,0.6)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  photoLabelText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },
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
  photoPrivacyNote: {
    color: colors.dim,
    fontSize: 11,
    marginTop: 10,
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
    backgroundColor: "rgba(184,255,71,0.12)",
    borderWidth: 1,
    borderColor: "rgba(184,255,71,0.25)",
  },
  modalPillText: {
    color: colors.accent,
    fontWeight: "800",
    fontSize: 12,
  },
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
  modalImage: {
    width: "100%",
    height: "100%",
  },
  modalHint: {
    color: "rgba(255,255,255,0.45)",
    fontSize: 11,
    textAlign: "center",
    paddingVertical: 10,
  },
});
