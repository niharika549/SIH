import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Redirect, Tabs } from "expo-router";
import { NativeTabs } from "expo-router/unstable-native-tabs";
import { ActivityIndicator, Platform, View } from "react-native";

import { useAuth } from "@/src/auth-context";
import { usesNativeTabs } from "@/src/navigation";
import { useTheme } from "@/src/theme";

// Single auth guard for every tab screen. When the session ends (sign-out,
// expired token) the layout redirects to /sign-in, which renders the auth
// screen. Screens must not run their own redirect guards.
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
      <Tabs.Screen name="profile" options={{ title: "Profile", tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="account-circle-outline" color={color} size={size} /> }} />
    </Tabs>
  );
}
