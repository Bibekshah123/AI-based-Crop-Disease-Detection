/* What the product physically looks like on the agrovet shelf.

   Deliberately generic drawings, not brand photos: treatments.json names ACTIVE
   INGREDIENTS, and every manufacturer packages the same active ingredient
   differently. A drawing of the FORM (powder sachet vs liquid bottle vs
   granules) is true for all of them, carries no trademark, and cannot mislead
   someone into buying a lookalike product from the same brand's range. */

import { FORM_SHAPE, LIQUID, GRANULE } from "../lib/formulations";

export default function FormulationIcon({ formulation, title }) {
  const shape = FORM_SHAPE[formulation];
  if (!shape) return null;

  const common = { viewBox: "0 0 40 48", width: "34", height: "41", role: "img", "aria-label": title };

  if (shape === LIQUID) {
    return (
      <svg {...common}>
        <rect x="15" y="3" width="10" height="6" rx="1.5" fill="var(--color-text-muted)" />
        <path d="M16 9h8v4l5 5v25a2 2 0 0 1-2 2H13a2 2 0 0 1-2-2V18l5-5V9Z"
              fill="var(--color-surface)" stroke="var(--color-text)" strokeWidth="1.6" strokeLinejoin="round" />
        <path d="M11 27h18v14a2 2 0 0 1-2 2H13a2 2 0 0 1-2-2V27Z" fill="var(--color-primary)" opacity="0.35" />
        <rect x="14" y="30" width="12" height="8" rx="1" fill="var(--color-surface)" opacity="0.9" />
      </svg>
    );
  }

  if (shape === GRANULE) {
    return (
      <svg {...common}>
        <path d="M8 12h24v31a2 2 0 0 1-2 2H10a2 2 0 0 1-2-2V12Z"
              fill="var(--color-surface)" stroke="var(--color-text)" strokeWidth="1.6" strokeLinejoin="round" />
        <path d="M8 12l4-5h16l4 5" fill="none" stroke="var(--color-text)" strokeWidth="1.6" strokeLinejoin="round" />
        {[[14,26],[20,23],[26,27],[16,33],[23,32],[19,38],[27,36],[13,39]].map(([cx,cy],i)=>(
          <circle key={i} cx={cx} cy={cy} r="2.1" fill="var(--color-primary)" opacity="0.6" />
        ))}
      </svg>
    );
  }

  // POWDER - a sealed sachet with a serrated top edge
  return (
    <svg {...common}>
      <path d="M9 9h22v34a2 2 0 0 1-2 2H11a2 2 0 0 1-2-2V9Z"
            fill="var(--color-surface)" stroke="var(--color-text)" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M9 9l3-3 3 3 3-3 3 3 3-3 3 3 3-3 3 3" fill="none"
            stroke="var(--color-text)" strokeWidth="1.6" strokeLinejoin="round" strokeLinecap="round" />
      <rect x="13" y="20" width="14" height="19" rx="1.5" fill="var(--color-primary)" opacity="0.28" />
      {[[17,26],[22,25],[19,31],[24,30],[16,35],[22,36]].map(([cx,cy],i)=>(
        <circle key={i} cx={cx} cy={cy} r="1.3" fill="var(--color-primary)" opacity="0.75" />
      ))}
    </svg>
  );
}
