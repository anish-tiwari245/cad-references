import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { GoogleAnalytics } from "@next/third-parties/google";
import { SITE_URL } from "@/lib/site";
import { SITE_TITLE, buildMetadata } from "@/lib/seo";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

// Root fallback only: every real page (home, category, season, admin) sets
// its own metadata, since Next's metadata merging replaces openGraph/twitter
// wholesale rather than merging fields (see src/lib/seo.ts).
export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  ...buildMetadata({
    title: SITE_TITLE,
    description: "A searchable library of FTC/FRC CAD files shared by FIRST teams.",
    path: "/",
  }),
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem("theme");if(t==="light"||t==="dark")document.documentElement.setAttribute("data-theme",t)}catch(e){}})()`,
          }}
        />
      </head>
      <body className="min-h-screen font-sans antialiased">{children}</body>
      <GoogleAnalytics gaId="G-1NDQRNMY3S" />
    </html>
  );
}
