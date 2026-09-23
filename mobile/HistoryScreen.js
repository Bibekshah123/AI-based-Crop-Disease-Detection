import { useCallback, useEffect, useState } from "react";
import { View, Text, Image, Pressable, ScrollView, ActivityIndicator, StyleSheet } from "react-native";
import { useAuth } from "./auth";
import { history as fetchHistory, deleteHistoryEntry } from "./api";
import { deriveStatus } from "./normalize";
import { colors, tones, radius } from "./theme";

/* The signed-in user's own checks, read from the server. There is deliberately
   no local fallback: an anonymous prediction is never stored anywhere, so an
   empty account is an honest empty list rather than a mixture. */
export default function HistoryScreen({ t, lang, onOpen }) {
  const { token, user } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setItems(await fetchHistory(token));
    } catch {
      setError(t.historyLoadFailed);
    } finally {
      setLoading(false);
    }
  }, [token, t]);

  useEffect(() => {
    load();
  }, [load]);

  async function remove(id) {
    setItems((list) => list.filter((i) => i.id !== id));
    try {
      await deleteHistoryEntry(token, id);
    } catch {
      load(); // put it back if the server disagreed
    }
  }

  const label = (item) =>
    (lang === "np" ? item.disease_np : item.disease) || item.disease;

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.wrap}>
      <Text style={styles.title}>{t.historyTitle}</Text>
      <Text style={styles.lead}>{t.historyServerNote.replace("{user}", user?.username || "")}</Text>

      {!!error && <Text style={styles.error}>{error}</Text>}

      {items.length === 0 && !error ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>{t.historyEmpty}</Text>
        </View>
      ) : (
        items.map((item) => {
          const status = deriveStatus({
            confidence: item.confidence,
            is_unknown: item.is_unknown,
            not_leaf: item.not_leaf,
          });
          const tone = tones[status === "high" ? "success" : status === "moderate" ? "warning" : "error"];
          return (
            <Pressable key={item.id} style={styles.row} onPress={() => onOpen(item)}>
              {item.thumbnail ? (
                <Image source={{ uri: item.thumbnail }} style={styles.thumb} />
              ) : (
                <View style={[styles.thumb, styles.thumbBlank]} />
              )}
              <View style={styles.rowBody}>
                <Text style={styles.disease} numberOfLines={2}>{label(item)}</Text>
                <Text style={styles.meta}>
                  {new Date(item.timestamp).toLocaleDateString()} · {item.confidence}%
                </Text>
                <View style={[styles.pill, { backgroundColor: tone.bg, borderColor: tone.border }]}>
                  <Text style={[styles.pillText, { color: tone.fg }]}>{t.statusLabel[status]}</Text>
                </View>
              </View>
              <Pressable
                onPress={() => remove(item.id)}
                hitSlop={10}
                accessibilityRole="button"
                accessibilityLabel={t.remove}
              >
                <Text style={styles.removeText}>✕</Text>
              </Pressable>
            </Pressable>
          );
        })
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: { padding: 16, paddingBottom: 40 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 40 },
  title: { fontSize: 22, fontWeight: "800", color: colors.text },
  lead: { fontSize: 13, color: colors.textMuted, lineHeight: 19, marginTop: 6, marginBottom: 16 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: 12,
    marginBottom: 10,
  },
  thumb: { width: 64, height: 64, borderRadius: radius.md, backgroundColor: colors.surfaceHover },
  thumbBlank: { borderWidth: 1, borderColor: colors.border },
  rowBody: { flex: 1 },
  disease: { fontSize: 15, fontWeight: "700", color: colors.text },
  meta: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  pill: {
    alignSelf: "flex-start",
    marginTop: 6,
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  pillText: { fontSize: 11, fontWeight: "700" },
  removeText: { color: colors.textMuted, fontSize: 18, paddingHorizontal: 6 },
  empty: {
    padding: 24,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: "center",
  },
  emptyText: { color: colors.textMuted, fontSize: 14, textAlign: "center" },
  error: {
    marginBottom: 12,
    padding: 10,
    borderRadius: radius.sm,
    backgroundColor: colors.errorBg,
    borderWidth: 1,
    borderColor: colors.errorBorder,
    color: colors.error,
    fontSize: 13,
  },
});
