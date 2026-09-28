import { Redirect } from "expo-router";

 import { useAuth } from "@/src/auth-context";
 import { EmployerJobsScreen } from "@/src/screens/employer/employer-jobs-screen";

 export default function EmployerJobsRoute() {
   const { loading, user } = useAuth();
   if (loading) return null;
   if (!user) return <Redirect href="/sign-in" />;
   if (user.role !== "EMPLOYER") return <Redirect href="/(tabs)" />;
   return <EmployerJobsScreen />;
 }