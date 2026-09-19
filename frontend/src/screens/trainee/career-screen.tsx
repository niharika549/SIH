import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import type { Career, Enrollment, RecommendationItem, SkillGap, SkillGapItem, TraineeProfile } from "@/src/api/authed";
import { PROFICIENCY_LABEL, useAuthedRequest } from "@/src/api/authed";
import { ApiError } from "@/src/api/client";
import { BrandHeader } from "@/src/components/brand-header";
import { ProficiencyBadge } from "@/src/components/proficiency-badge";
import { usesNativeTabs } from "@/src/navigation";
import { makeStyles, useTheme } from "@/src/theme";

export function CareerScreen() {
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const authed = useAuthedRequest();
  const queryClient = useQueryClient();
  const [enrollError, setEnrollError] = useState("");

  const profileQuery = useQuery({ queryKey: ["trainee", "profile"], queryFn: () => authed<TraineeProfile | null>("/trainee/profile") });
  const gapQuery = useQuery({
    queryKey: ["trainee", "skill-gap"],
    queryFn: () => authed<SkillGap>("/trainee/skill-gap"),
    enabled: !!profileQuery.data?.career_goal_id,
    retry: false,
  });
  const careerQuery = useQuery({
    queryKey: ["catalog", "career", profileQuery.data?.career_goal_id],
    queryFn: () => authed<Career>(`/catalog/careers/${profileQuery.data!.career_goal_id}`),
    enabled: !!profileQuery.data?.career_goal_id,
  });
  const recQuery = useQuery({
    queryKey: ["trainee", "recommendations"],
    queryFn: () => authed<{ items: RecommendationItem[] }>("/trainee/recommendations"),
    enabled: !!profileQuery.data?.career_goal_id,
  });
  const enrollmentsQuery = useQuery({
    queryKey: ["trainee", "enrollments"],
    queryFn: () => authed<Enrollment[]>("/trainee/enrollments"),
  });
  const enrollMutation = useMutation({
    mutationFn: (trainingId: string) =>
      authed("/trainee/enrollments", { method: "POST", body: { training_id: trainingId } }),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["trainee", "enrollments"] }),
    onError: (e) => setEnrollError(e instanceof ApiError ? e.message : "Unable to enroll right now."),
  });
  const enrolledIds = new Set(
    (enrollmentsQuery.data ?? []).filter((e) => e.status !== "DROPPED").map((e) => e.training_id),
  );

  const bottomChrome = usesNativeTabs ? insets.bottom : 0;

  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={[styles.content, { paddingTop: insets.top + 18, paddingBottom: bottomChrome + 28 }]}>
        <BrandHeader compact />
        <Text style={styles.eyebrow}>CAREER · SKILL ALIGNMENT</Text>
        {profileQuery.isPending ? <ActivityIndicator color={colors.brandPrimary} /> : null}

        {careerQuery.data ? (
          <View style={styles.goalCard}>
            <View style={styles.goalHead}>
              <MaterialCommunityIcons name="target" size={22} color={colors.onBrandPrimary} />
              <Text style={styles.goalKicker}>YOUR CAREER GOAL</Text>
            </View>
            <Text style={styles.goalTitle}>{careerQuery.data.name}</Text>
            <Text style={styles.goalDesc}>{careerQuery.data.description}</Text>
          </View>
        ) : null}

        <Text style={styles.sectionTitle}>Skill gap</Text>
        {gapQuery.isPending && !!profileQuery.data?.career_goal_id ? (
          <ActivityIndicator color={colors.brandPrimary} />
        ) : null}
        {gapQuery.data ? (
          <View>
            <View style={styles.summaryRow}>
              <SummaryTile label="Matched" value={`${gapQuery.data.matched} / ${gapQuery.data.total}`} tint={colors.success} />
              <SummaryTile label="Skills to close" value={String(gapQuery.data.items.filter((i) => i.status !== "MET").length)} tint={colors.brandPrimary} />
            </View>
            {gapQuery.data.items.map((item) => (
              <GapRow key={item.skill_id} item={item} />
            ))}
          </View>
        ) : null}
        {gapQuery.isError ? (
          <Text style={styles.errorText} testID="gap-error">Could not load skill gap. Confirm your career goal is set.</Text>
        ) : null}

        <Text style={styles.sectionTitle}>Recommended training</Text>
        <Text style={styles.demoTag}>DEMO/SAMPLE DATA — sample training providers seeded for the SIH demonstration.</Text>
        {recQuery.isPending && !!profileQuery.data?.career_goal_id ? <ActivityIndicator color={colors.brandPrimary} /> : null}
        {recQuery.data && recQuery.data.items.length === 0 ? (
          <View style={styles.empty} testID="recommendations-empty">
            <MaterialCommunityIcons name="party-popper" size={22} color={colors.success} />
            <Text style={styles.emptyText}>All required skills met at target level — you're ready to explore employer opportunities.</Text>
          </View>
        ) : null}
        {recQuery.data?.items.map((rec) => (
          <View key={rec.training.id} style={styles.recCard} testID={`recommendation-${rec.training.id}`}>
            <Text style={styles.recTitle}>{rec.training.title}</Text>
            <Text style={styles.recDesc} numberOfLines={2}>{rec.training.description}</Text>
            <View style={styles.recMeta}>
              <Meta icon="clock-outline" text={`${rec.training.duration_hours} hrs`} />
              <Meta icon="broadcast" text={rec.training.mode} />
              <Meta icon="account-group-outline" text={`${rec.training.seats} seats`} />
            </View>
            <View style={styles.recReason}>
              <MaterialCommunityIcons name="lightbulb-on-outline" size={16} color={colors.brandPrimary} />
              <Text style={styles.recReasonText}>{rec.reason}</Text>
            </View>
            <View style={styles.recActions}>
              <Pressable
                onPress={() => rec.covered_gaps[0] && router.push(`/assessment/${rec.covered_gaps[0]}`)}
                style={styles.recCta}
                testID={`recommendation-assess-${rec.training.id}`}
              >
                <MaterialCommunityIcons name="play-circle-outline" size={16} color={colors.brandPrimary} />
                <Text style={styles.recCtaText}>Quick assess</Text>
              </Pressable>
              {enrolledIds.has(rec.training.id) ? (
                <View style={styles.enrolledPill} testID={`enrolled-${rec.training.id}`}>
                  <MaterialCommunityIcons name="check-circle" size={14} color={colors.success} />
                  <Text style={styles.enrolledText}>Enrolled</Text>
                </View>
              ) : (
                <Pressable
                  onPress={() => { setEnrollError(""); enrollMutation.mutate(rec.training.id); }}
                  disabled={enrollMutation.isPending}
                  style={styles.enrollBtn}
                  testID={`enroll-${rec.training.id}`}
                  accessibilityRole="button"
                >
                  <MaterialCommunityIcons name="plus-circle-outline" size={16} color={colors.onBrandPrimary} />
                  <Text style={styles.enrollText}>Enroll</Text>
                </Pressable>
              )}
            </View>
          </View>
        ))}
        {enrollError ? <Text style={styles.errorText} testID="enroll-error">{enrollError}</Text> : null}
      </ScrollView>
    </View>
  );
}

function SummaryTile({ label, value, tint }: { label: string; value: string; tint: string }) {
  const styles = useStyles();
  return (
    <View style={styles.summaryTile}>
      <View style={[styles.summaryBar, { backgroundColor: tint }]} />
      <Text style={styles.summaryValue}>{value}</Text>
      <Text style={styles.summaryLabel}>{label}</Text>
    </View>
  );
}

function GapRow({ item }: { item: SkillGapItem }) {
  const styles = useStyles();
  const { colors } = useTheme();
  const statusColor = item.status === "MET" ? colors.success : item.status === "NOT_STARTED" ? colors.error : colors.warning;
  const statusText = item.status === "MET" ? "Met" : item.status === "NOT_STARTED" ? "Not started" : `Needs ${PROFICIENCY_LABEL[item.required_level]}`;
  return (
    <View style={styles.gapRow} testID={`gap-${item.skill_id}`}>
      <View style={styles.gapCopy}>
        <Text style={styles.gapName}>{item.skill_name}</Text>
        <View style={styles.gapLine}>
          <ProficiencyBadge level={item.current_level} source={item.source} />
          <MaterialCommunityIcons name="arrow-right" size={14} color={colors.muted} />
          <ProficiencyBadge level={item.required_level} />
        </View>
      </View>
      <View style={[styles.gapPill, { backgroundColor: statusColor }]}><Text style={styles.gapPillText}>{statusText}</Text></View>
    </View>
  );
}

function Meta({ icon, text }: { icon: keyof typeof MaterialCommunityIcons.glyphMap; text: string }) {
  const styles = useStyles();
  const { colors } = useTheme();
  return (
    <View style={styles.metaItem}>
      <MaterialCommunityIcons name={icon} size={13} color={colors.muted} />
      <Text style={styles.metaText}>{text}</Text>
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  root: { backgroundColor: colors.surface, flex: 1 },
  content: { gap: 12, paddingHorizontal: 20 },
  eyebrow: { color: colors.brandPrimary, fontSize: 11, fontWeight: "800", letterSpacing: 1, marginTop: 14 },
  goalCard: { backgroundColor: colors.brandPrimary, borderRadius: 18, gap: 6, marginTop: 6, padding: 18 },
  goalHead: { alignItems: "center", flexDirection: "row", gap: 8 },
  goalKicker: { color: colors.onBrandPrimary, fontSize: 11, fontWeight: "800", letterSpacing: 1, opacity: 0.9 },
  goalTitle: { color: colors.onBrandPrimary, fontSize: 22, fontWeight: "800" },
  goalDesc: { color: colors.onBrandPrimary, fontSize: 13, lineHeight: 19, opacity: 0.9 },
  sectionTitle: { color: colors.onSurface, fontSize: 19, fontWeight: "800", marginTop: 22 },
  demoTag: { backgroundColor: colors.brandTertiary, borderRadius: 8, color: colors.onBrandTertiary, fontSize: 11, fontWeight: "700", padding: 8 },
  summaryRow: { flexDirection: "row", gap: 10, marginTop: 6 },
  summaryTile: { backgroundColor: colors.surfaceSecondary, borderColor: colors.border, borderRadius: 14, borderWidth: 1, flex: 1, overflow: "hidden", padding: 14 },
  summaryBar: { borderRadius: 2, height: 4, marginBottom: 8, width: 32 },
  summaryValue: { color: colors.onSurface, fontSize: 22, fontWeight: "800" },
  summaryLabel: { color: colors.muted, fontSize: 12, fontWeight: "700" },
  gapRow: { alignItems: "center", backgroundColor: colors.surfaceSecondary, borderColor: colors.border, borderRadius: 12, borderWidth: 1, flexDirection: "row", gap: 10, marginTop: 8, padding: 12 },
  gapCopy: { flex: 1, gap: 8 },
  gapName: { color: colors.onSurface, fontSize: 14, fontWeight: "800" },
  gapLine: { alignItems: "center", flexDirection: "row", gap: 6, flexWrap: "wrap" },
  gapPill: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 },
  gapPillText: { color: colors.onBrandPrimary, fontSize: 11, fontWeight: "800", letterSpacing: 0.3 },
  errorText: { color: colors.error, fontSize: 13 },
  empty: { alignItems: "center", backgroundColor: colors.surfaceSecondary, borderColor: colors.border, borderRadius: 14, borderWidth: 1, flexDirection: "row", gap: 10, padding: 14 },
  emptyText: { color: colors.onSurface, flex: 1, fontSize: 13, lineHeight: 19 },
  recCard: { backgroundColor: colors.surfaceSecondary, borderColor: colors.border, borderRadius: 16, borderWidth: 1, gap: 8, marginTop: 8, padding: 14 },
  recTitle: { color: colors.onSurface, fontSize: 15, fontWeight: "800" },
  recDesc: { color: colors.muted, fontSize: 12, lineHeight: 18 },
  recMeta: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  metaItem: { alignItems: "center", flexDirection: "row", gap: 4 },
  metaText: { color: colors.muted, fontSize: 11, fontWeight: "700" },
  recReason: { alignItems: "flex-start", backgroundColor: colors.brandTertiary, borderRadius: 8, flexDirection: "row", gap: 6, padding: 9 },
  recReasonText: { color: colors.onBrandTertiary, flex: 1, fontSize: 12, lineHeight: 17 },
  recActions: { alignItems: "center", flexDirection: "row", gap: 10, marginTop: 2 },
  recCta: { alignItems: "center", flexDirection: "row", gap: 4, paddingVertical: 8 },
  recCtaText: { color: colors.brandPrimary, fontSize: 12, fontWeight: "800" },
  enrollBtn: { alignItems: "center", backgroundColor: colors.brandPrimary, borderRadius: 10, flexDirection: "row", gap: 5, minHeight: 40, paddingHorizontal: 14 },
  enrollText: { color: colors.onBrandPrimary, fontSize: 12, fontWeight: "800" },
  enrolledPill: { alignItems: "center", backgroundColor: colors.surfaceTertiary, borderRadius: 999, flexDirection: "row", gap: 5, paddingHorizontal: 12, paddingVertical: 8 },
  enrolledText: { color: colors.success, fontSize: 12, fontWeight: "800" },
}));
