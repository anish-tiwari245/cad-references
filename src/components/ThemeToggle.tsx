"use client";

import { useLayoutEffect } from "react";

function resolvedTheme(): "light" | "dark" {
  const stored = localStorage.getItem("theme");
  if (stored === "light" || stored === "dark") return stored;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export default function ThemeToggle() {
  // Dev-only: React's Strict Mode remount clears attributes the inline
  // script set on <html> that aren't declared in JSX. Re-apply here; no-op
  // in production. See Next's "preventing flash before hydration" guide.
  useLayoutEffect(() => {
    const stored = localStorage.getItem("theme");
    if (stored === "light" || stored === "dark") {
      document.documentElement.setAttribute("data-theme", stored);
    }
  }, []);

  function toggle() {
    const next = resolvedTheme() === "dark" ? "light" : "dark";
    localStorage.setItem("theme", next);
    document.documentElement.setAttribute("data-theme", next);
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label="Toggle dark mode"
      className="theme-toggle inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-sm border border-border-strong bg-surface text-text-muted hover:border-accent hover:text-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
    >
      <svg className="icon-sun h-4 w-4" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
        <circle cx="10" cy="10" r="3.5" />
        <path d="M10 1.5v2M10 16.5v2M3.6 3.6l1.4 1.4M15 15l1.4 1.4M1.5 10h2M16.5 10h2M3.6 16.4l1.4-1.4M15 5l1.4-1.4" />
      </svg>
      <svg className="icon-moon h-4 w-4" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 11.3A7 7 0 1 1 8.7 3a5.6 5.6 0 0 0 8.3 8.3z" />
      </svg>
      <span className="sr-only">Toggle dark mode</span>
    </button>
  );
}
