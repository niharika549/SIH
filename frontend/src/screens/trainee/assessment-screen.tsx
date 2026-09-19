import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { useMemo, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import type { AssessmentStartResult, AssessmentSubmitResult, Skill } from "@/src/api/authed";
import { PROFICIENCY_LABEL, useAuthedRequest } from "@/src/api/authed";
import { ApiError } from "@/src/api/client";
import { ProficiencyBadge } from "@/src/components/proficiency-badge";
import { makeStyles, useTheme } from "@/src/theme";

type Phase = "loading" | "question" | "result" | "error";

export function AssessmentScreen({ skillId }: { skillId: string }) {
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const authed = useAuthedRequest();
  const queryClient = useQueryClient();

  const [phase, setPhase] = useState<Phase>("loading");
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState<AssessmentStartResult | null>(null);
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [result, setResult] = useState<AssessmentSubmitResult | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const skillQuery = useQuery({
    queryKey: ["catalog", "skills"],
    queryFn: () => authed<Skill[]>("/catalog/skills"),
  });
  const skill = useMemo(
    () => skillQuery.data?.find((s) => s.id === skillId),
    [skillQuery.data, skillId],
  );

  const start = async () => {
    setPhase("loading");
    setError("");
    try {
      const data = await authed<AssessmentStartResult>("/assessment/start", {
        method: "POST",
        body: { skill_id: skillId },
      });
      setAttempt(data);
      setAnswers(new Array(data.questions.length).fill(-1));
      setCurrent(0);
      setResult(null);
      setPhase("question");
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Unable to start assessment.");
      setPhase("error");
    }
  };

  // Kick off on first render
  useMemo(() => {
    if (phase === "loading" && !attempt && !result) void start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const submit = async () => {
    if (!attempt) return;
    setSubmitting(true);
    setError("");
    try {
      const data = await authed<AssessmentSubmitResult>("/assessment/submit", {
        method: "POST",
        body: { attempt_id: attempt.attempt_id, answers },
      });
      setResult(data);
      setPhase("result");
      await queryClient.invalidateQueries({ queryKey: ["trainee"] });
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Unable to submit answers.");
    } finally {
      setSubmitting(false);
    }
  };

  const q = attempt?.questions[current];
  const answered = attempt ? answers.every((a) => a >= 0) : false;

  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={[styles.content, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 28 }]}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backBtn} testID="assessment-back" accessibilityRole="button">
            <MaterialCommunityIcons name="chevron-left" size={22} color={colors.onSurface} />
            <Text style={styles.backText}>Back</Text>
          </Pressable>
        </View>
        <Text style={styles.eyebrow}>ASSESSMENT</Text>
        <Text style={styles.title}>{skill?.name ?? "Skill assessment"}</Text>
        <Text style={styles.subtitle}>Answer honestly — your result stays private, and you can retake this later.</Text>

        {phase === "loading" ? (
          <View style={styles.centered} testID="assessment-loading"><ActivityIndicator color={colors.brandPrimary} size="large" /></View>
        ) : null}

        {phase === "error" ? (
          <View style={styles.errorCard} testID="assessment-error">
            <MaterialCommunityIcons name="alert-circle-outline" size={20} color={colors.error} />
            <Text style={styles.errorText}>{error}</Text>
            <Pressable onPress={start} style={styles.retry} testID="assessment-retry"><Text style={styles.retryText}>Try again</Text></Pressable>
          </View>
        ) : null}

        {phase === "question" && attempt && q ? (
          <View>
            <View style={styles.progressRow}>
              {attempt.questions.map((_, i) => (
                <View key={i} style={[styles.progressDot, i <= current && styles.progressDotActive, i < current && styles.progressDotDone]} />
              ))}
            </View>
            <View style={styles.stepMeta}>
              <Text style={styles.stepIndex}>Question {current + 1} of {attempt.questions.length}</Text>
              <View style={styles.difficultyBadge}><Text style={styles.difficultyText}>{q.difficulty}</Text></View>
            </View>
            <Text style={styles.prompt} testID="question-prompt">{q.prompt}</Text>
            <View style={styles.choices}>
              {q.choices.map((choice, idx) => {
                const selected = answers[current] === idx;
                return (
                  <Pressable
                    key={idx}
                    onPress={() => setAnswers((a) => a.map((v, i) => (i === current ? idx : v)))}
                    style={[styles.choice, selected && styles.choiceActive]}
                    testID={`choice-${current}-${idx}`}
                    accessibilityRole="radio"
                    accessibilityState={{ selected }}
                  >
                    <View style={[styles.choiceDot, selected && styles.choiceDotActive]}>
                      {selected ? <View style={styles.choiceDotInner} /> : null}
                    </View>
                    <Text style={[styles.choiceText, selected && styles.choiceTextActive]}>{choice}</Text>
                  </Pressable>
                );
              })}
            </View>
            {error ? <Text style={styles.errorText}>{error}</Text> : null}
            <View style={styles.footer}>
              <Pressable
                onPress={() => setCurrent((c) => Math.max(0, c - 1))}
                disabled={current === 0}
                style={[styles.secondaryBtn, current === 0 && styles.disabled]}
                testID="question-prev"
              >
                <Text style={styles.secondaryText}>Previous</Text>
              </Pressable>
              {current < attempt.questions.length - 1 ? (
                <Pressable
                  onPress={() => setCurrent((c) => c + 1)}
                  disabled={answers[current] < 0}
                  style={[styles.primaryBtn, answers[current] < 0 && styles.disabled]}
                  testID="question-next"
                >
                  <Text style={styles.primaryText}>Next</Text>
                </Pressable>
              ) : (
                <Pressable
                  onPress={submit}
                  disabled={!answered || submitting}
                  style={[styles.primaryBtn, (!answered || submitting) && styles.disabled]}
                  testID="assessment-submit"
                >
                  {submitting ? <ActivityIndicator color={colors.onBrandPrimary} /> : <Text style={styles.primaryText}>Submit assessment</Text>}
                </Pressable>
              )}
            </View>
          </View>
        ) : null}

        {phase === "result" && result ? (
          <View>
            <View style={styles.resultCard} testID="assessment-result">
              <Text style={styles.resultKicker}>YOUR RESULT</Text>
              <Text style={styles.resultScore}>{result.score} / {result.max_score}</Text>
              <Text style={styles.resultPct}>{result.percentage}% correct</Text>
              <View style={styles.resultBadge}>
                <ProficiencyBadge level={result.proficiency} source="ASSESSED" />
                <Text style={styles.resultBadgeHelper}>Level saved as ASSESSED · {PROFICIENCY_LABEL[result.proficiency]}</Text>
              </View>
            </View>
            <Text style={styles.sectionTitle}>Question review</Text>
            {result.breakdown.map((row, i) => (
              <View key={row.question_id} style={styles.reviewRow} testID={`review-${i}`}>
                <View style={styles.reviewHead}>
                  <Text style={styles.reviewIndex}>Q{i + 1} · {row.difficulty}</Text>
                  <View style={[styles.reviewPill, { backgroundColor: row.correct ? colors.success : colors.error }]}>
                    <Text style={styles.reviewPillText}>{row.correct ? "Correct" : "Missed"}</Text>
                  </View>
                </View>
                <Text style={styles.reviewText}>{row.explanation}</Text>
              </View>
            ))}
            <View style={styles.resultActions}>
              <Pressable onPress={start} style={styles.secondaryBtn} testID="assessment-retake"><Text style={styles.secondaryText}>Retake now</Text></Pressable>
              <Pressable onPress={() => router.back()} style={styles.primaryBtn} testID="assessment-done"><Text style={styles.primaryText}>Back to skills</Text></Pressable>
            </View>
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  root: { backgroundColor: colors.surface, flex: 1 },
  content: { gap: 12, paddingHorizontal: 20 },
  header: { alignItems: "flex-start" },
  backBtn: { alignItems: "center", flexDirection: "row", gap: 2, marginBottom: 6, paddingRight: 12, paddingVertical: 8 },
  backText: { color: colors.onSurface, fontSize: 14, fontWeight: "700" },
  eyebrow: { color: colors.brandPrimary, fontSize: 11, fontWeight: "800", letterSpacing: 1 },
  title: { color: colors.onSurface, fontSize: 24, fontWeight: "800", lineHeight: 30 },
  subtitle: { color: colors.muted, fontSize: 14, lineHeight: 21, marginBottom: 8 },
  centered: { alignItems: "center", padding: 40 },
  progressRow: { flexDirection: "row", gap: 6 },
  progressDot: { backgroundColor: colors.surfaceTertiary, borderRadius: 3, flex: 1, height: 6 },
  progressDotActive: { backgroundColor: colors.brandPrimary },
  progressDotDone: { backgroundColor: colors.success },
  stepMeta: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", marginTop: 12 },
  stepIndex: { color: colors.muted, fontSize: 12, fontWeight: "700", letterSpacing: 0.3 },
  difficultyBadge: { backgroundColor: colors.brandTertiary, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  difficultyText: { color: colors.onBrandTertiary, fontSize: 11, fontWeight: "800", letterSpacing: 0.5 },
  prompt: { color: colors.onSurface, fontSize: 17, fontWeight: "700", lineHeight: 24, marginTop: 10 },
  choices: { gap: 10, marginTop: 10 },
  choice: { alignItems: "center", backgroundColor: colors.surfaceSecondary, borderColor: colors.border, borderRadius: 14, borderWidth: 1, flexDirection: "row", gap: 12, minHeight: 56, padding: 14 },
  choiceActive: { backgroundColor: colors.brandTertiary, borderColor: colors.brandPrimary },
  choiceDot: { alignItems: "center", borderColor: colors.borderStrong, borderRadius: 12, borderWidth: 2, height: 22, justifyContent: "center", width: 22 },
  choiceDotActive: { borderColor: colors.brandPrimary },
  choiceDotInner: { backgroundColor: colors.brandPrimary, borderRadius: 6, height: 12, width: 12 },
  choiceText: { color: colors.onSurface, flex: 1, fontSize: 14, lineHeight: 19 },
  choiceTextActive: { color: colors.onBrandTertiary, fontWeight: "700" },
  footer: { flexDirection: "row", gap: 10, marginTop: 20 },
  primaryBtn: { alignItems: "center", backgroundColor: colors.brandPrimary, borderRadius: 12, flex: 1, justifyContent: "center", minHeight: 50 },
  primaryText: { color: colors.onBrandPrimary, fontSize: 15, fontWeight: "800" },
  secondaryBtn: { alignItems: "center", borderColor: colors.border, borderRadius: 12, borderWidth: 1, flex: 1, justifyContent: "center", minHeight: 50 },
  secondaryText: { color: colors.onSurface, fontSize: 15, fontWeight: "700" },
  disabled: { opacity: 0.5 },
  errorCard: { alignItems: "center", backgroundColor: colors.surfaceTertiary, borderColor: colors.error, borderRadius: 14, borderWidth: 1, gap: 10, padding: 16 },
  errorText: { color: colors.error, fontSize: 13, lineHeight: 19, textAlign: "center" },
  retry: { alignItems: "center", backgroundColor: colors.brandPrimary, borderRadius: 10, minHeight: 44, minWidth: 140, justifyContent: "center" },
  retryText: { color: colors.onBrandPrimary, fontSize: 13, fontWeight: "800" },
  resultCard: { alignItems: "center", backgroundColor: colors.brandPrimary, borderRadius: 20, gap: 6, padding: 20 },
  resultKicker: { color: colors.onBrandPrimary, fontSize: 11, fontWeight: "800", letterSpacing: 1, opacity: 0.9 },
  resultScore: { color: colors.onBrandPrimary, fontSize: 38, fontWeight: "800" },
  resultPct: { color: colors.onBrandPrimary, fontSize: 13, opacity: 0.9 },
  resultBadge: { alignItems: "center", gap: 6, marginTop: 8 },
  resultBadgeHelper: { color: colors.onBrandPrimary, fontSize: 12, opacity: 0.9 },
  sectionTitle: { color: colors.onSurface, fontSize: 17, fontWeight: "800", marginTop: 18 },
  reviewRow: { backgroundColor: colors.surfaceSecondary, borderColor: colors.border, borderRadius: 12, borderWidth: 1, gap: 6, marginTop: 8, padding: 12 },
  reviewHead: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  reviewIndex: { color: colors.muted, fontSize: 12, fontWeight: "700" },
  reviewPill: { borderRadius: 999, paddingHorizontal: 9, paddingVertical: 3 },
  reviewPillText: { color: colors.onBrandPrimary, fontSize: 10, fontWeight: "800" },
  reviewText: { color: colors.onSurface, fontSize: 13, lineHeight: 19 },
  resultActions: { flexDirection: "row", gap: 10, marginTop: 20 },
}));
