import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { ActivityIndicator, Modal, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import type { Proficiency, Skill, Training } from "@/src/api/authed";
import { PROFICIENCY_LABEL, useAuthedRequest } from "@/src/api/authed";
import { ApiError } from "@/src/api/client";
import { BrandHeader } from "@/src/components/brand-header";
import { usesNativeTabs } from "@/src/navigation";
import { makeStyles, useTheme } from "@/src/theme";

type FormState = {
  title: string;
  description: string;
  duration_hours: string;
  seats: string;
  mode: "ONLINE" | "HYBRID" | "OFFLINE";
  status: "PUBLISHED" | "CLOSED";
  skills: { skill_id: string; target_level: Proficiency }[];
};

const EMPTY_FORM: FormState = {
  title: "",
  description: "",
  duration_hours: "20",
  seats: "30",
  mode: "ONLINE",
  status: "PUBLISHED",
  skills: [],
};

export function TrainerTrainingsScreen() {
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const authed = useAuthedRequest();
  const queryClient = useQueryClient();

  const trainingsQuery = useQuery({
    queryKey: ["trainer", "trainings"],
    queryFn: () => authed<Training[]>("/trainer/trainings"),
  });
  const skillsQuery = useQuery({ queryKey: ["catalog", "skills"], queryFn: () => authed<Skill[]>("/catalog/skills") });

  const [editing, setEditing] = useState<Training | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [error, setError] = useState("");

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setError("");
    setShowForm(true);
  };
  const openEdit = (t: Training) => {
    setEditing(t);
    setForm({
      title: t.title,
      description: t.description,
      duration_hours: String(t.duration_hours),
      seats: String(t.seats),
      mode: (t.mode as FormState["mode"]) || "ONLINE",
      status: t.status ?? "PUBLISHED",
      skills: t.skills.map((s) => ({ skill_id: s.skill_id, target_level: s.target_level })),
    });
    setError("");
    setShowForm(true);
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const body = {
        title: form.title.trim(),
        description: form.description.trim(),
        duration_hours: Number(form.duration_hours) || 0,
        seats: Number(form.seats) || 0,
        mode: form.mode,
        status: form.status,
        skills: form.skills,
      };
      if (editing) {
        return authed<Training>(`/trainer/trainings/${editing.id}`, { method: "PATCH", body });
      }
      return authed<Training>("/trainer/trainings", { method: "POST", body });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["trainer", "trainings"] });
      setShowForm(false);
    },
    onError: (e) => setError(e instanceof ApiError ? e.message : "Unable to save training."),
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
      return { ...f, skills: [...f.skills, { skill_id: skillId, target_level: "INTERMEDIATE" as Proficiency }] };
    });
  };
  const setSkillLevel = (skillId: string, level: Proficiency) => {
    setForm((f) => ({ ...f, skills: f.skills.map((s) => (s.skill_id === skillId ? { ...s, target_level: level } : s)) }));
  };
  const canSave = form.title.trim().length > 2 && form.description.trim().length > 9 && form.skills.length > 0 && Number(form.duration_hours) > 0 && Number(form.seats) > 0;

  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={[styles.content, { paddingTop: insets.top + 18, paddingBottom: bottomChrome + 28 }]}>
        <BrandHeader compact />
        <View style={styles.headRow}>
          <View style={styles.headCopy}>
            <Text style={styles.eyebrow}>TRAINER · TRAININGS</Text>
            <Text style={styles.title}>Courses you offer</Text>
          </View>
          <Pressable onPress={openCreate} style={styles.newBtn} testID="new-training-button">
            <MaterialCommunityIcons name="plus" size={18} color={colors.onBrandPrimary} />
            <Text style={styles.newText}>New</Text>
          </Pressable>
        </View>

        {trainingsQuery.isPending ? (
          <View style={styles.centered} testID="trainings-loading"><ActivityIndicator color={colors.brandPrimary} /></View>
        ) : null}
        {trainingsQuery.data && trainingsQuery.data.length === 0 ? (
          <View style={styles.empty} testID="trainings-empty">
            <MaterialCommunityIcons name="book-open-variant" size={22} color={colors.brandPrimary} />
            <Text style={styles.emptyText}>No trainings yet — tap New to publish your first course. Trainees will see it in their recommendations.</Text>
          </View>
        ) : null}
        {trainingsQuery.data?.map((t) => (
          <Pressable
            key={t.id}
            onPress={() => openEdit(t)}
            style={styles.card}
            testID={`training-${t.id}`}
          >
            <View style={styles.cardHead}>
              <Text style={styles.cardTitle}>{t.title}</Text>
              <View style={[styles.statusPill, { backgroundColor: t.status === "PUBLISHED" ? colors.success : colors.warning }]}>
                <Text style={styles.statusText}>{t.status}</Text>
              </View>
            </View>
            <Text style={styles.cardDesc} numberOfLines={2}>{t.description}</Text>
            <View style={styles.cardMeta}>
              <Meta icon="clock-outline" text={`${t.duration_hours} hrs`} />
              <Meta icon="broadcast" text={t.mode} />
              <Meta icon="account-group-outline" text={`${t.seats} seats`} />
            </View>
            <View style={styles.cardSkills}>
              {t.skills.map((s) => (
                <View key={s.skill_id} style={styles.skillTag}>
                  <Text style={styles.skillTagText}>{skillNameById.get(s.skill_id) ?? s.skill_id} · {PROFICIENCY_LABEL[s.target_level]}</Text>
                </View>
              ))}
            </View>
          </Pressable>
        ))}
      </ScrollView>

      <Modal visible={showForm} animationType="slide" onRequestClose={() => setShowForm(false)}>
        <View style={styles.root}>
          <ScrollView contentContainerStyle={[styles.content, { paddingTop: insets.top + 18, paddingBottom: insets.bottom + 28 }]} keyboardShouldPersistTaps="handled">
            <View style={styles.headRow}>
              <Text style={styles.title}>{editing ? "Edit training" : "New training"}</Text>
              <Pressable onPress={() => setShowForm(false)} testID="close-form" style={styles.closeBtn}><MaterialCommunityIcons name="close" size={22} color={colors.onSurface} /></Pressable>
            </View>
            <Field label="Title" value={form.title} onChange={(v) => setForm((f) => ({ ...f, title: v }))} placeholder="e.g. Modern React with Testing" testID="form-title" />
            <Field label="Description" value={form.description} onChange={(v) => setForm((f) => ({ ...f, description: v }))} placeholder="What learners will gain" multiline testID="form-description" />
            <View style={styles.formRow}>
              <View style={{ flex: 1 }}><Field label="Duration (hrs)" value={form.duration_hours} onChange={(v) => setForm((f) => ({ ...f, duration_hours: v }))} keyboardType="numeric" testID="form-duration" /></View>
              <View style={{ flex: 1 }}><Field label="Seats" value={form.seats} onChange={(v) => setForm((f) => ({ ...f, seats: v }))} keyboardType="numeric" testID="form-seats" /></View>
            </View>
            <Text style={styles.fieldLabel}>Delivery mode</Text>
            <View style={styles.chipWrap}>
              {(["ONLINE", "HYBRID", "OFFLINE"] as const).map((m) => (
                <Pressable key={m} onPress={() => setForm((f) => ({ ...f, mode: m }))} style={[styles.chip, form.mode === m && styles.chipActive]} testID={`mode-${m}`}>
                  <Text style={[styles.chipText, form.mode === m && styles.chipTextActive]}>{m}</Text>
                </Pressable>
              ))}
            </View>
            <Text style={styles.fieldLabel}>Status</Text>
            <View style={styles.chipWrap}>
              {(["PUBLISHED", "CLOSED"] as const).map((s) => (
                <Pressable key={s} onPress={() => setForm((f) => ({ ...f, status: s }))} style={[styles.chip, form.status === s && styles.chipActive]} testID={`status-${s}`}>
                  <Text style={[styles.chipText, form.status === s && styles.chipTextActive]}>{s}</Text>
                </Pressable>
              ))}
            </View>
            <Text style={styles.fieldLabel}>Skills covered</Text>
            <Text style={styles.helper}>Pick at least one. Tap a level to change what learners target.</Text>
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
                          style={[styles.levelChip, active.target_level === lvl && styles.levelChipActive]}
                          testID={`level-${skill.id}-${lvl}`}
                        >
                          <Text style={[styles.levelText, active.target_level === lvl && styles.levelTextActive]}>{lvl[0]}</Text>
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
                testID="save-training-button"
              >
                {saveMutation.isPending ? <ActivityIndicator color={colors.onBrandPrimary} /> : <Text style={styles.primaryText}>{editing ? "Save changes" : "Publish"}</Text>}
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
  field: { gap: 6, marginTop: 12 },
  fieldLabel: { color: colors.onSurfaceSecondary, fontSize: 13, fontWeight: "700", marginTop: 12 },
  input: { backgroundColor: colors.surfaceSecondary, borderColor: colors.border, borderRadius: 12, borderWidth: 1, color: colors.onSurface, fontSize: 15, minHeight: 48, paddingHorizontal: 14 },
  formRow: { flexDirection: "row", gap: 10 },
  chipWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 6 },
  chip: { alignItems: "center", backgroundColor: colors.surfaceSecondary, borderColor: colors.border, borderRadius: 999, borderWidth: 1, minHeight: 40, justifyContent: "center", paddingHorizontal: 14 },
  chipActive: { backgroundColor: colors.brandPrimary, borderColor: colors.brandPrimary },
  chipText: { color: colors.onSurfaceSecondary, fontSize: 12, fontWeight: "700" },
  chipTextActive: { color: colors.onBrandPrimary },
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
