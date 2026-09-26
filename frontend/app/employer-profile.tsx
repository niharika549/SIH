import { Redirect } from "expo-router";

import { useAuth } from "@/src/auth-context";
import { EmployerProfileScreen } from "@/src/screens/employer/employer-profile-screen";

export default function EmployerProfileRoute() {
  const { loading, user } = useAuth();
  if (loading) return null;
  if (!user) return <Redirect href="/sign-in" />;
  if (user.role !== "EMPLOYER") return <Redirect href="/(tabs)" />;
  return <EmployerProfileScreen />;
}
