import { Redirect } from "expo-router";

import { useAuth } from "@/src/auth-context";
import { CareerScreen } from "@/src/screens/trainee/career-screen";

export default function CareerRoute() {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Redirect href="/sign-in" />;
  if (user.role !== "TRAINEE") return <Redirect href="/(tabs)" />;
  return <CareerScreen />;
}
