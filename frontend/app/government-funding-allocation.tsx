import { useQuery } from "@tanstack/react-query";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { useAuthedRequest } from "@/src/api/authed";

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

type JobDistrict = {
  district_code: string;
  jobs: number;
  openings: number;
  placements: number;
};

type JobPlacementAnalytics = {
  summary?: {
    total_jobs: number;
    total_openings: number;
    total_applications: number;
    total_placements: number;
    placement_rate: number;
  };
  districts?: JobDistrict[];
};

type AllocationRecommendation = {
  district: string;
  priority: "HIGH" | "MEDIUM" | "LOW";
  trainees: number;
  trainers: number;
  trainings: number;
  jobs: number;
  openings: number;
  placements: number;
  recommendedSeats: number;
  recommendedTrainers: number;
  recommendedEquipment: number;
  estimatedAllocation: number;
};

export default function GovernmentFundingAllocation() {
  const authed = useAuthedRequest();

  const districtQuery = useQuery({
    queryKey: ["government", "district-analytics"],
    queryFn: () =>
      authed<DistrictResponse>(
        "/government/district-analytics"
      ),
    retry: false,
  });

  const jobQuery = useQuery({
    queryKey: [
      "government",
      "job-placement-analytics",
    ],
    queryFn: () =>
      authed<JobPlacementAnalytics>(
        "/government/job-placement-analytics"
      ),
    retry: false,
  });

  const loading =
    districtQuery.isPending ||
    jobQuery.isPending;

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />

        <Text style={styles.loadingText}>
          Preparing funding recommendations...
        </Text>
      </View>
    );
  }

  if (
    districtQuery.isError ||
    jobQuery.isError
  ) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorTitle}>
          Unable to load funding recommendations
        </Text>

        <Text style={styles.errorText}>
          Please check the backend connection.
        </Text>
      </View>
    );
  }

  const districts =
    districtQuery.data?.districts ?? [];

  const jobDistricts =
    jobQuery.data?.districts ?? [];

  const jobMap = new Map(
    jobDistricts.map((item) => [
      item.district_code,
      item,
    ])
  );

  const recommendations: AllocationRecommendation[] =
    districts.map((district) => {
      const districtCode =
        district.district_code ?? "UNKNOWN";

      const jobData =
        jobMap.get(districtCode);

      const trainees =
        district.trainees ?? 0;

      const trainers =
        district.trainers ?? 0;

      const trainings =
        district.trainings ?? 0;

      const jobs =
        jobData?.jobs ?? 0;

      const openings =
        jobData?.openings ?? 0;

      const placements =
        jobData?.placements ?? 0;

      const supplyDemandGap = Math.max(
        openings - trainees,
        0
      );

      const recommendedSeats = Math.min(
        Math.max(
          Math.ceil(supplyDemandGap * 0.5),
          20
        ),
        500
      );

      const recommendedTrainers = Math.max(
        Math.ceil(recommendedSeats / 40),
        1
      );

      const recommendedEquipment = Math.max(
        Math.ceil(recommendedSeats / 50),
        1
      );

      const pressureScore =
        openings +
        Math.max(jobs * 5, 0) -
        trainees * 0.5 -
        trainers * 10;

      let priority:
        | "HIGH"
        | "MEDIUM"
        | "LOW";

      if (pressureScore >= 500) {
        priority = "HIGH";
      } else if (pressureScore >= 150) {
        priority = "MEDIUM";
      } else {
        priority = "LOW";
      }

      // Prototype allocation estimate:
      // ₹2,000 per additional seat
      // ₹50,000 per additional trainer
      // ₹25,000 per equipment unit
      const estimatedAllocation =
        recommendedSeats * 2000 +
        recommendedTrainers * 50000 +
        recommendedEquipment * 25000;

      return {
        district: districtCode,
        priority,
        trainees,
        trainers,
        trainings,
        jobs,
        openings,
        placements,
        recommendedSeats,
        recommendedTrainers,
        recommendedEquipment,
        estimatedAllocation,
      };
    });

  const sortedRecommendations = [
    ...recommendations,
  ].sort((a, b) => {
    const priorityValue = {
      HIGH: 3,
      MEDIUM: 2,
      LOW: 1,
    };

    return (
      priorityValue[b.priority] -
        priorityValue[a.priority] ||
      b.openings - a.openings
    );
  });

  const totalSeats = recommendations.reduce(
    (sum, item) =>
      sum + item.recommendedSeats,
    0
  );

  const totalTrainers = recommendations.reduce(
    (sum, item) =>
      sum + item.recommendedTrainers,
    0
  );

  const totalEquipment =
    recommendations.reduce(
      (sum, item) =>
        sum + item.recommendedEquipment,
      0
    );

  const totalAllocation =
    recommendations.reduce(
      (sum, item) =>
        sum + item.estimatedAllocation,
      0
    );

  const highPriorityCount =
    recommendations.filter(
      (item) => item.priority === "HIGH"
    ).length;

  const formatIndianCurrency = (
    amount: number
  ) => {
    return `₹${amount.toLocaleString("en-IN")}`;
  };

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.title}>
        Funding & Resource Allocation
      </Text>

      <Text style={styles.subtitle}>
        District-wise recommendations based on job
        demand, learner supply and workforce pressure.
      </Text>

      <View style={styles.infoCard}>
        <Text style={styles.infoTitle}>
          Prototype Allocation Model
        </Text>

        <Text style={styles.infoText}>
          Estimates are demonstration values for the
          SIH prototype. Actual government budgets can
          use approved district costs and funding rules.
        </Text>
      </View>

      <Text style={styles.sectionTitle}>
        Allocation Overview
      </Text>

      <View style={styles.grid}>
        <SummaryCard
          title="Priority Districts"
          value={highPriorityCount}
        />

        <SummaryCard
          title="Extra Seats"
          value={totalSeats}
        />

        <SummaryCard
          title="Trainers Needed"
          value={totalTrainers}
        />

        <SummaryCard
          title="Equipment Units"
          value={totalEquipment}
        />
      </View>

      <View style={styles.totalCard}>
        <Text style={styles.totalLabel}>
          Recommended Prototype Allocation
        </Text>

        <Text style={styles.totalValue}>
          {formatIndianCurrency(
            totalAllocation
          )}
        </Text>
      </View>

      <Text style={styles.sectionTitle}>
        District Recommendations
      </Text>

      {sortedRecommendations.length === 0 ? (
        <View style={styles.card}>
          <Text style={styles.muted}>
            No district data available.
          </Text>
        </View>
      ) : (
        sortedRecommendations.map(
          (item) => (
            <View
              key={item.district}
              style={styles.card}
            >
              <View
                style={
                  styles.districtHeader
                }
              >
                <Text style={styles.cardTitle}>
                  {item.district}
                </Text>

                <View
                  style={[
                    styles.priorityBadge,
                    item.priority === "HIGH" &&
                      styles.highBadge,
                    item.priority === "MEDIUM" &&
                      styles.mediumBadge,
                    item.priority === "LOW" &&
                      styles.lowBadge,
                  ]}
                >
                  <Text
                    style={
                      styles.priorityText
                    }
                  >
                    {item.priority}
                  </Text>
                </View>
              </View>

              <Text style={styles.rowText}>
                Learners: {item.trainees}
              </Text>

              <Text style={styles.rowText}>
                Trainers: {item.trainers}
              </Text>

              <Text style={styles.rowText}>
                Trainings: {item.trainings}
              </Text>

              <Text style={styles.rowText}>
                Jobs: {item.jobs}
              </Text>

              <Text style={styles.rowText}>
                Job Openings: {item.openings}
              </Text>

              <Text style={styles.rowText}>
                Placements: {item.placements}
              </Text>

              <View
                style={styles.recommendationBox}
              >
                <Text
                  style={
                    styles.recommendationTitle
                  }
                >
                  Recommended Resources
                </Text>

                <Text
                  style={styles.resourceText}
                >
                  +{item.recommendedSeats} training
                  seats
                </Text>

                <Text
                  style={styles.resourceText}
                >
                  +{item.recommendedTrainers} trainers
                </Text>

                <Text
                  style={styles.resourceText}
                >
                  +{item.recommendedEquipment} equipment
                  units
                </Text>

                <Text
                  style={styles.allocationText}
                >
                  Estimated:
                  {" "}
                  {formatIndianCurrency(
                    item.estimatedAllocation
                  )}
                </Text>
              </View>
            </View>
          )
        )
      )}

      <Text style={styles.sectionTitle}>
        Government Decision Flow
      </Text>

      <View style={styles.workflowCard}>
        <WorkflowStep
          number="1"
          title="Identify high-demand districts"
        />

        <WorkflowStep
          number="2"
          title="Compare learner supply with job demand"
        />

        <WorkflowStep
          number="3"
          title="Identify seat and trainer shortages"
        />

        <WorkflowStep
          number="4"
          title="Allocate training resources"
        />

        <WorkflowStep
          number="5"
          title="Monitor placement outcomes"
        />
      </View>
    </ScrollView>
  );
}

function SummaryCard({
  title,
  value,
}: {
  title: string;
  value: number | string;
}) {
  return (
    <View style={styles.summaryCard}>
      <Text style={styles.summaryTitle}>
        {title}
      </Text>

      <Text style={styles.summaryValue}>
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
    fontSize: 14,
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
    marginBottom: 18,
    fontSize: 15,
    lineHeight: 22,
    color: "#64748B",
  },

  infoCard: {
    backgroundColor: "#DBEAFE",
    borderRadius: 16,
    padding: 16,
    marginBottom: 8,
  },

  infoTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#1D4ED8",
  },

  infoText: {
    marginTop: 6,
    fontSize: 13,
    lineHeight: 19,
    color: "#1E40AF",
  },

  sectionTitle: {
    marginTop: 20,
    marginBottom: 10,
    fontSize: 20,
    fontWeight: "800",
    color: "#0F172A",
  },

  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },

  summaryCard: {
    width: "48%",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 15,
  },

  summaryTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: "#64748B",
  },

  summaryValue: {
    marginTop: 6,
    fontSize: 24,
    fontWeight: "800",
    color: "#2563EB",
  },

  totalCard: {
    backgroundColor: "#0F766E",
    borderRadius: 18,
    padding: 18,
    marginTop: 12,
  },

  totalLabel: {
    color: "#D1FAE5",
    fontSize: 13,
    fontWeight: "700",
  },

  totalValue: {
    marginTop: 6,
    color: "#FFFFFF",
    fontSize: 30,
    fontWeight: "800",
  },

  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 16,
    marginBottom: 10,
  },

  districtHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  cardTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: "800",
    color: "#0F172A",
  },

  priorityBadge: {
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: "#E2E8F0",
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

  rowText: {
    marginTop: 6,
    fontSize: 14,
    color: "#334155",
  },

  recommendationBox: {
    marginTop: 14,
    padding: 14,
    borderRadius: 12,
    backgroundColor: "#F8FAFC",
  },

  recommendationTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#0F172A",
    marginBottom: 6,
  },

  resourceText: {
    marginTop: 5,
    fontSize: 14,
    color: "#0F766E",
    fontWeight: "700",
  },

  allocationText: {
    marginTop: 10,
    fontSize: 15,
    fontWeight: "800",
    color: "#2563EB",
  },

  muted: {
    fontSize: 14,
    color: "#64748B",
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
    flex: 1,
    fontSize: 14,
    fontWeight: "700",
    color: "#334155",
  },
});