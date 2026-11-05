// Akses DB connector via pg + SQL mentah — tabel dimiliki migrasi platform.
import { Pool } from "pg";

const globalForPg = globalThis as unknown as { pgPool?: Pool };

export const pool =
  globalForPg.pgPool ??
  new Pool({ connectionString: process.env.DATABASE_URL ?? "postgresql://rrendys@localhost:5432/mocci" });

if (process.env.NODE_ENV !== "production") globalForPg.pgPool = pool;

export interface ConnectionRow {
  id: string;
  userId: string;
  platform: string;
  username: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

/** Ambil overlay (id + userId) — untuk otorisasi koneksi. */
export async function findOverlay(
  overlayId: string,
): Promise<{ id: string; userId: string } | null> {
  const res = await pool.query<{ id: string; userId: string }>(
    `SELECT id, "userId" FROM "Overlay" WHERE id = $1`,
    [overlayId],
  );
  return res.rows[0] ?? null;
}

export async function listConnections(): Promise<ConnectionRow[]> {
  const res = await pool.query<ConnectionRow>(
    `SELECT id, "userId", platform, username, status, "createdAt", "updatedAt"
     FROM "Connection" ORDER BY "updatedAt" DESC`,
  );
  return res.rows;
}

/** Upsert koneksi TikTok per username (unique [platform, username]). */
export async function upsertConnection(
  userId: string,
  username: string,
  status: string,
): Promise<ConnectionRow> {
  const res = await pool.query<ConnectionRow>(
    `INSERT INTO "Connection" (id, "userId", platform, username, status, "updatedAt")
     VALUES (gen_random_uuid(), $1, 'tiktok', $2, $3, now())
     ON CONFLICT (platform, username)
     DO UPDATE SET "userId" = EXCLUDED."userId", status = EXCLUDED.status, "updatedAt" = now()
     RETURNING id, "userId", platform, username, status, "createdAt", "updatedAt"`,
    [userId, username, status],
  );
  return res.rows[0];
}

export async function updateConnectionStatus(id: string, status: string): Promise<void> {
  await pool.query(
    `UPDATE "Connection" SET status = $2, "updatedAt" = now() WHERE id = $1`,
    [id, status],
  );
}

export async function findConnection(id: string): Promise<ConnectionRow | null> {
  const res = await pool.query<ConnectionRow>(
    `SELECT id, "userId", platform, username, status, "createdAt", "updatedAt"
     FROM "Connection" WHERE id = $1`,
    [id],
  );
  return res.rows[0] ?? null;
}
