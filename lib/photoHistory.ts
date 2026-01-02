// lib/photoHistory.ts
import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_KEY = "photoHistory";

export async function savePhotoHistory(
  analysisId: string,
  data: {
    frontUri: string;
    sideUri: string;
    backUri: string;
  }
) {
  try {
    const existing = await AsyncStorage.getItem(STORAGE_KEY);
    const map = existing ? JSON.parse(existing) : {};

    map[analysisId] = data;

    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch (err) {
    console.log("❌ Failed to save photo history:", err);
  }
}

export async function getPhotoHistory(analysisId: string) {
  try {
    const existing = await AsyncStorage.getItem(STORAGE_KEY);
    if (!existing) return null;

    const map = JSON.parse(existing);
    return map[analysisId] || null;
  } catch (err) {
    console.log("❌ Failed to load photo history:", err);
    return null;
  }
}

export async function clearPhotoHistory() {
  try {
    await AsyncStorage.removeItem(STORAGE_KEY);
  } catch (err) {
    console.log("❌ Failed to clear photo history:", err);
  }
}
