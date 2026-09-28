// frontend/src/screens/employer/employer-profile-screen.tsx
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import type { EmployerProfile } from "@/src/api/authed";
import { useAuthedRequest } from "@/src/api/authed";
import { ApiError } from "@/src/api/client";
import { useAuth } from "@/src/auth-context";
import { makeStyles, useTheme } from "@/src/theme";

export function EmployerProfileScreen() {
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const authed = useAuthedRequest();
  const queryClient = useQueryClient();
  const { refresh } = useAuth();

  const profileQuery = useQuery({
    queryKey: ["employer", "profile"],
    queryFn: () => authed<EmployerProfile | null>("/employer/profile"),
  });

  const [companyName, setCompanyName] = useState("");
  const [industry, setIndustry] = useState("");
  const [companySize, setCompanySize] = useState("");
  const [website, setWebsite] = useState("");
  const [about, setAbout] = useState("");
  const [stateCode, setStateCode] = useState("");
  const [districtCode, setDistrictCode] = useState("");
  const [error, setError] = useState("");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (profileQuery.data && !loaded) {
      const p = profileQuery.data;
      setCompanyName(p.company_name);
      setIndustry(p.industry);
      setCompanySize(p.company_size);
      setWebsite(p.website);
      setAbout(p.about);
      setStateCode(p.state_code ?? "");
      setDistrictCode(p.district_code ?? "");
      setLoaded(true);
    }
  }, [profileQuery.data, loaded]);

  const saveMutation = useMutation({
    mutationFn: () =>
      authed("/employer/profile", {
        method: "POST",
        body: {
          company_name: companyName.trim(),
          industry: industry.trim(),
          company_size: companySize.trim(),
          website: website.trim(),
          logo_url: "",
          about: about.trim(),
          state_code: stateCode.trim() || null,
          district_code: districtCode.trim() || null,
        },
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["employer", "profile"] });
      await refresh();
      setError("");
    },
    onError: (e) => setError(e instanceof ApiError ? e.message : "Unable to save profile."),
  });

  const canSave = companyName.trim().length >= 2;
  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={[styles.content, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 28 }]} keyboardShouldPersistTaps="handled">
        <Pressable onPress={() => router.back()} style={styles.backBtn} testID="employer-profile-back">
          <MaterialCommunityIcons name="chevron-left" size={22} color={colors.onSurface} />
          <Text style={styles.backText}>Back</Text>
        </Pressable>
        <Text style={styles.eyebrow}>EMPLOYER PROFILE</Text>
        <Text style={styles.title}>Your company</Text>
        <Text style={styles.subtitle}>Shown to trainees on every job you post, and used for district/industry demand analytics.</Text>
        {profileQuery.isPending ? <ActivityIndicator color={colors.brandPrimary} /> : null}

        <Field label="Company name" value={companyName} onChange={setCompanyName} placeholder="e.g. Acme Robotics Pvt Ltd" testID="ep-company-name" />
        <Field label="Industry" value={industry} onChange={setIndustry} placeholder="e.g. Manufacturing, IT Services" testID="ep-industry" />
        <Field label="Company size" value={companySize} onChange={setCompanySize} placeholder="e.g. 11-50 employees" testID="ep-company-size" />
        <Field label="Website" value={website} onChange={setWebsite} placeholder="https://..." testID="ep-website" />
        <Field label="About" value={about} onChange={setAbout} placeholder="What your company does" multiline testID="ep-about" />
        <View style={styles.formRow}>
          <View style={{ flex: 1 }}><Field label="State" value={stateCode} onChange={setStateCode} placeholder="e.g. Andhra Pradesh" testID="ep-state" /></View>
          <View style={{ flex: 1 }}><Field label="District" value={districtCode} onChange={setDistrictCode} placeholder="e.g. Guntur" testID="ep-district" /></View>
        </View>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}
        <Pressable
          onPress={() => canSave && saveMutation.mutate()}
          disabled={!canSave || saveMutation.isPending}
          style={[styles.primaryBtn, (!canSave || saveMutation.isPending) && styles.disabled]}
          testID="ep-save"
        >
          {saveMutation.isPending ? <ActivityIndicator color={colors.onBrandPrimary} /> : <Text style={styles.primaryText}>Save Profile</Text>}
        </Pressable>
      </ScrollView>
    </View>
  );
}

function Field({ label, value, onChange, placeholder, keyboardType, multiline, testID }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string;
  keyboardType?: "default" | "numeric"; multiline?: boolean; testID?: string;
}) {
  const styles = useStyles();
  const { colors } = useTheme();
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={colors.muted}
        keyboardType={keyboardType ?? "default"}
        multiline={!!multiline}
        style={[styles.input, multiline && { minHeight: 90, paddingTop: 12, textAlignVertical: "top" }]}
        testID={testID}
      />
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  root: { backgroundColor: colors.surface, flex: 1 },
  content: { gap: 10, paddingHorizontal: 20 },
  backBtn: { alignItems: "center", alignSelf: "flex-start", flexDirection: "row", gap: 2, paddingRight: 12, paddingVertical: 8 },
  backText: { color: colors.onSurface, fontSize: 14, fontWeight: "700" },
  eyebrow: { color: colors.brandPrimary, fontSize: 11, fontWeight: "800", letterSpacing: 1 },
  title: { color: colors.onSurface, fontSize: 24, fontWeight: "800" },
  subtitle: { color: colors.muted, fontSize: 13, lineHeight: 19, marginBottom: 6 },
  field: { gap: 6, marginTop: 6 },
  fieldLabel: { color: colors.onSurfaceSecondary, fontSize: 13, fontWeight: "700", marginTop: 10 },
  input: { backgroundColor: colors.surfaceSecondary, borderColor: colors.border, borderRadius: 12, borderWidth: 1, color: colors.onSurface, fontSize: 15, minHeight: 48, paddingHorizontal: 14 },
  formRow: { flexDirection: "row", gap: 10 },
  errorText: { color: colors.error, fontSize: 13, marginTop: 8 },
  primaryBtn: { alignItems: "center", backgroundColor: colors.brandPrimary, borderRadius: 12, justifyContent: "center", marginTop: 20, minHeight: 50 },
  primaryText: { color: colors.onBrandPrimary, fontSize: 15, fontWeight: "800" },
  disabled: { opacity: 0.5 },
}));
