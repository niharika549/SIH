import { Redirect } from "expo-router";

import { useAuth } from "@/src/auth-context";
import { OnboardingScreen } from "@/src/screens/trainee/onboarding-screen";

// Trainee-only route. Non-trainees or already-onboarded users go straight to
// the tabs — keeps navigation deterministic even on refresh.
export default function OnboardingRoute() {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Redirect href="/sign-in" />;
  if (user.role !== "TRAINEE" || user.profile_complete) return <Redirect href="/(tabs)" />;
  return <OnboardingScreen />;
}
