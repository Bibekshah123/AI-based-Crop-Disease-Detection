/* The flag of Nepal - the only non-rectangular national flag, two stacked
   pennons. Drawn rather than shipped as an image so it stays crisp at any size
   and adds no asset. Official colours: crimson #DC143C, blue border #003893. */
export default function NepalFlag({ size = 26, title }) {
  return (
    <svg
      viewBox="0 0 96 110"
      width={(size * 96) / 110}
      height={size}
      role="img"
      aria-label={title}
      focusable="false"
    >
      {/* outline: hoist edge, up to the upper pennon tip, back to the notch,
          out to the lower pennon tip, then down-left along the bottom edge */}
      <path
        d="M5 5 L74 33 L34 47 L86 73 L5 103 Z"
        fill="#DC143C"
        stroke="#003893"
        strokeWidth="9"
        strokeLinejoin="round"
      />
      {/* moon, upper pennon */}
      <g fill="#fff">
        <path d="M30 20a10 10 0 1 0 0 17 8.5 8.5 0 0 1 0-17Z" />
        <circle cx="30" cy="16" r="2.4" />
        <circle cx="22" cy="20" r="2" />
        <circle cx="38" cy="22" r="2" />
      </g>
      {/* sun, lower pennon */}
      <g fill="#fff">
        <circle cx="33" cy="70" r="7.5" />
        {Array.from({ length: 8 }, (_, i) => {
          const a = (i * Math.PI) / 4;
          return (
            <circle
              key={i}
              cx={33 + Math.cos(a) * 12}
              cy={70 + Math.sin(a) * 12}
              r="2.4"
            />
          );
        })}
      </g>
    </svg>
  );
}
