import { beforeEach, describe, expect, it, vi } from "vitest";
import { generateViews, retryMissingView } from "@/lib/outfit-views";
import { ImageRequestError, streamImage } from "@/lib/stream-image";
import { loadDesigns, saveDesign, type SavedDesign } from "@/lib/local-gallery";

const design: SavedDesign = { id: "original", created_at: "2026-10-21", audience: "Kids", age: "5-7 years", style: "Flared", model_type: "Fashion model", outfit: "Lehenga", blouse: "match", sleeve: "short", matching: "blouse,dupatta", inspiration: "Original Design", fabric: [2.5, 3], image: "legacy.jpg" };

describe("cost-controlled outfit generation", () => {
  beforeEach(() => { vi.restoreAllMocks(); localStorage.clear(); });
  it("makes exactly two calls and uses the front as the back reference", async () => {
    const generate = vi.fn().mockResolvedValueOnce("front.png").mockResolvedValueOnce("back.png");
    const { views } = await generateViews(generate);
    expect(views).toEqual({ front: "front.png", back: "back.png" });
    expect(generate).toHaveBeenCalledTimes(2);
    expect(generate.mock.calls[1]?.slice(0, 2)).toEqual(["back", "front.png"]);
  });
  it("preserves a successful view on partial failure without regeneration", async () => {
    const generate = vi.fn().mockResolvedValueOnce("front.png").mockRejectedValueOnce(new Error("Back failed"));
    const result = await generateViews(generate);
    expect(result.views).toEqual({ front: "front.png" });
    expect(result.errors.back).toBe("Back failed");
    expect(generate).toHaveBeenCalledTimes(2);
  });
  it("can keep a successful back when the front has a transient failure", async () => {
    const generate = vi.fn().mockRejectedValueOnce(new ImageRequestError("Busy", 503)).mockResolvedValueOnce("back.png");
    expect((await generateViews(generate)).views).toEqual({ back: "back.png" });
    expect(generate).toHaveBeenCalledTimes(2);
  });
  it("retries only the missing view with one manual call", async () => {
    const generate = vi.fn().mockResolvedValue("back.png");
    expect(await retryMissingView({ front: "front.png" }, "back", generate)).toEqual({ front: "front.png", back: "back.png" });
    expect(generate).toHaveBeenCalledExactlyOnceWith("back", "front.png");
    await retryMissingView({ front: "front.png", back: "back.png" }, "back", generate);
    expect(generate).toHaveBeenCalledTimes(1);
  });
  it.each([400, 401, 402, 403, 404])("stops blocked chains at status %i", async status => {
    const generate = vi.fn().mockRejectedValue(new ImageRequestError("Blocked", status));
    await generateViews(generate);
    expect(generate).toHaveBeenCalledTimes(1);
  });
  it("keeps legacy records and updates both views under the same id", () => {
    saveDesign(design);
    expect(loadDesigns()[0]?.image).toBe("legacy.jpg");
    saveDesign({ ...design, front_image: "front.png", back_image: "back.png" });
    expect(loadDesigns()).toHaveLength(1);
    expect(loadDesigns()[0]).toMatchObject({ id: "original", front_image: "front.png", back_image: "back.png", fabric: [2.5, 3] });
  });
  it("never replays an empty stream", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("", { headers: { "Content-Type": "text/event-stream" } }));
    await expect(streamImage(new FormData(), vi.fn())).rejects.toThrow("without a finished view");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
  it("accepts split events and requires completion before success", async () => {
    const encoder = new TextEncoder();
    const body = new ReadableStream({ start(controller) {
      controller.enqueue(encoder.encode('event: image_edit.partial_image\ndata: {"b64_json":"preview"}\n\n'));
      controller.enqueue(encoder.encode('event: image_edit.completed\ndata: {"b64_'));
      controller.enqueue(encoder.encode('json":"final"}\n\n'));
      controller.close();
    }});
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(body, { headers: { "Content-Type": "text/event-stream" } }));
    const frame = vi.fn();
    await streamImage(new FormData(), frame);
    expect(frame.mock.calls).toEqual([["data:image/png;base64,preview", false], ["data:image/png;base64,final", true]]);
  });
});