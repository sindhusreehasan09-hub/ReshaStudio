import { buildRequestForm, type RequestSelections } from "./outfit-prompt";
import { ImageRequestError, streamImage } from "./stream-image";

export type OutfitView = "front" | "back";
export type OutfitViews = { front?: string; back?: string };
export type ViewErrors = Partial<Record<OutfitView, string>>;
export type ViewGenerator = (view: OutfitView, counterpart?: string, onFrame?: (src: string, final: boolean) => void) => Promise<string>;

export function createViewGenerator(source: File, selections: RequestSelections): ViewGenerator {
  return async (view, counterpart, onFrame) => {
    const form = buildRequestForm(source, selections);
    form.set("view", view);
    if (counterpart) {
      const blob = await (await fetch(counterpart)).blob();
      form.append("counterpart", new File([blob], "matching-outfit.png", { type: blob.type }));
    }
    let completed: string | undefined;
    await streamImage(form, (src, final) => { onFrame?.(src, final); if (final) completed = src; });
    if (!completed) throw new Error("No finished view was returned.");
    return completed;
  };
}

// Streaming edits have no documented multi-output indexing. Two ordered calls
// let the second reference the first; no analysis calls or automatic retries.
export async function generateViews(generate: ViewGenerator, onFrame?: (view: OutfitView, src: string, final: boolean) => void) {
  const views: OutfitViews = {};
  const errors: ViewErrors = {};
  for (const view of ["front", "back"] as const) {
    try {
      views[view] = await generate(view, views.front, (src, final) => onFrame?.(view, src, final));
    } catch (error) {
      errors[view] = error instanceof Error ? error.message : "This view could not be generated.";
      // Never continue a blocked/refused request chain.
      if (error instanceof ImageRequestError && ([400, 401, 402, 403, 404].includes(error.status) || error.status === 0)) break;
    }
  }
  return { views, errors };
}

export async function retryMissingView(views: OutfitViews, view: OutfitView, generate: ViewGenerator): Promise<OutfitViews> {
  if (views[view]) return views;
  const counterpart = view === "front" ? views.back : views.front;
  return { ...views, [view]: await generate(view, counterpart) };
}