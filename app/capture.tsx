// app/capture.tsx
import React, { useRef, useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  ActivityIndicator,
} from "react-native";

import { CameraView, useCameraPermissions } from "expo-camera";
import { Ionicons } from "@expo/vector-icons";
import {
  useRouter,
  useLocalSearchParams,
  useNavigation,
} from "expo-router";

import { useCaptureStore } from "@/store/useCaptureStore";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// ⭐ USE LEGACY API — fixes all crashes & warnings
import * as FileSystem from "expo-file-system/legacy";

const { width, height } = Dimensions.get("window");
const ANGLES: Array<"front" | "side" | "back"> = ["front", "side", "back"];

/* -------------------------------------------------------------
   LIGHTWEIGHT VALIDATION
------------------------------------------------------------- */
function validateFinalPhoto(photo: any) {
  const { width: w, height: h } = photo;

  if (!w || !h) return "Image corrupted — retake photo.";
  if (h < 600 || w < 300) return "Step back slightly — more body needed.";

  const ratio = h / w;
  if (ratio < 1.15) return "Hold your phone vertically for a full-body shot.";

  return null;
}

/* -------------------------------------------------------------
   COMPONENT
------------------------------------------------------------- */
export default function CaptureScreen() {
  const insets = useSafeAreaInsets();
  const cameraRef = useRef<CameraView | null>(null);

  const router = useRouter();
  const navigation = useNavigation();
  const params = useLocalSearchParams();

  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState<"front" | "back">("front");

  const [isCapturing, setIsCapturing] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [photoIndex, setPhotoIndex] = useState(0);

  const { set } = useCaptureStore();

  const [outlineColor, setOutlineColor] = useState("#FF5C7A");
  const [bodyHint, setBodyHint] = useState("Step fully into the outline.");

  /* -------------------------------------------------------------
     INITIAL SETUP
  ------------------------------------------------------------- */
  useEffect(() => {
    requestPermission();
    if (params?.photoIndex) {
      const idx = parseInt(params.photoIndex as string, 10);
      if (!isNaN(idx)) setPhotoIndex(idx);
    }
  }, []);

  useEffect(() => {
    if (permission?.granted) {
      // slight delay fixes iOS flicker
      setTimeout(() => setFacing("front"), 60);
    }
  }, [permission?.granted]);

  const currentAngle = ANGLES[photoIndex];

  /* -------------------------------------------------------------
     ENABLE NATIVE iOS SWIPE BACK
  ------------------------------------------------------------- */
  useEffect(() => {
    navigation.setOptions?.({
      gestureEnabled: photoIndex === 0,
    });
  }, [navigation, photoIndex]);

  /* -------------------------------------------------------------
     BACK OUT
  ------------------------------------------------------------- */
  const handleBackOut = () => {
    if (photoIndex === 0) router.back();
  };

  /* -------------------------------------------------------------
     COUNTDOWN → CAPTURE
  ------------------------------------------------------------- */
  const startCountdown = () => {
    if (isCapturing) return;

    let sec = 3;
    setCountdown(sec);

    const timer = setInterval(() => {
      sec--;
      setCountdown(sec);

      if (sec <= 0) {
        clearInterval(timer);
        setCountdown(0);
        capturePhoto();
      }
    }, 1000);
  };

  /* -------------------------------------------------------------
     CAPTURE LOGIC
  ------------------------------------------------------------- */
  const capturePhoto = async () => {
    if (!cameraRef.current) return;

    try {
      setIsCapturing(true);

      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.85,
        base64: true,
        skipProcessing: false,
        // @ts-ignore — expo-camera internal flag
        convertResponseToBase64: true,
      });

      const err = validateFinalPhoto(photo);
      if (err) {
        setOutlineColor("#FF5C7A");
        setBodyHint(err);
        setIsCapturing(false);
        return;
      }

      if (!photo.base64) {
        setOutlineColor("#FF5C7A");
        setBodyHint("Photo data missing — retake.");
        setIsCapturing(false);
        return;
      }

      /* -------------------------------------------------------------
         SAVE LOCAL PHOTO (NO UPLOADS)
      ------------------------------------------------------------- */
      const filePath =
        FileSystem.documentDirectory +
        `${currentAngle}_${Date.now()}.jpg`;

      await FileSystem.writeAsStringAsync(filePath, photo.base64, {
        encoding: "base64", // ⭐ stable everywhere
      });

      // Save uri + base64 (for API)
      set(currentAngle, {
        uri: filePath,
        base64: photo.base64,
      });

      /* -------------------------------------------------------------
         END SAVE
      ------------------------------------------------------------- */

      setIsCapturing(false);

      router.push({
        pathname: "/preview",
        params: { index: photoIndex },
      });
    } catch (e) {
      console.log("CAPTURE ERROR", e);
      setOutlineColor("#FF5C7A");
      setBodyHint("Capture failed — retry.");
      setIsCapturing(false);
    }
  };

  /* -------------------------------------------------------------
     PERMISSION UI
  ------------------------------------------------------------- */
  if (!permission) return <View style={styles.permissionContainer} />;

  if (!permission.granted) {
    return (
      <View style={styles.permissionContainer}>
        <Text style={styles.permissionText}>Camera access required</Text>

        <TouchableOpacity
          onPress={requestPermission}
          style={styles.permissionButton}
        >
          <Text style={styles.permissionButtonText}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  /* -------------------------------------------------------------
     UI
  ------------------------------------------------------------- */
  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Back arrow ONLY on first angle */}
      {photoIndex === 0 && (
        <View style={styles.topBar}>
          <TouchableOpacity
            onPress={handleBackOut}
            style={styles.backIconWrapper}
            hitSlop={{ top: 14, bottom: 14, left: 14, right: 14 }}
          >
            <Ionicons name="chevron-back" size={32} color="#fff" />
          </TouchableOpacity>
        </View>
      )}

      {/* CAMERA */}
      <View style={styles.cameraFrame}>
        <CameraView ref={cameraRef} style={styles.camera} facing={facing} />

        <View style={styles.overlay}>
          <View
            style={[
              styles.ovalOutline,
              { borderColor: outlineColor },
            ]}
          />
        </View>
      </View>

      <Text style={styles.angleText}>
        {currentAngle.toUpperCase()} ({photoIndex + 1}/3)
      </Text>

      <Text style={styles.instruction}>{bodyHint}</Text>

      {countdown > 0 && <Text style={styles.countdown}>{countdown}</Text>}

      {/* CONTROLS */}
      <View style={styles.controls}>
        <TouchableOpacity
          style={styles.flipButton}
          onPress={() => setFacing(facing === "front" ? "back" : "front")}
        >
          <Ionicons name="camera-reverse-outline" size={32} color="#fff" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.captureButton}
          disabled={isCapturing}
          onPress={startCountdown}
        >
          {isCapturing ? (
            <ActivityIndicator size="small" color="#00FFE0" />
          ) : (
            <View style={styles.innerCircle} />
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

/* -------------------------------------------------------------
   STYLES
------------------------------------------------------------- */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
    alignItems: "center",
  },

  topBar: {
    width: "100%",
    paddingHorizontal: 12,
    marginBottom: 8,
  },

  backIconWrapper: {
    width: 46,
    height: 46,
    borderRadius: 23,
    justifyContent: "center",
    alignItems: "center",
  },

  cameraFrame: {
    width: width * 0.9,
    height: height * 0.62,
    borderRadius: 28,
    overflow: "hidden",
    position: "relative",
    marginTop: 6,
  },

  camera: { width: "100%", height: "100%" },

  overlay: {
    position: "absolute",
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },

  ovalOutline: {
    width: width * 0.62,
    height: height * 0.52,
    borderRadius: 320,
    borderWidth: 3,
  },

  angleText: {
    marginTop: 16,
    color: "#B8FF48",
    fontSize: 20,
    fontWeight: "800",
  },

  instruction: {
    color: "#fff",
    fontSize: 15,
    marginTop: 6,
    textAlign: "center",
    width: "80%",
  },

  countdown: {
    color: "#00FFE0",
    fontSize: 48,
    fontWeight: "900",
    position: "absolute",
    top: height * 0.42,
  },

  controls: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 32,
  },

  flipButton: {
    marginRight: 40,
  },

  captureButton: {
    width: 82,
    height: 82,
    borderRadius: 41,
    borderWidth: 4,
    borderColor: "#00FFE0",
    justifyContent: "center",
    alignItems: "center",
  },

  innerCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#00FFE0",
  },

  permissionContainer: {
    flex: 1,
    backgroundColor: "#000",
    justifyContent: "center",
    alignItems: "center",
  },

  permissionText: { color: "#fff", fontSize: 16, marginBottom: 16 },

  permissionButton: {
    backgroundColor: "#00FFE0",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
  },

  permissionButtonText: {
    fontSize: 16,
    color: "#000",
    fontWeight: "800",
  },
});
