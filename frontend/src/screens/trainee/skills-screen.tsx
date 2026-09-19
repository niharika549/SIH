import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuthedRequest } from "@/src/api/authed";
import type { Proficiency, Skill, TraineeSkill } from "@/src/api/authed";
import { BrandHeader } from "@/src/components/brand-header";
import { ProficiencyBadge } from "@/src/components/proficiency-badge";
import { usesNativeTabs } from "@/src/navigation";
import { makeStyles, useTheme } from "@/src/theme";

export function SkillsScreen() {
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const authed = useAuthedRequest();

  const skillsQuery = useQuery({ queryKey: ["catalog", "skills"], queryFn: () => authed<Skill[]>("/catalog/skills") });
  const mySkillsQuery = useQuery({ queryKey: ["trainee", "skills"], queryFn: () => authed<TraineeSkill[]>("/trainee/skills") });

  const bottomChrome = usesNativeTabs ? insets.bottom : 0;
  const myById = new Map((mySkillsQuery.data ?? []).map((s) => [s.skill_id, s] as const));

  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={[styles.content, { paddingTop: insets.top + 18, paddingBottom: bottomChrome + 28 }]}>
        <BrandHeader compact />
        <Text style={styles.eyebrow}>SKILLS · IT & TECHNICAL</Text>
        <Text style={styles.title}>Prove what you know</Text>
        <Text style={styles.subtitle}>Take a 5-question rule-based assessment per skill. Results feed your skill-gap analysis and course recommendations.</Text>

        <View style={styles.legend}>
          <Legend colorKey="muted" label="Self-declared" />
          <Legend colorKey="brandPrimary" label="Assessed" />
          <Legend colorKey="success" label="Trainer-verified" />
        </View>

        {skillsQuery.isPending || mySkillsQuery.isPending ? (
          <View style={styles.centered} testID="skills-loading"><ActivityIndicator color={colors.brandPrimary} size="large" /></View>
        ) : null}
        {skillsQuery.isError ? (
          <View style={styles.error} testID="skills-error"><Text style={styles.errorText}>Could not load skills. Please try again shortly.</Text></View>
        ) : null}
        {skillsQuery.data?.map((skill) => {
          const mine = myById.get(skill.id);
          return (
            <View key={skill.id} style={styles.row} testID={`skill-row-${skill.id}`}>
              <View style={styles.rowCopy}>
                <Text style={styles.skillName}>{skill.name}</Text>
                <Text style={styles.skillDesc} numberOfLines={2}>{skill.description}</Text>
                <View style={styles.rowMeta}>
                  <ProficiencyBadge level={(mine?.level ?? "NONE") as Proficiency} source={mine?.source ?? null} />
                </View>
              </View>
              <Pressable
                onPress={() => router.push(`/assessment/${skill.id}`)}
                style={({ pressed }) => [styles.assessBtn, pressed && styles.pressed]}
                testID={`assess-${skill.id}`}
                accessibilityRole="button"
              >
                <MaterialCommunityIcons name={mine?.source === "ASSESSED" ? "refresh" : "play-circle-outline"} size={18} color={colors.onBrandPrimary} />
                <Text style={styles.assessText}>{mine?.source === "ASSESSED" ? "Retake" : "Assess"}</Text>
              </Pressable>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

function Legend({ colorKey, label }: { colorKey: "muted" | "brandPrimary" | "success"; label: string }) {
  const styles = useStyles();
  const { colors } = useTheme();
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendDot, { backgroundColor: colors[colorKey] }]} />
      <Text style={styles.legendLabel}>{label}</Text>
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  root: { backgroundColor: colors.surface, flex: 1 },
  content: { gap: 10, paddingHorizontal: 20 },
  eyebrow: { color: colors.brandPrimary, fontSize: 11, fontWeight: "800", letterSpacing: 1, marginTop: 18 },
  title: { color: colors.onSurface, fontSize: 26, fontWeight: "800", lineHeight: 32 },
  subtitle: { color: colors.muted, fontSize: 14, lineHeight: 20, marginBottom: 8 },
  legend: { flexDirection: "row", flexWrap: "wrap", gap: 14, marginBottom: 4 },
  legendItem: { alignItems: "center", flexDirection: "row", gap: 6 },
  legendDot: { borderRadius: 6, height: 10, width: 10 },
  legendLabel: { color: colors.muted, fontSize: 12, fontWeight: "600" },
  row: { alignItems: "center", backgroundColor: colors.surfaceSecondary, borderColor: colors.border, borderRadius: 14, borderWidth: 1, flexDirection: "row", gap: 12, marginTop: 8, padding: 14 },
  rowCopy: { flex: 1, gap: 6 },
  skillName: { color: colors.onSurface, fontSize: 15, fontWeight: "800" },
  skillDesc: { color: colors.muted, fontSize: 12, lineHeight: 17 },
  rowMeta: { flexDirection: "row", gap: 6 },
  assessBtn: { alignItems: "center", backgroundColor: colors.brandPrimary, borderRadius: 10, flexDirection: "row", gap: 5, minHeight: 44, paddingHorizontal: 14 },
  assessText: { color: colors.onBrandPrimary, fontSize: 13, fontWeight: "800" },
  pressed: { opacity: 0.8 },
  centered: { alignItems: "center", padding: 24 },
  error: { backgroundColor: colors.surfaceTertiary, borderColor: colors.error, borderRadius: 12, borderWidth: 1, padding: 14 },
  errorText: { color: colors.error, fontSize: 13 },
}));
