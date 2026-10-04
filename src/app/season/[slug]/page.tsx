import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import SiteHeader from "@/components/SiteHeader";
import CadGrid from "@/components/CadGrid";
import { getEntries } from "@/lib/store";
import { seasonFromSlug, SEASON_SLUGS } from "@/lib/categories";
import { formatSeasonLabel } from "@/lib/constants";
import { buildMetadata } from "@/lib/seo";

export const dynamic = "force-dynamic";

async function matchesFor(season: string) {
  const entries = await getEntries();
  const matches = entries.filter((e) => e.kind !== "resource" && e.program === "FTC" && e.season === season);
  const otherSeasons = SEASON_SLUGS.filter(
    ({ value }) => value !== season && entries.some((e) => e.kind !== "resource" && e.program === "FTC" && e.season === value)
  );
  return { matches, otherSeasons };
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const season = seasonFromSlug(slug);
  if (!season) return {};

  const { matches } = await matchesFor(season);
  const label = formatSeasonLabel(season);
  const title = `${label} CAD Files | FTC CAD Base`;
  const description = `Browse ${matches.length} FTC CAD file${matches.length === 1 ? "" : "s"} from the ${label} season, including full robots, drivetrains, and mechanisms shared by real competition teams.`;
  return buildMetadata({ title, description, path: `/season/${slug}` });
}

export default async function SeasonPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const season = seasonFromSlug(slug);
  if (!season) notFound();

  const { matches, otherSeasons } = await matchesFor(season);
  const label = formatSeasonLabel(season);

  return (
    <main>
      <SiteHeader />
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <h1 className="text-2xl font-semibold tracking-tight text-text sm:text-3xl">{label} CAD Files</h1>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-text-muted">
          Browse {matches.length} CAD file{matches.length === 1 ? "" : "s"} from FTC teams during the {label} season, including full robots and
          individual mechanisms shared for the community to study and reuse.
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
          {otherSeasons.length > 0 && (
            <p className="mt-3">
              Other seasons:{" "}
              {otherSeasons.map(({ value, slug: otherSlug }, i) => (
                <span key={otherSlug}>
                  {i > 0 && ", "}
                  <Link href={`/season/${otherSlug}`} className="text-accent underline-offset-2 hover:underline">
                    {formatSeasonLabel(value)}
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
