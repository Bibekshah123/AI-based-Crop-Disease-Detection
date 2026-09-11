/* Hero illustration: a leaf with lesions inside a detection frame, plus the
   confidence read-out the app actually produces. Drawn rather than a stock
   photo - it stays sharp, adds no asset, and shows the real output shape. */
export default function HeroArt() {
  return (
    <svg viewBox="0 0 420 330" role="img" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="leafFill" x1="0" y1="0" x2="0.4" y2="1">
          <stop offset="0%" stopColor="#4e9e6a" />
          <stop offset="100%" stopColor="#2f7a4a" />
        </linearGradient>
      </defs>

      {/* panel */}
      <rect x="8" y="8" width="404" height="314" rx="18"
            fill="var(--color-surface)" stroke="var(--color-border)" strokeWidth="1.5" />

      <g transform="translate(196 150) rotate(-12)">
        {/* leaf */}
        <path d="M0,-104 C-42,-66 -60,0 -46,57 C-35,101 -13,123 0,132 C13,123 35,101 46,57 C60,0 42,-66 0,-104 Z"
              fill="url(#leafFill)" />
        {/* midrib + veins */}
        <path d="M0,-96 L0,126" stroke="#ffffff" strokeWidth="2.4" opacity="0.55" strokeLinecap="round" />
        {[-66, -34, -2, 30, 62].map((y, i) => (
          <g key={i} stroke="#ffffff" strokeWidth="1.6" opacity="0.34" fill="none" strokeLinecap="round">
            <path d={`M0,${y} C-14,${y + 6} -26,${y + 16} -34,${y + 30}`} />
            <path d={`M0,${y} C14,${y + 6} 26,${y + 16} 34,${y + 30}`} />
          </g>
        ))}
        {/* lesions - the thing the model is looking for */}
        <g>
          <ellipse cx="-15" cy="14" rx="15" ry="12" fill="#8a5a20" opacity="0.9" />
          <ellipse cx="-15" cy="14" rx="7" ry="5.5" fill="#5c3a12" />
          <ellipse cx="14" cy="-26" rx="10" ry="8" fill="#9a6a26" opacity="0.85" />
          <ellipse cx="20" cy="46" rx="8" ry="6.5" fill="#9a6a26" opacity="0.75" />
        </g>
      </g>

      {/* detection frame around the lesion cluster */}
      <g stroke="var(--color-primary)" strokeWidth="2.6" fill="none" strokeLinecap="round">
        <path d="M128 118 L128 100 L146 100" />
        <path d="M246 100 L264 100 L264 118" />
        <path d="M264 200 L264 218 L246 218" />
        <path d="M146 218 L128 218 L128 200" />
      </g>
      <rect x="128" y="100" width="136" height="118" rx="6"
            fill="none" stroke="var(--color-primary)" strokeWidth="1" strokeDasharray="5 6" opacity="0.45" />

      {/* confidence read-out, matching what the result page shows */}
      <g transform="translate(40 258)">
        <rect x="0" y="0" width="340" height="46" rx="10"
              fill="var(--color-green-soft)" stroke="var(--color-border)" strokeWidth="1" />
        <circle cx="24" cy="23" r="6" fill="var(--color-success)" />
        <rect x="42" y="12" width="132" height="8" rx="4" fill="var(--color-primary)" opacity="0.25" />
        <rect x="42" y="12" width="104" height="8" rx="4" fill="var(--color-primary)" />
        <rect x="42" y="27" width="86" height="6" rx="3" fill="var(--color-text-muted)" opacity="0.28" />
        <rect x="286" y="14" width="34" height="16" rx="5" fill="var(--color-primary)" opacity="0.16" />
      </g>
    </svg>
  );
}
