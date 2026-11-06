// Data mock & generator event untuk mode demo overlay (?demo=1) dan
// simulasi connector — satu sumber kebenaran untuk keduanya.
import type { NormalizedEvent } from "./events";

/** Nama user mock — gaya username TikTok Indonesia. */
export const MOCK_USERS = [
  "nadia_plays", "bayu.op", "rani.gift", "dimas_afk", "sultan.live", "kimo_22",
  "vira.tiktok", "joko.stream", "mel_central", "reno_p", "zara_says", "fikri.ogg",
  "bunda_sari", "agam.gaming", "putri_ireng", "hendra.gg", "caca_chaca",
  "ryandgz", "mama_dewi", "kucing_oreo", "bang_jago", "nina.boo",
];

/** Komentar chat mock — gaya chat live stream Indonesia. */
export const MOCK_CHAT_LINES = [
  "lets goo!", "gaskeun", "halo semuanya", "wkwkwk", "sip", "mantap bang",
  "kiri", "kanan", "udah join", "sukses ya streamnya", "mainnya jago",
  "GG", "serii abis", "support terus bang", "alhamdulillah menang",
  "ampun daun", "gift nyusul", "semangat streamnya", "salam dari bandung",
  "baru join, mau nanya", "itu map apa bang?", "jedi donk", "baper bener",
  "request lagu donk", "hujan gift bang", "sultan mampir", "wah galaxy nih",
  "auto menang", "feed-nya keren", "overlay-nya keren banget",
  "mainnya santuy tapi jago", "pokoknya tim streaming ini",
];

export interface MockGift {
  name: string;
  /** Nilai koin (diamond) per unit gift. */
  coins: number;
  /** Bobot kemunculan (relatif). */
  weight: number;
  /** Jumlah maksimum streak (repeatCount) untuk gift ini. */
  streakMax: number;
}

/**
 * Katalog gift mock — nama & nilai koin menyerupai katalog TikTok asli.
 * Gift murah sering dikirim bertubi-tubi (streak), gift mahal langka.
 */
export const MOCK_GIFTS: MockGift[] = [
  { name: "Rose", coins: 1, weight: 44, streakMax: 50 },
  { name: "GG", coins: 1, weight: 10, streakMax: 10 },
  { name: "Finger Heart", coins: 5, weight: 14, streakMax: 20 },
  { name: "Doughnut", coins: 30, weight: 10, streakMax: 10 },
  { name: "Hand Hearts", coins: 100, weight: 8, streakMax: 5 },
  { name: "Corgi", coins: 299, weight: 5, streakMax: 2 },
  { name: "Galaxy", coins: 1000, weight: 4, streakMax: 1 },
  { name: "Lion", coins: 29999, weight: 1, streakMax: 1 },
  { name: "TikTok Universe", coins: 44999, weight: 1, streakMax: 1 },
];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function pickWeightedGift(): MockGift {
  const total = MOCK_GIFTS.reduce((s, g) => s + g.weight, 0);
  let r = Math.random() * total;
  for (const g of MOCK_GIFTS) {
    r -= g.weight;
    if (r <= 0) return g;
  }
  return MOCK_GIFTS[0];
}

/** Jumlah streak: bias ke nilai kecil (r²) agar Rose x1–x50 terasa nyata. */
export function pickStreakCount(gift: MockGift): number {
  if (gift.streakMax <= 1) return 1;
  const r = Math.random();
  return 1 + Math.floor(r * r * gift.streakMax);
}

/**
 * Pola tipe berulang: chat, chat, gift, follow, like, chat, gift, share.
 * Deterministik — gift dijamin muncul sejak event ke-3 sehingga preview
 * selalu terlihat hidup dalam ~2 detik pertama (tanpa mengandalkan acak);
 * like (ke-5) dan share (ke-8) ikut teruji di demo.
 */
const TYPE_CYCLE = ["chat", "chat", "gift", "follow", "like", "chat", "gift", "share"] as const;

/**
 * Generator event mock untuk mode demo (?demo=1) — memutar pola tipe
 * dengan payload acak dari pool. Hanya untuk client-side (memakai
 * Date/Math.random); jangan dipanggil saat SSR/PPR.
 */
export class MockEventGenerator {
  private i = 0;

  next(): NormalizedEvent {
    const type = TYPE_CYCLE[this.i % TYPE_CYCLE.length];
    this.i += 1;
    const user = pick(MOCK_USERS);
    const id = `mock-${Date.now().toString(36)}-${this.i}`;
    const createdAt = new Date().toISOString();

    if (type === "chat") {
      return { id, type, user, amount: 0, data: { message: pick(MOCK_CHAT_LINES) }, createdAt };
    }
    if (type === "follow" || type === "like" || type === "share") {
      return { id, type, user, amount: 0, createdAt };
    }
    const gift = pickWeightedGift();
    const count = pickStreakCount(gift);
    return {
      id,
      type: "gift",
      user,
      amount: gift.coins * count,
      data: { giftName: gift.name, giftCount: count },
      createdAt,
    };
  }
}
