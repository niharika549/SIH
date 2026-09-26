import React, { useMemo, useState } from "react";
import {
  ScrollView,
  View,
  Text,
  Pressable,
  StyleSheet,
} from "react-native";
import MaterialCommunityIcons from
  "@expo/vector-icons/MaterialCommunityIcons";

import { makeStyles, useTheme } from "../src/theme";

type FilterType = "district" | "career" | "period" | null;

type ReportSectionProps = {
  title: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  children: React.ReactNode;
};

type BarItem = {
  name: string;
  value: number;
  district?: string;
  career?: string;
};

export default function GovernmentReports() {
  const { colors } = useTheme();
  const styles = useStyles();

  // FILTER STATES
  const [district, setDistrict] = useState("All Districts");
  const [career, setCareer] = useState("All Careers");
  const [period, setPeriod] = useState("This Year");

  const [filterOpen, setFilterOpen] = useState<FilterType>(null);

  const districts = [
    "All Districts",
    "Guntur",
    "Vijayawada",
    "Visakhapatnam",
    "Nellore",
  ];

  const careers = [
    "All Careers",
    "Data Scientist",
    "AI Engineer",
    "Cloud Engineer",
    "Web Developer",
  ];

  const periods = [
    "This Year",
    "This Month",
    "Last 6 Months",
  ];

  // DEMO REPORT DATA
  const districtData: BarItem[] = [
    {
      name: "Guntur",
      value: 85,
      district: "Guntur",
      career: "Data Scientist",
    },
    {
      name: "Vijayawada",
      value: 72,
      district: "Vijayawada",
      career: "AI Engineer",
    },
    {
      name: "Visakhapatnam",
      value: 65,
      district: "Visakhapatnam",
      career: "Cloud Engineer",
    },
    {
      name: "Nellore",
      value: 48,
      district: "Nellore",
      career: "Web Developer",
    },
  ];

  const careerData: BarItem[] = [
    {
      name: "Data Scientist",
      value: 90,
      career: "Data Scientist",
    },
    {
      name: "AI Engineer",
      value: 78,
      career: "AI Engineer",
    },
    {
      name: "Cloud Engineer",
      value: 65,
      career: "Cloud Engineer",
    },
    {
      name: "Web Developer",
      value: 55,
      career: "Web Developer",
    },
  ];

  const skillData = [
    { name: "Python", value: 92 },
    { name: "SQL", value: 84 },
    { name: "Machine Learning", value: 76 },
    { name: "Cloud Computing", value: 68 },
    { name: "React", value: 60 },
  ];

  // APPLY FILTERS TO DEMO DATA
  const filteredDistrictData = useMemo(() => {
    return districtData.filter((item) => {
      const districtMatch =
        district === "All Districts" ||
        item.district === district;

      const careerMatch =
        career === "All Careers" ||
        item.career === career;

      return districtMatch && careerMatch;
    });
  }, [district, career]);

  const filteredCareerData = useMemo(() => {
    return careerData.filter((item) => {
      return (
        career === "All Careers" ||
        item.career === career
      );
    });
  }, [career]);

  // DEMO NUMBERS CHANGE BASED ON PERIOD
  const reportNumbers = useMemo(() => {
    if (period === "This Month") {
      return {
        trainees: "428",
        trainings: "32",
        placements: "186",
        placementRate: "43%",
        completionRate: 68,
        capacity: 54,
      };
    }

    if (period === "Last 6 Months") {
      return {
        trainees: "1,248",
        trainings: "96",
        placements: "542",
        placementRate: "44%",
        completionRate: 76,
        capacity: 72,
      };
    }

    return {
      trainees: "2,480",
      trainings: "156",
      placements: "1,120",
      placementRate: "45%",
      completionRate: 82,
      capacity: 78,
    };
  }, [period]);

  function toggleFilter(type: FilterType) {
    setFilterOpen(filterOpen === type ? null : type);
  }

  function resetFilters() {
    setDistrict("All Districts");
    setCareer("All Careers");
    setPeriod("This Year");
    setFilterOpen(null);
  }

  function ReportSection({
    title,
    icon,
    children,
  }: ReportSectionProps) {
    return (
      <View style={styles.sectionCard}>
        <View style={styles.sectionTitleRow}>
          <MaterialCommunityIcons
            name={icon}
            size={21}
            color={colors.brandPrimary}
          />

          <Text style={styles.sectionTitle}>
            {title}
          </Text>
        </View>

        {children}
      </View>
    );
  }

  function SummaryCard({
    title,
    value,
    icon,
    color,
  }: {
    title: string;
    value: string;
    icon: keyof typeof MaterialCommunityIcons.glyphMap;
    color: string;
  }) {
    return (
      <View style={styles.summaryCard}>
        <View
          style={[
            styles.summaryIcon,
            { backgroundColor: color + "20" },
          ]}
        >
          <MaterialCommunityIcons
            name={icon}
            size={21}
            color={color}
          />
        </View>

        <Text style={styles.summaryValue}>
          {value}
        </Text>

        <Text style={styles.summaryTitle}>
          {title}
        </Text>
      </View>
    );
  }

  function ProgressBar({
    label,
    value,
    color = colors.brandPrimary,
  }: {
    label: string;
    value: number;
    color?: string;
  }) {
    return (
      <View style={styles.progressContainer}>
        <View style={styles.progressLabelRow}>
          <Text style={styles.progressLabel}>
            {label}
          </Text>

          <Text style={styles.progressValue}>
            {value}%
          </Text>
        </View>

        <View style={styles.progressBackground}>
          <View
            style={[
              styles.progressFill,
              {
                width: `${Math.min(value, 100)}%`,
                backgroundColor: color,
              },
            ]}
          />
        </View>
      </View>
    );
  }

  function BarChart({
    data,
    color = colors.brandPrimary,
  }: {
    data: BarItem[];
    color?: string;
  }) {
    if (data.length === 0) {
      return (
        <View style={styles.emptyBox}>
          <MaterialCommunityIcons
            name="chart-bar"
            size={28}
            color={colors.onSurfaceSecondary}
          />

          <Text style={styles.emptyText}>
            No data available for selected filters
          </Text>
        </View>
      );
    }

    return (
      <View style={styles.chartContainer}>
        {data.map((item) => (
          <View
            key={item.name}
            style={styles.chartRow}
          >
            <Text style={styles.chartLabel}>
              {item.name}
            </Text>

            <View style={styles.chartBarBackground}>
              <View
                style={[
                  styles.chartBarFill,
                  {
                    width: `${item.value}%`,
                    backgroundColor: color,
                  },
                ]}
              />
            </View>

            <Text style={styles.chartValue}>
              {item.value}
            </Text>
          </View>
        ))}
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      {/* HEADER */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>
            Government Reports
          </Text>

          <Text style={styles.headerSubtitle}>
            Monitor skills, training and employment
          </Text>
        </View>

        <View style={styles.headerIcon}>
          <MaterialCommunityIcons
            name="chart-box-outline"
            size={27}
            color={colors.brandPrimary}
          />
        </View>
      </View>

      {/* WORKING FILTERS */}
      <View style={styles.filterCard}>
        <View style={styles.filterTitleRow}>
          <MaterialCommunityIcons
            name="filter-variant"
            size={21}
            color={colors.brandPrimary}
          />

          <Text style={styles.filterTitle}>
            Report Filters
          </Text>

          <Pressable
            style={styles.resetButton}
            onPress={resetFilters}
          >
            <Text style={styles.resetText}>
              Reset
            </Text>
          </Pressable>
        </View>

        {/* DISTRICT FILTER */}
        <Pressable
          style={styles.filterPill}
          onPress={() => toggleFilter("district")}
        >
          <MaterialCommunityIcons
            name="map-marker-outline"
            size={18}
            color={colors.brandPrimary}
          />

          <Text style={styles.filterText}>
            {district}
          </Text>

          <MaterialCommunityIcons
            name="chevron-down"
            size={18}
            color={colors.onSurfaceSecondary}
          />
        </Pressable>

        {filterOpen === "district" && (
          <View style={styles.optionsBox}>
            {districts.map((item) => (
              <Pressable
                key={item}
                style={[
                  styles.option,
                  district === item &&
                    styles.selectedOption,
                ]}
                onPress={() => {
                  setDistrict(item);
                  setFilterOpen(null);
                }}
              >
                <Text style={styles.optionText}>
                  {item}
                </Text>

                {district === item && (
                  <MaterialCommunityIcons
                    name="check"
                    size={17}
                    color={colors.brandPrimary}
                  />
                )}
              </Pressable>
            ))}
          </View>
        )}

        {/* CAREER FILTER */}
        <Pressable
          style={styles.filterPill}
          onPress={() => toggleFilter("career")}
        >
          <MaterialCommunityIcons
            name="briefcase-outline"
            size={18}
            color={colors.brandPrimary}
          />

          <Text style={styles.filterText}>
            {career}
          </Text>

          <MaterialCommunityIcons
            name="chevron-down"
            size={18}
            color={colors.onSurfaceSecondary}
          />
        </Pressable>

        {filterOpen === "career" && (
          <View style={styles.optionsBox}>
            {careers.map((item) => (
              <Pressable
                key={item}
                style={[
                  styles.option,
                  career === item &&
                    styles.selectedOption,
                ]}
                onPress={() => {
                  setCareer(item);
                  setFilterOpen(null);
                }}
              >
                <Text style={styles.optionText}>
                  {item}
                </Text>

                {career === item && (
                  <MaterialCommunityIcons
                    name="check"
                    size={17}
                    color={colors.brandPrimary}
                  />
                )}
              </Pressable>
            ))}
          </View>
        )}

        {/* PERIOD FILTER */}
        <Pressable
          style={styles.filterPill}
          onPress={() => toggleFilter("period")}
        >
          <MaterialCommunityIcons
            name="calendar-month-outline"
            size={18}
            color={colors.brandPrimary}
          />

          <Text style={styles.filterText}>
            {period}
          </Text>

          <MaterialCommunityIcons
            name="chevron-down"
            size={18}
            color={colors.onSurfaceSecondary}
          />
        </Pressable>

        {filterOpen === "period" && (
          <View style={styles.optionsBox}>
            {periods.map((item) => (
              <Pressable
                key={item}
                style={[
                  styles.option,
                  period === item &&
                    styles.selectedOption,
                ]}
                onPress={() => {
                  setPeriod(item);
                  setFilterOpen(null);
                }}
              >
                <Text style={styles.optionText}>
                  {item}
                </Text>

                {period === item && (
                  <MaterialCommunityIcons
                    name="check"
                    size={17}
                    color={colors.brandPrimary}
                  />
                )}
              </Pressable>
            ))}
          </View>
        )}

        {/* SELECTED FILTER SUMMARY */}
        <View style={styles.selectedFilter}>
          <MaterialCommunityIcons
            name="check-circle-outline"
            size={18}
            color={colors.success}
          />

          <Text style={styles.selectedFilterText}>
            {district} • {career} • {period}
          </Text>
        </View>
      </View>

      {/* PLATFORM OVERVIEW */}
      <ReportSection
        title="Platform Overview"
        icon="view-dashboard-outline"
      >
        <View style={styles.summaryGrid}>
          <SummaryCard
            title="Registered Trainees"
            value={reportNumbers.trainees}
            icon="account-group-outline"
            color="#6366F1"
          />

          <SummaryCard
            title="Training Programs"
            value={reportNumbers.trainings}
            icon="school-outline"
            color="#0EA5E9"
          />

          <SummaryCard
            title="Successful Placements"
            value={reportNumbers.placements}
            icon="briefcase-check-outline"
            color="#10B981"
          />

          <SummaryCard
            title="Placement Rate"
            value={reportNumbers.placementRate}
            icon="chart-line"
            color="#F59E0B"
          />
        </View>
      </ReportSection>

      {/* TRAINING ANALYTICS */}
      <ReportSection
        title="Training Analytics"
        icon="school-outline"
      >
        <ProgressBar
          label="Training Completion Rate"
          value={reportNumbers.completionRate}
          color="#10B981"
        />

        <ProgressBar
          label="Capacity Utilization"
          value={reportNumbers.capacity}
          color="#6366F1"
        />

        <ProgressBar
          label="Trainee Participation"
          value={74}
          color="#0EA5E9"
        />
      </ReportSection>

      {/* CAPACITY UTILIZATION */}
      <ReportSection
        title="Capacity Utilization"
        icon="chart-donut"
      >
        <View style={styles.bigMetricBox}>
          <Text style={styles.bigMetricValue}>
            {reportNumbers.capacity}%
          </Text>

          <Text style={styles.bigMetricLabel}>
            Training capacity currently utilized
          </Text>
        </View>

        <ProgressBar
          label="Available Training Capacity"
          value={100 - reportNumbers.capacity}
          color="#F59E0B"
        />
      </ReportSection>

      {/* TRAINING COMPLETION */}
      <ReportSection
        title="Training Completion Rate"
        icon="check-circle-outline"
      >
        <View style={styles.bigMetricBox}>
          <Text style={styles.bigMetricValue}>
            {reportNumbers.completionRate}%
          </Text>

          <Text style={styles.bigMetricLabel}>
            Trainees completed assigned programs
          </Text>
        </View>

        <ProgressBar
          label="Completed"
          value={reportNumbers.completionRate}
          color="#10B981"
        />

        <ProgressBar
          label="Remaining"
          value={100 - reportNumbers.completionRate}
          color="#F97316"
        />
      </ReportSection>

      {/* JOB AND PLACEMENT ANALYTICS */}
      <ReportSection
        title="Job and Placement Analytics"
        icon="briefcase-outline"
      >
        <SummaryCard
          title="Total Placements"
          value={reportNumbers.placements}
          icon="account-check-outline"
          color="#10B981"
        />

        <View style={styles.space} />

        <ProgressBar
          label="Placement Rate"
          value={45}
          color="#10B981"
        />

        <ProgressBar
          label="Interview Success Rate"
          value={62}
          color="#6366F1"
        />

        <ProgressBar
          label="Employer Satisfaction"
          value={88}
          color="#0EA5E9"
        />
      </ReportSection>

      {/* DISTRICT JOB SUMMARY */}
      <ReportSection
        title="District Job Summary"
        icon="map-marker-multiple-outline"
      >
        <BarChart
          data={filteredDistrictData}
          color="#6366F1"
        />
      </ReportSection>

      {/* CAREER JOB SUMMARY */}
      <ReportSection
        title="Career Job Summary"
        icon="briefcase-search-outline"
      >
        <BarChart
          data={filteredCareerData}
          color="#0EA5E9"
        />
      </ReportSection>

      {/* ANALYTICS SUMMARY */}
      <ReportSection
        title="Analytics Summary"
        icon="chart-line-variant"
      >
        <ProgressBar
          label="Industry Skill Alignment"
          value={81}
          color="#6366F1"
        />

        <ProgressBar
          label="Course Relevance"
          value={76}
          color="#0EA5E9"
        />

        <ProgressBar
          label="Employer Validation"
          value={68}
          color="#10B981"
        />

        <ProgressBar
          label="Learner Satisfaction"
          value={87}
          color="#F59E0B"
        />
      </ReportSection>

      {/* DISTRICT SUMMARY */}
      <ReportSection
        title="District Summary"
        icon="map-outline"
      >
        <BarChart
          data={filteredDistrictData}
          color="#10B981"
        />
      </ReportSection>

      {/* TOP SKILLS */}
      <ReportSection
        title="Top Skills by Trainee Count"
        icon="lightbulb-on-outline"
      >
        {skillData.map((skill) => (
          <ProgressBar
            key={skill.name}
            label={skill.name}
            value={skill.value}
            color="#8B5CF6"
          />
        ))}
      </ReportSection>

      {/* FOOTER SUMMARY */}
      <View style={styles.footerCard}>
        <MaterialCommunityIcons
          name="information-outline"
          size={22}
          color={colors.brandPrimary}
        />

        <View style={styles.footerTextBox}>
          <Text style={styles.footerTitle}>
            Report Summary
          </Text>

          <Text style={styles.footerText}>
            This report displays demo analytics based on
            the selected district, career and period.
            Connect the backend API for live government
            dashboard data.
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

const useStyles = makeStyles((colors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.surface,
    },

    contentContainer: {
      padding: 16,
      paddingBottom: 35,
    },

    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 18,
    },

    headerTitle: {
      fontSize: 24,
      fontWeight: "800",
      color: colors.onSurface,
    },

    headerSubtitle: {
      fontSize: 12,
      color: colors.onSurfaceSecondary,
      marginTop: 5,
    },

    headerIcon: {
      width: 50,
      height: 50,
      borderRadius: 16,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.surfaceSecondary,
    },

    filterCard: {
      backgroundColor: colors.surface,
      borderRadius: 20,
      padding: 16,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: colors.border,
    },

    filterTitleRow: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 14,
      gap: 8,
    },

    filterTitle: {
      flex: 1,
      fontSize: 17,
      fontWeight: "800",
      color: colors.onSurface,
    },

    resetButton: {
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 8,
      backgroundColor: colors.surfaceSecondary,
    },

    resetText: {
      fontSize: 11,
      fontWeight: "700",
      color: colors.brandPrimary,
    },

    filterPill: {
      minHeight: 48,
      flexDirection: "row",
      alignItems: "center",
      gap: 9,
      paddingHorizontal: 13,
      borderRadius: 12,
      marginTop: 9,
      backgroundColor: colors.surfaceSecondary,
      borderWidth: 1,
      borderColor: colors.border,
    },

    filterText: {
      flex: 1,
      fontSize: 13,
      color: colors.onSurface,
      fontWeight: "600",
    },

    optionsBox: {
      backgroundColor: colors.surfaceTertiary,
      borderRadius: 12,
      marginTop: 6,
      padding: 6,
    },

    option: {
      minHeight: 42,
      paddingVertical: 10,
      paddingHorizontal: 12,
      borderRadius: 8,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },

    selectedOption: {
      backgroundColor: colors.surfaceSecondary,
    },

    optionText: {
      color: colors.onSurface,
      fontSize: 13,
    },

    selectedFilter: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      marginTop: 16,
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },

    selectedFilterText: {
      flex: 1,
      color: colors.onSurfaceSecondary,
      fontSize: 12,
    },

    sectionCard: {
      backgroundColor: colors.surface,
      borderRadius: 20,
      padding: 16,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: colors.border,
    },

    sectionTitleRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 9,
      marginBottom: 17,
    },

    sectionTitle: {
      flex: 1,
      fontSize: 16,
      fontWeight: "800",
      color: colors.onSurface,
    },

    summaryGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      justifyContent: "space-between",
      gap: 10,
    },

    summaryCard: {
      flex: 1,
      minWidth: "43%",
      padding: 13,
      borderRadius: 15,
      backgroundColor: colors.surfaceSecondary,
    },

    summaryIcon: {
      width: 38,
      height: 38,
      borderRadius: 12,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 10,
    },

    summaryValue: {
      fontSize: 22,
      fontWeight: "800",
      color: colors.onSurface,
    },

    summaryTitle: {
      fontSize: 11,
      color: colors.onSurfaceSecondary,
      marginTop: 4,
      lineHeight: 16,
    },

    progressContainer: {
      marginBottom: 18,
    },

    progressLabelRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 8,
    },

    progressLabel: {
      flex: 1,
      fontSize: 12,
      color: colors.onSurface,
      fontWeight: "600",
    },

    progressValue: {
      fontSize: 12,
      color: colors.onSurfaceSecondary,
      fontWeight: "700",
    },

    progressBackground: {
      height: 9,
      borderRadius: 20,
      backgroundColor: colors.surfaceTertiary,
      overflow: "hidden",
    },

    progressFill: {
      height: "100%",
      borderRadius: 20,
    },

    bigMetricBox: {
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 14,
      marginBottom: 18,
      borderRadius: 16,
      backgroundColor: colors.surfaceSecondary,
    },

    bigMetricValue: {
      fontSize: 35,
      fontWeight: "900",
      color: colors.brandPrimary,
    },

    bigMetricLabel: {
      fontSize: 12,
      color: colors.onSurfaceSecondary,
      marginTop: 5,
      textAlign: "center",
    },

    chartContainer: {
      gap: 17,
    },

    chartRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },

    chartLabel: {
      width: 105,
      fontSize: 11,
      color: colors.onSurface,
    },

    chartBarBackground: {
      flex: 1,
      height: 12,
      borderRadius: 20,
      overflow: "hidden",
      backgroundColor: colors.surfaceTertiary,
    },

    chartBarFill: {
      height: "100%",
      borderRadius: 20,
    },

    chartValue: {
      width: 25,
      textAlign: "right",
      fontSize: 11,
      fontWeight: "700",
      color: colors.onSurfaceSecondary,
    },

    emptyBox: {
      paddingVertical: 25,
      alignItems: "center",
      justifyContent: "center",
    },

    emptyText: {
      marginTop: 8,
      fontSize: 12,
      color: colors.onSurfaceSecondary,
      textAlign: "center",
    },

    space: {
      height: 14,
    },

    footerCard: {
      flexDirection: "row",
      gap: 12,
      padding: 16,
      borderRadius: 18,
      backgroundColor: colors.surfaceSecondary,
      marginTop: 2,
    },

    footerTextBox: {
      flex: 1,
    },

    footerTitle: {
      fontSize: 14,
      fontWeight: "800",
      color: colors.onSurface,
      marginBottom: 5,
    },

    footerText: {
      fontSize: 12,
      lineHeight: 18,
      color: colors.onSurfaceSecondary,
    },
  })
);