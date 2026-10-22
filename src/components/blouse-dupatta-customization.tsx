import {
  BLOUSE_COLOUR_OPTIONS,
  BLOUSE_EMBELLISHMENT_OPTIONS,
  BLOUSE_FABRIC_OPTIONS,
  COORDINATION_PRESETS,
  DUPATTA_COLOUR_OPTIONS,
  DUPATTA_DESIGN_OPTIONS,
  DUPATTA_DRAPING_OPTIONS,
  DUPATTA_FABRIC_OPTIONS,
  PRESET_APPLIES,
  type BlouseColour,
  type BlouseEmbellishment,
  type BlouseFabric,
  type CoordinationPreset,
  type DupattaColour,
  type DupattaDesign,
  type DupattaDraping,
  type DupattaFabric,
} from "@/lib/outfit-prompt";

export type CustomizationState = {
  coordination: CoordinationPreset | null;
  blouseFabric: BlouseFabric | null;
  blouseFabricCustom: string;
  blouseColour: BlouseColour | null;
  blouseColourCustom: string;
  blouseEmbellishment: BlouseEmbellishment | null;
  blouseEmbellishmentCustom: string;
  dupattaFabric: DupattaFabric | null;
  dupattaFabricCustom: string;
  dupattaColour: DupattaColour | null;
  dupattaColourCustom: string;
  dupattaDesign: DupattaDesign | null;
  dupattaDesignCustom: string;
  dupattaDraping: DupattaDraping | null;
};

export const DEFAULT_CUSTOMIZATION: CustomizationState = {
  coordination: null,
  blouseFabric: null,
  blouseFabricCustom: "",
  blouseColour: null,
  blouseColourCustom: "",
  blouseEmbellishment: null,
  blouseEmbellishmentCustom: "",
  dupattaFabric: null,
  dupattaFabricCustom: "",
  dupattaColour: null,
  dupattaColourCustom: "",
  dupattaDesign: null,
  dupattaDesignCustom: "",
  dupattaDraping: null,
};

function Label({ children }: { children: React.ReactNode }) {
  return <p className="mb-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">{children}</p>;
}

function ChipRow<T extends string>({ options, value, onChange, ariaLabel }: {
  options: readonly { value: T; label: string }[];
  value: T | null;
  onChange: (value: T | null) => void;
  ariaLabel: string;
}) {
  return (
    <div role="radiogroup" aria-label={ariaLabel} className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(value === o.value ? null : o.value)}
          className={`shrink-0 rounded-full border px-3 py-2 text-sm font-medium transition-all ${
            value === o.value
              ? "border-primary bg-primary text-primary-foreground shadow-soft"
              : "border-border bg-card text-secondary-foreground hover:border-accent"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function CustomText({ value, onChange, placeholder, ariaLabel }: {
  value: string; onChange: (value: string) => void; placeholder: string; ariaLabel: string;
}) {
  return (
    <input
      type="text"
      value={value}
      maxLength={80}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      aria-label={ariaLabel}
      className="mt-2 w-full rounded-full border border-border bg-card px-4 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
    />
  );
}

function ColourPicker({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const hex = /^#[0-9a-fA-F]{6}$/.test(value) ? value : "#c2185b";
  return (
    <div className="mt-2 flex items-center gap-2">
      <input
        type="color"
        value={hex}
        aria-label="Pick the exact colour"
        onChange={(e) => onChange(e.target.value)}
        className="h-9 w-12 shrink-0 cursor-pointer rounded-lg border border-border bg-card p-1"
      />
      <input
        type="text"
        value={value}
        maxLength={80}
        onChange={(e) => onChange(e.target.value)}
        placeholder="e.g. teal, #0f766e"
        aria-label="Colour name or code"
        className="w-full rounded-full border border-border bg-card px-4 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
      />
    </div>
  );
}

export function BlouseDupattaCustomization({ value, onChange }: {
  value: CustomizationState;
  onChange: (value: CustomizationState) => void;
}) {
  const set = <K extends keyof CustomizationState>(key: K, v: CustomizationState[K]) => onChange({ ...value, [key]: v });

  // Applying a preset is an explicit user action: it sets the mapped fields once.
  // Custom text the user typed is never touched, and later edits are never overridden.
  const applyPreset = (preset: CoordinationPreset) => {
    if (value.coordination === preset) { set("coordination", null); return; }
    const mapped = PRESET_APPLIES[preset];
    onChange({ ...value, ...mapped, coordination: preset });
  };

  const noDupatta = value.dupattaFabric === "none";

  return (
    <div className="flex flex-col gap-4">
      <div>
        <Label>Colour Coordination</Label>
        <div role="radiogroup" aria-label="Colour coordination" className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1">
          {COORDINATION_PRESETS.map((c) => (
            <button
              key={c.value}
              type="button"
              role="radio"
              aria-checked={value.coordination === c.value}
              aria-label={`${c.label}: ${c.description}`}
              onClick={() => applyPreset(c.value)}
              className={`shrink-0 rounded-full border px-3 py-2 text-sm font-medium transition-all ${
                value.coordination === c.value
                  ? "border-primary bg-primary text-primary-foreground shadow-soft"
                  : "border-border bg-card text-secondary-foreground hover:border-accent"
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
        {value.coordination && (
          <p className="mt-1.5 text-xs text-muted-foreground" aria-live="polite">
            {COORDINATION_PRESETS.find((c) => c.value === value.coordination)?.description}
          </p>
        )}
      </div>

      <fieldset className="flex flex-col gap-3 rounded-2xl border border-border bg-card/50 p-3">
        <legend className="px-1 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Blouse</legend>
        <div>
          <Label>Blouse Fabric</Label>
          <ChipRow options={BLOUSE_FABRIC_OPTIONS} value={value.blouseFabric} onChange={(v) => set("blouseFabric", v)} ariaLabel="Blouse fabric" />
          {value.blouseFabric === "custom" && (
            <CustomText value={value.blouseFabricCustom} onChange={(v) => set("blouseFabricCustom", v)} placeholder="Describe the fabric" ariaLabel="Custom blouse fabric" />
          )}
        </div>
        <div>
          <Label>Blouse Colour</Label>
          <ChipRow options={BLOUSE_COLOUR_OPTIONS} value={value.blouseColour} onChange={(v) => set("blouseColour", v)} ariaLabel="Blouse colour" />
          {(value.blouseColour === "contrast" || value.blouseColour === "custom") && (
            <ColourPicker value={value.blouseColourCustom} onChange={(v) => set("blouseColourCustom", v)} />
          )}
        </div>
        <div>
          <Label>Blouse Embellishment</Label>
          <ChipRow options={BLOUSE_EMBELLISHMENT_OPTIONS} value={value.blouseEmbellishment} onChange={(v) => set("blouseEmbellishment", v)} ariaLabel="Blouse embellishment" />
          {value.blouseEmbellishment === "custom" && (
            <CustomText value={value.blouseEmbellishmentCustom} onChange={(v) => set("blouseEmbellishmentCustom", v)} placeholder="Describe the embellishment" ariaLabel="Custom blouse embellishment" />
          )}
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-3 rounded-2xl border border-border bg-card/50 p-3">
        <legend className="px-1 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Dupatta Design</legend>
        <div>
          <Label>Dupatta Fabric</Label>
          <ChipRow options={DUPATTA_FABRIC_OPTIONS} value={value.dupattaFabric} onChange={(v) => set("dupattaFabric", v)} ariaLabel="Dupatta fabric" />
          {value.dupattaFabric === "custom" && (
            <CustomText value={value.dupattaFabricCustom} onChange={(v) => set("dupattaFabricCustom", v)} placeholder="Describe the fabric" ariaLabel="Custom dupatta fabric" />
          )}
        </div>
        {!noDupatta && value.dupattaFabric && (
          <>
            <div>
              <Label>Dupatta Colour</Label>
              <ChipRow options={DUPATTA_COLOUR_OPTIONS} value={value.dupattaColour} onChange={(v) => set("dupattaColour", v)} ariaLabel="Dupatta colour" />
              {value.dupattaColour === "custom" && (
                <ColourPicker value={value.dupattaColourCustom} onChange={(v) => set("dupattaColourCustom", v)} />
              )}
            </div>
            <div>
              <Label>Dupatta Design</Label>
              <ChipRow options={DUPATTA_DESIGN_OPTIONS} value={value.dupattaDesign} onChange={(v) => set("dupattaDesign", v)} ariaLabel="Dupatta design" />
              {value.dupattaDesign === "custom" && (
                <CustomText value={value.dupattaDesignCustom} onChange={(v) => set("dupattaDesignCustom", v)} placeholder="Describe the dupatta design" ariaLabel="Custom dupatta design" />
              )}
            </div>
            <div>
              <Label>Dupatta Draping</Label>
              <ChipRow options={DUPATTA_DRAPING_OPTIONS} value={value.dupattaDraping} onChange={(v) => set("dupattaDraping", v)} ariaLabel="Dupatta draping" />
            </div>
          </>
        )}
        {noDupatta && <p className="text-xs text-muted-foreground">No dupatta will be included. For outfits where a dupatta is not standard, a stole is only added if you choose one above.</p>}
      </fieldset>
    </div>
  );
}
