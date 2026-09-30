"use client";

import { useFavorites } from "@/lib/useFavorites";

export default function FavoriteButton({ id, className = "" }: { id: string; className?: string }) {
  const { isFavorite, toggleFavorite } = useFavorites();
  const active = isFavorite(id);

  return (
    <button
      type="button"
      aria-pressed={active}
      aria-label={active ? "Remove from favorites" : "Add to favorites"}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        toggleFavorite(id);
      }}
      className={
        "inline-flex items-center justify-center rounded-full p-1.5 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent " +
        (active ? "text-accent" : "text-text-muted hover:text-accent") +
        ` ${className}`
      }
    >
      <svg width="18" height="18" viewBox="0 0 20 20" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round">
        <path d="M10 2.5 12.3 7.4 17.6 8 13.8 11.7 14.9 17 10 14.6 5.1 17 6.2 11.7 2.4 8 7.7 7.4Z" />
      </svg>
    </button>
  );
}
