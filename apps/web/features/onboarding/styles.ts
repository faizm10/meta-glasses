/**
 * The 12 onboarding style stills (DESIGN.md §11). Each is an original
 * flat-color cinematic composition — horizontal bands + a light point —
 * standing in for a graded frame. The chosen slugs seed taste_profiles
 * and, from Phase 5, bias the AI's grade, pace, and music passes.
 */
export type StyleStill = {
  slug: string;
  name: string;
  /** One mono-type line shown under the name. */
  note: string;
  /** Top-to-bottom flat bands, percentages summing to 100. */
  bands: { color: string; height: number }[];
  /** Optional light point, in % of card width/height. */
  light?: { x: number; y: number; color: string };
};

export const STYLE_STILLS: StyleStill[] = [
  {
    slug: "golden-hour",
    name: "Golden hour",
    note: "warm · patient · low sun",
    bands: [
      { color: "#201727", height: 30 },
      { color: "#45283a", height: 18 },
      { color: "#8a4448", height: 16 },
      { color: "#c56a4a", height: 14 },
      { color: "#100d13", height: 22 },
    ],
    light: { x: 62, y: 52, color: "#e6a550" },
  },
  {
    slug: "neon-night",
    name: "Neon night",
    note: "electric · wet streets",
    bands: [
      { color: "#0a0a14", height: 42 },
      { color: "#141033", height: 22 },
      { color: "#3b1b52", height: 14 },
      { color: "#0c0c18", height: 22 },
    ],
    light: { x: 30, y: 58, color: "#e15fb6" },
  },
  {
    slug: "noir",
    name: "Noir",
    note: "hard shadow · high contrast",
    bands: [
      { color: "#050506", height: 38 },
      { color: "#d9d4c8", height: 10 },
      { color: "#0a0a0b", height: 52 },
    ],
  },
  {
    slug: "pastel-morning",
    name: "Pastel morning",
    note: "soft · quiet · early",
    bands: [
      { color: "#c8d4e0", height: 34 },
      { color: "#e3cfd4", height: 22 },
      { color: "#d9c9b8", height: 20 },
      { color: "#6d7480", height: 24 },
    ],
    light: { x: 72, y: 30, color: "#f4e3c8" },
  },
  {
    slug: "handheld-doc",
    name: "Handheld documentary",
    note: "close · human · unpolished",
    bands: [
      { color: "#2e2a24", height: 30 },
      { color: "#57493a", height: 26 },
      { color: "#8a7458", height: 18 },
      { color: "#1d1a16", height: 26 },
    ],
  },
  {
    slug: "overcast-silver",
    name: "Overcast silver",
    note: "muted · even · nordic",
    bands: [
      { color: "#9aa2a8", height: 36 },
      { color: "#6f777d", height: 22 },
      { color: "#474d52", height: 20 },
      { color: "#23262a", height: 22 },
    ],
  },
  {
    slug: "teal-orange",
    name: "Teal and orange",
    note: "blockbuster · bold",
    bands: [
      { color: "#0e2a33", height: 34 },
      { color: "#155263", height: 20 },
      { color: "#d47b3f", height: 16 },
      { color: "#0b1d24", height: 30 },
    ],
    light: { x: 48, y: 50, color: "#f0a05a" },
  },
  {
    slug: "kodachrome",
    name: "Kodachrome '68",
    note: "film grain · primary reds",
    bands: [
      { color: "#3a3730", height: 28 },
      { color: "#a33b2e", height: 18 },
      { color: "#c8b98d", height: 22 },
      { color: "#26231d", height: 32 },
    ],
  },
  {
    slug: "blue-hour",
    name: "Blue hour",
    note: "dusk · melancholy · still",
    bands: [
      { color: "#0d1526", height: 40 },
      { color: "#1c2c4d", height: 22 },
      { color: "#31456e", height: 14 },
      { color: "#090d18", height: 24 },
    ],
    light: { x: 26, y: 34, color: "#a8c0e8" },
  },
  {
    slug: "desert-wide",
    name: "Desert wide",
    note: "vast · dry heat · epic",
    bands: [
      { color: "#c2a26a", height: 30 },
      { color: "#d8b87e", height: 18 },
      { color: "#a97e4e", height: 18 },
      { color: "#5c4326", height: 34 },
    ],
    light: { x: 80, y: 22, color: "#f2dcae" },
  },
  {
    slug: "tungsten-interior",
    name: "Tungsten interior",
    note: "lamplight · intimate · night in",
    bands: [
      { color: "#171310", height: 34 },
      { color: "#3d2c1c", height: 22 },
      { color: "#7a5530", height: 16 },
      { color: "#120e0b", height: 28 },
    ],
    light: { x: 40, y: 44, color: "#e6a550" },
  },
  {
    slug: "high-key",
    name: "High key",
    note: "bright · clean · editorial",
    bands: [
      { color: "#efece6", height: 44 },
      { color: "#dcd8cf", height: 24 },
      { color: "#b8b3a8", height: 14 },
      { color: "#8f8b82", height: 18 },
    ],
  },
];

export const STYLE_SLUGS = new Set(STYLE_STILLS.map((s) => s.slug));

export const PICK_COUNT = 5;
