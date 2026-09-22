
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { useAuthedRequest } from "@/src/api/authed";

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

type DashboardData = {
  statistics: Statistics;
};

export default function GovernmentDashboard() {
  const request = useAuthedRequest();

  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadDashboard = useCallback(
    async (isRefresh = false) => {
      try {
        if (isRefresh) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }

        setError(null);

        const result = await request<DashboardData>(
          "/government/dashboard",
        );

        setData(result);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Unable to load government dashboard",
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [request],
  );

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
        <Text style={styles.message}>Loading dashboard...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>{error}</Text>
        <Text style={styles.retry} onPress={() => void loadDashboard()}>
          Tap here to retry
        </Text>
      </View>
    );
  }

  const statistics = data?.statistics;

  if (!statistics) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>No dashboard data available.</Text>
      </View>
    );
  }

  const cards = [
    { title: "Total Users", value: statistics.total_users },
    { title: "Trainees", value: statistics.total_trainees },
    { title: "Trainers", value: statistics.total_trainers },
    { title: "Employers", value: statistics.total_employers },
    { title: "Trainings", value: statistics.total_trainings },
    { title: "Enrollments", value: statistics.total_enrollments },
    { title: "Active Enrollments", value: statistics.active_enrollments },
    {
      title: "Completed Enrollments",
      value: statistics.completed_enrollments,
    },
  ];

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => void loadDashboard(true)}
        />
      }
    >
      <Text style={styles.heading}>Government Dashboard</Text>

      <Text style={styles.subtitle}>
        SkillAlign platform overview
      </Text>

      <View style={styles.grid}>
        {cards.map((card) => (
          <View style={styles.card} key={card.title}>
            <Text style={styles.cardTitle}>{card.title}</Text>
            <Text style={styles.cardValue}>{card.value}</Text>
          </View>
        ))}
      </View>

      <Text style={styles.footer}>
        Pull down to refresh the dashboard.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F4F6F8",
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  heading: {
    fontSize: 26,
    fontWeight: "700",
    color: "#1F2937",
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 15,
    color: "#6B7280",
    marginBottom: 20,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 12,
  },
  card: {
    width: "48%",
    minHeight: 115,
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 16,
    justifyContent: "center",
    elevation: 3,
    shadowColor: "#000000",
    shadowOpacity: 0.08,
    shadowRadius: 5,
    shadowOffset: {
      width: 0,
      height: 2,
    },
  },
  cardTitle: {
    fontSize: 13,
    color: "#6B7280",
    marginBottom: 10,
  },
  cardValue: {
    fontSize: 28,
    fontWeight: "700",
    color: "#2563EB",
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  message: {
    marginTop: 12,
    fontSize: 16,
  },
  error: {
    color: "#DC2626",
    textAlign: "center",
    fontSize: 16,
  },
  retry: {
    color: "#2563EB",
    marginTop: 16,
    fontWeight: "600",
  },
  footer: {
    textAlign: "center",
    color: "#6B7280",
    marginTop: 25,
    fontSize: 13,
  },
});