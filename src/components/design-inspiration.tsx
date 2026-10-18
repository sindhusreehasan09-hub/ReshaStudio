import { useState } from "react";
import { ImageOff, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { findDesignReference, referencesForOutfit, type DesignReference } from "@/lib/design-references";
import type { OutfitType } from "@/lib/outfit-prompt";

function Thumbnail({ reference }: { reference: DesignReference }) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  return reference.thumbnailUrl && reference.thumbnailUrl !== failedUrl ? (
    <img src={reference.thumbnailUrl} alt="" className="h-20 w-full object-cover" onError={() => setFailedUrl(reference.thumbnailUrl)} />
  ) : (
    <span className="flex h-20 w-full flex-col items-center justify-center gap-1 bg-secondary text-muted-foreground">
      <ImageOff aria-hidden="true" /><span className="text-[10px]">Image pending</span>
    </span>
  );
}

export function DesignInspiration({ outfit, selectedId, onSelect }: {
  outfit: OutfitType; selectedId: string | null; onSelect: (id: string | null) => void;
}) {
  const selected = findDesignReference(selectedId, outfit);
  const optionClass = (active: boolean) => `h-auto w-28 shrink-0 flex-col gap-0 overflow-hidden whitespace-normal rounded-lg border p-0 text-xs ${active ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-secondary-foreground"}`;
  return (
    <div>
      <p className="mb-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Design Inspiration</p>
      <div role="radiogroup" aria-label="Design inspiration" className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1">
        <Button variant="ghost" role="radio" aria-checked={!selected} onClick={() => onSelect(null)} className={optionClass(!selected)}>
          <span className="flex h-20 w-full items-center justify-center"><Sparkles aria-hidden="true" /></span>
          <span className="flex min-h-10 items-center px-2 py-1">Original Design</span>
        </Button>
        {referencesForOutfit(outfit).map((r) => (
          <Button key={r.id} variant="ghost" role="radio" aria-checked={selected?.id === r.id} aria-label={r.designName} onClick={() => onSelect(r.id)} className={optionClass(selected?.id === r.id)}>
            <Thumbnail reference={r} />
            <span className="flex min-h-10 items-center px-2 py-1">{r.designName}</span>
          </Button>
        ))}
      </div>
      <p className="mt-1.5 text-xs text-muted-foreground" aria-live="polite">{selected?.silhouetteDescription ?? "Original construction from your saree."}</p>
    </div>
  );
}
