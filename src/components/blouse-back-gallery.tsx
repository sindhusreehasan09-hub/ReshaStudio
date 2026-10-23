import { ImageOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  BACK_BORDER_OPTIONS,
  BACK_CLOSURE_OPTIONS,
  BACK_DEPTH_OPTIONS,
  BACK_DESIGNS,
  BACK_DORI_OPTIONS,
  BACK_TASSEL_OPTIONS,
  findBackDesign,
  type BackDesignValue,
} from "@/lib/outfit-prompt";

export type BackDesignState = {
  design: BackDesignValue | null;
  custom: string;
  depth: string | null;
  closure: string | null;
  dori: string | null;
  tassels: string | null;
  border: string | null;
  notes: string;
};

export const DEFAULT_BACK_DESIGN: BackDesignState = {
  design: null,
  custom: "",
  depth: null,
  closure: null,
  dori: null,
  tassels: null,
  border: null,
  notes: "",
};

function Label({ children }: { children: React.ReactNode }) {
  return <p className="mb-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">{children}</p>;
}

function ControlRow({ label, options, value, onChange }: {
  label: string;
  options: readonly { value: string; label: string }[];
  value: string | null;
  onChange: (value: string | null) => void;
}) {
  return (
    <div>
      <Label>{label}</Label>
      <div role="radiogroup" aria-label={label} className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1">
        {options.map((o) => (
          <Button variant="outline"
            key={o.value}
            type="button"
            role="radio"
            aria-checked={value === o.value}
            onClick={() => onChange(value === o.value ? null : o.value)}
            className={`h-auto shrink-0 rounded-full border px-3 py-2 text-sm font-medium transition-all ${
              value === o.value
                ? "border-primary bg-primary text-primary-foreground shadow-soft"
                : "border-border bg-card text-secondary-foreground hover:border-accent"
            }`}
          >
            {o.label}
          </Button>
        ))}
      </div>
    </div>
  );
}

export function BlouseBackGallery({ value, onChange }: {
  value: BackDesignState;
  onChange: (value: BackDesignState) => void;
}) {
  const set = <K extends keyof BackDesignState>(key: K, v: BackDesignState[K]) => onChange({ ...value, [key]: v });
  const selected = findBackDesign(value.design);
  const has = (control: string) => selected?.controls.includes(control as never) ?? false;

  return (
    <div>
      <Label>Blouse Back Design</Label>
      <p className="mb-2 text-xs text-muted-foreground">Optional — choose one back design for the back view, or skip to keep it simple.</p>
      <div role="radiogroup" aria-label="Blouse back design" className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {BACK_DESIGNS.map((d) => {
          const active = value.design === d.value;
          return (
            <Button variant="outline"
              key={d.value}
              type="button"
              role="radio"
              aria-checked={active}
              aria-label={`${d.label}: ${d.description}`}
              onClick={() => set("design", active ? null : d.value)}
              className={`h-auto min-w-0 flex-col gap-0 overflow-hidden whitespace-normal rounded-lg border p-0 text-left transition-all ${
                active ? "border-primary bg-primary/10 ring-2 ring-primary" : "border-border bg-card hover:border-accent"
              }`}
            >
              <span className="flex h-16 w-full flex-col items-center justify-center gap-1 bg-secondary text-muted-foreground">
                <ImageOff aria-hidden="true" className="size-4" />
                <span className="text-[9px]">Reference image pending</span>
              </span>
              <span className="flex flex-1 flex-col gap-0.5 px-2 py-1.5">
                <span className={`text-xs font-semibold ${active ? "text-primary" : "text-foreground"}`}>{d.label}</span>
                <span className="text-[10px] leading-tight text-muted-foreground">{d.description}</span>
              </span>
            </Button>
          );
        })}
      </div>

      {selected && (
        <div className="mt-3 flex flex-col gap-3 border-t border-border pt-3" aria-live="polite">
          {selected.value === "custom" && (
            <div>
              <Label>Describe Your Back Design</Label>
              <input
                type="text"
                value={value.custom}
                maxLength={80}
                onChange={(e) => set("custom", e.target.value)}
                placeholder="e.g. deep round back with pearl latkans"
                aria-label="Custom back design"
                className="w-full rounded-full border border-border bg-card px-4 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          )}
          {has("depth") && <ControlRow label="Back Depth" options={BACK_DEPTH_OPTIONS} value={value.depth} onChange={(v) => set("depth", v)} />}
          {has("closure") && <ControlRow label="Closure" options={BACK_CLOSURE_OPTIONS} value={value.closure} onChange={(v) => set("closure", v)} />}
          {has("dori") && <ControlRow label="Dori Style" options={BACK_DORI_OPTIONS} value={value.dori} onChange={(v) => set("dori", v)} />}
          {has("tassels") && <ControlRow label="Tassels" options={BACK_TASSEL_OPTIONS} value={value.tassels} onChange={(v) => set("tassels", v)} />}
          {has("border") && <ControlRow label="Border & Embellishment" options={BACK_BORDER_OPTIONS} value={value.border} onChange={(v) => set("border", v)} />}
          <div>
            <Label>Additional Instructions (optional)</Label>
            <input
              type="text"
              value={value.notes}
              maxLength={80}
              onChange={(e) => set("notes", e.target.value)}
              placeholder="Anything else about the back design"
              aria-label="Additional back design instructions"
              className="w-full rounded-full border border-border bg-card px-4 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        </div>
      )}
    </div>
  );
}
