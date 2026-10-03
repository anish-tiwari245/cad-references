// Single source of truth for the deployed origin, used by layout metadata,
// sitemap.ts and robots.ts. NEXT_PUBLIC_SITE_URL overrides this (e.g. for a
// staging deploy); otherwise production resolves to the real custom domain
// rather than Vercel's auto-injected VERCEL_PROJECT_PRODUCTION_URL, which
// points at the old default *.vercel.app project URL, not cadbaseftc.com.
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? (process.env.NODE_ENV === "production" ? "https://www.cadbaseftc.com" : "http://localhost:3000");
