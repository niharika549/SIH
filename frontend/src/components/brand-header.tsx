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
      {!compact ? <Text style={styles.tagline}>From learning to earning</Text> : null}
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  container: { alignItems: "center", gap: 2 },
  compact: { alignItems: "flex-start" },
  logo: { width: 210, height: 170 },
  compactLogo: { width: 128, height: 58 },
  tagline: { color: colors.muted, fontSize: 13, letterSpacing: 0.4 },
}));