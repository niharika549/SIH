import { Redirect } from "expo-router";

import { useAuth } from "@/src/auth-context";
import { TrainerTrainingsScreen } from "@/src/screens/trainer/trainer-trainings-screen";

export default function TrainerTrainingsRoute() {
  const { loading, user } = useAuth();
  if (loading) return null;
  if (!user) return <Redirect href="/sign-in" />;
  if (user.role !== "TRAINER") return <Redirect href="/(tabs)" />;
  return <TrainerTrainingsScreen />;
}
