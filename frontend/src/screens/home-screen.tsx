import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { Link, router } from "expo-router";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import type { AssessmentHistory, SkillGap } from "@/src/api/authed";
import { PROFICIENCY_LABEL, useAuthedRequest } from "@/src/api/authed";
import { useAuth } from "@/src/auth-context";
import { BrandHeader } from "@/src/components/brand-header";
import { usesNativeTabs } from "@/src/navigation";
import { makeStyles, useTheme } from "@/src/theme";

const roleCopy = {
  TRAINEE: { title: "Your learning path", subtitle: "Build a verified skills profile for your next opportunity.", icon: "school-outline" },
  TRAINER: { title: "Your training workspace", subtitle: "Prepare to guide learners through measurable progress.", icon: "human-male-board" },
  EMPLOYER: { title: "Your hiring workspace", subtitle: "Connect verified skills to the workforce you need.", icon: "office-building-outline" },
  GOVERNMENT: { title: "Your intelligence workspace", subtitle: "Review workforce signals within your approved scope.", icon: "bank-outline" },
  ADMIN: { title: "Your control center", subtitle: "Keep platform access and evidence trustworthy.", icon: "shield-account-outline" },
} as const;

export function HomeScreen() {
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  if (!user) return null;
  const content = roleCopy[user.role];
  const firstName = user.full_name.split(" ")[0];
  const bottomChrome = usesNativeTabs ? insets.bottom : 0;
  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={[styles.content, { paddingTop: insets.top + 18, paddingBottom: bottomChrome + 24 }]}>
        <View style={styles.topRow}>
          <BrandHeader compact />
          <View style={styles.roleBadge}>
            <MaterialCommunityIcons name={content.icon} size={16} color={colors.onBrandTertiary} />
            <Text style={styles.roleText}>{user.role}</Text>
          </View>
        </View>
        <Text style={styles.eyebrow}>HELLO, {firstName.toUpperCase()}</Text>
        <Text style={styles.title}>{content.title}</Text>
        <Text style={styles.subtitle}>{content.subtitle}</Text>

        {user.role === "TRAINEE" ? <TraineeDashboard /> : null}
        {user.role === "TRAINER" ? <TrainerDashboard /> : null}
        {user.role === "ADMIN" ? <AdminDashboard /> : null}
        {user.role === "EMPLOYER" || user.role === "GOVERNMENT" ? <NonTraineePlaceholder /> : null}
      </ScrollView>
    </View>
  );
}

function TraineeDashboard() {
  const styles = useStyles();
  const { colors } = useTheme();
  const authed = useAuthedRequest();

  const gapQuery = useQuery({
    queryKey: ["trainee", "skill-gap"],
    queryFn: () => authed<SkillGap>("/trainee/skill-gap"),
    retry: false,
  });
  const historyQuery = useQuery({
    queryKey: ["assessment", "history"],
    queryFn: () => authed<AssessmentHistory[]>("/assessment/history"),
  });

  const gap = gapQuery.data;
  const percent = gap && gap.total > 0 ? Math.round((gap.matched / gap.total) * 100) : 0;
  const nextSkill = gap?.items.find((i) => i.status !== "MET");

  return (
    <View>
      <View style={styles.heroCard}>
        <View style={styles.heroIcon}><MaterialCommunityIcons name="progress-check" size={24} color={colors.onBrandPrimary} /></View>
        <View style={styles.heroCopy}>
          <Text style={styles.heroTitle}>{gap ? gap.career_name : "Set a career goal"}</Text>
          <Text style={styles.heroText}>
            {gap
              ? `${gap.matched} of ${gap.total} required skills met (${percent}%). ${nextSkill ? `Next up: ${nextSkill.skill_name}.` : "You're on track!"}`
              : "Choose a career from your profile to start closing skill gaps."}
          </Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Quick actions</Text>
      <View style={styles.grid}>
        <ActionCard
          testID="action-take-assessment"
          icon="clipboard-check-outline"
          title={nextSkill ? `Assess ${nextSkill.skill_name}` : "Take an assessment"}
          text={nextSkill ? "Turn this gap into a proven level" : "Prove your strongest skill"}
          onPress={() => nextSkill ? router.push(`/assessment/${nextSkill.skill_id}`) : router.push("/skills")}
        />
        <ActionCard
          testID="action-view-gap"
          icon="target"
          title="Skill gap"
          text="See what stands between you and your goal"
          onPress={() => router.push("/career")}
        />
        <ActionCard
          testID="action-view-skills"
          icon="format-list-checks"
          title="My skills"
          text="Self-declare or reassess any skill"
          onPress={() => router.push("/skills")}
        />
        <ActionCard
          testID="action-view-training"
          icon="school-outline"
          title="Recommended courses"
          text="Sample training that closes your gaps"
          onPress={() => router.push("/career")}
        />
      </View>

      {historyQuery.data && historyQuery.data.length > 0 ? (
        <View>
          <Text style={styles.sectionTitle}>Recent assessments</Text>
          {historyQuery.data.slice(0, 3).map((h) => (
            <View key={h.id} style={styles.historyRow} testID={`history-${h.id}`}>
              <View style={styles.historyCopy}>
                <Text style={styles.historyTitle}>{h.skill_id.replace(/^skill-/, "").replace(/-/g, " ")}</Text>
                <Text style={styles.historyMeta}>{h.percentage}% · {PROFICIENCY_LABEL[h.proficiency]} · {new Date(h.submitted_at).toLocaleDateString()}</Text>
              </View>
              <MaterialCommunityIcons name="check-decagram" size={20} color={colors.brandPrimary} />
            </View>
          ))}
        </View>
      ) : null}

      {gapQuery.isPending || historyQuery.isPending ? (
        <View style={styles.centered}><ActivityIndicator color={colors.brandPrimary} /></View>
      ) : null}

      <Link href="/profile" asChild><Text style={styles.profileLink}>Review account and access details →</Text></Link>
    </View>
  );
}

function TrainerDashboard() {
  const styles = useStyles();
  const { colors } = useTheme();
  const authed = useAuthedRequest();
  const trainingsQuery = useQuery({
    queryKey: ["trainer", "trainings"],
    queryFn: () => authed<{ length: number }[]>("/trainer/trainings"),
  });
  const enrollmentsQuery = useQuery({
    queryKey: ["trainer", "enrollments"],
    queryFn: () => authed<{ status: string }[]>("/trainer/enrollments"),
  });
  const active = (enrollmentsQuery.data ?? []).filter((e) => e.status === "ENROLLED").length;
  return (
    <View>
      <View style={styles.heroCard}>
        <View style={styles.heroIcon}><MaterialCommunityIcons name="human-male-board" size={24} color={colors.onBrandPrimary} /></View>
        <View style={styles.heroCopy}>
          <Text style={styles.heroTitle}>{trainingsQuery.data?.length ?? 0} trainings · {active} active learners</Text>
          <Text style={styles.heroText}>Publish courses, then verify learner skills — verifications appear on their profiles.</Text>
        </View>
      </View>
      <Text style={styles.sectionTitle}>Quick actions</Text>
      <View style={styles.grid}>
        <ActionCard testID="action-new-training" icon="plus-circle-outline" title="New training" text="Publish a course for trainees" onPress={() => router.push("/trainings")} />
        <ActionCard testID="action-learners" icon="account-group-outline" title="Learners" text="Complete and verify skills" onPress={() => router.push("/learners")} />
        <ActionCard testID="action-trainer-profile" icon="badge-account-horizontal-outline" title="My profile" text="Headline, skills, institution" onPress={() => router.push("/trainer-profile")} />
        <ActionCard testID="action-my-trainings" icon="book-open-variant" title="My trainings" text="Edit or close your courses" onPress={() => router.push("/trainings")} />
      </View>
    </View>
  );
}

function AdminDashboard() {
  const styles = useStyles();
  const { colors } = useTheme();
  const authed = useAuthedRequest();
  const pendingQuery = useQuery({
    queryKey: ["admin", "pending-users"],
    queryFn: () => authed<{ length: number }[]>("/admin/pending-users"),
  });
  const pending = pendingQuery.data?.length ?? 0;
  return (
    <View>
      <View style={styles.heroCard}>
        <View style={styles.heroIcon}><MaterialCommunityIcons name="shield-account-outline" size={24} color={colors.onBrandPrimary} /></View>
        <View style={styles.heroCopy}>
          <Text style={styles.heroTitle}>{pending} account{pending === 1 ? "" : "s"} awaiting verification</Text>
          <Text style={styles.heroText}>Trainers, employers, and government users need your approval before they can sign in.</Text>
        </View>
      </View>
      <Text style={styles.sectionTitle}>Quick actions</Text>
      <View style={styles.grid}>
        <ActionCard testID="action-approvals" icon="check-decagram-outline" title="Verification queue" text="Approve or reject pending accounts" onPress={() => router.push("/approvals")} />
        <ActionCard testID="action-admin-profile" icon="account-cog-outline" title="Admin profile" text="Session and access details" onPress={() => router.push("/profile")} />
      </View>
    </View>
  );
}

function NonTraineePlaceholder() {
  const styles = useStyles();
  const { colors } = useTheme();
  return (
    <View>
      <View style={styles.heroCard}>
        <View style={styles.heroIcon}><MaterialCommunityIcons name="progress-check" size={24} color={colors.onBrandPrimary} /></View>
        <View style={styles.heroCopy}><Text style={styles.heroTitle}>Foundation connected</Text><Text style={styles.heroText}>Your secure role workspace is ready. Portal features unlock in the next phases.</Text></View>
      </View>
      <Text style={styles.sectionTitle}>Coming next</Text>
      <View style={styles.grid}>
        <ActionCard icon="account-edit-outline" title="Portal features" text="Role-specific workspace" onPress={() => undefined} testID="placeholder-portal" />
        <ActionCard icon="bell-outline" title="Notifications" text="In-app alerts will appear here" onPress={() => undefined} testID="placeholder-notifications" />
        <ActionCard icon="lock-outline" title="Privacy first" text="Your access stays role-scoped" onPress={() => undefined} testID="placeholder-privacy" />
        <ActionCard icon="chart-timeline-variant" title="Skill alignment" text="Coming with your portal" onPress={() => undefined} testID="placeholder-alignment" />
      </View>
      <Link href="/profile" asChild><Text style={styles.profileLink}>Review account and access details →</Text></Link>
    </View>
  );
}

function ActionCard({ icon, title, text, onPress, testID }: {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  title: string;
  text: string;
  onPress: () => void;
  testID: string;
}) {
  const styles = useStyles();
  const { colors } = useTheme();
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.infoCard, pressed && styles.pressed]} testID={testID} accessibilityRole="button">
      <MaterialCommunityIcons name={icon} size={22} color={colors.brandPrimary} />
      <Text style={styles.infoTitle}>{title}</Text>
      <Text style={styles.infoText}>{text}</Text>
    </Pressable>
  );
}

const useStyles = makeStyles((colors) => ({
  root: { backgroundColor: colors.surface, flex: 1 },
  content: { gap: 12, paddingHorizontal: 20 },
  topRow: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  roleBadge: { alignItems: "center", backgroundColor: colors.brandTertiary, borderRadius: 999, flexDirection: "row", gap: 5, paddingHorizontal: 10, paddingVertical: 7 },
  roleText: { color: colors.onBrandTertiary, fontSize: 11, fontWeight: "800" },
  eyebrow: { color: colors.brandPrimary, fontSize: 11, fontWeight: "800", letterSpacing: 1, marginTop: 18 },
  title: { color: colors.onSurface, fontSize: 28, fontWeight: "800", lineHeight: 34 },
  subtitle: { color: colors.muted, fontSize: 15, lineHeight: 22, maxWidth: 340 },
  heroCard: { alignItems: "center", backgroundColor: colors.brandPrimary, borderRadius: 20, flexDirection: "row", gap: 14, marginTop: 18, padding: 18 },
  heroIcon: { alignItems: "center", backgroundColor: colors.brandSecondary, borderRadius: 26, height: 52, justifyContent: "center", width: 52 },
  heroCopy: { flex: 1, gap: 5 },
  heroTitle: { color: colors.onBrandPrimary, fontSize: 17, fontWeight: "800" },
  heroText: { color: colors.onBrandPrimary, fontSize: 13, lineHeight: 19 },
  sectionTitle: { color: colors.onSurface, fontSize: 19, fontWeight: "800", marginTop: 22 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  infoCard: { backgroundColor: colors.surfaceSecondary, borderColor: colors.border, borderRadius: 16, borderWidth: 1, gap: 7, minHeight: 126, padding: 14, width: "48%" },
  pressed: { opacity: 0.85 },
  infoTitle: { color: colors.onSurface, fontSize: 14, fontWeight: "800" },
  infoText: { color: colors.muted, fontSize: 12, lineHeight: 17 },
  historyRow: { alignItems: "center", backgroundColor: colors.surfaceSecondary, borderColor: colors.border, borderRadius: 12, borderWidth: 1, flexDirection: "row", gap: 12, marginTop: 8, padding: 12 },
  historyCopy: { flex: 1, gap: 3 },
  historyTitle: { color: colors.onSurface, fontSize: 14, fontWeight: "800", textTransform: "capitalize" },
  historyMeta: { color: colors.muted, fontSize: 12 },
  centered: { alignItems: "center", padding: 12 },
  profileLink: { color: colors.brandPrimary, fontSize: 14, fontWeight: "700", marginTop: 16, paddingVertical: 12 },
}));
