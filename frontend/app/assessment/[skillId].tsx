import { Redirect, useLocalSearchParams } from "expo-router";

import { useAuth } from "@/src/auth-context";
import { AssessmentScreen } from "@/src/screens/trainee/assessment-screen";

export default function AssessmentRoute() {
  const { skillId } = useLocalSearchParams<{ skillId: string }>();
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Redirect href="/sign-in" />;
  if (user.role !== "TRAINEE") return <Redirect href="/(tabs)" />;
  if (!skillId) return <Redirect href="/(tabs)" />;
  return <AssessmentScreen skillId={skillId} />;
}
