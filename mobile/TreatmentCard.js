/* Recommended controls for a diagnosed disease — the React Native twin of
   frontend/src/components/TreatmentCard.jsx.

   Products are named by ACTIVE INGREDIENT, not brand: "Mancozeb 75% WP" is what
   is printed on every label worldwide, while trade names differ by country and
   go stale. The coloured triangle is the WHO/FAO hazard band that appears on
   legally sold pesticide packaging, so a farmer can check the bottle they are
   handed matches the hazard class shown here.

   The web version draws that triangle with an <svg>. react-native-svg is not a
   dependency here, so it is drawn with the border trick instead: a zero-size
   box whose left and right borders are transparent leaves the bottom border
   rendering as a triangle. */
import { View, Text, StyleSheet } from "react-native";
import { colors, radius } from "./theme";

const BAND_FILL = {
  red: "#c62828",
  yellow: "#f9a825",
  blue: "#1565c0",
  green: "#2e7d32",
};

function HazardBand({ band }) {
  const fill = BAND_FILL[band];
  if (!fill) return null;
  return (
    <View
      accessibilityRole="image"
      accessibilityLabel={`Hazard band: ${band}`}
      style={[styles.triangle, { borderBottomColor: fill }]}
    />
  );
}

function Spec({ label, value }) {
  return (
    <View style={styles.specRow}>
      <Text style={styles.specLabel}>{label}</Text>
      <Text style={styles.specValue}>{value}</Text>
    </View>
  );
}

export default function TreatmentCard({ treatments, disclaimer, t }) {
  if (!treatments?.length) return null;
  const tr = t.treat;

  return (
    <View style={styles.card}>
      <Text style={styles.sectionTitle}>{tr.title}</Text>
      <Text style={styles.lead}>{tr.lead}</Text>

      {treatments.map((item, i) => {
        const chemical = item.kind !== "cultural";
        const band = chemical ? tr.bands[item.band] : null;
        const form = tr.formulations[item.formulation] ?? tr.formulationFallback;

        return (
          <View key={i} style={[styles.item, i > 0 && styles.itemDivider]}>
            <View style={styles.head}>
              {chemical ? (
                <HazardBand band={item.band} />
              ) : (
                <Text style={styles.leafIcon}>🌿</Text>
              )}
              <View style={styles.headText}>
                <Text style={styles.name}>
                  {chemical ? item.active : tr.cultural}
                </Text>
                <Text style={styles.kind}>
                  {tr.kinds[item.kind] ?? item.kind}
                  {band ? " · " : ""}
                  {band ? (
                    <Text style={{ color: BAND_FILL[item.band] }}>{band.label}</Text>
                  ) : null}
                </Text>
              </View>
            </View>

            {chemical && (
              <View style={styles.specs}>
                <Spec label={tr.dose} value={item.dose} />
                <Spec label={tr.formulation} value={`${item.formulation} — ${form}`} />
                {item.phi_days > 0 && (
                  <Spec label={tr.phi} value={`${item.phi_days} ${tr.days}`} />
                )}
                {item.interval_days > 0 && (
                  <Spec label={tr.repeat} value={tr.every(item.interval_days)} />
                )}
                {band && <Spec label={tr.safety} value={band.advice} />}
              </View>
            )}

            {!!item.note && <Text style={styles.note}>{item.note}</Text>}
          </View>
        );
      })}

      {!!disclaimer && (
        <View style={styles.disclaimerBox}>
          <Text style={styles.disclaimerText}>{disclaimer}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: 16,
  },
  sectionTitle: { fontSize: 16, fontWeight: "700", color: colors.text, marginBottom: 6 },
  lead: { fontSize: 13, color: colors.textMuted, lineHeight: 19, marginBottom: 4 },

  item: { paddingTop: 14 },
  itemDivider: { borderTopWidth: 1, borderTopColor: colors.border, marginTop: 14 },

  head: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  // Zero-size box: transparent side borders leave the bottom border as a triangle.
  triangle: {
    width: 0,
    height: 0,
    marginTop: 2,
    borderLeftWidth: 17,
    borderRightWidth: 17,
    borderBottomWidth: 30,
    borderStyle: "solid",
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
  },
  leafIcon: { fontSize: 26, width: 34, textAlign: "center" },
  headText: { flex: 1 },
  name: { fontSize: 15, fontWeight: "700", color: colors.text },
  kind: { fontSize: 12, color: colors.textMuted, marginTop: 2, textTransform: "capitalize" },

  specs: { marginTop: 10, gap: 6 },
  specRow: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  specLabel: { width: 116, fontSize: 12, color: colors.textMuted },
  specValue: { flex: 1, fontSize: 13, color: colors.text, lineHeight: 18 },

  note: { marginTop: 10, fontSize: 13, color: colors.textMuted, lineHeight: 19 },

  disclaimerBox: {
    marginTop: 16,
    backgroundColor: colors.warningBg,
    borderColor: colors.warningBorder,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: 12,
  },
  disclaimerText: { fontSize: 12, color: colors.warning, lineHeight: 18 },
});
