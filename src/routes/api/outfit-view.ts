import { createFileRoute } from "@tanstack/react-router";
import { outfitViewResponse } from "@/lib/image-gateway.server";

export const Route = createFileRoute("/api/outfit-view")({
  server: { handlers: { POST: ({ request }) => outfitViewResponse(request) } },
});