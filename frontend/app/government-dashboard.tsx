import { useCallback, useEffect, useState } from "react";
import { useRouter } from "expo-router";
import {
  ActivityIndicator,
  Pressable,
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

type FeatureCardProps = {
  icon: string;
  title: string;
  description: string;
  onPress: () => void;
  forecast?: boolean;
  funding?: boolean;
};

function FeatureCard({
  icon,
  title,
  description,
  onPress,
  forecast = false,
  funding = false,
}: FeatureCardProps) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.featureCard,
        forecast && styles.forecastCard,
        funding && styles.fundingCard,
        pressed && styles.pressedCard,
      ]}
      onPress={onPress}
    >
      <Text style={styles.featureIcon}>{icon}</Text>

      <Text style={styles.featureTitle}>
        {title}
      </Text>

      <Text style={styles.featureDescription}>
        {description}
      </Text>

      <Text style={styles.openText}>
        Open →
      </Text>
    </Pressable>
  );
}

export default function GovernmentDashboard() {
  const router = useRouter();
  const request = useAuthedRequest();

  const [data, setData] =
    useState<DashboardData | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  const loadDashboard = useCallback(
    async (isRefresh = false) => {
      try {
        if (isRefresh) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }

        setError(null);

        const result =
          await request<DashboardData>(
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

  const statistics = data?.statistics;

  const cards = statistics
    ? [
        {
          title: "Total Users",
          value: statistics.total_users,
        },
        {
          title: "Trainees",
          value: statistics.total_trainees,
        },
        {
          title: "Trainers",
          value: statistics.total_trainers,
        },
        {
          title: "Employers",
          value: statistics.total_employers,
        },
        {
          title: "Trainings",
          value: statistics.total_trainings,
        },
        {
          title: "Enrollments",
          value: statistics.total_enrollments,
        },
        {
          title: "Active Enrollments",
          value: statistics.active_enrollments,
        },
        {
          title: "Completed Enrollments",
          value: statistics.completed_enrollments,
        },
      ]
    : [];

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() =>
            void loadDashboard(true)
          }
        />
      }
      showsVerticalScrollIndicator={false}
    >
      {/* HEADER */}
      <Text style={styles.heading}>
        Government Dashboard
      </Text>

      <Text style={styles.subtitle}>
        SkillAlign platform overview
      </Text>

      {/* GOVERNMENT FEATURES */}
      <Text style={styles.sectionTitle}>
        Government Features
      </Text>

      <View style={styles.featureGrid}>
        {/* DISTRICT ANALYTICS */}
        <FeatureCard
          icon="📍"
          title="District Analytics"
          description="View district-wise workforce data"
          onPress={() =>
            router.push(
              "/government-regional-map",
            )
          }
        />

        {/* SKILL ANALYTICS */}
        <FeatureCard
          icon="📈"
          title="Skill Analytics"
          description="Review skill demand and training"
          onPress={() =>
            router.push(
              "/government-skill-forecast",
            )
          }
        />

        {/* REPORTS */}
        <FeatureCard
          icon="📊"
          title="Reports"
          description="View government reports"
          onPress={() =>
            router.push(
              "/government-reports",
            )
          }
        />

        {/* NOTIFICATIONS */}
        <FeatureCard
          icon="🔔"
          title="Notifications"
          description="View important platform updates"
          onPress={() =>
            router.push(
              "/government-notifications",
            )
          }
        />

        {/* REGIONAL SKILL MAP */}
        <FeatureCard
          icon="🗺️"
          title="Regional Skill Map"
          description="View India, state, and district skill demand"
          onPress={() =>
            router.push(
              "/government-regional-map",
            )
          }
        />

        {/* FUTURE SKILL FORECAST */}
        <FeatureCard
          icon="🔮"
          title="Future Skill Demand Forecast"
          description="Predict future industry skill demand and workforce needs"
          forecast
          onPress={() =>
            router.push(
              "/government-skill-forecast",
            )
          }
        />

        {/* FUNDING & RESOURCE ALLOCATION */}
        <FeatureCard
          icon="💰"
          title="Funding & Resource Allocation"
          description="Plan district funding, training seats, trainers and resources"
          funding
          onPress={() =>
            router.push(
              "/government-funding-allocation",
            )
          }
        />
      </View>

      {/* PLATFORM STATISTICS */}
      <Text style={styles.sectionTitle}>
        Platform Statistics
      </Text>

      {loading && (
        <View style={styles.statusCard}>
          <ActivityIndicator
            size="large"
            color="#2563EB"
          />

          <Text style={styles.message}>
            Loading dashboard statistics...
          </Text>
        </View>
      )}

      {error && (
        <View style={styles.errorCard}>
          <Text style={styles.error}>
            {error}
          </Text>

          <Pressable
            style={styles.retryButton}
            onPress={() =>
              void loadDashboard()
            }
          >
            <Text
              style={styles.retryButtonText}
            >
              Retry
            </Text>
          </Pressable>
        </View>
      )}

      {!loading &&
        !error &&
        !statistics && (
          <View style={styles.statusCard}>
            <Text style={styles.error}>
              No dashboard data available.
            </Text>
          </View>
        )}

      {!loading &&
        !error &&
        statistics && (
          <View
            style={styles.statisticsGrid}
          >
            {cards.map((card) => (
              <View
                style={styles.statisticsCard}
                key={card.title}
              >
                <Text
                  style={styles.cardTitle}
                >
                  {card.title}
                </Text>

                <Text
                  style={styles.cardValue}
                >
                  {card.value}
                </Text>
              </View>
            ))}
          </View>
        )}

      {/* FOOTER */}
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
    color: "#111827",
    marginBottom: 6,
  },

  subtitle: {
    fontSize: 15,
    color: "#6B7280",
    marginBottom: 20,
  },

  sectionTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#111827",
    marginTop: 10,
    marginBottom: 14,
  },

  featureGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: 20,
  },

  featureCard: {
    width: "48%",
    minHeight: 205,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 18,
    padding: 18,
    marginBottom: 16,
    justifyContent: "center",
  },

  forecastCard: {
    backgroundColor: "#F5F0FF",
    borderColor: "#A78BFA",
    borderWidth: 2,
  },

  fundingCard: {
    backgroundColor: "#ECFDF5",
    borderColor: "#34D399",
    borderWidth: 2,
  },

  pressedCard: {
    opacity: 0.7,
    transform: [{ scale: 0.98 }],
  },

  featureIcon: {
    fontSize: 30,
    marginBottom: 12,
  },

  featureTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 10,
  },

  featureDescription: {
    fontSize: 14,
    lineHeight: 20,
    color: "#374151",
  },

  openText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#2563EB",
    marginTop: 14,
  },

  statusCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 25,
    alignItems: "center",
    marginBottom: 15,
  },

  message: {
    marginTop: 12,
    fontSize: 14,
    color: "#6B7280",
  },

  errorCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 20,
    alignItems: "center",
    marginBottom: 15,
  },

  error: {
    color: "#DC2626",
    textAlign: "center",
    fontSize: 14,
  },

  retryButton: {
    backgroundColor: "#2563EB",
    paddingHorizontal: 25,
    paddingVertical: 12,
    borderRadius: 10,
    marginTop: 16,
  },

  retryButtonText: {
    color: "#FFFFFF",
    fontWeight: "700",
  },

  statisticsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },

  statisticsCard: {
    width: "48%",
    minHeight: 115,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 18,
    padding: 18,
    justifyContent: "center",
    marginBottom: 14,
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

  footer: {
    textAlign: "center",
    color: "#6B7280",
    marginTop: 20,
    fontSize: 13,
  },
});