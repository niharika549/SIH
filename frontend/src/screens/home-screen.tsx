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

  const bottomChrome = usesNativeTabs
    ? insets.bottom
    : 0;

  return (
    <View style={styles.root}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: insets.top + 18,
            paddingBottom: bottomChrome + 24,
          },
        ]}
      >
        <View style={styles.topRow}>
          <BrandHeader compact />

          <View style={styles.roleBadge}>
            <MaterialCommunityIcons
              name={content.icon}
              size={16}
              color={colors.onBrandTertiary}
            />

            <Text style={styles.roleText}>
              {user.role}
            </Text>
          </View>
        </View>

        <Text style={styles.eyebrow}>
          HELLO, {firstName.toUpperCase()}
        </Text>

        <Text style={styles.title}>
          {content.title}
        </Text>

        <Text style={styles.subtitle}>
          {content.subtitle}
        </Text>

        {user.role === "TRAINEE" ? (
          <TraineeDashboard />
        ) : null}

        {user.role === "TRAINER" ? (
          <TrainerDashboard />
        ) : null}

        {user.role === "ADMIN" ? (
          <AdminDashboard />
        ) : null}

        {user.role === "EMPLOYER" ? (
          <EmployerDashboard />
        ) : null}

        {user.role === "GOVERNMENT" ? (
          <GovernmentDashboard />
        ) : null}
      </ScrollView>
    </View>
  );
}


/* =========================
   TRAINEE DASHBOARD
========================= */

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
      ? Math.round(
          (gap.matched / gap.total) * 100,
        )
      : 0;

  const nextSkill = gap?.items.find(
    (i) => i.status !== "MET",
  );

  return (
    <View>
      <View style={styles.heroCard}>
        <View style={styles.heroIcon}>
          <MaterialCommunityIcons
            name="progress-check"
            size={24}
            color={colors.onBrandPrimary}
          />
        </View>

        <View style={styles.heroCopy}>
          <Text style={styles.heroTitle}>
            {gap
              ? gap.career_name
              : "Set a career goal"}
          </Text>

          <Text style={styles.heroText}>
            {gap
              ? `${gap.matched} of ${gap.total} required skills met (${percent}%). ${
                  nextSkill
                    ? `Next up: ${nextSkill.skill_name}.`
                    : "You're on track!"
                }`
              : "Choose a career from your profile to start closing skill gaps."}
          </Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>
        Quick actions
      </Text>

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
              ? "Turn this gap into a proven level"
              : "Prove your strongest skill"
          }
          onPress={() =>
            nextSkill
              ? router.push(
                  `/assessment/${nextSkill.skill_id}`,
                )
              : router.push("/skills")
          }
        />

        <ActionCard
          testID="action-view-gap"
          icon="target"
          title="Skill gap"
          text="See what stands between you and your goal"
          onPress={() =>
            router.push("/career")
          }
        />

        <ActionCard
          testID="action-view-skills"
          icon="format-list-checks"
          title="My skills"
          text="Self-declare or reassess any skill"
          onPress={() =>
            router.push("/skills")
          }
        />

        <ActionCard
          testID="action-view-training"
          icon="school-outline"
          title="Recommended courses"
          text="Sample training that closes your gaps"
          onPress={() =>
            router.push("/career")
          }
        />
      </View>

      {historyQuery.data &&
      historyQuery.data.length > 0 ? (
        <View>
          <Text style={styles.sectionTitle}>
            Recent assessments
          </Text>

          {historyQuery.data
            .slice(0, 3)
            .map((h) => (
              <View
                key={h.id}
                style={styles.historyRow}
                testID={`history-${h.id}`}
              >
                <View style={styles.historyCopy}>
                  <Text style={styles.historyTitle}>
                    {h.skill_id
                      .replace(/^skill-/, "")
                      .replace(/-/g, " ")}
                  </Text>

                  <Text style={styles.historyMeta}>
                    {h.percentage}% ·{" "}
                    {
                      PROFICIENCY_LABEL[
                        h.proficiency
                      ]
                    }{" "}
                    ·{" "}
                    {new Date(
                      h.submitted_at,
                    ).toLocaleDateString()}
                  </Text>
                </View>

                <MaterialCommunityIcons
                  name="check-decagram"
                  size={20}
                  color={colors.brandPrimary}
                />
              </View>
            ))}
        </View>
      ) : null}

      {gapQuery.isPending ||
      historyQuery.isPending ? (
        <View style={styles.centered}>
          <ActivityIndicator
            color={colors.brandPrimary}
          />
        </View>
      ) : null}

      <Link href="/profile" asChild>
        <Text style={styles.profileLink}>
          Review account and access details →
        </Text>
      </Link>
    </View>
  );
}


/* =========================
   TRAINER DASHBOARD
========================= */

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
      authed<{ status: string }[]>(
        "/trainer/enrollments",
      ),
  });

  const active = (
    enrollmentsQuery.data ?? []
  ).filter(
    (e) => e.status === "ENROLLED",
  ).length;

  return (
    <View>
      <View style={styles.heroCard}>
        <View style={styles.heroIcon}>
          <MaterialCommunityIcons
            name="human-male-board"
            size={24}
            color={colors.onBrandPrimary}
          />
        </View>

        <View style={styles.heroCopy}>
          <Text style={styles.heroTitle}>
            {trainingsQuery.data?.length ?? 0}{" "}
            trainings · {active} active learners
          </Text>

          <Text style={styles.heroText}>
            Publish courses, then verify learner
            skills.
          </Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>
        Quick actions
      </Text>

      <View style={styles.grid}>
        <ActionCard
          testID="action-new-training"
          icon="plus-circle-outline"
          title="New training"
          text="Publish a course for trainees"
          onPress={() =>
            router.push("/trainings")
          }
        />

        <ActionCard
          testID="action-learners"
          icon="account-group-outline"
          title="Learners"
          text="Complete and verify skills"
          onPress={() =>
            router.push("/learners")
          }
        />

        <ActionCard
          testID="action-trainer-profile"
          icon="badge-account-horizontal-outline"
          title="My profile"
          text="Headline, skills, institution"
          onPress={() =>
            router.push("/trainer-profile")
          }
        />

        <ActionCard
          testID="action-my-trainings"
          icon="book-open-variant"
          title="My trainings"
          text="Edit or close your courses"
          onPress={() =>
            router.push("/trainings")
          }
        />
      </View>
    </View>
  );
}


/* =========================
   EMPLOYER DASHBOARD
========================= */

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

  const openJobs = (
    jobsQuery.data ?? []
  ).filter(
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
            router.push(
              "/employer-jobs" as any,
            )
          }
        />

        <ActionCard
          testID="action-my-jobs"
          icon="briefcase-outline"
          title="My jobs"
          text="Edit, close, view applicants"
          onPress={() =>
            router.push(
              "/employer-jobs" as any,
            )
          }
        />

        <ActionCard
          testID="action-employer-profile"
          icon="domain"
          title="Company profile"
          text="Name, industry, location"
          onPress={() =>
            router.push("/profile")
          }
        />
      </View>
    </View>
  );
}


/* =========================
   ADMIN DASHBOARD
========================= */

function AdminDashboard() {
  const styles = useStyles();
  const { colors } = useTheme();
  const authed = useAuthedRequest();

  const pendingQuery = useQuery({
    queryKey: ["admin", "pending-users"],

    queryFn: () =>
      authed<{ length: number }[]>(
        "/admin/pending-users",
      ),
  });

  const pending =
    pendingQuery.data?.length ?? 0;

  return (
    <View>
      <View style={styles.heroCard}>
        <View style={styles.heroIcon}>
          <MaterialCommunityIcons
            name="shield-account-outline"
            size={24}
            color={colors.onBrandPrimary}
          />
        </View>

        <View style={styles.heroCopy}>
          <Text style={styles.heroTitle}>
            {pending} account
            {pending === 1 ? "" : "s"} awaiting
            verification
          </Text>

          <Text style={styles.heroText}>
            Manage account approvals and platform
            access.
          </Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>
        Quick actions
      </Text>

      <View style={styles.grid}>
        <ActionCard
          testID="action-approvals"
          icon="check-decagram-outline"
          title="Verification queue"
          text="Approve or reject pending accounts"
          onPress={() =>
            router.push("/approvals")
          }
        />

        <ActionCard
          testID="action-admin-profile"
          icon="account-cog-outline"
          title="Admin profile"
          text="Session and access details"
          onPress={() =>
            router.push("/profile")
          }
        />
      </View>
    </View>
  );
}


/* =========================
   GOVERNMENT DASHBOARD
========================= */

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

  const statistics =
    dashboardQuery.data?.statistics;

  if (dashboardQuery.isPending) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator
          color={colors.brandPrimary}
        />
      </View>
    );
  }

  if (dashboardQuery.isError) {
    return (
      <View style={styles.infoCard}>
        <Text style={styles.infoText}>
          Unable to load government dashboard
          data.
        </Text>

        <Text style={styles.infoText}>
          Please try again later.
        </Text>
      </View>
    );
  }

  return (
    <View>
      {/* HERO CARD */}

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


      {/* PLATFORM OVERVIEW */}

      <Text style={styles.sectionTitle}>
        Platform Overview
      </Text>

      <View style={styles.statsGrid}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>
            {statistics?.total_users ?? 0}
          </Text>

          <Text style={styles.statLabel}>
            Total Users
          </Text>
        </View>

        <View style={styles.statCard}>
          <Text style={styles.statValue}>
            {statistics?.total_trainees ?? 0}
          </Text>

          <Text style={styles.statLabel}>
            Trainees
          </Text>
        </View>

        <View style={styles.statCard}>
          <Text style={styles.statValue}>
            {statistics?.total_trainers ?? 0}
          </Text>

          <Text style={styles.statLabel}>
            Trainers
          </Text>
        </View>

        <View style={styles.statCard}>
          <Text style={styles.statValue}>
            {statistics?.total_trainings ?? 0}
          </Text>

          <Text style={styles.statLabel}>
            Trainings
          </Text>
        </View>
      </View>


      {/* GOVERNMENT MODULES */}

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
            router.push(
              "/government-district-analytics" as any,
            )
          }
        />

        <ActionCard
          testID="government-skill-analytics"
          icon="chart-line"
          title="Skill Analytics"
          text="Analyze demanded and emerging skills"
          onPress={() =>
            router.push(
              "/government-skill-analytics" as any,
            )
          }
        />

        <ActionCard
          testID="government-regional-map"
          icon="map-outline"
          title="Regional Skill Map"
          text="View India, state, and district skill demand"
          onPress={() =>
            router.push(
              "/government-regional-map" as any,
            )
          }
        />

        <ActionCard
          testID="government-skill-forecast"
          icon="chart-timeline-variant"
          title="Future Skill Demand Forecast"
          text="Explore emerging job and skill trends"
          onPress={() =>
            router.push(
              "/government-skill-forecast" as any,
            )
          }
        />

        <ActionCard
          testID="government-training-readiness"
          icon="school-outline"
          title="Training & Trainer Readiness"
          text="Check training seats, trainers, and district gaps"
          onPress={() =>
            router.push(
              "/government-training-readiness" as any,
            )
          }
        />

        <ActionCard
          testID="government-funding-allocation"
          icon="cash-multiple"
          title="Funding & Resource Allocation"
          text="Plan district funding, training seats, trainers and resources"
          onPress={() =>
            router.push(
              "/government-funding-allocation" as any,
            )
          }
        />

        <ActionCard
          testID="government-reports"
          icon="file-chart-outline"
          title="Reports"
          text="Generate workforce and training reports"
          onPress={() =>
            router.push(
              "/government-reports" as any,
            )
          }
        />

        <ActionCard
          testID="government-notifications"
          icon="bell-outline"
          title="Notifications"
          text="View government alerts and updates"
          onPress={() =>
            router.push(
              "/government-notifications" as any,
            )
          }
        />
      </View>


      {/* ENROLLMENT OVERVIEW */}

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


/* =========================
   ACTION CARD
========================= */

type ActionCardProps = {
  testID?: string;
  icon: string;
  title: string;
  text: string;
  onPress: () => void;
};

function ActionCard({
  testID,
  icon,
  title,
  text,
  onPress,
}: ActionCardProps) {
  const styles = useStyles();
  const { colors } = useTheme();

  return (
    <Pressable
      testID={testID}
      style={({ pressed }) => [
        styles.actionCard,
        pressed &&
          styles.actionCardPressed,
      ]}
      onPress={onPress}
    >
      <View style={styles.actionIcon}>
        <MaterialCommunityIcons
          name={icon as any}
          size={24}
          color={colors.brandPrimary}
        />
      </View>

      <Text style={styles.actionTitle}>
        {title}
      </Text>

      <Text style={styles.actionText}>
        {text}
      </Text>

      <View style={styles.actionArrow}>
        <MaterialCommunityIcons
          name="arrow-right"
          size={18}
          color={colors.brandPrimary}
        />
      </View>
    </Pressable>
  );
}


/* =========================
   NON-TRAINEE PLACEHOLDER
========================= */

function NonTraineePlaceholder() {
  const styles = useStyles();
  const { colors } = useTheme();

  return (
    <View style={styles.heroCard}>
      <View style={styles.heroIcon}>
        <MaterialCommunityIcons
          name="information-outline"
          size={24}
          color={colors.onBrandPrimary}
        />
      </View>

      <View style={styles.heroCopy}>
        <Text style={styles.heroTitle}>
          Workspace coming soon
        </Text>

        <Text style={styles.heroText}>
          Your workspace features will be
          available soon. Please check your
          profile for account details.
        </Text>
      </View>
    </View>
  );
}


/* =========================
   STYLES
========================= */

const useStyles = makeStyles((colors) => ({
  root: {
    flex: 1,
    backgroundColor: colors.surface,
  },

  content: {
    paddingHorizontal: 20,
  },

  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 24,
  },

  roleBadge: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: colors.brandTertiary,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
  },

  roleText: {
    color: colors.onBrandTertiary,
    fontSize: 11,
    fontWeight: "700",
  },

  eyebrow: {
    color: colors.brandPrimary,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1,
    marginBottom: 8,
  },

  title: {
    color: colors.onSurface,
    fontSize: 28,
    fontWeight: "800",
    marginBottom: 8,
  },

  subtitle: {
    color: colors.onSurfaceSecondary,
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 24,
  },

  heroCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: colors.brandPrimary,
    borderRadius: 20,
    padding: 18,
    marginBottom: 26,
  },

  heroIcon: {
    marginRight: 12,
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

  sectionTitle: {
    color: colors.onSurface,
    fontSize: 19,
    fontWeight: "800",
    marginBottom: 14,
    marginTop: 8,
  },

  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 20,
  },

  actionCard: {
    width: "48%",
    minHeight: 175,
    backgroundColor: colors.surfaceSecondary,
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },

  actionCardPressed: {
    opacity: 0.7,
  },

  actionIcon: {
    marginBottom: 12,
  },

  actionTitle: {
    color: colors.onSurface,
    fontSize: 14,
    fontWeight: "800",
    marginBottom: 6,
  },

  actionText: {
    color: colors.onSurfaceSecondary,
    fontSize: 12,
    lineHeight: 18,
  },

  actionArrow: {
    marginTop: "auto",
    alignItems: "flex-end",
  },

  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 20,
  },

  statCard: {
    width: "48%",
    backgroundColor: colors.surfaceSecondary,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },

  statValue: {
    color: colors.brandPrimary,
    fontSize: 25,
    fontWeight: "800",
    marginBottom: 4,
  },

  statLabel: {
    color: colors.onSurfaceSecondary,
    fontSize: 12,
  },

  infoCard: {
    backgroundColor: colors.surfaceSecondary,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 20,
  },

  infoText: {
    color: colors.onSurface,
    fontSize: 14,
    marginBottom: 10,
  },

  historyRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.surfaceSecondary,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },

  historyCopy: {
    flex: 1,
  },

  historyTitle: {
    color: colors.onSurface,
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 4,
  },

  historyMeta: {
    color: colors.onSurfaceSecondary,
    fontSize: 12,
  },

  centered: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 24,
  },

  profileLink: {
    color: colors.brandPrimary,
    fontSize: 14,
    fontWeight: "700",
    marginTop: 12,
    marginBottom: 24,
  },
}));