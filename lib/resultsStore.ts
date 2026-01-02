// lib/resultsStore.ts
import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_KEY = "analysisHistory";

export async function saveAnalysis(report: any) {
  try {
    const existing = await AsyncStorage.getItem(STORAGE_KEY);
    const history = existing ? JSON.parse(existing) : [];

    const newEntry = {
      report,
      date: new Date().toISOString(),
    };

    // keep newest entries first, limit to 10
    const updated = [newEntry, ...history].slice(0, 10);

    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (err) {
    console.warn("Failed to save analysis:", err);
  }
}

export async function getAnalysisHistory() {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (err) {
    console.warn("Failed to load analysis history:", err);
    return [];
  }
}

export async function clearAnalysisHistory() {
  try {
    await AsyncStorage.removeItem(STORAGE_KEY);
  } catch (err) {
    console.warn("Failed to clear analysis history:", err);
  }
}
