import type React from "react";

import { MaterialCommunityIcons } from "@expo/vector-icons";

import { useQuery } from "@tanstack/react-query";

import { Link, router } from "expo-router";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import type {
  AssessmentHistory,
  SkillGap,
} from "@/src/api/authed";

import {
  PROFICIENCY_LABEL,
  useAuthedRequest,
} from "@/src/api/authed";

import { useAuth } from "@/src/auth-context";

import { BrandHeader } from "@/src/components/brand-header";

import { usesNativeTabs } from "@/src/navigation";

import {
  makeStyles,
  useTheme,
} from "@/src/theme";


const roleCopy = {
  TRAINEE: {
    title: "Your learning path",
    subtitle:
      "Build a verified skills profile for your next opportunity.",
    icon: "school-outline",
  },
  TRAINER: {
    title: "Your training workspace",
    subtitle:
      "Prepare to guide learners through measurable progress.",
    icon: "human-male-board",
  },
  EMPLOYER: {
    title: "Your hiring workspace",
    subtitle:
      "Connect verified skills to the workforce you need.",
    icon: "office-building-outline",
  },
  GOVERNMENT: {
    title: "Your intelligence workspace",
    subtitle:
      "Review workforce signals within your approved scope.",
    icon: "bank-outline",
  },
  ADMIN: {
    title: "Your control center",
    subtitle:
      "Keep platform access and evidence trustworthy.",
    icon: "shield-account-outline",
  },
} as const;


/* =========================
   HOME SCREEN
========================= */

export function HomeScreen() {
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  if (!user) return null;

  const content =
    roleCopy[user.role as keyof typeof roleCopy] ??
    roleCopy.TRAINEE;
  const firstName = user.full_name.split(" ")[0];
  const bottomChrome = usesNativeTabs ? insets.bottom : 0;

  return (
    <View style={styles.root}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: insets.top + 16,
            paddingBottom: bottomChrome + 32,
          },
        ]}
      >
        {/* --------------------------------------------------------------- */}
        {/* HEADER                                                         */}
        {/* --------------------------------------------------------------- */}

        <View style={styles.topRow}>
          <BrandHeader compact />

          <View style={styles.roleBadge}>
            <MaterialCommunityIcons
              name={content.icon}
              size={15}
              color={colors.onBrandTertiary}
            />
            <Text style={styles.roleText}>{user.role}</Text>
          </View>
        </View>

        {/* --------------------------------------------------------------- */}
        {/* GREETING                                                        */}
        {/* --------------------------------------------------------------- */}

        <View style={styles.greetingBlock}>
          <Text style={styles.eyebrow}>
            WELCOME BACK, {firstName.toUpperCase()}
          </Text>

          <Text style={styles.title}>{content.title}</Text>

          <Text style={styles.subtitle}>{content.subtitle}</Text>
        </View>

        {/* --------------------------------------------------------------- */}
        {/* ROLE DASHBOARDS                                                  */}
        {/* --------------------------------------------------------------- */}

        {user.role === "TRAINEE" ? <TraineeDashboard /> : null}

        {user.role === "TRAINER" ? <TrainerDashboard /> : null}

        {user.role === "ADMIN" ? <AdminDashboard /> : null}

        {user.role === "EMPLOYER" ? <EmployerDashboard /> : null}

        {user.role === "GOVERNMENT" ? <GovernmentDashboard /> : null}
      </ScrollView>
    </View>
  );
}

/* ========================================================================= */
/* TRAINEE DASHBOARD                                                        */
/* ========================================================================= */

function TraineeDashboard() {
  const styles = useStyles();
  const { colors } = useTheme();
  const authed = useAuthedRequest();

  const gapQuery = useQuery({
    queryKey: ["trainee", "skill-gap"],

    queryFn: () =>
      authed<SkillGap>(
        "/trainee/skill-gap",
      ),

    retry: false,
  });

  const historyQuery = useQuery({
    queryKey: ["assessment", "history"],

    queryFn: () =>
      authed<AssessmentHistory[]>(
        "/assessment/history",
      ),
  });

  const gap = gapQuery.data;

  const percent =
    gap && gap.total > 0
      ? Math.round((gap.matched / gap.total) * 100)
      : 0;

  const nextSkill = gap?.items.find((item) => item.status !== "MET");

  const isComplete = gap ? percent >= 100 : false;

  return (
    <View>
      {/* ----------------------------------------------------------------- */}
      {/* CAREER READINESS CARD                                            */}
      {/* ----------------------------------------------------------------- */}

      <View style={styles.readinessCard}>
        <View style={styles.readinessTopRow}>
          <View style={styles.readinessIcon}>
            <MaterialCommunityIcons
              name="target"
              size={25}
              color={colors.onBrandPrimary}
            />
          </View>

          <View style={styles.readinessLabelContainer}>
            <Text style={styles.readinessLabel}>CAREER READINESS</Text>

            <Text style={styles.readinessCareer}>
              {gap ? gap.career_name : "Career goal not set"}
            </Text>
          </View>

          <Text style={styles.readinessPercent}>{percent}%</Text>
        </View>

        <View style={styles.progressTrack}>
          <View
            style={[
              styles.progressFill,
              {
                width: `${Math.min(percent, 100)}%`,
              },
            ]}
          />
        </View>

        <Text style={styles.readinessDescription}>
          {gap
            ? `${gap.matched} of ${gap.total} required skills currently meet your career target.`
            : "Choose a career goal to see your skill readiness."}
        </Text>
      </View>

      {/* ----------------------------------------------------------------- */}
      {/* NEXT STEP                                                         */}
      {/* ----------------------------------------------------------------- */}

      <View style={styles.nextStepCard}>
        <View style={styles.nextStepIcon}>
          <MaterialCommunityIcons
            name={isComplete ? "check-decagram" : "lightbulb-on-outline"}
            size={23}
            color={colors.brandSecondary}
          />
        </View>

        <View style={styles.nextStepContent}>
          <Text style={styles.smallLabel}>
            {isComplete ? "CAREER GOAL ACHIEVED" : "YOUR NEXT STEP"}
          </Text>

          <Text style={styles.nextStepTitle}>
            {gap
              ? isComplete
                ? "All required skills are covered"
                : nextSkill
                  ? `Improve ${nextSkill.skill_name}`
                  : "Continue building your profile"
              : "Set your career goal"}
          </Text>

          <Text style={styles.nextStepText}>
            {gap
              ? isComplete
                ? "Keep your verified skills updated as industry requirements change."
                : nextSkill
                  ? `Assess or improve this skill to move closer to your ${gap.career_name} goal.`
                  : "Continue assessing your skills to strengthen your profile."
              : "Choose a target career to unlock personalized skill-gap insights."}
          </Text>
        </View>
      </View>

      {/* ----------------------------------------------------------------- */}
      {/* QUICK ACTIONS                                                     */}
      {/* ----------------------------------------------------------------- */}

      <View style={styles.sectionHeader}>
        <View>
          <Text style={styles.sectionTitle}>Quick actions</Text>
          <Text style={styles.sectionSubtitle}>
            Continue building your career profile
          </Text>
        </View>
      </View>

      <View style={styles.grid}>
        <ActionCard
          testID="action-take-assessment"
          icon="clipboard-check-outline"
          title={
            nextSkill
              ? `Assess ${nextSkill.skill_name}`
              : "Take an assessment"
          }
          text={
            nextSkill
              ? "Turn this gap into a proven skill level"
              : "Prove your strongest skill"
          }
          accent="blue"
          onPress={() =>
            nextSkill
              ? router.push(`/assessment/${nextSkill.skill_id}`)
              : router.push("/skills")
          }
        />

        <ActionCard
          testID="action-view-gap"
          icon="target"
          title="Skill gap"
          text="See what stands between you and your goal"
          accent="green"
          onPress={() => router.push("/career")}
        />

        <ActionCard
          testID="action-view-skills"
          icon="format-list-checks"
          title="My skills"
          text="Self-declare or reassess your skills"
          accent="purple"
          onPress={() => router.push("/skills")}
        />

        <ActionCard
          testID="action-view-training"
          icon="school-outline"
          title="Recommended courses"
          text="Find training that closes your gaps"
          accent="orange"
          onPress={() => router.push("/career")}
        />
      </View>

      {/* ----------------------------------------------------------------- */}
      {/* AI INSIGHT                                                        */}
      {/* ----------------------------------------------------------------- */}

      {gap ? (
        <View style={styles.aiCard}>
          <View style={styles.aiHeader}>
            <View style={styles.aiIcon}>
              <MaterialCommunityIcons
                name="brain"
                size={21}
                color={colors.onBrandPrimary}
              />
            </View>

            <View style={styles.aiTitleContainer}>
              <Text style={styles.aiLabel}>SKILLALIGN INSIGHT</Text>
              <Text style={styles.aiTitle}>Your current focus</Text>
            </View>
          </View>

          <Text style={styles.aiText}>
            {isComplete
              ? `Your assessed skills currently cover all required skills for ${gap.career_name}. Keep your profile updated as requirements change.`
              : nextSkill
                ? `${nextSkill.skill_name} is currently one of the skills that needs improvement for your ${gap.career_name} goal.`
                : `Continue assessing your skills to build a stronger ${gap.career_name} profile.`}
          </Text>
        </View>
      ) : null}

      {/* ----------------------------------------------------------------- */}
      {/* RECENT ASSESSMENTS                                                */}
      {/* ----------------------------------------------------------------- */}

      {historyQuery.data && historyQuery.data.length > 0 ? (
        <View>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionTitle}>Recent assessments</Text>
              <Text style={styles.sectionSubtitle}>
                Your latest verified progress
              </Text>
            </View>
          </View>

          {historyQuery.data.slice(0, 3).map((h) => (
            <View
              key={h.id}
              style={styles.historyRow}
              testID={`history-${h.id}`}
            >
              <View style={styles.historyIcon}>
                <MaterialCommunityIcons
                  name="check-decagram"
                  size={19}
                  color={colors.brandSecondary}
                />
              </View>

              <View style={styles.historyCopy}>
                <Text style={styles.historyTitle}>
                  {h.skill_id
                    .replace(/^skill-/, "")
                    .replace(/-/g, " ")}
                </Text>

                <Text style={styles.historyMeta}>
                  {h.percentage}% · {PROFICIENCY_LABEL[h.proficiency]} ·{" "}
                  {new Date(h.submitted_at).toLocaleDateString()}
                </Text>
              </View>

              <MaterialCommunityIcons
                name="chevron-right"
                size={20}
                color={colors.muted}
              />
            </View>
          ))}
        </View>
      ) : null}

      {/* ----------------------------------------------------------------- */}
      {/* LOADING                                                           */}
      {/* ----------------------------------------------------------------- */}

      {gapQuery.isPending || historyQuery.isPending ? (
        <View style={styles.centered}>
          <ActivityIndicator color={colors.brandPrimary} />
        </View>
      ) : null}

      {/* ----------------------------------------------------------------- */}
      {/* PROFILE LINK                                                      */}
      {/* ----------------------------------------------------------------- */}

      <Link href="/profile" asChild>
        <Pressable style={styles.profileLinkContainer}>
          <Text style={styles.profileLink}>
            Review account and access details
          </Text>

          <MaterialCommunityIcons
            name="arrow-right"
            size={18}
            color={colors.brandPrimary}
          />
        </Pressable>
      </Link>
    </View>
  );
}

/* ========================================================================= */
/* TRAINER DASHBOARD                                                        */
/* ========================================================================= */

function TrainerDashboard() {
  const styles = useStyles();
  const { colors } = useTheme();
  const authed = useAuthedRequest();

  const trainingsQuery = useQuery({
    queryKey: ["trainer", "trainings"],

    queryFn: () =>
      authed<{ length: number }[]>(
        "/trainer/trainings",
      ),
  });

  const enrollmentsQuery = useQuery({
    queryKey: ["trainer", "enrollments"],
    queryFn: () =>
      authed<{ status: string }[]>("/trainer/enrollments"),
  });

  const active = (enrollmentsQuery.data ?? []).filter(
    (e) => e.status === "ENROLLED",
  ).length;

  return (
    <View>
      <View style={styles.workspaceCard}>
        <View style={styles.workspaceIcon}>
          <MaterialCommunityIcons
            name="human-male-board"
            size={26}
            color={colors.onBrandPrimary}
          />
        </View>

        <View style={styles.workspaceContent}>
          <Text style={styles.workspaceLabel}>TRAINING WORKSPACE</Text>

          <Text style={styles.workspaceTitle}>
            {trainingsQuery.data?.length ?? 0} trainings
          </Text>

          <Text style={styles.workspaceText}>
            {active} active learners currently enrolled.
          </Text>
        </View>
      </View>

      <View style={styles.sectionHeader}>
        <View>
          <Text style={styles.sectionTitle}>Quick actions</Text>
          <Text style={styles.sectionSubtitle}>
            Manage your training workspace
          </Text>
        </View>
      </View>

      <View style={styles.grid}>
        <ActionCard
          testID="action-new-training"
          icon="plus-circle-outline"
          title="New training"
          text="Publish a course for trainees"
          accent="blue"
          onPress={() => router.push("/trainings")}
        />

        <ActionCard
          testID="action-learners"
          icon="account-group-outline"
          title="Learners"
          text="Complete and verify skills"
          accent="green"
          onPress={() => router.push("/learners")}
        />

        <ActionCard
          testID="action-trainer-profile"
          icon="badge-account-horizontal-outline"
          title="My profile"
          text="Headline, skills and institution"
          accent="purple"
          onPress={() => router.push("/trainer-profile")}
        />

        <ActionCard
          testID="action-my-trainings"
          icon="book-open-variant"
          title="My trainings"
          text="Edit or close your courses"
          accent="orange"
          onPress={() => router.push("/trainings")}
        />
      </View>
    </View>
  );
}

/* ========================================================================= */
/* ADMIN DASHBOARD                                                          */
/* ========================================================================= */

function AdminDashboard() {
  const styles = useStyles();
  const { colors } = useTheme();
  const authed = useAuthedRequest();

  const pendingQuery = useQuery({
    queryKey: ["admin", "pending-users"],
    queryFn: () =>
      authed<{ length: number }[]>("/admin/pending-users"),
  });

  const pending = pendingQuery.data?.length ?? 0;

  return (
    <View>
      <View style={styles.workspaceCard}>
        <View style={styles.workspaceIcon}>
          <MaterialCommunityIcons
            name="shield-account-outline"
            size={26}
            color={colors.onBrandPrimary}
          />
        </View>

        <View style={styles.workspaceContent}>
          <Text style={styles.workspaceLabel}>CONTROL CENTER</Text>

          <Text style={styles.workspaceTitle}>
            {pending} pending {pending === 1 ? "account" : "accounts"}
          </Text>

          <Text style={styles.workspaceText}>
            Accounts currently awaiting verification.
          </Text>
        </View>
      </View>

      <View style={styles.sectionHeader}>
        <View>
          <Text style={styles.sectionTitle}>Quick actions</Text>
          <Text style={styles.sectionSubtitle}>
            Manage platform access
          </Text>
        </View>
      </View>

      <View style={styles.grid}>
        <ActionCard
          testID="action-approvals"
          icon="check-decagram-outline"
          title="Verification queue"
          text="Approve or reject pending accounts"
          accent="green"
          onPress={() => router.push("/approvals")}
        />

        <ActionCard
          testID="action-admin-profile"
          icon="account-cog-outline"
          title="Admin profile"
          text="Session and access details"
          accent="blue"
          onPress={() => router.push("/profile")}
        />
      </View>
    </View>
  );
}

/* ========================================================================= */
/* EMPLOYER DASHBOARD                                                        */
/* ========================================================================= */

function EmployerDashboard() {
  const styles = useStyles();
  const { colors } = useTheme();
  const authed = useAuthedRequest();

  const jobsQuery = useQuery({
    queryKey: ["employer", "jobs"],
    queryFn: () =>
      authed<{ status: string }[]>(
        "/employer/jobs",
      ),
  });

  const openJobs = (jobsQuery.data ?? []).filter(
    (j) => j.status === "OPEN",
  ).length;

  return (
    <View>
      <View style={styles.heroCard}>
        <View style={styles.heroIcon}>
          <MaterialCommunityIcons
            name="office-building-outline"
            size={24}
            color={colors.onBrandPrimary}
          />
        </View>

        <View style={styles.heroCopy}>
          <Text style={styles.heroTitle}>
            {openJobs} open job
            {openJobs === 1 ? "" : "s"}
          </Text>

          <Text style={styles.heroText}>
            Post roles, review applicants, and
            see candidates matched to your
            required skills.
          </Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>
        Quick actions
      </Text>

      <View style={styles.grid}>
        <ActionCard
          testID="action-new-job"
          icon="plus-circle-outline"
          title="Post a job"
          text="Publish a new opening"
          onPress={() =>
            router.push("/employer-jobs" as any)
          }
        />

        <ActionCard
          testID="action-my-jobs"
          icon="briefcase-outline"
          title="My jobs"
          text="Edit, close, view applicants"
          onPress={() =>
            router.push("/employer-jobs" as any)
          }
        />

        <ActionCard
          testID="action-employer-profile"
          icon="domain"
          title="Company profile"
          text="Name, industry, location"
          onPress={() => router.push("/profile")}
        />
      </View>
    </View>
  );
}

/* ========================================================================= */
/* GOVERNMENT DASHBOARD                                                     */
/* ========================================================================= */

function GovernmentDashboard() {
  const styles = useStyles();
  const { colors } = useTheme();
  const authed = useAuthedRequest();

  type Statistics = {
    total_users: number;
    total_trainees: number;
    total_trainers: number;
    total_employers: number;
    total_trainings: number;
    total_enrollments: number;
    active_enrollments: number;
    completed_enrollments: number;
  };

  type DashboardResponse = {
    statistics: Statistics;
  };

  const dashboardQuery = useQuery({
    queryKey: ["government", "dashboard"],
    queryFn: () =>
      authed<DashboardResponse>(
        "/government/dashboard",
      ),
    retry: false,
  });

  const statistics = dashboardQuery.data?.statistics;

  if (dashboardQuery.isPending) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.brandPrimary} />
      </View>
    );
  }

  if (dashboardQuery.isError) {
    return (
      <View style={styles.infoCard}>
        <Text style={styles.infoText}>
          Unable to load government dashboard data.
        </Text>
        <Text style={styles.infoText}>
          Please try again later.
        </Text>
      </View>
    );
  }

  return (
    <View>
      <View style={styles.heroCard}>
        <View style={styles.heroIcon}>
          <MaterialCommunityIcons
            name="bank-outline"
            size={24}
            color={colors.onBrandPrimary}
          />
        </View>

        <View style={styles.heroCopy}>
          <Text style={styles.heroTitle}>
            Government Intelligence Dashboard
          </Text>

          <Text style={styles.heroText}>
            Monitor workforce demand, training
            capacity, and regional skill gaps.
          </Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>
        Platform Overview
      </Text>

      <View style={styles.statsGrid}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>
            {statistics?.total_users ?? 0}
          </Text>
          <Text style={styles.statLabel}>Total Users</Text>
        </View>

        <View style={styles.statCard}>
          <Text style={styles.statValue}>
            {statistics?.total_trainees ?? 0}
          </Text>
          <Text style={styles.statLabel}>Trainees</Text>
        </View>

        <View style={styles.statCard}>
          <Text style={styles.statValue}>
            {statistics?.total_trainers ?? 0}
          </Text>
          <Text style={styles.statLabel}>Trainers</Text>
        </View>

        <View style={styles.statCard}>
          <Text style={styles.statValue}>
            {statistics?.total_trainings ?? 0}
          </Text>
          <Text style={styles.statLabel}>Trainings</Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>
        Government Modules
      </Text>

      <View style={styles.grid}>
        <ActionCard
          testID="government-district-analytics"
          icon="map-marker-radius-outline"
          title="District Analytics"
          text="View district-wise skill demand and supply"
          onPress={() =>
            router.push("/government-district-analytics" as any)
          }
        />

        <ActionCard
          testID="government-skill-analytics"
          icon="chart-line"
          title="Skill Analytics"
          text="Analyze demanded and emerging skills"
          onPress={() =>
            router.push("/government-skill-analytics" as any)
          }
        />

        <ActionCard
          testID="government-regional-map"
          icon="map-outline"
          title="Regional Skill Map"
          text="View India, state, and district skill demand"
          onPress={() =>
            router.push("/government-regional-map" as any)
          }
        />

        <ActionCard
          testID="government-skill-forecast"
          icon="chart-timeline-variant"
          title="Future Skill Demand Forecast"
          text="Explore emerging job and skill trends"
          onPress={() =>
            router.push("/government-skill-forecast" as any)
          }
        />

        <ActionCard
          testID="government-training-readiness"
          icon="school-outline"
          title="Training & Trainer Readiness"
          text="Check training seats, trainers, and district gaps"
          onPress={() =>
            router.push("/government-training-readiness" as any)
          }
        />

        <ActionCard
          testID="government-funding-allocation"
          icon="cash-multiple"
          title="Funding & Resource Allocation"
          text="Plan district funding, training seats, trainers and resources"
          onPress={() =>
            router.push("/government-funding-allocation" as any)
          }
        />

        <ActionCard
          testID="government-reports"
          icon="file-chart-outline"
          title="Reports"
          text="Generate workforce and training reports"
          onPress={() =>
            router.push("/government-reports" as any)
          }
        />

        <ActionCard
          testID="government-notifications"
          icon="bell-outline"
          title="Notifications"
          text="View government alerts and updates"
          onPress={() =>
            router.push("/government-notifications" as any)
          }
        />
      </View>

      <Text style={styles.sectionTitle}>
        Enrollment Overview
      </Text>

      <View style={styles.infoCard}>
        <Text style={styles.infoText}>
          Total Enrollments:{" "}
          {statistics?.total_enrollments ?? 0}
        </Text>
        <Text style={styles.infoText}>
          Active Enrollments:{" "}
          {statistics?.active_enrollments ?? 0}
        </Text>
        <Text style={styles.infoText}>
          Completed Enrollments:{" "}
          {statistics?.completed_enrollments ?? 0}
        </Text>
      </View>
    </View>
  );
}

/* ========================================================================= */
/* ACTION CARD                                                              */
/* ========================================================================= */

function ActionCard({
  icon,
  title,
  text,
  onPress,
  testID,
  accent = "blue",
}: {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  title: string;
  text: string;
  onPress: () => void;
  testID: string;
  accent?: "blue" | "green" | "purple" | "orange";
}) {
  const styles = useStyles();
  const { colors } = useTheme();

  const accentColor =
    accent === "green"
      ? colors.brandSecondary
      : accent === "purple"
        ? "#9B7CFF"
        : accent === "orange"
          ? "#F59E0B"
          : colors.brandPrimary;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.infoCard,
        pressed && styles.pressed,
      ]}
      testID={testID}
      accessibilityRole="button"
    >
      <View
        style={[
          styles.actionIcon,
          {
            backgroundColor: `${accentColor}22`,
          },
        ]}
      >
        <MaterialCommunityIcons
          name={icon}
          size={21}
          color={accentColor}
        />
      </View>

      <Text style={styles.infoTitle}>{title}</Text>

      <Text style={styles.infoText}>{text}</Text>

      <View style={styles.actionArrow}>
        <MaterialCommunityIcons
          name="arrow-right"
          size={16}
          color={colors.muted}
        />
      </View>
    </Pressable>
  );
}

/* ========================================================================= */
/* STYLES                                                                   */
/* ========================================================================= */

const useStyles = makeStyles((colors) => ({
  root: {
    backgroundColor: colors.surface,
    flex: 1,
  },

  content: {
    gap: 10,
    paddingHorizontal: 18,
  },

  /* --------------------------------------------------------------------- */
  /* HEADER                                                                */
  /* --------------------------------------------------------------------- */

  topRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },

  roleBadge: {
    alignItems: "center",
    backgroundColor: colors.brandTertiary,
    borderColor: colors.borderStrong,
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: "row",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },

  roleText: {
    color: colors.onBrandTertiary,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.5,
  },

  /* --------------------------------------------------------------------- */
  /* GREETING                                                              */
  /* --------------------------------------------------------------------- */

  greetingBlock: {
    gap: 5,
    marginTop: 18,
  },

  eyebrow: {
    color: colors.brandSecondary,
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1.3,
  },

  title: {
    color: colors.onSurface,
    fontSize: 28,
    fontWeight: "800",
    lineHeight: 34,
  },

  subtitle: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 21,
    maxWidth: 350,
  },

  /* --------------------------------------------------------------------- */
  /* EMPLOYER / GOVERNMENT HERO                                             */
  /* --------------------------------------------------------------------- */

  heroCard: {
    alignItems: "flex-start",
    backgroundColor: colors.brandPrimary,
    borderRadius: 20,
    flexDirection: "row",
    marginTop: 18,
    marginBottom: 20,
    padding: 18,
  },

  heroIcon: {
    marginRight: 12,
    paddingTop: 1,
  },

  heroCopy: {
    flex: 1,
  },

  heroTitle: {
    color: colors.onBrandPrimary,
    fontSize: 17,
    fontWeight: "800",
    marginBottom: 6,
  },

  heroText: {
    color: colors.onBrandPrimary,
    fontSize: 13,
    lineHeight: 20,
  },

  /* --------------------------------------------------------------------- */
  /* --------------------------------------------------------------------- */
  /* TRAINEE READINESS                                                     */
  /* --------------------------------------------------------------------- */

  readinessCard: {
    backgroundColor: colors.brandPrimary,
    borderRadius: 22,
    gap: 15,
    marginTop: 18,
    padding: 18,
  },

  readinessTopRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
  },

  readinessIcon: {
    alignItems: "center",
    backgroundColor: "rgba(24, 217, 155, 0.22)",
    borderColor: "rgba(255,255,255,0.18)",
    borderRadius: 15,
    borderWidth: 1,
    height: 48,
    justifyContent: "center",
    width: 48,
  },

  readinessLabelContainer: {
    flex: 1,
    gap: 3,
  },

  readinessLabel: {
    color: "rgba(255,255,255,0.72)",
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 1.2,
  },

  readinessCareer: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
  },

  readinessPercent: {
    color: colors.brandSecondary,
    fontSize: 25,
    fontWeight: "900",
  },

  progressTrack: {
    backgroundColor: "rgba(255,255,255,0.18)",
    borderRadius: 999,
    height: 8,
    overflow: "hidden",
    width: "100%",
  },

  progressFill: {
    backgroundColor: colors.brandSecondary,
    borderRadius: 999,
    height: "100%",
  },

  readinessDescription: {
    color: "rgba(255,255,255,0.82)",
    fontSize: 12,
    lineHeight: 18,
  },

  /* --------------------------------------------------------------------- */
  /* NEXT STEP                                                             */
  /* --------------------------------------------------------------------- */

  nextStepCard: {
    alignItems: "flex-start",
    backgroundColor: colors.surfaceSecondary,
    borderColor: colors.border,
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: "row",
    gap: 12,
    marginTop: 2,
    padding: 15,
  },

  nextStepIcon: {
    alignItems: "center",
    backgroundColor: "rgba(24, 217, 155, 0.12)",
    borderRadius: 13,
    height: 42,
    justifyContent: "center",
    width: 42,
  },

  nextStepContent: {
    flex: 1,
    gap: 4,
  },

  smallLabel: {
    color: colors.brandSecondary,
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 1,
  },

  nextStepTitle: {
    color: colors.onSurface,
    fontSize: 15,
    fontWeight: "800",
  },

  nextStepText: {
    color: colors.muted,
    fontSize: 12,
    lineHeight: 18,
  },

  /* --------------------------------------------------------------------- */
  /* SECTION HEADERS                                                       */
  /* --------------------------------------------------------------------- */

  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 21,
  },

  sectionTitle: {
    color: colors.onSurface,
    fontSize: 18,
    fontWeight: "800",
  },

  sectionSubtitle: {
    color: colors.muted,
    fontSize: 11,
    lineHeight: 16,
    marginTop: 2,
  },

  /* --------------------------------------------------------------------- */
  /* ACTION GRID                                                           */
  /* --------------------------------------------------------------------- */

  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 10,
  },

  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 10,
  },

  statCard: {
    backgroundColor: colors.surfaceSecondary,
    borderColor: colors.border,
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    width: "48%",
  },

  statValue: {
    color: colors.brandPrimary,
    fontSize: 25,
    fontWeight: "800",
    marginBottom: 4,
  },

  statLabel: {
    color: colors.muted,
    fontSize: 12,
  },

  infoCard: {
    backgroundColor: colors.surfaceSecondary,
    borderColor: colors.border,
    borderRadius: 17,
    borderWidth: 1,
    gap: 6,
    minHeight: 142,
    padding: 14,
    position: "relative",
    width: "48%",
  },

  actionIcon: {
    alignItems: "center",
    borderRadius: 11,
    height: 39,
    justifyContent: "center",
    width: 39,
  },

  infoTitle: {
    color: colors.onSurface,
    fontSize: 14,
    fontWeight: "800",
    lineHeight: 18,
    marginTop: 2,
  },

  infoText: {
    color: colors.muted,
    fontSize: 11,
    lineHeight: 16,
    paddingRight: 3,
  },

  actionArrow: {
    bottom: 11,
    position: "absolute",
    right: 12,
  },

  pressed: {
    opacity: 0.75,
    transform: [{ scale: 0.98 }],
  },

  /* --------------------------------------------------------------------- */
  /* AI INSIGHT                                                            */
  /* --------------------------------------------------------------------- */

  aiCard: {
    backgroundColor: colors.surfaceTertiary,
    borderColor: colors.borderStrong,
    borderRadius: 18,
    borderWidth: 1,
    gap: 12,
    marginTop: 18,
    padding: 16,
  },

  aiHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: 11,
  },

  aiIcon: {
    alignItems: "center",
    backgroundColor: colors.brandPrimary,
    borderRadius: 12,
    height: 40,
    justifyContent: "center",
    width: 40,
  },

  aiTitleContainer: {
    flex: 1,
    gap: 2,
  },

  aiLabel: {
    color: colors.brandSecondary,
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 1,
  },

  aiTitle: {
    color: colors.onSurface,
    fontSize: 15,
    fontWeight: "800",
  },

  aiText: {
    color: colors.onSurfaceTertiary,
    fontSize: 12,
    lineHeight: 19,
  },

  /* --------------------------------------------------------------------- */
  /* RECENT ASSESSMENTS                                                    */
  /* --------------------------------------------------------------------- */

  historyRow: {
    alignItems: "center",
    backgroundColor: colors.surfaceSecondary,
    borderColor: colors.border,
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: "row",
    gap: 11,
    marginTop: 8,
    padding: 12,
  },

  historyIcon: {
    alignItems: "center",
    backgroundColor: "rgba(24, 217, 155, 0.12)",
    borderRadius: 10,
    height: 38,
    justifyContent: "center",
    width: 38,
  },

  historyCopy: {
    flex: 1,
    gap: 3,
  },

  historyTitle: {
    color: colors.onSurface,
    fontSize: 14,
    fontWeight: "800",
    textTransform: "capitalize",
  },

  historyMeta: {
    color: colors.muted,
    fontSize: 11,
  },

  /* --------------------------------------------------------------------- */
  /* TRAINER / ADMIN WORKSPACE                                             */
  /* --------------------------------------------------------------------- */

  workspaceCard: {
    alignItems: "center",
    backgroundColor: colors.brandPrimary,
    borderRadius: 21,
    flexDirection: "row",
    gap: 14,
    marginTop: 18,
    padding: 18,
  },

  workspaceIcon: {
    alignItems: "center",
    backgroundColor: colors.brandSecondary,
    borderRadius: 15,
    height: 50,
    justifyContent: "center",
    width: 50,
  },

  workspaceContent: {
    flex: 1,
    gap: 3,
  },

  workspaceLabel: {
    color: "rgba(255,255,255,0.72)",
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 1.1,
  },

  workspaceTitle: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "800",
  },

  workspaceText: {
    color: "rgba(255,255,255,0.82)",
    fontSize: 12,
    lineHeight: 18,
  },

  /* --------------------------------------------------------------------- */
  /* LOADING                                                               */
  /* --------------------------------------------------------------------- */

  centered: {
    alignItems: "center",
    padding: 16,
  },

  /* --------------------------------------------------------------------- */
  /* PROFILE LINK                                                          */
  /* --------------------------------------------------------------------- */

  profileLinkContainer: {
    alignItems: "center",
    flexDirection: "row",
    gap: 7,
    justifyContent: "center",
    marginTop: 16,
    paddingVertical: 13,
  },

  profileLink: {
    color: colors.brandPrimary,
    fontSize: 13,
    fontWeight: "800",
  },
}));
