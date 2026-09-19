import { Redirect } from "expo-router";

import { useAuth } from "@/src/auth-context";
import { TrainerLearnersScreen } from "@/src/screens/trainer/trainer-learners-screen";

export default function TrainerLearnersRoute() {
  const { loading, user } = useAuth();
  if (loading) return null;
  if (!user) return <Redirect href="/sign-in" />;
  if (user.role !== "TRAINER") return <Redirect href="/(tabs)" />;
  return <TrainerLearnersScreen />;
}
