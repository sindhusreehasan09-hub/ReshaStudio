import type { OutfitType } from "./outfit-prompt";

export type DesignReference = {
  id: string;
  outfitType: OutfitType;
  thumbnailUrl: string | null;
  fullResolutionUrl: string | null;
  designName: string;
  silhouetteDescription: string;
  constructionDetails: string;
  hemAndPanelDetails: string;
};

// Curated construction placeholders, not photographs. Replace null URLs only
// with real, licensed image URLs; keep IDs stable when adding those assets.
const designs: Record<OutfitType, [string, string, string, string][]> = {
  Lehenga: [
    ["Eight-panel flare", "Full flared skirt and separate fitted choli", "Eight equal triangular gores joined to a flat fitted waistband; modest rounded choli neckline", "Continuous saree border around the hem; motifs centered on each gore"],
    ["Box-pleat skirt", "Structured pleated skirt and separate choli", "Six deep box pleats beneath a broad flat waistband; square modest neckline", "Flat border hem with pallu artwork concentrated on the front pleat"],
    ["Tiered lehenga", "Three-tier flared skirt and separate choli", "Three joined horizontal gathered tiers with fitted waistband", "Narrow border at tier seams and wide border at bottom hem"],
  ],
  Anarkali: [
    ["Twelve-kali Anarkali", "Fitted bodice and long flared attached lower section", "Twelve tapered kali panels joined at a defined high waist; slim leggings", "Border follows the ankle hem; motifs aligned vertically on panels"],
    ["Princess-seam Anarkali", "Long continuous princess-seam garment", "Six long princess panels shaped through the bodice and widening below the waist", "Unbroken hem border and pallu inset at the center front"],
    ["Pleated-waist Anarkali", "Defined waist with attached ankle-length pleated lower section", "Modest round bodice with eight narrow inverted pleats below the waist seam", "Border around lower hem only; embroidery placed around neckline"],
  ],
  "A-Line Dress": [
    ["Six-panel A-line", "Smooth one-piece gradual A silhouette", "Six shaped panels, fitted upper body, flat waist with no gathering", "Narrow hem band; motifs follow vertical panel lines"],
    ["Front-pleat A-line", "Clean calf-length A-line dress", "One center inverted pleat opening below a fitted waist; modest boat neckline", "Wide front pallu panel with a straight border hem"],
    ["Wrap-panel A-line", "One-piece gently widening dress", "Fixed overlapping front panel sewn into side seam, fully closed modest neckline", "Diagonal border on overlay and narrow border around hem"],
  ],
  Gown: [
    ["Princess-panel gown", "Continuous floor-length gown", "Six fitted princess panels widening from hip; attached bodice, no separate skirt", "Border circles floor-length hem; embroidery follows bodice seams"],
    ["Empire gown", "Floor-length gown with high waist", "Attached flowing lower section with eight soft pleats below high bodice seam", "Pallu artwork on central skirt panel; narrow hem border"],
    ["Godet gown", "Fitted continuous gown with flared hem", "Four godet inserts open below the knee, no lehenga waist gathering", "Border traces godet edges and lower hem"],
  ],
  Sharara: [
    ["Knee-flare sharara", "Short kurta and two distinct knee-flared trouser legs", "Each trouser leg fitted above knee with gathered bell section below", "Separate border on each leg hem; kurta border at hip"],
    ["Panelled sharara", "Mid-thigh kurta with two flared trousers", "Four gores per trouser leg widen from knee; flat trouser waistband", "Vertical motifs on leg panels; separate broad leg hems"],
    ["Double-tier sharara", "Short straight kurta with two tiered flared legs", "Two gathered tiers below each knee, clear gap between trousers", "Narrow border at each tier and wide border on each ankle hem"],
  ],
  "Palazzo Set": [
    ["Straight palazzo", "Hip-length top and two straight wide legs", "Flat waistband, straight ungathered trousers, side-slit top", "Border on each leg hem and top neckline"],
    ["Pleated palazzo", "Short top with wide pleated trousers", "Two forward pleats on each leg below fitted waistband; two visibly separate legs", "Vertical motifs down legs; narrow ankle borders"],
    ["Overlay palazzo", "Asymmetric top and straight palazzo trousers", "Fixed diagonal overlay on modest closed top; straight wide legs", "Pallu feature on top overlay; separate flat trouser hems"],
  ],
  "Half-Saree": [
    ["Pleated voni", "Long skirt, fitted blouse and separately draped voni when requested", "Eight skirt pleats beneath flat waistband; diagonal shoulder drape only when matching dupatta enabled", "Wide skirt hem border; pallu at shoulder end of optional drape"],
    ["Gored half-saree", "Six-gore skirt and modest blouse", "Six widening skirt panels; separate cross-torso drape only when requested", "Border on each skirt panel hem and optional drape edge"],
    ["Front-fan half-saree", "Traditional skirt with front fan pleats and blouse", "Cluster of five front pleats; smooth side waist; optional shoulder voni", "Front pallu motif panel, wide hem and optional voni border"],
  ],
  "Skirt & Top": [
    ["Pleated midi set", "Separate midi skirt and contemporary top, not choli", "Six box pleats with flat waistband; hip-covering top with modest round neckline", "Wide skirt border and small top cuff motifs"],
    ["Panel skirt set", "Four-panel long A skirt with separate contemporary top", "Four smooth widening panels without lehenga gathering; structured hip-length top", "Pallu front skirt panel and narrow hem"],
    ["Wrap skirt set", "Fixed wrap-effect skirt with contemporary top", "Closed overlap skirt sewn at side seam; modest non-cropped top", "Diagonal border on overlap with motifs on top yoke"],
  ],
  "Kurta & Palazzo": [
    ["Side-slit kurta", "Knee-length kurta with visible wide palazzo legs", "Straight kurta with two side slits and modest round neck; separate wide trousers", "Border at kurta hem and both trouser hems"],
    ["Panelled kurta set", "Slightly flared kurta with separate palazzos", "Four kurta panels widen gently below waist; two straight wide trouser legs", "Vertical pallu kurta inset, narrow ankle borders"],
    ["Front-pleat kurta", "Knee-length kurta and wide trousers", "Single inverted front pleat in kurta; flat-waist palazzo trousers", "Border at pleat opening and separate trouser hems"],
  ],
  Frock: [
    ["Gathered frock", "One-piece knee-length frock", "Attached fitted bodice and softly gathered lower section at waist", "Wide lower hem band; motifs on modest bodice yoke"],
    ["Box-pleat frock", "One-piece structured knee-length frock", "Four box pleats attached to bodice at waist; fully covered torso", "Border follows flat hem, pallu feature on center bodice"],
    ["Tiered frock", "One-piece soft two-tier frock", "Attached modest bodice with two gathered knee-length tiers", "Narrow tier join border and wider bottom hem"],
  ],
  "Peplum & Skirt": [
    ["Circular peplum", "Separate peplum top and long skirt", "Fitted modest bodice with attached circular hip-length peplum over four-panel skirt", "Peplum edge border and continuous skirt hem"],
    ["Pleated peplum", "Structured peplum top over separate smooth skirt", "Six small peplum box pleats at waist; smooth A skirt", "Motifs on pleat faces; wide lower skirt border"],
    ["Asymmetric peplum", "Diagonal peplum top and separate long skirt", "Closed modest bodice with longer side peplum and flat-waist skirt", "Border traces asymmetric top edge; pallu panel on skirt front"],
  ],
  "Straight Kurta Set": [
    ["Column kurta", "Straight column kurta with cigarette trousers", "Ungathered straight front and back panels with side slits", "Border at kurta hem, neckline and separate ankle hems"],
    ["Yoke kurta", "Straight kurta with coordinated straight pants", "Defined rectangular modest yoke and straight lower panels with no flare", "Pallu on yoke; flat hem border"],
    ["Center-panel kurta", "Straight knee-length kurta and narrow trousers", "Three vertical front panels, straight side seams, no waist gathering", "Pallu center panel with border at cuffs and hem"],
  ],
};

export const DESIGN_REFERENCES: DesignReference[] = Object.entries(designs).flatMap(([outfit, entries]) =>
  entries.map(([designName, silhouetteDescription, constructionDetails, hemAndPanelDetails], i) => ({
    id: `${outfit.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${i + 1}`,
    outfitType: outfit as OutfitType,
    thumbnailUrl: null,
    fullResolutionUrl: null,
    designName,
    silhouetteDescription,
    constructionDetails,
    hemAndPanelDetails,
  })),
);

export const referencesForOutfit = (outfit: OutfitType) => DESIGN_REFERENCES.filter((r) => r.outfitType === outfit);
export const findDesignReference = (id: string | null | undefined, outfit: OutfitType) =>
  referencesForOutfit(outfit).find((r) => r.id === id) ?? null;
