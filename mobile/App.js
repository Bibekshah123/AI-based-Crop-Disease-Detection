import { useState, useRef } from "react";
import {
  View,
  Text,
  Image,
  Pressable,
  ScrollView,
  ActivityIndicator,
  StatusBar,
  SafeAreaView,
  StyleSheet,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { predict } from "./api";
import { normalize } from "./normalize";
import { STRINGS, CROPS } from "./strings";
import { colors, radius } from "./theme";
import ResultView from "./ResultView";
import { AuthProvider, useAuth } from "./auth";
import AuthScreen from "./AuthScreen";
import HistoryScreen from "./HistoryScreen";

// "" means "any crop": no crop_type is sent, so the backend skips the
// crop-mismatch warning and nothing else changes. Choosing a crop is optional
// on purpose — a farmer who does not know the crop can still get an answer.
const ANY_CROP = "";

export default function App() {
  return (
    <AuthProvider>
      <CropSense />
    </AuthProvider>
  );
}

function CropSense() {
  const { user, token, logout } = useAuth();
  const [screen, setScreen] = useState("diagnose"); // diagnose | auth | history
  const [lang, setLang] = useState("en");
  const [crop, setCrop] = useState(ANY_CROP);
  const [imageUri, setImageUri] = useState(null);
  const [raw, setRaw] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showTips, setShowTips] = useState(false);
  const [validation, setValidation] = useState("");
  const [apiError, setApiError] = useState("");
  const submitting = useRef(false);

  const t = STRINGS[lang];

  async function choose(fromCamera) {
    const perm = fromCamera
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return;

    const res = await (fromCamera
      ? ImagePicker.launchCameraAsync({ quality: 0.8 })
      : ImagePicker.launchImageLibraryAsync({ quality: 0.8 }));
    if (res.canceled) return;

    setImageUri(res.assets[0].uri);
    setValidation("");
    setApiError("");
  }

  async function analyze() {
    if (submitting.current) return;
    if (!imageUri) return setValidation(t.addPhoto);

    submitting.current = true;
    setLoading(true);
    setValidation("");
    setApiError("");
    try {
      // The token is optional: with one the backend saves this check to the
      // user's history, without one nothing is stored anywhere.
      const data = await predict(imageUri, crop, token);
      setRaw(data);
    } catch (e) {
      setApiError(e?.response ? `Server error (${e.response.status})` : t.connErr);
    } finally {
      submitting.current = false;
      setLoading(false);
    }
  }

  function checkAnother() {
    setRaw(null);
    setImageUri(null);
    setApiError("");
    setValidation("");
    setScreen("diagnose");
  }

  // Opening a saved check reuses the result screen: a stored row carries the
  // same fields the /predict response does.
  function openSaved(item) {
    setRaw(item);
    setImageUri(item.thumbnail || null);
    setScreen("diagnose");
  }

  const data = raw ? normalize(raw, lang) : null;

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.surface} />

      <View style={styles.header}>
        <View style={styles.brandRow}>
          <Image source={require("./assets/logo-leaf.png")} style={styles.logo} />
          <Text style={styles.brand}>{t.brand}</Text>
        </View>
        <View style={styles.headerActions}>
          {user && (
            <Pressable
              style={styles.headerBtn}
              onPress={() => setScreen(screen === "history" ? "diagnose" : "history")}
              accessibilityRole="button"
            >
              <Text style={styles.headerBtnText}>
                {screen === "history" ? t.back : t.navHistory}
              </Text>
            </Pressable>
          )}
          <Pressable
            style={styles.headerBtn}
            onPress={() => (user ? logout() : setScreen("auth"))}
            accessibilityRole="button"
          >
            <Text style={styles.headerBtnText}>{user ? t.signOut : t.signIn}</Text>
          </Pressable>
          <Pressable
            style={styles.langBtn}
            onPress={() => setLang(lang === "en" ? "np" : "en")}
            accessibilityRole="button"
            accessibilityLabel={lang === "en" ? "Switch to Nepali" : "Switch to English"}
          >
            <Text style={styles.langText}>{lang === "en" ? "ने" : "EN"}</Text>
          </Pressable>
        </View>
      </View>

      {screen === "auth" ? (
        <AuthScreen t={t} onClose={() => setScreen("diagnose")} />
      ) : screen === "history" ? (
        <HistoryScreen t={t} lang={lang} onOpen={openSaved} />
      ) : (
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        {data ? (
          <ResultView data={data} image={imageUri} t={t} onCheckAnother={checkAnother} />
        ) : (
          <>
            <Text style={styles.title}>{t.heroTitle}</Text>
            <Text style={styles.lead}>{t.heroLead}</Text>
            <Text style={styles.savedNote}>
              {user ? t.savedToAccount.replace("{user}", user.username) : t.notSavedNote}
            </Text>

            {/* Photo — the main action of the screen */}
            <View style={styles.card}>
              {imageUri ? (
                <>
                  <Image source={{ uri: imageUri }} style={styles.preview} />
                  <View style={styles.row}>
                    <Pressable style={[styles.btn, styles.btnSecondary]} onPress={() => choose(true)}>
                      <Text style={styles.btnSecondaryText}>{t.retake}</Text>
                    </Pressable>
                    <Pressable style={[styles.btn, styles.btnSecondary]} onPress={() => choose(false)}>
                      <Text style={styles.btnSecondaryText}>{t.gallery}</Text>
                    </Pressable>
                  </View>
                </>
              ) : (
                <>
                  <Pressable
                    style={styles.dropzone}
                    onPress={() => choose(true)}
                    accessibilityRole="button"
                    accessibilityLabel={t.takePhoto}
                  >
                    <View style={styles.dropIcon}>
                      <Image source={require("./assets/logo-leaf.png")} style={styles.dropLeaf} />
                    </View>
                    <Text style={styles.dropTitle}>{t.noPhoto}</Text>
                    <Text style={styles.dropHint}>{t.noPhotoHint}</Text>
                  </Pressable>
                  <View style={styles.row}>
                    <Pressable style={[styles.btn, styles.btnPrimary]} onPress={() => choose(true)}>
                      <Text style={styles.btnPrimaryText}>{t.takePhoto}</Text>
                    </Pressable>
                    <Pressable style={[styles.btn, styles.btnSecondary]} onPress={() => choose(false)}>
                      <Text style={styles.btnSecondaryText}>{t.gallery}</Text>
                    </Pressable>
                  </View>
                </>
              )}
            </View>

            {/* Crop — optional */}
            <View style={styles.card}>
              <View style={styles.labelRow}>
                <Text style={styles.label}>{t.cropLabel}</Text>
                <Text style={styles.optional}>{t.optional}</Text>
              </View>
              <Text style={styles.hint}>{t.cropHint}</Text>
              <View style={styles.chips}>
                {[{ id: ANY_CROP, label: t.anyCrop }, ...CROPS.map((c) => ({ id: c, label: c }))].map(
                  ({ id, label }) => {
                    const active = crop === id;
                    return (
                      <Pressable
                        key={label}
                        onPress={() => setCrop(id)}
                        style={[styles.chip, active && styles.chipActive]}
                        accessibilityRole="button"
                        accessibilityState={{ selected: active }}
                      >
                        <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
                      </Pressable>
                    );
                  }
                )}
              </View>
            </View>

            {/* Photo tips — collapsed by default to keep the screen calm */}
            <Pressable
              style={styles.tipsToggle}
              onPress={() => setShowTips(!showTips)}
              accessibilityRole="button"
              accessibilityState={{ expanded: showTips }}
            >
              <Text style={styles.tipsToggleText}>{t.guidanceTitle}</Text>
              <Text style={styles.tipsChevron}>{showTips ? "▾" : "▸"}</Text>
            </Pressable>
            {showTips && (
              <View style={styles.tips}>
                {t.guidance.map((g) => (
                  <Text key={g} style={styles.tipItem}>{"•  "}{g}</Text>
                ))}
              </View>
            )}

            {!!validation && <Text style={styles.error}>{validation}</Text>}
            {!!apiError && <Text style={styles.error}>{apiError}</Text>}
          </>
        )}
      </ScrollView>
      )}

      {/* Analyze stays reachable at the bottom of the screen */}
      {screen === "diagnose" && !data && (
        <View style={styles.footer}>
          <Pressable
            style={[styles.analyzeBtn, (loading || !imageUri) && styles.analyzeBtnDisabled]}
            onPress={analyze}
            disabled={loading}
            accessibilityRole="button"
          >
            {loading ? (
              <View style={styles.analyzeLoading}>
                <ActivityIndicator color="#fff" />
                <Text style={styles.analyzeText}>{t.analyzing}</Text>
              </View>
            ) : (
              <Text style={styles.analyzeText}>{t.analyze}</Text>
            )}
          </Pressable>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.page },
  container: { padding: 16, paddingBottom: 32 },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  brandRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  headerActions: { flexDirection: "row", alignItems: "center", gap: 8 },
  headerBtn: {
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  headerBtnText: { color: colors.primaryDark, fontWeight: "700", fontSize: 13 },
  savedNote: { fontSize: 12, color: colors.textMuted, marginTop: -8, marginBottom: 14 },
  logo: { width: 26, height: 26, resizeMode: "contain" },
  brand: { color: colors.text, fontSize: 19, fontWeight: "800", letterSpacing: 0.2 },
  langBtn: {
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  langText: { color: colors.primaryDark, fontWeight: "700" },

  title: { fontSize: 22, fontWeight: "800", color: colors.text, marginTop: 4 },
  lead: { fontSize: 14, color: colors.textMuted, lineHeight: 20, marginTop: 6, marginBottom: 16 },

  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    marginBottom: 14,
  },

  dropzone: {
    borderWidth: 2,
    borderColor: colors.primaryTint,
    borderStyle: "dashed",
    borderRadius: radius.md,
    backgroundColor: colors.greenSoft,
    paddingVertical: 34,
    alignItems: "center",
    marginBottom: 12,
  },
  dropIcon: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  dropLeaf: { width: 32, height: 32, resizeMode: "contain" },
  dropTitle: { fontSize: 15, fontWeight: "700", color: colors.text },
  dropHint: { fontSize: 13, color: colors.textMuted, marginTop: 4, textAlign: "center", paddingHorizontal: 20 },

  preview: {
    width: "100%",
    height: 280,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceHover,
    resizeMode: "cover",
    marginBottom: 12,
  },

  row: { flexDirection: "row", gap: 10 },
  btn: { flex: 1, minHeight: 48, borderRadius: radius.md, alignItems: "center", justifyContent: "center" },
  btnPrimary: { backgroundColor: colors.primary },
  btnPrimaryText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  btnSecondary: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  btnSecondaryText: { color: colors.primaryDark, fontWeight: "700", fontSize: 15 },

  labelRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  label: { color: colors.text, fontSize: 15, fontWeight: "700" },
  optional: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  hint: { color: colors.textMuted, fontSize: 13, marginTop: 4, marginBottom: 12, lineHeight: 18 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingHorizontal: 14,
    paddingVertical: 9,
    minHeight: 40,
    justifyContent: "center",
  },
  chipActive: { backgroundColor: colors.greenSoft, borderColor: colors.primary },
  chipText: { color: colors.text, fontSize: 14 },
  chipTextActive: { color: colors.primaryDark, fontWeight: "700" },

  tipsToggle: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 4,
  },
  tipsToggleText: { color: colors.primaryDark, fontWeight: "700", fontSize: 14 },
  tipsChevron: { color: colors.primaryDark, fontSize: 14 },
  tips: {
    backgroundColor: colors.greenSoft,
    borderColor: colors.primaryTint,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: 14,
  },
  tipItem: { fontSize: 13, color: colors.textMuted, lineHeight: 21 },

  error: {
    marginTop: 14,
    color: colors.error,
    backgroundColor: colors.errorBg,
    borderColor: colors.errorBorder,
    borderWidth: 1,
    borderRadius: radius.sm,
    padding: 12,
    fontSize: 13,
  },

  footer: {
    padding: 16,
    paddingTop: 12,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  analyzeBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    minHeight: 52,
    alignItems: "center",
    justifyContent: "center",
  },
  analyzeBtnDisabled: { opacity: 0.5 },
  analyzeLoading: { flexDirection: "row", alignItems: "center", gap: 10 },
  analyzeText: { color: "#fff", fontWeight: "700", fontSize: 16 },
});
