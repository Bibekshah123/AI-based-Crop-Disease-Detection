import { Modal, View, Text, Pressable, StyleSheet, SafeAreaView } from "react-native";
import { colors, radius } from "./theme";
import { LeafIcon, ClockIcon, PersonIcon, ExitIcon } from "./icons";

/* Slide-over menu for the account area. A phone header cannot hold profile,
   history and sign-out at once without crowding the crop chips underneath, so
   they live here behind one button. */
export default function Sidebar({ visible, onClose, user, t, current, onNavigate, onSignOut }) {
  const initial = (user?.username || "?").trim().charAt(0).toUpperCase();

  const items = [
    { key: "diagnose", label: t.navDiagnose, icon: LeafIcon },
    { key: "history", label: t.navHistory, icon: ClockIcon },
    { key: "profile", label: t.profileTitle, icon: PersonIcon },
  ];

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel={t.close} />
      <SafeAreaView style={styles.panelSafe} pointerEvents="box-none">
        <View style={styles.panel}>
          <View style={styles.identity}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{initial}</Text>
            </View>
            <View style={styles.identityText}>
              <Text style={styles.name} numberOfLines={1}>{user?.username}</Text>
              {!!user?.email && (
                <Text style={styles.email} numberOfLines={1}>{user.email}</Text>
              )}
            </View>
          </View>

          <View style={styles.items}>
            {items.map(({ key, label, icon: Icon }) => {
              const active = current === key;
              return (
                <Pressable
                  key={key}
                  style={[styles.item, active && styles.itemActive]}
                  onPress={() => onNavigate(key)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                >
                  <Icon color={active ? colors.primaryDark : colors.textMuted} />
                  <Text style={[styles.itemText, active && styles.itemTextActive]}>{label}</Text>
                </Pressable>
              );
            })}
          </View>

          <Pressable style={styles.signOut} onPress={onSignOut} accessibilityRole="button">
            <ExitIcon color={colors.error} />
            <Text style={styles.signOutText}>{t.signOut}</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(12, 38, 22, 0.45)" },
  panelSafe: { flex: 1, alignItems: "flex-end" },
  panel: {
    width: "78%",
    maxWidth: 320,
    flex: 1,
    backgroundColor: colors.surface,
    borderLeftWidth: 1,
    borderLeftColor: colors.border,
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 24,
  },
  identity: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingBottom: 18,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { color: "#fff", fontSize: 18, fontWeight: "700" },
  identityText: { flex: 1 },
  name: { fontSize: 16, fontWeight: "700", color: colors.text },
  email: { fontSize: 12, color: colors.textMuted, marginTop: 2 },

  items: { marginTop: 14, gap: 4 },
  item: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 13,
    paddingHorizontal: 12,
    borderRadius: radius.md,
    minHeight: 48,
  },
  itemActive: { backgroundColor: colors.greenSoft },
  itemText: { fontSize: 15, color: colors.text },
  itemTextActive: { color: colors.primaryDark, fontWeight: "700" },

  signOut: {
    marginTop: "auto",
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 13,
    paddingHorizontal: 12,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.errorBorder,
    backgroundColor: colors.errorBg,
    minHeight: 48,
  },
  signOutText: { fontSize: 15, fontWeight: "700", color: colors.error },

});
