import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Text, View } from "react-native";

import type { Proficiency, SkillSource } from "@/src/api/authed";
import { PROFICIENCY_LABEL } from "@/src/api/authed";
import { makeStyles, useTheme } from "@/src/theme";

export function ProficiencyBadge({ level, source }: { level: Proficiency; source?: SkillSource | null }) {
  const styles = useStyles();
  const { colors } = useTheme();
  const palette: Record<Proficiency, { bg: string; fg: string; icon: keyof typeof MaterialCommunityIcons.glyphMap }> = {
    NONE: { bg: colors.surfaceTertiary, fg: colors.muted, icon: "circle-outline" },
    BEGINNER: { bg: colors.brandTertiary, fg: colors.onBrandTertiary, icon: "seed-outline" },
    INTERMEDIATE: { bg: colors.brandTertiary, fg: colors.onBrandTertiary, icon: "chart-line-variant" },
    ADVANCED: { bg: colors.success, fg: colors.onSuccess, icon: "trophy-outline" },
  };
  const p = palette[level];
  return (
    <View style={[styles.badge, { backgroundColor: p.bg }]} testID={`proficiency-${level.toLowerCase()}`}>
      <MaterialCommunityIcons name={p.icon} size={13} color={p.fg} />
      <Text style={[styles.text, { color: p.fg }]}>{PROFICIENCY_LABEL[level]}</Text>
      {source ? <Text style={[styles.text, { color: p.fg, opacity: 0.85 }]}>· {sourceShort(source)}</Text> : null}
    </View>
  );
}

function sourceShort(source: SkillSource) {
  if (source === "SELF_DECLARED") return "self";
  if (source === "ASSESSED") return "assessed";
  return "verified";
}

const useStyles = makeStyles(() => ({
  badge: { alignItems: "center", alignSelf: "flex-start", borderRadius: 999, flexDirection: "row", gap: 4, paddingHorizontal: 9, paddingVertical: 4 },
  text: { fontSize: 11, fontWeight: "800", letterSpacing: 0.3 },
}));
