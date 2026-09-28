import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";

type Demand = "Very High" | "High" | "Medium";

type District = {
  name: string;
  demand: Demand;
  skills: string[];
  jobs: number;
  learners: number;
  training: number;
};

type Region = {
  name: string;
  type: "State" | "Union Territory";
  districts: District[];
};

type RawDistrict = {
  code?: string;
  name: string;
};

type RawRegion = {
  code?: string;
  name: string;
  districts: RawDistrict[];
};

const DATA_URL =
  "https://raw.githubusercontent.com/CodingMation/indian-states-districts/main/data/india_states_districts.json";

const UNION_TERRITORIES = new Set([
  "Andaman and Nicobar Islands",
  "Chandigarh",
  "Dadra and Nagar Haveli and Daman and Diu",
  "Delhi",
  "Jammu and Kashmir",
  "Ladakh",
  "Lakshadweep",
  "Puducherry",
]);

const SKILLS = [
  ["Python", "Data Science", "Cloud Computing"],
  ["Java", "SQL", "Web Development"],
  ["Cyber Security", "Networking", "Linux"],
  ["Digital Marketing", "Data Analytics", "AI"],
];

const DEMANDS: Demand[] = ["Very High", "High", "Medium"];

function demandColor(demand: Demand) {
  if (demand === "Very High") return "#D62828";
  if (demand === "High") return "#F77F00";
  return "#2A9D8F";
}

function createDistrict(
  district: RawDistrict,
  index: number
): District {
  return {
    name: district.name,
    demand: DEMANDS[index % DEMANDS.length],
    skills: SKILLS[index % SKILLS.length],
    jobs: 100 + (index % 20) * 50,
    learners: 80 + (index % 15) * 30,
    training: 50 + (index % 10) * 20,
  };
}

function formatRegion(region: RawRegion): Region {
  return {
    name: region.name,
    type: UNION_TERRITORIES.has(region.name)
      ? "Union Territory"
      : "State",
    districts: region.districts.map((district, index) =>
      createDistrict(district, index)
    ),
  };
}

export default function GovernmentRegionalMap() {
  const [regions, setRegions] = useState<Region[]>([]);
  const [selectedRegion, setSelectedRegion] =
    useState<Region | null>(null);
  const [selectedDistrict, setSelectedDistrict] =
    useState<District | null>(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadRegions() {
      try {
        setLoading(true);
        setError("");

        const response = await fetch(DATA_URL);

        if (!response.ok) {
          throw new Error("Failed to load district data");
        }

        const data: RawRegion[] = await response.json();

        setRegions(data.map(formatRegion));
      } catch (err) {
        console.log("District data error:", err);
        setError(
          "Unable to load district data. Check your internet connection."
        );
      } finally {
        setLoading(false);
      }
    }

    loadRegions();
  }, []);

  const filteredRegions = useMemo(() => {
    const searchText = search.toLowerCase().trim();

    if (!searchText) return regions;

    return regions.filter((region) =>
      region.name.toLowerCase().includes(searchText)
    );
  }, [regions, search]);

  const demandSummary = useMemo(() => {
    let veryHigh = 0;
    let high = 0;
    let medium = 0;

    regions.forEach((region) => {
      region.districts.forEach((district) => {
        if (district.demand === "Very High") veryHigh++;
        if (district.demand === "High") high++;
        if (district.demand === "Medium") medium++;
      });
    });

    return {
      veryHigh,
      high,
      medium,
    };
  }, [regions]);

  function selectRegion(region: Region) {
    setSelectedRegion(region);
    setSelectedDistrict(null);
    setSearch("");
  }

  function selectDistrict(district: District) {
    setSelectedDistrict(district);
  }

  function goHome() {
    setSelectedRegion(null);
    setSelectedDistrict(null);
    setSearch("");
  }

  function goBackToDistricts() {
    setSelectedDistrict(null);
  }

  return (
    <View style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <View style={styles.headerIcon}>
          <MaterialCommunityIcons
            name="map-marker-radius"
            size={28}
            color="#FFFFFF"
          />
        </View>

        <View style={styles.headerText}>
          <Text style={styles.headerTitle}>
            Regional Skill Development
          </Text>

          <Text style={styles.headerSubtitle}>
            India → State → District → Skills
          </Text>
        </View>
      </View>

      {/* BREADCRUMB */}
      <View style={styles.breadcrumb}>
        <Pressable onPress={goHome}>
          <Text style={styles.homeText}>India</Text>
        </Pressable>

        {selectedRegion && (
          <>
            <Text style={styles.arrow}>›</Text>

            <Text style={styles.breadcrumbText}>
              {selectedRegion.name}
            </Text>
          </>
        )}

        {selectedDistrict && (
          <>
            <Text style={styles.arrow}>›</Text>

            <Text style={styles.breadcrumbText}>
              {selectedDistrict.name}
            </Text>
          </>
        )}
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
      >
        {/* LOADING */}
        {loading && (
          <View style={styles.loadingCard}>
            <ActivityIndicator size="large" color="#1565C0" />

            <Text style={styles.loadingText}>
              Loading all states and districts...
            </Text>
          </View>
        )}

        {/* ERROR */}
        {error !== "" && (
          <View style={styles.errorCard}>
            <MaterialCommunityIcons
              name="alert-circle-outline"
              size={25}
              color="#D62828"
            />

            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* INDIA HOME PAGE */}
        {!loading && !selectedRegion && (
          <>
            <View style={styles.heroCard}>
              <MaterialCommunityIcons
                name="earth"
                size={42}
                color="#1565C0"
              />

              <Text style={styles.heroTitle}>
                India Skill Dashboard
              </Text>

              <Text style={styles.heroDescription}>
                Explore regional employment demand, learner supply,
                and training requirements across India.
              </Text>

              <View style={styles.demoBadge}>
                <Text style={styles.demoBadgeText}>
                  SIH PROTOTYPE DATA
                </Text>
              </View>
            </View>

            {/* SEARCH */}
            <TextInput
              style={styles.searchInput}
              placeholder="Search state or union territory..."
              placeholderTextColor="#888888"
              value={search}
              onChangeText={setSearch}
            />

            {/* SUMMARY */}
            <View style={styles.summaryRow}>
              <SummaryCard
                number={regions.length}
                label="States / UTs"
              />

              <SummaryCard
                number={
                  regions.filter((r) => r.type === "State").length
                }
                label="States"
              />

              <SummaryCard
                number={
                  regions.filter(
                    (r) => r.type === "Union Territory"
                  ).length
                }
                label="UTs"
              />
            </View>

            {/* HEATMAP SUMMARY */}
            <Text style={styles.sectionTitle}>
              Demand Heatmap Summary
            </Text>

            <View style={styles.heatmapCard}>
              <Text style={styles.heatmapDescription}>
                District-wise skill demand levels across India
              </Text>

              <HeatmapRow
                color="#D62828"
                label="Very High Demand"
                number={demandSummary.veryHigh}
              />

              <HeatmapRow
                color="#F77F00"
                label="High Demand"
                number={demandSummary.high}
              />

              <HeatmapRow
                color="#2A9D8F"
                label="Medium Demand"
                number={demandSummary.medium}
              />
            </View>

            {/* REGION LIST */}
            <Text style={styles.sectionTitle}>
              Select Region
            </Text>

            {filteredRegions.length === 0 && (
              <Text style={styles.emptyText}>
                No matching state or union territory found.
              </Text>
            )}

            {filteredRegions.map((region) => (
              <Pressable
                key={region.name}
                style={styles.regionCard}
                onPress={() => selectRegion(region)}
              >
                <View style={styles.regionIcon}>
                  <MaterialCommunityIcons
                    name={
                      region.type === "State"
                        ? "map-marker"
                        : "flag-outline"
                    }
                    size={23}
                    color="#1565C0"
                  />
                </View>

                <View style={styles.regionText}>
                  <Text style={styles.regionName}>
                    {region.name}
                  </Text>

                  <Text style={styles.regionType}>
                    {region.type} • {region.districts.length} districts
                  </Text>
                </View>

                <MaterialCommunityIcons
                  name="chevron-right"
                  size={24}
                  color="#777777"
                />
              </Pressable>
            ))}
          </>
        )}

        {/* DISTRICT LIST */}
        {selectedRegion && !selectedDistrict && (
          <>
            <BackButton
              label="Back to India"
              onPress={goHome}
            />

            <View style={styles.selectedRegionCard}>
              <MaterialCommunityIcons
                name="map-marker-radius"
                size={32}
                color="#1565C0"
              />

              <View style={styles.regionText}>
                <Text style={styles.selectedRegionTitle}>
                  {selectedRegion.name}
                </Text>

                <Text style={styles.regionType}>
                  {selectedRegion.type} •{" "}
                  {selectedRegion.districts.length} districts
                </Text>
              </View>
            </View>

            <Text style={styles.sectionTitle}>
              Select District
            </Text>

            <Text style={styles.noteText}>
              District names are loaded from the dataset.
              Skill demand values are demonstration values.
            </Text>

            {selectedRegion.districts.map((district) => (
              <Pressable
                key={district.name}
                style={styles.districtCard}
                onPress={() => selectDistrict(district)}
              >
                <View style={styles.districtIcon}>
                  <MaterialCommunityIcons
                    name="map-marker-outline"
                    size={22}
                    color="#1565C0"
                  />
                </View>

                <View style={styles.regionText}>
                  <Text style={styles.regionName}>
                    {district.name}
                  </Text>

                  <Text style={styles.regionType}>
                    Skill demand: {district.demand}
                  </Text>
                </View>

                <View
                  style={[
                    styles.demandDot,
                    {
                      backgroundColor: demandColor(
                        district.demand
                      ),
                    },
                  ]}
                />
              </Pressable>
            ))}
          </>
        )}

        {/* DISTRICT DETAILS */}
        {selectedDistrict && selectedRegion && (
          <>
            <BackButton
              label="Back to Districts"
              onPress={goBackToDistricts}
            />

            <View style={styles.detailsCard}>
              <View style={styles.detailsHeader}>
                <View style={styles.regionText}>
                  <Text style={styles.detailsTitle}>
                    {selectedDistrict.name}
                  </Text>

                  <Text style={styles.detailsSubtitle}>
                    {selectedRegion.name} • District Skill Demand
                  </Text>
                </View>

                <View
                  style={[
                    styles.demandBadge,
                    {
                      backgroundColor: demandColor(
                        selectedDistrict.demand
                      ),
                    },
                  ]}
                >
                  <Text style={styles.demandText}>
                    {selectedDistrict.demand}
                  </Text>
                </View>
              </View>

              {/* STATISTICS */}
              <View style={styles.statsRow}>
                <StatCard
                  icon="briefcase-outline"
                  value={selectedDistrict.jobs}
                  label="Job Openings"
                />

                <StatCard
                  icon="account-group-outline"
                  value={selectedDistrict.learners}
                  label="Learners"
                />

                <StatCard
                  icon="school-outline"
                  value={selectedDistrict.training}
                  label="Training"
                />
              </View>

              {/* SKILLS */}
              <Text style={styles.sectionTitle}>
                Most Demanded Skills
              </Text>

              {selectedDistrict.skills.map((skill, index) => (
                <View key={skill} style={styles.skillRow}>
                  <View style={styles.skillNumber}>
                    <Text style={styles.skillNumberText}>
                      {index + 1}
                    </Text>
                  </View>

                  <Text style={styles.skillName}>{skill}</Text>

                  <MaterialCommunityIcons
                    name="trending-up"
                    size={20}
                    color="#2A9D8F"
                  />
                </View>
              ))}

              {/* GOVERNMENT ACTION */}
              <View style={styles.recommendationCard}>
                <MaterialCommunityIcons
                  name="lightbulb-on-outline"
                  size={25}
                  color="#F77F00"
                />

                <View style={styles.recommendationText}>
                  <Text style={styles.recommendationTitle}>
                    Recommended Government Action
                  </Text>

                  <Text style={styles.recommendationDescription}>
                    Plan additional training seats, trainers,
                    and skill development programs according to
                    the demand in {selectedDistrict.name}.
                  </Text>
                </View>
              </View>
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

/* SUMMARY CARD */
function SummaryCard({
  number,
  label,
}: {
  number: number;
  label: string;
}) {
  return (
    <View style={styles.summaryCard}>
      <Text style={styles.summaryNumber}>{number}</Text>
      <Text style={styles.summaryLabel}>{label}</Text>
    </View>
  );
}

/* HEATMAP ROW */
function HeatmapRow({
  color,
  label,
  number,
}: {
  color: string;
  label: string;
  number: number;
}) {
  return (
    <View style={styles.heatmapRow}>
      <View
        style={[
          styles.heatmapColor,
          { backgroundColor: color },
        ]}
      />

      <Text style={styles.heatmapLabel}>{label}</Text>

      <Text style={styles.heatmapNumber}>{number}</Text>
    </View>
  );
}

/* BACK BUTTON */
function BackButton({
  label,
  onPress,
}: {
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable style={styles.backButton} onPress={onPress}>
      <MaterialCommunityIcons
        name="arrow-left"
        size={19}
        color="#1565C0"
      />

      <Text style={styles.backButtonText}>{label}</Text>
    </Pressable>
  );
}

/* STAT CARD */
function StatCard({
  icon,
  value,
  label,
}: {
  icon: React.ComponentProps<
    typeof MaterialCommunityIcons
  >["name"];
  value: number;
  label: string;
}) {
  return (
    <View style={styles.statCard}>
      <MaterialCommunityIcons
        name={icon}
        size={21}
        color="#1565C0"
      />

      <Text style={styles.statValue}>{value}</Text>

      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

/* STYLES */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F7FA",
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1565C0",
    paddingHorizontal: 18,
    paddingVertical: 16,
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

  headerText: {
    flex: 1,
  },

  headerTitle: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "800",
  },

  headerSubtitle: {
    color: "#DCEBFF",
    fontSize: 12,
    marginTop: 4,
  },

  breadcrumb: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 18,
    paddingVertical: 12,
  },

  homeText: {
    color: "#1565C0",
    fontSize: 14,
    fontWeight: "800",
  },

  breadcrumbText: {
    color: "#444444",
    fontSize: 13,
    fontWeight: "700",
    flexShrink: 1,
  },

  arrow: {
    color: "#777777",
    fontSize: 20,
    marginHorizontal: 8,
  },

  content: {
    flex: 1,
  },

  contentContainer: {
    padding: 18,
    paddingBottom: 40,
  },

  loadingCard: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 25,
    marginBottom: 16,
  },

  loadingText: {
    color: "#555555",
    fontSize: 13,
    marginTop: 12,
  },

  errorCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFEBEE",
    borderRadius: 14,
    padding: 15,
    marginBottom: 16,
  },

  errorText: {
    flex: 1,
    color: "#B71C1C",
    fontSize: 12,
    marginLeft: 10,
  },

  heroCard: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    padding: 22,
    borderRadius: 18,
    marginBottom: 16,
  },

  heroTitle: {
    color: "#202124",
    fontSize: 21,
    fontWeight: "800",
    textAlign: "center",
    marginTop: 10,
  },

  heroDescription: {
    color: "#6B7280",
    fontSize: 13,
    textAlign: "center",
    lineHeight: 20,
    marginTop: 8,
  },

  demoBadge: {
    backgroundColor: "#E3F2FD",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 7,
    marginTop: 14,
  },

  demoBadgeText: {
    color: "#1565C0",
    fontSize: 10,
    fontWeight: "800",
  },

  searchInput: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#D5DCE5",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 14,
    marginBottom: 14,
    color: "#202124",
  },

  summaryRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 20,
  },

  summaryCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: "center",
  },

  summaryNumber: {
    color: "#1565C0",
    fontSize: 22,
    fontWeight: "800",
  },

  summaryLabel: {
    color: "#6B7280",
    fontSize: 10,
    marginTop: 4,
  },

  sectionTitle: {
    color: "#202124",
    fontSize: 19,
    fontWeight: "800",
    marginTop: 10,
    marginBottom: 10,
  },

  heatmapCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    marginBottom: 18,
  },

  heatmapDescription: {
    color: "#6B7280",
    fontSize: 12,
    marginBottom: 14,
  },

  heatmapRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },

  heatmapColor: {
    width: 18,
    height: 18,
    borderRadius: 5,
    marginRight: 10,
  },

  heatmapLabel: {
    flex: 1,
    color: "#202124",
    fontSize: 13,
    fontWeight: "600",
  },

  heatmapNumber: {
    color: "#1565C0",
    fontSize: 17,
    fontWeight: "800",
  },

  regionCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 14,
    marginBottom: 9,
  },

  regionIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: "#E3F2FD",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },

  regionText: {
    flex: 1,
  },

  regionName: {
    color: "#202124",
    fontSize: 14,
    fontWeight: "800",
  },

  regionType: {
    color: "#6B7280",
    fontSize: 11,
    marginTop: 4,
  },

  selectedRegionCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E3F2FD",
    borderRadius: 15,
    padding: 16,
    marginBottom: 14,
  },

  selectedRegionTitle: {
    color: "#1565C0",
    fontSize: 20,
    fontWeight: "800",
  },

  noteText: {
    color: "#6B7280",
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 12,
  },

  emptyText: {
    color: "#6B7280",
    textAlign: "center",
    paddingVertical: 20,
  },

  districtCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 14,
    marginBottom: 9,
  },

  districtIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: "#E3F2FD",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },

  demandDot: {
    width: 13,
    height: 13,
    borderRadius: 7,
  },

  backButton: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },

  backButtonText: {
    color: "#1565C0",
    fontSize: 13,
    fontWeight: "700",
    marginLeft: 6,
  },

  detailsCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
  },

  detailsHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },

  detailsTitle: {
    color: "#202124",
    fontSize: 22,
    fontWeight: "800",
  },

  detailsSubtitle: {
    color: "#6B7280",
    fontSize: 12,
    marginTop: 4,
  },

  demandBadge: {
    borderRadius: 20,
    paddingHorizontal: 9,
    paddingVertical: 7,
    marginLeft: 8,
  },

  demandText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "800",
  },

  statsRow: {
    flexDirection: "row",
    gap: 8,
  },

  statCard: {
    flex: 1,
    backgroundColor: "#F5F7FA",
    borderRadius: 12,
    padding: 10,
    minHeight: 100,
  },

  statValue: {
    color: "#1565C0",
    fontSize: 18,
    fontWeight: "800",
    marginTop: 7,
  },

  statLabel: {
    color: "#6B7280",
    fontSize: 10,
    marginTop: 4,
  },

  skillRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F5F7FA",
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
  },

  skillNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#E3F2FD",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },

  skillNumberText: {
    color: "#1565C0",
    fontWeight: "800",
  },

  skillName: {
    flex: 1,
    color: "#202124",
    fontSize: 14,
    fontWeight: "700",
  },

  recommendationCard: {
    flexDirection: "row",
    backgroundColor: "#FFF3E0",
    borderRadius: 14,
    padding: 14,
    marginTop: 12,
  },

  recommendationText: {
    flex: 1,
    marginLeft: 10,
  },

  recommendationTitle: {
    color: "#8A4B08",
    fontSize: 14,
    fontWeight: "800",
  },

  recommendationDescription: {
    color: "#8A4B08",
    fontSize: 12,
    lineHeight: 18,
    marginTop: 5,
  },
});