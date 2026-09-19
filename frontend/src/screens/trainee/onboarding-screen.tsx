import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { useMemo, useState } from "react";
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ApiError } from "@/src/api/client";
import type { Career, TraineeCategory } from "@/src/api/authed";
import { useAuthedRequest } from "@/src/api/authed";
import { useAuth } from "@/src/auth-context";
import { makeStyles, useTheme } from "@/src/theme";

type CategoryDef = {
  value: TraineeCategory;
  title: string;
  blurb: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  fields: { key: string; label: string; placeholder: string; keyboardType?: "default" | "numeric" }[];
};

const CATEGORIES: CategoryDef[] = [
  {
    value: "STUDENT",
    title: "Student",
    blurb: "Currently studying and preparing for your first role.",
    icon: "school-outline",
    fields: [
      { key: "institution", label: "Institution", placeholder: "e.g. IIT Bombay" },
      { key: "degree", label: "Degree", placeholder: "e.g. B.Tech" },
      { key: "branch", label: "Branch / Major", placeholder: "e.g. Computer Science" },
      { key: "graduation_year", label: "Graduation year", placeholder: "e.g. 2027", keyboardType: "numeric" },
    ],
  },
  {
    value: "JOB_HOLDER",
    title: "Working professional",
    blurb: "Already employed, looking to advance or reskill.",
    icon: "briefcase-outline",
    fields: [
      { key: "organization", label: "Current organization", placeholder: "e.g. Infosys" },
      { key: "job_title", label: "Job title", placeholder: "e.g. Software Engineer" },
      { key: "experience_years", label: "Years of experience", placeholder: "e.g. 3", keyboardType: "numeric" },
      { key: "advancement_goal", label: "What are you working toward?", placeholder: "e.g. Move into cloud engineering" },
    ],
  },
  {
    value: "CAREER_GAP",
    title: "Career gap / returning",
    blurb: "Been away from work or study and planning to re-enter.",
    icon: "restart",
    fields: [
      { key: "previous_role", label: "Previous role or field", placeholder: "e.g. Frontend developer" },
      { key: "gap_duration", label: "Gap length", placeholder: "e.g. 18 months" },
      { key: "reentry_path", label: "Desired re-entry path", placeholder: "e.g. Full stack developer" },
      { key: "training_needs", label: "Training focus", placeholder: "e.g. Refresh React and Node" },
    ],
  },
];

const STATES = [
  { code: "MH", name: "Maharashtra" },
  { code: "KA", name: "Karnataka" },
  { code: "DL", name: "Delhi" },
  { code: "TN", name: "Tamil Nadu" },
  { code: "TS", name: "Telangana" },
  { code: "GJ", name: "Gujarat" },
  { code: "UP", name: "Uttar Pradesh" },
  { code: "WB", name: "West Bengal" },
];

const MH_DISTRICTS = [
  { code: "MH-MUM", name: "Mumbai" },
  { code: "MH-PUN", name: "Pune" },
  { code: "MH-NAG", name: "Nagpur" },
  { code: "MH-NAS", name: "Nashik" },
  { code: "MH-AUR", name: "Aurangabad" },
];

type Step = 0 | 1 | 2 | 3;

export function OnboardingScreen() {
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const authed = useAuthedRequest();
  const { user, refresh } = useAuth();
  const [step, setStep] = useState<Step>(0);
  const [category, setCategory] = useState<TraineeCategory>("STUDENT");
  const [details, setDetails] = useState<Record<string, string>>({});
  const [careerGoalId, setCareerGoalId] = useState<string>("");
  const [stateCode, setStateCode] = useState<string>("MH");
  const [districtCode, setDistrictCode] = useState<string>("MH-PUN");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const careersQuery = useQuery({
    queryKey: ["catalog", "careers"],
    queryFn: () => authed<Career[]>("/catalog/careers"),
  });

  const currentCat = useMemo(() => CATEGORIES.find((c) => c.value === category)!, [category]);

  const canContinue = () => {
    if (step === 0) return !!category;
    if (step === 1) return currentCat.fields.slice(0, 2).every((f) => (details[f.key] ?? "").trim().length > 0);
    if (step === 2) return !!stateCode;
    if (step === 3) return !!careerGoalId;
    return false;
  };

  const submit = async () => {
    setError("");
    setSubmitting(true);
    try {
      await authed("/trainee/profile", {
        method: "POST",
        body: {
          category,
          category_details: details,
          career_goal_id: careerGoalId,
          state_code: stateCode || null,
          district_code: districtCode || null,
        },
      });
      await refresh();
      router.replace("/(tabs)");
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Unable to save profile right now.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.root}>
      <ScrollView contentContainerStyle={[styles.content, { paddingTop: insets.top + 18, paddingBottom: insets.bottom + 28 }]} keyboardShouldPersistTaps="handled">
        <Text style={styles.eyebrow}>ONBOARDING · STEP {step + 1} OF 4</Text>
        <Text style={styles.title}>{stepTitle(step)}</Text>
        <Text style={styles.subtitle}>{stepSubtitle(step, user?.full_name?.split(" ")[0] ?? "there")}</Text>
        <View style={styles.progress}>
          {[0, 1, 2, 3].map((i) => (
            <View key={i} style={[styles.progressDot, i <= step && styles.progressDotActive]} />
          ))}
        </View>

        {step === 0 ? (
          <View style={styles.cards}>
            {CATEGORIES.map((c) => (
              <Pressable
                key={c.value}
                onPress={() => setCategory(c.value)}
                style={[styles.categoryCard, category === c.value && styles.categoryCardActive]}
                testID={`category-${c.value.toLowerCase()}`}
                accessibilityRole="radio"
                accessibilityState={{ selected: category === c.value }}
              >
                <View style={styles.categoryIcon}><MaterialCommunityIcons name={c.icon} size={22} color={category === c.value ? colors.onBrandPrimary : colors.brandPrimary} /></View>
                <View style={styles.categoryCopy}>
                  <Text style={[styles.categoryTitle, category === c.value && { color: colors.onBrandPrimary }]}>{c.title}</Text>
                  <Text style={[styles.categoryBlurb, category === c.value && { color: colors.onBrandPrimary, opacity: 0.9 }]}>{c.blurb}</Text>
                </View>
                {category === c.value ? <MaterialCommunityIcons name="check-circle" size={22} color={colors.onBrandPrimary} /> : null}
              </Pressable>
            ))}
          </View>
        ) : null}

        {step === 1 ? (
          <View style={styles.fields}>
            {currentCat.fields.map((f) => (
              <View key={f.key} style={styles.field}>
                <Text style={styles.fieldLabel}>{f.label}</Text>
                <TextInput
                  value={details[f.key] ?? ""}
                  onChangeText={(v) => setDetails((prev) => ({ ...prev, [f.key]: v }))}
                  placeholder={f.placeholder}
                  placeholderTextColor={colors.muted}
                  keyboardType={f.keyboardType ?? "default"}
                  style={styles.input}
                  testID={`onboarding-${f.key}`}
                />
              </View>
            ))}
          </View>
        ) : null}

        {step === 2 ? (
          <View style={styles.fields}>
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>State</Text>
              <View style={styles.chipWrap}>
                {STATES.map((s) => (
                  <Pressable
                    key={s.code}
                    onPress={() => { setStateCode(s.code); if (s.code !== "MH") setDistrictCode(""); }}
                    style={[styles.chip, stateCode === s.code && styles.chipActive]}
                    testID={`state-${s.code}`}
                  >
                    <Text style={[styles.chipText, stateCode === s.code && styles.chipTextActive]}>{s.name}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
            {stateCode === "MH" ? (
              <View style={styles.field}>
                <Text style={styles.fieldLabel}>District (Maharashtra demo)</Text>
                <View style={styles.chipWrap}>
                  {MH_DISTRICTS.map((d) => (
                    <Pressable
                      key={d.code}
                      onPress={() => setDistrictCode(d.code)}
                      style={[styles.chip, districtCode === d.code && styles.chipActive]}
                      testID={`district-${d.code}`}
                    >
                      <Text style={[styles.chipText, districtCode === d.code && styles.chipTextActive]}>{d.name}</Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            ) : (
              <Text style={styles.helper}>District selection is available for Maharashtra in this demo phase; other states use state-level scope.</Text>
            )}
          </View>
        ) : null}

        {step === 3 ? (
          <View style={styles.fields}>
            {careersQuery.isPending ? <ActivityIndicator color={colors.brandPrimary} /> : null}
            {careersQuery.isError ? <Text style={styles.errorText}>Could not load career catalog. Pull to retry.</Text> : null}
            {careersQuery.data?.map((c) => (
              <Pressable
                key={c.id}
                onPress={() => setCareerGoalId(c.id)}
                style={[styles.careerCard, careerGoalId === c.id && styles.careerCardActive]}
                testID={`career-${c.id}`}
                accessibilityRole="radio"
                accessibilityState={{ selected: careerGoalId === c.id }}
              >
                <View style={styles.careerHead}>
                  <Text style={[styles.careerTitle, careerGoalId === c.id && { color: colors.onBrandPrimary }]}>{c.name}</Text>
                  {careerGoalId === c.id ? <MaterialCommunityIcons name="check-circle" size={20} color={colors.onBrandPrimary} /> : null}
                </View>
                <Text style={[styles.careerText, careerGoalId === c.id && { color: colors.onBrandPrimary, opacity: 0.9 }]}>{c.description}</Text>
                <Text style={[styles.careerMeta, careerGoalId === c.id && { color: colors.onBrandPrimary, opacity: 0.9 }]}>{c.required_skills.length} core skills</Text>
              </Pressable>
            ))}
          </View>
        ) : null}

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <View style={styles.footer}>
          {step > 0 ? (
            <Pressable onPress={() => setStep((s) => (s - 1) as Step)} style={styles.secondaryBtn} testID="onboarding-back">
              <Text style={styles.secondaryText}>Back</Text>
            </Pressable>
          ) : <View style={styles.spacer} />}
          {step < 3 ? (
            <Pressable
              onPress={() => canContinue() && setStep((s) => (s + 1) as Step)}
              disabled={!canContinue()}
              style={[styles.primaryBtn, !canContinue() && styles.disabled]}
              testID="onboarding-next"
            >
              <Text style={styles.primaryText}>Continue</Text>
            </Pressable>
          ) : (
            <Pressable
              onPress={submit}
              disabled={!canContinue() || submitting}
              style={[styles.primaryBtn, (!canContinue() || submitting) && styles.disabled]}
              testID="onboarding-finish"
            >
              {submitting ? <ActivityIndicator color={colors.onBrandPrimary} /> : <Text style={styles.primaryText}>Finish setup</Text>}
            </Pressable>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function stepTitle(step: Step) {
  if (step === 0) return "Which trainee category fits you?";
  if (step === 1) return "Tell us a little about your background";
  if (step === 2) return "Where are you based?";
  return "Choose your career goal";
}
function stepSubtitle(step: Step, name: string) {
  if (step === 0) return `Welcome, ${name}. This shapes the plan we build with you.`;
  if (step === 1) return "Only what's useful to route you to the right training. You can update this later.";
  if (step === 2) return "Government planning uses these codes to keep intelligence within your district's scope.";
  return "The gap analysis and course recommendations are built from this goal.";
}

const useStyles = makeStyles((colors) => ({
  root: { backgroundColor: colors.surface, flex: 1 },
  content: { gap: 12, paddingHorizontal: 20 },
  eyebrow: { color: colors.brandPrimary, fontSize: 11, fontWeight: "800", letterSpacing: 1 },
  title: { color: colors.onSurface, fontSize: 24, fontWeight: "800", lineHeight: 30 },
  subtitle: { color: colors.muted, fontSize: 14, lineHeight: 21 },
  progress: { flexDirection: "row", gap: 6, marginVertical: 8 },
  progressDot: { backgroundColor: colors.surfaceTertiary, borderRadius: 999, flex: 1, height: 6 },
  progressDotActive: { backgroundColor: colors.brandPrimary },
  cards: { gap: 10, marginTop: 8 },
  categoryCard: { alignItems: "center", backgroundColor: colors.surfaceSecondary, borderColor: colors.border, borderRadius: 16, borderWidth: 1, flexDirection: "row", gap: 12, padding: 14 },
  categoryCardActive: { backgroundColor: colors.brandPrimary, borderColor: colors.brandPrimary },
  categoryIcon: { alignItems: "center", backgroundColor: colors.brandTertiary, borderRadius: 22, height: 44, justifyContent: "center", width: 44 },
  categoryCopy: { flex: 1, gap: 4 },
  categoryTitle: { color: colors.onSurface, fontSize: 16, fontWeight: "800" },
  categoryBlurb: { color: colors.muted, fontSize: 13, lineHeight: 18 },
  fields: { gap: 14, marginTop: 6 },
  field: { gap: 8 },
  fieldLabel: { color: colors.onSurfaceSecondary, fontSize: 13, fontWeight: "700" },
  input: { backgroundColor: colors.surfaceSecondary, borderColor: colors.border, borderRadius: 12, borderWidth: 1, color: colors.onSurface, fontSize: 15, minHeight: 48, paddingHorizontal: 14 },
  chipWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { alignItems: "center", backgroundColor: colors.surfaceSecondary, borderColor: colors.border, borderRadius: 999, borderWidth: 1, minHeight: 40, justifyContent: "center", paddingHorizontal: 14 },
  chipActive: { backgroundColor: colors.brandPrimary, borderColor: colors.brandPrimary },
  chipText: { color: colors.onSurfaceSecondary, fontSize: 13, fontWeight: "700" },
  chipTextActive: { color: colors.onBrandPrimary },
  helper: { color: colors.muted, fontSize: 12, lineHeight: 17 },
  careerCard: { backgroundColor: colors.surfaceSecondary, borderColor: colors.border, borderRadius: 16, borderWidth: 1, gap: 6, padding: 14 },
  careerCardActive: { backgroundColor: colors.brandPrimary, borderColor: colors.brandPrimary },
  careerHead: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  careerTitle: { color: colors.onSurface, fontSize: 16, fontWeight: "800" },
  careerText: { color: colors.muted, fontSize: 13, lineHeight: 19 },
  careerMeta: { color: colors.brandPrimary, fontSize: 12, fontWeight: "700" },
  errorText: { color: colors.error, fontSize: 13 },
  footer: { flexDirection: "row", gap: 10, marginTop: 22 },
  spacer: { flex: 0.5 },
  primaryBtn: { alignItems: "center", backgroundColor: colors.brandPrimary, borderRadius: 12, flex: 1, justifyContent: "center", minHeight: 50 },
  primaryText: { color: colors.onBrandPrimary, fontSize: 15, fontWeight: "800" },
  secondaryBtn: { alignItems: "center", borderColor: colors.border, borderRadius: 12, borderWidth: 1, flex: 0.5, justifyContent: "center", minHeight: 50 },
  secondaryText: { color: colors.onSurface, fontSize: 15, fontWeight: "700" },
  disabled: { opacity: 0.5 },
}));
