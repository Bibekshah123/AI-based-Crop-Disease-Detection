import { useEffect, useState } from "react";
import { View, Text, Pressable, ScrollView, StyleSheet } from "react-native";
import { useAuth } from "./auth";
import { me as fetchMe, history as fetchHistory } from "./api";
import { colors, radius } from "./theme";

/* The account screen: who is signed in, how much is saved, and the way out. */
export default function ProfileScreen({ t, lang }) {
  const { user, token, logout } = useAuth();
  const [created, setCreated] = useState("");
  const [count, setCount] = useState(null);

  useEffect(() => {
    let active = true;
    fetchMe(token)
      .then((d) => active && setCreated(d.created_at || ""))
      .catch(() => {});
    fetchHistory(token)
      .then((rows) => active && setCount(rows.length))
      .catch(() => active && setCount(null));
    return () => {
      active = false;
    };
  }, [token]);

  const initial = (user?.username || "?").trim().charAt(0).toUpperCase();
  const memberSince = created
    ? new Date(created).toLocaleDateString(lang === "np" ? "ne-NP" : "en")
    : "—";

  return (
    <ScrollView contentContainerStyle={styles.wrap}>
      <View style={styles.identity}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initial}</Text>
        </View>
        <View style={styles.identityText}>
          <Text style={styles.name} numberOfLines={1}>{user?.username}</Text>
          {!!user?.email && <Text style={styles.email} numberOfLines={1}>{user.email}</Text>}
        </View>
      </View>

      <View style={styles.stats}>
        <View style={styles.stat}>
          <Text style={styles.statLabel}>{t.savedChecks}</Text>
          <Text style={styles.statValue}>{count ?? "—"}</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statLabel}>{t.memberSince}</Text>
          <Text style={styles.statValue}>{memberSince}</Text>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>{t.accountDetails}</Text>
        <Row label={t.username} value={user?.username} />
        {!!user?.email && <Row label={t.email} value={user.email} />}
        <Row label={t.password} value="••••••••" />
        <Text style={styles.note}>{t.accountNote}</Text>
      </View>

      <Pressable style={styles.signOut} onPress={logout} accessibilityRole="button">
        <Text style={styles.signOutText}>{t.signOut}</Text>
      </Pressable>
    </ScrollView>
  );
}

function Row({ label, value }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue} numberOfLines={1}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { padding: 16, paddingBottom: 40 },
  identity: { flexDirection: "row", alignItems: "center", gap: 14, marginBottom: 18 },
  avatar: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { color: "#fff", fontSize: 22, fontWeight: "700" },
  identityText: { flex: 1 },
  name: { fontSize: 19, fontWeight: "800", color: colors.text },
  email: { fontSize: 13, color: colors.textMuted, marginTop: 2 },

  stats: { flexDirection: "row", gap: 10, marginBottom: 16 },
  stat: {
    flex: 1,
    backgroundColor: colors.greenSoft,
    borderWidth: 1,
    borderColor: colors.primaryTint,
    borderRadius: radius.lg,
    padding: 14,
  },
  statLabel: { fontSize: 12, color: colors.textMuted },
  statValue: { fontSize: 17, fontWeight: "700", color: colors.primaryDark, marginTop: 4 },

  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: 16,
  },
  cardTitle: { fontSize: 15, fontWeight: "700", color: colors.text, marginBottom: 6 },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  rowLabel: { fontSize: 13, color: colors.textMuted },
  rowValue: { fontSize: 14, fontWeight: "600", color: colors.text, flexShrink: 1, textAlign: "right" },
  note: { fontSize: 12, color: colors.textMuted, lineHeight: 18, marginTop: 12 },

  signOut: {
    marginTop: 18,
    minHeight: 50,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.errorBorder,
    backgroundColor: colors.errorBg,
    alignItems: "center",
    justifyContent: "center",
  },
  signOutText: { color: colors.error, fontWeight: "700", fontSize: 15 },
});
