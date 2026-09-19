import { Redirect } from "expo-router";
import { ActivityIndicator, View } from "react-native";

import { useAuth } from "@/src/auth-context";
import { makeStyles, useTheme } from "@/src/theme";

// Pure dispatcher. Never renders content, only routes. `/` stays ambiguous
// with `(tabs)/index`, so redirects always name their target explicitly.
export default function Index() {
  const styles = useStyles();
  const { colors } = useTheme();
  const { loading, user } = useAuth();
  if (loading) {
    return <View style={styles.loading}><ActivityIndicator color={colors.brandPrimary} size="large" /></View>;
  }
  if (!user) return <Redirect href="/sign-in" />;
  if (user.role === "TRAINEE" && !user.profile_complete) return <Redirect href="/onboarding" />;
  return <Redirect href="/(tabs)" />;
}

const useStyles = makeStyles((colors) => ({
  loading: { alignItems: "center", backgroundColor: colors.surface, flex: 1, justifyContent: "center" },
}));
