import { useState } from "react";
import { View, Text, Image, Pressable, StyleSheet } from "react-native";
import { colors, tones, radius } from "./theme";
import { Status } from "./normalize";
import TreatmentCard from "./TreatmentCard";

export default function ResultView({ data, image, t, onCheckAnother }) {
  const uncertain = data.status === Status.UNCERTAIN;
  const tone = tones[data.tone] || tones.neutral;

  const sections = [
    { key: "symptoms", label: t.symptoms, value: data.symptoms },
    { key: "cause", label: t.cause, value: data.cause },
    { key: "treatment", label: t.management, value: data.treatment },
    { key: "prevention", label: t.prevention, value: data.prevention },
  ].filter((s) => s.value);

  return (
    <View style={styles.wrap}>
      {/* Header */}
      <View style={styles.card}>
        <View style={styles.headTop}>
          {!!data.cropType && <Text style={styles.cropTag}>{data.cropType}</Text>}
          <StatusPill tone={tone} label={t.statusLabel[data.status]} />
        </View>
        <Text style={styles.kicker}>{t.possibleMatch}</Text>
        <Text style={styles.disease}>{data.disease}</Text>
        <ConfidenceMeter value={data.confidence} fg={tone.fg} label={t.confidence} />
      </View>

      {/* Uncertainty guidance */}
      {uncertain && (
        <View style={[styles.note, { backgroundColor: colors.warningBg, borderColor: colors.warningBorder }]}>
          <Text style={[styles.noteTitle, { color: colors.warning }]}>{t.uncertainTitle}</Text>
          <Text style={[styles.noteBody, { color: colors.warning }]}>
            {data.message ? `${data.message} ` : ""}
            {t.uncertainBody}
          </Text>
        </View>
      )}

      {!!data.description && !uncertain && (
        <Text style={styles.description}>{data.description}</Text>
      )}

      {/* Visual explanation */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>{t.visual}</Text>
        <View style={styles.compareRow}>
          {!!image && (
            <View style={styles.figure}>
              <Image source={{ uri: image }} style={styles.figImg} />
              <Text style={styles.figCap}>{t.yourPhoto}</Text>
            </View>
          )}
          {!!data.gradcam && (
            <View style={styles.figure}>
              <Image source={{ uri: data.gradcam }} style={styles.figImg} />
              <Text style={styles.figCap}>{t.modelAttention}</Text>
            </View>
          )}
        </View>
        {!!data.gradcam && <Text style={styles.mutedNote}>{t.gradcamNote}</Text>}
      </View>

      {/* Recommended treatment. Withheld on an uncertain result, as on web:
          naming a pesticide for a diagnosis the model is unsure of is the one
          wrong answer that costs a farmer money and a spray they cannot undo. */}
      {!uncertain && (
        <TreatmentCard
          treatments={data.treatments}
          disclaimer={data.treatmentDisclaimer}
          t={t}
        />
      )}

      {/* Guidance */}
      {sections.length > 0 && (
        <View>
          {uncertain && <Text style={styles.refNote}>{t.refNote}</Text>}
          {sections.map((s) => (
            <View key={s.key} style={styles.card}>
              <Text style={styles.cardTitle}>{s.label}</Text>
              <Text style={styles.body}>{s.value}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Alternatives */}
      {data.alternatives.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>{t.other}</Text>
          {data.alternatives.map((a, i) => (
            <View key={i} style={styles.altRow}>
              <Text style={styles.altName} numberOfLines={1}>{a.disease}</Text>
              <View style={styles.altBar}>
                <View style={[styles.altFill, { width: `${a.confidence}%` }]} />
              </View>
              <Text style={styles.altPct}>{a.confidence}%</Text>
            </View>
          ))}
        </View>
      )}

      <Feedback t={t} />

      {!!data.disclaimer && <Text style={styles.disclaimer}>{data.disclaimer}</Text>}

      <Pressable style={styles.primaryBtn} onPress={onCheckAnother} accessibilityRole="button">
        <Text style={styles.primaryBtnText}>{t.checkAnother}</Text>
      </Pressable>
    </View>
  );
}

function StatusPill({ tone, label }) {
  return (
    <View style={[styles.pill, { backgroundColor: tone.bg, borderColor: tone.border }]}>
      <View style={[styles.pillDot, { backgroundColor: tone.fg }]} />
      <Text style={[styles.pillText, { color: tone.fg }]}>{label}</Text>
    </View>
  );
}

function ConfidenceMeter({ value, fg, label }) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <View style={{ marginTop: 12 }}>
      <View style={styles.meterHead}>
        <Text style={styles.meterLabel}>{label}</Text>
        <Text style={styles.meterValue}>{pct}%</Text>
      </View>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${pct}%`, backgroundColor: fg }]} />
      </View>
    </View>
  );
}

function Feedback({ t }) {
  const [choice, setChoice] = useState(null); // session-local, honest (no network)
  return (
    <View style={[styles.card, styles.feedbackCard]}>
      {choice ? (
        <Text style={styles.feedbackDone}>{t.feedbackDone}</Text>
      ) : (
        <>
          <Text style={styles.feedbackQ}>{t.feedbackQ}</Text>
          <View style={styles.feedbackBtns}>
            <Pressable style={styles.secondaryBtn} onPress={() => setChoice("helpful")}>
              <Text style={styles.secondaryBtnText}>{t.helpful}</Text>
            </Pressable>
            <Pressable style={styles.ghostBtn} onPress={() => setChoice("wrong")}>
              <Text style={styles.ghostBtnText}>{t.wrong}</Text>
            </Pressable>
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 14 },
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: 16,
  },
  headTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  cropTag: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.primaryDark,
    backgroundColor: colors.greenSoft,
    borderColor: colors.primaryTint,
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 3,
    overflow: "hidden",
  },
  kicker: {
    fontSize: 12,
    color: colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  disease: { fontSize: 22, fontWeight: "800", color: colors.text, marginTop: 2 },

  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  pillDot: { width: 8, height: 8, borderRadius: 4 },
  pillText: { fontSize: 12, fontWeight: "700" },

  meterHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 },
  meterLabel: { fontSize: 13, color: colors.textMuted },
  meterValue: { fontSize: 18, fontWeight: "800", color: colors.text },
  track: { height: 8, backgroundColor: colors.surfaceHover, borderRadius: radius.pill, overflow: "hidden" },
  fill: { height: "100%", borderRadius: radius.pill },

  note: { borderWidth: 1, borderRadius: radius.md, padding: 12 },
  noteTitle: { fontWeight: "700", fontSize: 14, marginBottom: 2 },
  noteBody: { fontSize: 13, lineHeight: 19 },

  description: { color: colors.textMuted, fontSize: 14, lineHeight: 20 },

  sectionTitle: { fontSize: 16, fontWeight: "700", color: colors.text, marginBottom: 10 },
  compareRow: { flexDirection: "row", gap: 10 },
  figure: { flex: 1 },
  figImg: {
    width: "100%",
    aspectRatio: 1,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceHover,
    resizeMode: "cover",
  },
  figCap: { textAlign: "center", fontSize: 12, color: colors.textMuted, marginTop: 6 },
  mutedNote: { marginTop: 10, fontSize: 12, color: colors.textMuted, lineHeight: 17 },

  refNote: { fontSize: 13, color: colors.warning, marginBottom: 10 },
  cardTitle: { fontSize: 15, fontWeight: "700", color: colors.primaryDark, marginBottom: 6 },
  body: { fontSize: 14, color: colors.text, lineHeight: 20 },

  altRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 7 },
  altName: { flex: 1, fontSize: 13, color: colors.text },
  altBar: { width: 90, height: 6, backgroundColor: colors.surfaceHover, borderRadius: radius.pill, overflow: "hidden" },
  altFill: { height: "100%", backgroundColor: colors.textMuted, borderRadius: radius.pill },
  altPct: { width: 44, textAlign: "right", fontSize: 13, fontWeight: "600", color: colors.textMuted },

  feedbackCard: { flexDirection: "column", gap: 10 },
  feedbackQ: { fontWeight: "600", color: colors.text },
  feedbackBtns: { flexDirection: "row", gap: 10 },
  feedbackDone: { color: colors.success, fontWeight: "600" },

  disclaimer: { fontSize: 12, color: colors.textMuted, fontStyle: "italic", lineHeight: 17, paddingHorizontal: 2 },

  primaryBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryBtnText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  secondaryBtn: {
    flex: 1,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
  },
  secondaryBtnText: { color: colors.primaryDark, fontWeight: "700" },
  ghostBtn: { flex: 1, minHeight: 44, alignItems: "center", justifyContent: "center" },
  ghostBtnText: { color: colors.textMuted, fontWeight: "700" },
});
