import { useState, useRef } from "react";
import {
  View,
  Text,
  Image,
  Pressable,
  ScrollView,
  ActivityIndicator,
  StatusBar,
  StyleSheet,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { predict } from "./api";
import { normalize } from "./normalize";
import { STRINGS, CROPS } from "./strings";
import { colors, radius } from "./theme";
import ResultView from "./ResultView";

export default function App() {
  const [lang, setLang] = useState("en");
  const [crop, setCrop] = useState("");
  const [imageUri, setImageUri] = useState(null);
  const [raw, setRaw] = useState(null);
  const [loading, setLoading] = useState(false);
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

  function clearImage() {
    setImageUri(null);
    setValidation("");
  }

  async function analyze() {
    if (submitting.current) return;
    if (!crop) return setValidation(t.pickCropFirst);
    if (!imageUri) return setValidation(t.addPhoto);

    submitting.current = true;
    setLoading(true);
    setValidation("");
    setApiError("");
    try {
      const data = await predict(imageUri, crop);
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
  }

  const data = raw ? normalize(raw, lang) : null;

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.surface} />
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.brand}>{t.brand}</Text>
            <Text style={styles.subtitle}>{t.subtitle}</Text>
          </View>
          <Pressable
            style={styles.langBtn}
            onPress={() => setLang(lang === "en" ? "np" : "en")}
            accessibilityRole="button"
            accessibilityLabel={lang === "en" ? "Switch to Nepali" : "Switch to English"}
          >
            <Text style={styles.langText}>{lang === "en" ? "ने" : "EN"}</Text>
          </Pressable>
        </View>

        {data ? (
          <ResultView data={data} image={imageUri} t={t} onCheckAnother={checkAnother} />
        ) : (
          <>
            {/* Crop selector */}
            <View style={styles.labelRow}>
              <Text style={styles.label}>{t.selectCrop}</Text>
              <Text style={styles.required}>{t.cropRequired}</Text>
            </View>
            <View style={styles.chips}>
              {CROPS.map((c) => {
                const active = crop === c;
                return (
                  <Pressable
                    key={c}
                    onPress={() => {
                      setCrop(c);
                      setValidation("");
                    }}
                    style={[styles.chip, active && styles.chipActive]}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                  >
                    <Text style={[styles.chipText, active && styles.chipTextActive]}>{c}</Text>
                  </Pressable>
                );
              })}
            </View>

            {/* Image */}
            {imageUri ? (
              <View style={styles.previewWrap}>
                <Image source={{ uri: imageUri }} style={styles.preview} />
                <View style={styles.previewActions}>
                  <Pressable style={styles.secondaryBtn} onPress={() => choose(false)}>
                    <Text style={styles.secondaryBtnText}>{t.replace}</Text>
                  </Pressable>
                  <Pressable style={styles.ghostBtn} onPress={clearImage}>
                    <Text style={styles.ghostBtnText}>{t.remove}</Text>
                  </Pressable>
                </View>
              </View>
            ) : (
              <View style={styles.pickRow}>
                <Pressable style={styles.primaryBtn} onPress={() => choose(true)}>
                  <Text style={styles.primaryBtnText}>{t.takePhoto}</Text>
                </Pressable>
                <Pressable style={styles.secondaryBtn} onPress={() => choose(false)}>
                  <Text style={styles.secondaryBtnText}>{t.gallery}</Text>
                </Pressable>
              </View>
            )}

            {/* Photo guidance */}
            <View style={styles.guidance}>
              <Text style={styles.guidanceTitle}>{t.guidanceTitle}</Text>
              {t.guidance.map((g) => (
                <Text key={g} style={styles.guidanceItem}>
                  {"•  "}
                  {g}
                </Text>
              ))}
            </View>

            {!!validation && <Text style={styles.validation}>{validation}</Text>}
            {!!apiError && <Text style={styles.apiError}>{apiError}</Text>}

            {/* Analyze */}
            <Pressable
              style={[styles.analyzeBtn, loading && styles.analyzeBtnDisabled]}
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
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.page },
  container: { padding: 20, paddingTop: 56, paddingBottom: 48 },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
  },
  brand: { color: colors.text, fontSize: 24, fontWeight: "800", letterSpacing: 0.2 },
  subtitle: { color: colors.textMuted, fontSize: 13, marginTop: 2 },
  langBtn: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  langText: { color: colors.primaryDark, fontWeight: "700" },

  labelRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 },
  label: { color: colors.text, fontSize: 15, fontWeight: "700" },
  required: {
    color: colors.error,
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 20 },
  chip: {
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    paddingHorizontal: 14,
    paddingVertical: 10,
    minHeight: 44,
    justifyContent: "center",
  },
  chipActive: { backgroundColor: colors.greenSoft, borderColor: colors.primary },
  chipText: { color: colors.text, fontSize: 14, fontWeight: "500" },
  chipTextActive: { color: colors.primaryDark, fontWeight: "700" },

  pickRow: { flexDirection: "row", gap: 12 },
  primaryBtn: {
    flex: 1,
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryBtnText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  secondaryBtn: {
    flex: 1,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.md,
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryBtnText: { color: colors.primaryDark, fontWeight: "700", fontSize: 15 },
  ghostBtn: { flex: 1, minHeight: 48, alignItems: "center", justifyContent: "center" },
  ghostBtnText: { color: colors.textMuted, fontWeight: "700", fontSize: 15 },

  previewWrap: { marginBottom: 4 },
  preview: {
    width: "100%",
    height: 300,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceHover,
    resizeMode: "cover",
  },
  previewActions: { flexDirection: "row", gap: 12, marginTop: 12 },

  guidance: {
    marginTop: 16,
    padding: 14,
    backgroundColor: colors.greenSoft,
    borderColor: colors.primaryTint,
    borderWidth: 1,
    borderRadius: radius.md,
  },
  guidanceTitle: { fontSize: 13, fontWeight: "700", color: colors.primaryDark, marginBottom: 6 },
  guidanceItem: { fontSize: 13, color: colors.textMuted, lineHeight: 20 },

  validation: {
    marginTop: 14,
    color: colors.error,
    backgroundColor: colors.errorBg,
    borderColor: colors.errorBorder,
    borderWidth: 1,
    borderRadius: radius.sm,
    padding: 10,
    fontSize: 13,
  },
  apiError: {
    marginTop: 14,
    color: colors.error,
    backgroundColor: colors.errorBg,
    borderColor: colors.errorBorder,
    borderWidth: 1,
    borderRadius: radius.sm,
    padding: 10,
    fontSize: 13,
  },

  analyzeBtn: {
    marginTop: 20,
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    minHeight: 50,
    alignItems: "center",
    justifyContent: "center",
  },
  analyzeBtnDisabled: { opacity: 0.6 },
  analyzeLoading: { flexDirection: "row", alignItems: "center", gap: 10 },
  analyzeText: { color: "#fff", fontWeight: "700", fontSize: 16 },
});
