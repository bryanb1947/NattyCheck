// app/results-details.tsx

import React, { useEffect, useState } from "react";
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
} from "react-native";
import { useLocalSearchParams, Stack, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "../lib/supabase";
import { getPhotoHistory } from "@/lib/photoHistory";

const { width } = Dimensions.get("window");

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

export default function ResultsDetails() {
  const router = useRouter();
  const { id } = useLocalSearchParams();

  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [photos, setPhotos] = useState<PhotoHistoryEntry | null>(null);
  const [photosLoading, setPhotosLoading] = useState(true);

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
        if (entry) {
          setPhotos(entry);
        }
      } catch (err) {
        console.log("Failed to load photo history for report:", id, err);
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

  const slides = [
    { key: "frontUri" as const, label: "Front" },
    { key: "sideUri" as const, label: "Side" },
    { key: "backUri" as const, label: "Back" },
  ];

  const hasAnyPhotos =
    photos &&
    (photos.frontUri || photos.sideUri || photos.backUri);

  return (
    <>
      {/* ✅ Custom Header WITH Back Button + Swipe Gesture Allowed */}
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

          {/* CAPTURED PHOTOS CAROUSEL (LOCAL-ONLY) */}
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
                    <View key={slide.key} style={styles.photoSlide}>
                      <Image
                        source={{ uri }}
                        style={styles.photoImage}
                        resizeMode="cover"
                      />
                      <View style={styles.photoLabelBadge}>
                        <Text style={styles.photoLabelText}>
                          {slide.label}
                        </Text>
                      </View>
                    </View>
                  );
                })}
              </ScrollView>

              <Text style={styles.photoPrivacyNote}>
                These images are stored securely on your device only and are
                never uploaded to our servers.
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
                <Text style={styles.valueSmall}>{bodyfat}%</Text>
              </View>

              <View style={styles.statBlock}>
                <Text style={styles.label}>Confidence</Text>
                <Text style={styles.valueSmall}>{confidence}%</Text>
              </View>
            </View>

            <Text style={[styles.label, { marginTop: 12 }]}>Type</Text>
            <Text style={styles.valueSmall}>{type}</Text>
          </View>

          {/* MUSCLE BREAKDOWN */}
          <View style={styles.card}>
            <Text style={styles.label}>Muscle Breakdown</Text>

            {muscles &&
              Object.entries(muscles).map(([muscle, val]: any) => (
                <View key={muscle} style={styles.muscleRow}>
                  <Text style={styles.muscleLabel}>
                    {muscle.toUpperCase()}
                  </Text>
                  <Text style={styles.muscleVal}>{val}%</Text>
                </View>
              ))}
          </View>

          {/* SYMMETRY */}
          <View style={styles.card}>
            <Text style={styles.label}>Symmetry</Text>
            <Text style={styles.valueSmall}>{symmetry}%</Text>
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
  photoPrivacyNote: {
    color: colors.dim,
    fontSize: 11,
    marginTop: 10,
  },
});
