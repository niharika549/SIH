import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { useAuthedRequest } from "@/src/api/authed";

type DashboardStats = {
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
  statistics?: DashboardStats;
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

type Skill = {
  skill_id: string;
  skill_name: string;
  trainee_count?: number;
  training_count?: number;
  enrollment_count?: number;
};

type SkillResponse = {
  skills?: Skill[];
};

type SummaryData = {
  total_districts?: number;
  total_skills?: number;
  total_trainee_skill_records?: number;
};

type SummaryResponse = {
  summary?: SummaryData;
};

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

type JobPlacementAnalytics = {
  summary?: {
    total_jobs: number;
    total_openings: number;
    total_applications: number;
    total_placements: number;
    placement_rate: number;
  };

  districts?: {
    district_code: string;
    jobs: number;
    openings: number;
    placements: number;
  }[];

  careers?: {
    career_id: string;
    career_name: string;
    jobs: number;
    openings: number;
    placements: number;
  }[];
};

type CareerOption = {
  id: string;
  name: string;
};

export default function GovernmentReports() {
  const authed = useAuthedRequest();

  // -----------------------------
  // FILTER STATE
  // -----------------------------
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [selectedDistrict, setSelectedDistrict] = useState("");
  const [selectedCareerId, setSelectedCareerId] = useState("");

  const [appliedFilters, setAppliedFilters] = useState({
    dateFrom: "",
    dateTo: "",
    districtCode: "",
    careerId: "",
  });

  // -----------------------------
  // DASHBOARD
  // -----------------------------
  const dashboardQuery = useQuery({
    queryKey: ["government", "dashboard"],
    queryFn: () =>
      authed<DashboardResponse>("/government/dashboard"),
    retry: false,
  });

  // -----------------------------
  // DISTRICT ANALYTICS
  // -----------------------------
  const districtQuery = useQuery({
    queryKey: ["government", "district-analytics"],
    queryFn: () =>
      authed<DistrictResponse>(
        "/government/district-analytics"
      ),
    retry: false,
  });

  // -----------------------------
  // CAREERS
  // -----------------------------
  const careersQuery = useQuery({
    queryKey: ["catalog", "careers"],
    queryFn: () =>
      authed<CareerOption[]>("/catalog/careers"),
    retry: false,
  });

  // -----------------------------
  // SKILL ANALYTICS
  // -----------------------------
  const skillQuery = useQuery({
    queryKey: ["government", "skill-analytics"],
    queryFn: () =>
      authed<SkillResponse>(
        "/government/skill-analytics"
      ),
    retry: false,
  });

  // -----------------------------
  // ANALYTICS SUMMARY
  // -----------------------------
  const summaryQuery = useQuery({
    queryKey: ["government", "analytics-summary"],
    queryFn: () =>
      authed<SummaryResponse>(
        "/government/analytics-summary"
      ),
    retry: false,
  });

  // -----------------------------
  // TRAINING ANALYTICS
  // -----------------------------
  const trainingQuery = useQuery({
    queryKey: ["government", "training-analytics"],
    queryFn: () =>
      authed<TrainingAnalytics>(
        "/government/training-analytics"
      ),
    retry: false,
  });

  // -----------------------------
  // JOB + PLACEMENT ANALYTICS
  // -----------------------------
  const jobPlacementQuery = useQuery({
    queryKey: [
      "government",
      "job-placement-analytics",
      appliedFilters,
    ],

    queryFn: () => {
      const queryParts: string[] = [];

      if (appliedFilters.dateFrom) {
        queryParts.push(
          `date_from=${encodeURIComponent(
            appliedFilters.dateFrom
          )}`
        );
      }

      if (appliedFilters.dateTo) {
        queryParts.push(
          `date_to=${encodeURIComponent(
            appliedFilters.dateTo
          )}`
        );
      }

      if (appliedFilters.districtCode) {
        queryParts.push(
          `district_code=${encodeURIComponent(
            appliedFilters.districtCode
          )}`
        );
      }

      if (appliedFilters.careerId) {
        queryParts.push(
          `career_id=${encodeURIComponent(
            appliedFilters.careerId
          )}`
        );
      }

      const queryString =
        queryParts.length > 0
          ? `?${queryParts.join("&")}`
          : "";

      return authed<JobPlacementAnalytics>(
        `/government/job-placement-analytics${queryString}`
      );
    },

    retry: false,
  });

  // -----------------------------
  // LOADING
  // -----------------------------
  const loading =
    dashboardQuery.isPending ||
    districtQuery.isPending ||
    careersQuery.isPending ||
    skillQuery.isPending ||
    summaryQuery.isPending ||
    trainingQuery.isPending ||
    jobPlacementQuery.isPending;

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />

        <Text style={styles.loadingText}>
          Generating government report...
        </Text>
      </View>
    );
  }

  // -----------------------------
  // ERROR
  // -----------------------------
  const hasError =
    dashboardQuery.isError ||
    districtQuery.isError ||
    careersQuery.isError ||
    skillQuery.isError ||
    summaryQuery.isError ||
    trainingQuery.isError ||
    jobPlacementQuery.isError;

  if (hasError) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorTitle}>
          Unable to load report
        </Text>

        <Text style={styles.errorText}>
          Please check the backend connection and try again.
        </Text>
      </View>
    );
  }

  // -----------------------------
  // SAFE DEFAULT DATA
  // -----------------------------
  const statistics =
    dashboardQuery.data?.statistics ?? {
      total_users: 0,
      total_trainees: 0,
      total_trainers: 0,
      total_employers: 0,
      total_trainings: 0,
      total_enrollments: 0,
      active_enrollments: 0,
      completed_enrollments: 0,
    };

  const districts =
    districtQuery.data?.districts ?? [];

  const skills =
    skillQuery.data?.skills ?? [];

  const careers =
    careersQuery.data ?? [];

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

  const summary =
    summaryQuery.data?.summary ??
    (summaryQuery.data as unknown as SummaryData) ??
    {};

  const jobPlacement =
    jobPlacementQuery.data ?? {
      summary: {
        total_jobs: 0,
        total_openings: 0,
        total_applications: 0,
        total_placements: 0,
        placement_rate: 0,
      },
      districts: [],
      careers: [],
    };

  const jobSummary =
    jobPlacement.summary ?? {
      total_jobs: 0,
      total_openings: 0,
      total_applications: 0,
      total_placements: 0,
      placement_rate: 0,
    };

  // -----------------------------
  // TOP SKILLS
  // -----------------------------
  const topSkills = [...skills]
    .sort(
      (a, b) =>
        (b.trainee_count ?? 0) -
        (a.trainee_count ?? 0)
    )
    .slice(0, 5);

  // -----------------------------
  // DISTRICT FILTER OPTIONS
  // -----------------------------
  const availableDistricts = Array.from(
    new Set(
      districts
        .map((district) => district.district_code)
        .filter(
          (value): value is string =>
            Boolean(value)
        )
    )
  );

  // -----------------------------
  // REPORT UI
  // -----------------------------
  return (
    <ScrollView
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
    >
      {/* TITLE */}
      <Text style={styles.title}>
        Government Reports
      </Text>

      <Text style={styles.subtitle}>
        Workforce, district, skill, training, job and
        placement summary
      </Text>

      {/* REPORT FILTERS */}
      <Text style={styles.sectionTitle}>
        Report Filters
      </Text>

      <View style={styles.filterCard}>
        <Text style={styles.filterLabel}>
          Date From
        </Text>

        <TextInput
          value={dateFrom}
          onChangeText={setDateFrom}
          placeholder="YYYY-MM-DD"
          placeholderTextColor="#94A3B8"
          style={styles.filterInput}
          autoCapitalize="none"
        />

        <Text style={styles.filterLabel}>
          Date To
        </Text>

        <TextInput
          value={dateTo}
          onChangeText={setDateTo}
          placeholder="YYYY-MM-DD"
          placeholderTextColor="#94A3B8"
          style={styles.filterInput}
          autoCapitalize="none"
        />

        <Text style={styles.filterLabel}>
          District
        </Text>

        <View style={styles.chipRow}>
          <FilterChip
            title="All"
            selected={selectedDistrict === ""}
            onPress={() =>
              setSelectedDistrict("")
            }
          />

          {availableDistricts.map(
            (district) => (
              <FilterChip
                key={district}
                title={district}
                selected={
                  selectedDistrict === district
                }
                onPress={() =>
                  setSelectedDistrict(district)
                }
              />
            )
          )}
        </View>

        <Text style={styles.filterLabel}>
          Career
        </Text>

        <View style={styles.chipRow}>
          <FilterChip
            title="All"
            selected={selectedCareerId === ""}
            onPress={() =>
              setSelectedCareerId("")
            }
          />

          {careers.map((career) => (
            <FilterChip
              key={career.id}
              title={career.name}
              selected={
                selectedCareerId === career.id
              }
              onPress={() =>
                setSelectedCareerId(career.id)
              }
            />
          ))}
        </View>

        <View style={styles.filterButtons}>
          <Pressable
            style={styles.applyButton}
            onPress={() => {
              setAppliedFilters({
                dateFrom: dateFrom.trim(),
                dateTo: dateTo.trim(),
                districtCode:
                  selectedDistrict,
                careerId:
                  selectedCareerId,
              });
            }}
          >
            <Text style={styles.applyButtonText}>
              Apply Filters
            </Text>
          </Pressable>

          <Pressable
            style={styles.clearButton}
            onPress={() => {
              setDateFrom("");
              setDateTo("");
              setSelectedDistrict("");
              setSelectedCareerId("");

              setAppliedFilters({
                dateFrom: "",
                dateTo: "",
                districtCode: "",
                careerId: "",
              });
            }}
          >
            <Text style={styles.clearButtonText}>
              Clear
            </Text>
          </Pressable>
        </View>

        <Text style={styles.filterHint}>
          Date format: YYYY-MM-DD
        </Text>
      </View>

      {/* PLATFORM OVERVIEW */}
      <Text style={styles.sectionTitle}>
        Platform Overview
      </Text>

      <View style={styles.grid}>
        <ReportCard
          title="Total Users"
          value={statistics.total_users}
        />

        <ReportCard
          title="Trainees"
          value={statistics.total_trainees}
        />

        <ReportCard
          title="Trainers"
          value={statistics.total_trainers}
        />

        <ReportCard
          title="Employers"
          value={statistics.total_employers}
        />

        <ReportCard
          title="Trainings"
          value={statistics.total_trainings}
        />

        <ReportCard
          title="Enrollments"
          value={statistics.total_enrollments}
        />

        <ReportCard
          title="Active"
          value={statistics.active_enrollments}
        />

        <ReportCard
          title="Completed"
          value={
            statistics.completed_enrollments
          }
        />
      </View>

      {/* TRAINING ANALYTICS */}
      <Text style={styles.sectionTitle}>
        Training Analytics
      </Text>

      <View style={styles.grid}>
        <ReportCard
          title="Training Capacity"
          value={training.total_capacity}
        />

        <ReportCard
          title="Used Capacity"
          value={training.used_capacity}
        />

        <ReportCard
          title="Available Seats"
          value={
            training.available_capacity
          }
        />

        <ReportCard
          title="Total Enrollments"
          value={
            training.total_enrollments
          }
        />
      </View>

      {/* CAPACITY UTILIZATION */}
      <View style={styles.graphCard}>
        <View style={styles.graphHeader}>
          <Text style={styles.graphTitle}>
            Capacity Utilization
          </Text>

          <Text style={styles.graphValue}>
            {training.utilization_rate}%
          </Text>
        </View>

        <View style={styles.progressBackground}>
          <View
            style={[
              styles.utilizationBar,
              {
                width: `${Math.min(
                  Math.max(
                    training.utilization_rate,
                    0
                  ),
                  100
                )}%` as `${number}%`,
              },
            ]}
          />
        </View>

        <Text style={styles.graphHint}>
          {training.used_capacity} used out of{" "}
          {training.total_capacity} available seats
        </Text>
      </View>

      {/* COMPLETION RATE */}
      <View style={styles.graphCard}>
        <View style={styles.graphHeader}>
          <Text style={styles.graphTitle}>
            Training Completion Rate
          </Text>

          <Text style={styles.graphValue}>
            {training.completion_rate}%
          </Text>
        </View>

        <View style={styles.progressBackground}>
          <View
            style={[
              styles.completionBar,
              {
                width: `${Math.min(
                  Math.max(
                    training.completion_rate,
                    0
                  ),
                  100
                )}%` as `${number}%`,
              },
            ]}
          />
        </View>

        <Text style={styles.graphHint}>
          {training.completed_enrollments} completed
          out of {training.total_enrollments} enrollments
        </Text>
      </View>

      {/* JOB & PLACEMENT ANALYTICS */}
      <Text style={styles.sectionTitle}>
        Job & Placement Analytics
      </Text>

      <View style={styles.grid}>
        <ReportCard
          title="Total Jobs"
          value={jobSummary.total_jobs}
        />

        <ReportCard
          title="Job Openings"
          value={jobSummary.total_openings}
        />

        <ReportCard
          title="Applications"
          value={jobSummary.total_applications}
        />

        <ReportCard
          title="Placements"
          value={jobSummary.total_placements}
        />

        <ReportCard
          title="Placement Rate"
          value={`${jobSummary.placement_rate}%`}
        />
      </View>

      {/* PLACEMENT RATE GRAPH */}
      <View style={styles.graphCard}>
        <View style={styles.graphHeader}>
          <Text style={styles.graphTitle}>
            Placement Rate
          </Text>

          <Text style={styles.graphValue}>
            {jobSummary.placement_rate}%
          </Text>
        </View>

        <View style={styles.progressBackground}>
          <View
            style={[
              styles.placementBar,
              {
                width: `${Math.min(
                  Math.max(
                    jobSummary.placement_rate,
                    0
                  ),
                  100
                )}%` as `${number}%`,
              },
            ]}
          />
        </View>

        <Text style={styles.graphHint}>
          {jobSummary.total_placements} placements from{" "}
          {jobSummary.total_applications} applications
        </Text>
      </View>

      {/* DISTRICT JOB SUMMARY */}
      <Text style={styles.sectionTitle}>
        District Job Summary
      </Text>

      {!jobPlacement.districts ||
      jobPlacement.districts.length === 0 ? (
        <View style={styles.card}>
          <Text style={styles.muted}>
            No district job data available.
          </Text>
        </View>
      ) : (
        jobPlacement.districts.map(
          (district) => (
            <View
              key={district.district_code}
              style={styles.card}
            >
              <Text style={styles.cardTitle}>
                {district.district_code}
              </Text>

              <Text style={styles.rowText}>
                Jobs: {district.jobs}
              </Text>

              <Text style={styles.rowText}>
                Openings: {district.openings}
              </Text>

              <Text style={styles.rowText}>
                Placements:{" "}
                {district.placements}
              </Text>
            </View>
          )
        )
      )}

      {/* CAREER JOB SUMMARY */}
      <Text style={styles.sectionTitle}>
        Career Job Summary
      </Text>

      {!jobPlacement.careers ||
      jobPlacement.careers.length === 0 ? (
        <View style={styles.card}>
          <Text style={styles.muted}>
            No career job data available.
          </Text>
        </View>
      ) : (
        jobPlacement.careers.map(
          (career) => (
            <View
              key={career.career_id}
              style={styles.card}
            >
              <Text style={styles.cardTitle}>
                {career.career_name}
              </Text>

              <Text style={styles.rowText}>
                Jobs: {career.jobs}
              </Text>

              <Text style={styles.rowText}>
                Openings: {career.openings}
              </Text>

              <Text style={styles.rowText}>
                Placements:{" "}
                {career.placements}
              </Text>
            </View>
          )
        )
      )}

      {/* ANALYTICS SUMMARY */}
      <Text style={styles.sectionTitle}>
        Analytics Summary
      </Text>

      <View style={styles.card}>
        <Text style={styles.rowText}>
          Districts tracked:{" "}
          {summary.total_districts ??
            districts.length}
        </Text>

        <Text style={styles.rowText}>
          Skills tracked:{" "}
          {summary.total_skills ??
            skills.length}
        </Text>

        <Text style={styles.rowText}>
          Trainee skill records:{" "}
          {summary.total_trainee_skill_records ??
            0}
        </Text>
      </View>

      {/* DISTRICT SUMMARY */}
      <Text style={styles.sectionTitle}>
        District Summary
      </Text>

      {districts.length === 0 ? (
        <View style={styles.card}>
          <Text style={styles.muted}>
            No district report data available.
          </Text>
        </View>
      ) : (
        districts.map(
          (district, index) => (
            <View
              key={`${district.state_code ?? "state"}-${
                district.district_code ?? index
              }`}
              style={styles.card}
            >
              <Text style={styles.cardTitle}>
                {district.district_code ??
                  `District ${index + 1}`}
              </Text>

              <Text style={styles.muted}>
                State:{" "}
                {district.state_code ?? "N/A"}
              </Text>

              <Text style={styles.rowText}>
                Trainees:{" "}
                {district.trainees ?? 0}
              </Text>

              <Text style={styles.rowText}>
                Trainers:{" "}
                {district.trainers ?? 0}
              </Text>

              <Text style={styles.rowText}>
                Employers:{" "}
                {district.employers ?? 0}
              </Text>

              <Text style={styles.rowText}>
                Trainings:{" "}
                {district.trainings ?? 0}
              </Text>
            </View>
          )
        )
      )}

      {/* TOP SKILLS */}
      <Text style={styles.sectionTitle}>
        Top Skills by Trainee Count
      </Text>

      {topSkills.length === 0 ? (
        <View style={styles.card}>
          <Text style={styles.muted}>
            No skill report data available.
          </Text>
        </View>
      ) : (
        topSkills.map(
          (skill) => (
            <View
              key={skill.skill_id}
              style={styles.card}
            >
              <Text style={styles.cardTitle}>
                {skill.skill_name}
              </Text>

              <Text style={styles.rowText}>
                Trainees:{" "}
                {skill.trainee_count ?? 0}
              </Text>

              <Text style={styles.rowText}>
                Trainings:{" "}
                {skill.training_count ?? 0}
              </Text>

              <Text style={styles.rowText}>
                Enrollments:{" "}
                {skill.enrollment_count ?? 0}
              </Text>
            </View>
          )
        )
      )}
    </ScrollView>
  );
}

// -----------------------------
// FILTER CHIP
// -----------------------------
function FilterChip({
  title,
  selected,
  onPress,
}: {
  title: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.filterChip,
        selected && styles.filterChipSelected,
      ]}
    >
      <Text
        style={[
          styles.filterChipText,
          selected &&
            styles.filterChipTextSelected,
        ]}
      >
        {title}
      </Text>
    </Pressable>
  );
}

// -----------------------------
// REPORT CARD
// -----------------------------
function ReportCard({
  title,
  value,
}: {
  title: string;
  value: number | string;
}) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statTitle}>
        {title}
      </Text>

      <Text style={styles.statValue}>
        {value}
      </Text>
    </View>
  );
}

// -----------------------------
// STYLES
// -----------------------------
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
    fontSize: 15,
    color: "#64748B",
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

  sectionTitle: {
    marginTop: 18,
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

  statCard: {
    width: "48%",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 16,
  },

  statTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#64748B",
  },

  statValue: {
    marginTop: 6,
    fontSize: 28,
    fontWeight: "800",
    color: "#0F766E",
  },

  // -----------------------------
  // FILTER STYLES
  // -----------------------------

  filterCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 16,
    marginBottom: 10,
  },

  filterLabel: {
    fontSize: 13,
    fontWeight: "800",
    color: "#334155",
    marginBottom: 6,
    marginTop: 8,
  },

  filterInput: {
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: "#0F172A",
    backgroundColor: "#F8FAFC",
  },

  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },

  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    backgroundColor: "#FFFFFF",
  },

  filterChipSelected: {
    backgroundColor: "#0F766E",
    borderColor: "#0F766E",
  },

  filterChipText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#475569",
  },

  filterChipTextSelected: {
    color: "#FFFFFF",
  },

  filterButtons: {
    flexDirection: "row",
    gap: 10,
    marginTop: 16,
  },

  applyButton: {
    flex: 1,
    backgroundColor: "#0F766E",
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
  },

  applyButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
  },

  clearButton: {
    flex: 1,
    backgroundColor: "#E2E8F0",
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
  },

  clearButtonText: {
    color: "#334155",
    fontSize: 14,
    fontWeight: "800",
  },

  filterHint: {
    marginTop: 8,
    fontSize: 11,
    color: "#64748B",
  },

  // -----------------------------
  // GRAPH STYLES
  // -----------------------------

  graphCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 16,
    marginTop: 10,
  },

  graphHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  graphTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: "800",
    color: "#0F172A",
  },

  graphValue: {
    fontSize: 22,
    fontWeight: "800",
    color: "#2563EB",
  },

  progressBackground: {
    height: 18,
    backgroundColor: "#E2E8F0",
    borderRadius: 10,
    overflow: "hidden",
    marginTop: 14,
  },

  utilizationBar: {
    height: "100%",
    backgroundColor: "#2563EB",
    borderRadius: 10,
  },

  completionBar: {
    height: "100%",
    backgroundColor: "#16A34A",
    borderRadius: 10,
  },

  placementBar: {
    height: "100%",
    backgroundColor: "#0F766E",
    borderRadius: 10,
  },

  graphHint: {
    marginTop: 8,
    fontSize: 12,
    color: "#64748B",
  },

  // -----------------------------
  // GENERAL CARDS
  // -----------------------------

  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 16,
    marginBottom: 10,
  },

  cardTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#0F172A",
    marginBottom: 5,
  },

  rowText: {
    marginTop: 5,
    fontSize: 14,
    color: "#334155",
  },

  muted: {
    fontSize: 14,
    color: "#64748B",
  },
});