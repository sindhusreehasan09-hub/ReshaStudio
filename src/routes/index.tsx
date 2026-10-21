import { createFileRoute, Link } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { saveDesign, toThumbnail, type SavedDesign } from "@/lib/local-gallery";
import { DEFAULT_SLEEVE, SLEEVE_OPTIONS, type OutfitType, type SleeveDesign, type RequestSelections } from "@/lib/outfit-prompt";
import { createViewGenerator, generateViews, retryMissingView, type OutfitViews, type OutfitView, type ViewErrors } from "@/lib/outfit-views";
import { OutfitCarousel } from "@/components/outfit-carousel";
import { Button } from "@/components/ui/button";
import { DesignInspiration } from "@/components/design-inspiration";
import { findDesignReference } from "@/lib/design-references";

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
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 rounded-full border px-3 py-2 text-sm font-medium transition-all ${
        active
          ? "border-primary bg-primary text-primary-foreground shadow-soft"
          : "border-border bg-card text-secondary-foreground hover:border-accent"
      }`}
    >
      {children}
    </button>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <p className="mb-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">{children}</p>;
}

function Index() {
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
    if (!file) return;
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
      const selections: RequestSelections = { audience, age, style, outfit: resolvedOutfit, modelType, blouse: resolvedBlouse, sleeve: sleeveDesign, matchingBlouse: resolvedMatchBlouse, matchingDupatta: resolvedMatchDupatta, referenceId: selectedReference?.id ?? null };
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

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col px-5 pb-6 pt-5">
      <header className="text-center">
        <h1 className="text-4xl font-semibold leading-none text-primary">
          Resha <span className="text-gold">Studio</span>
        </h1>
        <p className="mt-1.5 text-sm text-muted-foreground">One saree. Endless possibilities.</p>
        <div className="divider-gold mx-auto mt-3 w-40" />
        <Link to="/gallery" className="mt-2 inline-block text-xs font-medium text-muted-foreground underline underline-offset-4">
          My Lehengas →
        </Link>
      </header>

      {phase === "loading" && (
        <section className="flex flex-1 flex-col items-center justify-center text-center">
          <div className="relative h-32 w-32">
            <div className="animate-spin-slow absolute inset-0 rounded-full border-2 border-dashed border-gold" />
            <div className="absolute inset-3 overflow-hidden rounded-full border-4 border-card shadow-soft">
              {preview && <img src={preview} alt="" className="h-full w-full object-cover" />}
            </div>
          </div>
          <h2 className="mt-8 text-3xl font-semibold text-primary">Creating your outfit views...</h2>
          <p className="mt-2 text-sm text-muted-foreground">Preserving your saree's original design</p>
          {result && <img src={result} alt="Outfit preview" className={`mt-5 aspect-[2/3] w-full object-contain transition-[filter] ${isFinal ? "blur-0" : "blur-2xl"}`} />}
        </section>
      )}

      {phase === "result" && result && (
        <section className="mt-4 flex flex-1 flex-col">
          <OutfitCarousel views={views} errors={viewErrors} busy={busyView} onRetry={retry} onCurrentView={setCurrentView} />
          {error && <p role="alert" className="mt-2 text-sm text-destructive">{error}</p>}
          <p className="mt-3 text-center font-display text-xl text-primary">
            {views.front && views.back ? "Your outfit, front and back." : "Your outfit view is ready."}
          </p>
          {isFinal && (
            <p className="mt-1.5 text-center text-sm text-muted-foreground">
              Estimated Saree Required:{" "}
              <span className="font-semibold text-primary">
                {estimateFabric(audience, age, outfitDesign)[0]}–{estimateFabric(audience, age, outfitDesign)[1]} metres
              </span>
            </p>
          )}
          {isFinal && usedConfig && (
            <dl className="mt-3 rounded-2xl border border-border bg-card px-4 py-3 text-xs text-muted-foreground shadow-soft">
              <div className="flex justify-between py-0.5"><dt>Outfit</dt><dd className="font-medium text-foreground">{usedConfig.outfit}</dd></div>
              {usedConfig.age && <div className="flex justify-between py-0.5"><dt>Age</dt><dd className="font-medium text-foreground">{usedConfig.age}</dd></div>}
              <div className="flex justify-between py-0.5"><dt>Blouse</dt><dd className="font-medium text-foreground">{usedConfig.blouse}</dd></div>
              <div className="flex justify-between py-0.5"><dt>Sleeves</dt><dd className="font-medium text-foreground">{usedConfig.sleeve}</dd></div>
              <div className="flex justify-between py-0.5"><dt>Matching</dt><dd className="font-medium text-foreground">{usedConfig.matching}</dd></div>
              <div className="flex justify-between gap-3 py-0.5"><dt>Inspiration</dt><dd className="text-right font-medium text-foreground">{usedConfig.inspiration}</dd></div>
            </dl>
          )}
          {isFinal && (
            <div className="mt-4 grid grid-cols-2 gap-2">
              <Button variant="outline" disabled={Boolean(busyView)} onClick={create} className="h-auto rounded-full border border-primary px-4 py-3 text-sm font-medium text-primary">
                ↻ Try Again
              </Button>
              <Button disabled={!views[currentView]} onClick={download} className="bg-maroon h-auto rounded-full px-4 py-3 text-sm font-medium text-primary-foreground shadow-soft">
                ⬇ Download
              </Button>
              <Button variant="ghost" disabled={Boolean(busyView)} onClick={reset} className="col-span-2 py-2 text-sm font-medium text-muted-foreground underline underline-offset-4">
                Create Another
              </Button>
            </div>
          )}
        </section>
      )}

      {phase === "form" && (
        <section className="mt-4 flex flex-1 flex-col gap-4">
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/jpg,image/png,image/webp"
            className="hidden"
            onChange={(e) => {
              onPick(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
          {preview ? (
            <div className="relative overflow-hidden rounded-3xl border border-border bg-card shadow-soft">
              <img src={preview} alt="Your saree" className="h-56 w-full object-cover" />
              <button
                onClick={() => inputRef.current?.click()}
                className="absolute bottom-3 right-3 rounded-full bg-card/90 px-3 py-1.5 text-xs font-medium text-primary shadow-soft backdrop-blur"
              >
                Change photo
              </button>
            </div>
          ) : (
            <button
              onClick={() => inputRef.current?.click()}
              className="flex h-48 flex-col items-center justify-center rounded-3xl border-2 border-dashed border-accent bg-card text-center shadow-soft transition-colors hover:bg-secondary"
            >
              <span className="bg-maroon mb-3 flex h-12 w-12 items-center justify-center rounded-full text-xl text-primary-foreground">＋</span>
              <span className="font-display text-2xl font-semibold text-primary">Upload Saree Photo</span>
              <span className="mt-1 text-xs text-muted-foreground">Take a photo or choose from gallery</span>
            </button>
          )}
          {warning && <p className="-mt-2 text-center text-xs text-accent-foreground">⚠ {warning}</p>}
          {error && <p className="-mt-2 rounded-2xl bg-destructive/10 px-3 py-2 text-center text-sm text-destructive">{error}</p>}

          <div>
            <Label>For</Label>
            <div className="flex gap-2">
              {(["Kids", "Women"] as const).map((a) => (
                <Chip key={a} active={audience === a} onClick={() => setAudience(a)}>{a}</Chip>
              ))}
            </div>
          </div>

          {audience === "Kids" && (
            <div>
              <Label>Age</Label>
              <select
                value={age}
                onChange={(e) => setAge(e.target.value)}
                className="w-full rounded-full border border-border bg-card px-4 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              >
                {AGES.map((a) => <option key={a}>{a}</option>)}
              </select>
            </div>
          )}

          <div>
            <Label>Lehenga Style</Label>
            <div className="flex gap-2">
              {STYLES.map((s) => (
                <Chip key={s} active={style === s} onClick={() => setStyle(s)}>{s}</Chip>
              ))}
            </div>
          </div>

          <div>
            <Label>Outfit Design</Label>
            <div
              role="radiogroup"
              aria-label="Outfit design"
              className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1"
            >
              {OUTFITS.map((o) => (
                <button
                  key={o}
                  type="button"
                  role="radio"
                  aria-checked={outfitDesign === o}
                  onClick={() => { setOutfitDesign(o); setReferenceId(null); }}
                  className={`shrink-0 rounded-full border px-3 py-2 text-sm font-medium transition-all ${
                    outfitDesign === o
                      ? "border-primary bg-primary text-primary-foreground shadow-soft"
                      : "border-border bg-card text-secondary-foreground hover:border-accent"
                  }`}
                >
                  {o === "suggest" ? "✨ Suggest for me" : o}
                </button>
              ))}
            </div>
          </div>

          <div>
            <DesignInspiration outfit={inspirationOutfit} selectedId={selectedReference?.id ?? null} onSelect={setReferenceId} />
          </div>

          <div>
            <Label>Matching</Label>
            <div className="flex gap-2">
              <button
                type="button"
                aria-pressed={matchBlouse}
                onClick={() => setMatchBlouse((v) => !v)}
                className={`flex-1 rounded-full border px-3 py-2 text-sm font-medium transition-all ${
                  matchBlouse
                    ? "border-primary bg-primary text-primary-foreground shadow-soft"
                    : "border-border bg-card text-secondary-foreground hover:border-accent"
                }`}
              >
                Matching Blouse
              </button>
              <button
                type="button"
                aria-pressed={matchDupatta}
                onClick={() => setMatchDupatta((v) => !v)}
                className={`flex-1 rounded-full border px-3 py-2 text-sm font-medium transition-all ${
                  matchDupatta
                    ? "border-primary bg-primary text-primary-foreground shadow-soft"
                    : "border-border bg-card text-secondary-foreground hover:border-accent"
                }`}
              >
                Matching Dupatta
              </button>
            </div>
          </div>



          <div>
            <Label>Sleeve Design</Label>
            <div role="radiogroup" aria-label="Sleeve design" className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1">
              {SLEEVE_OPTIONS.map((o) => (
                <button
                  key={o.value}
                  type="button"
                  role="radio"
                  aria-checked={sleeveDesign === o.value}
                  aria-label={o.label}
                  onClick={() => setSleeveDesign(o.value)}
                  className={`flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-2 text-sm font-medium transition-all ${
                    sleeveDesign === o.value
                      ? "border-primary bg-primary text-primary-foreground shadow-soft"
                      : "border-border bg-card text-secondary-foreground hover:border-accent"
                  }`}
                >
                  <span aria-hidden className="text-base leading-none">{o.icon}</span>
                  {o.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <Label>Blouse Design</Label>
            <div
              role="radiogroup"
              aria-label="Blouse design"
              className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1"
            >
              {BLOUSE_OPTIONS.map((b) => (
                <button
                  key={b.value}
                  type="button"
                  role="radio"
                  aria-checked={blouseDesign === b.value}
                  onClick={() => setBlouseDesign(b.value)}
                  className={`shrink-0 rounded-full border px-3 py-2 text-sm font-medium transition-all ${
                    blouseDesign === b.value
                      ? "border-primary bg-primary text-primary-foreground shadow-soft"
                      : "border-border bg-card text-secondary-foreground hover:border-accent"
                  }`}
                >
                  {b.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <Label>Model</Label>
            <div className="flex gap-2">
              {MODELS.map((m) => (
                <Chip key={m} active={modelType === m} onClick={() => setModelType(m)}>
                  {m === "Fashion model" ? "Fashion model" : "Mannequin only"}
                </Chip>
              ))}
            </div>
          </div>

          <button
            onClick={create}
            disabled={!file}
            className="bg-maroon mt-auto rounded-full py-4 font-display text-xl font-semibold text-primary-foreground shadow-soft transition-opacity disabled:opacity-40"
          >
            ✨ Create Lehenga
          </button>
        </section>
      )}
    </main>
  );
}
