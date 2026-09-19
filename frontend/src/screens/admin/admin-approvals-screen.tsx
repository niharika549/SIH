import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import type { PendingUser } from "@/src/api/authed";
import { useAuthedRequest } from "@/src/api/authed";
import { ApiError } from "@/src/api/client";
import { BrandHeader } from "@/src/components/brand-header";
import { usesNativeTabs } from "@/src/navigation";
import { makeStyles, useTheme } from "@/src/theme";

export function AdminApprovalsScreen() {
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const authed = useAuthedRequest();
  const queryClient = useQueryClient();
  const [error, setError] = useState("");

  const pendingQuery = useQuery({
    queryKey: ["admin", "pending-users"],
    queryFn: () => authed<PendingUser[]>("/admin/pending-users"),
  });

  const act = useMutation({
    mutationFn: async ({ userId, action }: { userId: string; action: "approve" | "reject" }) =>
      authed(`/admin/users/${userId}/${action}`, { method: "POST" }),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["admin", "pending-users"] }),
    onError: (e) => setError(e instanceof ApiError ? e.message : "Action failed."),
  });

  const bottomChrome = usesNativeTabs ? insets.bottom : 0;

  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={[styles.content, { paddingTop: insets.top + 18, paddingBottom: bottomChrome + 28 }]}>
        <BrandHeader compact />
        <Text style={styles.eyebrow}>ADMIN · VERIFICATION QUEUE</Text>
        <Text style={styles.title}>Pending accounts</Text>
        <Text style={styles.subtitle}>Trainers, employers, and government users register as PENDING and gain access only after your approval.</Text>

        {pendingQuery.isPending ? (
          <View style={styles.centered} testID="approvals-loading"><ActivityIndicator color={colors.brandPrimary} size="large" /></View>
        ) : null}
        {pendingQuery.data && pendingQuery.data.length === 0 ? (
          <View style={styles.empty} testID="approvals-empty">
            <MaterialCommunityIcons name="check-decagram" size={22} color={colors.success} />
            <Text style={styles.emptyText}>Queue is clear — no accounts waiting for review.</Text>
          </View>
        ) : null}
        {error ? <Text style={styles.errorText} testID="approvals-error">{error}</Text> : null}
        {pendingQuery.data?.map((u) => (
          <View key={u.id} style={styles.card} testID={`pending-${u.id}`}>
            <View style={styles.cardHead}>
              <View style={styles.avatar}><Text style={styles.avatarText}>{u.full_name.slice(0, 1).toUpperCase()}</Text></View>
              <View style={styles.copy}>
                <Text style={styles.name}>{u.full_name}</Text>
                <Text style={styles.email}>{u.email}</Text>
                <View style={styles.metaRow}>
                  <View style={styles.rolePill}><Text style={styles.rolePillText}>{u.role}</Text></View>
                  <Text style={styles.date}>Applied {new Date(u.created_at).toLocaleDateString()}</Text>
                </View>
              </View>
            </View>
            <View style={styles.actions}>
              <Pressable
                onPress={() => { setError(""); act.mutate({ userId: u.id, action: "approve" }); }}
                disabled={act.isPending}
                style={[styles.actionBtn, styles.approveBtn]}
                testID={`approve-${u.id}`}
                accessibilityRole="button"
              >
                <MaterialCommunityIcons name="check" size={16} color={colors.onSuccess} />
                <Text style={styles.approveText}>Approve</Text>
              </Pressable>
              <Pressable
                onPress={() => { setError(""); act.mutate({ userId: u.id, action: "reject" }); }}
                disabled={act.isPending}
                style={[styles.actionBtn, styles.rejectBtn]}
                testID={`reject-${u.id}`}
                accessibilityRole="button"
              >
                <MaterialCommunityIcons name="close" size={16} color={colors.error} />
                <Text style={styles.rejectText}>Reject</Text>
              </Pressable>
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  root: { backgroundColor: colors.surface, flex: 1 },
  content: { gap: 10, paddingHorizontal: 20 },
  eyebrow: { color: colors.brandPrimary, fontSize: 11, fontWeight: "800", letterSpacing: 1, marginTop: 16 },
  title: { color: colors.onSurface, fontSize: 24, fontWeight: "800" },
  subtitle: { color: colors.muted, fontSize: 13, lineHeight: 19, marginBottom: 4 },
  centered: { alignItems: "center", padding: 24 },
  empty: { alignItems: "center", backgroundColor: colors.surfaceSecondary, borderColor: colors.border, borderRadius: 14, borderWidth: 1, flexDirection: "row", gap: 10, padding: 16 },
  emptyText: { color: colors.onSurface, flex: 1, fontSize: 13, lineHeight: 19 },
  errorText: { color: colors.error, fontSize: 13 },
  card: { backgroundColor: colors.surfaceSecondary, borderColor: colors.border, borderRadius: 16, borderWidth: 1, gap: 12, marginTop: 8, padding: 14 },
  cardHead: { alignItems: "center", flexDirection: "row", gap: 12 },
  avatar: { alignItems: "center", backgroundColor: colors.brandPrimary, borderRadius: 22, height: 44, justifyContent: "center", width: 44 },
  avatarText: { color: colors.onBrandPrimary, fontSize: 17, fontWeight: "800" },
  copy: { flex: 1, gap: 3 },
  name: { color: colors.onSurface, fontSize: 15, fontWeight: "800" },
  email: { color: colors.muted, fontSize: 12 },
  metaRow: { alignItems: "center", flexDirection: "row", gap: 8, marginTop: 4 },
  rolePill: { backgroundColor: colors.brandTertiary, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 },
  rolePillText: { color: colors.onBrandTertiary, fontSize: 10, fontWeight: "800" },
  date: { color: colors.muted, fontSize: 11 },
  actions: { flexDirection: "row", gap: 10 },
  actionBtn: { alignItems: "center", borderRadius: 10, flex: 1, flexDirection: "row", gap: 6, justifyContent: "center", minHeight: 44 },
  approveBtn: { backgroundColor: colors.success },
  approveText: { color: colors.onSuccess, fontSize: 13, fontWeight: "800" },
  rejectBtn: { borderColor: colors.error, borderWidth: 1 },
  rejectText: { color: colors.error, fontSize: 13, fontWeight: "800" },
}));
