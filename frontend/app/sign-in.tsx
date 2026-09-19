import { Redirect } from "expo-router";

import { useAuth } from "@/src/auth-context";
import { AuthScreen } from "@/src/screens/auth-screen";

// Symmetric to the (tabs) guard: once a session exists, leave this screen.
export default function SignInRoute() {
  const { user } = useAuth();
  if (user) return <Redirect href="/(tabs)" />;
  return <AuthScreen />;
}
