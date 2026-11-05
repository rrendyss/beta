// Publisher Redis — kontrak dengan hub platform: channel `mocci:events`,
// payload JSON { overlayId, event: NormalizedEvent }.
import Redis from "ioredis";

const globalForRedis = globalThis as unknown as { redisPub?: Redis };

export const redisPub =
  globalForRedis.redisPub ?? new Redis(process.env.REDIS_URL ?? "redis://localhost:6379");

redisPub.on("error", (err) => console.warn("[connector] redis:", err.message));

if (process.env.NODE_ENV !== "production") globalForRedis.redisPub = redisPub;

export function publishEvent(overlayId: string, event: unknown): Promise<number> {
  return redisPub.publish("mocci:events", JSON.stringify({ overlayId, event }));
}
