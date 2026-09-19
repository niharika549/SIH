import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Pressable, Text, View } from "react-native";

import type { Role } from "@/src/auth-context";
import { makeStyles, useTheme } from "@/src/theme";

const roleOptions: { role: Exclude<Role, "ADMIN">; label: string; icon: keyof typeof MaterialCommunityIcons.glyphMap }[] = [
  { role: "TRAINEE", label: "Trainee", icon: "school-outline" },
  { role: "TRAINER", label: "Trainer", icon: "human-male-board" },
  { role: "EMPLOYER", label: "Employer", icon: "office-building-outline" },
  { role: "GOVERNMENT", label: "Government", icon: "bank-outline" },
];

export function RoleSelector({ value, onChange }: { value: Exclude<Role, "ADMIN">; onChange: (role: Exclude<Role, "ADMIN">) => void }) {
  const styles = useStyles();
  const { colors } = useTheme();
  return (
    <View style={styles.container} accessibilityRole="radiogroup">
      {roleOptions.map((option) => {
        const selected = option.role === value;
        return (
          <Pressable
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            key={option.role}
            onPress={() => onChange(option.role)}
            style={({ pressed }) => [styles.option, selected && styles.selected, pressed && styles.pressed]}
            testID={`role-${option.role.toLowerCase()}`}
          >
            <MaterialCommunityIcons name={option.icon} size={20} color={selected ? colors.onBrandPrimary : colors.brandPrimary} />
            <Text style={[styles.label, selected && styles.selectedLabel]}>{option.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  container: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  option: { alignItems: "center", borderColor: colors.border, borderRadius: 12, borderWidth: 1, flexDirection: "row", gap: 6, minHeight: 46, paddingHorizontal: 12 },
  selected: { backgroundColor: colors.brandPrimary, borderColor: colors.brandPrimary },
  pressed: { opacity: 0.78 },
  label: { color: colors.onSurfaceSecondary, fontSize: 13, fontWeight: "600" },
  selectedLabel: { color: colors.onBrandPrimary },
}));