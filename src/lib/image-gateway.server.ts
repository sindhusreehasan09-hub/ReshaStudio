import { buildPrompt, parsePromptInput, ValidationError } from "./outfit-prompt";
import { buildEditPrompt } from "./outfit-edit-prompt";

export async function outfitViewResponse(request: Request) {
  const origin = request.headers.get("Origin");
  if (origin && origin !== new URL(request.url).origin) return Response.json({ message: "This request must come from Resha Studio." }, { status: 403 });
  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) return Response.json({ message: "Image generation is not configured." }, { status: 401 });
  try {
    const input = await request.formData();
    const source = input.get("image");
    const counterpart = input.get("counterpart");
    const originalCounterpart = input.get("original_counterpart");
    const view = input.get("view");
    const validImage = (image: FormDataEntryValue | null): image is File => image instanceof File && image.size > 0 && image.size <= 8_000_000 && ["image/jpeg", "image/png", "image/webp"].includes(image.type);
    if (!validImage(source) || !["front", "back"].includes(String(view)) || (counterpart && !validImage(counterpart)) || (originalCounterpart && !validImage(originalCounterpart))) throw new ValidationError("Please upload a valid saree photo and choose a view.");
    const selections = parsePromptInput(input);
    const editPrompt = input.get("mode") === "edit" ? buildEditPrompt(input, selections) : null;
    // Privileged access is limited to app-owned service block state, not user data.
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: block, error: guardError } = await supabaseAdmin.from("ai_generation_access_guard").select("status,message,updated_at").eq("id", "image-generation").maybeSingle();
    if (guardError) return Response.json({ message: "Image generation availability could not be checked. Please try later." }, { status: 503 });
    // A "not enough credits" block is temporary: credits refill or get topped up,
    // so it expires after a short window instead of blocking forever.
    const CREDIT_BLOCK_MS = 30 * 60 * 1000;
    const expired = block?.status === 402 && Date.now() - new Date(block.updated_at).getTime() > CREDIT_BLOCK_MS;
    if (block && !expired) return Response.json({ message: block.message }, { status: block.status });
    const form = new FormData();
    form.append("image[]", source);
    if (editPrompt && originalCounterpart instanceof File) form.append("image[]", originalCounterpart);
    if (counterpart instanceof File) form.append("image[]", counterpart);
    // Curated references currently have no photo URLs; their construction details
    // are included in buildPrompt without another image or analysis request.
    const prompt = editPrompt ?? [
      buildPrompt(selections),
      counterpart ? "IMAGE 2 — MATCHING OUTFIT: the already generated opposite view. Keep this EXACT garment and model/dress form, fabric, colours, motif placement, embellishments, silhouette, styling and lighting. Change only camera/model orientation to the requested view." : "Create a coherent garment with physically plausible front AND back construction.",
      view === "front" ? "OUTPUT: FRONT VIEW ONLY. Model faces directly toward the camera, entire body and garment from head to feet visible, hem and shoes uncropped." : "OUTPUT: ACTUAL BACK VIEW ONLY. Model faces away from the camera, entire body and garment from head to feet visible. Show the garment's actual rear construction: blouse back neckline, age-appropriate back coverage, dori/tie details if appropriate to the selected design, closures/hooks, seams and selected embroidery. Keep the back unobstructed by hair or dupatta. Never mirror the front or show a front neckline on the back.",
      "Preserve the uploaded saree textile, border, colours, patterns and motifs in this view. No collage, no second outfit, no text."
    ].join("\n");
    form.set("prompt", prompt);
    form.set("model", "openai/gpt-image-2.5-sunburst");
    form.set("stream", "true");
    form.set("partial_images", "1");
    form.set("size", "1024x1536");
    form.set("quality", "medium");
    form.set("n", "1");
    const upstream = await fetch("https://ai.gateway.lovable.dev/v1/images/edits", { method: "POST", headers: { Authorization: `Bearer ${apiKey}` }, body: form });
    if (upstream.status === 402 || upstream.status === 403) {
      const text = await upstream.clone().text();
      let message = text;
      try { const data = JSON.parse(text); message = data.message ?? data.error?.message ?? text; } catch { /* plain error */ }
      await supabaseAdmin.from("ai_generation_access_guard").upsert({ id: "image-generation", status: upstream.status, message });
    }
    return new Response(upstream.body, { status: upstream.status, headers: { "Content-Type": upstream.headers.get("Content-Type") ?? "application/json", "Cache-Control": "no-cache, no-transform" } });
  } catch (error) {
    if (error instanceof ValidationError) return Response.json({ message: error.message }, { status: 400 });
    return Response.json({ message: "Image generation could not connect. No automatic retry was made." }, { status: 503 });
  }
}