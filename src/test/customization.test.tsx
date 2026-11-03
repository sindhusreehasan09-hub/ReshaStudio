import { beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { useState } from "react";
import { BlouseDupattaCustomization, DEFAULT_CUSTOMIZATION } from "@/components/blouse-dupatta-customization";
import { BlouseBackGallery, DEFAULT_BACK_DESIGN } from "@/components/blouse-back-gallery";
import { BACK_DESIGNS, COORDINATION_PRESETS, PRESET_APPLIES, buildPrompt, buildRequestForm, parsePromptInput, type RequestSelections } from "@/lib/outfit-prompt";
import { loadDesigns, saveDesign, type SavedDesign } from "@/lib/local-gallery";
import { createViewGenerator, generateViews } from "@/lib/outfit-views";

const base: RequestSelections = { audience: "Women", age: "", style: "Flared", outfit: "Lehenga", modelType: "Fashion model", blouse: "embroidered", sleeve: "elbow", matchingBlouse: true, matchingDupatta: true };
const source = new File(["photo"], "saree.jpg", { type: "image/jpeg" });
const parse = (choices: Partial<RequestSelections> = {}) => parsePromptInput(buildRequestForm(source, { ...base, ...choices }));
function Controls() { const [value, setValue] = useState(DEFAULT_CUSTOMIZATION); return <BlouseDupattaCustomization value={value} onChange={setValue} />; }
function BackControls() { const [value, setValue] = useState(DEFAULT_BACK_DESIGN); return <BlouseBackGallery value={value} onChange={setValue} />; }
beforeEach(() => { cleanup(); localStorage.clear(); vi.restoreAllMocks(); });

describe("independent customization", () => {
  it("keeps blouse and dupatta colours independent", () => {
    render(<Controls />);
    fireEvent.click(within(screen.getByRole("group", { name: "Blouse" })).getByRole("radio", { name: "Black" }));
    fireEvent.click(screen.getByRole("radio", { name: /^Silk$/ }));
    fireEvent.click(within(screen.getByRole("group", { name: "Dupatta Design" })).getByRole("radio", { name: "Gold" }));
    expect(within(screen.getByRole("group", { name: "Blouse" })).getByRole("radio", { name: "Black" })).toHaveAttribute("aria-checked", "true");
    expect(parse({ blouseColour: "black", dupattaColour: "gold", dupattaFabric: "silk" })).toMatchObject({ blouseColour: "black", dupattaColour: "gold" });
  });
  it.each([
    ["matching", "match", "match-saree"], ["blouse-contrast", "contrast", "match-saree"],
    ["dupatta-contrast", "match", "contrast-saree"], ["double-contrast", "contrast", "contrast-blouse"],
    ["coordinated", "contrast", "contrast-blouse"], ["festive-gold", "contrast", "gold"],
    ["custom", undefined, undefined], ["stylist", undefined, undefined],
  ] as const)("applies %s without changing unrelated sleeves", (preset, blouseColour, dupattaColour) => {
    expect(PRESET_APPLIES[preset].blouseColour).toBe(blouseColour);
    expect(PRESET_APPLIES[preset].dupattaColour).toBe(dupattaColour);
    expect(parse({ ...PRESET_APPLIES[preset], coordination: preset }).sleeve).toBe("elbow");
  });
  it("lets later edits override a preset and retains custom input", () => {
    render(<Controls />);
    const blouse = within(screen.getByRole("group", { name: "Blouse" }));
    fireEvent.click(blouse.getByRole("radio", { name: "Custom Colour" }));
    fireEvent.change(screen.getByRole("textbox", { name: "Colour name or code" }), { target: { value: "#008080" } });
    fireEvent.click(screen.getByRole("radio", { name: /^Matching Set:/ }));
    fireEvent.click(blouse.getByRole("radio", { name: "Custom Colour" }));
    expect(screen.getByRole("textbox", { name: "Colour name or code" })).toHaveValue("#008080");
    expect(blouse.getByRole("radio", { name: "Custom Colour" })).toHaveAttribute("aria-checked", "true");
  });
  it("round trips custom fabrics, exact contrast colour and design", () => {
    const p = parse({ blouseFabric: "custom", blouseFabricCustom: "Matka silk", blouseColour: "contrast", blouseColourCustom: "#008080", dupattaFabric: "custom", dupattaFabricCustom: "Cotton voile", dupattaColour: "custom", dupattaColourCustom: "Rose pink", dupattaDesign: "custom", dupattaDesignCustom: "Pearl edging" });
    expect(p).toMatchObject({ blouseFabricCustom: "Matka silk", blouseColourCustom: "#008080", dupattaFabricCustom: "Cotton voile", dupattaColourCustom: "Rose pink" });
    const prompt = buildPrompt(p);
    for (const text of ["Matka silk", "#008080", "Cotton voile", "Rose pink", "Pearl edging"]) expect(prompt).toContain(text);
  });
  it("omits dupatta despite retained hidden choices and preset", () => {
    const p = parse({ dupattaFabric: "none", dupattaColour: "gold", dupattaDesign: "mirror", dupattaDraping: "bridal", coordination: "stylist" });
    expect(p.dupattaColour).toBeNull();
    expect(buildPrompt(p)).toContain("Do NOT include a dupatta or any draped stole.");
    expect(buildPrompt(p)).not.toContain("Dupatta draping:");
    render(<Controls />);
    fireEvent.click(screen.getByRole("radio", { name: "No Dupatta" }));
    expect(screen.queryByRole("radiogroup", { name: "Dupatta colour" })).toBeNull();
  });
  it("rejects unknown new catalog values and keeps old free-text", () => {
    const form = buildRequestForm(source, base); form.set("dupatta_fabric", "unknown");
    expect(() => parsePromptInput(form)).toThrow("Unsupported dupatta_fabric");
    form.delete("dupatta_fabric"); form.set("blouse_colour", "teal");
    expect(parsePromptInput(form)).toMatchObject({ blouseColour: "custom", blouseColourCustom: "teal" });
  });
});

describe("back construction and compatibility", () => {
  it.each(BACK_DESIGNS)("uses $value construction", option => {
    expect(buildPrompt(parse({ backDesign: option.value, backDesignCustom: "Pearl keyhole" }))).toContain(option.value === "custom" ? "Pearl keyhole" : option.prompt);
  });
  it("shows only relevant controls and allows changing the primary design", () => {
    render(<BackControls />);
    fireEvent.click(screen.getByRole("radio", { name: /^Deep U-Back with Dori:/ }));
    expect(screen.getByRole("radiogroup", { name: "Dori Style" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("radio", { name: /^High-Neck Closed Back:/ }));
    expect(screen.queryByRole("radiogroup", { name: "Dori Style" })).toBeNull();
    expect(screen.queryByRole("radiogroup", { name: "Tassels" })).toBeNull();
    expect(screen.getByRole("radio", { name: /^Deep U-Back with Dori:/ })).toHaveAttribute("aria-checked", "false");
  });
  it("uses exact details and explicit none controls", () => {
    const p = buildPrompt(parse({ backDesign: "deep-u-dori", backDepth: "medium", backDori: "double", backTassels: "latkans", backBorder: "zari", blouseFabric: "velvet", blouseColour: "maroon" }));
    for (const text of ["Back depth: Medium", "Dori style: Double", "Decorative Latkans", "Back border/embellishment: Zari", "rich velvet", "Maroon", "Position hair away", "never mirror"]) expect(p).toContain(text);
    const none = buildPrompt(parse({ backDesign: "single-dori-tassels", backDori: "none", backTassels: "none", blouseEmbellishment: "plain" }));
    expect(none).toContain("Do NOT add dori strings."); expect(none).toContain("Do NOT add tassels or latkans."); expect(none).toContain("plain and minimal, no heavy embellishment");
  });
  it("saves and restores all selections alongside legacy records", () => {
    const legacy: SavedDesign = { id: "old", created_at: "2026-10-23", audience: "Women", age: null, style: "Classic", model_type: "Fashion model", outfit: "Lehenga", blouse: "match", sleeve: "short", matching: "blouse", inspiration: "Original", fabric: [5.5, 7], image: "old.jpg" };
    const selections: RequestSelections = { ...base, blouseFabric: "velvet", blouseColour: "black", dupattaFabric: "none", backDesign: "buttoned", backClosure: "buttons" };
    saveDesign(legacy); saveDesign({ ...legacy, id: "new", selections, front_image: "front.jpg", back_image: "back.jpg" });
    expect(loadDesigns()[0]?.selections).toEqual(selections);
    expect(loadDesigns()[1]).toEqual(legacy);
  });
  it("sends the same customization in exactly two generation calls", async () => {
    const choices = { ...base, blouseFabric: "velvet" as const, blouseColour: "maroon" as const, dupattaFabric: "organza" as const, backDesign: "deep-u-dori" };
    const forms: FormData[] = [];
    vi.spyOn(globalThis, "fetch").mockImplementation(async (url, init) => {
      if (typeof url === "string" && url.startsWith("data:")) return new Response(new Blob(["front"], { type: "image/png" }));
      forms.push(init?.body as FormData);
      return new Response('event: image_edit.completed\ndata: {"b64_json":"aW1hZ2U="}\n\n', { headers: { "Content-Type": "text/event-stream" } });
    });
    const result = await generateViews(createViewGenerator(source, choices));
    expect(result.views.front).toBeTruthy(); expect(result.views.back).toBeTruthy(); expect(forms).toHaveLength(2);
    expect(forms.map(f => f.get("view"))).toEqual(["front", "back"]);
    for (const form of forms) expect(parsePromptInput(form)).toMatchObject({ blouseFabric: "velvet", blouseColour: "maroon", dupattaFabric: "organza", backDesign: "deep-u-dori" });
    expect(forms[1]?.get("counterpart")).toBeInstanceOf(File);
  });
});
describe("designer sleeve references", () => {
  it.each([["scalloped-cap", "scallop-cut"], ["draped-cowl", "cowl folds"], ["tassel-cuff", "tassels"]] as const)("sends %s construction in the prompt", (sleeve, text) => {
    expect(buildPrompt(parse({ sleeve }))).toContain(text);
  });
});
