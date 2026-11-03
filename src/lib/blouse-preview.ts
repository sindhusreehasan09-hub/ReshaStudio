import { DEFAULT_SLEEVE, SLEEVE_OPTIONS, type RequestSelections, type SleeveDesign } from "./outfit-prompt";
import type { SavedDesign } from "./local-gallery";

export const NECKLINE_OPTIONS = [
  { value: "round", label: "Round" }, { value: "v", label: "V" },
  { value: "u", label: "U" }, { value: "sweetheart", label: "Sweetheart" },
  { value: "square", label: "Square" }, { value: "boat", label: "Boat" },
  { value: "high", label: "High neck" }, { value: "custom", label: "Custom" },
] as const;
export type Neckline = (typeof NECKLINE_OPTIONS)[number]["value"];
export type BlouseDraft = Partial<RequestSelections> & { neckline: Neckline; necklineCustom: string };

// Preview-only state. Never submitted to generation or written over a saved design.
export function blouseDraftFromDesign(design?: SavedDesign | null): BlouseDraft {
  const sleeve = SLEEVE_OPTIONS.find(o => o.value === design?.sleeve || o.label === design?.sleeve)?.value ?? DEFAULT_SLEEVE;
  return { sleeve, ...design?.selections, neckline: "round", necklineCustom: "" };
}

export function sleeveLength(sleeve: SleeveDesign = DEFAULT_SLEEVE) {
  if (sleeve === "sleeveless") return 0;
  if (sleeve.includes("cap") || sleeve === "cap" || sleeve === "butterfly-cap") return 16;
  if (["short", "puff", "bubble-band", "jeweled-cuff", "tassel-cuff", "flutter", "ruffle"].includes(sleeve)) return 28;
  if (sleeve === "elbow") return 44;
  if (sleeve === "three-quarter") return 58;
  return 76;
}

export function previewColour(colour?: string | null, custom?: string | null) {
  if (["custom", "contrast"].includes(colour ?? "") && custom && /^#[\da-f]{6}$/i.test(custom)) return custom;
  const colours: Record<string, string> = {
    gold: "var(--gold)", "antique-gold": "var(--swatch-antique-gold)", silver: "var(--swatch-silver)",
    ivory: "var(--card)", black: "var(--swatch-black)", maroon: "var(--primary)", green: "var(--swatch-green)",
    pink: "var(--swatch-pink)", blue: "var(--swatch-blue)",
  };
  return colours[colour ?? ""] ?? "var(--secondary)";
}

export const NECKLINE_PATHS: Record<Neckline, string> = {
  round: "M74 35 Q100 67 126 35", v: "M74 35 L100 78 L126 35",
  u: "M74 35 L76 66 Q100 97 124 66 L126 35", sweetheart: "M74 35 Q82 70 100 59 Q118 70 126 35",
  square: "M74 35 V72 H126 V35", boat: "M66 35 Q100 50 134 35",
  high: "M87 35 V22 H113 V35", custom: "M74 35 Q100 67 126 35",
};

export function backOpening(design?: string | null, depth?: string | null): string | undefined {
  if (!design || ["high-neck-closed", "boat-neck-closed", "buttoned", "hook-eye", "keep", "ai", "custom"].includes(design)) return undefined;
  const end = depth === "high" ? 64 : depth === "medium" ? 81 : 98;
  if (design === "deep-v") return `M72 35 L100 ${end} L128 35Z`;
  if (design === "square") return `M72 35 H128 V${end} H72Z`;
  if (["oval", "keyhole", "pot-neck"].includes(design)) return `M100 51 C139 51 137 ${end + 14} 100 ${end + 14} C63 ${end + 14} 61 51 100 51Z`;
  if (design === "sweetheart") return `M72 35 Q80 64 100 55 Q120 64 128 35 L128 ${end} H72Z`;
  return `M72 35 H128 L125 ${end - 14} Q100 ${end + 20} 75 ${end - 14}Z`;
}