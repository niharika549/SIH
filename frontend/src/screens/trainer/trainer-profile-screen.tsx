import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import type { Skill, TrainerProfile } from "@/src/api/authed";
import { useAuthedRequest } from "@/src/api/authed";
import { ApiError } from "@/src/api/client";
import { useAuth } from "@/src/auth-context";
import { makeStyles, useTheme } from "@/src/theme";

export function TrainerProfileScreen() {
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const authed = useAuthedRequest();
  const queryClient = useQueryClient();
  const { refresh } = useAuth();

  const profileQuery = useQuery({
    queryKey: ["trainer", "profile"],
    queryFn: () => authed<TrainerProfile | null>("/trainer/profile"),
  });
  const skillsQuery = useQuery({ queryKey: ["catalog", "skills"], queryFn: () => authed<Skill[]>("/catalog/skills") });

  const [headline, setHeadline] = useState("");
  const [bio, setBio] = useState("");
  const [institution, setInstitution] = useState("");
  const [qualifications, setQualifications] = useState("");
  const [experienceYears, setExperienceYears] = useState("0");
  const [skillIds, setSkillIds] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (profileQuery.data && !loaded) {
      const p = profileQuery.data;
      setHeadline(p.headline);
      setBio(p.bio);
      setInstitution(p.institution);
      setQualifications(p.qualifications);
      setExperienceYears(String(p.experience_years));
      setSkillIds(p.skill_ids);
      setLoaded(true);
    }
  }, [profileQuery.data, loaded]);

  const saveMutation = useMutation({
    mutationFn: () =>
      authed("/trainer/profile", {
        method: "POST",
        body: {
          headline: headline.trim(),
          bio: bio.trim(),
          specializations: [],
          skill_ids: skillIds,
          qualifications: qualifications.trim(),
          experience_years: Number(experienceYears) || 0,
          institution: institution.trim(),
          availability: "FLEXIBLE",
        },
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["trainer", "profile"] });
      await refresh();
      router.back();
    },
    onError: (e) => setError(e instanceof ApiError ? e.message : "Unable to save profile."),
  });

  const toggleSkill = (id: string) =>
    setSkillIds((prev) => (prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]));

  const canSave = headline.trim().length >= 2;
  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={[styles.content, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 28 }]} keyboardShouldPersistTaps="handled">
        <Pressable onPress={() => router.back()} style={styles.backBtn} testID="trainer-profile-back">
          <MaterialCommunityIcons name="chevron-left" size={22} color={colors.onSurface} />
          <Text style={styles.backText}>Back</Text>
        </Pressable>
        <Text style={styles.eyebrow}>TRAINER PROFILE</Text>
        <Text style={styles.title}>Your professional identity</Text>
        <Text style={styles.subtitle}>Shown to trainees when they browse trainings. Skills you teach also gate what you can verify.</Text>
        {profileQuery.isPending ? <ActivityIndicator color={colors.brandPrimary} /> : null}

        <Field label="Headline" value={headline} onChange={setHeadline} placeholder="e.g. Full-stack mentor, 8 yrs in product" testID="tp-headline" />
        <Field label="Bio" value={bio} onChange={setBio} placeholder="Short background and teaching approach" multiline testID="tp-bio" />
        <Field label="Institution / Academy" value={institution} onChange={setInstitution} placeholder="e.g. SkillAlign Sample Academy" testID="tp-institution" />
        <Field label="Qualifications" value={qualifications} onChange={setQualifications} placeholder="e.g. B.Tech CSE, AWS SA" testID="tp-qualifications" />
        <Field label="Years of experience" value={experienceYears} onChange={setExperienceYears} keyboardType="numeric" testID="tp-experience" />

        <Text style={styles.fieldLabel}>Skills you teach</Text>
        <View style={styles.chipWrap}>
          {skillsQuery.data?.map((s) => {
            const active = skillIds.includes(s.id);
            return (
              <Pressable key={s.id} onPress={() => toggleSkill(s.id)} style={[styles.chip, active && styles.chipActive]} testID={`tp-skill-${s.id}`}>
                <Text style={[styles.chipText, active && styles.chipTextActive]}>{s.name}</Text>
              </Pressable>
            );
          })}
        </View>
        {error ? <Text style={styles.errorText}>{error}</Text> : null}
        <Pressable
          onPress={() => canSave && saveMutation.mutate()}
          disabled={!canSave || saveMutation.isPending}
          style={[styles.primaryBtn, (!canSave || saveMutation.isPending) && styles.disabled]}
          testID="tp-save"
        >
          {saveMutation.isPending ? <ActivityIndicator color={colors.onBrandPrimary} /> : <Text style={styles.primaryText}>Save profile</Text>}
        </Pressable>
      </ScrollView>
    </View>
  );
}

function Field({ label, value, onChange, placeholder, keyboardType, multiline, testID }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string;
  keyboardType?: "default" | "numeric"; multiline?: boolean; testID?: string;
}) {
  const styles = useStyles();
  const { colors } = useTheme();
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={colors.muted}
        keyboardType={keyboardType ?? "default"}
        multiline={!!multiline}
        style={[styles.input, multiline && { minHeight: 90, paddingTop: 12, textAlignVertical: "top" }]}
        testID={testID}
      />
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  root: { backgroundColor: colors.surface, flex: 1 },
  content: { gap: 10, paddingHorizontal: 20 },
  backBtn: { alignItems: "center", alignSelf: "flex-start", flexDirection: "row", gap: 2, paddingRight: 12, paddingVertical: 8 },
  backText: { color: colors.onSurface, fontSize: 14, fontWeight: "700" },
  eyebrow: { color: colors.brandPrimary, fontSize: 11, fontWeight: "800", letterSpacing: 1 },
  title: { color: colors.onSurface, fontSize: 24, fontWeight: "800" },
  subtitle: { color: colors.muted, fontSize: 13, lineHeight: 19, marginBottom: 6 },
  field: { gap: 6, marginTop: 6 },
  fieldLabel: { color: colors.onSurfaceSecondary, fontSize: 13, fontWeight: "700", marginTop: 10 },
  input: { backgroundColor: colors.surfaceSecondary, borderColor: colors.border, borderRadius: 12, borderWidth: 1, color: colors.onSurface, fontSize: 15, minHeight: 48, paddingHorizontal: 14 },
  chipWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 6 },
  chip: { alignItems: "center", backgroundColor: colors.surfaceSecondary, borderColor: colors.border, borderRadius: 999, borderWidth: 1, minHeight: 40, justifyContent: "center", paddingHorizontal: 14 },
  chipActive: { backgroundColor: colors.brandPrimary, borderColor: colors.brandPrimary },
  chipText: { color: colors.onSurfaceSecondary, fontSize: 12, fontWeight: "700" },
  chipTextActive: { color: colors.onBrandPrimary },
  errorText: { color: colors.error, fontSize: 13, marginTop: 8 },
  primaryBtn: { alignItems: "center", backgroundColor: colors.brandPrimary, borderRadius: 12, justifyContent: "center", marginTop: 20, minHeight: 50 },
  primaryText: { color: colors.onBrandPrimary, fontSize: 15, fontWeight: "800" },
  disabled: { opacity: 0.5 },
}));
