import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Link } from "expo-router";
import { ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "@/src/auth-context";
import { BrandHeader } from "@/src/components/brand-header";
import { usesNativeTabs } from "@/src/navigation";
import { makeStyles, useTheme } from "@/src/theme";

const roleCopy = {
  TRAINEE: { title: "Your learning path", subtitle: "Build a verified skills profile for your next opportunity.", icon: "school-outline" },
  TRAINER: { title: "Your training workspace", subtitle: "Prepare to guide learners through measurable progress.", icon: "human-male-board" },
  EMPLOYER: { title: "Your hiring workspace", subtitle: "Connect verified skills to the workforce you need.", icon: "office-building-outline" },
  GOVERNMENT: { title: "Your intelligence workspace", subtitle: "Review workforce signals within your approved scope.", icon: "bank-outline" },
  ADMIN: { title: "Your control center", subtitle: "Keep platform access and evidence trustworthy.", icon: "shield-account-outline" },
} as const;

export function HomeScreen() {
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  if (!user) return null;
  const content = roleCopy[user.role];
  const firstName = user.full_name.split(" ")[0];
  const bottomChrome = usesNativeTabs ? insets.bottom : 0;
  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={[styles.content, { paddingTop: insets.top + 18, paddingBottom: bottomChrome + 24 }]}>
        <View style={styles.topRow}><BrandHeader compact /><View style={styles.roleBadge}><MaterialCommunityIcons name={content.icon} size={16} color={colors.onBrandTertiary} /><Text style={styles.roleText}>{user.role}</Text></View></View>
        <Text style={styles.eyebrow}>GOOD MORNING, {firstName.toUpperCase()}</Text>
        <Text style={styles.title}>{content.title}</Text>
        <Text style={styles.subtitle}>{content.subtitle}</Text>
        <View style={styles.heroCard}>
          <View style={styles.heroIcon}><MaterialCommunityIcons name="progress-check" size={24} color={colors.onBrandPrimary} /></View>
          <View style={styles.heroCopy}><Text style={styles.heroTitle}>Foundation connected</Text><Text style={styles.heroText}>Your secure role workspace is ready. Complete your profile to unlock the next SkillAlign journey.</Text></View>
        </View>
        <Text style={styles.sectionTitle}>Next steps</Text>
        <View style={styles.grid}>
          <InfoCard icon="account-edit-outline" title="Complete profile" text={user.profile_complete ? "Profile complete" : "Add your details"} />
          <InfoCard icon="bell-outline" title="Notifications" text="In-app alerts will appear here" />
          <InfoCard icon="lock-outline" title="Privacy first" text="Your access stays role-scoped" />
          <InfoCard icon="chart-timeline-variant" title="Skill alignment" text="Coming with your portal" />
        </View>
        <Link href="/profile" asChild><Text style={styles.profileLink}>Review account and access details →</Text></Link>
      </ScrollView>
    </View>
  );
}

function InfoCard({ icon, title, text }: { icon: keyof typeof MaterialCommunityIcons.glyphMap; title: string; text: string }) {
  const styles = useStyles();
  const { colors } = useTheme();
  return <View style={styles.infoCard}><MaterialCommunityIcons name={icon} size={22} color={colors.brandPrimary} /><Text style={styles.infoTitle}>{title}</Text><Text style={styles.infoText}>{text}</Text></View>;
}

const useStyles = makeStyles((colors) => ({
  root: { backgroundColor: colors.surface, flex: 1 },
  content: { gap: 12, paddingHorizontal: 20 },
  topRow: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  roleBadge: { alignItems: "center", backgroundColor: colors.brandTertiary, borderRadius: 999, flexDirection: "row", gap: 5, paddingHorizontal: 10, paddingVertical: 7 },
  roleText: { color: colors.onBrandTertiary, fontSize: 11, fontWeight: "800" },
  eyebrow: { color: colors.brandPrimary, fontSize: 11, fontWeight: "800", letterSpacing: 1, marginTop: 18 },
  title: { color: colors.onSurface, fontSize: 28, fontWeight: "800", lineHeight: 34 },
  subtitle: { color: colors.muted, fontSize: 15, lineHeight: 22, maxWidth: 340 },
  heroCard: { alignItems: "center", backgroundColor: colors.brandPrimary, borderRadius: 20, flexDirection: "row", gap: 14, marginTop: 18, padding: 18 },
  heroIcon: { alignItems: "center", backgroundColor: colors.brandSecondary, borderRadius: 26, height: 52, justifyContent: "center", width: 52 },
  heroCopy: { flex: 1, gap: 5 },
  heroTitle: { color: colors.onBrandPrimary, fontSize: 17, fontWeight: "800" },
  heroText: { color: colors.onBrandPrimary, fontSize: 13, lineHeight: 19 },
  sectionTitle: { color: colors.onSurface, fontSize: 19, fontWeight: "800", marginTop: 18 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  infoCard: { backgroundColor: colors.surfaceSecondary, borderColor: colors.border, borderRadius: 16, borderWidth: 1, gap: 7, minHeight: 126, padding: 14, width: "48%" },
  infoTitle: { color: colors.onSurface, fontSize: 14, fontWeight: "800" },
  infoText: { color: colors.muted, fontSize: 12, lineHeight: 17 },
  profileLink: { color: colors.brandPrimary, fontSize: 14, fontWeight: "700", marginTop: 12, paddingVertical: 12 },
}));