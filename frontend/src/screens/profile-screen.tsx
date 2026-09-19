import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "@/src/auth-context";
import { BrandHeader } from "@/src/components/brand-header";
import { usesNativeTabs } from "@/src/navigation";
import { makeStyles, useTheme } from "@/src/theme";

export function ProfileScreen() {
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { user, signOut } = useAuth();
  if (!user) return null;
  const bottomChrome = usesNativeTabs ? insets.bottom : 0;
  const joined = new Date(user.created_at).toLocaleDateString(undefined, { month: "short", year: "numeric" });
  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={[styles.content, { paddingTop: insets.top + 18, paddingBottom: bottomChrome + 28 }]}>
        <BrandHeader compact />
        <Text style={styles.eyebrow}>ACCOUNT</Text>
        <Text style={styles.title}>Your access profile</Text>
        <View style={styles.identityCard}>
          <View style={styles.avatar}><Text style={styles.avatarText}>{user.full_name.slice(0, 1).toUpperCase()}</Text></View>
          <View style={styles.identityCopy}><Text style={styles.name}>{user.full_name}</Text><Text style={styles.email}>{user.email}</Text><View style={styles.badge}><Text style={styles.badgeText}>{user.role}</Text></View></View>
        </View>
        <Text style={styles.sectionTitle}>Access and privacy</Text>
        <DetailRow icon="check-decagram-outline" label="Account status" value={user.account_status} color={colors.success} />
        <DetailRow icon="shield-lock-outline" label="Role scope" value="Server-authorized" color={colors.brandPrimary} />
        <DetailRow icon="calendar-outline" label="Member since" value={joined} color={colors.muted} />
        <View style={styles.privacyCard}><MaterialCommunityIcons name="account-lock-outline" size={22} color={colors.brandPrimary} /><Text style={styles.privacyText}>SkillAlign keeps role access on the server. Personal details stay private until a future portal flow records your consent.</Text></View>
        <Pressable accessibilityRole="button" onPress={async () => { await signOut(); }} style={({ pressed }) => [styles.logout, pressed && styles.pressed]} testID="logout-button"><MaterialCommunityIcons name="logout" size={19} color={colors.error} /><Text style={styles.logoutText}>Sign out</Text></Pressable>
      </ScrollView>
    </View>
  );
}

function DetailRow({ icon, label, value, color }: { icon: keyof typeof MaterialCommunityIcons.glyphMap; label: string; value: string; color: string }) {
  const styles = useStyles();
  const { colors } = useTheme();
  return <View style={styles.detailRow}><MaterialCommunityIcons name={icon} size={21} color={color} /><View style={styles.detailCopy}><Text style={styles.detailLabel}>{label}</Text><Text style={styles.detailValue}>{value}</Text></View><MaterialCommunityIcons name="chevron-right" size={20} color={colors.borderStrong} /></View>;
}

const useStyles = makeStyles((colors) => ({
  root: { backgroundColor: colors.surface, flex: 1 },
  content: { gap: 12, paddingHorizontal: 20 },
  eyebrow: { color: colors.brandPrimary, fontSize: 11, fontWeight: "800", letterSpacing: 1, marginTop: 22 },
  title: { color: colors.onSurface, fontSize: 28, fontWeight: "800", lineHeight: 34 },
  identityCard: { alignItems: "center", backgroundColor: colors.surfaceSecondary, borderColor: colors.border, borderRadius: 18, borderWidth: 1, flexDirection: "row", gap: 14, marginTop: 14, padding: 16 },
  avatar: { alignItems: "center", backgroundColor: colors.brandPrimary, borderRadius: 32, height: 64, justifyContent: "center", width: 64 },
  avatarText: { color: colors.onBrandPrimary, fontSize: 26, fontWeight: "800" },
  identityCopy: { flex: 1, gap: 4 },
  name: { color: colors.onSurface, fontSize: 17, fontWeight: "800" },
  email: { color: colors.muted, fontSize: 13 },
  badge: { alignSelf: "flex-start", backgroundColor: colors.brandTertiary, borderRadius: 999, marginTop: 3, paddingHorizontal: 9, paddingVertical: 4 },
  badgeText: { color: colors.onBrandTertiary, fontSize: 10, fontWeight: "800" },
  sectionTitle: { color: colors.onSurface, fontSize: 18, fontWeight: "800", marginTop: 18 },
  detailRow: { alignItems: "center", backgroundColor: colors.surfaceSecondary, borderBottomColor: colors.divider, borderBottomWidth: 1, flexDirection: "row", gap: 12, minHeight: 64, paddingHorizontal: 6 },
  detailCopy: { flex: 1, gap: 3 },
  detailLabel: { color: colors.muted, fontSize: 12 },
  detailValue: { color: colors.onSurface, fontSize: 14, fontWeight: "700" },
  privacyCard: { alignItems: "flex-start", backgroundColor: colors.brandTertiary, borderRadius: 14, flexDirection: "row", gap: 10, marginTop: 16, padding: 14 },
  privacyText: { color: colors.onBrandTertiary, flex: 1, fontSize: 13, lineHeight: 19 },
  logout: { alignItems: "center", borderColor: colors.error, borderRadius: 12, borderWidth: 1, flexDirection: "row", gap: 8, justifyContent: "center", marginTop: 20, minHeight: 48 },
  logoutText: { color: colors.error, fontSize: 14, fontWeight: "800" },
  pressed: { opacity: 0.75 },
}));