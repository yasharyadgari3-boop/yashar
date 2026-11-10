/** The only colors the design may use. Mirrored as CSS variables in src/app/globals.css. */
export const colors = {
  bg: "#FFFFFF",
  alt: "#F6F5F2",
  gold: "#C5A46D",
  goldDeep: "#8A6A35",
  ink: "#1A1A1A",
  muted: "#6B6B6B",
  line: "#E7E2D8",
} as const;

export type ColorToken = keyof typeof colors;

/** Text/background pairs actually used in the UI. `large` means heading-size text (3:1 minimum). */
export const textPairs: ReadonlyArray<{ text: ColorToken; background: ColorToken; large: boolean }> = [
  { text: "ink", background: "bg", large: false },
  { text: "ink", background: "alt", large: false },
  { text: "muted", background: "bg", large: false },
  { text: "muted", background: "alt", large: false },
  { text: "goldDeep", background: "bg", large: false },
  { text: "goldDeep", background: "alt", large: false },
  { text: "bg", background: "ink", large: false },
];
