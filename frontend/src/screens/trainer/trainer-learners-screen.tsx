import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import type { Enrollment, Proficiency, Training } from "@/src/api/authed";
import { useAuthedRequest } from "@/src/api/authed";
import { ApiError } from "@/src/api/client";
import { BrandHeader } from "@/src/components/brand-header";
import { usesNativeTabs } from "@/src/navigation";
import { makeStyles, useTheme } from "@/src/theme";

const STATUS_LABEL: Record<Enrollment["status"], string> = {
  ENROLLED: "Enrolled",
  COMPLETED: "Completed",
  DROPPED: "Dropped",
};

export function TrainerLearnersScreen() {
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const authed = useAuthedRequest();
  const queryClient = useQueryClient();

  const enrollmentsQuery = useQuery({
    queryKey: ["trainer", "enrollments"],
    queryFn: () => authed<Enrollment[]>("/trainer/enrollments"),
  });

  const [verifying, setVerifying] = useState<Enrollment | null>(null);
  const [verifySkill, setVerifySkill] = useState<string>("");
  const [verifyLevel, setVerifyLevel] = useState<Proficiency>("INTERMEDIATE");
  const [verifyNote, setVerifyNote] = useState("");
  const [error, setError] = useState("");

  const completeMutation = useMutation({
    mutationFn: (enrollmentId: string) =>
      authed(`/trainer/enrollments/${enrollmentId}/complete`, { method: "POST", body: { trainer_notes: "" } }),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["trainer", "enrollments"] }),
    onError: (e) => setError(e instanceof ApiError ? e.message : "Unable to complete enrollment."),
  });

  const verifyMutation = useMutation({
    mutationFn: async () => {
      if (!verifying || !verifySkill) throw new Error("Pick a skill");
      return authed(`/trainer/enrollments/${verifying.id}/verify-skill`, {
        method: "POST",
        body: { skill_id: verifySkill, level: verifyLevel, note: verifyNote.trim() },
      });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["trainer", "enrollments"] });
      setVerifying(null);
      setVerifySkill("");
      setVerifyNote("");
    },
    onError: (e) => setError(e instanceof ApiError ? e.message : "Unable to verify skill."),
  });

  const bottomChrome = usesNativeTabs ? insets.bottom : 0;
  const openVerify = (e: Enrollment) => {
    setVerifying(e);
    setVerifySkill(e.training?.skills[0]?.skill_id ?? "");
    setVerifyLevel("INTERMEDIATE");
    setVerifyNote("");
    setError("");
  };

  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={[styles.content, { paddingTop: insets.top + 18, paddingBottom: bottomChrome + 28 }]}>
        <BrandHeader compact />
        <Text style={styles.eyebrow}>TRAINER · LEARNERS</Text>
        <Text style={styles.title}>Enrolled learners</Text>
        <Text style={styles.subtitle}>Complete enrollments and verify skills. Verified skills appear on the trainee's profile as TRAINER_VERIFIED.</Text>

        {enrollmentsQuery.isPending ? (
          <View style={styles.centered} testID="learners-loading"><ActivityIndicator color={colors.brandPrimary} size="large" /></View>
        ) : null}
        {enrollmentsQuery.data && enrollmentsQuery.data.length === 0 ? (
          <View style={styles.empty} testID="learners-empty">
            <MaterialCommunityIcons name="account-group-outline" size={22} color={colors.brandPrimary} />
            <Text style={styles.emptyText}>No enrollments yet. Publish a training and trainees will appear here as they enroll.</Text>
          </View>
        ) : null}
        {enrollmentsQuery.data?.map((e) => (
          <View key={e.id} style={styles.card} testID={`enrollment-${e.id}`}>
            <View style={styles.cardHead}>
              <View style={styles.learnerAvatar}><Text style={styles.learnerAvatarText}>{(e.trainee?.full_name ?? "?").slice(0, 1).toUpperCase()}</Text></View>
              <View style={styles.learnerCopy}>
                <Text style={styles.learnerName}>{e.trainee?.full_name ?? "Learner"}</Text>
                <Text style={styles.learnerEmail}>{e.trainee?.email ?? ""}</Text>
                <Text style={styles.learnerTraining}>{e.training?.title ?? "Training"}</Text>
              </View>
              <View style={[styles.statusPill, { backgroundColor: e.status === "COMPLETED" ? colors.success : e.status === "ENROLLED" ? colors.brandPrimary : colors.muted }]}>
                <Text style={styles.statusText}>{STATUS_LABEL[e.status]}</Text>
              </View>
            </View>
            {e.verified_skills.length > 0 ? (
              <View style={styles.verifiedRow}>
                {e.verified_skills.map((v) => (
                  <View key={v.skill_id} style={styles.verifiedTag} testID={`verified-${e.id}-${v.skill_id}`}>
                    <MaterialCommunityIcons name="check-decagram" size={12} color={colors.success} />
                    <Text style={styles.verifiedText}>{v.skill_id.replace(/^skill-/, "").replace(/-/g, " ")} · {v.level}</Text>
                  </View>
                ))}
              </View>
            ) : null}
            <View style={styles.actions}>
              <Pressable
                onPress={() => openVerify(e)}
                style={[styles.actionBtn, styles.actionPrimary]}
                testID={`verify-skill-${e.id}`}
                accessibilityRole="button"
              >
                <MaterialCommunityIcons name="certificate-outline" size={16} color={colors.onBrandPrimary} />
                <Text style={styles.actionPrimaryText}>Verify skill</Text>
              </Pressable>
              {e.status !== "COMPLETED" ? (
                <Pressable
                  onPress={() => completeMutation.mutate(e.id)}
                  style={styles.actionBtn}
                  testID={`complete-${e.id}`}
                  accessibilityRole="button"
                >
                  <MaterialCommunityIcons name="check-circle-outline" size={16} color={colors.brandPrimary} />
                  <Text style={styles.actionText}>Mark complete</Text>
                </Pressable>
              ) : null}
            </View>
          </View>
        ))}
      </ScrollView>

      {verifying ? (
        <View style={styles.sheetOverlay}>
          <View style={styles.sheet} testID="verify-sheet">
            <View style={styles.sheetHead}>
              <Text style={styles.sheetTitle}>Verify a skill</Text>
              <Pressable onPress={() => setVerifying(null)} testID="close-verify" style={styles.closeBtn}><MaterialCommunityIcons name="close" size={22} color={colors.onSurface} /></Pressable>
            </View>
            <Text style={styles.sheetSub}>{verifying.trainee?.full_name} · {verifying.training?.title}</Text>
            <Text style={styles.fieldLabel}>Skill (only skills covered by this training)</Text>
            <View style={styles.chipWrap}>
              {verifying.training?.skills.map((s) => (
                <Pressable
                  key={s.skill_id}
                  onPress={() => setVerifySkill(s.skill_id)}
                  style={[styles.chip, verifySkill === s.skill_id && styles.chipActive]}
                  testID={`verify-skill-chip-${s.skill_id}`}
                >
                  <Text style={[styles.chipText, verifySkill === s.skill_id && styles.chipTextActive]}>{s.skill_id.replace(/^skill-/, "").replace(/-/g, " ")}</Text>
                </Pressable>
              ))}
            </View>
            <Text style={styles.fieldLabel}>Verified level</Text>
            <View style={styles.chipWrap}>
              {(["BEGINNER", "INTERMEDIATE", "ADVANCED"] as Proficiency[]).map((lvl) => (
                <Pressable
                  key={lvl}
                  onPress={() => setVerifyLevel(lvl)}
                  style={[styles.chip, verifyLevel === lvl && styles.chipActive]}
                  testID={`verify-level-${lvl}`}
                >
                  <Text style={[styles.chipText, verifyLevel === lvl && styles.chipTextActive]}>{lvl}</Text>
                </Pressable>
              ))}
            </View>
            <Text style={styles.fieldLabel}>Note for the learner (optional)</Text>
            <TextInput
              value={verifyNote}
              onChangeText={setVerifyNote}
              placeholder="e.g. Shipped a dashboard covering hooks + testing"
              placeholderTextColor={colors.muted}
              style={styles.input}
              testID="verify-note-input"
            />
            {error ? <Text style={styles.errorText}>{error}</Text> : null}
            <View style={styles.footer}>
              <Pressable onPress={() => setVerifying(null)} style={styles.secondaryBtn} testID="cancel-verify"><Text style={styles.secondaryText}>Cancel</Text></Pressable>
              <Pressable
                onPress={() => verifyMutation.mutate()}
                disabled={!verifySkill || verifyMutation.isPending}
                style={[styles.primaryBtn, (!verifySkill || verifyMutation.isPending) && styles.disabled]}
                testID="confirm-verify"
              >
                {verifyMutation.isPending ? <ActivityIndicator color={colors.onBrandPrimary} /> : <Text style={styles.primaryText}>Verify</Text>}
              </Pressable>
            </View>
          </View>
        </View>
      ) : null}
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  root: { backgroundColor: colors.surface, flex: 1 },
  content: { gap: 10, paddingHorizontal: 20 },
  eyebrow: { color: colors.brandPrimary, fontSize: 11, fontWeight: "800", letterSpacing: 1, marginTop: 16 },
  title: { color: colors.onSurface, fontSize: 24, fontWeight: "800" },
  subtitle: { color: colors.muted, fontSize: 13, lineHeight: 19, marginBottom: 4 },
  centered: { alignItems: "center", padding: 24 },
  empty: { alignItems: "center", backgroundColor: colors.surfaceSecondary, borderColor: colors.border, borderRadius: 14, borderWidth: 1, flexDirection: "row", gap: 10, padding: 16 },
  emptyText: { color: colors.onSurface, flex: 1, fontSize: 13, lineHeight: 19 },
  card: { backgroundColor: colors.surfaceSecondary, borderColor: colors.border, borderRadius: 16, borderWidth: 1, gap: 10, marginTop: 8, padding: 14 },
  cardHead: { alignItems: "center", flexDirection: "row", gap: 12 },
  learnerAvatar: { alignItems: "center", backgroundColor: colors.brandPrimary, borderRadius: 22, height: 44, justifyContent: "center", width: 44 },
  learnerAvatarText: { color: colors.onBrandPrimary, fontSize: 17, fontWeight: "800" },
  learnerCopy: { flex: 1, gap: 2 },
  learnerName: { color: colors.onSurface, fontSize: 15, fontWeight: "800" },
  learnerEmail: { color: colors.muted, fontSize: 11 },
  learnerTraining: { color: colors.brandPrimary, fontSize: 12, fontWeight: "700" },
  statusPill: { borderRadius: 999, paddingHorizontal: 9, paddingVertical: 4 },
  statusText: { color: colors.onBrandPrimary, fontSize: 10, fontWeight: "800", letterSpacing: 0.4 },
  verifiedRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  verifiedTag: { alignItems: "center", backgroundColor: colors.surfaceTertiary, borderRadius: 8, flexDirection: "row", gap: 4, paddingHorizontal: 8, paddingVertical: 4 },
  verifiedText: { color: colors.onSurfaceTertiary, fontSize: 11, fontWeight: "700", textTransform: "capitalize" },
  actions: { flexDirection: "row", gap: 10 },
  actionBtn: { alignItems: "center", borderColor: colors.brandPrimary, borderRadius: 10, borderWidth: 1, flexDirection: "row", gap: 6, minHeight: 44, paddingHorizontal: 12 },
  actionPrimary: { backgroundColor: colors.brandPrimary },
  actionText: { color: colors.brandPrimary, fontSize: 12, fontWeight: "800" },
  actionPrimaryText: { color: colors.onBrandPrimary, fontSize: 12, fontWeight: "800" },
  sheetOverlay: { backgroundColor: "rgba(0,0,0,0.4)", bottom: 0, justifyContent: "flex-end", left: 0, position: "absolute", right: 0, top: 0 },
  sheet: { backgroundColor: colors.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, gap: 8, padding: 20, paddingBottom: 28 },
  sheetHead: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  sheetTitle: { color: colors.onSurface, fontSize: 18, fontWeight: "800" },
  sheetSub: { color: colors.muted, fontSize: 12 },
  closeBtn: { alignItems: "center", height: 40, justifyContent: "center", width: 40 },
  fieldLabel: { color: colors.onSurfaceSecondary, fontSize: 12, fontWeight: "700", marginTop: 10 },
  chipWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 6 },
  chip: { alignItems: "center", backgroundColor: colors.surfaceSecondary, borderColor: colors.border, borderRadius: 999, borderWidth: 1, minHeight: 38, justifyContent: "center", paddingHorizontal: 12 },
  chipActive: { backgroundColor: colors.brandPrimary, borderColor: colors.brandPrimary },
  chipText: { color: colors.onSurfaceSecondary, fontSize: 12, fontWeight: "700", textTransform: "capitalize" },
  chipTextActive: { color: colors.onBrandPrimary },
  input: { backgroundColor: colors.surfaceSecondary, borderColor: colors.border, borderRadius: 12, borderWidth: 1, color: colors.onSurface, fontSize: 14, marginTop: 6, minHeight: 46, paddingHorizontal: 12 },
  errorText: { color: colors.error, fontSize: 13, marginTop: 8 },
  footer: { flexDirection: "row", gap: 10, marginTop: 18 },
  primaryBtn: { alignItems: "center", backgroundColor: colors.brandPrimary, borderRadius: 12, flex: 1, justifyContent: "center", minHeight: 48 },
  primaryText: { color: colors.onBrandPrimary, fontSize: 14, fontWeight: "800" },
  secondaryBtn: { alignItems: "center", borderColor: colors.border, borderRadius: 12, borderWidth: 1, flex: 1, justifyContent: "center", minHeight: 48 },
  secondaryText: { color: colors.onSurface, fontSize: 14, fontWeight: "700" },
  disabled: { opacity: 0.5 },
}));
