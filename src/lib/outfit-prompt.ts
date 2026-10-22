// Shared, pure prompt-building logic for the single image-generation request.
// Imported by the server route (prompt) and the browser (payload); contains no secrets.
import { findDesignReference, type DesignReference } from "./design-references";

export const OUTFIT_TYPES = [
  "Lehenga",
  "Anarkali",
  "Gown",
  "Sharara",
  "Palazzo Set",
  "A-Line Dress",
  "Frock",
  "Skirt & Top",
  "Half-Saree",
  "Kurta & Palazzo",
  "Peplum & Skirt",
  "Straight Kurta Set",
] as const;
export type OutfitType = (typeof OUTFIT_TYPES)[number];

export const SLEEVE_OPTIONS = [
  { value: "sleeveless", label: "Sleeveless", icon: "▯" },
  { value: "cap", label: "Cap Sleeves", icon: "◠" },
  { value: "short", label: "Short Sleeves", icon: "⌒" },
  { value: "elbow", label: "Elbow-Length", icon: "⊓" },
  { value: "three-quarter", label: "Three-Quarter", icon: "⫿" },
  { value: "full", label: "Full Sleeves", icon: "∥" },
  { value: "puff", label: "Puff Sleeves", icon: "❀" },
  { value: "bell", label: "Bell Sleeves", icon: "⩘" },
  { value: "flutter", label: "Flutter Sleeves", icon: "≋" },
  { value: "ruffle", label: "Ruffle Sleeves", icon: "∿" },
  { value: "cold-shoulder", label: "Cold-Shoulder", icon: "◡" },
  { value: "bishop", label: "Bishop Sleeves", icon: "◖" },
] as const;
export type SleeveDesign = (typeof SLEEVE_OPTIONS)[number]["value"];
export const DEFAULT_SLEEVE: SleeveDesign = "short";

type OutfitSpec = { construction: string; upper: string; hasBlouse: boolean; dupattaDefault: boolean };

// Each outfit defines its own silhouette, garment pieces and what the "upper garment" is.
export const OUTFIT_SPECS: Record<OutfitType, OutfitSpec> = {
  Lehenga: {
    construction:
      "LEHENGA SET: a full circular or flared ankle-length lehenga skirt gathered at the waist, a separate fitted short choli (blouse), and optionally a dupatta.",
    upper: "the choli",
    hasBlouse: true,
    dupattaDefault: true,
  },
  Anarkali: {
    construction:
      "ANARKALI: a single long garment with a fitted bodice, a clearly defined high waist seam, and a flowing flared gown-style lower section falling to the calf or ankle, worn over slim churidar leggings. NOT a separate skirt and choli.",
    upper: "the Anarkali bodice",
    hasBlouse: false,
    dupattaDefault: false,
  },
  Gown: {
    construction:
      "GOWN: one continuous floor-length gown with an attached bodice and skirt, seamless silhouette from shoulder to hem. NOT a separate skirt and blouse, no lehenga gathering.",
    upper: "the gown bodice",
    hasBlouse: false,
    dupattaDefault: false,
  },
  Sharara: {
    construction:
      "SHARARA SET: a short or medium-length kurta (hip to mid-thigh) worn over two separate, clearly visible wide-legged trousers that flare out dramatically from the knee. Trouser legs must be visibly separate, NOT a skirt.",
    upper: "the kurta",
    hasBlouse: false,
    dupattaDefault: false,
  },
  "Palazzo Set": {
    construction:
      "PALAZZO SET: a coordinated kurti or top with distinct, straight wide-leg palazzo trousers (two separate legs, falling straight from hip to ankle). NOT a skirt.",
    upper: "the top",
    hasBlouse: false,
    dupattaDefault: false,
  },
  "A-Line Dress": {
    construction:
      "A-LINE DRESS: a one-piece dress with a fitted upper body and a skirt that widens gradually in a clean A-shape, smooth and flat at the waist with no lehenga-style gathering or volume. Knee to calf length.",
    upper: "the dress bodice",
    hasBlouse: false,
    dupattaDefault: false,
  },
  Frock: {
    construction:
      "FROCK: a one-piece age-appropriate frock with an attached bodice and a gathered knee-length skirt. A single garment — NOT a lehenga set, no separate choli, no dupatta unless requested.",
    upper: "the frock bodice",
    hasBlouse: false,
    dupattaDefault: false,
  },
  "Skirt & Top": {
    construction:
      "SKIRT & TOP: a separate contemporary skirt and a matching contemporary top (not a traditional choli). Do NOT turn it into a lehenga choli set.",
    upper: "the top",
    hasBlouse: false,
    dupattaDefault: false,
  },
  "Half-Saree": {
    construction:
      "HALF-SAREE / LANGA VONI: a traditional long pleated skirt (langa), a fitted blouse, and a separate half-saree/voni dupatta draped diagonally across the torso and over one shoulder, tucked at the waist like a saree.",
    upper: "the blouse",
    hasBlouse: true,
    dupattaDefault: true,
  },
  "Kurta & Palazzo": {
    construction:
      "KURTA & PALAZZO: a straight or slightly flared knee-length kurta worn with separate wide palazzo trousers visible below the kurta hem.",
    upper: "the kurta",
    hasBlouse: false,
    dupattaDefault: false,
  },
  "Peplum & Skirt": {
    construction:
      "PEPLUM & SKIRT: a fitted peplum-style top with a short flared ruffle at the waist, worn over a separate long skirt.",
    upper: "the peplum top",
    hasBlouse: false,
    dupattaDefault: false,
  },
  "Straight Kurta Set": {
    construction:
      "STRAIGHT KURTA SET: a straight-cut, column-silhouette kurta (no flare) with coordinated straight pants or cigarette trousers.",
    upper: "the kurta",
    hasBlouse: false,
    dupattaDefault: false,
  },
};

export const SLEEVE_PROMPTS: Record<SleeveDesign, string> = {
  sleeveless: "sleeveless — NO sleeves at all, finished armholes",
  cap: "small cap sleeves just covering the shoulder",
  short: "short sleeves ending at the upper arm",
  elbow: "elbow-length sleeves",
  "three-quarter": "three-quarter sleeves ending between elbow and wrist",
  full: "full-length sleeves to the wrist",
  puff: "gathered puff sleeves",
  bell: "bell sleeves that flare widely toward the wrist",
  flutter: "light flutter sleeves with soft loose waves",
  ruffle: "ruffle sleeves with layered frills",
  "cold-shoulder": "cold-shoulder sleeves with cut-outs at the shoulder",
  bishop: "bishop sleeves, full and gathered into a cuff at the wrist",
};

export const BLOUSES: Record<string, string> = {
  match: "coordinate with the saree's original border, motifs, colors and embroidery",
  simple: "clean design with minimal decoration and subtle use of the saree border",
  embroidered: "tasteful embroidery derived from the saree's existing motifs",
  princess: "elegant structured festive styling suitable for the audience and age",
  puff: "tasteful puff-sleeve styling preserving the saree's colors and motifs",
  trendy: "contemporary but elegant, clearly belonging to the same saree",
  suggest:
    "choose the neckline and decoration that best complement the saree, prioritizing 1. border, 2. motifs, 3. embroidery, 4. dominant colors, 5. fabric character, 6. age-appropriate silhouette; no unrelated colors or motifs",
};

const STYLES: Record<string, string> = {
  Classic: "traditional, timeless and modest in volume",
  Flared: "generous movement and flare where the silhouette allows it",
  Designer: "contemporary couture finishing with refined structured detailing",
};

// ---- Blouse / dupatta / coordination / back-design catalogs (shared by UI, server validation and prompt) ----

export const BLOUSE_FABRIC_OPTIONS = [
  { value: "saree", label: "Same as Saree" },
  { value: "plain-silk", label: "Plain Silk" },
  { value: "raw-silk", label: "Raw Silk" },
  { value: "velvet", label: "Velvet" },
  { value: "brocade", label: "Brocade" },
  { value: "satin", label: "Satin" },
  { value: "organza", label: "Organza" },
  { value: "contrast", label: "Contrast Fabric" },
  { value: "custom", label: "Custom Fabric" },
] as const;
export type BlouseFabric = (typeof BLOUSE_FABRIC_OPTIONS)[number]["value"];
export const BLOUSE_FABRIC_PROMPTS: Record<BlouseFabric, string> = {
  saree: "the same fabric as the saree",
  "plain-silk": "plain silk",
  "raw-silk": "raw silk with its natural slub texture",
  velvet: "rich velvet",
  brocade: "brocade with a woven pattern",
  satin: "smooth satin",
  organza: "sheer organza",
  contrast: "a contrast fabric that complements the saree",
  custom: "the custom fabric described by the user",
};

export const BLOUSE_COLOUR_OPTIONS = [
  { value: "match", label: "Match Saree" },
  { value: "contrast", label: "Contrast Colour" },
  { value: "gold", label: "Gold" },
  { value: "antique-gold", label: "Antique Gold" },
  { value: "silver", label: "Silver" },
  { value: "ivory", label: "Ivory / Cream" },
  { value: "black", label: "Black" },
  { value: "maroon", label: "Maroon" },
  { value: "green", label: "Green" },
  { value: "pink", label: "Pink" },
  { value: "blue", label: "Blue" },
  { value: "custom", label: "Custom Colour" },
] as const;
export type BlouseColour = (typeof BLOUSE_COLOUR_OPTIONS)[number]["value"];

export const BLOUSE_EMBELLISHMENT_OPTIONS = [
  { value: "plain", label: "Plain / Minimal" },
  { value: "zari", label: "Zari Work" },
  { value: "floral", label: "Floral Embroidery" },
  { value: "mirror", label: "Mirror Work" },
  { value: "beadwork", label: "Beadwork" },
  { value: "lace", label: "Lace or Piping" },
  { value: "brocade-panels", label: "Brocade Panels" },
  { value: "sequin", label: "Sequin Work" },
  { value: "custom", label: "Custom Design" },
] as const;
export type BlouseEmbellishment = (typeof BLOUSE_EMBELLISHMENT_OPTIONS)[number]["value"];
export const BLOUSE_EMBELLISHMENT_PROMPTS: Record<BlouseEmbellishment, string> = {
  plain: "plain and minimal, no heavy embellishment",
  zari: "zari work",
  floral: "floral embroidery",
  mirror: "mirror work",
  beadwork: "beadwork",
  lace: "lace or piping detail",
  "brocade-panels": "brocade panels",
  sequin: "sequin work",
  custom: "the custom embellishment described by the user",
};

export const DUPATTA_FABRIC_OPTIONS = [
  { value: "none", label: "No Dupatta" },
  { value: "saree", label: "Same Saree Fabric" },
  { value: "silk", label: "Silk" },
  { value: "chiffon", label: "Chiffon" },
  { value: "georgette", label: "Georgette" },
  { value: "organza", label: "Organza" },
  { value: "net", label: "Net" },
  { value: "velvet", label: "Velvet" },
  { value: "banarasi", label: "Banarasi Brocade" },
  { value: "custom", label: "Custom Fabric" },
] as const;
export type DupattaFabric = (typeof DUPATTA_FABRIC_OPTIONS)[number]["value"];

export const DUPATTA_COLOUR_OPTIONS = [
  { value: "match-saree", label: "Match Saree" },
  { value: "match-blouse", label: "Match Blouse" },
  { value: "contrast-saree", label: "Contrast with Saree" },
  { value: "contrast-blouse", label: "Contrast with Blouse" },
  { value: "gold", label: "Gold" },
  { value: "antique-gold", label: "Antique Gold" },
  { value: "silver", label: "Silver" },
  { value: "ivory", label: "Ivory / Cream" },
  { value: "custom", label: "Custom Colour" },
] as const;
export type DupattaColour = (typeof DUPATTA_COLOUR_OPTIONS)[number]["value"];

export const DUPATTA_DESIGN_OPTIONS = [
  { value: "plain-border", label: "Plain with Simple Border" },
  { value: "zari-border", label: "Zari Border" },
  { value: "heavy-embroidered", label: "Heavy Embroidered Border" },
  { value: "floral-allover", label: "All-over Floral Embroidery" },
  { value: "butti", label: "Butti Motifs" },
  { value: "sequin", label: "Sequin Work" },
  { value: "mirror", label: "Mirror Work" },
  { value: "banarasi", label: "Banarasi Woven Pattern" },
  { value: "ombre", label: "Ombre / Gradient" },
  { value: "scalloped", label: "Scalloped Edge" },
  { value: "tassels", label: "Tassels" },
  { value: "custom", label: "Custom Design" },
] as const;
export type DupattaDesign = (typeof DUPATTA_DESIGN_OPTIONS)[number]["value"];
export const DUPATTA_DESIGN_PROMPTS: Record<DupattaDesign, string> = {
  "plain-border": "plain with a simple border",
  "zari-border": "a zari border",
  "heavy-embroidered": "a heavy embroidered border",
  "floral-allover": "all-over floral embroidery",
  butti: "scattered butti motifs",
  sequin: "sequin work",
  mirror: "mirror work",
  banarasi: "a Banarasi woven pattern",
  ombre: "an ombre / gradient shading",
  scalloped: "a scalloped edge",
  tassels: "decorative tassels on the edges",
  custom: "the custom design described by the user",
};

export const DUPATTA_DRAPING_OPTIONS = [
  { value: "one-shoulder", label: "One Shoulder" },
  { value: "both-shoulders", label: "Both Shoulders" },
  { value: "across-arms", label: "Across Both Arms" },
  { value: "over-head", label: "Over the Head" },
  { value: "pleated-side", label: "Pleated on One Side" },
  { value: "bridal", label: "Traditional Bridal Drape" },
  { value: "stylist", label: "✨ AI Stylist Choice" },
] as const;
export type DupattaDraping = (typeof DUPATTA_DRAPING_OPTIONS)[number]["value"];
export const DUPATTA_DRAPING_PROMPTS: Record<DupattaDraping, string> = {
  "one-shoulder": "draped over one shoulder",
  "both-shoulders": "draped over both shoulders",
  "across-arms": "draped across both arms",
  "over-head": "draped over the head",
  "pleated-side": "pleated neatly on one side",
  bridal: "in a traditional bridal drape",
  stylist: "draped in the way that best complements the outfit",
};

export type CoordinationPreset = "matching" | "blouse-contrast" | "dupatta-contrast" | "double-contrast" | "coordinated" | "festive-gold" | "custom" | "stylist";
export const COORDINATION_PRESETS: { value: CoordinationPreset; label: string; description: string }[] = [
  { value: "matching", label: "Matching Set", description: "Blouse and dupatta coordinate with the saree's main colour." },
  { value: "blouse-contrast", label: "Blouse Contrast", description: "Contrast blouse with a saree-matching dupatta." },
  { value: "dupatta-contrast", label: "Dupatta Contrast", description: "Saree-matching blouse with a contrasting dupatta." },
  { value: "double-contrast", label: "Double Contrast", description: "Blouse and dupatta in different complementary colours." },
  { value: "coordinated", label: "Coordinated Contrast", description: "Different fabrics or shades sharing complementary colours, borders or embellishments." },
  { value: "festive-gold", label: "Festive Gold", description: "Contrasting blouse and dupatta with coordinated gold accents." },
  { value: "custom", label: "Custom Combination", description: "Configure every fabric and colour independently." },
  { value: "stylist", label: "✨ AI Stylist Choice", description: "Let the AI choose a coordinated combination for your saree." },
];
/** Fields a preset sets when applied. Explicit user edits afterwards are never overridden. */
export const PRESET_APPLIES: Record<CoordinationPreset, Partial<Pick<PromptInput, "blouseFabric" | "blouseColour" | "blouseEmbellishment" | "dupattaFabric" | "dupattaColour" | "dupattaDesign">>> = {
  matching: { blouseFabric: "saree", blouseColour: "match", dupattaFabric: "saree", dupattaColour: "match-saree" },
  "blouse-contrast": { blouseColour: "contrast", dupattaColour: "match-saree" },
  "dupatta-contrast": { blouseColour: "match", dupattaColour: "contrast-saree" },
  "double-contrast": { blouseColour: "contrast", dupattaColour: "contrast-blouse" },
  coordinated: { blouseColour: "contrast", dupattaColour: "contrast-blouse", dupattaDesign: "zari-border" },
  "festive-gold": { blouseColour: "contrast", blouseEmbellishment: "zari", dupattaColour: "gold" },
  custom: {},
  stylist: {},
};

export type BackDesignControl = "depth" | "closure" | "dori" | "tassels" | "border";
export type BackDesignOption = { value: string; label: string; description: string; prompt: string; controls: BackDesignControl[] };
export const BACK_DESIGNS: BackDesignOption[] = [
  { value: "deep-u", label: "Deep U-Back", description: "A classic deep U-shaped cut-out.", prompt: "a deep U-shaped back cut-out", controls: ["depth", "closure", "border"] },
  { value: "deep-u-dori", label: "Deep U-Back with Dori", description: "Deep U-back finished with a tie-up dori.", prompt: "a deep U-shaped back with a dori tie at the top", controls: ["depth", "dori", "tassels", "border"] },
  { value: "deep-v", label: "Deep V-Back", description: "A sharp deep V-shaped back neckline.", prompt: "a deep V-shaped back neckline", controls: ["depth", "closure", "border"] },
  { value: "square", label: "Square Back", description: "A clean square-shaped back cut-out.", prompt: "a square-shaped back cut-out", controls: ["depth", "closure", "border"] },
  { value: "round", label: "Round Back", description: "A soft round back neckline.", prompt: "a round back neckline", controls: ["depth", "closure", "border"] },
  { value: "oval", label: "Oval Cut-Out", description: "An elegant oval cut-out at the back.", prompt: "an oval cut-out at the back", controls: ["depth", "closure", "border"] },
  { value: "keyhole", label: "Teardrop / Keyhole Back", description: "A teardrop-shaped keyhole opening.", prompt: "a teardrop-shaped keyhole opening at the back", controls: ["closure", "border"] },
  { value: "criss-cross", label: "Criss-Cross Dori", description: "Dori strings laced criss-cross across the back.", prompt: "criss-cross laced dori strings across an open back", controls: ["dori", "tassels", "border"] },
  { value: "bow-tie", label: "Bow-Tie Back", description: "A statement bow tied at the back.", prompt: "a large bow tie at the back", controls: ["dori", "tassels", "border"] },
  { value: "multi-dori", label: "Multiple Horizontal Dori Strings", description: "Several horizontal dori strings across the back.", prompt: "multiple horizontal dori strings across an open back", controls: ["dori", "tassels", "border"] },
  { value: "single-dori-tassels", label: "Single Dori with Tassels", description: "One dori tie finished with tassels.", prompt: "a single dori tie with tassels at the back", controls: ["dori", "tassels", "border"] },
  { value: "deep-scoop", label: "Deep Scoop Back", description: "A wide, deep scoop-shaped back.", prompt: "a deep scoop-shaped back neckline", controls: ["depth", "closure", "border"] },
  { value: "sheer-net", label: "Sheer Net Back", description: "A closed back in sheer net fabric.", prompt: "a closed back panel of sheer net fabric", controls: ["closure", "border"] },
  { value: "sheer-embroidered", label: "Sheer Embroidered Back", description: "Sheer back with embroidered motifs.", prompt: "a sheer back panel with embroidered motifs", controls: ["closure", "border"] },
  { value: "high-neck-closed", label: "High-Neck Closed Back", description: "A fully closed high-neck back.", prompt: "a fully closed high-neck back", controls: ["closure"] },
  { value: "boat-neck-closed", label: "Boat-Neck Closed Back", description: "A closed back with a boat neckline.", prompt: "a closed back with a boat neckline", controls: ["closure"] },
  { value: "buttoned", label: "Buttoned Back", description: "A row of buttons down the back.", prompt: "a row of fabric buttons down the back", controls: ["closure", "border"] },
  { value: "hook-eye", label: "Hook-and-Eye Closed Back", description: "A neat closed back with hook-and-eye fastening.", prompt: "a closed back with a concealed hook-and-eye fastening", controls: ["closure"] },
  { value: "pot-neck", label: "Pot-Neck Back", description: "A round pot-shaped back cut-out.", prompt: "a pot-shaped (round) back cut-out", controls: ["depth", "closure", "border"] },
  { value: "sweetheart", label: "Sweetheart-Shaped Back", description: "A sweetheart-shaped back neckline.", prompt: "a sweetheart-shaped back neckline", controls: ["depth", "closure", "border"] },
  { value: "temple-bridal", label: "Traditional Temple / Bridal Back", description: "A rich bridal back with traditional detailing.", prompt: "a traditional temple-style bridal back with rich detailing", controls: ["depth", "closure", "dori", "tassels", "border"] },
  { value: "custom", label: "Custom Back Design", description: "Describe your own back design.", prompt: "the custom back design described by the user", controls: ["depth", "closure", "dori", "tassels", "border"] },
  { value: "ai", label: "✨ AI-Designed Back", description: "Let the AI design a back that suits the outfit.", prompt: "a blouse back design chosen by the stylist to best suit the outfit", controls: ["depth", "border"] },
  { value: "keep", label: "Keep Existing Back Design", description: "Keep the back design from the saree or reference.", prompt: "the blouse back design already present in the source or reference", controls: [] },
];
export type BackDesignValue = (typeof BACK_DESIGNS)[number]["value"];
export const findBackDesign = (value: string | null | undefined) => BACK_DESIGNS.find((d) => d.value === value) ?? null;

export const BACK_DEPTH_OPTIONS = [
  { value: "high", label: "High" },
  { value: "medium", label: "Medium" },
  { value: "deep", label: "Deep" },
  { value: "custom", label: "Custom" },
] as const;
export const BACK_CLOSURE_OPTIONS = [
  { value: "hooks", label: "Hooks" },
  { value: "buttons", label: "Buttons" },
  { value: "zipper", label: "Zipper" },
  { value: "dori", label: "Dori" },
  { value: "concealed", label: "Concealed Closure" },
] as const;
export const BACK_DORI_OPTIONS = [
  { value: "none", label: "None" },
  { value: "single", label: "Single" },
  { value: "double", label: "Double" },
  { value: "criss-cross", label: "Criss-Cross" },
  { value: "multiple", label: "Multiple Strings" },
] as const;
export const BACK_TASSEL_OPTIONS = [
  { value: "none", label: "None" },
  { value: "fabric", label: "Fabric Tassels" },
  { value: "beaded", label: "Beaded Tassels" },
  { value: "latkans", label: "Decorative Latkans" },
] as const;
export const BACK_BORDER_OPTIONS = [
  { value: "plain-piping", label: "Plain Piping" },
  { value: "contrast-piping", label: "Contrast Piping" },
  { value: "zari", label: "Zari" },
  { value: "lace", label: "Lace" },
  { value: "embroidery", label: "Embroidery" },
  { value: "mirror", label: "Mirror Work" },
  { value: "beadwork", label: "Beadwork" },
  { value: "custom", label: "Custom" },
] as const;

export type PromptInput = {
  audience: "Kids" | "Women";
  age: string;
  style: string;
  outfit: OutfitType;
  sleeve: SleeveDesign;
  blouse: string;
  matchingBlouse: boolean;
  matchingDupatta: boolean;
  mannequin: boolean;
  reference?: DesignReference | null;
  blouseFabric?: BlouseFabric | null;
  blouseFabricCustom?: string | null;
  blouseColour?: BlouseColour | null;
  blouseColourCustom?: string | null;
  blouseEmbellishment?: BlouseEmbellishment | null;
  blouseEmbellishmentCustom?: string | null;
  dupattaFabric?: DupattaFabric | null;
  dupattaFabricCustom?: string | null;
  dupattaColour?: DupattaColour | null;
  dupattaColourCustom?: string | null;
  dupattaDesign?: DupattaDesign | null;
  dupattaDesignCustom?: string | null;
  dupattaDraping?: DupattaDraping | null;
  coordination?: CoordinationPreset | null;
  backDesign?: BackDesignValue | null;
  backDesignCustom?: string | null;
  backDepth?: string | null;
  backClosure?: string | null;
  backDori?: string | null;
  backTassels?: string | null;
  backBorder?: string | null;
  backNotes?: string | null;
};

export class ValidationError extends Error {}

const pick = (v: FormDataEntryValue | null) => (v == null || v === "" ? null : String(v));

/** Validates the raw request; missing new fields fall back to safe defaults, unknown values are rejected. */
export function parsePromptInput(input: FormData): PromptInput {
  const outfit = pick(input.get("outfit")) ?? "Lehenga";
  if (!(OUTFIT_TYPES as readonly string[]).includes(outfit)) throw new ValidationError("Unsupported outfit");
  const sleeve = pick(input.get("sleeve_design")) ?? DEFAULT_SLEEVE;
  if (!Object.hasOwn(SLEEVE_PROMPTS, sleeve)) throw new ValidationError("Unsupported sleeve design");
  const blouse = pick(input.get("blouse_design")) ?? "match";
  if (!Object.hasOwn(BLOUSES, blouse)) throw new ValidationError("Unsupported blouse design");
  const style = pick(input.get("style")) ?? "Flared";
  const referenceId = pick(input.get("design_reference_id"));
  const reference = findDesignReference(referenceId, outfit as OutfitType);
  if (referenceId && !reference) throw new ValidationError("Unsupported design reference for this outfit");
  const explicitText = (key: string) => {
    const value = pick(input.get(key));
    if (value && (value.length > 80 || /[\r\n]/.test(value))) throw new ValidationError(`Unsupported ${key}`);
    return value;
  };
  return {
    audience: input.get("audience") === "Women" ? "Women" : "Kids",
    age: (pick(input.get("age")) ?? "5-7 years").slice(0, 20),
    style: Object.hasOwn(STYLES, style) ? style : "Flared",
    outfit: outfit as OutfitType,
    sleeve: sleeve as SleeveDesign,
    blouse,
    matchingBlouse: input.get("matching_blouse") === "true",
    matchingDupatta: input.get("matching_dupatta") === "true",
    mannequin: input.get("model_type") === "Dress/mannequin only",
    reference,
    blouseColour: explicitText("blouse_colour"),
    blouseFabric: explicitText("blouse_fabric"),
  };
}

/** Builds the single generation prompt, ordered by priority: silhouette > sleeves > blouse > matching > textile. */
export function buildPrompt(p: PromptInput, hasReferenceImage = false): string {
  const spec = OUTFIT_SPECS[p.outfit];
  const reference = p.reference?.outfitType === p.outfit ? p.reference : null;
  const kids = p.audience === "Kids";
  const sleeveLine =
    p.sleeve === "sleeveless"
      ? `Make ${spec.upper} sleeveless. Do NOT generate any sleeves.`
      : `Apply ${SLEEVE_PROMPTS[p.sleeve]} to ${spec.upper}.`;
  const blousePiece = spec.hasBlouse || p.matchingBlouse;
  const blouseTarget = spec.hasBlouse ? spec.upper : p.matchingBlouse ? "a separate matching blouse" : spec.upper;
  const dupatta = p.matchingDupatta;

  const pieces: string[] = [];
  if (p.matchingBlouse && !spec.hasBlouse)
    pieces.push("Add a matching blouse/inner top cut from the same saree textile, layered appropriately for this outfit.");
  if (dupatta) pieces.push("Include a matching dupatta made from the saree's pallu or original design.");
  else pieces.push("Do NOT include a dupatta or any draped stole.");
  if (!spec.hasBlouse && !p.matchingBlouse) pieces.push("Do NOT add a separate choli or blouse.");

  return [
    "Edit the provided saree image: redesign the saree textile into the outfit specified below. Follow the priorities in order; a higher priority always wins.",
    "IMAGE 1 — SAREE SOURCE: preserve its colour, motifs, embroidery, border, pallu and fabric character, except explicit user blouse colour/fabric choices below.",
    reference && hasReferenceImage
      ? "IMAGE 2 — OUTFIT DESIGN REFERENCE: use only its garment silhouette, construction, panel arrangement, neckline, sleeve shape and decorative placement as inspiration. User outfit, sleeve, blouse and matching-piece selections override conflicts. Never copy its fabric or colour."
      : null,
    "",
    "PRIORITY 1 — OUTFIT SILHOUETTE AND GARMENT CONSTRUCTION (must be clearly recognisable):",
    spec.construction,
    reference ? `SELECTED CONSTRUCTION — ${reference.designName}: ${reference.silhouetteDescription}. ${reference.constructionDetails}. HEM AND PANELS: ${reference.hemAndPanelDetails}. Adapt to the selected outfit, age, sleeves and matching pieces; never add unrequested pieces.` : null,
    p.outfit === "Lehenga" || p.outfit === "Half-Saree"
      ? null
      : "This is NOT a lehenga: do not add a gathered lehenga skirt or a lehenga choli.",
    `Overall styling: ${STYLES[p.style]}, without changing the silhouette above.`,
    "",
    "PRIORITY 2 — SLEEVES:",
    sleeveLine,
    "",
    "PRIORITY 3 — BLOUSE / UPPER GARMENT DESIGN:",
    blousePiece || !spec.hasBlouse
      ? `For ${blouseTarget}: ${BLOUSES[p.blouse]}. Sleeve choice from priority 2 overrides any sleeve style implied here.`
      : null,
    p.blouseColour ? `EXPLICIT USER BLOUSE COLOUR: ${JSON.stringify(p.blouseColour)}. This overrides both reference colour and saree colour for the blouse/upper garment.` : null,
    p.blouseFabric ? `EXPLICIT USER BLOUSE FABRIC: ${JSON.stringify(p.blouseFabric)}. This overrides both reference fabric and saree fabric for the blouse/upper garment.` : null,
    "",
    "PRIORITY 4 — MATCHING PIECES:",
    ...pieces,
    "",
    "PRIORITY 5 — TEXTILE PRESERVATION (within the garment shape above, never overriding it):",
    "Preserve the saree's dominant colour, fabric appearance, print, embroidery, motifs, border and pallu artwork as faithfully as possible, except explicit user blouse colour/fabric selections. Use the border on hems, cuffs, necklines and waistbands; use the pallu as a dupatta or feature panel where appropriate. Do not invent unrelated colours or motifs. Never copy the reference textile or colour. Create a new outfit from the saree following the selected construction.",
    "",
    "AUDIENCE:",
    kids
      ? `A child (girl), age ${p.age}. Age-appropriate proportions; modest, comfortable, festive children's ethnic wear. No deep necklines, bare midriff, or mature styling.`
      : "An adult woman. Elegant Indian ethnic fashion proportions.",
    "",
    "PRESENTATION:",
    p.mannequin
      ? "Show the outfit only on a dress form / mannequin, no human model, plain studio backdrop."
      : `Worn by a single ${kids ? "child fashion model" : "adult fashion model"}, full-length portrait pose, plain soft studio backdrop.`,
    "Realistic studio fashion photograph, natural fabric folds, accurate garment construction, high textile detail. The garment must look physically made from the uploaded saree. No text, logos, watermarks or extra people.",
  ]
    .filter((l) => l !== null)
    .join("\n");
}

export type RequestSelections = {
  audience: "Kids" | "Women";
  age: string;
  style: string;
  outfit: OutfitType;
  modelType: string;
  blouse: string;
  sleeve: SleeveDesign;
  matchingBlouse: boolean;
  matchingDupatta: boolean;
  referenceId?: string | null;
  blouseColour?: string | null;
  blouseFabric?: string | null;
};

/** Browser-side payload builder for the single generation request. */
export function buildRequestForm(image: File, s: RequestSelections): FormData {
  const form = new FormData();
  form.append("image", image);
  form.append("audience", s.audience);
  form.append("age", s.age);
  form.append("style", s.style);
  form.append("outfit", s.outfit);
  form.append("model_type", s.modelType);
  form.append("blouse_design", s.blouse);
  form.append("sleeve_design", s.sleeve);
  form.append("matching_blouse", String(s.matchingBlouse));
  form.append("matching_dupatta", String(s.matchingDupatta));
  if (s.referenceId) form.append("design_reference_id", s.referenceId);
  if (s.blouseColour) form.append("blouse_colour", s.blouseColour);
  if (s.blouseFabric) form.append("blouse_fabric", s.blouseFabric);
  return form;
}
