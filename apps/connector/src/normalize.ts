// Normalisasi event TikTok mentah → NormalizedEvent (@mocci/shared).
// Fungsi murni tanpa I/O agar mudah di-unit-test.
import { randomUUID } from "node:crypto";
import type { NormalizedEvent } from "@mocci/shared";

export interface RawUser {
  uniqueId?: unknown;
  nickname?: unknown;
}

export interface RawGiftPayload {
  giftId?: unknown;
  gift?: {
    id?: unknown;
    name?: unknown;
    diamondCount?: unknown;
    type?: unknown;
  } | null;
  repeatCount?: unknown;
  repeatEnd?: unknown;
  giftType?: unknown;
}

/** Nama tampilan user: nickname → uniqueId → "anonymous". */
export function userName(user: RawUser | null | undefined): string {
  const nick = typeof user?.nickname === "string" ? user.nickname.trim() : "";
  const handle = typeof user?.uniqueId === "string" ? user.uniqueId.trim() : "";
  return nick || handle || "anonymous";
}

/**
 * Gift streak (giftType 1) TikTok mengirim banyak event berulang;
 * hanya event penutup (repeatEnd === 1) yang boleh dihitung.
 */
export function isStreakOpen(raw: RawGiftPayload): boolean {
  const giftType = Number(raw.giftType ?? raw.gift?.type ?? 0);
  return giftType === 1 && Number(raw.repeatEnd ?? 0) !== 1;
}

/** Gift → NormalizedEvent. `amount` = diamondCount × repeatCount. Null saat streak masih terbuka. */
export function normalizeGift(
  user: RawUser | null | undefined,
  raw: RawGiftPayload,
): NormalizedEvent | null {
  if (isStreakOpen(raw)) return null;
  const count = Math.max(1, Number(raw.repeatCount ?? 1) || 1);
  const coins = Math.max(0, Number(raw.gift?.diamondCount ?? 0) || 0);
  return {
    id: randomUUID(),
    type: "gift",
    user: userName(user),
    amount: coins * count,
    data: { giftName: String(raw.gift?.name ?? "Gift"), giftCount: count },
    createdAt: new Date().toISOString(),
  };
}

/** Chat → NormalizedEvent (amount 0, teks di data.message). */
export function normalizeChat(
  user: RawUser | null | undefined,
  comment: unknown,
): NormalizedEvent {
  return {
    id: randomUUID(),
    type: "chat",
    user: userName(user),
    amount: 0,
    data: { message: String(comment ?? "") },
    createdAt: new Date().toISOString(),
  };
}

/** Follow → NormalizedEvent (amount 0). */
export function normalizeFollow(user: RawUser | null | undefined): NormalizedEvent {
  return {
    id: randomUUID(),
    type: "follow",
    user: userName(user),
    amount: 0,
    createdAt: new Date().toISOString(),
  };
}
