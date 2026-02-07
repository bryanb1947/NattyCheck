// app/profile-edit.tsx
import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Picker } from "@react-native-picker/picker";
import { Ionicons } from "@expo/vector-icons";
import { Stack, useRouter } from "expo-router";

import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/store/useAuthStore";

const C = {
  bg: "#050707",
  card: "#101417",
  border: "#1B2429",
  text: "#FFFFFF",
  dim: "#9AA4AF",
  accentA: "#00F5A0",
  accentB: "#00D9F5",
};

const gradient = [C.accentA, C.accentB] as const;

/* ----------------- helpers ----------------- */
const imperialToCm = (ft: number, inch: number) => {
  const totalInches = ft * 12 + inch;
  return Math.round(totalInches * 2.54);
};

const cmToImperial = (cm: number) => {
  const totalInches = cm / 2.54;
  const ft = Math.floor(totalInches / 12);
  const inch = Math.round(totalInches - ft * 12);
  return { ft, inch };
};

const lbToKg = (lb: number) => Math.round(lb * 0.453592);
const kgToLb = (kg: number) => Math.round(kg / 0.453592);

type ToneMode = "Savage" | "Pro" | "Adaptive";
type Equipment = "Gym" | "Bodyweight" | "Hybrid";

export default function ProfileEditScreen() {
  const router = useRouter();

  // ✅ canonical auth store fields/actions (no plan here)
  const userId = useAuthStore((s) => s.userId);
  const email = useAuthStore((s) => s.email);
  const setIdentity = useAuthStore((s) => s.setIdentity);

  // ✅ correct hydration check for persisted Zustand store
  const hasHydratedAuth = useAuthStore.persist.hasHydrated();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  /* -------- account fields (email + password) -------- */
  const [emailInput, setEmailInput] = useState(email ?? "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  useEffect(() => {
    setEmailInput(email ?? "");
  }, [email]);

  /* -------- training / preference fields -------- */
  const [metric, setMetric] = useState(false); // false = imperial, true = metric

  // imperial
  const [heightFt, setHeightFt] = useState(5);
  const [heightInch, setHeightInch] = useState(10);
  const [weightLb, setWeightLb] = useState(175);

  // metric
  const [heightCm, setHeightCm] = useState(178);
  const [weightKg, setWeightKg] = useState(80);

  const [goal, setGoal] = useState<string>("Gain Muscle");
  const [equipment, setEquipment] = useState<Equipment>("Gym");
  const [activity, setActivity] = useState<string>("Moderate");
  const [experience, setExperience] = useState<string>("Beginner");
  const [toneMode, setToneMode] = useState<ToneMode>("Savage");

  /* ----------------- load profile from Supabase.profiles ----------------- */
  const loadProfile = useCallback(async () => {
    try {
      setLoading(true);

      // Always prefer session user (avoids stale store on cold start)
      const { data: sessData, error: sessErr } = await supabase.auth.getSession();
      if (sessErr) console.log("Profile edit getSession error:", sessErr);

      const sessionUser = sessData?.session?.user ?? null;
      const uid = sessionUser?.id ?? userId ?? null;
      const em = sessionUser?.email ?? email ?? null;

      if (!uid) {
        router.replace("/login");
        return;
      }

      if (em) setIdentity({ userId: uid, email: em });

      const { data, error } = await supabase
        .from("profiles")
        .select(
          [
            "user_id",
            "email",
            "unit_system",
            "height_cm",
            "weight_kg",
            "goal",
            "equipment",
            "activity_level",
            "experience_level",
            "tone_mode",
          ].join(",")
        )
        .eq("user_id", uid)
        .maybeSingle();

      if (error) {
        console.log("Profile edit load error:", error);
        return;
      }

      if (!data) {
        // No row → leave defaults (ensureProfile should normally prevent this)
        return;
      }

      const unit_system = data.unit_system ?? "imperial";
      const isMetric = unit_system === "metric";
      setMetric(isMetric);

      const dbHeightCm = data.height_cm ?? 178;
      const dbWeightKg = data.weight_kg ?? 80;

      setHeightCm(dbHeightCm);
      setWeightKg(dbWeightKg);

      const { ft, inch } = cmToImperial(dbHeightCm);
      setHeightFt(ft);
      setHeightInch(inch);
      setWeightLb(kgToLb(dbWeightKg));

      setGoal(data.goal ?? "Gain Muscle");
      setEquipment((data.equipment as Equipment) ?? "Gym");
      setActivity(data.activity_level ?? "Moderate");
      setExperience(data.experience_level ?? "Beginner");
      setToneMode((data.tone_mode as ToneMode) ?? "Savage");

      // keep local email input aligned with DB if it exists
      if (typeof data.email === "string" && data.email.length > 0) {
        setEmailInput(data.email);
      }
    } catch (err) {
      console.log("Profile edit load exception:", err);
    } finally {
      setLoading(false);
    }
  }, [router, userId, email, setIdentity]);

  useEffect(() => {
    if (!hasHydratedAuth) return;
    loadProfile();
  }, [hasHydratedAuth, loadProfile]);

  /* ----------------- unit toggle ----------------- */
  const toggleMetric = () => {
    setMetric((prev) => {
      const next = !prev;

      if (next) {
        // going → metric
        const cm = imperialToCm(heightFt, heightInch);
        const kg = lbToKg(weightLb);
        setHeightCm(cm);
        setWeightKg(kg);
      } else {
        // going → imperial
        const { ft, inch } = cmToImperial(heightCm);
        const lb = kgToLb(weightKg);
        setHeightFt(ft);
        setHeightInch(inch);
        setWeightLb(lb);
      }

      return next;
    });
  };

  /* ----------------- save profile (account + training) ----------------- */
  const handleSave = async () => {
    try {
      setSaving(true);

      const { data: sessData } = await supabase.auth.getSession();
      const sessionUser = sessData?.session?.user ?? null;
      const uid = sessionUser?.id ?? userId ?? null;

      if (!uid) {
        Alert.alert("Not signed in", "Please log in again.");
        router.replace("/login");
        return;
      }

      const trimmedEmail = (emailInput || "").trim().toLowerCase();
      const currentEmail = (sessionUser?.email ?? email ?? "").trim().toLowerCase();

      const emailChanged =
        trimmedEmail.length > 0 &&
        currentEmail.length > 0 &&
        trimmedEmail !== currentEmail;

      const anyPasswordEntered =
        currentPassword.length > 0 ||
        newPassword.length > 0 ||
        confirmPassword.length > 0;

      // basic validation BEFORE hitting Supabase
      if (anyPasswordEntered) {
        if (!currentPassword || !newPassword || !confirmPassword) {
          Alert.alert(
            "Update password",
            "Please fill in current password, new password, and confirmation."
          );
          return;
        }

        if (newPassword.length < 8) {
          Alert.alert(
            "New password too short",
            "For security, your new password should be at least 8 characters."
          );
          return;
        }

        if (newPassword !== confirmPassword) {
          Alert.alert(
            "Passwords don’t match",
            "Your new password and confirmation must match."
          );
          return;
        }
      }

      if (emailChanged && !trimmedEmail.includes("@")) {
        Alert.alert("Invalid email", "Please enter a valid email address.");
        return;
      }

      const unit_system = metric ? "metric" : "imperial";
      const height_cm = metric ? heightCm : imperialToCm(heightFt, heightInch);
      const weight_kg = metric ? weightKg : lbToKg(weightLb);

      // 1) Update training profile columns that actually exist
      const profilePayload: Record<string, any> = {
        unit_system,
        height_cm,
        weight_kg,
        goal,
        equipment,
        activity_level: activity,
        experience_level: experience,
        tone_mode: toneMode,
        updated_at: new Date().toISOString(),
      };

      // If user typed an email, keep profiles.email in sync too
      if (trimmedEmail.includes("@")) {
        profilePayload.email = trimmedEmail;
      }

      const { error: profileError } = await supabase
        .from("profiles")
        .update(profilePayload)
        .eq("user_id", uid);

      if (profileError) {
        console.log("❌ Profile edit update error:", profileError);
        Alert.alert(
          "Couldn’t save profile",
          "Something went wrong updating your training profile. Please try again."
        );
        return;
      }

      // 2) Update auth email / password if needed
      if (emailChanged || anyPasswordEntered) {
        // If changing password, verify current password first
        if (anyPasswordEntered) {
          if (!currentEmail) {
            Alert.alert("Error", "No current email found for this session.");
            return;
          }

          const { error: verifyError } = await supabase.auth.signInWithPassword({
            email: currentEmail,
            password: currentPassword,
          });

          if (verifyError) {
            console.log("❌ Current password incorrect:", verifyError.message);
            Alert.alert(
              "Current password incorrect",
              "We couldn’t verify your current password. Please try again."
            );
            return;
          }
        }

        const authPayload: { email?: string; password?: string } = {};
        if (emailChanged) authPayload.email = trimmedEmail;
        if (anyPasswordEntered) authPayload.password = newPassword;

        const { error: authError } = await supabase.auth.updateUser(authPayload);

        if (authError) {
          console.log("❌ Auth update error:", authError.message);
          Alert.alert(
            "Account update issue",
            "We saved your training profile, but couldn’t update your login details. Please double-check your info and try again."
          );
          // still continue — training profile was saved
        } else {
          // If auth email changed successfully, update store identity
          if (emailChanged) setIdentity({ userId: uid, email: trimmedEmail });
        }
      } else {
        // No auth changes; still ensure identity is correct
        setIdentity({ userId: uid, email: sessionUser?.email ?? email ?? null });
      }

      router.back();
    } catch (err) {
      console.log("❌ Profile edit update exception:", err);
      Alert.alert(
        "Something went wrong",
        "We couldn’t save your changes. Please try again in a moment."
      );
    } finally {
      setSaving(false);
    }
  };

  /* ----------------- header ----------------- */
  const header = (
    <Stack.Screen
      options={{
        headerShown: true,
        headerTransparent: true,
        headerTitle: "",
        gestureEnabled: true,
        animation: "default",
        headerLeft: () => (
          <TouchableOpacity
            onPress={() => router.back()}
            style={{ paddingLeft: 10, paddingVertical: 10 }}
          >
            <Ionicons name="chevron-back" size={30} color="#FFFFFF" />
          </TouchableOpacity>
        ),
      }}
    />
  );

  /* ----------------- render states ----------------- */
  if (!hasHydratedAuth || loading) {
    return (
      <>
        {header}
        <SafeAreaView style={styles.safe}>
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="large" color={C.accentA} />
            <Text style={styles.loadingText}>Loading profile…</Text>
          </View>
        </SafeAreaView>
      </>
    );
  }

  if (!userId) {
    return (
      <>
        {header}
        <SafeAreaView style={styles.safe}>
          <View style={styles.loadingWrap}>
            <Text style={styles.signInTitle}>Sign in to edit your profile</Text>
            <Text style={styles.signInText}>
              Your physique + training profile is linked to your account.
            </Text>
          </View>
        </SafeAreaView>
      </>
    );
  }

  /* ----------------- main render ----------------- */
  return (
    <>
      {header}

      <SafeAreaView style={styles.safe}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={{ paddingBottom: 32 }}
          showsVerticalScrollIndicator={false}
        >
          {/* HEADER TEXT */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Training Profile</Text>
            <Text style={styles.headerSubtitle}>
              Update your stats, preferences, and login so NattyCheck can dial in
              your analysis and plans.
            </Text>
          </View>

          {/* ACCOUNT & LOGIN CARD */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Account & Login</Text>
            <Text style={styles.cardSubtitle}>
              Change the email and password you use to sign into NattyCheck.
            </Text>

            <Text style={styles.fieldLabel}>Email</Text>
            <TextInput
              style={styles.input}
              value={emailInput}
              onChangeText={setEmailInput}
              placeholder="you@example.com"
              placeholderTextColor="#6B757B"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />

            <Text style={[styles.fieldLabel, { marginTop: 12 }]}>
              Current password
            </Text>
            <TextInput
              style={styles.input}
              value={currentPassword}
              onChangeText={setCurrentPassword}
              placeholder="Current password"
              placeholderTextColor="#6B757B"
              secureTextEntry
              autoCapitalize="none"
            />

            <Text style={[styles.fieldLabel, { marginTop: 12 }]}>
              New password
            </Text>
            <TextInput
              style={styles.input}
              value={newPassword}
              onChangeText={setNewPassword}
              placeholder="New password"
              placeholderTextColor="#6B757B"
              secureTextEntry
              autoCapitalize="none"
            />

            <Text style={[styles.fieldLabel, { marginTop: 12 }]}>
              Confirm new password
            </Text>
            <TextInput
              style={styles.input}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="Confirm new password"
              placeholderTextColor="#6B757B"
              secureTextEntry
              autoCapitalize="none"
            />

            <Text style={styles.inputHint}>
              Leave password fields blank if you only want to update your physique
              + training settings.
            </Text>
          </View>

          {/* UNITS & METRICS */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Units & Metrics</Text>
            <Text style={styles.cardSubtitle}>
              Adjust your height, weight, and preferred unit system.
            </Text>

            {/* Unit toggle */}
            <View style={styles.unitRow}>
              <Text style={[styles.unitLabel, !metric ? styles.unitLabelActive : null]}>
                Imperial
              </Text>

              <TouchableOpacity style={styles.switchOuter} onPress={toggleMetric}>
                <View
                  style={[
                    styles.switchThumb,
                    metric ? styles.switchThumbRight : styles.switchThumbLeft,
                  ]}
                />
              </TouchableOpacity>

              <Text style={[styles.unitLabel, metric ? styles.unitLabelActive : null]}>
                Metric
              </Text>
            </View>

            {/* Height */}
            <Text style={styles.fieldLabel}>Height</Text>

            {!metric ? (
              <View style={styles.row}>
                <View style={styles.pickerContainer}>
                  <Picker
                    selectedValue={heightFt}
                    style={styles.picker}
                    onValueChange={(v) => setHeightFt(v)}
                  >
                    {[4, 5, 6, 7].map((ft) => (
                      <Picker.Item key={ft} label={`${ft} ft`} value={ft} />
                    ))}
                  </Picker>
                </View>
                <View style={styles.pickerContainer}>
                  <Picker
                    selectedValue={heightInch}
                    style={styles.picker}
                    onValueChange={(v) => setHeightInch(v)}
                  >
                    {Array.from({ length: 12 }).map((_, i) => (
                      <Picker.Item key={i} label={`${i} in`} value={i} />
                    ))}
                  </Picker>
                </View>
              </View>
            ) : (
              <View style={styles.pickerContainerFull}>
                <Picker
                  selectedValue={heightCm}
                  style={styles.picker}
                  onValueChange={(v) => setHeightCm(v)}
                >
                  {Array.from({ length: 160 }, (_, i) => i + 140).map((v) => (
                    <Picker.Item key={v} label={`${v} cm`} value={v} />
                  ))}
                </Picker>
              </View>
            )}

            {/* Weight */}
            <Text style={[styles.fieldLabel, { marginTop: 16 }]}>Weight</Text>

            {!metric ? (
              <View style={styles.pickerContainerFull}>
                <Picker
                  selectedValue={weightLb}
                  style={styles.picker}
                  onValueChange={(v) => setWeightLb(v)}
                >
                  {Array.from({ length: 400 }, (_, i) => i + 70).map((v) => (
                    <Picker.Item key={v} label={`${v} lb`} value={v} />
                  ))}
                </Picker>
              </View>
            ) : (
              <View style={styles.pickerContainerFull}>
                <Picker
                  selectedValue={weightKg}
                  style={styles.picker}
                  onValueChange={(v) => setWeightKg(v)}
                >
                  {Array.from({ length: 300 }, (_, i) => i + 30).map((v) => (
                    <Picker.Item key={v} label={`${v} kg`} value={v} />
                  ))}
                </Picker>
              </View>
            )}
          </View>

          {/* GOAL & EQUIPMENT */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Goal & Equipment</Text>

            <Text style={styles.fieldLabel}>Primary goal</Text>
            {["Gain Muscle", "Maintain Physique", "Lose Fat"].map((g) => {
              const selected = goal === g;
              return (
                <TouchableOpacity
                  key={g}
                  onPress={() => setGoal(g)}
                  style={[styles.option, selected && styles.optionSelected]}
                >
                  <Text style={[styles.optionText, selected && styles.optionTextSelected]}>
                    {g}
                  </Text>
                </TouchableOpacity>
              );
            })}

            <Text style={[styles.fieldLabel, { marginTop: 12 }]}>Equipment</Text>
            {["Gym", "Bodyweight", "Hybrid"].map((eq) => {
              const selected = equipment === (eq as Equipment);
              return (
                <TouchableOpacity
                  key={eq}
                  onPress={() => setEquipment(eq as Equipment)}
                  style={[styles.option, selected && styles.optionSelected]}
                >
                  <Text style={[styles.optionText, selected && styles.optionTextSelected]}>
                    {eq}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* ACTIVITY & EXPERIENCE */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Activity & Experience</Text>

            <Text style={styles.fieldLabel}>Activity level</Text>
            {["Sedentary", "Light", "Moderate", "Active", "Very Active", "Athlete"].map(
              (lvl) => {
                const selected = activity === lvl;
                return (
                  <TouchableOpacity
                    key={lvl}
                    onPress={() => setActivity(lvl)}
                    style={[styles.option, selected && styles.optionSelected]}
                  >
                    <Text
                      style={[
                        styles.optionText,
                        selected && styles.optionTextSelected,
                      ]}
                    >
                      {lvl}
                    </Text>
                  </TouchableOpacity>
                );
              }
            )}

            <Text style={[styles.fieldLabel, { marginTop: 12 }]}>
              Training experience
            </Text>
            {["Beginner", "Intermediate", "Advanced"].map((lvl) => {
              const selected = experience === lvl;
              return (
                <TouchableOpacity
                  key={lvl}
                  onPress={() => setExperience(lvl)}
                  style={[styles.option, selected && styles.optionSelected]}
                >
                  <Text style={[styles.optionText, selected && styles.optionTextSelected]}>
                    {lvl}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* TONE MODE */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>AI Tone Mode</Text>
            <Text style={styles.cardSubtitle}>
              Decide how brutally honest or coach-like you want NattyCheck to be.
            </Text>

            {[
              { key: "Savage" as const, label: "Savage Mode 😈" },
              { key: "Pro" as const, label: "Pro Coach Mode 🎯" },
              { key: "Adaptive" as const, label: "Adaptive Mode 🔄" },
            ].map((m) => {
              const selected = toneMode === m.key;
              return (
                <TouchableOpacity
                  key={m.key}
                  onPress={() => setToneMode(m.key)}
                  style={[styles.option, selected && styles.optionSelected]}
                >
                  <Text style={[styles.optionText, selected && styles.optionTextSelected]}>
                    {m.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* SAVE BUTTON */}
          <TouchableOpacity style={{ marginTop: 4 }} onPress={handleSave} disabled={saving}>
            <LinearGradient colors={gradient} style={styles.saveBtn}>
              {saving ? (
                <ActivityIndicator color="#000" />
              ) : (
                <Text style={styles.saveText}>Save Changes</Text>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    </>
  );
}

/* ----------------- styles ----------------- */
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  scroll: { flex: 1, paddingHorizontal: 16 },

  loadingWrap: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  loadingText: { color: C.dim, marginTop: 8 },
  signInTitle: {
    color: C.text,
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 6,
    textAlign: "center",
  },
  signInText: { color: C.dim, textAlign: "center", fontSize: 13 },

  header: { paddingTop: 36, paddingBottom: 16 },
  headerTitle: {
    color: C.text,
    fontSize: 22,
    fontWeight: "800",
    marginBottom: 6,
  },
  headerSubtitle: { color: C.dim, fontSize: 13 },

  card: {
    backgroundColor: C.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: C.border,
    marginBottom: 14,
  },
  cardTitle: {
    color: C.text,
    fontSize: 15,
    fontWeight: "800",
    marginBottom: 6,
  },
  cardSubtitle: { color: C.dim, fontSize: 12, marginBottom: 10 },

  unitRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
    marginBottom: 12,
  },
  unitLabel: { color: "#566268", fontSize: 13, fontWeight: "600" },
  unitLabelActive: { color: C.text },
  switchOuter: {
    width: 52,
    height: 28,
    marginHorizontal: 10,
    borderRadius: 20,
    backgroundColor: "#333D42",
    padding: 3,
  },
  switchThumb: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#fff",
    position: "absolute",
    top: 3,
  },
  switchThumbLeft: { left: 3 },
  switchThumbRight: { right: 3 },

  fieldLabel: {
    color: C.dim,
    fontSize: 12,
    fontWeight: "600",
    marginTop: 4,
    marginBottom: 4,
  },

  row: { flexDirection: "row", justifyContent: "space-between" },
  pickerContainer: {
    flex: 1,
    marginRight: 6,
    backgroundColor: "#0B1114",
    borderRadius: 12,
    borderColor: C.border,
    borderWidth: 1,
    overflow: "hidden",
  },
  pickerContainerFull: {
    backgroundColor: "#0B1114",
    borderRadius: 12,
    borderColor: C.border,
    borderWidth: 1,
    overflow: "hidden",
  },
  picker: { color: C.text, height: 150 },

  option: {
    backgroundColor: "#10171A",
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 10,
    marginTop: 8,
    borderWidth: 1,
    borderColor: "transparent",
  },
  optionSelected: { backgroundColor: C.accentA, borderColor: C.accentA },
  optionText: { color: C.text, fontSize: 14, fontWeight: "600" },
  optionTextSelected: { color: "#000" },

  input: {
    backgroundColor: "#0B1114",
    borderRadius: 12,
    borderColor: C.border,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: C.text,
    fontSize: 14,
  },
  inputHint: { marginTop: 8, color: C.dim, fontSize: 11 },

  saveBtn: {
    width: "100%",
    borderRadius: 999,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  saveText: { color: "#00110A", fontSize: 16, fontWeight: "800" },
});
