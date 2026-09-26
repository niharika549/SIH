import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { useMemo, useState } from "react";
import { ActivityIndicator, Modal, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import type { Job, Proficiency, Skill } from "@/src/api/authed";
import { useAuthedRequest } from "@/src/api/authed";
import { ApiError } from "@/src/api/client";
import { BrandHeader } from "@/src/components/brand-header";
import { usesNativeTabs } from "@/src/navigation";
import { makeStyles, useTheme } from "@/src/theme";

type FormState = {
  title: string;
  description: string;
  location: string;
  salary_min: string;
  salary_max: string;
  experience_years: string;
  qualification: string;
  openings: string;
  expiry_date: string;
  skills: { skill_id: string; required_level: Proficiency }[];
};

const EMPTY_FORM: FormState = {
  title: "",
  description: "",
  location: "",
  salary_min: "",
  salary_max: "",
  experience_years: "0",
  qualification: "",
  openings: "1",
  expiry_date: "",
  skills: [],
};

export function EmployerJobsScreen() {
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const authed = useAuthedRequest();
  const queryClient = useQueryClient();

  const jobsQuery = useQuery({
    queryKey: ["employer", "jobs"],
    queryFn: () => authed<Job[]>("/employer/jobs"),
  });
  const skillsQuery = useQuery({ queryKey: ["catalog", "skills"], queryFn: () => authed<Skill[]>("/catalog/skills") });

  const [editing, setEditing] = useState<Job | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [error, setError] = useState("");

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setError("");
    setShowForm(true);
  };
  const openEdit = (j: Job) => {
    setEditing(j);
    setForm({
      title: j.title,
      description: j.description,
      location: j.location,
      salary_min: j.salary_min != null ? String(j.salary_min) : "",
      salary_max: j.salary_max != null ? String(j.salary_max) : "",
      experience_years: String(j.experience_years),
      qualification: j.qualification,
      openings: String(j.openings),
      expiry_date: j.expiry_date ?? "",
      skills: j.skills.map((s) => ({ skill_id: s.skill_id, required_level: s.required_level })),
    });
    setError("");
    setShowForm(true);
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const body = {
        title: form.title.trim(),
        description: form.description.trim(),
        location: form.location.trim(),
        salary_min: form.salary_min.trim() ? Number(form.salary_min) : null,
        salary_max: form.salary_max.trim() ? Number(form.salary_max) : null,
        experience_years: Number(form.experience_years) || 0,
        qualification: form.qualification.trim(),
        openings: Number(form.openings) || 1,
        expiry_date: form.expiry_date.trim() || null,
        skills: form.skills,
        status: editing?.status ?? "OPEN",
      };
      if (editing) {
        return authed<Job>(`/employer/jobs/${editing.id}`, { method: "PATCH", body });
      }
      return authed<Job>("/employer/jobs", { method: "POST", body });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["employer", "jobs"] });
      setShowForm(false);
    },
    onError: (e) => setError(e instanceof ApiError ? e.message : "Unable to save job."),
  });

  const closeMutation = useMutation({
    mutationFn: (jobId: string) => authed(`/employer/jobs/${jobId}/close`, { method: "POST" }),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["employer", "jobs"] }),
  });

  const bottomChrome = usesNativeTabs ? insets.bottom : 0;
  const skillNameById = useMemo(
    () => new Map((skillsQuery.data ?? []).map((s) => [s.id, s.name] as const)),
    [skillsQuery.data],
  );

  const toggleSkill = (skillId: string) => {
    setForm((f) => {
      const found = f.skills.find((s) => s.skill_id === skillId);
      if (found) return { ...f, skills: f.skills.filter((s) => s.skill_id !== skillId) };
      return { ...f, skills: [...f.skills, { skill_id: skillId, required_level: "INTERMEDIATE" as Proficiency }] };
    });
  };
  const setSkillLevel = (skillId: string, level: Proficiency) => {
    setForm((f) => ({ ...f, skills: f.skills.map((s) => (s.skill_id === skillId ? { ...s, required_level: level } : s)) }));
  };
  const canSave = form.title.trim().length > 2 && form.description.trim().length > 9 && form.skills.length > 0;

  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={[styles.content, { paddingTop: insets.top + 18, paddingBottom: bottomChrome + 28 }]}>
        <BrandHeader compact />
        <View style={styles.headRow}>
          <View style={styles.headCopy}>
            <Text style={styles.eyebrow}>EMPLOYER · JOBS</Text>
            <Text style={styles.title}>Postings you manage</Text>
          </View>
          <Pressable onPress={openCreate} style={styles.newBtn} testID="new-job-button">
            <MaterialCommunityIcons name="plus" size={18} color={colors.onBrandPrimary} />
            <Text style={styles.newText}>New</Text>
          </Pressable>
        </View>

        {jobsQuery.isPending ? (
          <View style={styles.centered} testID="jobs-loading"><ActivityIndicator color={colors.brandPrimary} /></View>
        ) : null}
        {jobsQuery.data && jobsQuery.data.length === 0 ? (
          <View style={styles.empty} testID="jobs-empty">
            <MaterialCommunityIcons name="briefcase-outline" size={22} color={colors.brandPrimary} />
            <Text style={styles.emptyText}>No jobs posted yet — tap New to publish your first opening.</Text>
          </View>
        ) : null}
        {jobsQuery.data?.map((j) => (
          <View key={j.id} style={styles.card} testID={`job-${j.id}`}>
            <Pressable onPress={() => openEdit(j)}>
              <View style={styles.cardHead}>
                <Text style={styles.cardTitle}>{j.title}</Text>
                <View style={[styles.statusPill, { backgroundColor: j.status === "OPEN" ? colors.success : colors.muted }]}>
                  <Text style={styles.statusText}>{j.status}</Text>
                </View>
              </View>
              <Text style={styles.cardDesc} numberOfLines={2}>{j.description}</Text>
              <View style={styles.cardMeta}>
                {j.location ? <Meta icon="map-marker-outline" text={j.location} /> : null}
                <Meta icon="account-multiple-outline" text={`${j.openings} opening${j.openings === 1 ? "" : "s"}`} />
                {j.experience_years ? <Meta icon="briefcase-clock-outline" text={`${j.experience_years}+ yrs`} /> : null}
              </View>
              <View style={styles.cardSkills}>
                {j.skills.map((s) => (
                  <View key={s.skill_id} style={styles.skillTag}>
                    <Text style={styles.skillTagText}>{skillNameById.get(s.skill_id) ?? s.skill_id}</Text>
                  </View>
                ))}
              </View>
            </Pressable>
            <View style={styles.actions}>
              <Pressable
                onPress={() => router.push(`/employer-jobs/${j.id}`)}
                style={[styles.actionBtn, styles.actionPrimary]}
                testID={`view-applicants-${j.id}`}
              >
                <MaterialCommunityIcons name="account-group-outline" size={16} color={colors.onBrandPrimary} />
                <Text style={styles.actionPrimaryText}>Applicants &amp; matches</Text>
              </Pressable>
              {j.status === "OPEN" ? (
                <Pressable
                  onPress={() => closeMutation.mutate(j.id)}
                  style={styles.actionBtn}
                  testID={`close-job-${j.id}`}
                >
                  <MaterialCommunityIcons name="close-circle-outline" size={16} color={colors.brandPrimary} />
                  <Text style={styles.actionText}>Close</Text>
                </Pressable>
              ) : null}
            </View>
          </View>
        ))}
      </ScrollView>

      <Modal visible={showForm} animationType="slide" onRequestClose={() => setShowForm(false)}>
        <View style={styles.root}>
          <ScrollView contentContainerStyle={[styles.content, { paddingTop: insets.top + 18, paddingBottom: insets.bottom + 28 }]}>
            <View style={styles.headRow}>
              <Text style={styles.title}>{editing ? "Edit job" : "New job"}</Text>
              <Pressable onPress={() => setShowForm(false)} style={styles.closeBtn} testID="close-job-form"><MaterialCommunityIcons name="close" size={22} color={colors.onSurface} /></Pressable>
            </View>

            <Field label="Title" value={form.title} onChange={(v) => setForm((f) => ({ ...f, title: v }))} placeholder="e.g. Junior CNC Machine Operator" testID="form-title" />
            <Field label="Description" value={form.description} onChange={(v) => setForm((f) => ({ ...f, description: v }))} placeholder="Role responsibilities, shift, etc." multiline testID="form-description" />
            <Field label="Location" value={form.location} onChange={(v) => setForm((f) => ({ ...f, location: v }))} placeholder="e.g. Peenya Industrial Area, Bengaluru" testID="form-location" />
            <Field label="Qualification" value={form.qualification} onChange={(v) => setForm((f) => ({ ...f, qualification: v }))} placeholder="e.g. ITI Diploma" testID="form-qualification" />

            <View style={styles.formRow}>
              <View style={{ flex: 1 }}><Field label="Min salary" value={form.salary_min} onChange={(v) => setForm((f) => ({ ...f, salary_min: v }))} keyboardType="numeric" testID="form-salary-min" /></View>
              <View style={{ flex: 1 }}><Field label="Max salary" value={form.salary_max} onChange={(v) => setForm((f) => ({ ...f, salary_max: v }))} keyboardType="numeric" testID="form-salary-max" /></View>
            </View>
            <View style={styles.formRow}>
              <View style={{ flex: 1 }}><Field label="Experience (yrs)" value={form.experience_years} onChange={(v) => setForm((f) => ({ ...f, experience_years: v }))} keyboardType="numeric" testID="form-experience" /></View>
              <View style={{ flex: 1 }}><Field label="Openings" value={form.openings} onChange={(v) => setForm((f) => ({ ...f, openings: v }))} keyboardType="numeric" testID="form-openings" /></View>
            </View>
            <Field label="Expiry date (YYYY-MM-DD, optional)" value={form.expiry_date} onChange={(v) => setForm((f) => ({ ...f, expiry_date: v }))} placeholder="2026-12-31" testID="form-expiry" />

            <Text style={styles.fieldLabel}>Required skills</Text>
            <Text style={styles.helper}>Pick at least one. Tap a level to set the minimum proficiency needed.</Text>
            {skillsQuery.data?.map((skill) => {
              const active = form.skills.find((s) => s.skill_id === skill.id);
              return (
                <View key={skill.id} style={[styles.skillPickRow, active && styles.skillPickRowActive]}>
                  <Pressable onPress={() => toggleSkill(skill.id)} style={styles.skillPickToggle} testID={`skill-toggle-${skill.id}`} accessibilityRole="checkbox" accessibilityState={{ checked: !!active }}>
                    <MaterialCommunityIcons name={active ? "checkbox-marked" : "checkbox-blank-outline"} size={20} color={active ? colors.brandPrimary : colors.muted} />
                    <Text style={styles.skillPickName}>{skill.name}</Text>
                  </Pressable>
                  {active ? (
                    <View style={styles.levelRow}>
                      {(["BEGINNER", "INTERMEDIATE", "ADVANCED"] as Proficiency[]).map((lvl) => (
                        <Pressable
                          key={lvl}
                          onPress={() => setSkillLevel(skill.id, lvl)}
                          style={[styles.levelChip, active.required_level === lvl && styles.levelChipActive]}
                          testID={`level-${skill.id}-${lvl}`}
                        >
                          <Text style={[styles.levelText, active.required_level === lvl && styles.levelTextActive]}>{lvl[0]}</Text>
                        </Pressable>
                      ))}
                    </View>
                  ) : null}
                </View>
              );
            })}
            {error ? <Text style={styles.errorText}>{error}</Text> : null}
            <View style={styles.footer}>
              <Pressable onPress={() => setShowForm(false)} style={styles.secondaryBtn} testID="cancel-form"><Text style={styles.secondaryText}>Cancel</Text></Pressable>
              <Pressable
                onPress={() => canSave && saveMutation.mutate()}
                disabled={!canSave || saveMutation.isPending}
                style={[styles.primaryBtn, (!canSave || saveMutation.isPending) && styles.disabled]}
                testID="save-job-button"
              >
                {saveMutation.isPending ? <ActivityIndicator color={colors.onBrandPrimary} /> : <Text style={styles.primaryText}>{editing ? "Save changes" : "Post job"}</Text>}
              </Pressable>
            </View>
          </ScrollView>
        </View>
      </Modal>
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
        style={[styles.input, multiline && { minHeight: 96, paddingTop: 12, textAlignVertical: "top" }]}
        testID={testID}
      />
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
  headRow: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", marginTop: 6 },
  headCopy: { flex: 1 },
  eyebrow: { color: colors.brandPrimary, fontSize: 11, fontWeight: "800", letterSpacing: 1 },
  title: { color: colors.onSurface, fontSize: 24, fontWeight: "800" },
  newBtn: { alignItems: "center", backgroundColor: colors.brandPrimary, borderRadius: 10, flexDirection: "row", gap: 4, minHeight: 44, paddingHorizontal: 14 },
  newText: { color: colors.onBrandPrimary, fontSize: 13, fontWeight: "800" },
  closeBtn: { alignItems: "center", height: 40, justifyContent: "center", width: 40 },
  centered: { alignItems: "center", padding: 24 },
  empty: { alignItems: "center", backgroundColor: colors.surfaceSecondary, borderColor: colors.border, borderRadius: 14, borderWidth: 1, flexDirection: "row", gap: 10, padding: 16 },
  emptyText: { color: colors.onSurface, flex: 1, fontSize: 13, lineHeight: 19 },
  card: { backgroundColor: colors.surfaceSecondary, borderColor: colors.border, borderRadius: 16, borderWidth: 1, gap: 8, marginTop: 8, padding: 14 },
  cardHead: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  cardTitle: { color: colors.onSurface, flex: 1, fontSize: 15, fontWeight: "800" },
  statusPill: { borderRadius: 999, paddingHorizontal: 9, paddingVertical: 4 },
  statusText: { color: colors.onBrandPrimary, fontSize: 10, fontWeight: "800", letterSpacing: 0.4 },
  cardDesc: { color: colors.muted, fontSize: 12, lineHeight: 18 },
  cardMeta: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  metaItem: { alignItems: "center", flexDirection: "row", gap: 4 },
  metaText: { color: colors.muted, fontSize: 11, fontWeight: "700" },
  cardSkills: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  skillTag: { backgroundColor: colors.brandTertiary, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  skillTagText: { color: colors.onBrandTertiary, fontSize: 11, fontWeight: "700" },
  actions: { flexDirection: "row", gap: 10, marginTop: 4 },
  actionBtn: { alignItems: "center", borderColor: colors.brandPrimary, borderRadius: 10, borderWidth: 1, flexDirection: "row", gap: 6, minHeight: 40, paddingHorizontal: 12 },
  actionPrimary: { backgroundColor: colors.brandPrimary },
  actionText: { color: colors.brandPrimary, fontSize: 12, fontWeight: "800" },
  actionPrimaryText: { color: colors.onBrandPrimary, fontSize: 12, fontWeight: "800" },
  field: { gap: 6, marginTop: 12 },
  fieldLabel: { color: colors.onSurfaceSecondary, fontSize: 13, fontWeight: "700", marginTop: 12 },
  input: { backgroundColor: colors.surfaceSecondary, borderColor: colors.border, borderRadius: 12, borderWidth: 1, color: colors.onSurface, fontSize: 15, minHeight: 48, paddingHorizontal: 14 },
  formRow: { flexDirection: "row", gap: 10 },
  helper: { color: colors.muted, fontSize: 12, marginTop: 4 },
  skillPickRow: { alignItems: "center", backgroundColor: colors.surfaceSecondary, borderColor: colors.border, borderRadius: 12, borderWidth: 1, flexDirection: "row", gap: 10, marginTop: 6, padding: 10 },
  skillPickRowActive: { borderColor: colors.brandPrimary },
  skillPickToggle: { alignItems: "center", flex: 1, flexDirection: "row", gap: 8 },
  skillPickName: { color: colors.onSurface, fontSize: 13, fontWeight: "700" },
  levelRow: { flexDirection: "row", gap: 4 },
  levelChip: { alignItems: "center", borderColor: colors.border, borderRadius: 8, borderWidth: 1, height: 30, justifyContent: "center", width: 30 },
  levelChipActive: { backgroundColor: colors.brandPrimary, borderColor: colors.brandPrimary },
  levelText: { color: colors.onSurfaceSecondary, fontSize: 12, fontWeight: "800" },
  levelTextActive: { color: colors.onBrandPrimary },
  errorText: { color: colors.error, fontSize: 13, marginTop: 8 },
  footer: { flexDirection: "row", gap: 10, marginTop: 22 },
  primaryBtn: { alignItems: "center", backgroundColor: colors.brandPrimary, borderRadius: 12, flex: 1, justifyContent: "center", minHeight: 50 },
  primaryText: { color: colors.onBrandPrimary, fontSize: 15, fontWeight: "800" },
  secondaryBtn: { alignItems: "center", borderColor: colors.border, borderRadius: 12, borderWidth: 1, flex: 1, justifyContent: "center", minHeight: 50 },
  secondaryText: { color: colors.onSurface, fontSize: 15, fontWeight: "700" },
  disabled: { opacity: 0.5 },
}));
