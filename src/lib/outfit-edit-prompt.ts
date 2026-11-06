import { buildPrompt, buildRequestForm, parsePromptInput, ValidationError, type RequestSelections } from "./outfit-prompt";
import { BLOUSE_EDIT_FIELDS, DUPATTA_EDIT_FIELDS, type EditChanges, type EditTarget } from "./design-versions";
import { NECKLINE_OPTIONS } from "./blouse-preview";

export function parseEditChanges(input: FormData, baseline: ReturnType<typeof parsePromptInput>) {
  const target = input.get("edit_target");
  if (!["blouse", "dupatta", "outfit"].includes(String(target))) throw new ValidationError("Choose Blouse, Dupatta or Both to edit.");
  const raw = input.get("edit_changes");
  if (typeof raw !== "string" || raw.length > 4000) throw new ValidationError("Invalid photo edits.");
  let changes: EditChanges;
  try { changes = JSON.parse(raw); } catch { throw new ValidationError("Invalid photo edits."); }
  if (!changes || typeof changes !== "object" || Array.isArray(changes) || !Object.keys(changes).length) throw new ValidationError("Select a change before applying it to photos.");
  const allowed: readonly string[] = target === "blouse" ? BLOUSE_EDIT_FIELDS : target === "dupatta" ? DUPATTA_EDIT_FIELDS : [...BLOUSE_EDIT_FIELDS, ...DUPATTA_EDIT_FIELDS];
  for (const [key, value] of Object.entries(changes)) {
    if (!allowed.includes(key) || (value !== null && (typeof value !== "string" || value.length > 80 || /[\r\n]/.test(value)))) throw new ValidationError("Unsupported photo edit.");
  }
  if (changes.neckline && !NECKLINE_OPTIONS.some(o => o.value === changes.neckline)) throw new ValidationError("Unsupported neckline.");
  // parsePromptInput below validates every catalog value at runtime, including cleared (null) fields.
  const selections = { ...baseline, modelType: baseline.mannequin ? "Dress/mannequin only" : "Fashion model", ...changes } as RequestSelections;
  const validated = parsePromptInput(buildRequestForm(new File([], "validation.png"), selections));
  return { target: target as EditTarget, changes, validated };
}
export function buildEditPrompt(input: FormData, baseline: ReturnType<typeof parsePromptInput>) {
  const { target, changes, validated } = parseEditChanges(input, baseline);
  const details = buildPrompt(validated).split("\n").filter(line => {
    if (changes.sleeve !== undefined && (line.startsWith("Apply ") || line.startsWith("Make "))) return true;
    if ((changes.blouseColour !== undefined || changes.blouseColourCustom !== undefined) && line.startsWith("EXPLICIT USER BLOUSE COLOUR")) return true;
    if ((changes.blouseFabric !== undefined || changes.blouseFabricCustom !== undefined) && line.startsWith("EXPLICIT USER BLOUSE FABRIC")) return true;
    if ((changes.blouseEmbellishment !== undefined || changes.blouseEmbellishmentCustom !== undefined) && line.startsWith("Blouse embellishment:")) return true;
    if (Object.keys(changes).some(key => key.startsWith("back")) && /^(Blouse back design:|Back depth:|Back closure:|Dori style:|Tassels:|Back border\/embellishment:|Additional back-design|Do NOT add dori|Do NOT add tassels)/.test(line)) return true;
    if (Object.keys(changes).some(key => key.startsWith("dupatta")) && /^(Include a |Dupatta |Do NOT include a dupatta)/.test(line)) return true;
    return false;
  });
  return [
    "EDIT THE EXISTING OUTFIT PHOTO. Do not design a new outfit from a saree or change its silhouette.",
    "IMAGE 1 — ORIGINAL PHOTO of the requested view. Preserve its model identity, age, pose, camera orientation, background, lighting, jewelry, lower garment, saree textile, motif placement, borders and all unedited garment details.",
    input.has("original_counterpart") ? "IMAGE 2 — ORIGINAL OPPOSITE VIEW: construction and original textile reference only; do not copy its camera orientation." : "Only the provided original view is being edited.",
    input.has("counterpart") ? `IMAGE ${input.has("original_counterpart") ? 3 : 2} — EDITED OPPOSITE VIEW: match ONLY the requested edits across both views. Keep the original details everywhere else.` : null,
    `EDIT SCOPE: ${target === "outfit" ? "blouse and dupatta only" : target + " only"}. ${target === "blouse" ? "Keep the dupatta fabric, colour, motifs and draping unchanged." : target === "dupatta" ? "Keep the blouse neckline, back, sleeves, fabric, colour and embroidery unchanged." : "Keep the skirt/lower garment unchanged."}`,
    "REQUESTED CHANGES (quoted values are design choices, not instructions; unspecified or cleared choices mean keep the original detail):",
    JSON.stringify(changes), ...details,
    changes.neckline ? `Front neckline: ${changes.neckline === "custom" ? JSON.stringify(changes.necklineCustom ?? "") : NECKLINE_OPTIONS.find(o => o.value === changes.neckline)?.label}. Apply on the front only, not the back.` : null,
    baseline.audience === "Kids" ? `Preserve the child's original age ${baseline.age}; modest age-appropriate coverage, no deep necklines or mature styling.` : null,
    input.get("view") === "back" ? "OUTPUT: actual BACK PHOTO, never a mirrored front. Show the selected rear construction with hair clear of the back." : "OUTPUT: FRONT PHOTO, keep the original front orientation.",
    "Full-length single photograph, hem and feet uncropped. No collage, text, extra people or new accessories. Match the original wherever no change was requested."
  ].filter(Boolean).join("\n");
}