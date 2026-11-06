import { useState } from "react";
import { RotateCcw, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { BlouseDupattaCustomization, DEFAULT_CUSTOMIZATION, type CustomizationState } from "./blouse-dupatta-customization";
import { BlouseBackGallery, type BackDesignState } from "./blouse-back-gallery";
import { BlouseSketch } from "./blouse-sketch";
import { blouseDraftFromDesign, NECKLINE_OPTIONS, type BlouseDraft } from "@/lib/blouse-preview";
import { SLEEVE_OPTIONS } from "@/lib/outfit-prompt";
import { saveVersionDesign, type SavedDesign } from "@/lib/local-gallery";
import { appendVersion, editChanges, type EditTarget } from "@/lib/design-versions";
import { generateEditedViews } from "@/lib/outfit-edit";

export function FreeBlouseEditor({ design, onCancel, target = "blouse", onVersionSaved }: { design?: SavedDesign | null | undefined; onCancel: () => void; target?: EditTarget; onVersionSaved?: (design: SavedDesign) => void }) {
  const [draft, setDraft] = useState<BlouseDraft>(() => blouseDraftFromDesign(design));
  const [applying, setApplying] = useState(false);
  const [applyError, setApplyError] = useState<string | null>(null);
  const patch = (updates: Partial<BlouseDraft>) => setDraft(previous => ({ ...previous, ...updates }));
  // Sketch exploration stays free; only this explicit action spends image credits,
  // and it saves a new version — originals are never overwritten.
  const apply = async () => {
    if (!design || applying) return;
    const changes = editChanges(design, draft, target);
    if (!Object.keys(changes).length) { setApplyError("Change something in the sketch first, then apply it to your photos."); return; }
    setApplying(true); setApplyError(null);
    try {
      const { views, errors } = await generateEditedViews(design, changes, target);
      if (!views.front && !views.back) throw new Error(Object.values(errors).find(Boolean) ?? "The edited photos could not be created.");
      const updated = appendVersion(design, draft, target, changes, views, errors);
      if (!saveVersionDesign(updated)) throw new Error("This device has no space to save the new version. Download your photos before leaving.");
      onVersionSaved?.(updated);
    } catch (error) { setApplyError(error instanceof Error ? error.message : "The edited photos could not be created."); }
    finally { setApplying(false); }
  };
  const customization: CustomizationState = {
    ...DEFAULT_CUSTOMIZATION,
    blouseFabric: draft.blouseFabric ?? null, blouseFabricCustom: draft.blouseFabricCustom ?? "",
    blouseColour: draft.blouseColour ?? null, blouseColourCustom: draft.blouseColourCustom ?? "",
    blouseEmbellishment: draft.blouseEmbellishment ?? null, blouseEmbellishmentCustom: draft.blouseEmbellishmentCustom ?? "",
  };
  const back: BackDesignState = { design: draft.backDesign ?? null, custom: draft.backDesignCustom ?? "", depth: draft.backDepth ?? null, closure: draft.backClosure ?? null, dori: draft.backDori ?? null, tassels: draft.backTassels ?? null, border: draft.backBorder ?? null, notes: draft.backNotes ?? "" };
  return <section aria-label="Free blouse editor" className="mt-5 min-w-0 border-t border-border pt-5">
    <div className="flex items-start justify-between gap-3"><div><p className="studio-eyebrow">BLOUSE ATELIER · 0 AI CREDITS</p><h2 className="mt-1 text-3xl">Explore your blouse</h2></div><Button variant="ghost" size="icon" aria-label="Reset blouse preview" title="Reset blouse preview" onClick={() => setDraft(blouseDraftFromDesign(design))}><RotateCcw /></Button></div>
    <p className="mt-2 text-xs leading-relaxed text-muted-foreground">Sketch changes are free and your original photos stay untouched. When you are happy, apply them to your photos — this uses image credits and saves the result as a new version you can compare or restore.</p>
    {!design?.selections && <p className="mt-2 text-xs text-muted-foreground">This older design has no detailed saved choices. Start with the available defaults.</p>}
    <div className="my-4 grid grid-cols-2 gap-3 bg-secondary/40 py-3" aria-live="polite">
      {[false, true].map(isBack => <figure key={String(isBack)} className="min-w-0"><div className="aspect-[200/170]"><BlouseSketch draft={draft} back={isBack} /></div><figcaption className="text-center text-xs text-muted-foreground">{isBack ? "Back" : "Front"} sketch</figcaption></figure>)}
    </div>
    <Accordion type="single" collapsible defaultValue="neckline">
      <AccordionItem value="neckline"><AccordionTrigger>Front neckline</AccordionTrigger><AccordionContent>
        <div role="radiogroup" aria-label="Preview neckline" className="grid grid-cols-2 gap-2 sm:grid-cols-4">{NECKLINE_OPTIONS.map(o => <Button key={o.value} role="radio" aria-checked={draft.neckline === o.value} variant="outline" onClick={() => patch({ neckline: o.value })} className={`h-auto min-w-0 flex-col whitespace-normal p-2 ${draft.neckline === o.value ? "border-primary bg-secondary ring-1 ring-primary" : ""}`}><span className="block h-14 w-20"><BlouseSketch thumbnail draft={{ ...draft, neckline: o.value, sleeve: "sleeveless" }} /></span>{o.label}</Button>)}</div>
        {draft.neckline === "custom" && <input aria-label="Custom preview neckline" value={draft.necklineCustom} onChange={e => patch({ necklineCustom: e.target.value })} maxLength={80} placeholder="Describe your neckline" className="studio-select mt-3" />}
        <p className="mt-3 text-xs text-muted-foreground">Neckline starts at Round because earlier designs did not save a front neckline. Custom details use a representative sketch.</p>
      </AccordionContent></AccordionItem>
      <AccordionItem value="sleeves"><AccordionTrigger>Sleeves · {SLEEVE_OPTIONS.find(o => o.value === draft.sleeve)?.label}</AccordionTrigger><AccordionContent><div role="radiogroup" aria-label="Preview sleeves" className="grid grid-cols-2 gap-2 sm:grid-cols-3">{SLEEVE_OPTIONS.map(o => <Button key={o.value} role="radio" aria-checked={draft.sleeve === o.value} variant="outline" onClick={() => patch({ sleeve: o.value })} className={`h-auto min-w-0 flex-col whitespace-normal p-2 ${draft.sleeve === o.value ? "border-primary bg-secondary ring-1 ring-primary" : ""}`}><span className="block h-16 w-24"><BlouseSketch thumbnail draft={{ ...draft, sleeve: o.value }} /></span><span className="text-xs">{o.label}</span></Button>)}</div></AccordionContent></AccordionItem>
      <AccordionItem value="fabric"><AccordionTrigger>Fabric, colour & embroidery</AccordionTrigger><AccordionContent><BlouseDupattaCustomization value={customization} section="blouse" onChange={value => patch({ blouseFabric: value.blouseFabric, blouseFabricCustom: value.blouseFabricCustom, blouseColour: value.blouseColour, blouseColourCustom: value.blouseColourCustom, blouseEmbellishment: value.blouseEmbellishment, blouseEmbellishmentCustom: value.blouseEmbellishmentCustom })} /></AccordionContent></AccordionItem>
      <AccordionItem value="back"><AccordionTrigger>Back design & finishing</AccordionTrigger><AccordionContent><BlouseBackGallery value={back} renderThumbnail={value => <BlouseSketch thumbnail back draft={{ ...draft, backDesign: value }} />} onChange={value => patch({ backDesign: value.design, backDesignCustom: value.custom, backDepth: value.depth, backClosure: value.closure, backDori: value.dori, backTassels: value.tassels, backBorder: value.border, backNotes: value.notes })} /></AccordionContent></AccordionItem>
    </Accordion>
    {applyError && <p role="alert" className="mt-4 text-sm text-destructive">{applyError}</p>}
    <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-border py-4"><p className="text-xs text-muted-foreground">Sketching is free · Applying uses image credits</p><div className="flex flex-wrap gap-3"><Button variant="outline" disabled={applying} onClick={onCancel}>Cancel preview</Button>{design && <Button disabled={applying} onClick={apply}><Sparkles />{applying ? "Applying to photos…" : "Apply to photos"}</Button>}</div></div>
  </section>;
}