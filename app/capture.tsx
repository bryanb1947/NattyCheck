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
import { useRouter, useLocalSearchParams } from "expo-router";

const { width, height } = Dimensions.get("window");

const ANGLES = ["Front", "Back", "Side", "Legs"];

export default function CaptureScreen() {
  const cameraRef = useRef(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState("front");
  const [isCapturing, setIsCapturing] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [photoIndex, setPhotoIndex] = useState(0);
  const router = useRouter();
  const params = useLocalSearchParams();

  useEffect(() => {
    requestPermission();
    if (params?.photoIndex) {
      const idx = parseInt(params.photoIndex);
      if (!isNaN(idx)) setPhotoIndex(idx);
    }
  }, []);

  if (!permission) return <View />;
  if (!permission.granted)
    return (
      <View style={styles.permissionContainer}>
        <Text style={styles.permissionText}>Camera access required</Text>
        <TouchableOpacity onPress={requestPermission} style={styles.permissionButton}>
          <Text style={styles.permissionButtonText}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );

  const startCountdown = () => {
    let seconds = 3;
    setCountdown(seconds);
    const timer = setInterval(() => {
      seconds -= 1;
      setCountdown(seconds);
      if (seconds === 0) {
        clearInterval(timer);
        takePicture();
      }
    }, 1000);
  };

  const takePicture = async () => {
    if (cameraRef.current) {
      setIsCapturing(true);
      const photo = await cameraRef.current.takePictureAsync({ base64: true, quality: 0.8 });
      setIsCapturing(false);

      router.push({
        pathname: "/preview",
        params: {
          uri: photo.uri,
          index: photoIndex,
        },
      });
    }
  };

  return (
    <View style={styles.container}>
      {/* Camera Frame */}
      <View style={styles.cameraFrame}>
        <CameraView ref={cameraRef} style={styles.camera} facing={facing} />

        {/* Transparent Oval Outline */}
        <View style={styles.overlay}>
          <View style={styles.ovalOutline} />
        </View>
      </View>

      {/* Angle Indicator */}
      <Text style={styles.angleText}>
        {ANGLES[photoIndex]} ({photoIndex + 1}/{ANGLES.length})
      </Text>

      {/* Instruction */}
      <Text style={styles.instruction}>Align your body within the outline</Text>

      {/* Countdown */}
      {countdown > 0 && <Text style={styles.countdown}>{countdown}</Text>}

      {/* Controls */}
      <View style={styles.controls}>
        <TouchableOpacity
          style={styles.flipButton}
          onPress={() => setFacing(facing === "front" ? "back" : "front")}
        >
          <Ionicons name="camera-reverse-outline" size={30} color="#fff" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.captureButton}
          onPress={startCountdown}
          disabled={isCapturing}
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
    alignItems: "center",
    justifyContent: "center",
  },
  cameraFrame: {
    width: width * 0.9,
    height: height * 0.6,
    borderRadius: 25,
    overflow: "hidden",
    position: "relative",
  },
  camera: {
    width: "100%",
    height: "100%",
  },
  overlay: {
    position: "absolute",
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  // ✅ Real transparent oval outline (no fill)
  ovalOutline: {
    width: width * 0.6,
    height: height * 0.4,
    borderRadius: 200,
    borderWidth: 3,
    borderColor: "#00FFB0", // Neon green-teal border
    backgroundColor: "transparent",
    shadowColor: "#00FFE0",
    shadowOpacity: 0.9,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 0 },
  },
  angleText: {
    color: "#B8FF48",
    fontSize: 18,
    fontWeight: "700",
    marginTop: 20,
  },
  instruction: {
    color: "#fff",
    fontSize: 15,
    marginTop: 8,
    textAlign: "center",
    opacity: 0.9,
  },
  countdown: {
    color: "#00FFE0",
    fontSize: 48,
    fontWeight: "800",
    position: "absolute",
    top: "42%",
  },
  controls: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 40,
  },
  flipButton: {
    marginRight: 40,
  },
  captureButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
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
    alignItems: "center",
    justifyContent: "center",
  },
  permissionText: {
    color: "#fff",
    marginBottom: 20,
  },
  permissionButton: {
    backgroundColor: "#00FFE0",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 10,
  },
  permissionButtonText: {
    color: "#0A0B0C",
    fontWeight: "700",
    fontSize: 16,
  },
});
