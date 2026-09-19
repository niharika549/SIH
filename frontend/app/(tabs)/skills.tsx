import { Redirect } from "expo-router";

import { useAuth } from "@/src/auth-context";
import { SkillsScreen } from "@/src/screens/trainee/skills-screen";

export default function SkillsRoute() {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Redirect href="/sign-in" />;
  if (user.role !== "TRAINEE") return <Redirect href="/(tabs)" />;
  return <SkillsScreen />;
}
