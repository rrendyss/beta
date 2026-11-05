import { Redis } from "ioredis";

const globalForRedis = globalThis as unknown as { redisPub?: Redis };

/** Koneksi Redis publisher (singleton) untuk publish event & scene update. */
export const redisPub =
  globalForRedis.redisPub ??
  new Redis(process.env.REDIS_URL ?? "redis://localhost:6379");

// Cegah unhandled error event mematikan proses saat Redis bermasalah.
redisPub.on("error", (err) => console.warn("[redis] publisher:", err.message));

if (process.env.NODE_ENV !== "production") globalForRedis.redisPub = redisPub;
