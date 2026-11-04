import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { Gallery } from "@/routes/gallery";
import { loadDesigns, saveDesign, type SavedDesign } from "@/lib/local-gallery";

const generation = vi.hoisted(() => ({ create: vi.fn(), retry: vi.fn() }));
vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => (options: unknown) => options,
  Link: ({ children, to }: { children: React.ReactNode; to: string }) => <a href={to}>{children}</a>,
}));
vi.mock("@/lib/outfit-views", () => ({ createViewGenerator: generation.create, retryMissingView: generation.retry }));
vi.mock("@/components/ui/carousel", () => ({
  Carousel: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CarouselContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CarouselItem: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CarouselNext: () => null, CarouselPrevious: () => null,
}));

const design: SavedDesign = {
  id: "gallery-editor", created_at: "2026-11-04T00:00:00Z", audience: "Women", age: null,
  style: "Flared", model_type: "Fashion model", outfit: "Lehenga", blouse: "Embroidered",
  sleeve: "Elbow-Length", matching: "Blouse", inspiration: "Original", fabric: [5.5, 7],
  image: "front.png", front_image: "front.png", back_image: "back.png", source_image: "saree.png",
  selections: {
    audience: "Women", age: "", style: "Flared", outfit: "Lehenga", modelType: "Fashion model",
    blouse: "embroidered", sleeve: "elbow", matchingBlouse: true, matchingDupatta: true,
    blouseFabric: "velvet", blouseColour: "black", backDesign: "deep-u-dori", backNotes: "Pearl details",
  },
};

beforeEach(() => { localStorage.clear(); vi.clearAllMocks(); });
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe("saved outfit blouse editing", () => {
  it("opens a saved outfit directly in the editor with its original choices", async () => {
    saveDesign(design);
    render(<Gallery />);
    fireEvent.click(await screen.findByRole("button", { name: "Edit Design" }));
    fireEvent.click(screen.getByRole("button", { name: /^Sleeves/ }));
    expect(screen.getByRole("radio", { name: "Elbow-Length" })).toHaveAttribute("aria-checked", "true");
    fireEvent.click(screen.getByRole("button", { name: "Fabric, colour & embroidery" }));
    expect(screen.getByRole("radio", { name: "Velvet" })).toHaveAttribute("aria-checked", "true");
    expect(screen.getByRole("radio", { name: "Black" })).toHaveAttribute("aria-checked", "true");
    fireEvent.click(screen.getByRole("button", { name: "Back design & finishing" }));
    expect(screen.getByLabelText("Additional back design instructions")).toHaveValue("Pearl details");
  });

  it("discards gallery draft changes without generation requests or saved-design writes", async () => {
    saveDesign(design);
    const original = localStorage.getItem("resha-designs");
    const writes = vi.spyOn(Storage.prototype, "setItem");
    const requests = vi.fn(); vi.stubGlobal("fetch", requests);
    render(<Gallery />);
    fireEvent.click(await screen.findByRole("button", { name: "Edit Design" }));
    fireEvent.click(screen.getByRole("radio", { name: "Square" }));
    expect(screen.getByRole("radio", { name: "Square" })).toHaveAttribute("aria-checked", "true");
    fireEvent.click(screen.getByRole("button", { name: "Cancel preview" }));
    fireEvent.click(screen.getByRole("button", { name: "All designs" }));
    fireEvent.click(screen.getByRole("button", { name: "View Design" }));
    fireEvent.click(screen.getByRole("button", { name: "Edit Design" }));
    expect(screen.getByRole("radio", { name: "Round" })).toHaveAttribute("aria-checked", "true");
    expect(requests).not.toHaveBeenCalled();
    expect(generation.create).not.toHaveBeenCalled();
    expect(generation.retry).not.toHaveBeenCalled();
    expect(writes).not.toHaveBeenCalled();
    expect(localStorage.getItem("resha-designs")).toBe(original);
    expect(loadDesigns()).toEqual([design]);
  });

  it("lets older single-image outfits open the editor with their saved sleeve default", async () => {
    const legacy = { ...design, id: "legacy" };
    delete legacy.selections; delete legacy.front_image; delete legacy.back_image; delete legacy.source_image;
    saveDesign(legacy);
    render(<Gallery />);
    fireEvent.click(await screen.findByRole("button", { name: "Open Lehenga design" }));
    fireEvent.click(screen.getByRole("button", { name: "Edit Design" }));
    fireEvent.click(screen.getByRole("button", { name: /^Sleeves/ }));
    expect(screen.getByRole("radio", { name: "Elbow-Length" })).toHaveAttribute("aria-checked", "true");
    expect(loadDesigns()).toEqual([legacy]);
  });
});