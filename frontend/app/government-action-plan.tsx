import { useQuery } from "@tanstack/react-query";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { useAuthedRequest } from "@/src/api/authed";

type TrainingAnalytics = {
  total_trainings: number;
  total_capacity: number;
  used_capacity: number;
  available_capacity: number;
  total_enrollments: number;
  active_enrollments: number;
  completed_enrollments: number;
  utilization_rate: number;
  completion_rate: number;
};

type District = {
  state_code?: string;
  district_code?: string;
  trainees?: number;
  trainers?: number;
  employers?: number;
  trainings?: number;
};

type DistrictResponse = {
  districts?: District[];
};

type JobPlacementAnalytics = {
  summary?: {
    total_jobs: number;
    total_openings: number;
    total_applications: number;
    total_placements: number;
    placement_rate: number;
  };
};

export default function GovernmentActionPlan() {
  const authed = useAuthedRequest();

  const trainingQuery = useQuery({
    queryKey: ["government", "training-analytics"],
    queryFn: () =>
      authed<TrainingAnalytics>(
        "/government/training-analytics"
      ),
    retry: false,
  });

  const districtQuery = useQuery({
    queryKey: ["government", "district-analytics"],
    queryFn: () =>
      authed<DistrictResponse>(
        "/government/district-analytics"
      ),
    retry: false,
  });

  const jobQuery = useQuery({
    queryKey: ["government", "job-placement-analytics"],
    queryFn: () =>
      authed<JobPlacementAnalytics>(
        "/government/job-placement-analytics"
      ),
    retry: false,
  });

  const loading =
    trainingQuery.isPending ||
    districtQuery.isPending ||
    jobQuery.isPending;

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />

        <Text style={styles.loadingText}>
          Preparing government action plan...
        </Text>
      </View>
    );
  }

  if (
    trainingQuery.isError ||
    districtQuery.isError ||
    jobQuery.isError
  ) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorTitle}>
          Unable to load action plan
        </Text>

        <Text style={styles.errorText}>
          Please check the backend connection.
        </Text>
      </View>
    );
  }

  const training =
    trainingQuery.data ?? {
      total_trainings: 0,
      total_capacity: 0,
      used_capacity: 0,
      available_capacity: 0,
      total_enrollments: 0,
      active_enrollments: 0,
      completed_enrollments: 0,
      utilization_rate: 0,
      completion_rate: 0,
    };

  const districts =
    districtQuery.data?.districts ?? [];

  const jobSummary =
    jobQuery.data?.summary ?? {
      total_jobs: 0,
      total_openings: 0,
      total_applications: 0,
      total_placements: 0,
      placement_rate: 0,
    };

  const actions: {
    priority: "HIGH" | "MEDIUM" | "LOW";
    title: string;
    description: string;
  }[] = [];

  // Training capacity recommendation
  if (training.available_capacity < training.total_capacity * 0.2) {
    actions.push({
      priority: "HIGH",
      title: "Increase Training Capacity",
      description:
        "Available training seats are low compared with total capacity. Consider adding new batches and seats.",
    });
  } else {
    actions.push({
      priority: "MEDIUM",
      title: "Monitor Training Capacity",
      description:
        "Current training capacity is available, but seat utilization should continue to be monitored.",
    });
  }

  // Completion recommendation
  if (training.completion_rate < 60) {
    actions.push({
      priority: "HIGH",
      title: "Improve Training Completion",
      description:
        "Completion rate is relatively low. Review learner support, trainer quality and course difficulty.",
    });
  } else {
    actions.push({
      priority: "LOW",
      title: "Maintain Completion Performance",
      description:
        "Training completion is at a healthy level. Continue monitoring learner outcomes.",
    });
  }

  // Placement recommendation
  if (jobSummary.placement_rate < 50) {
    actions.push({
      priority: "HIGH",
      title: "Strengthen Placement Alignment",
      description:
        "Placement rate indicates a need to improve job-skill matching and employer engagement.",
    });
  } else {
    actions.push({
      priority: "MEDIUM",
      title: "Expand Employer Connections",
      description:
        "Placement outcomes are positive. Increase employer participation to create more opportunities.",
    });
  }

  // Job opening recommendation
  if (
    jobSummary.total_openings >
    jobSummary.total_applications
  ) {
    actions.push({
      priority: "MEDIUM",
      title: "Increase Learner Job Readiness",
      description:
        "Job openings exceed applications. Promote relevant training and skill-development pathways.",
    });
  }

  // District participation
  const highestTraineeDistrict = [...districts]
    .sort(
      (a, b) =>
        (b.trainees ?? 0) -
        (a.trainees ?? 0)
    )[0];

  if (highestTraineeDistrict) {
    actions.push({
      priority: "MEDIUM",
      title: "Prioritize High-Participation Districts",
      description:
        `${highestTraineeDistrict.district_code ?? "Top district"} has the highest learner participation. Consider expanding training and employer partnerships there.`,
    });
  }

  const highPriorityCount = actions.filter(
    (action) => action.priority === "HIGH"
  ).length;

  const mediumPriorityCount = actions.filter(
    (action) => action.priority === "MEDIUM"
  ).length;

  const lowPriorityCount = actions.filter(
    (action) => action.priority === "LOW"
  ).length;

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.title}>
        Government Action Plan
      </Text>

      <Text style={styles.subtitle}>
        Data-driven recommendations for training,
        employment and workforce planning.
      </Text>

      {/* SUMMARY */}
      <View style={styles.summaryCard}>
        <Text style={styles.summaryTitle}>
          Decision Summary
        </Text>

        <View style={styles.summaryRow}>
          <SummaryBox
            label="High Priority"
            value={highPriorityCount}
          />

          <SummaryBox
            label="Medium"
            value={mediumPriorityCount}
          />

          <SummaryBox
            label="Low"
            value={lowPriorityCount}
          />
        </View>
      </View>

      {/* CURRENT INDICATORS */}
      <Text style={styles.sectionTitle}>
        Current Indicators
      </Text>

      <View style={styles.indicatorGrid}>
        <Indicator
          title="Training Capacity"
          value={training.total_capacity}
        />

        <Indicator
          title="Available Seats"
          value={training.available_capacity}
        />

        <Indicator
          title="Completion Rate"
          value={`${training.completion_rate}%`}
        />

        <Indicator
          title="Placement Rate"
          value={`${jobSummary.placement_rate}%`}
        />

        <Indicator
          title="Job Openings"
          value={jobSummary.total_openings}
        />

        <Indicator
          title="Placements"
          value={jobSummary.total_placements}
        />
      </View>

      {/* ACTION PLAN */}
      <Text style={styles.sectionTitle}>
        Recommended Government Actions
      </Text>

      {actions.map((action, index) => (
        <View
          key={`${action.title}-${index}`}
          style={styles.actionCard}
        >
          <View
            style={[
              styles.priorityBadge,
              action.priority === "HIGH" &&
                styles.highBadge,
              action.priority === "MEDIUM" &&
                styles.mediumBadge,
              action.priority === "LOW" &&
                styles.lowBadge,
            ]}
          >
            <Text style={styles.priorityText}>
              {action.priority}
            </Text>
          </View>

          <Text style={styles.actionTitle}>
            {action.title}
          </Text>

          <Text style={styles.actionDescription}>
            {action.description}
          </Text>
        </View>
      ))}

      {/* GOVERNMENT WORKFLOW */}
      <Text style={styles.sectionTitle}>
        Action Workflow
      </Text>

      <View style={styles.workflowCard}>
        <WorkflowStep
          number="1"
          title="Review Demand"
        />

        <WorkflowStep
          number="2"
          title="Identify Skill Gaps"
        />

        <WorkflowStep
          number="3"
          title="Adjust Training"
        />

        <WorkflowStep
          number="4"
          title="Connect Employers"
        />

        <WorkflowStep
          number="5"
          title="Monitor Outcomes"
        />
      </View>
    </ScrollView>
  );
}

function SummaryBox({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <View style={styles.summaryBox}>
      <Text style={styles.summaryValue}>
        {value}
      </Text>

      <Text style={styles.summaryLabel}>
        {label}
      </Text>
    </View>
  );
}

function Indicator({
  title,
  value,
}: {
  title: string;
  value: number | string;
}) {
  return (
    <View style={styles.indicatorCard}>
      <Text style={styles.indicatorTitle}>
        {title}
      </Text>

      <Text style={styles.indicatorValue}>
        {value}
      </Text>
    </View>
  );
}

function WorkflowStep({
  number,
  title,
}: {
  number: string;
  title: string;
}) {
  return (
    <View style={styles.workflowRow}>
      <View style={styles.numberCircle}>
        <Text style={styles.numberText}>
          {number}
        </Text>
      </View>

      <Text style={styles.workflowText}>
        {title}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    paddingBottom: 50,
    backgroundColor: "#F8FAFC",
  },

  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },

  loadingText: {
    marginTop: 12,
    color: "#64748B",
    fontSize: 15,
  },

  errorTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#B91C1C",
    textAlign: "center",
  },

  errorText: {
    marginTop: 8,
    color: "#64748B",
    textAlign: "center",
  },

  title: {
    marginTop: 20,
    fontSize: 28,
    fontWeight: "800",
    color: "#0F172A",
  },

  subtitle: {
    marginTop: 8,
    fontSize: 15,
    lineHeight: 22,
    color: "#64748B",
    marginBottom: 18,
  },

  summaryCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 16,
  },

  summaryTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0F172A",
    marginBottom: 14,
  },

  summaryRow: {
    flexDirection: "row",
    gap: 10,
  },

  summaryBox: {
    flex: 1,
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    padding: 12,
    alignItems: "center",
  },

  summaryValue: {
    fontSize: 24,
    fontWeight: "800",
    color: "#2563EB",
  },

  summaryLabel: {
    marginTop: 4,
    fontSize: 11,
    textAlign: "center",
    color: "#64748B",
  },

  sectionTitle: {
    marginTop: 22,
    marginBottom: 10,
    fontSize: 20,
    fontWeight: "800",
    color: "#0F172A",
  },

  indicatorGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },

  indicatorCard: {
    width: "48%",
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 15,
  },

  indicatorTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: "#64748B",
  },

  indicatorValue: {
    marginTop: 6,
    fontSize: 24,
    fontWeight: "800",
    color: "#0F766E",
  },

  actionCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 16,
    marginBottom: 10,
  },

  priorityBadge: {
    alignSelf: "flex-start",
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: "#E2E8F0",
    marginBottom: 10,
  },

  highBadge: {
    backgroundColor: "#FEE2E2",
  },

  mediumBadge: {
    backgroundColor: "#FEF3C7",
  },

  lowBadge: {
    backgroundColor: "#DCFCE7",
  },

  priorityText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#334155",
  },

  actionTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#0F172A",
  },

  actionDescription: {
    marginTop: 7,
    fontSize: 14,
    lineHeight: 20,
    color: "#475569",
  },

  workflowCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 16,
  },

  workflowRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
  },

  numberCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#DBEAFE",
    alignItems: "center",
    justifyContent: "center",
  },

  numberText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#2563EB",
  },

  workflowText: {
    marginLeft: 12,
    fontSize: 15,
    fontWeight: "700",
    color: "#334155",
  },
});