import { Redirect } from "expo-router";

import { useAuth } from "@/src/auth-context";
import { TrainerProfileScreen } from "@/src/screens/trainer/trainer-profile-screen";

export default function TrainerProfileRoute() {
  const { loading, user } = useAuth();
  if (loading) return null;
  if (!user) return <Redirect href="/sign-in" />;
  if (user.role !== "TRAINER") return <Redirect href="/(tabs)" />;
  return <TrainerProfileScreen />;
}
