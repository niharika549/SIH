import { Redirect } from "expo-router";

import { useAuth } from "@/src/auth-context";
import { AdminApprovalsScreen } from "@/src/screens/admin/admin-approvals-screen";

export default function AdminApprovalsRoute() {
  const { loading, user } = useAuth();
  if (loading) return null;
  if (!user) return <Redirect href="/sign-in" />;
  if (user.role !== "ADMIN") return <Redirect href="/(tabs)" />;
  return <AdminApprovalsScreen />;
}
