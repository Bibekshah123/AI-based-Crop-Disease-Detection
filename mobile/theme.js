// Design tokens — mirrors the web app's calm agricultural palette
// (frontend/src/styles/tokens.css). No dark theme, no neon.
export const colors = {
  primary: "#2F6B3B",
  primaryDark: "#1F4D2B",
  primaryTint: "#DFEBE1",
  page: "#F7F8F5",
  greenSoft: "#EEF5EF",
  surface: "#FFFFFF",
  text: "#1E2922",
  textMuted: "#5F6B63",
  border: "#DDE4DE",
  warning: "#B7791F",
  warningBg: "#FFF8E6",
  warningBorder: "#EFDCAE",
  error: "#B42318",
  errorBg: "#FFF1F0",
  errorBorder: "#F3C9C6",
  success: "#287A3D",
  surfaceHover: "#F2F4F0",
};

// Status → colours, matching the web's success / warning / error tones.
export const tones = {
  success: { bg: colors.greenSoft, fg: colors.success, border: colors.primaryTint },
  warning: { bg: colors.warningBg, fg: colors.warning, border: colors.warningBorder },
  error: { bg: colors.errorBg, fg: colors.error, border: colors.errorBorder },
  neutral: { bg: colors.surfaceHover, fg: colors.textMuted, border: colors.border },
};

export const radius = { sm: 8, md: 12, lg: 16, pill: 999 };
