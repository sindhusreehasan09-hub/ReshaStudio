import { buildRequestForm, type RequestSelections } from "./outfit-prompt";
import { streamImage } from "./stream-image";
import { generateViews, type ViewGenerator, type OutfitView } from "./outfit-views";
import { activeVersion, versionViews, type EditChanges, type EditTarget, type DesignVersion } from "./design-versions";
import type { SavedDesign } from "./local-gallery";

export function createEditGenerator(base: DesignVersion, changes: EditChanges, target: EditTarget): ViewGenerator {
  const originals = versionViews(base);
  return async (view, counterpart, onFrame) => {
    const source = originals[view];
    if (!source) throw new Error("This original view is unavailable. No photo request was made.");
    const blob = await (await fetch(source)).blob();
    const image = new File([blob], `original-${view}.png`, { type: blob.type });
    const selections: RequestSelections = base.selections ?? { audience: "Women", age: "", style: "Flared", outfit: "Lehenga", modelType: "Fashion model", blouse: "match", sleeve: "short", matchingBlouse: true, matchingDupatta: false };
    const form = buildRequestForm(image, selections);
    form.set("mode", "edit"); form.set("view", view); form.set("edit_target", target); form.set("edit_changes", JSON.stringify(changes));
    const opposite = originals[view === "front" ? "back" : "front"];
    for (const [name, src] of [["original_counterpart", opposite], ["counterpart", counterpart]] as const) if (src) {
      const reference = await (await fetch(src)).blob();
      form.append(name, new File([reference], `${name}.png`, { type: reference.type }));
    }
    let completed: string | undefined;
    await streamImage(form, (src, final) => { onFrame?.(src, final); if (final) completed = src; });
    if (!completed) throw new Error("No finished edited photo was returned.");
    return completed;
  };
}
export async function generateEditedViews(design: SavedDesign, changes: EditChanges, target: EditTarget, onFrame?: (view: OutfitView, src: string, final: boolean) => void, generate?: ViewGenerator) {
  const base = activeVersion(design);
  if (!base) throw new Error("Choose a saved design first.");
  const originals = versionViews(base);
  if (!originals.front && !originals.back) throw new Error("This design has no photos to edit.");
  const generator = generate ?? createEditGenerator(base, changes, target);
  // Legacy single-view designs stay single-view: never invent or charge for a missing original.
  if (!originals.front || !originals.back) {
    const view = originals.front ? "front" : "back";
    try { return { views: { [view]: await generator(view, undefined, (src, final) => onFrame?.(view, src, final)) }, errors: {} }; }
    catch (error) { return { views: {}, errors: { [view]: error instanceof Error ? error.message : "Photo edit failed." } }; }
  }
  return generateViews(generator, onFrame);
}