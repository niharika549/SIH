// frontend/src/screens/employer/employer-job-detail-screen.tsx
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import type { Application, ApplicationStatus, CandidateMatch, Job } from "@/src/api/authed";
import { APPLICATION_STATUS_LABEL, useAuthedRequest } from "@/src/api/authed";
import { ApiError } from "@/src/api/client";
import { makeStyles, useTheme } from "@/src/theme";

type Tab = "applicants" | "matches";

export function EmployerJobDetailScreen({ jobId }: { jobId: string }) {
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const authed = useAuthedRequest();
  const queryClient = useQueryClient();

  const [tab, setTab] = useState<Tab>("applicants");
  const [managing, setManaging] = useState<Application | null>(null);
  const [statusChoice, setStatusChoice] = useState<ApplicationStatus>("SHORTLISTED");
  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState("");

  const jobsQuery = useQuery({ queryKey: ["employer", "jobs"], queryFn: () => authed<Job[]>("/employer/jobs") });
  const job = jobsQuery.data?.find((j) => j.id === jobId);

  const applicationsQuery = useQuery({
    queryKey: ["employer", "job-applications", jobId],
    queryFn: () => authed<Application[]>(`/employer/jobs/${jobId}/applications`),
    enabled: tab === "applicants",
  });

  const matchesQuery = useQuery({
    queryKey: ["employer", "job-matches", jobId],
    queryFn: () => authed<CandidateMatch[]>(`/matching/candidates/${jobId}`),
    enabled: tab === "matches",
  });

  const statusMutation = useMutation({
    mutationFn: () => {
      if (!managing) throw new Error("No application selected");
      return authed(`/employer/applications/${managing.id}/status`, {
        method: "PATCH",
        body: { status: statusChoice, feedback: feedback.trim() },
      });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["employer", "job-applications", jobId] });
      setManaging(null);
      setFeedback("");
    },
    onError: (e) => setError(e instanceof ApiError ? e.message : "Unable to update application."),
  });

  const openManage = (a: Application) => {
    setManaging(a);
    setStatusChoice(a.status === "APPLIED" ? "SHORTLISTED" : a.status);
    setFeedback(a.feedback ?? "");
    setError("");
  };

  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={[styles.content, { paddingTop: insets.top + 14, paddingBottom: insets.bottom + 28 }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn} testID="job-detail-back">
          <MaterialCommunityIcons name="chevron-left" size={22} color={colors.onSurface} />
          <Text style={styles.backText}>Back</Text>
        </Pressable>

        {job ? (
          <>
            <Text style={styles.eyebrow}>{job.status} · {job.openings} opening{job.openings === 1 ? "" : "s"}</Text>
            <Text style={styles.title}>{job.title}</Text>
            {job.location ? <Text style={styles.subtitle}>{job.location}</Text> : null}
          </>
        ) : (
          <ActivityIndicator color={colors.brandPrimary} />
        )}

        <View style={styles.tabRow}>
          <Pressable onPress={() => setTab("applicants")} style={[styles.tabBtn, tab === "applicants" && styles.tabBtnActive]} testID="tab-applicants">
            <Text style={[styles.tabText, tab === "applicants" && styles.tabTextActive]}>Applicants</Text>
          </Pressable>
          <Pressable onPress={() => setTab("matches")} style={[styles.tabBtn, tab === "matches" && styles.tabBtnActive]} testID="tab-matches">
            <Text style={[styles.tabText, tab === "matches" && styles.tabTextActive]}>Suggested candidates</Text>
          </Pressable>
        </View>

        {tab === "applicants" ? (
          <View>
            {applicationsQuery.isPending ? <View style={styles.centered}><ActivityIndicator color={colors.brandPrimary} /></View> : null}
            {applicationsQuery.data && applicationsQuery.data.length === 0 ? (
              <View style={styles.empty} testID="applicants-empty">
                <MaterialCommunityIcons name="account-search-outline" size={22} color={colors.brandPrimary} />
                <Text style={styles.emptyText}>No applications yet. Check the Suggested candidates tab to proactively reach out.</Text>
              </View>
            ) : null}
            {applicationsQuery.data?.map((a) => (
              <View key={a.id} style={styles.card} testID={`application-${a.id}`}>
                <View style={styles.cardHead}>
                  <View style={styles.avatar}><Text style={styles.avatarText}>{(a.trainee?.full_name ?? "?").slice(0, 1).toUpperCase()}</Text></View>
                  <View style={styles.candidateCopy}>
                    <Text style={styles.candidateName}>{a.trainee?.full_name ?? "Candidate"}</Text>
                    <Text style={styles.candidateEmail}>{a.trainee?.email ?? ""}</Text>
                  </View>
                  <View style={[styles.statusPill, { backgroundColor: statusColor(a.status, colors) }]}>
                    <Text style={styles.statusText}>{APPLICATION_STATUS_LABEL[a.status]}</Text>
                  </View>
                </View>
                {a.trainee_skills && a.trainee_skills.length > 0 ? (
                  <View style={styles.skillRow}>
                    {a.trainee_skills.map((s) => (
                      <View key={s.skill_id} style={styles.skillTag}>
                        <Text style={styles.skillTagText}>{s.skill_id.replace(/^skill-/, "").replace(/-/g, " ")} · {s.level}</Text>
                      </View>
                    ))}
                  </View>
                ) : null}
                {a.feedback ? <Text style={styles.feedbackText}>Feedback: {a.feedback}</Text> : null}
                <Pressable onPress={() => openManage(a)} style={styles.manageBtn} testID={`manage-${a.id}`}>
                  <MaterialCommunityIcons name="pencil-outline" size={14} color={colors.brandPrimary} />
                  <Text style={styles.manageText}>Update status</Text>
                </Pressable>
              </View>
            ))}
          </View>
        ) : (
          <View>
            {matchesQuery.isPending ? <View style={styles.centered}><ActivityIndicator color={colors.brandPrimary} /></View> : null}
            {matchesQuery.data && matchesQuery.data.length === 0 ? (
              <View style={styles.empty} testID="matches-empty">
                <MaterialCommunityIcons name="account-multiple-check-outline" size={22} color={colors.brandPrimary} />
                <Text style={styles.emptyText}>No matching candidates found yet based on required skills.</Text>
              </View>
            ) : null}
            {matchesQuery.data?.map((m) => (
              <View key={m.trainee.id} style={styles.card} testID={`match-${m.trainee.id}`}>
                <View style={styles.cardHead}>
                  <View style={styles.avatar}><Text style={styles.avatarText}>{m.trainee.full_name.slice(0, 1).toUpperCase()}</Text></View>
                  <View style={styles.candidateCopy}>
                    <Text style={styles.candidateName}>{m.trainee.full_name}</Text>
                    <Text style={styles.candidateEmail}>{m.trainee.email}</Text>
                  </View>
                  <View style={[styles.statusPill, { backgroundColor: colors.brandPrimary }]}>
                    <Text style={styles.statusText}>{m.match_percentage}%</Text>
                  </View>
                </View>
                <Text style={styles.explanation}>{m.explanation}</Text>
                <View style={styles.skillRow}>
                  {m.skill_breakdown.map((b) => (
                    <View key={b.skill_id} style={[styles.skillTag, !b.met && styles.skillTagMiss]}>
                      <MaterialCommunityIcons name={b.met ? "check" : "close"} size={11} color={b.met ? colors.onBrandTertiary : colors.error} />
                      <Text style={[styles.skillTagText, !b.met && { color: colors.error }]}>{b.skill_id.replace(/^skill-/, "").replace(/-/g, " ")} ({b.required_level[0]})</Text>
                    </View>
                  ))}
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {managing ? (
        <View style={styles.sheetOverlay}>
          <View style={styles.sheet} testID="status-sheet">
            <View style={styles.sheetHead}>
              <Text style={styles.sheetTitle}>Update status</Text>
              <Pressable onPress={() => setManaging(null)} testID="close-status-sheet" style={styles.closeBtn}><MaterialCommunityIcons name="close" size={22} color={colors.onSurface} /></Pressable>
            </View>
            <Text style={styles.sheetSub}>{managing.trainee?.full_name}</Text>
            <View style={styles.chipWrap}>
              {(["SHORTLISTED", "INTERVIEW", "SELECTED", "REJECTED"] as ApplicationStatus[]).map((s) => (
                <Pressable key={s} onPress={() => setStatusChoice(s)} style={[styles.chip, statusChoice === s && styles.chipActive]} testID={`status-choice-${s}`}>
                  <Text style={[styles.chipText, statusChoice === s && styles.chipTextActive]}>{APPLICATION_STATUS_LABEL[s]}</Text>
                </Pressable>
              ))}
            </View>
            <Text style={styles.fieldLabel}>Feedback for the candidate (optional)</Text>
            <TextInput
              value={feedback}
              onChangeText={setFeedback}
              placeholder="e.g. Strong fit, scheduling interview for next week"
              placeholderTextColor={colors.muted}
              style={styles.input}
              multiline
              testID="feedback-input"
            />
            {error ? <Text style={styles.errorText}>{error}</Text> : null}
            <View style={styles.footer}>
              <Pressable onPress={() => setManaging(null)} style={styles.secondaryBtn} testID="cancel-status"><Text style={styles.secondaryText}>Cancel</Text></Pressable>
              <Pressable
                onPress={() => statusMutation.mutate()}
                disabled={statusMutation.isPending}
                style={[styles.primaryBtn, statusMutation.isPending && styles.disabled]}
                testID="confirm-status"
              >
                {statusMutation.isPending ? <ActivityIndicator color={colors.onBrandPrimary} /> : <Text style={styles.primaryText}>Save</Text>}
              </Pressable>
            </View>
          </View>
        </View>
      ) : null}
    </View>
  );
}

function statusColor(status: ApplicationStatus, colors: ReturnType<typeof useTheme>["colors"]) {
  switch (status) {
    case "SELECTED": return colors.success;
    case "REJECTED": return colors.error;
    case "INTERVIEW": return colors.brandSecondary;
    case "SHORTLISTED": return colors.brandPrimary;
    default: return colors.muted;
  }
}

const useStyles = makeStyles((colors) => ({
  root: { backgroundColor: colors.surface, flex: 1 },
  content: { gap: 8, paddingHorizontal: 20 },
  backBtn: { alignItems: "center", alignSelf: "flex-start", flexDirection: "row", gap: 2, paddingRight: 12, paddingVertical: 8 },
  backText: { color: colors.onSurface, fontSize: 14, fontWeight: "700" },
  eyebrow: { color: colors.brandPrimary, fontSize: 11, fontWeight: "800", letterSpacing: 1, marginTop: 4 },
  title: { color: colors.onSurface, fontSize: 22, fontWeight: "800" },
  subtitle: { color: colors.muted, fontSize: 13, marginBottom: 6 },
  tabRow: { flexDirection: "row", gap: 8, marginTop: 12 },
  tabBtn: { alignItems: "center", backgroundColor: colors.surfaceSecondary, borderColor: colors.border, borderRadius: 999, borderWidth: 1, flex: 1, minHeight: 40, justifyContent: "center" },
  tabBtnActive: { backgroundColor: colors.brandPrimary, borderColor: colors.brandPrimary },
  tabText: { color: colors.onSurfaceSecondary, fontSize: 12, fontWeight: "700" },
  tabTextActive: { color: colors.onBrandPrimary },
  centered: { alignItems: "center", padding: 24 },
  empty: { alignItems: "center", backgroundColor: colors.surfaceSecondary, borderColor: colors.border, borderRadius: 14, borderWidth: 1, flexDirection: "row", gap: 10, marginTop: 12, padding: 16 },
  emptyText: { color: colors.onSurface, flex: 1, fontSize: 13, lineHeight: 19 },
  card: { backgroundColor: colors.surfaceSecondary, borderColor: colors.border, borderRadius: 16, borderWidth: 1, gap: 8, marginTop: 10, padding: 14 },
  cardHead: { alignItems: "center", flexDirection: "row", gap: 12 },
  avatar: { alignItems: "center", backgroundColor: colors.brandPrimary, borderRadius: 20, height: 40, justifyContent: "center", width: 40 },
  avatarText: { color: colors.onBrandPrimary, fontSize: 15, fontWeight: "800" },
  candidateCopy: { flex: 1, gap: 2 },
  candidateName: { color: colors.onSurface, fontSize: 14, fontWeight: "800" },
  candidateEmail: { color: colors.muted, fontSize: 11 },
  statusPill: { borderRadius: 999, paddingHorizontal: 9, paddingVertical: 4 },
  statusText: { color: colors.onBrandPrimary, fontSize: 10, fontWeight: "800", letterSpacing: 0.4 },
  skillRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  skillTag: { alignItems: "center", backgroundColor: colors.brandTertiary, borderRadius: 8, flexDirection: "row", gap: 4, paddingHorizontal: 8, paddingVertical: 4 },
  skillTagMiss: { backgroundColor: colors.surfaceTertiary },
  skillTagText: { color: colors.onBrandTertiary, fontSize: 11, fontWeight: "700", textTransform: "capitalize" },
  feedbackText: { color: colors.muted, fontSize: 12, fontStyle: "italic" },
  explanation: { color: colors.muted, fontSize: 12, lineHeight: 17 },
  manageBtn: { alignItems: "center", alignSelf: "flex-start", borderColor: colors.brandPrimary, borderRadius: 10, borderWidth: 1, flexDirection: "row", gap: 6, minHeight: 36, paddingHorizontal: 12 },
  manageText: { color: colors.brandPrimary, fontSize: 12, fontWeight: "800" },
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
  chipText: { color: colors.onSurfaceSecondary, fontSize: 12, fontWeight: "700" },
  chipTextActive: { color: colors.onBrandPrimary },
  input: { backgroundColor: colors.surfaceSecondary, borderColor: colors.border, borderRadius: 12, borderWidth: 1, color: colors.onSurface, fontSize: 14, marginTop: 6, minHeight: 60, paddingHorizontal: 12, paddingTop: 10 },
  errorText: { color: colors.error, fontSize: 13, marginTop: 8 },
  footer: { flexDirection: "row", gap: 10, marginTop: 18 },
  primaryBtn: { alignItems: "center", backgroundColor: colors.brandPrimary, borderRadius: 12, flex: 1, justifyContent: "center", minHeight: 48 },
  primaryText: { color: colors.onBrandPrimary, fontSize: 14, fontWeight: "800" },
  secondaryBtn: { alignItems: "center", borderColor: colors.border, borderRadius: 12, borderWidth: 1, flex: 1, justifyContent: "center", minHeight: 48 },
  secondaryText: { color: colors.onSurface, fontSize: 14, fontWeight: "700" },
  disabled: { opacity: 0.5 },
}));
