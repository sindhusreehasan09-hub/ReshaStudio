import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { loadDesigns, type SavedDesign } from "@/lib/local-gallery";
import { OutfitCarousel } from "@/components/outfit-carousel";
import { createViewGenerator, retryMissingView, type OutfitView } from "@/lib/outfit-views";
import { saveDesign, toThumbnail } from "@/lib/local-gallery";
import { Button } from "@/components/ui/button";
import { Download, ArrowLeft, ArrowRight, ImagePlus } from "lucide-react";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { CustomizationSummary } from "@/components/customization-summary";

export const Route = createFileRoute("/gallery")({
  head: () => ({
    meta: [
      { title: "My Designs — Resha Studio" },
      { name: "description", content: "Explore your saved Resha Studio outfit designs, front and back views and textile details." },
      { property: "og:title", content: "My Designs — Resha Studio" },
      { property: "og:description", content: "Explore your saved Resha Studio outfit designs, front and back views and textile details." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Gallery,
});

type Generation = SavedDesign;

function Gallery() {
  const [items, setItems] = useState<Generation[] | null>(null);
  const [selected, setSelected] = useState<Generation | null>(null);
  const [currentView, setCurrentView] = useState<OutfitView>("front");
  const [busy, setBusy] = useState<OutfitView | null>(null);
  const [retryError, setRetryError] = useState<string | null>(null);
  useEffect(() => setItems(loadDesigns()), []);

  const retry = async (view: OutfitView) => {
    if (!selected?.source_image || !selected.selections || busy) return;
    setBusy(view); setRetryError(null);
    try {
      const source = await (await fetch(selected.source_image)).blob();
      const views = await retryMissingView({ front: selected.front_image, back: selected.back_image }, view, createViewGenerator(new File([source], "saree.jpg", { type: source.type }), selected.selections));
      const src = views[view];
      if (!src) return;
      const image = await toThumbnail(await (await fetch(src)).blob(), 1200);
      const updated = { ...selected, [view === "front" ? "front_image" : "back_image"]: image, image: view === "front" ? image : selected.image };
      if (!saveDesign(updated)) setRetryError("This device has no space to save the new view.");
      setSelected(updated); setItems(loadDesigns());
    } catch (e) { setRetryError(e instanceof Error ? e.message : "This view could not be generated."); }
    finally { setBusy(null); }
  };

  const download = () => {
    if (!selected) return;
    const src = currentView === "front" ? selected.front_image ?? selected.image : selected.back_image;
    if (!src) return;
    const link = document.createElement("a"); link.href = src; link.download = `resha-${currentView}.jpg`; link.click();
  };
  return <main className="studio-main">
    {!selected && <header className="mb-8"><p className="studio-eyebrow">YOUR PERSONAL COLLECTION</p><h1 className="mt-2 text-4xl font-semibold sm:text-5xl">My Designs</h1><p className="mt-2 text-sm text-muted-foreground">Your sarees, reimagined. Saved on this device.</p></header>}
    {items === null && <p className="py-20 text-center text-muted-foreground">Loading your designs…</p>}
    {items?.length === 0 && <section className="py-20 text-center"><ImagePlus className="mx-auto size-10 text-primary/60" /><h2 className="mt-5 text-3xl">Your collection begins here</h2><p className="mt-2 text-sm text-muted-foreground">Turn a saree you love into your first design.</p><Button asChild className="mt-6"><Link to="/">Create an outfit<ArrowRight /></Link></Button></section>}
    {selected && <section><Button variant="ghost" disabled={Boolean(busy)} onClick={() => setSelected(null)} className="mb-5"><ArrowLeft />All designs</Button><div className="grid items-start gap-8 lg:grid-cols-[minmax(0,560px)_minmax(0,1fr)]"><OutfitCarousel key={selected.id} views={{ front: selected.front_image, back: selected.back_image }} legacyImage={selected.image} busy={busy} onCurrentView={setCurrentView} onRetry={selected.selections && selected.source_image ? retry : undefined} /><div className="min-w-0"><p className="studio-eyebrow">SAVED DESIGN</p><h1 className="mt-2 text-4xl">{selected.outfit}</h1><p className="mt-2 text-sm text-muted-foreground">{new Date(selected.created_at).toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" })}</p><div className="mt-6 flex flex-wrap gap-3"><Button onClick={download} disabled={currentView === "back" && !selected.back_image}><Download />Download</Button><Button asChild variant="outline"><Link to="/"><ImagePlus />Create New Outfit</Link></Button></div>{retryError && <p role="alert" className="mt-4 text-sm text-destructive">{retryError}</p>}<Accordion type="single" collapsible className="mt-6"><AccordionItem value="details"><AccordionTrigger>Outfit details & fabric estimate</AccordionTrigger><AccordionContent><dl className="mb-5 space-y-3 text-sm">{[["Outfit", selected.outfit], ["For", `${selected.audience}${selected.age ? ` · ${selected.age}` : ""}`], ["Style", selected.style], ["Sleeves", selected.sleeve], ["Blouse", selected.blouse], ["Matching", selected.matching], ["Inspiration", selected.inspiration], ["Fabric", `${selected.fabric.join("–")} m`]].map(([k, v]) => <div key={k} className="grid grid-cols-[90px_minmax(0,1fr)] gap-4"><dt className="text-muted-foreground">{k}</dt><dd className="text-right">{v}</dd></div>)}</dl><CustomizationSummary selections={selected.selections} /></AccordionContent></AccordionItem></Accordion></div></div></section>}
    {!selected && items && items.length > 0 && <section aria-label="Saved designs" className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">{items.map(g => <article key={g.id} className="overflow-hidden rounded-lg border border-border bg-card"><Button variant="ghost" className="h-auto w-full rounded-none p-0" aria-label={`Open ${g.outfit} design`} onClick={() => { setSelected(g); setRetryError(null); }}>{g.image ? <img src={g.image} alt={`${g.outfit} for ${g.audience}`} className="aspect-[2/3] w-full object-contain" loading="lazy" /> : <div className="aspect-[2/3] w-full bg-secondary" />}</Button><div className="border-t border-border p-4"><h2 className="text-xl font-semibold">{g.outfit}</h2><p className="mt-1 text-xs text-muted-foreground">{new Date(g.created_at).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })}</p><p className="mt-2 text-xs text-muted-foreground">{g.audience} · {g.fabric.join("–")} m</p><Button variant="link" className="mt-2 h-auto px-0" onClick={() => { setSelected(g); setRetryError(null); }}>View Design<ArrowRight /></Button></div></article>)}</section>}
  </main>;
}
