import { Image, Text, View } from "react-native";

import { SKILLALIGN_LOGO_DATA_URI } from "@/src/branding/skillalign-logo";
import { makeStyles } from "@/src/theme";

export function BrandHeader({ compact = false }: { compact?: boolean }) {
  const styles = useStyles();
  return (
    <View style={[styles.container, compact && styles.compact]}>
      <Image
        accessibilityLabel="SkillAlign logo"
        resizeMode="contain"
        source={{ uri: SKILLALIGN_LOGO_DATA_URI }}
        style={compact ? styles.compactLogo : styles.logo}
      />


    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  container: {
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    marginBottom: 8,
  },

  compact: {
    alignItems: "flex-start",
    width: "auto",
    marginBottom: 0,
  },

  logo: {
    width: 320,
    height: 210,
    marginBottom: 2,
  },

  compactLogo: {
    width: 128,
    height: 58,
  },

  brandName: {
    color: colors.onSurface,
    fontSize: 28,
    fontWeight: "800",
    letterSpacing: 0.3,
    marginTop: -8,
  },

  tagline: {
    color: colors.muted,
    fontSize: 14,
    fontWeight: "500",
    letterSpacing: 0.5,
    marginTop: 4,
  },
}));
