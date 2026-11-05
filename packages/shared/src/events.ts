// Event TikTok yang dinormalisasi — kontrak connector → hub → overlay.

export type EventType = "gift" | "chat" | "follow";

export interface NormalizedEvent {
  id: string;
  type: EventType;
  user: string;
  /** Nilai koin gift (0 untuk chat/follow). */
  amount: number;
  data?: {
    giftName?: string;
    giftCount?: number;
    message?: string;
  };
  createdAt: string;
}

let counter = 0;

// Timestamp dasar deterministik — sample events harus stabil saat SSR/PPR
// (nilai `new Date()` langsung membuat prerender Next.js gagal).
const BASE_MS = Date.parse("2026-01-01T00:00:00.000Z");

/** Event tiruan untuk preview editor & testing (tanpa TikTok asli). */
export function makeSampleEvent(type: EventType, overrides?: Partial<NormalizedEvent>): NormalizedEvent {
  counter += 1;
  const users = ["budi", "sari", "agung", "dewi", "rafa"];
  const gifts = ["Rose", "TikTok", "Finger Heart", "Galaxy", "Lion"];
  const user = users[counter % users.length];
  return {
    id: `sample-${counter}`,
    type,
    user,
    amount: type === "gift" ? (counter % 5 + 1) * 10 : 0,
    data:
      type === "gift"
        ? { giftName: gifts[counter % gifts.length], giftCount: counter % 3 + 1 }
        : type === "chat"
          ? { message: `Halo streamer! (${counter})` }
          : undefined,
    createdAt: new Date(BASE_MS + counter * 1000).toISOString(),
    ...overrides,
  };
}

export function makeSampleEvents(count = 8): NormalizedEvent[] {
  const types: EventType[] = ["gift", "chat", "follow", "gift", "chat", "gift", "follow", "gift"];
  return Array.from({ length: count }, (_, i) => makeSampleEvent(types[i % types.length]));
}
