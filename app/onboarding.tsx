// app/onboarding.tsx
// #onboarding
// ---------------------------------------------
// 9-Step Onboarding (public, works signed-out)
// - Saves progress locally (AsyncStorage)
// - If logged in, also syncs into Supabase profiles
// Order:
// 0 Gender & Age
// 1 Body Metrics (Height / Weight)
// 2 Pain Points
// 3 Goals
// 4 Equipment Preference
// 5 Activity & Experience
// 6 Tone Mode
// 7 Clothing & Guidelines
// 8 Pre-Scan Hype + Begin Capture
// ---------------------------------------------

import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Dimensions,
} from "react-native";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Picker } from "@react-native-picker/picker";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { supabase } from "../lib/supabase";
import { useAuthStore } from "../store/useAuthStore";

const gradient = ["#00f5a0", "#00d9f5"];
const SCREEN_WIDTH = Dimensions.get("window").width;

const ONBOARDING_DRAFT_KEY = "onboarding_draft_v1";

export default function Onboarding() {
  const router = useRouter();

  // Auth (optional). Onboarding is PUBLIC.
  const userId = useAuthStore((s) => s.userId);

  // ───────────────────────────────────────
  // STATE
  // ───────────────────────────────────────
  const [step, setStep] = useState(0);

  const [gender, setGender] = useState<"Male" | "Female" | "Other">("Male");
  const [age, setAge] = useState(25);

  // Unit system toggle (false = imperial, true = metric)
  const [metric, setMetric] = useState(false);

  // Imperial (default)
  const [height, setHeight] = useState({ ft: 5, inch: 10 });
  const [weight, setWeight] = useState(175);

  // Metric
  const [cm, setCm] = useState(178);
  const [kg, setKg] = useState(80);

  const [painPoints, setPainPoints] = useState<string[]>([]);
  const [goal, setGoal] = useState("Gain Muscle");

  const [equipment, setEquipment] = useState<"Gym" | "Bodyweight" | "Hybrid">(
    "Gym"
  );

  const [activity, setActivity] = useState("Moderate");
  const [experience, setExperience] = useState("Beginner");

  const [toneMode, setToneMode] = useState<"Savage" | "Pro" | "Adaptive">(
    "Savage"
  );

  const totalSteps = 9;

  // ───────────────────────────────────────
  // HELPERS
  // ───────────────────────────────────────

  const next = () => setStep((s) => Math.min(s + 1, totalSteps - 1));
  const back = () => setStep((s) => Math.max(s - 1, 0));

  const togglePainPoint = (p: string) => {
    setPainPoints((prev) => (prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]));
  };

  const imperialToCm = (ft: number, inch: number) => {
    const totalInches = ft * 12 + inch;
    return Math.round(totalInches * 2.54);
  };

  const lbToKg = (lb: number) => Math.round(lb * 0.453592);

  const buildPayload = () => {
    const unit_system = metric ? "metric" : "imperial";

    const height_cm = metric ? cm : imperialToCm(height.ft, height.inch);
    const weight_kg = metric ? kg : lbToKg(weight);

    return {
      gender,
      age,
      unit_system,
      height_cm,
      weight_kg,
      goal,
      pain_points: painPoints,
      equipment,
      activity_level: activity,
      experience_level: experience,
      tone_mode: toneMode,
      updated_at: new Date().toISOString(),
      // useful to know how far they got:
      onboarding_step: step,
      onboarding_complete: step >= totalSteps - 1,
    };
  };

  // Save locally always, and sync to Supabase only if logged in
  const saveProgress = async () => {
    const payload = buildPayload();

    // 1) Local draft (works signed-out)
    try {
      await AsyncStorage.setItem(ONBOARDING_DRAFT_KEY, JSON.stringify(payload));
      console.log("✅ Onboarding draft saved locally:", payload);
    } catch (e) {
      console.log("❌ Onboarding local save failed:", e);
    }

    // 2) Supabase sync (only if we have a user)
    if (!userId) return;

    try {
      const { error } = await supabase
        .from("profiles")
        .update(payload)
        .eq("user_id", userId);

      if (error) console.log("❌ Onboarding Supabase save error:", error);
      else console.log("✅ Onboarding synced to Supabase.");
    } catch (e) {
      console.log("❌ Onboarding Supabase save exception:", e);
    }
  };

  const handleContinue = async () => {
    await saveProgress();
    next();
  };

  const handleFinish = async () => {
    await saveProgress();
    router.push({
      pathname: "/capture",
      params: { photoIndex: 0 },
    });
  };

  // ───────────────────────────────────────────────
  // COMPONENT HELPERS
  // ───────────────────────────────────────────────

  const Continue = ({ onPress, label = "Continue" }: { onPress: () => void; label?: string }) => (
    <TouchableOpacity onPress={onPress} style={{ marginTop: 34 }}>
      <LinearGradient
        colors={gradient}
        style={{
          paddingVertical: 16,
          borderRadius: 14,
        }}
      >
        <Text
          style={{
            textAlign: "center",
            color: "black",
            fontWeight: "700",
            fontSize: 18,
          }}
        >
          {label}
        </Text>
      </LinearGradient>
    </TouchableOpacity>
  );

  const SectionTitle = ({ children }: { children: React.ReactNode }) => (
    <Text
      style={{
        color: "white",
        fontSize: 28,
        fontWeight: "800",
        marginBottom: 12,
      }}
    >
      {children}
    </Text>
  );

  const Subtitle = ({ children }: { children: React.ReactNode }) => (
    <Text style={{ color: "#999", marginBottom: 24 }}>{children}</Text>
  );

  // ───────────────────────────────────────────────
  // RENDER
  // ───────────────────────────────────────────────
  return (
    <LinearGradient
      colors={["#050505", "#0a0a0a"]}
      style={{ flex: 1, padding: 24 }}
    >
      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          justifyContent: "center",
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* PROGRESS BAR */}
        <View
          style={{
            flexDirection: "row",
            justifyContent: "center",
            marginBottom: 40,
          }}
        >
          {Array.from({ length: totalSteps }).map((_, i) => (
            <View
              key={i}
              style={{
                width: 30,
                height: 6,
                borderRadius: 10,
                marginHorizontal: 4,
                backgroundColor: i <= step ? "#7CFFB2" : "#1E1E1E",
              }}
            />
          ))}
        </View>

        {/* STEP 0 — Gender & Age */}
        {step === 0 && (
          <View>
            <SectionTitle>Tell us about yourself</SectionTitle>
            <Subtitle>This helps personalize your physique analysis.</Subtitle>

            {/* Gender */}
            <Text
              style={{
                color: "white",
                fontWeight: "600",
                fontSize: 16,
                marginBottom: 8,
              }}
            >
              Gender
            </Text>

            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                marginBottom: 30,
              }}
            >
              {["Male", "Female", "Other"].map((g) => {
                const selected = gender === g;
                return (
                  <TouchableOpacity
                    key={g}
                    onPress={() => setGender(g as any)}
                    style={{
                      flex: 1,
                      marginHorizontal: 5,
                      backgroundColor: selected ? "#00f5a0" : "#121212",
                      paddingVertical: 18,
                      borderRadius: 12,
                      alignItems: "center",
                    }}
                  >
                    <Text
                      style={{
                        color: selected ? "black" : "white",
                        fontWeight: "600",
                      }}
                    >
                      {g === "Male" ? "👨‍🦱 Male" : g === "Female" ? "👩‍🦰 Female" : "⚧️ Other"}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Age */}
            <Text
              style={{
                color: "white",
                fontWeight: "600",
                fontSize: 16,
                marginBottom: 8,
              }}
            >
              Age
            </Text>

            <View style={{ alignItems: "center", marginBottom: 8 }}>
              <Text
                style={{
                  color: "#7CFFB2",
                  fontSize: 24,
                  fontWeight: "700",
                }}
              >
                {age}
              </Text>
            </View>

            <Picker
              selectedValue={age}
              style={{
                width: SCREEN_WIDTH * 0.8,
                alignSelf: "center",
                color: "white",
                height: 150,
              }}
              onValueChange={(v) => setAge(v)}
            >
              {Array.from({ length: 88 }, (_, i) => i + 13).map((v) => (
                <Picker.Item key={v} label={`${v}`} value={v} />
              ))}
            </Picker>

            <Continue onPress={handleContinue} />
          </View>
        )}

        {/* STEP 1 — Body Metrics */}
        {step === 1 && (
          <View>
            <SectionTitle>Height & weight</SectionTitle>
            <Subtitle>This will be used to calibrate your custom plan.</Subtitle>

            {/* Unit toggle */}
            <View
              style={{
                flexDirection: "row",
                justifyContent: "center",
                alignItems: "center",
                marginVertical: 20,
              }}
            >
              <Text
                style={{
                  color: metric ? "#666" : "white",
                  fontWeight: "600",
                  fontSize: 16,
                  marginRight: 12,
                }}
              >
                Imperial
              </Text>

              <TouchableOpacity
                onPress={() => setMetric((m) => !m)}
                style={{
                  width: 50,
                  height: 28,
                  borderRadius: 20,
                  backgroundColor: metric ? "#00f5a0" : "#444",
                  padding: 3,
                  justifyContent: metric ? "flex-end" : "flex-start",
                }}
              >
                <View
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: 11,
                    backgroundColor: "white",
                  }}
                />
              </TouchableOpacity>

              <Text
                style={{
                  color: metric ? "white" : "#666",
                  fontWeight: "600",
                  fontSize: 16,
                  marginLeft: 12,
                }}
              >
                Metric
              </Text>
            </View>

            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                paddingHorizontal: 8,
              }}
            >
              {/* HEIGHT */}
              <View style={{ flex: 1, alignItems: "center" }}>
                <Text style={{ color: "white", fontSize: 16, fontWeight: "600" }}>
                  Height
                </Text>

                {!metric ? (
                  <View style={{ flexDirection: "row" }}>
                    <Picker
                      selectedValue={height.ft}
                      style={{ width: 100, color: "white", height: 180 }}
                      onValueChange={(v) => setHeight((p) => ({ ...p, ft: v }))}
                    >
                      {[4, 5, 6, 7].map((ft) => (
                        <Picker.Item key={ft} label={`${ft} ft`} value={ft} />
                      ))}
                    </Picker>

                    <Picker
                      selectedValue={height.inch}
                      style={{ width: 100, color: "white", height: 180 }}
                      onValueChange={(v) => setHeight((p) => ({ ...p, inch: v }))}
                    >
                      {Array.from({ length: 12 }).map((_, i) => (
                        <Picker.Item key={i} label={`${i} in`} value={i} />
                      ))}
                    </Picker>
                  </View>
                ) : (
                  <Picker
                    selectedValue={cm}
                    style={{ width: 120, color: "white", height: 180 }}
                    onValueChange={(v) => setCm(v)}
                  >
                    {Array.from({ length: 160 }, (_, i) => i + 140).map((v) => (
                      <Picker.Item key={v} label={`${v} cm`} value={v} />
                    ))}
                  </Picker>
                )}
              </View>

              {/* WEIGHT */}
              <View style={{ flex: 1, alignItems: "center" }}>
                <Text style={{ color: "white", fontSize: 16, fontWeight: "600" }}>
                  Weight
                </Text>

                {!metric ? (
                  <Picker
                    selectedValue={weight}
                    style={{ width: 120, color: "white", height: 180 }}
                    onValueChange={(v) => setWeight(v)}
                  >
                    {Array.from({ length: 400 }, (_, i) => i + 70).map((v) => (
                      <Picker.Item key={v} label={`${v} lb`} value={v} />
                    ))}
                  </Picker>
                ) : (
                  <Picker
                    selectedValue={kg}
                    style={{ width: 120, color: "white", height: 180 }}
                    onValueChange={(v) => setKg(v)}
                  >
                    {Array.from({ length: 300 }, (_, i) => i + 30).map((v) => (
                      <Picker.Item key={v} label={`${v} kg`} value={v} />
                    ))}
                  </Picker>
                )}
              </View>
            </View>

            <Continue onPress={handleContinue} />
          </View>
        )}

        {/* STEP 2 — Pain Points */}
        {step === 2 && (
          <View>
            <SectionTitle>What’s holding you back?</SectionTitle>
            <Subtitle>Choose all that apply — this helps target your weak points.</Subtitle>

            {[
              "I can’t tell what looks off in my physique",
              "I don’t know which muscles are lagging",
              "My progress pics aren’t consistent",
              "I train hard but don’t see enough visual change",
              "I want a more aesthetic, balanced look",
              "I want coach-level feedback without $200/mo coaching",
            ].map((p) => {
              const selected = painPoints.includes(p);
              return (
                <TouchableOpacity
                  key={p}
                  onPress={() => togglePainPoint(p)}
                  style={{
                    backgroundColor: selected ? "#00f5a0" : "#121212",
                    padding: 16,
                    borderRadius: 14,
                    marginBottom: 12,
                  }}
                >
                  <Text style={{ color: selected ? "black" : "white", fontWeight: "600" }}>
                    {p}
                  </Text>
                </TouchableOpacity>
              );
            })}

            <Continue onPress={handleContinue} />
          </View>
        )}

        {/* STEP 3 — Goals */}
        {step === 3 && (
          <View>
            <SectionTitle>Your goals</SectionTitle>
            <Subtitle>Your breakdown will be tuned for your goal.</Subtitle>

            {[
              { name: "Gain Muscle", icon: "💪" },
              { name: "Maintain Physique", icon: "⚖️" },
              { name: "Lose Fat", icon: "🔥" },
            ].map((g) => {
              const selected = goal === g.name;
              return (
                <TouchableOpacity
                  key={g.name}
                  onPress={() => setGoal(g.name)}
                  style={{
                    backgroundColor: selected ? "#00f5a0" : "#121212",
                    padding: 18,
                    borderRadius: 14,
                    marginBottom: 16,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 18,
                      color: selected ? "black" : "white",
                      fontWeight: "700",
                    }}
                  >
                    {g.icon} {g.name}
                  </Text>
                </TouchableOpacity>
              );
            })}

            <Continue onPress={handleContinue} />
          </View>
        )}

        {/* STEP 4 — Equipment */}
        {step === 4 && (
          <View>
            <SectionTitle>Equipment preference</SectionTitle>
            <Subtitle>Your workout plan will be built around what you can actually train with.</Subtitle>

            {[
              { key: "Gym", desc: "Full gym: machines, cables, barbells, dumbbells." },
              { key: "Bodyweight", desc: "Home training, minimal or no equipment." },
              { key: "Hybrid", desc: "Some weights + home training." },
            ].map((item) => {
              const selected = equipment === item.key;
              return (
                <TouchableOpacity
                  key={item.key}
                  onPress={() => setEquipment(item.key as any)}
                  style={{
                    backgroundColor: selected ? "#00f5a0" : "#121212",
                    padding: 18,
                    borderRadius: 14,
                    marginBottom: 16,
                  }}
                >
                  <Text style={{ fontSize: 18, color: selected ? "black" : "white", fontWeight: "700" }}>
                    {item.key}
                  </Text>
                  <Text style={{ color: selected ? "#222" : "#aaa", marginTop: 6 }}>
                    {item.desc}
                  </Text>
                </TouchableOpacity>
              );
            })}

            <Continue onPress={handleContinue} />
          </View>
        )}

        {/* STEP 5 — Activity & Experience */}
        {step === 5 && (
          <View>
            <SectionTitle>Activity & experience</SectionTitle>
            <Subtitle>Helps calibrate your recommendations and training load.</Subtitle>

            <Text style={{ color: "white", fontWeight: "600", marginBottom: 10 }}>
              Activity level
            </Text>

            <View
              style={{
                flexDirection: "row",
                flexWrap: "wrap",
                justifyContent: "space-between",
                marginBottom: 30,
              }}
            >
              {["Sedentary", "Light", "Moderate", "Active", "Very Active", "Athlete"].map((lvl) => {
                const selected = activity === lvl;
                return (
                  <TouchableOpacity
                    key={lvl}
                    onPress={() => setActivity(lvl)}
                    style={{
                      flexBasis: "48%",
                      backgroundColor: selected ? "#00f5a0" : "#121212",
                      paddingVertical: 16,
                      borderRadius: 12,
                      alignItems: "center",
                      marginVertical: 6,
                    }}
                  >
                    <Text style={{ color: selected ? "black" : "white" }}>{lvl}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={{ color: "white", fontWeight: "600", marginBottom: 10 }}>
              Training experience
            </Text>

            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
              {["Beginner", "Intermediate", "Advanced"].map((lvl) => {
                const selected = experience === lvl;
                return (
                  <TouchableOpacity
                    key={lvl}
                    onPress={() => setExperience(lvl)}
                    style={{
                      flex: 1,
                      marginHorizontal: 5,
                      backgroundColor: selected ? "#00f5a0" : "#121212",
                      paddingVertical: 16,
                      borderRadius: 12,
                      alignItems: "center",
                    }}
                  >
                    <Text style={{ color: selected ? "black" : "white", fontWeight: "600" }}>
                      {lvl}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Continue onPress={handleContinue} />
          </View>
        )}

        {/* STEP 6 — Tone Mode */}
        {step === 6 && (
          <View>
            <SectionTitle>How should the AI talk to you?</SectionTitle>
            <Subtitle>Choose your feedback style.</Subtitle>

            {[
              {
                key: "Savage" as const,
                title: "Savage Mode 😈",
                subtitle: "Blunt, gym-bro honesty. Funny but still useful.",
              },
              {
                key: "Pro" as const,
                title: "Pro Coach Mode 🎯",
                subtitle: "Serious, structured, coach-style feedback.",
              },
              {
                key: "Adaptive" as const,
                title: "Adaptive Mode 🔄",
                subtitle: "Let the AI adjust tone based on your behavior.",
              },
            ].map((opt) => {
              const selected = toneMode === opt.key;
              return (
                <TouchableOpacity
                  key={opt.key}
                  onPress={() => setToneMode(opt.key)}
                  style={{
                    backgroundColor: selected ? "#00f5a0" : "#121212",
                    padding: 18,
                    borderRadius: 14,
                    marginBottom: 16,
                  }}
                >
                  <Text style={{ fontSize: 18, color: selected ? "black" : "white", fontWeight: "700" }}>
                    {opt.title}
                  </Text>
                  <Text style={{ color: selected ? "#222" : "#aaa", marginTop: 6 }}>
                    {opt.subtitle}
                  </Text>
                </TouchableOpacity>
              );
            })}

            <Continue onPress={handleContinue} />
          </View>
        )}

        {/* STEP 7 — Clothing & Guidelines */}
        {step === 7 && (
          <View>
            <SectionTitle>Before we scan</SectionTitle>
            <Subtitle>Quick guidelines so the scan passes validation.</Subtitle>

            {[
              "Wear gym shorts or underwear — legs must be visible.",
              "Shirtless is required (shirts/hoodies will be rejected).",
              "Stand tall with arms relaxed at your sides.",
              "Bright, even lighting (avoid harsh shadows).",
              "We’ll capture front, side, and back angles.",
            ].map((txt) => (
              <View
                key={txt}
                style={{
                  flexDirection: "row",
                  alignItems: "flex-start",
                  marginBottom: 12,
                }}
              >
                <Text style={{ color: "#00f5a0", marginRight: 8 }}>•</Text>
                <Text style={{ color: "#ddd", flex: 1 }}>{txt}</Text>
              </View>
            ))}

            <Continue onPress={handleContinue} />
          </View>
        )}

        {/* STEP 8 — Pre-Scan Hype + Begin Capture */}
        {step === 8 && (
          <View style={{ alignItems: "center" }}>
            <Ionicons name="scan" size={100} color="#7CFFB2" />

            <Text
              style={{
                color: "white",
                fontSize: 26,
                fontWeight: "800",
                marginTop: 30,
                textAlign: "center",
              }}
            >
              You’re ready for your scan 🔍
            </Text>

            <Text
              style={{
                color: "#999",
                marginTop: 10,
                marginBottom: 30,
                textAlign: "center",
              }}
            >
              We’ll break down symmetry, proportions, and weak points.
            </Text>

            <View style={{ width: "80%", marginBottom: 40 }}>
              {[
                "Measuring upper vs lower balance",
                "Checking symmetry & proportions",
                "Scoring aesthetics + weak points",
              ].map((txt) => (
                <View
                  key={txt}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    marginVertical: 6,
                  }}
                >
                  <View
                    style={{
                      flex: 1,
                      height: 4,
                      backgroundColor: "#00f5a0",
                      marginRight: 10,
                    }}
                  />
                  <Text style={{ color: "#7CFFB2", flex: 2 }}>{txt}</Text>
                </View>
              ))}
            </View>

            <TouchableOpacity onPress={handleFinish} style={{ width: "80%" }}>
              <LinearGradient
                colors={gradient}
                style={{ borderRadius: 14, paddingVertical: 16 }}
              >
                <Text
                  style={{
                    color: "black",
                    fontWeight: "700",
                    fontSize: 18,
                    textAlign: "center",
                  }}
                >
                  Begin AI Capture
                </Text>
              </LinearGradient>
            </TouchableOpacity>

            <Text
              style={{
                color: "#666",
                marginTop: 30,
                fontSize: 12,
                textAlign: "center",
              }}
            >
              Your photos stay on your device unless you choose to back them up later.
            </Text>
          </View>
        )}

        {/* BACK BUTTON */}
        {step > 0 && step < totalSteps - 1 && (
          <TouchableOpacity onPress={back} style={{ marginTop: 20 }}>
            <Text
              style={{
                color: "#999",
                textAlign: "center",
                textDecorationLine: "underline",
              }}
            >
              Back
            </Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </LinearGradient>
  );
}
