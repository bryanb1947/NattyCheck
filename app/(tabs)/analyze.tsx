// app/(tabs)/analyze.tsx
import React, { useMemo, useState } from "react";
import {
  SafeAreaView,
  ScrollView,
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  Alert,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";

type ShotKey = "front" | "side" | "back";
type Shots = { front: string | null; side: string | null; back: string | null };

export default function Analyze() {
  const [shots, setShots] = useState<Shots>({ front: null, side: null, back: null });
  const [lastMsg, setLastMsg] = useState<string>("idle");

  const allHavePhotos = useMemo(
    () => Boolean(shots.front && shots.side && shots.back),
    [shots]
  );

  const ensurePerms = async () => {
    const cam = await ImagePicker.requestCameraPermissionsAsync();
    const libAsk = await ImagePicker.requestMediaLibraryPermissionsAsync(); // ask
    const lib = await ImagePicker.getMediaLibraryPermissionsAsync();        // read final

    if (cam.status !== "granted") {
      setLastMsg("Camera permission denied");
      Alert.alert("Camera permission", "Enable Camera access in Settings to take photos.");
      return false;
    }
    // Library permission improves reliability on iOS (temp saves)
    if (lib.status !== "granted") {
      setLastMsg("Photos permission not granted (will still try)");
    }
    return true;
  };

  const updateShot = (key: ShotKey, uri?: string | null) => {
    if (!uri) {
      setLastMsg(`No URI returned for ${key}`);
      Alert.alert("Capture failed", "No image URI was returned.");
      return;
    }
    setLastMsg(`✅ saved ${key}: ${uri.slice(0, 40)}…`);
    setShots((prev) => ({ ...prev, [key]: uri }));
  };

  const takePhoto = async (key: ShotKey) => {
    try {
      const ok = await ensurePerms();
      if (!ok) return;

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 0.9,
      });

      setLastMsg(`📷 Camera result: ${JSON.stringify(result).slice(0, 220)}…`);

      if (!result.canceled) {
        const uri = result.assets?.[0]?.uri ?? null;
        updateShot(key, uri);
      } else {
        setLastMsg("User canceled camera");
      }
    } catch (e: any) {
      setLastMsg(`Camera error: ${e?.message ?? String(e)}`);
      Alert.alert("Camera error", e?.message ?? "Could not capture image.");
    }
  };

  const pickFromLibrary = async (key: ShotKey) => {
    try {
      const lib = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (lib.status !== "granted") {
        setLastMsg("Photos permission denied");
        Alert.alert("Photos permission", "Enable Photo Library access in Settings.");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.95,
      });

      setLastMsg(`🖼️ Library result: ${JSON.stringify(result).slice(0, 220)}…`);

      if (!result.canceled) {
        const uri = result.assets?.[0]?.uri ?? null;
        updateShot(key, uri);
      } else {
        setLastMsg("User canceled library");
      }
    } catch (e: any) {
      setLastMsg(`Library error: ${e?.message ?? String(e)}`);
      Alert.alert("Library error", e?.message ?? "Could not select image.");
    }
  };

  const clearPhoto = (key: ShotKey) => {
    setShots((prev) => ({ ...prev, [key]: null }));
    setLastMsg(`cleared ${key}`);
  };

  const onSubmit = () => {
    const missing: string[] = [];
    if (!shots.front) missing.push("Front");
    if (!shots.side) missing.push("Side");
    if (!shots.back) missing.push("Back");

    if (missing.length) {
      setLastMsg(`Missing: ${missing.join(", ")}`);
      Alert.alert("Missing photos", `Please capture: ${missing.join(", ")}`);
      return;
    }

    router.push({
      pathname: "/analyzing",
      params: {
        frontUri: shots.front!,
        sideUri: shots.side!,
        backUri: shots.back!,
      },
    });
  };

  // --- Debug helper: fill previews with remote images so you can test flow ---
  const debugFill = () => {
    setShots({
      front: "https://picsum.photos/seed/front/800/1200",
      side: "https://picsum.photos/seed/side/800/1200",
      back: "https://picsum.photos/seed/back/800/1200",
    });
    setLastMsg("DEBUG: filled with sample images (remote)");
  };

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView contentContainerStyle={s.content}>
        <Text style={s.title}>Start New Analysis</Text>
        <Text style={s.sub}>Capture three photos (front, side, back). Make sure lighting is even.</Text>

        <ShotCard
          label="Front"
          uri={shots.front}
          onRetake={() => takePhoto("front")}
          onPick={() => pickFromLibrary("front")}
          onClear={() => clearPhoto("front")}
        />
        <ShotCard
          label="Side"
          uri={shots.side}
          onRetake={() => takePhoto("side")}
          onPick={() => pickFromLibrary("side")}
          onClear={() => clearPhoto("side")}
        />
        <ShotCard
          label="Back"
          uri={shots.back}
          onRetake={() => takePhoto("back")}
          onPick={() => pickFromLibrary("back")}
          onClear={() => clearPhoto("back")}
        />

        <TouchableOpacity
          activeOpacity={0.9}
          onPress={onSubmit}
          disabled={!allHavePhotos}
          style={[s.cta, !allHavePhotos && s.ctaDisabled]}
        >
          <Text style={[s.ctaText, !allHavePhotos && s.ctaTextDisabled]}>
            Submit for Analysis
          </Text>
        </TouchableOpacity>

        {/* Debug row */}
        <View style={s.debugRow}>
          <TouchableOpacity onPress={debugFill} style={s.debugBtn}>
            <Text style={s.debugText}>Debug Fill</Text>
          </TouchableOpacity>
          <Text style={s.debugMsg} numberOfLines={2}>
            {lastMsg}
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function ShotCard({
  label,
  uri,
  onRetake,
  onPick,
  onClear,
}: {
  label: string;
  uri: string | null;
  onRetake: () => void;
  onPick: () => void;
  onClear: () => void;
}) {
  return (
    <View style={s.card}>
      <Text style={s.cardTitle}>{label}</Text>

      <View style={s.previewWrap}>
        {uri ? (
          <Image source={{ uri }} style={s.preview} resizeMode="cover" />
        ) : (
          <View style={s.empty}>
            <Text style={s.emptyText}>No photo yet</Text>
          </View>
        )}
      </View>

      <View style={s.row}>
        <TouchableOpacity style={s.btn} onPress={onRetake}>
          <Text style={s.btnText}>Retake</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.btn} onPress={onPick}>
          <Text style={s.btnText}>Pick</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.btn} onPress={onClear}>
          <Text style={s.btnText}>Clear</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#0F0F0F" },
  content: { padding: 16, paddingBottom: 40 },
  title: { color: "#fff", fontSize: 28, fontWeight: "900" },
  sub: { color: "#98A6AA", marginTop: 6, marginBottom: 8 },
  card: {
    marginTop: 16,
    padding: 14,
    borderRadius: 16,
    backgroundColor: "#101416",
    borderWidth: 1,
    borderColor: "#1F2A2E",
  },
  cardTitle: { color: "#DDE4E7", fontWeight: "800", marginBottom: 10 },
  previewWrap: {
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "#0B0E0F",
    height: 220,
    borderWidth: 1,
    borderColor: "#1A2326",
  },
  preview: { width: "100%", height: "100%" },
  empty: { flex: 1, alignItems: "center", justifyContent: "center" },
  emptyText: { color: "#5F7277" },
  row: { flexDirection: "row", gap: 10, marginTop: 12 },
  btn: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    backgroundColor: "#161C1F",
    borderWidth: 1,
    borderColor: "#29343A",
    alignItems: "center",
    justifyContent: "center",
  },
  btnText: { color: "#DDE4E7", fontWeight: "700" },
  cta: {
    marginTop: 20,
    height: 56,
    borderRadius: 14,
    backgroundColor: "#B8FF47",
    alignItems: "center",
    justifyContent: "center",
  },
  ctaDisabled: { backgroundColor: "#273135" },
  ctaText: { color: "#0A0A0A", fontWeight: "800", fontSize: 16 },
  ctaTextDisabled: { color: "#7B8C91" },
  debugRow: { marginTop: 12, gap: 8 },
  debugBtn: {
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    height: 36,
    borderRadius: 8,
    backgroundColor: "#223138",
    justifyContent: "center",
  },
  debugText: { color: "#DDE4E7", fontWeight: "700" },
  debugMsg: { color: "#8AA0A6" },
});
