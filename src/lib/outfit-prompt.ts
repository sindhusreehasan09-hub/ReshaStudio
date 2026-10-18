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
  blouseColour?: string | null;
  blouseFabric?: string | null;
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
