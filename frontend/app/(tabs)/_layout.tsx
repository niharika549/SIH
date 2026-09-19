import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Redirect, Tabs } from "expo-router";
import { NativeTabs } from "expo-router/unstable-native-tabs";
import { ActivityIndicator, Platform, View } from "react-native";

import { useAuth } from "@/src/auth-context";
import { usesNativeTabs } from "@/src/navigation";
import { useTheme } from "@/src/theme";

// Role-based tabs. Single auth guard here — screens never redirect on their own.
export default function TabsLayout() {
  const { colors } = useTheme();
  const { loading, user } = useAuth();
  if (loading) {
    return (
      <View style={{ alignItems: "center", backgroundColor: colors.surface, flex: 1, justifyContent: "center" }}>
        <ActivityIndicator color={colors.brandPrimary} size="large" />
      </View>
    );
  }
  if (!user) return <Redirect href="/sign-in" />;
  if (user.role === "TRAINEE" && !user.profile_complete) return <Redirect href="/onboarding" />;
  const isTrainee = user.role === "TRAINEE";
  const isTrainer = user.role === "TRAINER";
  const isAdmin = user.role === "ADMIN";
  if (usesNativeTabs) {
    return (
      <NativeTabs>
        <NativeTabs.Trigger name="index">
          <NativeTabs.Trigger.Icon sf="house.fill" />
          <NativeTabs.Trigger.Label>Home</NativeTabs.Trigger.Label>
        </NativeTabs.Trigger>
        {isTrainee ? (
          <NativeTabs.Trigger name="skills">
            <NativeTabs.Trigger.Icon sf="checklist" />
            <NativeTabs.Trigger.Label>Skills</NativeTabs.Trigger.Label>
          </NativeTabs.Trigger>
        ) : null}
        {isTrainee ? (
          <NativeTabs.Trigger name="career">
            <NativeTabs.Trigger.Icon sf="target" />
            <NativeTabs.Trigger.Label>Career</NativeTabs.Trigger.Label>
          </NativeTabs.Trigger>
        ) : null}
        {isTrainer ? (
          <NativeTabs.Trigger name="trainings">
            <NativeTabs.Trigger.Icon sf="book.closed" />
            <NativeTabs.Trigger.Label>Trainings</NativeTabs.Trigger.Label>
          </NativeTabs.Trigger>
        ) : null}
        {isTrainer ? (
          <NativeTabs.Trigger name="learners">
            <NativeTabs.Trigger.Icon sf="person.3" />
            <NativeTabs.Trigger.Label>Learners</NativeTabs.Trigger.Label>
          </NativeTabs.Trigger>
        ) : null}
        {isAdmin ? (
          <NativeTabs.Trigger name="approvals">
            <NativeTabs.Trigger.Icon sf="checkmark.seal" />
            <NativeTabs.Trigger.Label>Approvals</NativeTabs.Trigger.Label>
          </NativeTabs.Trigger>
        ) : null}
        <NativeTabs.Trigger name="profile">
          <NativeTabs.Trigger.Icon sf="person.crop.circle" />
          <NativeTabs.Trigger.Label>Profile</NativeTabs.Trigger.Label>
        </NativeTabs.Trigger>
      </NativeTabs>
    );
  }
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.brandPrimary,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: { ...(Platform.OS === "web" ? { height: 64 } : {}) },
        tabBarItemStyle: { alignSelf: "center" },
      }}
    >
      <Tabs.Screen name="index" options={{ title: "Home", tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="home-outline" color={color} size={size} /> }} />
      <Tabs.Screen name="skills" options={{ title: "Skills", href: isTrainee ? "/skills" : null, tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="format-list-checks" color={color} size={size} /> }} />
      <Tabs.Screen name="career" options={{ title: "Career", href: isTrainee ? "/career" : null, tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="target" color={color} size={size} /> }} />
      <Tabs.Screen name="trainings" options={{ title: "Trainings", href: isTrainer ? "/trainings" : null, tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="book-open-variant" color={color} size={size} /> }} />
      <Tabs.Screen name="learners" options={{ title: "Learners", href: isTrainer ? "/learners" : null, tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="account-group-outline" color={color} size={size} /> }} />
      <Tabs.Screen name="approvals" options={{ title: "Approvals", href: isAdmin ? "/approvals" : null, tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="check-decagram-outline" color={color} size={size} /> }} />
      <Tabs.Screen name="profile" options={{ title: "Profile", tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="account-circle-outline" color={color} size={size} /> }} />
    </Tabs>
  );
}
