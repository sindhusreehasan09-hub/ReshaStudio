import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { loadDesigns, type SavedDesign } from "@/lib/local-gallery";

export const Route = createFileRoute("/gallery")({
  head: () => ({
    meta: [
      { title: "My Lehengas — Resha Studio" },
      { name: "description", content: "Browse all your saved lehenga designs created from your sarees." },
      { property: "og:title", content: "My Lehengas — Resha Studio" },
      { property: "og:description", content: "Browse all your saved lehenga designs created from your sarees." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Gallery,
});

type Generation = SavedDesign;

function MetaChip({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full border border-border bg-secondary px-2.5 py-1 text-[11px] font-medium text-secondary-foreground">
      {children}
    </span>
  );
}

function Gallery() {
  const [items, setItems] = useState<Generation[] | null>(null);
  const error: string | null = null;
  useEffect(() => setItems(loadDesigns()), []);

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col px-5 pb-8 pt-5">
      <header className="text-center">
        <Link to="/" className="text-xs font-medium text-muted-foreground underline underline-offset-4">
          ← Back to create
        </Link>
        <h1 className="mt-2 text-4xl font-semibold leading-none text-primary">My Lehengas</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">Designs saved on this device</p>
        <div className="divider-gold mx-auto mt-3 w-40" />
      </header>

      {error && <p className="mt-6 rounded-2xl bg-destructive/10 px-3 py-2 text-center text-sm text-destructive">{error}</p>}

      {!error && items === null && (
        <p className="mt-16 text-center text-sm text-muted-foreground">Loading your lehengas...</p>
      )}

      {items && items.length === 0 && (
        <section className="mt-10 flex flex-col items-center text-center">
          <p className="font-display text-2xl font-semibold text-primary">No lehengas yet</p>
          <p className="mt-1 text-sm text-muted-foreground">Create your first one from a saree photo.</p>
          <Link
            to="/"
            className="bg-maroon mt-5 rounded-full px-6 py-3 text-sm font-semibold text-primary-foreground shadow-soft"
          >
            ✨ Create Lehenga
          </Link>
        </section>
      )}

      {items && items.length > 0 && (
        <section className="mt-5 grid grid-cols-2 gap-3">
          {items.map((g) => (
            <article key={g.id} className="overflow-hidden rounded-3xl border border-border bg-card shadow-soft">
              {g.image ? (
                <img src={g.image} alt={`${g.style} lehenga for ${g.audience}`} className="aspect-[2/3] w-full object-cover" loading="lazy" />
              ) : (
                <div className="aspect-[2/3] w-full animate-pulse bg-secondary" />
              )}
              <div className="flex flex-wrap gap-1 p-2.5">
                <MetaChip>{g.audience}{g.age ? ` · ${g.age.replace(" years", "y")}` : ""}</MetaChip>
                <MetaChip>{g.style}</MetaChip>
                <MetaChip>{g.model_type === "Fashion model" ? "Model" : "Mannequin"}</MetaChip>
                <MetaChip>{g.outfit}</MetaChip>
                <MetaChip>{g.fabric[0]}–{g.fabric[1]} m</MetaChip>
              </div>
            </article>
          ))}
        </section>
      )}
    </main>
  );
}
