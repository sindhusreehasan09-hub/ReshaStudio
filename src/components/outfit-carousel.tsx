import { useEffect, useState } from "react";
import { Download, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious, type CarouselApi } from "@/components/ui/carousel";
import type { OutfitView, OutfitViews, ViewErrors } from "@/lib/outfit-views";

export function OutfitCarousel({ views, errors = {}, legacyImage, busy, onRetry, onCurrentView }: {
  views: OutfitViews; errors?: ViewErrors; legacyImage?: string; busy?: OutfitView | null;
  onRetry?: (view: OutfitView) => void; onCurrentView?: (view: OutfitView) => void;
}) {
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);
  const legacy = Boolean(legacyImage && !views.front && !views.back);
  const slides: OutfitView[] = legacy ? ["front"] : ["front", "back"];
  useEffect(() => {
    if (!api) return;
    const update = () => { const index = api.selectedScrollSnap(); setCurrent(index); onCurrentView?.(index === 0 ? "front" : "back"); };
    update(); api.on("select", update);
    return () => { api.off("select", update); };
  }, [api, onCurrentView]);
  return <Carousel setApi={setApi} opts={{ align: "start" }} aria-label="Outfit views">
    <CarouselContent>
      {slides.map(view => {
        const image = legacy ? legacyImage : views[view];
        const label = legacy ? "Saved Design" : view === "front" ? "Front View" : "Back View";
        return <CarouselItem key={view} aria-label={label}>
          <div className="relative aspect-[2/3] overflow-hidden rounded-lg border border-border bg-card">
            {image ? <img src={image} alt={label} className="h-full w-full object-contain" /> : <div className="flex h-full flex-col items-center justify-center gap-3 px-4 text-center text-sm text-muted-foreground">
              <p>{busy === view ? `Generating ${label.toLowerCase()}…` : `${label} unavailable`}</p>
              {errors[view] && <p role="alert">{errors[view]}</p>}
              {onRetry && <Button variant="outline" disabled={Boolean(busy)} onClick={() => onRetry(view)}><RotateCcw className="size-4" />Retry {label}</Button>}
            </div>}
            <span className="absolute left-3 top-3 rounded-md bg-card/95 px-3 py-1 text-xs font-semibold text-primary">{label}</span>
          </div>
        </CarouselItem>;
      })}
    </CarouselContent>
    <div className="relative mt-3 flex h-9 items-center justify-center gap-2">
      {slides.length > 1 && <><CarouselPrevious className="left-0 top-1/2" /><CarouselNext className="right-0 top-1/2" /></>}
      {slides.map((view, index) => <Button key={view} variant="ghost" size="icon" aria-label={`Show ${view} view`} aria-pressed={current === index} className="size-6" onClick={() => api?.scrollTo(index)}><span className={`size-2 rounded-full ${current === index ? "bg-primary" : "bg-border"}`} /></Button>)}
      <span aria-live="polite" className="text-xs text-muted-foreground">{legacy ? "Saved Design" : current === 0 ? "Front View" : "Back View"} · {current + 1}/{slides.length}</span>
    </div>
  </Carousel>;
}