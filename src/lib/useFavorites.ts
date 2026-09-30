"use client";

import { useSyncExternalStore } from "react";
import { subscribe, getSnapshot, getServerSnapshot, toggleFavorite } from "./favorites";

export function useFavorites() {
  const favorites = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  return { favorites, isFavorite: (id: string) => favorites.has(id), toggleFavorite };
}
