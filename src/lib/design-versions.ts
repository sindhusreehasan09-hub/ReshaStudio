import type { SavedDesign } from "./local-gallery";
import { blouseDraftFromDesign, type BlouseDraft } from "./blouse-preview";
import type { RequestSelections } from "./outfit-prompt";
import type { OutfitViews, ViewErrors } from "./outfit-views";

export type EditTarget = "blouse" | "dupatta" | "outfit";
export const BLOUSE_EDIT_FIELDS = ["sleeve", "blouseFabric", "blouseFabricCustom", "blouseColour", "blouseColourCustom", "blouseEmbellishment", "blouseEmbellishmentCustom", "backDesign", "backDesignCustom", "backDepth", "backClosure", "backDori", "backTassels", "backBorder", "backNotes", "neckline", "necklineCustom"] as const;
export const DUPATTA_EDIT_FIELDS = ["dupattaFabric", "dupattaFabricCustom", "dupattaColour", "dupattaColourCustom", "dupattaDesign", "dupattaDesignCustom", "dupattaDraping"] as const;
export type EditField = typeof BLOUSE_EDIT_FIELDS[number] | typeof DUPATTA_EDIT_FIELDS[number];
export type EditChanges = Partial<Record<EditField, string | null>>;
export type DesignVersion = {
  id: string; created_at: string; label: string; image: string;
  front_image?: string | undefined; back_image?: string | undefined;
  selections?: RequestSelections | undefined; editor_draft?: BlouseDraft | undefined;
  sleeve: string; base_id?: string; target?: EditTarget; changes?: EditChanges;
  errors?: ViewErrors;
};

export function versionsFor(design: SavedDesign): DesignVersion[] {
  return design.versions?.length ? design.versions : [{ id: "original", created_at: design.created_at, label: "Original", image: design.image, front_image: design.front_image, back_image: design.back_image, selections: design.selections, sleeve: design.sleeve }];
}
export function activeVersion(design: SavedDesign) {
  const versions = versionsFor(design);
  return versions.find(v => v.id === design.active_version_id) ?? versions[0];
}
export function draftFor(design?: SavedDesign | null): BlouseDraft {
  return (design ? activeVersion(design)?.editor_draft : undefined) ?? blouseDraftFromDesign(design);
}
export function editChanges(design: SavedDesign, draft: BlouseDraft, target: EditTarget): EditChanges {
  const initial = draftFor(design);
  const fields = target === "blouse" ? BLOUSE_EDIT_FIELDS : target === "dupatta" ? DUPATTA_EDIT_FIELDS : [...BLOUSE_EDIT_FIELDS, ...DUPATTA_EDIT_FIELDS];
  const changes: EditChanges = {};
  for (const field of fields) if ((draft[field] ?? "") !== (initial[field] ?? "")) changes[field] = draft[field] ?? null;
  return changes;
}
export function versionViews(version: DesignVersion): OutfitViews {
  return { front: version.front_image ?? (!version.back_image ? version.image || undefined : undefined), back: version.back_image };
}
export function selectVersion(design: SavedDesign, id: string): SavedDesign {
  const versions = versionsFor(design);
  const version = versions.find(v => v.id === id);
  if (!version) return design;
  return { ...design, versions, active_version_id: id, image: version.image, front_image: version.front_image, back_image: version.back_image, selections: version.selections, sleeve: version.sleeve };
}
export function appendVersion(design: SavedDesign, draft: BlouseDraft, target: EditTarget, changes: EditChanges, views: OutfitViews, errors: ViewErrors): SavedDesign {
  const base = activeVersion(design);
  const selections = design.selections ? { ...design.selections } : undefined;
  if (selections) for (const [field, value] of Object.entries(changes)) {
    if (field !== "neckline" && field !== "necklineCustom") Object.assign(selections, { [field]: value });
  }
  const versions = versionsFor(design);
  const version: DesignVersion = {
    id: crypto.randomUUID(), created_at: new Date().toISOString(), label: `Version ${versions.length}`,
    image: views.front ?? views.back ?? "", front_image: views.front, back_image: views.back,
    selections, editor_draft: { ...draftFor(design), ...changes } as BlouseDraft,
    sleeve: changes.sleeve ?? design.sleeve, base_id: base?.id, target, changes, errors,
  };
  return selectVersion({ ...design, versions: [...versions, version] }, version.id);
}
export function fillVersionView(design: SavedDesign, view: "front" | "back", image: string): SavedDesign {
  const active = activeVersion(design);
  if (!active) return design;
  const versions = versionsFor(design).map(v => v.id === active.id ? { ...v, [view === "front" ? "front_image" : "back_image"]: image, image: view === "front" ? image : v.image || image, errors: { ...v.errors, [view]: undefined } } : v);
  return selectVersion({ ...design, versions }, active.id);
}