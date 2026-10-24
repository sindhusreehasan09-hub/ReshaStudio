import { createFileRoute, Link } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { saveDesign, toThumbnail, type SavedDesign } from "@/lib/local-gallery";
import { DEFAULT_SLEEVE, SLEEVE_OPTIONS, type OutfitType, type SleeveDesign, type RequestSelections } from "@/lib/outfit-prompt";
import { createViewGenerator, generateViews, retryMissingView, type OutfitViews, type OutfitView, type ViewErrors } from "@/lib/outfit-views";
import { OutfitCarousel } from "@/components/outfit-carousel";
import { Button } from "@/components/ui/button";
import { DesignInspiration } from "@/components/design-inspiration";
import { findDesignReference } from "@/lib/design-references";
import { BlouseDupattaCustomization, DEFAULT_CUSTOMIZATION } from "@/components/blouse-dupatta-customization";
import { BlouseBackGallery, DEFAULT_BACK_DESIGN } from "@/components/blouse-back-gallery";
import { CustomizationSummary } from "@/components/customization-summary";
import { ArrowLeft, ArrowRight, Check, Upload, ImagePlus, Trash2, Sparkles, Download, RotateCcw, BookmarkCheck, Scissors } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { OutfitIllustration } from "@/components/outfit-illustration";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Resha Studio — One saree. Endless possibilities." },
      { name: "description", content: "Upload a saree photo and see it transformed into a beautiful lehenga design." },
      { property: "og:title", content: "Resha Studio" },
      { property: "og:description", content: "One saree. Endless possibilities — turn your saree design into a beautiful outfit ." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

type Audience = "Kids" | "Women";
type BlouseDesign = "match" | "simple" | "embroidered" | "princess" | "puff" | "trendy" | "suggest";
const AGES = ["2-4 years", "5-7 years", "8-10 years", "11-13 years"];
const STYLES = ["Classic", "Flared", "Designer"] as const;
type OutfitDesign = OutfitType | "suggest";
const OUTFITS: OutfitDesign[] = ["Lehenga", "Anarkali", "Gown", "Sharara", "Palazzo Set", "A-Line Dress", "Frock", "Skirt & Top", "Half-Saree", "Kurta & Palazzo", "Peplum & Skirt", "Straight Kurta Set", "suggest"];
const MODELS = ["Fashion model", "Dress/mannequin only"] as const;
const KIDS_FABRIC: Record<string, [number, number]> = {
  "2-4 years": [2, 2.5],
  "5-7 years": [2.5, 3],
  "8-10 years": [3, 3.5],
  "11-13 years": [3.5, 4.5],
};
const OUTFIT_FABRIC: Record<Exclude<OutfitDesign, "suggest">, [number, number]> = {
  Lehenga: [5.5, 7],
  Anarkali: [5, 6.5],
  Gown: [4.5, 6],
  Sharara: [4.5, 6],
  "Palazzo Set": [4, 5],
  "A-Line Dress": [3.5, 4.5],
  Frock: [3, 4],
  "Skirt & Top": [4, 5],
  "Half-Saree": [5, 6],
  "Kurta & Palazzo": [4, 5],
  "Peplum & Skirt": [4, 5],
  "Straight Kurta Set": [3.5, 4.5],
};
const estimateFabric = (audience: Audience, age: string, outfit: OutfitDesign): [number, number] => {
  const key: Exclude<OutfitDesign, "suggest"> = outfit === "suggest" ? suggestLook(audience, age).outfit : outfit;
  return audience === "Kids" ? (KIDS_FABRIC[age] ?? KIDS_FABRIC["5-7 years"]!) : OUTFIT_FABRIC[key] ?? OUTFIT_FABRIC.Lehenga!;
};
type SuggestedLook = { outfit: Exclude<OutfitDesign, "suggest">; blouse: BlouseDesign; matchBlouse: boolean; matchDupatta: boolean };
const suggestLook = (audience: Audience, age: string): SuggestedLook => {
  if (audience === "Women") return { outfit: "Anarkali", blouse: "embroidered", matchBlouse: true, matchDupatta: true };
  switch (age) {
    case "2-4 years":
      return { outfit: "Frock", blouse: "puff", matchBlouse: true, matchDupatta: true };
    case "5-7 years":
      return { outfit: "Lehenga", blouse: "puff", matchBlouse: true, matchDupatta: true };
    case "8-10 years":
      return { outfit: "Lehenga", blouse: "princess", matchBlouse: true, matchDupatta: true };
    default:
      return { outfit: "Anarkali", blouse: "princess", matchBlouse: true, matchDupatta: true };
  }
};
const BLOUSE_OPTIONS: { value: BlouseDesign; label: string }[] = [
  { value: "match", label: "Match the Saree" },
  { value: "simple", label: "Simple & Elegant" },
  { value: "embroidered", label: "Embroidered" },
  { value: "princess", label: "Princess / Festive" },
  { value: "puff", label: "Puff Sleeves" },
  { value: "trendy", label: "Trendy" },
  { value: "suggest", label: "✨ Suggest for me" },
];
const ERROR_MSG = "Something went wrong. Please try again with a clearer saree photo.";

async function prepareImage(file: File): Promise<{ blob: Blob; warning: string | null }> {
  const bmp = await createImageBitmap(file);
  const { width, height } = bmp;
  let warning: string | null = null;
  if (Math.min(width, height) < 500) warning = "This photo is quite small — results may be less detailed.";
  // simple blur check: variance of luminance differences on a downscaled copy
  const s = 200 / Math.max(width, height);
  const c = document.createElement("canvas");
  c.width = Math.round(width * s);
  c.height = Math.round(height * s);
  const ctx = c.getContext("2d")!;
  ctx.drawImage(bmp, 0, 0, c.width, c.height);
  const d = ctx.getImageData(0, 0, c.width, c.height).data;
  let sum = 0, sq = 0, n = 0;
  for (let i = 4; i < d.length; i += 4) {
    const a = d[i]! * 0.3 + d[i + 1]! * 0.59 + d[i + 2]! * 0.11;
    const b = d[i - 4]! * 0.3 + d[i - 3]! * 0.59 + d[i - 2]! * 0.11;
    const diff = a - b;
    sum += diff; sq += diff * diff; n++;
  }
  const variance = sq / n - (sum / n) ** 2;
  if (!warning && variance < 30) warning = "This photo looks a little blurry. A sharper photo gives better results.";

  const max = 1600;
  if (Math.max(width, height) <= max && file.size < 3_000_000) return { blob: file, warning };
  const k = max / Math.max(width, height);
  const out = document.createElement("canvas");
  out.width = Math.round(width * Math.min(1, k));
  out.height = Math.round(height * Math.min(1, k));
  out.getContext("2d")!.drawImage(bmp, 0, 0, out.width, out.height);
  const blob = await new Promise<Blob>((r) => out.toBlob((b) => r(b!), "image/jpeg", 0.88));
  return { blob, warning };
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <Button variant="outline"
      type="button"
      onClick={onClick}
      className={`flex-1 rounded-full border px-3 py-2 text-sm font-medium transition-all ${
        active
          ? "border-primary bg-primary text-primary-foreground shadow-soft"
          : "border-border bg-card text-secondary-foreground hover:border-accent"
      }`}
    >
      {children}
    </Button>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <p className="mb-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">{children}</p>;
}

export function Index() {
  const [step, setStep] = useState(1);
  const [customTab, setCustomTab] = useState("outfit");
  const requestLock = useRef(false);
  const moveTo = (next: number) => { setStep(next); window.scrollTo({ top: 0, behavior: "instant" }); };
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<Blob | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [audience, setAudience] = useState<Audience>("Kids");
  const [age, setAge] = useState("5-7 years");
  const [style, setStyle] = useState<(typeof STYLES)[number]>("Flared");
  const [outfitDesign, setOutfitDesign] = useState<OutfitDesign>("Lehenga");
  const [referenceId, setReferenceId] = useState<string | null>(null);
  const inspirationOutfit = outfitDesign === "suggest" ? suggestLook(audience, age).outfit : outfitDesign;
  const selectedReference = findDesignReference(referenceId, inspirationOutfit);
  const [modelType, setModelType] = useState<(typeof MODELS)[number]>("Fashion model");
  const [matchBlouse, setMatchBlouse] = useState(true);
  const [matchDupatta, setMatchDupatta] = useState(true);
  const [blouseDesign, setBlouseDesign] = useState<BlouseDesign>("match");
  const [customization, setCustomization] = useState(DEFAULT_CUSTOMIZATION);
  const [backDesign, setBackDesign] = useState(DEFAULT_BACK_DESIGN);
  const [sleeveDesign, setSleeveDesign] = useState<SleeveDesign>(DEFAULT_SLEEVE);
  const [phase, setPhase] = useState<"form" | "loading" | "result">("form");
  const [result, setResult] = useState<string | null>(null);
  const [views, setViews] = useState<OutfitViews>({});
  const [viewErrors, setViewErrors] = useState<ViewErrors>({});
  const [busyView, setBusyView] = useState<OutfitView | null>(null);
  const [currentView, setCurrentView] = useState<OutfitView>("front");
  const [record, setRecord] = useState<SavedDesign | null>(null);
  const [usedConfig, setUsedConfig] = useState<{ outfit: string; blouse: string; sleeve: string; matching: string; age: string | null; inspiration: string } | null>(null);
  const [isFinal, setIsFinal] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onPick = async (f?: File) => {
    if (!f) return;
    if (!/image\/(jpe?g|png|webp)/.test(f.type)) {
      setError("Please choose a JPG, PNG or WEBP photo.");
      return;
    }
    setError(null);
    try {
      const { blob, warning } = await prepareImage(f);
      setFile(blob);
      setWarning(warning);
      setPreview(URL.createObjectURL(blob));
    } catch {
      setError("We couldn't read that photo. Please try another one.");
    }
  };

  const create = async () => {
    if (!file || requestLock.current) return;
    requestLock.current = true;
    setPhase("loading");
    setError(null);
    setResult(null);
    setViews({});
    setViewErrors({});
    setIsFinal(false);
    const look = outfitDesign === "suggest" ? suggestLook(audience, age) : null;
    const resolvedOutfit = look ? look.outfit : (outfitDesign as OutfitType);
    const resolvedBlouse = look ? look.blouse : blouseDesign;
    const resolvedMatchBlouse = look ? look.matchBlouse : matchBlouse;
    const resolvedMatchDupatta = look ? look.matchDupatta : matchDupatta;
    const matchingPieces = [resolvedMatchBlouse ? "blouse" : null, resolvedMatchDupatta ? "dupatta" : null].filter(Boolean).join(",");
    const fabric = estimateFabric(audience, age, outfitDesign);
    try {
      const config = {
        outfit: resolvedOutfit,
        blouse: BLOUSE_OPTIONS.find((b) => b.value === resolvedBlouse)?.label ?? resolvedBlouse,
        sleeve: SLEEVE_OPTIONS.find((s) => s.value === sleeveDesign)?.label ?? sleeveDesign,
        matching: matchingPieces ? matchingPieces.split(",").map((p) => `Matching ${p[0]!.toUpperCase()}${p.slice(1)}`).join(" + ") : "None",
        age: audience === "Kids" ? age : null,
        inspiration: selectedReference?.designName ?? "Original Design",
      };
      setUsedConfig(config);
      const selections: RequestSelections = {
        audience, age, style, outfit: resolvedOutfit, modelType, blouse: resolvedBlouse, sleeve: sleeveDesign,
        matchingBlouse: resolvedMatchBlouse, matchingDupatta: resolvedMatchDupatta, referenceId: selectedReference?.id ?? null,
        ...customization, backDesign: backDesign.design, backDesignCustom: backDesign.custom,
        backDepth: backDesign.depth, backClosure: backDesign.closure, backDori: backDesign.dori,
        backTassels: backDesign.tassels, backBorder: backDesign.border, backNotes: backDesign.notes,
      };
      const generate = createViewGenerator(new File([file], "saree.jpg", { type: file.type }), selections);
      const generated = await generateViews(generate, (view, src, final) => { setBusyView(view); setResult(src); setIsFinal(final); });
      setViews(generated.views);
      setViewErrors(generated.errors);
      if (!generated.views.front && !generated.views.back) throw new Error(Object.values(generated.errors)[0] ?? ERROR_MSG);
      const sourceImage = await toThumbnail(file, 1200);
      const frontImage = generated.views.front ? await toThumbnail(await (await fetch(generated.views.front)).blob(), 1200) : undefined;
      const backImage = generated.views.back ? await toThumbnail(await (await fetch(generated.views.back)).blob(), 1200) : undefined;
      const saved: SavedDesign = { id: crypto.randomUUID(), created_at: new Date().toISOString(), audience, style, model_type: modelType, fabric, image: frontImage ?? backImage ?? "", front_image: frontImage, back_image: backImage, source_image: sourceImage, selections, ...config };
      setRecord(saved);
      if (!saveDesign(saved)) setError("Your views are ready, but this device has no space to save them. Download them before leaving.");
      setResult(generated.views.front ?? generated.views.back ?? null);
      setIsFinal(true);
      setPhase("result");
    } catch (e) {
      console.error(e);
      setError(e instanceof Error ? e.message : ERROR_MSG);
      setPhase("form");
    } finally {
      requestLock.current = false;
      setBusyView(null);
    }
  };

  const retry = async (view: OutfitView) => {
    if (!file || !record?.selections || busyView) return;
    setBusyView(view);
    setError(null);
    try {
      const updated = await retryMissingView(views, view, createViewGenerator(new File([file], "saree.jpg", { type: file.type }), record.selections));
      setViews(updated);
      setViewErrors(previous => ({ ...previous, [view]: undefined }));
      const src = updated[view];
      if (!src) return;
      const image = await toThumbnail(await (await fetch(src)).blob(), 1200);
      const saved = { ...record, [view === "front" ? "front_image" : "back_image"]: image, image: view === "front" ? image : record.image };
      setRecord(saved);
      if (!saveDesign(saved)) setError("This device has no space to save the new view. Download it before leaving.");
    } catch (e) { setViewErrors(previous => ({ ...previous, [view]: e instanceof Error ? e.message : ERROR_MSG })); }
    finally { setBusyView(null); }
  };

  const download = () => {
    const image = views[currentView];
    if (!image) return;
    const a = document.createElement("a");
    a.href = image;
    a.download = `resha-studio-${currentView}.png`;
    a.click();
  };

  const reset = () => {
    moveTo(1);
    setFile(null);
    setPreview(null);
    setWarning(null);
    setResult(null);
    setViews({});
    setRecord(null);
    setViewErrors({});
    setError(null);
    setPhase("form");
  };

  const reviewRows: [string, string | undefined][] = [
    ["Outfit", outfitDesign === "suggest" ? "AI stylist choice" : outfitDesign],
    ["For", `${audience}${audience === "Kids" ? ` · ${age}` : ""}`],
    ["Silhouette", style], ["Blouse", BLOUSE_OPTIONS.find(b => b.value === blouseDesign)?.label],
    ["Sleeves", SLEEVE_OPTIONS.find(s => s.value === sleeveDesign)?.label],
    ["Presentation", modelType], ["Reference", selectedReference?.designName ?? "Original design"],
    ["Matching", [matchBlouse ? "Blouse" : "", matchDupatta ? "Dupatta" : ""].filter(Boolean).join(" & ") || "None"],
  ];
  const choices = <BlouseDupattaCustomization value={customization} onChange={setCustomization} section={customTab === "blouse" ? "blouse" : customTab === "dupatta" ? "dupatta" : "coordination"} />;

  return (
    <main className="studio-main">
      {phase === "form" && <>
        <header className="mb-7 grid grid-cols-[minmax(0,1fr)_auto] items-end gap-4">
          <div className="min-w-0"><p className="studio-eyebrow">THE DESIGN ATELIER</p><h1 className="mt-2 text-4xl font-semibold sm:text-5xl">Create your outfit</h1><p className="mt-2 text-sm text-muted-foreground">One saree. A new expression of you.</p></div>
          <Scissors className="mb-2 hidden size-8 text-primary/50 sm:block" aria-hidden />
        </header>
        <nav aria-label="Design progress" className="mb-8 grid grid-cols-4 border-b border-border">
          {["Saree", "Outfit", "Customize", "Generate"].map((name, i) => <Button key={name} variant="ghost" disabled={i > 0 && !file} aria-current={step === i + 1 ? "step" : undefined} onClick={() => moveTo(i + 1)} className={`progress-step h-auto min-w-0 rounded-none px-1 py-4 ${step === i + 1 ? "border-b-2 border-primary text-primary" : "text-muted-foreground"}`}><span className={`grid size-6 shrink-0 place-items-center rounded-full text-xs ${step >= i + 1 ? "bg-primary text-primary-foreground" : "bg-secondary"}`}>{step > i + 1 ? <Check /> : i + 1}</span><span className="hidden sm:inline">{name}</span><span className="sm:hidden text-xs">{name}</span></Button>)}
        </nav>
        <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_260px]">
          <section className="min-w-0">
            <input ref={inputRef} type="file" aria-label="Saree photo" accept="image/jpeg,image/jpg,image/png,image/webp" className="hidden" onChange={e => { onPick(e.target.files?.[0]); e.target.value = ""; }} />
            {step === 1 && <>
              <p className="studio-eyebrow">STEP 01 / YOUR TEXTILE</p><h2 className="mt-2 text-3xl font-semibold">It begins with your saree</h2>
              <p className="mb-6 mt-2 max-w-lg text-sm leading-relaxed text-muted-foreground">Your saree’s colours, motifs and border become the textile of your new outfit.</p>
              <div onDragOver={e => e.preventDefault()} onDrop={e => { e.preventDefault(); onPick(e.dataTransfer.files[0]); }} className="upload-zone">
                {preview ? <><img src={preview} alt="Your saree" className="max-h-[440px] w-full object-contain" /><div className="flex justify-center gap-3 border-t border-border p-4"><Button variant="outline" onClick={() => inputRef.current?.click()}><ImagePlus />Replace</Button><Button variant="ghost" onClick={() => { setFile(null); setPreview(null); setWarning(null); }}><Trash2 />Remove</Button></div></> : <Button variant="ghost" onClick={() => inputRef.current?.click()} className="h-[330px] w-full flex-col gap-4 whitespace-normal hover:bg-secondary/50"><span className="grid size-16 place-items-center rounded-full bg-secondary text-primary"><Upload className="size-6" /></span><span className="font-display text-3xl text-foreground">Upload Saree Photo</span><span className="text-sm text-muted-foreground">Choose a photo or drag it here</span><span className="text-xs text-muted-foreground">JPG, PNG or WEBP</span></Button>}
              </div>
              {warning && <p className="mt-3 text-sm text-muted-foreground">{warning}</p>}
            </>}
            {step === 2 && <>
              <p className="studio-eyebrow">STEP 02 / THE SILHOUETTE</p><h2 className="mb-6 mt-2 text-3xl font-semibold">Choose your outfit</h2>
              <div className="mb-6 grid gap-4 sm:grid-cols-2"><div><Label>Designed for</Label><div className="flex gap-2">{(["Kids", "Women"] as const).map(a => <Chip key={a} active={audience === a} onClick={() => setAudience(a)}>{a}</Chip>)}</div></div>{audience === "Kids" && <div><Label>Age group</Label><select aria-label="Age group" value={age} onChange={e => setAge(e.target.value)} className="studio-select">{AGES.map(a => <option key={a}>{a}</option>)}</select></div>}</div>
              <div role="radiogroup" aria-label="Outfit design" className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">{OUTFITS.map(o => <Button key={o} variant="outline" role="radio" aria-checked={outfitDesign === o} onClick={() => { setOutfitDesign(o); setReferenceId(null); }} className={`outfit-option h-auto min-w-0 flex-col gap-0 whitespace-normal p-0 ${outfitDesign === o ? "border-primary ring-1 ring-primary" : ""}`}><span className="relative grid h-32 w-full place-items-center bg-secondary/45">{o === "suggest" ? <Sparkles className="size-9 text-primary" /> : <OutfitIllustration outfit={o} />}{outfitDesign === o && <span className="absolute right-2 top-2 grid size-5 place-items-center rounded-full bg-primary text-primary-foreground"><Check className="size-3" /></span>}</span><span className="min-h-12 px-2 py-3 text-xs font-medium">{o === "suggest" ? "AI Stylist Choice" : o}</span></Button>)}</div>
            </>}
            {step === 3 && <>
              <p className="studio-eyebrow">STEP 03 / MAKE IT YOURS</p><h2 className="mb-6 mt-2 text-3xl font-semibold">The details make the design</h2>
              <Tabs value={customTab} onValueChange={setCustomTab}>
                <TabsList className="mb-5 flex h-auto w-full justify-start gap-1 overflow-x-auto bg-secondary/70 p-1">{[["outfit", "Outfit & sleeves"], ["blouse", "Blouse"], ["back", "Blouse back"], ["dupatta", "Dupatta"], ["colours", "Colours & fabric"]].map(([id, name]) => <TabsTrigger className="min-h-10 shrink-0" key={id} value={id}>{name}</TabsTrigger>)}</TabsList>
                <TabsContent value="outfit" className="space-y-6"><div><Label>Outfit style</Label><div className="flex gap-2">{STYLES.map(s => <Chip key={s} active={style === s} onClick={() => setStyle(s)}>{s}</Chip>)}</div></div><div><Label>Sleeve Design</Label><div role="radiogroup" aria-label="Sleeve design" className="flex flex-wrap gap-2">{SLEEVE_OPTIONS.map(o => <Button key={o.value} variant={sleeveDesign === o.value ? "default" : "outline"} role="radio" aria-checked={sleeveDesign === o.value} onClick={() => setSleeveDesign(o.value)}><span aria-hidden>{o.icon}</span>{o.label}</Button>)}</div></div><Accordion type="single" collapsible><AccordionItem value="reference"><AccordionTrigger>Design inspiration · optional</AccordionTrigger><AccordionContent><DesignInspiration outfit={inspirationOutfit} selectedId={selectedReference?.id ?? null} onSelect={setReferenceId} /></AccordionContent></AccordionItem><AccordionItem value="model"><AccordionTrigger>Model & presentation</AccordionTrigger><AccordionContent><div className="flex gap-2">{MODELS.map(m => <Chip key={m} active={modelType === m} onClick={() => setModelType(m)}>{m === "Fashion model" ? m : "Mannequin only"}</Chip>)}</div></AccordionContent></AccordionItem></Accordion></TabsContent>
                <TabsContent value="blouse"><div className="mb-6"><Label>Blouse Design</Label><div role="radiogroup" aria-label="Blouse design" className="flex flex-wrap gap-2">{BLOUSE_OPTIONS.map(b => <Button key={b.value} variant={blouseDesign === b.value ? "default" : "outline"} role="radio" aria-checked={blouseDesign === b.value} onClick={() => setBlouseDesign(b.value)}>{b.label}</Button>)}</div></div>{choices}</TabsContent>
                <TabsContent value="back"><Accordion type="single" collapsible><AccordionItem value="gallery"><AccordionTrigger>Choose a blouse back · optional</AccordionTrigger><AccordionContent><BlouseBackGallery value={backDesign} onChange={setBackDesign} /></AccordionContent></AccordionItem></Accordion></TabsContent>
                <TabsContent value="dupatta">{choices}</TabsContent>
                <TabsContent value="colours">{choices}<div className="mt-6"><Label>Saree fabric matching</Label><div className="flex gap-2"><Button variant={matchBlouse ? "default" : "outline"} aria-pressed={matchBlouse} onClick={() => setMatchBlouse(v => !v)}>Matching Blouse</Button><Button variant={matchDupatta ? "default" : "outline"} aria-pressed={matchDupatta} onClick={() => setMatchDupatta(v => !v)}>Matching Dupatta</Button></div></div></TabsContent>
              </Tabs>
            </>}
            {step === 4 && <>
              <p className="studio-eyebrow">STEP 04 / READY TO CREATE</p><h2 className="mb-6 mt-2 text-3xl font-semibold">Your design, considered</h2>
              <div className="grid gap-6 sm:grid-cols-[150px_minmax(0,1fr)]">{preview && <div><img src={preview} alt="Your saree" className="aspect-[3/4] w-full rounded-lg object-cover" /><Button variant="ghost" onClick={() => moveTo(1)} className="mt-2 w-full">Edit saree</Button></div>}<div className="min-w-0"><div className="flex items-center justify-between border-b border-border pb-3"><h3 className="text-2xl">Design brief</h3><Button variant="ghost" onClick={() => moveTo(2)}>Edit outfit</Button></div><dl className="divide-y divide-border">{reviewRows.map(([name, val]) => <div key={name} className="grid grid-cols-[100px_minmax(0,1fr)] gap-3 py-3 text-sm"><dt className="text-muted-foreground">{name}</dt><dd className="text-right">{val}</dd></div>)}</dl></div></div>
              <div className="mt-6 border-t border-border pt-4"><div className="mb-4 flex items-center justify-between"><h3 className="text-2xl">Finishing details</h3><Button variant="ghost" onClick={() => moveTo(3)}>Edit details</Button></div><CustomizationSummary selections={{ ...customization, backDesign: backDesign.design, backDesignCustom: backDesign.custom }} /><dl className="mt-4 space-y-2 text-sm text-muted-foreground">{[["Back depth", backDesign.depth], ["Closure", backDesign.closure], ["Dori", backDesign.dori], ["Tassels", backDesign.tassels], ["Back border", backDesign.border], ["Instructions", backDesign.notes]].filter(([, v]) => v).map(([k, v]) => <div className="flex justify-between gap-4" key={k}><dt>{k}</dt><dd>{v}</dd></div>)}</dl></div><p className="mt-6 text-sm text-muted-foreground">Two matching views will be generated. This may take a little time.</p>
            </>}
            {error && <p role="alert" className="mt-4 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
            <footer className="mt-8 flex items-center justify-between gap-3 border-t border-border pt-5"><Button variant="ghost" disabled={step === 1} onClick={() => moveTo(step - 1)}><ArrowLeft />Back</Button><Button className="min-h-12 px-5" onClick={() => step === 4 ? create() : moveTo(step + 1)} disabled={!file}>{step === 1 ? "Continue to Style" : step === 2 ? "Customize Design" : step === 3 ? "Review Design" : "Generate Outfit"}{step === 4 ? <Sparkles /> : <ArrowRight />}</Button></footer>
          </section>
          <aside className="studio-summary hidden lg:block"><p className="studio-eyebrow">YOUR DESIGN</p>{preview ? <img src={preview} alt="Saree textile preview" className="my-5 aspect-[4/3] w-full rounded-lg object-cover" /> : <div className="my-5 grid aspect-[4/3] place-items-center rounded-lg bg-secondary"><OutfitIllustration outfit={inspirationOutfit} /></div>}<h3 className="text-2xl">{outfitDesign === "suggest" ? "AI stylist choice" : outfitDesign}</h3><p className="mb-5 mt-1 text-sm text-muted-foreground">{audience}{audience === "Kids" ? ` · ${age}` : ""}</p><CustomizationSummary selections={{ ...customization, backDesign: backDesign.design }} /><div className="mt-5 border-t border-border pt-4 text-xs text-muted-foreground">Estimated fabric <span className="float-right font-medium text-foreground">{estimateFabric(audience, age, outfitDesign).join("–")} m</span></div></aside>
        </div>
      </>}
      {phase === "loading" && <section className="mx-auto max-w-lg py-14 text-center"><div className="mx-auto grid size-16 place-items-center rounded-full bg-secondary text-primary"><Sparkles className="size-6 animate-pulse" /></div><h1 className="mt-6 text-4xl">Your design is taking shape</h1><p className="mt-3 text-sm text-muted-foreground">Creating matching front and back views from your saree.</p>{result ? <img src={result} alt="Outfit preview" className={`mt-8 max-h-[650px] w-full object-contain ${isFinal ? "" : "blur-sm"}`} /> : preview && <img src={preview} alt="Your saree" className="mx-auto mt-8 max-h-80 rounded-lg object-contain" />}</section>}
      {phase === "result" && result && <section><div className="mb-6"><p className="studio-eyebrow">YOUR RESHA DESIGN</p><h1 className="mt-2 text-4xl">{usedConfig?.outfit ?? "Your outfit"}</h1></div><div className="grid items-start gap-8 lg:grid-cols-[minmax(0,560px)_minmax(0,1fr)]"><OutfitCarousel views={views} errors={viewErrors} busy={busyView} onRetry={retry} onCurrentView={setCurrentView} /><div className="min-w-0"><p className="flex items-center gap-2 text-sm text-primary"><BookmarkCheck className="size-4" />Saved on this device</p><div className="mt-5 grid grid-cols-2 gap-3"><Button disabled={!views[currentView]} onClick={download}><Download />Download</Button><Button variant="outline" disabled={Boolean(busyView)} onClick={() => record && saveDesign(record)}><BookmarkCheck />Save</Button><Button variant="outline" disabled={Boolean(busyView)} onClick={create}><RotateCcw />Try Again</Button><Button variant="ghost" disabled={Boolean(busyView)} onClick={reset}><ImagePlus />Create New Outfit</Button></div>{error && <p role="alert" className="mt-4 text-sm text-destructive">{error}</p>}<Accordion className="mt-6" type="single" collapsible><AccordionItem value="details"><AccordionTrigger>Outfit details & fabric estimate</AccordionTrigger><AccordionContent><dl className="mb-5 space-y-3 text-sm">{usedConfig && Object.entries(usedConfig).filter(([, v]) => v).map(([k, v]) => <div key={k} className="grid grid-cols-[90px_minmax(0,1fr)] gap-4"><dt className="capitalize text-muted-foreground">{k}</dt><dd className="text-right">{v}</dd></div>)}<div className="flex justify-between"><dt>Fabric estimate</dt><dd>{record?.fabric.join("–")} m</dd></div></dl><CustomizationSummary selections={record?.selections} /></AccordionContent></AccordionItem></Accordion><Button asChild variant="link" className="mt-4"><Link to="/gallery">View all my designs<ArrowRight /></Link></Button></div></div></section>}
    </main>
  );
}
