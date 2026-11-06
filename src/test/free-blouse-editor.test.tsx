import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
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
const editMocks = vi.hoisted(() => ({ generate: vi.fn() }));
vi.mock("@/lib/outfit-edit", () => ({ generateEditedViews: editMocks.generate }));

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

beforeEach(() => {
  localStorage.clear();
  editMocks.generate.mockReset();
  editMocks.generate.mockResolvedValue({ views: { front: "edited-front.png", back: "edited-back.png" }, errors: {} });
});
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

  it("applies sketch changes to photos as a new version without overwriting the original", async () => {
    saveDesign(design);
    const onVersionSaved = vi.fn();
    const { rerender } = render(<OutfitCarousel views={{ front: design.front_image, back: design.back_image }} editableDesign={design} onVersionSaved={onVersionSaved} />);
    fireEvent.click(screen.getByRole("button", { name: "Edit Design" }));
    fireEvent.click(screen.getByRole("button", { name: /^Sleeves/ }));
    fireEvent.click(screen.getByRole("radio", { name: "Sleeveless" }));
    fireEvent.click(screen.getByRole("button", { name: "Apply to photos" }));
    await waitFor(() => expect(onVersionSaved).toHaveBeenCalledTimes(1));
    expect(editMocks.generate).toHaveBeenCalledTimes(1);
    expect(editMocks.generate.mock.calls[0]?.[0]).toEqual(design);
    expect(editMocks.generate.mock.calls[0]?.[1]).toEqual({ sleeve: "sleeveless" });
    expect(editMocks.generate.mock.calls[0]?.[2]).toBe("blouse");
    const saved = onVersionSaved.mock.calls[0]?.[0] as SavedDesign;
    expect(saved.versions).toHaveLength(2);
    expect(saved.active_version_id).toBe(saved.versions?.[1]?.id);
    expect(saved.front_image).toBe("edited-front.png");
    expect(saved.back_image).toBe("edited-back.png");
    const stored = loadDesigns()[0];
    expect(stored.versions).toHaveLength(2);
    expect(stored.versions?.[0]).toMatchObject({ id: "original", front_image: "front.png", back_image: "back.png" });
    // Parent reflects the saved version: the compare strip appears and restore switches back.
    rerender(<OutfitCarousel views={{ front: saved.front_image, back: saved.back_image }} editableDesign={saved} onVersionSaved={onVersionSaved} />);
    const strip = screen.getByRole("radiogroup", { name: "Design versions" });
    expect(within(strip).getByRole("radio", { name: "Original" })).toHaveAttribute("aria-checked", "false");
    expect(within(strip).getByRole("radio", { name: "Version 1" })).toHaveAttribute("aria-checked", "true");
    fireEvent.click(within(strip).getByRole("radio", { name: "Original" }));
    const restored = onVersionSaved.mock.calls[1]?.[0] as SavedDesign;
    expect(restored.active_version_id).toBe("original");
    expect(restored.front_image).toBe("front.png");
    expect(restored.versions).toHaveLength(2);
  });

  it("makes no photo request when nothing changed or the edit fails", async () => {
    render(<FreeBlouseEditor design={design} onCancel={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "Apply to photos" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Change something in the sketch first");
    expect(editMocks.generate).not.toHaveBeenCalled();
    editMocks.generate.mockResolvedValue({ views: {}, errors: { front: "Unavailable", back: "Unavailable" } });
    fireEvent.click(screen.getByRole("radio", { name: "Square" }));
    fireEvent.click(screen.getByRole("button", { name: "Apply to photos" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Unavailable");
    expect(editMocks.generate).toHaveBeenCalledTimes(1);
    expect(loadDesigns()).toEqual([]);
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