import AsyncStorage from "@react-native-async-storage/async-storage";

export async function saveAnalysis(report: any) {
  try {
    const existing = await AsyncStorage.getItem("analysisHistory");
    const history = existing ? JSON.parse(existing) : [];
    const updated = [{ report, date: new Date().toISOString() }, ...history].slice(0, 10);
    await AsyncStorage.setItem("analysisHistory", JSON.stringify(updated));
  } catch (err) {
    console.warn("Failed to save analysis:", err);
  }
}

export async function getAnalysisHistory() {
  try {
    const raw = await AsyncStorage.getItem("analysisHistory");
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}
