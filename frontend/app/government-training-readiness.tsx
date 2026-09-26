
import React from "react";
import {
  ScrollView,
  View,
  Text,
  StyleSheet,
} from "react-native";

const districts = [
  {
    district: "Guntur",
    skill: "Artificial Intelligence",
    demand: 120,
    seats: 80,
    trainers: 8,
    requiredTrainers: 12,
  },
  {
    district: "Vijayawada",
    skill: "Data Science",
    demand: 100,
    seats: 90,
    trainers: 10,
    requiredTrainers: 12,
  },
  {
    district: "Visakhapatnam",
    skill: "Cloud Computing",
    demand: 150,
    seats: 60,
    trainers: 5,
    requiredTrainers: 15,
  },
];

export default function GovernmentTrainingReadiness() {
  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>
          Training & Trainer Readiness
        </Text>
        <Text style={styles.headerSubtitle}>
          Government Training Capacity Dashboard
        </Text>
      </View>

      <Text style={styles.sectionTitle}>District Readiness</Text>

      {districts.map((item) => {
        const seatGap = item.demand - item.seats;
        const trainerGap =
          item.requiredTrainers - item.trainers;

        return (
          <View style={styles.card} key={item.district}>
            <Text style={styles.district}>
              📍 {item.district}
            </Text>

            <Text style={styles.skill}>{item.skill}</Text>

            <View style={styles.row}>
              <Text>Skill Demand</Text>
              <Text style={styles.value}>{item.demand}</Text>
            </View>

            <View style={styles.row}>
              <Text>Available Seats</Text>
              <Text style={styles.value}>{item.seats}</Text>
            </View>

            <View style={styles.row}>
              <Text>Seat Gap</Text>
              <Text style={styles.warning}>{seatGap}</Text>
            </View>

            <View style={styles.row}>
              <Text>Available Trainers</Text>
              <Text style={styles.value}>{item.trainers}</Text>
            </View>

            <View style={styles.row}>
              <Text>Trainer Shortage</Text>
              <Text style={styles.warning}>{trainerGap}</Text>
            </View>

            <View style={styles.actionBox}>
              <Text style={styles.actionTitle}>
                Recommended Action
              </Text>
              <Text style={styles.actionText}>
                {seatGap > 0
                  ? `Increase ${seatGap} training seats`
                  : "Training seats are sufficient"}
                {"\n"}
                {trainerGap > 0
                  ? `Add ${trainerGap} trainers`
                  : "Trainer availability is sufficient"}
              </Text>
            </View>
          </View>
        );
      })}

      <Text style={styles.note}>
        Demo data for SIH prototype. Backend integration
        will be added later.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F7FB",
  },
  header: {
    backgroundColor: "#1768C4",
    padding: 24,
  },
  headerTitle: {
    color: "#FFFFFF",
    fontSize: 23,
    fontWeight: "bold",
  },
  headerSubtitle: {
    color: "#E0EDFF",
    fontSize: 14,
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: "bold",
    margin: 20,
    color: "#111827",
  },
  card: {
    backgroundColor: "#FFFFFF",
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 18,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  district: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1768C4",
  },
  skill: {
    fontSize: 15,
    color: "#64748B",
    marginVertical: 8,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  value: {
    fontWeight: "bold",
    color: "#1768C4",
  },
  warning: {
    fontWeight: "bold",
    color: "#DC2626",
  },
  actionBox: {
    backgroundColor: "#EFF6FF",
    padding: 12,
    borderRadius: 10,
    marginTop: 14,
  },
  actionTitle: {
    fontWeight: "bold",
    color: "#1768C4",
  },
  actionText: {
    marginTop: 6,
    lineHeight: 22,
    color: "#334155",
  },
  note: {
    textAlign: "center",
    color: "#64748B",
    margin: 20,
  },
});