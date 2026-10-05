import Link from "next/link";
import ThemeToggle from "./ThemeToggle";
import SubmitCadButton from "./SubmitCadButton";

// Shared top banner + header, identical on every page. titleAs picks whether
// the "FTC CAD Base" brand name is the page's <h1> (home) or a plain heading
// (category/season pages, which have their own topic-specific <h1> below) —
// a page should only ever have one <h1> for SEO. Same markup either way.
export default function SiteHeader({ titleAs = "div" }: { titleAs?: "h1" | "div" }) {
  const TitleTag = titleAs;
  return (
    <>
      <div className="border-b border-border bg-bg">
        <div className="mx-auto flex max-w-7xl items-center gap-2.5 px-4 py-2 text-sm text-text-muted sm:px-6 lg:px-8">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/stratos-logo.png" alt="31071 Stratos logo" width={32} height={32} className="h-8 w-8 rounded-md" />
          <span>
            Built by <span className="font-medium text-text">31071 Stratos</span>
          </span>
        </div>
      </div>
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-6 sm:px-6 md:flex-row md:items-end md:justify-between lg:px-8">
          <div className="flex items-center gap-3">
            <TitleTag className="text-3xl font-semibold tracking-tight text-text">
              <Link
                href="/"
                className="rounded-sm transition-opacity hover:opacity-80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              >
                FTC CAD Base
              </Link>
            </TitleTag>
            <ThemeToggle />
          </div>
          <SubmitCadButton />
        </div>
      </header>
    </>
  );
}
