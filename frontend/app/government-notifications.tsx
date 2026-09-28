import { useQuery } from "@tanstack/react-query";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { useAuthedRequest } from "../src/api/authed";

type Notification = {
  id: string;
  title: string;
  message: string;
  type: string;
  priority: string;
  created_at: string;
};

type NotificationsResponse = {
  notifications?: Notification[];
};

export default function GovernmentNotifications() {
  const authed = useAuthedRequest();

  const notificationsQuery = useQuery({
    queryKey: ["government", "notifications"],
    queryFn: () =>
      authed<NotificationsResponse>(
        "/government/notifications"
      ),
    retry: false,
  });

  if (notificationsQuery.isPending) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />

        <Text style={styles.loading}>
          Loading notifications...
        </Text>
      </View>
    );
  }

  if (notificationsQuery.isError) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorTitle}>
          Unable to load notifications
        </Text>

        <Text style={styles.errorText}>
          Please check the backend connection.
        </Text>
      </View>
    );
  }

  const notifications =
    notificationsQuery.data?.notifications ?? [];

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>
        Government Notifications
      </Text>

      <Text style={styles.subtitle}>
        Important workforce and platform updates
      </Text>

      {notifications.length === 0 ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>
            No notifications
          </Text>

          <Text style={styles.message}>
            There are no new government notifications.
          </Text>
        </View>
      ) : (
        notifications.map((notification) => (
          <View
            key={notification.id}
            style={styles.card}
          >
            <View style={styles.topRow}>
              <Text style={styles.cardTitle}>
                {notification.title}
              </Text>

              <View
                style={[
                  styles.priorityBadge,
                  notification.priority === "HIGH"
                    ? styles.high
                    : notification.priority === "MEDIUM"
                    ? styles.medium
                    : styles.low,
                ]}
              >
                <Text style={styles.priorityText}>
                  {notification.priority}
                </Text>
              </View>
            </View>

            <Text style={styles.type}>
              {notification.type}
            </Text>

            <Text style={styles.message}>
              {notification.message}
            </Text>

            <Text style={styles.date}>
              {new Date(
                notification.created_at
              ).toLocaleString()}
            </Text>
          </View>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    paddingBottom: 40,
    backgroundColor: "#F8FAFC",
  },

  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },

  loading: {
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
    marginBottom: 20,
    fontSize: 15,
    color: "#64748B",
  },

  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 16,
    marginBottom: 12,
  },

  topRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 10,
  },

  cardTitle: {
    flex: 1,
    fontSize: 17,
    fontWeight: "800",
    color: "#0F172A",
  },

  type: {
    marginTop: 5,
    fontSize: 11,
    fontWeight: "700",
    color: "#64748B",
  },

  message: {
    marginTop: 10,
    fontSize: 14,
    lineHeight: 21,
    color: "#334155",
  },

  date: {
    marginTop: 12,
    fontSize: 11,
    color: "#94A3B8",
  },

  priorityBadge: {
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },

  high: {
    backgroundColor: "#FEE2E2",
  },

  medium: {
    backgroundColor: "#FEF3C7",
  },

  low: {
    backgroundColor: "#DCFCE7",
  },

  priorityText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#334155",
  },
});