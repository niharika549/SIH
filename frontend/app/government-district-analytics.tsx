
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { apiRequest } from "@/src/api/client";
import { useAuth } from "@/src/auth-context";

type District = {
  state_code: string;
  district_code: string;
  trainees: number;
  trainers: number;
  employers: number;
  trainings: number;
};

type DistrictResponse = {
  districts: District[];
};

export default function GovernmentDistrictAnalytics() {
  const { token } = useAuth();

  const [districts, setDistricts] = useState<District[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadDistricts() {
      try {
        if (!token) {
          setError("Please login again.");
          return;
        }

        const result = await apiRequest<DistrictResponse>(
          "/government/district-analytics",
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        );

        setDistricts(result.districts ?? []);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Unable to load district data",
        );
      } finally {
        setLoading(false);
      }
    }

    loadDistricts();
  }, [token]);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>District Analytics</Text>
      <Text style={styles.subtitle}>
        Government district-wise workforce overview
      </Text>

      {loading && <ActivityIndicator size="large" />}

      {error !== "" && <Text style={styles.error}>{error}</Text>}

      {!loading && !error && districts.length === 0 && (
        <Text style={styles.empty}>No district data available yet.</Text>
      )}

      {districts.map((district) => (
        <View
          key={`${district.state_code}-${district.district_code}`}
          style={styles.card}
        >
          <Text style={styles.heading}>
            {district.district_code}
          </Text>

          <Text>State: {district.state_code}</Text>
          <Text>Trainees: {district.trainees}</Text>
          <Text>Trainers: {district.trainers}</Text>
          <Text>Employers: {district.employers}</Text>
          <Text>Trainings: {district.trainings}</Text>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 24,
    gap: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
  },
  subtitle: {
    fontSize: 16,
    color: "#666",
  },
  card: {
    backgroundColor: "#fff",
    padding: 20,
    borderRadius: 16,
    gap: 8,
  },
  heading: {
    fontSize: 20,
    fontWeight: "bold",
  },
  empty: {
    fontSize: 16,
    marginTop: 20,
  },
  error: {
    color: "red",
    fontSize: 16,
  },
});