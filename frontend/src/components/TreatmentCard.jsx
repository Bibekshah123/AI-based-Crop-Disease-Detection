/* Recommended controls for a diagnosed disease.

   Products are named by ACTIVE INGREDIENT, not brand: "Mancozeb 75% WP" is what
   is printed on every label worldwide, while trade names differ by country and
   go stale. The coloured triangle is the WHO/FAO hazard band that appears on
   legally sold pesticide packaging, so a farmer can check the bottle they are
   handed matches the hazard class shown here. */

const BANDS = {
  red:    { fill: "#c62828", label: "Highly hazardous",      advice: "Full protective clothing. Never spray in wind." },
  yellow: { fill: "#f9a825", label: "Moderately hazardous",  advice: "Gloves, mask and long sleeves required." },
  blue:   { fill: "#1565c0", label: "Slightly hazardous",    advice: "Gloves and a mask are still recommended." },
  green:  { fill: "#2e7d32", label: "Unlikely to be hazardous", advice: "Low risk, but still wash hands after use." },
};

const FORMULATIONS = {
  WP: "Wettable powder — mix with water",
  SP: "Soluble powder — dissolves in water",
  SC: "Suspension concentrate — shake before measuring",
  EC: "Emulsifiable concentrate — oily liquid, measure carefully",
  SL: "Soluble liquid — dissolves in water",
  G:  "Granule — apply to the soil, do not dilute",
  OL: "Oil formulation — spray in the evening",
};

function HazardBand({ band }) {
  const meta = BANDS[band];
  if (!meta) return null;
  return (
    <svg viewBox="0 0 24 24" width="34" height="34" role="img"
         aria-label={`Hazard band: ${meta.label}`}>
      <title>{meta.label}</title>
      {/* The triangle is the shape used on the label itself */}
      <polygon points="12,3 22,20 2,20" fill={meta.fill} />
      <polygon points="12,7 18.5,18 5.5,18" fill="#fff" opacity="0.22" />
    </svg>
  );
}

export default function TreatmentCard({ treatments, disclaimer, styles }) {
  if (!treatments?.length) return null;

  return (
    <section className={`surface ${styles.panel}`} aria-labelledby="treat-heading">
      <h2 id="treat-heading" className={styles.sectionTitle}>Recommended treatment</h2>
      <p className={styles.treatLead}>
        Try the non-chemical step first — it costs nothing and leaves no residue. Take this
        page to your agrovet and ask for the <strong>active ingredient</strong> named below,
        not a brand.
      </p>

      <ol className={styles.treatList}>
        {treatments.map((t, i) => {
          const band = BANDS[t.band];
          const chemical = t.kind !== "cultural";
          return (
            <li key={i} className={styles.treatItem}>
              <div className={styles.treatHead}>
                {chemical ? <HazardBand band={t.band} /> : <span className={styles.treatLeaf} aria-hidden="true">🌿</span>}
                <div>
                  <p className={styles.treatName}>{chemical ? t.active : "Cultural control"}</p>
                  <p className={styles.treatKind}>
                    {t.kind}
                    {chemical && band && <> · <span style={{ color: band.fill }}>{band.label}</span></>}
                  </p>
                </div>
              </div>

              {chemical && (
                <>
                  <dl className={styles.treatSpecs}>
                    <div><dt>Dose</dt><dd>{t.dose}</dd></div>
                    <div><dt>Formulation</dt><dd>{t.formulation} — {FORMULATIONS[t.formulation] ?? "see label"}</dd></div>
                    {t.phi_days > 0 && (
                      <div><dt>Wait before harvest</dt><dd>{t.phi_days} days</dd></div>
                    )}
                    {t.interval_days > 0 && (
                      <div><dt>Repeat</dt><dd>every {t.interval_days} days if symptoms continue</dd></div>
                    )}
                    {band && <div><dt>Safety</dt><dd>{band.advice}</dd></div>}
                  </dl>
                </>
              )}
              <p className={styles.treatNote}>{t.note}</p>
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
