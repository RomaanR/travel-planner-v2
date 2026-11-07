import { loadFont as loadSerif } from "@remotion/google-fonts/CormorantGaramond";
import { loadFont as loadSans } from "@remotion/google-fonts/DMSans";

const serif = loadSerif("italic", { weights: ["500", "600"] });
const sans = loadSans("normal", { weights: ["400", "700"] });

export const FONT_SERIF = serif.fontFamily;
export const FONT_SANS = sans.fontFamily;

// Site palette (tailwind.config.ts) and the US State Dept level colours used on the live map.
export const C = {
  paper: "#F5F0E8",
  paperDark: "#EDE8DC",
  ink: "#0A0A0A",
  inkLight: "#6B6B6B",
  orange: "#C2410C",
  noData: "#DAD4C6",
};

export const LEVELS = [
  { level: 1, fill: "#2F6DB5", name: "Normal precautions" },
  { level: 2, fill: "#E3B934", name: "Increased caution" },
  { level: 3, fill: "#D9531E", name: "Reconsider travel" },
  { level: 4, fill: "#8B1A10", name: "Do not travel" },
] as const;
