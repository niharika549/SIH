
import React, { useMemo, useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
  Pressable,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";

type SkillData = {
  skill: string;
  current: number;
  future: number;
  growth: string;
  level: "Very High" | "High" | "Medium";
};

const SKILLS: SkillData[] = [
  {
    skill: "Artificial Intelligence",
    current: 65,
    future: 95,
    growth: "+46%",
    level: "Very High",
  },
  {
    skill: "Data Science",
    current: 70,
    future: 92,
    growth: "+31%",
    level: "Very High",
  },
  {
    skill: "Cyber Security",
    current: 55,
    future: 88,
    growth: "+60%",
    level: "Very High",
  },
  {
    skill: "Cloud Computing",
    current: 60,
    future: 85,
    growth: "+42%",
    level: "High",
  },
  {
    skill: "Web Development",
    current: 75,
    future: 82,
    growth: "+9%",
    level: "High",
  },
  {
    skill: "Data Entry",
    current: 80,
    future: 45,
    growth: "-44%",
    level: "Medium",
  },
];

function getColor(level: SkillData["level"]) {
  if (level === "Very High") return "#D62828";
  if (level === "High") return "#F77F00";
  return "#2A9D8F";
}

export default function GovernmentSkillForecast() {
  const [selectedSkill, setSelectedSkill] = useState<SkillData | null>(
    null
  );

  const sortedSkills = useMemo(() => {
    return [...SKILLS].sort(
      (a, b) => b.future - a.future
    );
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerIcon}>
          <MaterialCommunityIcons
            name="chart-line"
            size={28}
            color="#FFFFFF"
          />
        </View>

        <View>
          <Text style={styles.headerTitle}>
            Future Skill Demand
          </Text>

          <Text style={styles.headerSubtitle}>
            Government Forecast Dashboard
          </Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.heroCard}>
          <MaterialCommunityIcons
            name="trending-up"
            size={42}
            color="#1565C0"
          />

          <Text style={styles.heroTitle}>
            Emerging Skills Forecast
          </Text>

          <Text style={styles.heroDescription}>
            Identify skills expected to grow in demand and
            plan future training programs.
          </Text>

          <View style={styles.demoBadge}>
            <Text style={styles.demoText}>
              DEMONSTRATION FORECAST DATA
            </Text>
          </View>
        </View>

        <View style={styles.infoCard}>
          <MaterialCommunityIcons
            name="information-outline"
            size={23}
            color="#1565C0"
          />

          <Text style={styles.infoText}>
            Forecast values are sample values for the SIH
            prototype. Real predictions can use job postings,
            industry inputs, and historical trends.
          </Text>
        </View>

        <Text style={styles.sectionTitle}>
          Skill Demand Forecast
        </Text>

        {sortedSkills.map((item) => (
          <Pressable
            key={item.skill}
            style={styles.skillCard}
            onPress={() => setSelectedSkill(item)}
          >
            <View style={styles.skillHeader}>
              <View style={styles.skillIcon}>
                <MaterialCommunityIcons
                  name="brain"
                  size={22}
                  color="#1565C0"
                />
              </View>

              <View style={styles.skillText}>
                <Text style={styles.skillName}>
                  {item.skill}
                </Text>

                <Text style={styles.skillSubtext}>
                  Current: {item.current}%
                </Text>
              </View>

              <Text
                style={[
                  styles.growthText,
                  {
                    color:
                      item.future >= item.current
                        ? "#2A9D8F"
                        : "#D62828",
                  },
                ]}
              >
                {item.growth}
              </Text>
            </View>

            <View style={styles.barLabelRow}>
              <Text style={styles.barLabel}>Current Demand</Text>
              <Text style={styles.barValue}>
                {item.current}%
              </Text>
            </View>

            <View style={styles.barBackground}>
              <View
                style={[
                  styles.currentBar,
                  { width: `${item.current}%` },
                ]}
              />
            </View>

            <View style={styles.barLabelRow}>
              <Text style={styles.barLabel}>Future Demand</Text>
              <Text style={styles.barValue}>
                {item.future}%
              </Text>
            </View>

            <View style={styles.barBackground}>
              <View
                style={[
                  styles.futureBar,
                  {
                    width: `${item.future}%`,
                    backgroundColor: getColor(item.level),
                  },
                ]}
              />
            </View>

            <View style={styles.cardFooter}>
              <Text style={styles.levelText}>
                {item.level} Demand
              </Text>

              <MaterialCommunityIcons
                name="chevron-right"
                size={21}
                color="#777777"
              />
            </View>
          </Pressable>
        ))}

        {selectedSkill && (
          <View style={styles.detailsCard}>
            <View style={styles.detailsHeader}>
              <Text style={styles.detailsTitle}>
                Skill Recommendation
              </Text>

              <Pressable
                onPress={() => setSelectedSkill(null)}
              >
                <MaterialCommunityIcons
                  name="close"
                  size={22}
                  color="#555555"
                />
              </Pressable>
            </View>

            <Text style={styles.selectedSkill}>
              {selectedSkill.skill}
            </Text>

            <Text style={styles.detailsText}>
              Current demand: {selectedSkill.current}%
            </Text>

            <Text style={styles.detailsText}>
              Forecast demand: {selectedSkill.future}%
            </Text>

            <View style={styles.actionBox}>
              <MaterialCommunityIcons
                name="lightbulb-on-outline"
                size={24}
                color="#F77F00"
              />

              <Text style={styles.actionText}>
                Government Action: Review training capacity,
                improve course content, and prepare trainers
                for {selectedSkill.skill}.
              </Text>
            </View>
          </View>
        )}

        <View style={styles.methodCard}>
          <Text style={styles.methodTitle}>
            Forecast Methodology
          </Text>

          <Text style={styles.methodText}>
            Job Postings → Skill Extraction → Historical
            Trends → Industry Validation → Future Demand
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F7FA",
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1565C0",
    padding: 18,
  },

  headerIcon: {
    width: 46,
    height: 46,
    borderRadius: 12,
    backgroundColor: "#0D47A1",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },

  headerTitle: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "800",
  },

  headerSubtitle: {
    color: "#DCEBFF",
    fontSize: 12,
    marginTop: 4,
  },

  content: {
    padding: 18,
    paddingBottom: 40,
  },

  heroCard: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 22,
    marginBottom: 14,
  },

  heroTitle: {
    color: "#202124",
    fontSize: 21,
    fontWeight: "800",
    marginTop: 10,
    textAlign: "center",
  },

  heroDescription: {
    color: "#6B7280",
    fontSize: 13,
    lineHeight: 20,
    textAlign: "center",
    marginTop: 8,
  },

  demoBadge: {
    backgroundColor: "#E3F2FD",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 7,
    marginTop: 14,
  },

  demoText: {
    color: "#1565C0",
    fontSize: 10,
    fontWeight: "800",
  },

  infoCard: {
    flexDirection: "row",
    backgroundColor: "#E3F2FD",
    borderRadius: 14,
    padding: 14,
    marginBottom: 18,
  },

  infoText: {
    flex: 1,
    color: "#174A7E",
    fontSize: 12,
    lineHeight: 18,
    marginLeft: 10,
  },

  sectionTitle: {
    color: "#202124",
    fontSize: 19,
    fontWeight: "800",
    marginBottom: 12,
  },

  skillCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 15,
    marginBottom: 12,
  },

  skillHeader: {
    flexDirection: "row",
    alignItems: "center",
  },

  skillIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: "#E3F2FD",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },

  skillText: {
    flex: 1,
  },

  skillName: {
    color: "#202124",
    fontSize: 14,
    fontWeight: "800",
  },

  skillSubtext: {
    color: "#6B7280",
    fontSize: 11,
    marginTop: 4,
  },

  growthText: {
    fontSize: 13,
    fontWeight: "800",
  },

  barLabelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 13,
    marginBottom: 5,
  },

  barLabel: {
    color: "#6B7280",
    fontSize: 11,
  },

  barValue: {
    color: "#202124",
    fontSize: 11,
    fontWeight: "700",
  },

  barBackground: {
    height: 9,
    borderRadius: 6,
    backgroundColor: "#E5E7EB",
    overflow: "hidden",
  },

  currentBar: {
    height: 9,
    borderRadius: 6,
    backgroundColor: "#90CAF9",
  },

  futureBar: {
    height: 9,
    borderRadius: 6,
  },

  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 12,
  },

  levelText: {
    color: "#1565C0",
    fontSize: 11,
    fontWeight: "700",
  },

  detailsCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    marginTop: 5,
    marginBottom: 15,
  },

  detailsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  detailsTitle: {
    color: "#202124",
    fontSize: 16,
    fontWeight: "800",
  },

  selectedSkill: {
    color: "#1565C0",
    fontSize: 20,
    fontWeight: "800",
    marginTop: 15,
    marginBottom: 10,
  },

  detailsText: {
    color: "#555555",
    fontSize: 13,
    marginTop: 5,
  },

  actionBox: {
    flexDirection: "row",
    backgroundColor: "#FFF3E0",
    borderRadius: 12,
    padding: 12,
    marginTop: 15,
  },

  actionText: {
    flex: 1,
    color: "#8A4B08",
    fontSize: 12,
    lineHeight: 18,
    marginLeft: 10,
  },

  methodCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    marginTop: 5,
  },

  methodTitle: {
    color: "#202124",
    fontSize: 16,
    fontWeight: "800",
    marginBottom: 8,
  },

  methodText: {
    color: "#6B7280",
    fontSize: 12,
    lineHeight: 20,
  },
});