"use client";

import { registerView } from "@/lib/views";

export default function ViewCadButton({ id, url, className = "" }: { id: string; url: string; className?: string }) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      onClick={() => registerView(id)}
      className={className}
    >
      View CAD
    </a>
  );
}
