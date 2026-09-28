import { useQuery } from "@tanstack/react-query";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { useAuthedRequest } from "@/src/api/authed";

type SkillItem = {
  skill_id: string;
  skill_name: string;
  domain: string;
  trainee_count: number;
  training_count: number;
  enrollment_count: number;
};

type SkillAnalyticsResponse = {
  skills: SkillItem[];
};

type GapSkill = {
  skill_id: string;
  skill_name: string;
  domain?: string;
  required_count: number;
  missing_count: number;
  available_count: number;
};

type DistrictGap = {
  state_code: string;
  district_code: string;
  skills: GapSkill[];
};

type CareerGap = {
  career_id: string;
  career_name: string;
  skills: GapSkill[];
};

type SkillGapResponse = {
  overall: GapSkill[];
  most_missing: GapSkill[];
  most_available: GapSkill[];
  districts: DistrictGap[];
  careers: CareerGap[];
};

type AggregateItem = {
  name: string;
  value: number;
};

function BarGraph({
  items,
  emptyText,
}: {
  items: AggregateItem[];
  emptyText: string;
}) {
  if (items.length === 0) {
    return (
      <View style={styles.emptyBox}>
        <Text style={styles.emptyText}>{emptyText}</Text>
      </View>
    );
  }

  const maxValue = Math.max(
    ...items.map((item) => item.value),
    1
  );

  return (
    <View>
      {items.map((item, index) => {
        const width =
          item.value === 0
            ? "2%"
            : `${Math.max(
                5,
                (item.value / maxValue) * 100
              )}%`;

        return (
          <View
            key={`${item.name}-${index}`}
            style={styles.graphRow}
          >
            <View style={styles.graphLabelBox}>
              <Text
                style={styles.graphLabel}
                numberOfLines={2}
              >
                {item.name}
              </Text>
            </View>

            <View style={styles.barArea}>
              <View style={styles.barBackground}>
                <View
                  style={[
                    styles.bar,
                    { width: width as `${number}%` },
                  ]}
                />
              </View>

              <Text style={styles.barValue}>
                {item.value}
              </Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}

function ComparisonGraph({
  items,
}: {
  items: GapSkill[];
}) {
  if (items.length === 0) {
    return (
      <View style={styles.emptyBox}>
        <Text style={styles.emptyText}>
          No comparison data available.
        </Text>
      </View>
    );
  }

  const maxValue = Math.max(
    ...items.flatMap((item) => [
      item.missing_count,
      item.available_count,
    ]),
    1
  );

  return (
    <View>
      {items.map((skill) => {
        const missingWidth =
          skill.missing_count === 0
            ? "2%"
            : `${Math.max(
                5,
                (skill.missing_count / maxValue) * 100
              )}%`;

        const availableWidth =
          skill.available_count === 0
            ? "2%"
            : `${Math.max(
                5,
                (skill.available_count / maxValue) * 100
              )}%`;

        return (
          <View
            key={skill.skill_id}
            style={styles.comparisonCard}
          >
            <Text style={styles.comparisonTitle}>
              {skill.skill_name}
            </Text>

            <View style={styles.legendRow}>
              <View style={styles.legendItem}>
                <View
                  style={[
                    styles.legendDot,
                    styles.missingDot,
                  ]}
                />
                <Text style={styles.legendText}>
                  Missing
                </Text>
              </View>

              <View style={styles.legendItem}>
                <View
                  style={[
                    styles.legendDot,
                    styles.availableDot,
                  ]}
                />
                <Text style={styles.legendText}>
                  Available
                </Text>
              </View>
            </View>

            <Text style={styles.smallBarLabel}>
              Missing: {skill.missing_count}
            </Text>

            <View style={styles.barBackground}>
              <View
                style={[
                  styles.missingBar,
                  { width: missingWidth as `${number}%` },
                ]}
              />
            </View>

            <Text style={styles.smallBarLabel}>
              Available: {skill.available_count}
            </Text>

            <View style={styles.barBackground}>
              <View
                style={[
                  styles.availableBar,
                  { width: availableWidth as `${number}%` },
                ]}
              />
            </View>
          </View>
        );
      })}
    </View>
  );
}

export default function GovernmentSkillAnalytics() {
  const authed = useAuthedRequest();

  const skillQuery = useQuery({
    queryKey: [
      "government",
      "skill-analytics",
    ],
    queryFn: () =>
      authed<SkillAnalyticsResponse>(
        "/government/skill-analytics"
      ),
    retry: false,
  });

  const gapQuery = useQuery({
    queryKey: [
      "government",
      "skill-gaps",
    ],
    queryFn: () =>
      authed<SkillGapResponse>(
        "/government/skill-gaps"
      ),
    retry: false,
  });

  if (
    skillQuery.isPending ||
    gapQuery.isPending
  ) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />

        <Text style={styles.loadingText}>
          Loading skill analytics...
        </Text>
      </View>
    );
  }

  if (
    skillQuery.isError ||
    gapQuery.isError
  ) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorTitle}>
          Unable to load Skill Analytics
        </Text>

        <Text style={styles.errorText}>
          Please check the backend connection
          and try again.
        </Text>
      </View>
    );
  }

  const skills =
    skillQuery.data?.skills ?? [];

  const gapData =
    gapQuery.data;

  const overall =
    gapData?.overall ?? [];

  const mostMissing =
    gapData?.most_missing ?? [];

  /*
   * Overall summary
   */
  const totalRequired = overall.reduce(
    (sum, skill) =>
      sum + skill.required_count,
    0
  );

  const totalMissing = overall.reduce(
    (sum, skill) =>
      sum + skill.missing_count,
    0
  );

  const totalAvailable =
    overall.reduce(
      (sum, skill) =>
        sum + skill.available_count,
      0
    );

  /*
   * Top missing skills
   */
  const topMissingSkills =
    [...mostMissing]
      .sort(
        (a, b) =>
          b.missing_count -
          a.missing_count
      )
      .slice(0, 5)
      .map((skill) => ({
        name: skill.skill_name,
        value: skill.missing_count,
      }));

  /*
   * District-wise total gaps
   */
  const districtGapData: AggregateItem[] =
    (gapData?.districts ?? [])
      .map((district) => ({
        name:
          district.district_code,
        value: district.skills.reduce(
          (sum, skill) =>
            sum + skill.missing_count,
          0
        ),
      }))
      .sort(
        (a, b) => b.value - a.value
      );

  /*
   * Career-wise total gaps
   */
  const careerGapData: AggregateItem[] =
    (gapData?.careers ?? [])
      .map((career) => ({
        name: career.career_name,
        value: career.skills.reduce(
          (sum, skill) =>
            sum + skill.missing_count,
          0
        ),
      }))
      .sort(
        (a, b) => b.value - a.value
      );

  /*
   * Top skills for availability vs gap
   */
  const comparisonSkills =
    [...overall]
      .sort(
        (a, b) =>
          b.missing_count -
          a.missing_count
      )
      .slice(0, 5);

  return (
    <ScrollView
      contentContainerStyle={
        styles.container
      }
    >
      <Text style={styles.title}>
        Skill Analytics
      </Text>

      <Text style={styles.subtitle}>
        Government view of workforce skill
        gaps and regional demand.
      </Text>

      {/* SUMMARY */}

      <Text style={styles.sectionTitle}>
        Skill Gap Summary
      </Text>

      <View style={styles.summaryGrid}>
        <View
          style={[
            styles.summaryBox,
            styles.blueBox,
          ]}
        >
          <Text style={styles.summaryNumber}>
            {skills.length}
          </Text>

          <Text style={styles.summaryLabel}>
            Skills Tracked
          </Text>
        </View>

        <View
          style={[
            styles.summaryBox,
            styles.orangeBox,
          ]}
        >
          <Text style={styles.summaryNumber}>
            {totalRequired}
          </Text>

          <Text style={styles.summaryLabel}>
            Required
          </Text>
        </View>

        <View
          style={[
            styles.summaryBox,
            styles.redBox,
          ]}
        >
          <Text
            style={[
              styles.summaryNumber,
              styles.redNumber,
            ]}
          >
            {totalMissing}
          </Text>

          <Text style={styles.summaryLabel}>
            Skill Gaps
          </Text>
        </View>

        <View
          style={[
            styles.summaryBox,
            styles.greenBox,
          ]}
        >
          <Text
            style={[
              styles.summaryNumber,
              styles.greenNumber,
            ]}
          >
            {totalAvailable}
          </Text>

          <Text style={styles.summaryLabel}>
            Available
          </Text>
        </View>
      </View>

      {/* TOP MISSING SKILLS */}

      <Text style={styles.sectionTitle}>
        Top Missing Skills
      </Text>

      <View style={styles.graphCard}>
        <BarGraph
          items={topMissingSkills}
          emptyText="No missing skill data available."
        />
      </View>

      {/* DISTRICT */}

      <Text style={styles.sectionTitle}>
        District-wise Skill Gaps
      </Text>

      <View style={styles.graphCard}>
        <BarGraph
          items={districtGapData}
          emptyText="No district skill-gap data available."
        />
      </View>

      {/* CAREER */}

      <Text style={styles.sectionTitle}>
        Career-wise Skill Gaps
      </Text>

      <View style={styles.graphCard}>
        <BarGraph
          items={careerGapData}
          emptyText="No career skill-gap data available."
        />
      </View>

      {/* COMPARISON */}

      <Text style={styles.sectionTitle}>
        Skill Availability vs Gap
      </Text>

      <View style={styles.graphCard}>
        <ComparisonGraph
          items={comparisonSkills}
        />
      </View>
    </ScrollView>
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
    fontSize: 15,
    color: "#64748B",
  },

  title: {
    fontSize: 28,
    fontWeight: "800",
    marginTop: 20,
    color: "#0F172A",
  },

  subtitle: {
    fontSize: 15,
    lineHeight: 22,
    color: "#64748B",
    marginTop: 8,
    marginBottom: 18,
  },

  sectionTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#0F172A",
    marginTop: 14,
    marginBottom: 10,
  },

  summaryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },

  summaryBox: {
    width: "48%",
    padding: 16,
    borderRadius: 16,
    marginBottom: 10,
  },

  blueBox: {
    backgroundColor: "#E0F2FE",
  },

  orangeBox: {
    backgroundColor: "#FFF7ED",
  },

  redBox: {
    backgroundColor: "#FEF2F2",
  },

  greenBox: {
    backgroundColor: "#F0FDF4",
  },

  summaryNumber: {
    fontSize: 28,
    fontWeight: "800",
    color: "#0369A1",
  },

  redNumber: {
    color: "#DC2626",
  },

  greenNumber: {
    color: "#16A34A",
  },

  summaryLabel: {
    marginTop: 4,
    fontSize: 13,
    fontWeight: "600",
    color: "#475569",
  },

  graphCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },

  graphRow: {
    marginBottom: 16,
  },

  graphLabelBox: {
    marginBottom: 6,
  },

  graphLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0F172A",
  },

  barArea: {
    flexDirection: "row",
    alignItems: "center",
  },

  barBackground: {
    flex: 1,
    height: 18,
    backgroundColor: "#E2E8F0",
    borderRadius: 10,
    overflow: "hidden",
  },

  bar: {
    height: "100%",
    backgroundColor: "#2563EB",
    borderRadius: 10,
  },

  barValue: {
    width: 35,
    marginLeft: 8,
    fontSize: 14,
    fontWeight: "800",
    color: "#0F172A",
    textAlign: "right",
  },

  comparisonCard: {
    marginBottom: 18,
  },

  comparisonTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#0F172A",
    marginBottom: 8,
  },

  legendRow: {
    flexDirection: "row",
    marginBottom: 10,
  },

  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 18,
  },

  legendDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    marginRight: 5,
  },

  missingDot: {
    backgroundColor: "#DC2626",
  },

  availableDot: {
    backgroundColor: "#16A34A",
  },

  legendText: {
    fontSize: 12,
    color: "#64748B",
  },

  smallBarLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#64748B",
    marginBottom: 4,
  },

  missingBar: {
    height: "100%",
    backgroundColor: "#DC2626",
    borderRadius: 10,
  },

  availableBar: {
    height: "100%",
    backgroundColor: "#16A34A",
    borderRadius: 10,
  },

  emptyBox: {
    paddingVertical: 20,
    alignItems: "center",
  },

  emptyText: {
    color: "#64748B",
    fontSize: 14,
  },

  errorTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#B91C1C",
    textAlign: "center",
  },

  errorText: {
    fontSize: 14,
    color: "#64748B",
    marginTop: 8,
    textAlign: "center",
  },
});