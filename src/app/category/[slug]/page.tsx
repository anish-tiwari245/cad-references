import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import SiteHeader from "@/components/SiteHeader";
import CadGrid from "@/components/CadGrid";
import { getEntries } from "@/lib/store";
import { mechanismTagFromSlug, MECHANISM_SLUGS } from "@/lib/categories";
import { buildMetadata } from "@/lib/seo";

export const dynamic = "force-dynamic";

async function matchesFor(tag: string) {
  const entries = await getEntries();
  const matches = entries.filter((e) => e.kind !== "resource" && e.tags.includes(tag));
  const otherTags = MECHANISM_SLUGS.filter(
    ({ value }) => value !== tag && entries.some((e) => e.kind !== "resource" && e.tags.includes(value))
  );
  return { matches, otherTags };
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const tag = mechanismTagFromSlug(slug);
  if (!tag) return {};

  const { matches } = await matchesFor(tag);
  const title = `${tag} CAD Files | FTC CAD Base`;
  const description = `Browse ${matches.length} FTC and FRC ${tag} CAD file${matches.length === 1 ? "" : "s"} shared by real competition teams, linking to the original Onshape, Fusion 360, GrabCAD, or Google Drive source.`;
  return buildMetadata({ title, description, path: `/category/${slug}` });
}

export default async function CategoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const tag = mechanismTagFromSlug(slug);
  if (!tag) notFound();

  const { matches, otherTags } = await matchesFor(tag);

  return (
    <main>
      <SiteHeader />
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <h1 className="text-2xl font-semibold tracking-tight text-text sm:text-3xl">{tag} CAD Files</h1>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-text-muted">
          Browse {matches.length} {tag} CAD file{matches.length === 1 ? "" : "s"} shared by FTC and FRC teams. Each entry links directly to the
          original Onshape, Fusion 360, GrabCAD, or Google Drive file, so you can study or reuse real competition designs.
        </p>

        <p className="mt-4 font-mono text-sm text-text-muted">
          {matches.length} CAD file{matches.length === 1 ? "" : "s"}
        </p>
        <div className="mt-4">
          <CadGrid entries={matches} />
        </div>

        <div className="mt-10 border-t border-border pt-6 text-sm text-text-muted">
          <Link href="/" className="font-medium text-accent underline-offset-2 hover:underline">
            Browse the full CAD library and filters
          </Link>
          {otherTags.length > 0 && (
            <p className="mt-3">
              Other mechanisms:{" "}
              {otherTags.map(({ value, slug: otherSlug }, i) => (
                <span key={otherSlug}>
                  {i > 0 && ", "}
                  <Link href={`/category/${otherSlug}`} className="text-accent underline-offset-2 hover:underline">
                    {value}
                  </Link>
                </span>
              ))}
            </p>
          )}
        </div>
      </div>
    </main>
  );
}
