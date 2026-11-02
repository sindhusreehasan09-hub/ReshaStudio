import { fireEvent, render, screen, waitFor, cleanup } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Index } from "@/routes/index";

const mocks = vi.hoisted(() => ({ generator: vi.fn(), generate: vi.fn(), save: vi.fn() }));
vi.mock("@tanstack/react-router", () => ({ createFileRoute: () => (options: unknown) => options, Link: ({ children, to, ...props }: any) => <a href={to} {...props}>{children}</a> }));
vi.mock("@/lib/outfit-views", () => ({ createViewGenerator: mocks.generator, generateViews: mocks.generate, retryMissingView: vi.fn() }));
vi.mock("@/lib/local-gallery", () => ({ saveDesign: mocks.save, toThumbnail: async () => "data:image/png;base64,AA==" }));
vi.mock("@/components/outfit-carousel", () => ({ OutfitCarousel: () => <div aria-label="Outfit views">Front View / Back View</div> }));

async function upload() {
  fireEvent.change(screen.getByLabelText("Saree photo"), { target: { files: [new File(["photo"], "saree.png", { type: "image/png" })] } });
  await waitFor(() => expect(screen.getByRole("button", { name: "Continue to Style" })).toBeEnabled());
}
async function customize() {
  await upload();
  fireEvent.click(screen.getByRole("button", { name: "Continue to Style" }));
  fireEvent.click(screen.getByRole("radio", { name: "Gown" }));
  fireEvent.click(screen.getByRole("button", { name: "Customize Design" }));
}

describe("Guided studio", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("createImageBitmap", vi.fn().mockResolvedValue({ width: 600, height: 600, close: vi.fn() }));
    URL.createObjectURL = vi.fn(() => "blob:saree");
    URL.revokeObjectURL = vi.fn();
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({ drawImage: vi.fn(), getImageData: () => ({ data: new Uint8ClampedArray(16) }) } as any);
    mocks.generator.mockReturnValue(vi.fn());
    mocks.save.mockReturnValue(true);
    mocks.generate.mockResolvedValue({ views: { front: "data:image/png;base64,AA==", back: "data:image/png;base64,AA==" }, errors: {} });
  });
  afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

  it("requires a supported photo before advancing and makes no generation request", async () => {
    render(<Index />);
    expect(screen.getByRole("button", { name: "Continue to Style" })).toBeDisabled();
    fireEvent.change(screen.getByLabelText("Saree photo"), { target: { files: [new File(["bad"], "photo.pdf", { type: "application/pdf" })] } });
    expect(await screen.findByRole("alert")).toHaveTextContent("JPG, PNG or WEBP");
    expect(mocks.generator).not.toHaveBeenCalled();
  });

  it("retains outfit and independent colours across steps and submits the complete configuration once", async () => {
    render(<Index />); await customize();
    fireEvent.click(screen.getByRole("button", { name: /2 Blouse design/ }));
    fireEvent.click(screen.getByRole("button", { name: "Fabric, colour & embellishments" }));
    fireEvent.click(screen.getByRole("radio", { name: "Black" }));
    fireEvent.click(screen.getByRole("button", { name: /4 Dupatta design/ }));
    fireEvent.click(screen.getByRole("button", { name: "Fabric, colour, design & draping" }));
    fireEvent.click(screen.getByRole("radio", { name: "Organza" }));
    fireEvent.click(screen.getByRole("radio", { name: "Gold" }));
    fireEvent.click(screen.getByRole("button", { name: "Review My Design" }));
    fireEvent.click(screen.getByRole("button", { name: "Edit outfit" }));
    expect(screen.getByRole("radio", { name: "Gown" })).toHaveAttribute("aria-checked", "true");
    fireEvent.click(screen.getByRole("button", { name: "Customize Design" }));
    fireEvent.click(screen.getByRole("button", { name: /2 Blouse design/ }));
    fireEvent.click(screen.getByRole("button", { name: "Fabric, colour & embellishments" }));
    expect(screen.getByRole("radio", { name: "Black" })).toHaveAttribute("aria-checked", "true");
    fireEvent.click(screen.getByRole("button", { name: "Review My Design" }));
    const button = screen.getByRole("button", { name: "Generate Outfit" });
    fireEvent.click(button); fireEvent.click(button);
    await waitFor(() => expect(mocks.generator).toHaveBeenCalledTimes(1));
    expect(mocks.generator.mock.calls[0]?.[1]).toMatchObject({ outfit: "Gown", audience: "Kids", age: "5-7 years", style: "Flared", blouseColour: "black", dupattaFabric: "organza", dupattaColour: "gold", matchingBlouse: true, matchingDupatta: true });
    await waitFor(() => expect(mocks.save).toHaveBeenCalledTimes(1));
    expect(mocks.generate).toHaveBeenCalledTimes(1);
    expect(screen.getByLabelText("Outfit views")).toBeInTheDocument();
  });

  it("returns generation errors to review without losing configuration or retrying", async () => {
    mocks.generate.mockResolvedValue({ views: {}, errors: { front: "Unavailable" } });
    render(<Index />); await customize();
    fireEvent.click(screen.getByRole("button", { name: "Review My Design" }));
    fireEvent.click(screen.getByRole("button", { name: "Generate Outfit" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Unavailable");
    expect(mocks.generate).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("button", { name: "Generate Outfit" })).toBeEnabled();
  });

  it("shows a free sketch preview on review without any generation request", async () => {
    render(<Index />); await customize();
    fireEvent.click(screen.getByRole("button", { name: "Review My Design" }));
    expect(screen.getByText(/FREE PREVIEW/)).toBeInTheDocument();
    expect(screen.getByText(/only when you choose Generate Outfit/)).toBeInTheDocument();
    expect(mocks.generator).not.toHaveBeenCalled();
    expect(mocks.generate).not.toHaveBeenCalled();
  });

  it("removes the photo and blocks further steps without a generation request", async () => {
    render(<Index />); await upload();
    fireEvent.click(screen.getByRole("button", { name: "Remove" }));
    expect(screen.getByRole("button", { name: "Continue to Style" })).toBeDisabled();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:saree");
    expect(mocks.generator).not.toHaveBeenCalled();
  });

  it("opens one section at a time and retains back instructions through collapse and backward navigation", async () => {
    render(<Index />); await customize();
    const outfit = screen.getByRole("button", { name: /1 Outfit & sleeves/ });
    const back = screen.getByRole("button", { name: /3 Blouse back design/ });
    expect(outfit).toHaveAttribute("aria-expanded", "true");
    fireEvent.click(back);
    expect(outfit).toHaveAttribute("aria-expanded", "false");
    expect(back).toHaveAttribute("aria-expanded", "true");
    fireEvent.click(screen.getByRole("radio", { name: /^Deep U-Back with Dori:/ }));
    fireEvent.change(screen.getByLabelText("Additional back design instructions"), { target: { value: "Pearl details" } });
    fireEvent.click(back);
    expect(back).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(back);
    expect(screen.getByLabelText("Additional back design instructions")).toHaveValue("Pearl details");
    fireEvent.click(screen.getByRole("button", { name: /^Back$/ }));
    fireEvent.click(screen.getByRole("button", { name: "Customize Design" }));
    expect(screen.getByLabelText("Additional back design instructions")).toHaveValue("Pearl details");
    expect(mocks.generator).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Review My Design" }));
    fireEvent.click(screen.getByRole("button", { name: "Generate Outfit" }));
    await waitFor(() => expect(mocks.generator).toHaveBeenCalledTimes(1));
    expect(mocks.generator.mock.calls[0]?.[1]).toMatchObject({ backDesign: "deep-u-dori", backNotes: "Pearl details" });
  });

  it("applies stylist guidance without resetting independent fabric and colour choices or making a request", async () => {
    render(<Index />); await customize();
    fireEvent.click(screen.getByRole("button", { name: /2 Blouse design/ }));
    fireEvent.click(screen.getByRole("button", { name: "Fabric, colour & embellishments" }));
    fireEvent.click(screen.getByRole("radio", { name: "Velvet" }));
    fireEvent.click(screen.getByRole("radio", { name: "Black" }));
    fireEvent.click(screen.getByRole("button", { name: "Use AI Stylist Choice" }));
    expect(screen.getByRole("radio", { name: "Black" })).toHaveAttribute("aria-checked", "true");
    expect(mocks.generator).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Review My Design" }));
    fireEvent.click(screen.getByRole("button", { name: "Generate Outfit" }));
    await waitFor(() => expect(mocks.generator).toHaveBeenCalledTimes(1));
    expect(mocks.generator.mock.calls[0]?.[1]).toMatchObject({ blouse: "suggest", blouseFabric: "velvet", blouseColour: "black", coordination: "stylist" });
  });

  it("submits the resolved stylist choices while preserving independent customization", async () => {
    render(<Index />); await upload();
    fireEvent.click(screen.getByRole("button", { name: "Continue to Style" }));
    fireEvent.click(screen.getByRole("button", { name: "Women" }));
    fireEvent.click(screen.getByRole("radio", { name: "AI Stylist Choice" }));
    fireEvent.click(screen.getByRole("button", { name: "Customize Design" }));
    fireEvent.click(screen.getByRole("button", { name: /2 Blouse design/ }));
    fireEvent.click(screen.getByRole("button", { name: "Fabric, colour & embellishments" }));
    fireEvent.click(screen.getByRole("radio", { name: "Black" }));
    fireEvent.click(screen.getByRole("button", { name: "Review My Design" }));
    fireEvent.click(screen.getByRole("button", { name: "Generate Outfit" }));
    await waitFor(() => expect(mocks.generator).toHaveBeenCalledTimes(1));
    expect(mocks.generator.mock.calls[0]?.[1]).toMatchObject({ outfit: "Anarkali", blouse: "embroidered", matchingBlouse: true, matchingDupatta: true, blouseColour: "black" });
  });
});