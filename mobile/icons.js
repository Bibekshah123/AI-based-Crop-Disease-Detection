/* Small line icons shared by the sidebar and the header, drawn with
   react-native-svg so they stay crisp at any density. */
import Svg, { Path, Circle } from "react-native-svg";

const base = (size) => ({ width: size, height: size, viewBox: "0 0 24 24", fill: "none" });

export function LeafIcon({ color, size = 20 }) {
  return (
    <Svg {...base(size)}>
      <Path
        d="M20 4c-8 0-14 4-14 11 0 1.6.4 3 1 4.2L4 22l1.5-1.5C7 21.5 9 22 11 22c7 0 9-6 9-14 0-1.5 0-3 0-4Z"
        fill={color}
      />
      <Path d="M8 18c3-5 6-7 9-8" stroke="#fff" strokeWidth={1.5} strokeLinecap="round" />
    </Svg>
  );
}

export function ClockIcon({ color, size = 20 }) {
  return (
    <Svg {...base(size)}>
      <Circle cx="12" cy="12" r="8.2" stroke={color} strokeWidth={1.7} />
      <Path d="M12 7.6V12l3 1.8" stroke={color} strokeWidth={1.7} strokeLinecap="round" />
    </Svg>
  );
}

export function PersonIcon({ color, size = 20 }) {
  return (
    <Svg {...base(size)}>
      <Circle cx="12" cy="8" r="3.4" stroke={color} strokeWidth={1.7} />
      <Path d="M5 20c0-3.6 3.1-5.6 7-5.6s7 2 7 5.6" stroke={color} strokeWidth={1.7} strokeLinecap="round" />
    </Svg>
  );
}

export function ExitIcon({ color, size = 20 }) {
  return (
    <Svg {...base(size)}>
      <Path d="M14 20H6a1 1 0 01-1-1V5a1 1 0 011-1h8" stroke={color} strokeWidth={1.7} strokeLinecap="round" />
      <Path d="M17 15l3-3-3-3M20 12h-9" stroke={color} strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function MenuIcon({ color, size = 22 }) {
  return (
    <Svg {...base(size)}>
      <Path d="M4 7h16M4 12h16M4 17h16" stroke={color} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}

export function CameraIcon({ color, size = 20 }) {
  return (
    <Svg {...base(size)}>
      <Path d="M4 8h3l1.5-2h7L17 8h3v11H4z" stroke={color} strokeWidth={1.7} strokeLinejoin="round" />
      <Circle cx="12" cy="13" r="3.2" stroke={color} strokeWidth={1.7} />
    </Svg>
  );
}
