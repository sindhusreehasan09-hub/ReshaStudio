import { BLOUSE_FABRIC_OPTIONS, BLOUSE_COLOUR_OPTIONS, BLOUSE_EMBELLISHMENT_OPTIONS, DUPATTA_FABRIC_OPTIONS, DUPATTA_COLOUR_OPTIONS, DUPATTA_DESIGN_OPTIONS, DUPATTA_DRAPING_OPTIONS, COORDINATION_PRESETS, findBackDesign, type RequestSelections } from "@/lib/outfit-prompt";

export function CustomizationSummary({ selections }: { selections?: RequestSelections }) {
  if (!selections) return null;
  const s = selections;
  const label = (options: readonly { value: string; label: string }[], value?: string | null, custom?: string | null) => {
    if (!value) return null;
    const name = options.find(o => o.value === value)?.label ?? value;
    return custom && ["custom", "contrast"].includes(value) ? `${name}: ${custom}` : name;
  };
  const blouse = [label(BLOUSE_FABRIC_OPTIONS, s.blouseFabric, s.blouseFabricCustom), label(BLOUSE_COLOUR_OPTIONS, s.blouseColour, s.blouseColourCustom), label(BLOUSE_EMBELLISHMENT_OPTIONS, s.blouseEmbellishment, s.blouseEmbellishmentCustom)].filter(Boolean).join(" · ");
  const dupatta = s.dupattaFabric === "none" ? "No dupatta" : [label(DUPATTA_FABRIC_OPTIONS, s.dupattaFabric, s.dupattaFabricCustom), label(DUPATTA_COLOUR_OPTIONS, s.dupattaColour, s.dupattaColourCustom), label(DUPATTA_DESIGN_OPTIONS, s.dupattaDesign, s.dupattaDesignCustom), label(DUPATTA_DRAPING_OPTIONS, s.dupattaDraping)].filter(Boolean).join(" · ");
  const rows = [["Blouse details", blouse], ["Dupatta", dupatta], ["Blouse back", s.backDesign === "custom" ? s.backDesignCustom : findBackDesign(s.backDesign)?.label], ["Coordination", label(COORDINATION_PRESETS, s.coordination)]];
  return <dl className="space-y-2 text-xs text-muted-foreground">{rows.filter(([, value]) => value).map(([name, value]) => <div key={name} className="grid grid-cols-[6rem_minmax(0,1fr)] gap-3"><dt>{name}</dt><dd className="break-words text-right font-medium text-foreground">{value}</dd></div>)}</dl>;
}