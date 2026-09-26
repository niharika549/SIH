 import { Redirect, useLocalSearchParams } from "expo-router";

 import { useAuth } from "@/src/auth-context";
 import { EmployerJobDetailScreen } from "@/src/screens/employer/employer-job-detail-screen";

 export default function EmployerJobDetailRoute() {
   const { jobId } = useLocalSearchParams<{ jobId: string }>();
   const { user, loading } = useAuth();
   if (loading) return null;
   if (!user) return <Redirect href="/sign-in" />;
   if (user.role !== "EMPLOYER") return <Redirect href="/(tabs)" />;
   if (!jobId) return <Redirect href="/(tabs)" />;
   return <EmployerJobDetailScreen jobId={jobId} />;
 }