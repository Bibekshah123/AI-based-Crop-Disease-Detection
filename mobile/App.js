import { useState } from "react";
import {
  View,
  Text,
  Image,
  Pressable,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
  StatusBar,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { predict } from "./api";

// 10 crops your model knows. `null` = "Any / not sure" (skips the mismatch check).
const CROPS = [
  "Any",
  "Apple",
  "Banana",
  "Citrus",
  "Cucumber",
  "Grape",
  "Maize",
  "Mango",
  "Potato",
  "Rice",
  "Tomato",
];

// Bilingual UI strings.
const T = {
  en: {
    subtitle: "Crop Disease Detection",
    crop: "Which crop?",
    camera: "Take Photo",
    gallery: "Gallery",
    analyzing: "Analyzing leaf…",
    confidence: "Confidence",
    lowConf: "Low confidence — treat this result with caution.",
    unknown: "Not recognized — this may not be a leaf in the training set.",
    symptoms: "Symptoms",
    treatment: "Treatment",
    prevention: "Prevention",
    cause: "Cause",
    top: "Other possibilities",
    heatmap: "Where the model looked (Grad-CAM)",
    hint: "Take or pick a clear photo of a single leaf.",
    connErr:
      "Could not reach the server. Check that the backend is running and API_URL in config.js points to your computer's Wi-Fi IP.",
  },
  np: {
    subtitle: "बाली रोग पहिचान",
    crop: "कुन बाली?",
    camera: "फोटो खिच्नुहोस्",
    gallery: "ग्यालरी",
    analyzing: "पात विश्लेषण गर्दै…",
    confidence: "विश्वास स्तर",
    lowConf: "विश्वास स्तर कम छ — नतिजा सावधानीपूर्वक हेर्नुहोस्।",
    unknown: "पहिचान भएन — यो प्रशिक्षण सेटको पात नहुन सक्छ।",
    symptoms: "लक्षणहरू",
    treatment: "उपचार",
    prevention: "रोकथाम",
    cause: "कारण",
    top: "अन्य सम्भावनाहरू",
    heatmap: "मोडेलले हेरेको ठाउँ (Grad-CAM)",
    hint: "एउटै पातको स्पष्ट फोटो खिच्नुहोस् वा छान्नुहोस्।",
    connErr:
      "सर्भरसँग जडान भएन। ब्याकएन्ड चलिरहेको छ र config.js मा API_URL सही छ भनी जाँच्नुहोस्।",
  },
};

export default function App() {
  const [lang, setLang] = useState("en");
  const [crop, setCrop] = useState("Any");
  const [image, setImage] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const t = T[lang];

  async function choose(fromCamera) {
    const perm = fromCamera
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return;

    const picker = fromCamera
      ? ImagePicker.launchCameraAsync
      : ImagePicker.launchImageLibraryAsync;
    const res = await picker({ quality: 0.8 });
    if (res.canceled) return;

    const uri = res.assets[0].uri;
    setImage(uri);
    setResult(null);
    setError(null);
    runPredict(uri);
  }

  async function runPredict(uri) {
    setLoading(true);
    try {
      const cropArg = crop === "Any" ? null : crop;
      const data = await predict(uri, cropArg);
      setResult(data);
    } catch (e) {
      setError(e?.response ? `Server error (${e.response.status})` : t.connErr);
    } finally {
      setLoading(false);
    }
  }

  // Pick EN or NP field from the response.
  const f = (obj, key) => (lang === "np" ? obj[`${key}_np`] || obj[key] : obj[key]);

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="light-content" />
      <ScrollView contentContainerStyle={styles.container}>
        {/* Header */}
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.brand}>CropSense AI</Text>
            <Text style={styles.subtitle}>{t.subtitle}</Text>
          </View>
          <Pressable
            style={styles.langBtn}
            onPress={() => setLang(lang === "en" ? "np" : "en")}
          >
            <Text style={styles.langText}>{lang === "en" ? "ने" : "EN"}</Text>
          </Pressable>
        </View>

        {/* Crop selector */}
        <Text style={styles.label}>{t.crop}</Text>
        <View style={styles.chips}>
          {CROPS.map((c) => (
            <Pressable
              key={c}
              onPress={() => setCrop(c)}
              style={[styles.chip, crop === c && styles.chipActive]}
            >
              <Text style={[styles.chipText, crop === c && styles.chipTextActive]}>
                {c}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          <Pressable style={styles.btn} onPress={() => choose(true)}>
            <Text style={styles.btnText}>{t.camera}</Text>
          </Pressable>
          <Pressable style={styles.btnOutline} onPress={() => choose(false)}>
            <Text style={styles.btnOutlineText}>{t.gallery}</Text>
          </Pressable>
        </View>

        {!image && <Text style={styles.hint}>{t.hint}</Text>}
        {image && <Image source={{ uri: image }} style={styles.preview} />}

        {loading && (
          <View style={styles.loading}>
            <ActivityIndicator size="large" color="#e5e5e5" />
            <Text style={styles.loadingText}>{t.analyzing}</Text>
          </View>
        )}

        {error && <Text style={styles.error}>{error}</Text>}

        {result && !loading && (
          <View style={styles.card}>
            <Text style={styles.disease}>{f(result, "disease")}</Text>
            <Text style={styles.conf}>
              {t.confidence}: {result.confidence}%
            </Text>

            {result.is_unknown && <Banner text={t.unknown} />}
            {result.crop_mismatch && <Banner text={result.message} />}
            {result.low_confidence && !result.is_unknown && (
              <Banner text={t.lowConf} />
            )}

            {result.gradcam_image ? (
              <>
                <Text style={styles.section}>{t.heatmap}</Text>
                <Image source={{ uri: result.gradcam_image }} style={styles.preview} />
              </>
            ) : null}

            <Field title={t.symptoms} value={f(result, "symptoms")} />
            <Field title={t.cause} value={f(result, "cause")} />
            <Field title={t.treatment} value={f(result, "treatment")} />
            <Field title={t.prevention} value={f(result, "prevention")} />

            {result.top_5_predictions?.length > 1 && (
              <>
                <Text style={styles.section}>{t.top}</Text>
                {result.top_5_predictions.slice(1).map((p, i) => (
                  <View key={i} style={styles.topRow}>
                    <Text style={styles.topName}>{p.disease}</Text>
                    <Text style={styles.topPct}>{p.confidence}%</Text>
                  </View>
                ))}
              </>
            )}

            {result.disclaimer ? (
              <Text style={styles.disclaimer}>{result.disclaimer}</Text>
            ) : null}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function Field({ title, value }) {
  if (!value) return null;
  return (
    <View style={{ marginTop: 12 }}>
      <Text style={styles.section}>{title}</Text>
      <Text style={styles.body}>{value}</Text>
    </View>
  );
}

function Banner({ text }) {
  return (
    <View style={styles.banner}>
      <Text style={styles.bannerText}>⚠ {text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#0a0a0a" },
  container: { padding: 20, paddingTop: 60, paddingBottom: 48 },

  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
  },
  brand: { color: "#fff", fontSize: 26, fontWeight: "800", letterSpacing: 0.3 },
  subtitle: { color: "#a3a3a3", fontSize: 13, marginTop: 2 },
  langBtn: {
    backgroundColor: "#171717",
    borderColor: "#404040",
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  langText: { color: "#e5e5e5", fontWeight: "700" },

  label: { color: "#d4d4d4", fontSize: 14, fontWeight: "600", marginBottom: 8 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 20 },
  chip: {
    borderColor: "#404040",
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  chipActive: { backgroundColor: "#fff", borderColor: "#fff" },
  chipText: { color: "#d4d4d4", fontSize: 13 },
  chipTextActive: { color: "#0a0a0a", fontWeight: "700" },

  actions: { flexDirection: "row", gap: 12, marginBottom: 16 },
  btn: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  btnText: { color: "#0a0a0a", fontWeight: "700", fontSize: 15 },
  btnOutline: {
    flex: 1,
    borderColor: "#404040",
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  btnOutlineText: { color: "#e5e5e5", fontWeight: "700", fontSize: 15 },

  hint: { color: "#737373", textAlign: "center", marginTop: 20, fontSize: 13 },
  preview: {
    width: "100%",
    height: 280,
    borderRadius: 14,
    marginVertical: 14,
    resizeMode: "cover",
    backgroundColor: "#171717",
  },

  loading: { alignItems: "center", marginVertical: 24 },
  loadingText: { color: "#a3a3a3", marginTop: 10 },
  error: {
    color: "#fca5a5",
    backgroundColor: "#7f1d1d33",
    borderColor: "#7f1d1d",
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    marginTop: 16,
  },

  card: {
    backgroundColor: "#141414",
    borderColor: "#262626",
    borderWidth: 1,
    borderRadius: 16,
    padding: 18,
    marginTop: 12,
  },
  disease: { color: "#fff", fontSize: 22, fontWeight: "800" },
  conf: { color: "#a3a3a3", fontSize: 15, marginTop: 4 },

  banner: {
    backgroundColor: "#78350f33",
    borderColor: "#b45309",
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    marginTop: 12,
  },
  bannerText: { color: "#fcd34d", fontSize: 13, fontWeight: "600" },

  section: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
    marginTop: 14,
    marginBottom: 4,
  },
  body: { color: "#d4d4d4", fontSize: 14, lineHeight: 20 },

  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 6,
    borderBottomColor: "#262626",
    borderBottomWidth: 1,
  },
  topName: { color: "#d4d4d4", fontSize: 14 },
  topPct: { color: "#a3a3a3", fontSize: 14, fontWeight: "600" },

  disclaimer: {
    color: "#737373",
    fontSize: 11,
    fontStyle: "italic",
    marginTop: 18,
    lineHeight: 16,
  },
});
