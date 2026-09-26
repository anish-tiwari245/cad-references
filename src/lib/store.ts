// Server-only data layer. Redis (Upstash) is the source of truth for the
// library; data/cad-files.json is only the seed and the fallback if Redis is
// unreachable, so the public site never goes blank.
import { Redis } from "@upstash/redis";
import bundledEntries from "../../data/cad-files.json";
import type { CadEntry, PendingSubmission } from "./types";

const ENTRIES_KEY = "cad:entries"; // hash: id -> CadEntry
const ORDER_KEY = "cad:order"; // list of ids, display order (first = shown first)
const PENDING_KEY = "cad:pending"; // hash: id -> PendingSubmission
const thumbKey = (id: string) => `cad:thumb:${id}`; // fetched Onshape thumbnail, base64

let client: Redis | null | undefined;

export function getRedis(): Redis | null {
  if (client !== undefined) return client;
  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;
  client = url && token ? new Redis({ url, token }) : null;
  return client;
}

function requireRedis(): Redis {
  const redis = getRedis();
  if (!redis) throw new Error("Redis is not configured (KV_REST_API_URL / KV_REST_API_TOKEN).");
  return redis;
}

export async function getEntries(): Promise<CadEntry[]> {
  const redis = getRedis();
  if (redis) {
    try {
      const ids = await redis.lrange<string>(ORDER_KEY, 0, -1);
      if (ids.length > 0) {
        const byId = await redis.hmget<Record<string, CadEntry>>(ENTRIES_KEY, ...ids);
        if (byId) return ids.map((id) => byId[id]).filter((e): e is CadEntry => Boolean(e));
      }
    } catch (err) {
      console.error("[store] Redis read failed, falling back to bundled data:", err);
    }
  }
  return bundledEntries as CadEntry[];
}

export async function getPending(): Promise<PendingSubmission[]> {
  const redis = requireRedis();
  const all = await redis.hgetall<Record<string, PendingSubmission>>(PENDING_KEY);
  return Object.values(all ?? {}).sort((a, b) => b.submittedAt.localeCompare(a.submittedAt));
}

export async function addPending(input: Omit<PendingSubmission, "id" | "submittedAt">): Promise<PendingSubmission> {
  const redis = requireRedis();
  const submission: PendingSubmission = {
    ...input,
    id: `sub-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    submittedAt: new Date().toISOString(),
  };
  await redis.hset(PENDING_KEY, { [submission.id]: submission });
  return submission;
}

export async function getPendingById(id: string): Promise<PendingSubmission | null> {
  return (await requireRedis().hget<PendingSubmission>(PENDING_KEY, id)) ?? null;
}

export async function declinePending(id: string): Promise<boolean> {
  const redis = requireRedis();
  const removed = (await redis.hdel(PENDING_KEY, id)) > 0;
  await redis.del(thumbKey(id));
  return removed;
}

// Publishes a pending submission as a library entry (new entries go first)
// and removes it from the pending queue in one atomic transaction.
export async function approvePending(pendingId: string, entry: CadEntry): Promise<void> {
  const tx = requireRedis().multi();
  tx.hset(ENTRIES_KEY, { [entry.id]: entry });
  tx.lpush(ORDER_KEY, entry.id);
  tx.hdel(PENDING_KEY, pendingId);
  await tx.exec();
}

// Publishes an entry the admin created directly (no submission involved).
export async function addEntry(entry: CadEntry): Promise<void> {
  const tx = requireRedis().multi();
  tx.hset(ENTRIES_KEY, { [entry.id]: entry });
  tx.lpush(ORDER_KEY, entry.id);
  await tx.exec();
}

export async function entryExists(id: string): Promise<boolean> {
  return (await requireRedis().hexists(ENTRIES_KEY, id)) === 1;
}

export async function deleteEntry(id: string): Promise<boolean> {
  const tx = requireRedis().multi();
  tx.hdel(ENTRIES_KEY, id);
  tx.lrem(ORDER_KEY, 0, id);
  tx.del(thumbKey(id));
  const [removed] = await tx.exec<[number, number, number]>();
  return removed > 0;
}

export interface StoredThumbnail {
  contentType: string;
  data: string; // base64
  v: number; // version, used to bust the browser cache when re-fetched
}

// ttlSeconds is for images fetched before anything owns them (an admin filling
// in the "add a file" form); they expire if the form is abandoned.
export async function saveThumbnail(
  id: string,
  thumb: Omit<StoredThumbnail, "v">,
  ttlSeconds?: number
): Promise<StoredThumbnail> {
  const stored: StoredThumbnail = { ...thumb, v: Date.now() };
  const redis = requireRedis();
  if (ttlSeconds) await redis.set(thumbKey(id), stored, { ex: ttlSeconds });
  else await redis.set(thumbKey(id), stored);
  return stored;
}

export async function persistThumbnail(id: string): Promise<void> {
  await requireRedis().persist(thumbKey(id));
}

export async function getThumbnail(id: string): Promise<StoredThumbnail | null> {
  return (await requireRedis().get<StoredThumbnail>(thumbKey(id))) ?? null;
}

export async function deleteThumbnail(id: string): Promise<void> {
  await requireRedis().del(thumbKey(id));
}

export const thumbnailPath = (id: string, v: number) => `/api/thumb/${id}?v=${v}`;

// Fixed-window counter, used to throttle the public submit endpoint and
// admin login attempts. Fails open if Redis is down so the site keeps working.
export async function hitRateLimit(key: string, limit: number, windowSeconds: number): Promise<boolean> {
  const redis = getRedis();
  if (!redis) return false;
  try {
    const rateKey = `cad:rate:${key}`;
    const count = await redis.incr(rateKey);
    if (count === 1) await redis.expire(rateKey, windowSeconds);
    return count > limit;
  } catch {
    return false;
  }
}

export const STORE_KEYS = { ENTRIES_KEY, ORDER_KEY, PENDING_KEY };
