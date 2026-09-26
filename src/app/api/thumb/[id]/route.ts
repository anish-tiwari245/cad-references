import { getThumbnail } from "@/lib/store";

// Public: serves thumbnails we fetched from Onshape and stored in Redis.
// The ?v= query in the URL changes whenever the image is replaced, so it is
// safe to cache aggressively.
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[A-Za-z0-9_-]{1,80}$/.test(id)) return new Response("Not found", { status: 404 });

  let thumb;
  try {
    thumb = await getThumbnail(id);
  } catch {
    return new Response("Unavailable", { status: 503 });
  }
  if (!thumb) return new Response("Not found", { status: 404 });

  return new Response(Buffer.from(thumb.data, "base64"), {
    headers: {
      "Content-Type": thumb.contentType,
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
