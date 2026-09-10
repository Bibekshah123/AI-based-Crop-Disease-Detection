/* Recommended controls for a diagnosed disease.

   Products are named by ACTIVE INGREDIENT, not brand: "Mancozeb 75% WP" is what
   is printed on every label worldwide, while trade names differ by country and
   go stale. The coloured triangle is the WHO/FAO hazard band that appears on
   legally sold pesticide packaging, so a farmer can check the bottle they are
   handed matches the hazard class shown here. */

import { useLang } from "../context/LanguageContext";
import FormulationIcon from "./FormulationIcon";
import { FORM_SHAPE, SHAPE_KEYS } from "../lib/formulations";

const BANDS = {
  red:    { fill: "#c62828", labelKey: "bandIa",  adviceKey: "bandIaNote" },
  yellow: { fill: "#f9a825", labelKey: "bandIi",  adviceKey: "bandIiNote" },
  blue:   { fill: "#1565c0", labelKey: "bandIii", adviceKey: "bandIiiNote" },
  green:  { fill: "#2e7d32", labelKey: "bandU",   adviceKey: "bandUNote" },
};

const FORM_KEYS = { WP: "formWP", SP: "formSP", SC: "formSC", EC: "formEC", SL: "formSL", G: "formG", OL: "formOL" };
const KIND_KEYS = {
  cultural: "kindCultural",
  fungicide: "kindFungicide",
  biological: "kindBiological",
  disinfectant: "kindDisinfectant",
  insecticide: "kindInsecticide",
  biopesticide: "kindBiopesticide",
  "fungicide/bactericide": "kindFungicideBactericide",
  bactericide: "kindBactericide",
  acaricide: "kindAcaricide",
};

function HazardBand({ band, L }) {
  const meta = BANDS[band];
  if (!meta) return null;
  return (
    <svg viewBox="0 0 24 24" width="34" height="34" role="img"
         aria-label={L[meta.labelKey]}>
      <title>{meta.label}</title>
      {/* The triangle is the shape used on the label itself */}
      <polygon points="12,3 22,20 2,20" fill={meta.fill} />
      <polygon points="12,7 18.5,18 5.5,18" fill="#fff" opacity="0.22" />
    </svg>
  );
}

export default function TreatmentCard({ treatments, disclaimer, styles }) {
  const { t: L, lang } = useLang();
  if (!treatments?.length) return null;

  return (
    <section className={`surface ${styles.panel}`} aria-labelledby="treat-heading">
      <h2 id="treat-heading" className={styles.sectionTitle}>{L.recommendedTreatment}</h2>
      <p className={styles.treatLead}>{L.treatLead}</p>

      <ol className={styles.treatList}>
        {treatments.map((t, i) => {
          const band = BANDS[t.band];
          const chemical = t.kind !== "cultural";
          return (
            <li key={i} className={styles.treatItem}>
              <div className={styles.treatHead}>
                {chemical ? <HazardBand band={t.band} L={L} /> : <span className={styles.treatLeaf} aria-hidden="true">🌿</span>}
                <div>
                  <p className={styles.treatName}>{chemical ? t.active : L.culturalControl}</p>
                  <p className={styles.treatKind}>
                    {L[KIND_KEYS[t.kind]] ?? t.kind}
                    {chemical && band && <> · <span style={{ color: band.fill }}>{L[band.labelKey]}</span></>}
                  </p>
                </div>
              </div>

              {chemical && (
                <>
                  <dl className={styles.treatSpecs}>
                    <div><dt>{L.dose}</dt><dd>{lang === "np" && t.dose_np ? t.dose_np : t.dose}</dd></div>
                    <div><dt>{L.formulation}</dt><dd>{L[FORM_KEYS[t.formulation]] ?? L.seeLabel}</dd></div>
                    {t.phi_days > 0 && (
                      <div><dt>{L.waitBeforeHarvest}</dt><dd>{t.phi_days} {L.days}</dd></div>
                    )}
                    {t.interval_days > 0 && (
                      <div><dt>{L.repeat}</dt><dd>{L.repeatEvery(t.interval_days)}</dd></div>
                    )}
                    {band && <div><dt>{L.safety}</dt><dd>{L[band.adviceKey]}</dd></div>}
                  </dl>
                </>
              )}
              {chemical && (
                <div className={styles.buying}>
                  <FormulationIcon formulation={t.formulation} title={L[SHAPE_KEYS[FORM_SHAPE[t.formulation]]] ?? ""} />
                  <div className={styles.buyingText}>
                    <p className={styles.buyingTitle}>{L.buyingIt}</p>
                    <p className={styles.buyingBody}>
                      {FORM_SHAPE[t.formulation]
                        ? L.buyingItBody(t.active, t.formulation)
                        : L.buyingItNoCode(t.active)}
                    </p>
                    {FORM_SHAPE[t.formulation] && (
                      <p className={styles.buyingShape}>{L[SHAPE_KEYS[FORM_SHAPE[t.formulation]]]}</p>
                    )}
                  </div>
                </div>
              )}
              <p className={styles.treatNote}>{lang === "np" && t.note_np ? t.note_np : t.note}</p>
            </li>
          );
        })}
      </ol>

      {disclaimer && (
        <p className={`note note-warning ${styles.treatDisclaimer}`} role="note">{disclaimer}</p>
      )}
    </section>
  );
}
