// Event TikTok yang dinormalisasi — kontrak connector → hub → overlay.

export type EventType = "gift" | "chat" | "follow" | "like" | "share";

export interface NormalizedEvent {
  id: string;
  type: EventType;
  user: string;
  /** Nilai koin gift (0 untuk chat/follow/like/share). */
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
  const users = [
    "budi", "sari", "agung", "dewi", "rafa", "nadia_plays", "bayu.op",
    "bunda_sari", "sultan.live", "kucing_oreo", "bang_jago", "putri_ireng",
    "dimas_afk", "vira.tiktok", "joko.stream", "mel_central", "reno_p",
    "zara_says", "fikri.ogg", "hendra.gg", "caca_chaca", "mama_dewi",
    "kimo_22", "nina.boo", "ryandgz", "agam.gaming",
  ];
  // Katalog gift dengan nilai koin nyata (menyerupai TikTok) agar demo
  // leaderboard/goal/alert menampilkan variasi yang berarti.
  const gifts = [
    { name: "Rose", coins: 1 },
    { name: "Finger Heart", coins: 5 },
    { name: "Doughnut", coins: 30 },
    { name: "Wristband", coins: 50 },
    { name: "Hand Hearts", coins: 100 },
    { name: "Perfume", coins: 200 },
    { name: "Corgi", coins: 299 },
    { name: "Swan", coins: 500 },
    { name: "Galaxy", coins: 1000 },
    { name: "Dinosaur", coins: 5000 },
    { name: "Lion", coins: 29999 },
    { name: "TikTok Universe", coins: 44999 },
  ];
  const messages = [
    "halo semuanya!", "gaskeun!", "wkwkwk", "mainnya jago", "support terus bang",
    "salam dari bandung", "baru join mau nanya", "hujan gift bang", "GG",
    "overlay-nya keren banget", "semangat streamnya", "sultan mampir",
    "mantap jiwa", "subrek dulu", "like nya dong", "viewer berapa nih",
    "akhirnya menang", "widget nya keren", "next stream kapan?", "sehat selalu ya",
  ];
  const user = users[counter % users.length];
  const gift = gifts[counter % gifts.length];
  const giftCount = counter % 3 + 1;
  return {
    id: `sample-${counter}`,
    type,
    user,
    amount: type === "gift" ? gift.coins * giftCount : 0,
    data:
      type === "gift"
        ? { giftName: gift.name, giftCount }
        : type === "chat"
          ? { message: messages[counter % messages.length] }
          : undefined,
    createdAt: new Date(BASE_MS + counter * 1000).toISOString(),
    ...overrides,
  };
}

export function makeSampleEvents(count = 8): NormalizedEvent[] {
  const types: EventType[] = ["gift", "chat", "follow", "like", "gift", "chat", "share", "gift"];
  return Array.from({ length: count }, (_, i) => makeSampleEvent(types[i % types.length]));
}
