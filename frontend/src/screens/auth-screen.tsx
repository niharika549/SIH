import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useState } from "react";
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ApiError } from "@/src/api/client";
import type { Role } from "@/src/auth-context";
import { useAuth } from "@/src/auth-context";
import { BrandHeader } from "@/src/components/brand-header";
import { RoleSelector } from "@/src/components/role-selector";
import { makeStyles, useTheme } from "@/src/theme";

type Mode = "signin" | "register";
type RegisterRole = Exclude<Role, "ADMIN">;

export function AuthScreen() {
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { signIn, register } = useAuth();
  const [mode, setMode] = useState<Mode>("signin");
  const [role, setRole] = useState<RegisterRole>("TRAINEE");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    setError("");
    setNotice("");
    if (mode === "register" && fullName.trim().length < 2) {
      setError("Please enter your full name.");
      return;
    }
    if (password.length < 8) {
      setError("Use a password with at least 8 characters.");
      return;
    }
    setSubmitting(true);
    try {
      if (mode === "signin") {
        await signIn({ email: email.trim(), password });
      } else {
        const result = await register({ full_name: fullName.trim(), email: email.trim(), password, role });
        if (result.message) {
          setNotice(result.message);
          setMode("signin");
        }
      }
    } catch (requestError) {
      setError(requestError instanceof ApiError ? requestError.message : "Unable to complete this request.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.root}>
      <ScrollView contentContainerStyle={[styles.content, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 28 }]} keyboardShouldPersistTaps="handled">
        <BrandHeader />
        <View style={styles.card}>
          <View style={styles.headingRow}>
            <View style={styles.iconCircle}><MaterialCommunityIcons name="shield-check-outline" size={22} color={colors.brandPrimary} /></View>
            <View style={styles.headingCopy}>
              <Text style={styles.title}>{mode === "signin" ? "Welcome back" : "Create your account"}</Text>
              <Text style={styles.subtitle}>{mode === "signin" ? "Access your SkillAlign workspace securely." : "Choose a role to begin your workforce journey."}</Text>
            </View>
          </View>
          <View style={styles.modeToggle} accessibilityRole="tablist">
            {(["signin", "register"] as Mode[]).map((item) => (
              <Pressable key={item} onPress={() => { setMode(item); setError(""); setNotice(""); }} style={[styles.modeTab, mode === item && styles.activeModeTab]} accessibilityRole="tab" accessibilityState={{ selected: mode === item }} testID={`auth-${item}-tab`}>
                <Text style={[styles.modeText, mode === item && styles.activeModeText]}>{item === "signin" ? "Sign in" : "Register"}</Text>
              </Pressable>
            ))}
          </View>
          {mode === "register" ? <Field label="Full name" value={fullName} onChangeText={setFullName} placeholder="Aarav Sharma" testID="register-name-input" /> : null}
          <Field label="Email address" value={email} onChangeText={setEmail} placeholder="you@example.com" keyboardType="email-address" autoCapitalize="none" testID="login-email-input" />
          <Field label="Password" value={password} onChangeText={setPassword} placeholder="Minimum 8 characters" secureTextEntry testID="login-password-input" />
          {mode === "register" ? <View style={styles.roleBlock}><Text style={styles.fieldLabel}>I am joining as</Text><RoleSelector value={role} onChange={setRole} /><Text style={styles.helper}>Employer and Government accounts require administrator verification.</Text></View> : null}
          {notice ? <View style={styles.notice}><MaterialCommunityIcons name="information-outline" size={18} color={colors.info} /><Text style={styles.noticeText}>{notice}</Text></View> : null}
          {error ? <View style={styles.error}><MaterialCommunityIcons name="alert-circle-outline" size={18} color={colors.error} /><Text style={styles.errorText}>{error}</Text></View> : null}
          <Pressable accessibilityRole="button" disabled={submitting} onPress={submit} style={({ pressed }) => [styles.submit, pressed && styles.pressed, submitting && styles.disabled]} testID={mode === "signin" ? "login-submit-button" : "register-submit-button"}>
            {submitting ? <ActivityIndicator color={colors.onBrandPrimary} /> : <Text style={styles.submitText}>{mode === "signin" ? "Continue securely" : "Create account"}</Text>}
          </Pressable>
          <Text style={styles.privacy}>By continuing, you agree to keep your profile information accurate and private.</Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Field(props: React.ComponentProps<typeof TextInput> & { label: string }) {
  const styles = useStyles();
  const { label, ...inputProps } = props;
  return <View style={styles.field}><Text style={styles.fieldLabel}>{label}</Text><TextInput {...inputProps} accessibilityLabel={label} placeholderTextColor={styles.placeholder.color} style={styles.input} /></View>;
}

const useStyles = makeStyles((colors) => ({
  root: { backgroundColor: colors.surface, flex: 1 },
  content: { flexGrow: 1, justifyContent: "center", paddingHorizontal: 20 },
  card: { backgroundColor: colors.surfaceSecondary, borderColor: colors.border, borderRadius: 20, borderWidth: 1, gap: 16, marginTop: 18, padding: 20 },
  headingRow: { alignItems: "center", flexDirection: "row", gap: 12 },
  headingCopy: { flex: 1, gap: 4 },
  iconCircle: { alignItems: "center", backgroundColor: colors.brandTertiary, borderRadius: 24, height: 44, justifyContent: "center", width: 44 },
  title: { color: colors.onSurface, fontSize: 22, fontWeight: "700" },
  subtitle: { color: colors.muted, fontSize: 14, lineHeight: 20 },
  modeToggle: { backgroundColor: colors.surfaceTertiary, borderRadius: 12, flexDirection: "row", padding: 4 },
  modeTab: { alignItems: "center", borderRadius: 9, flex: 1, minHeight: 42, justifyContent: "center" },
  activeModeTab: { backgroundColor: colors.surfaceSecondary },
  modeText: { color: colors.muted, fontSize: 14, fontWeight: "600" },
  activeModeText: { color: colors.brandPrimary },
  field: { gap: 7 },
  fieldLabel: { color: colors.onSurfaceSecondary, fontSize: 13, fontWeight: "700" },
  input: { backgroundColor: colors.surfaceTertiary, borderColor: colors.border, borderRadius: 12, borderWidth: 1, color: colors.onSurface, fontSize: 15, minHeight: 48, paddingHorizontal: 14 },
  placeholder: { color: colors.muted },
  roleBlock: { gap: 9 },
  helper: { color: colors.muted, fontSize: 12, lineHeight: 17 },
  notice: { alignItems: "flex-start", backgroundColor: colors.brandTertiary, borderRadius: 10, flexDirection: "row", gap: 8, padding: 11 },
  noticeText: { color: colors.onBrandTertiary, flex: 1, fontSize: 13, lineHeight: 18 },
  error: { alignItems: "flex-start", backgroundColor: colors.surfaceTertiary, borderColor: colors.error, borderRadius: 10, borderWidth: 1, flexDirection: "row", gap: 8, padding: 11 },
  errorText: { color: colors.error, flex: 1, fontSize: 13, lineHeight: 18 },
  submit: { alignItems: "center", backgroundColor: colors.brandPrimary, borderRadius: 12, justifyContent: "center", minHeight: 50 },
  submitText: { color: colors.onBrandPrimary, fontSize: 15, fontWeight: "700" },
  pressed: { opacity: 0.78 },
  disabled: { opacity: 0.6 },
  privacy: { color: colors.muted, fontSize: 11, lineHeight: 16, textAlign: "center" },
}));