import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { OutfitCarousel } from "@/components/outfit-carousel";
import { FreeBlouseEditor } from "@/components/free-blouse-editor";
import { blouseDraftFromDesign } from "@/lib/blouse-preview";
import { saveDesign, loadDesigns, type SavedDesign } from "@/lib/local-gallery";
import { BACK_DESIGNS, type RequestSelections } from "@/lib/outfit-prompt";

vi.mock("@/components/ui/carousel", () => ({
  Carousel: ({ children }: any) => <div>{children}</div>,
  CarouselContent: ({ children }: any) => <div>{children}</div>,
  CarouselItem: ({ children }: any) => <div>{children}</div>,
  CarouselNext: () => null, CarouselPrevious: () => null,
}));

const selections: RequestSelections = {
  audience: "Women", age: "", style: "Flared", outfit: "Lehenga", modelType: "Fashion model",
  blouse: "embroidered", sleeve: "elbow", matchingBlouse: true, matchingDupatta: true,
  blouseFabric: "velvet", blouseColour: "black", blouseEmbellishment: "plain",
  backDesign: "deep-u-dori", backNotes: "Pearl details",
};
const design: SavedDesign = {
  id: "free-editor", created_at: "2026-11-04T00:00:00Z", audience: "Women", age: null,
  style: "Flared", model_type: "Fashion model", outfit: "Lehenga", blouse: "Embroidered",
  sleeve: "Elbow-Length", matching: "Blouse", inspiration: "Original", fabric: [5.5, 7],
  image: "front.png", front_image: "front.png", back_image: "back.png", selections,
};

beforeEach(() => localStorage.clear());
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe("free blouse editor", () => {
  it("restores saved sleeves, fabric, colour and back choices", () => {
    render(<FreeBlouseEditor design={design} onCancel={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: /^Sleeves/ }));
    expect(screen.getByRole("radio", { name: "Elbow-Length" })).toHaveAttribute("aria-checked", "true");
    fireEvent.click(screen.getByRole("button", { name: "Fabric, colour & embroidery" }));
    expect(screen.getByRole("radio", { name: "Velvet" })).toHaveAttribute("aria-checked", "true");
    expect(screen.getByRole("radio", { name: "Black" })).toHaveAttribute("aria-checked", "true");
    fireEvent.click(screen.getByRole("button", { name: "Back design & finishing" }));
    expect(screen.getByRole("radio", { name: /^Deep U-Back with Dori:/ })).toHaveAttribute("aria-checked", "true");
    expect(screen.getByLabelText("Additional back design instructions")).toHaveValue("Pearl details");
    expect(within(screen.getByRole("radiogroup", { name: "Blouse back design" })).getAllByRole("radio")).toHaveLength(BACK_DESIGNS.length);
  });

  it("changes and resets an isolated draft with zero requests or saved-design writes", () => {
    saveDesign(design);
    const original = localStorage.getItem("resha-designs");
    const fetchSpy = vi.fn(); vi.stubGlobal("fetch", fetchSpy);
    const writeSpy = vi.spyOn(Storage.prototype, "setItem");
    const retry = vi.fn();
    render(<OutfitCarousel views={{ front: design.front_image, back: design.back_image }} editableDesign={design} onRetry={retry} />);
    fireEvent.click(screen.getByRole("button", { name: "Edit Design" }));
    fireEvent.click(screen.getByRole("radio", { name: "Square" }));
    expect(screen.getByRole("radio", { name: "Square" })).toHaveAttribute("aria-checked", "true");
    fireEvent.click(screen.getByRole("radio", { name: "dupatta" }));
    fireEvent.click(screen.getByRole("radio", { name: "blouse" }));
    expect(screen.getByRole("radio", { name: "Square" })).toHaveAttribute("aria-checked", "true");
    fireEvent.click(screen.getByRole("button", { name: "Reset blouse preview" }));
    expect(screen.getByRole("radio", { name: "Round" })).toHaveAttribute("aria-checked", "true");
    fireEvent.click(screen.getByRole("button", { name: /^Sleeves/ }));
    fireEvent.click(screen.getByRole("radio", { name: "Sleeveless" }));
    expect(screen.getByRole("radio", { name: "Sleeveless" })).toHaveAttribute("aria-checked", "true");
    fireEvent.click(screen.getByRole("button", { name: "Cancel preview" }));
    fireEvent.click(screen.getByRole("button", { name: "Edit Design" }));
    fireEvent.click(screen.getByRole("button", { name: /^Sleeves/ }));
    expect(screen.getByRole("radio", { name: "Elbow-Length" })).toHaveAttribute("aria-checked", "true");
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(retry).not.toHaveBeenCalled();
    expect(writeSpy).not.toHaveBeenCalled();
    expect(localStorage.getItem("resha-designs")).toBe(original);
    expect(loadDesigns()[0]).toEqual(design);
  });

  it("supports legacy single-image designs without saved selections", () => {
    const legacy: SavedDesign = { ...design, id: "legacy" };
    delete legacy.selections;
    delete legacy.front_image;
    delete legacy.back_image;
    expect(blouseDraftFromDesign(legacy)).toMatchObject({ sleeve: "elbow", neckline: "round" });
    render(<OutfitCarousel views={{}} legacyImage={legacy.image} editableDesign={legacy} />);
    fireEvent.click(screen.getByRole("button", { name: "Edit Design" }));
    fireEvent.click(screen.getByRole("radio", { name: "V" }));
    expect(screen.getByRole("radio", { name: "V" })).toHaveAttribute("aria-checked", "true");
  });
});