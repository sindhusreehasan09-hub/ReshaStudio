import { createParser } from "eventsource-parser";

export class ImageRequestError extends Error {
  constructor(message: string, public status = 0) { super(message); }
}

// Deliberately no replay: even an empty stream must not incur another image charge.
export async function streamImage(form: FormData, onFrame: (src: string, final: boolean) => void) {
  const response = await fetch("/api/outfit-view", { method: "POST", body: form });
  if (!response.ok) {
    const text = await response.text();
    let message = text;
    try { const data = JSON.parse(text); message = data.error?.message ?? data.message ?? text; } catch { /* plain safe error */ }
    throw new ImageRequestError(message || `Image generation failed (${response.status})`, response.status);
  }
  if (!response.body) throw new ImageRequestError("Image generation returned no image.");
  if (!response.headers.get("Content-Type")?.includes("text/event-stream")) {
    const data = await response.json();
    if (data.error) throw new ImageRequestError(data.error.message, data.error.status ?? 0);
    const image = data.data?.[0]?.b64_json;
    if (!image) throw new ImageRequestError("Image generation returned no image.");
    onFrame(`data:image/png;base64,${image}`, true);
    return;
  }
  let completed = false;
  let failure: ImageRequestError | undefined;
  const parser = createParser({ onEvent(event) {
    let data;
    try { data = JSON.parse(event.data); } catch { return; }
    const type = data.type ?? event.event;
    if (type === "error" || event.event === "error") {
      failure = new ImageRequestError(data.error?.message ?? "Image generation was blocked.", data.error?.status ?? data.status ?? 0);
      return;
    }
    if (failure || !["image_edit.partial_image", "image_generation.partial_image", "image_edit.completed", "image_generation.completed"].includes(type)) return;
    if (!data.b64_json) { failure = new ImageRequestError("Image event contained no image."); return; }
    const final = type.endsWith(".completed");
    onFrame(`data:image/png;base64,${data.b64_json}`, final);
    completed ||= final;
  }});
  const reader = response.body.pipeThrough(new TextDecoderStream()).getReader();
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      parser.feed(value);
    }
  } finally { reader.releaseLock(); }
  if (failure) throw failure;
  if (!completed) throw new ImageRequestError("Image stream ended without a finished view. No automatic retry was made.");
}