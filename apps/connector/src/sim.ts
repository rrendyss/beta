// SimSession — mode simulasi: event TikTok sintetis untuk development & test
// (tanpa koneksi TikTok asli). Port dari SimAdapter prototipe, diperkaya
// dengan katalog gift nyata & pool user/chat lebih besar agar demo overlay
// terlihat hidup (leaderboard, goal, dan alert mendapat variasi nilai).
import type { NormalizedEvent } from "@mocci/shared";
import {
  normalizeChat,
  normalizeFollow,
  normalizeGift,
  type RawGiftPayload,
  type RawUser,
} from "./normalize.js";

/** Nama user simulasi — gaya username TikTok Indonesia. */
export const SIM_USERS = [
  "nadia_plays", "bayu.op", "rani.gift", "dimas_afk", "sultan.live", "kimo_22",
  "vira.tiktok", "joko.stream", "mel_central", "reno_p", "zara_says", "fikri.ogg",
  "bunda_sari", "agam.gaming", "putri_ireng", "hendra.gg", "caca_chaca",
  "ryandgz", "mama_dewi", "kucing_oreo", "bang_jago", "nina.boo",
];

/** Komentar chat simulasi — gaya chat live stream Indonesia. */
export const SIM_CHAT_LINES = [
  "lets goo!", "gaskeun", "halo semuanya", "wkwkwk", "sip", "mantap bang",
  "kiri", "kanan", "udah join", "sukses ya streamnya", "mainnya jago",
  "GG", "serii abis", "support terus bang", "alhamdulillah menang",
  "ampun daun", "gift nyusul", "semangat streamnya", "salam dari bandung",
  "baru join, mau nanya", "itu map apa bang?", "jedi donk", "baper bener",
  "request lagu donk", "hujan gift bang", "sultan mampir", "wah galaxy nih",
  "auto menang", "feed-nya keren", "overlay-nya keren banget",
  "mainnya santuy tapi jago", "pokoknya tim streaming ini",
];

export interface SimGift {
  name: string;
  /** Nilai koin (diamond) per unit gift. */
  coins: number;
  /** Bobot kemunculan (relatif). */
  weight: number;
  /** Jumlah maksimum streak (repeatCount) untuk gift ini. */
  streakMax: number;
}

/**
 * Katalog gift simulasi — nama & nilai koin menyerupai katalog TikTok asli.
 * Gift murah sering dikirim bertubi-tubi (streak), gift mahal langka.
 */
export const SIM_GIFTS: SimGift[] = [
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

export type SimStatus = "live" | "disconnected";
export type EventSink = (ev: NormalizedEvent) => void;
export type StatusSink = (status: SimStatus) => void;

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function pickWeightedGift(): SimGift {
  const total = SIM_GIFTS.reduce((s, g) => s + g.weight, 0);
  let r = Math.random() * total;
  for (const g of SIM_GIFTS) {
    r -= g.weight;
    if (r <= 0) return g;
  }
  return SIM_GIFTS[0];
}

/** Jumlah streak: bias ke nilai kecil (r²) agar Rose x1–x50 terasa nyata. */
export function pickStreakCount(gift: SimGift): number {
  if (gift.streakMax <= 1) return 1;
  const r = Math.random();
  return 1 + Math.floor(r * r * gift.streakMax);
}

export class SimSession {
  private timer: ReturnType<typeof setInterval> | null = null;
  private n = 0;

  constructor(
    private onEvent: EventSink,
    private onStatus: StatusSink,
    private intervalMs = 650,
  ) {}

  async start(): Promise<void> {
    this.onStatus("live");
    this.timer = setInterval(() => this.tick(), this.intervalMs);
  }

  private tick(): void {
    this.n += 1;
    const user: RawUser = { uniqueId: SIM_USERS[this.n % SIM_USERS.length] };
    const roll = Math.random();

    if (roll < 0.62) {
      this.onEvent(normalizeChat(user, pick(SIM_CHAT_LINES)));
    } else if (roll < 0.93) {
      const gift = pickWeightedGift();
      const raw: RawGiftPayload = {
        gift: { id: gift.name, name: gift.name, diamondCount: gift.coins, type: 0 },
        repeatCount: pickStreakCount(gift),
        repeatEnd: 1,
        giftType: 0,
      };
      const ev = normalizeGift(user, raw);
      if (ev) this.onEvent(ev);
    } else {
      this.onEvent(normalizeFollow(user));
    }
  }

  async stop(): Promise<void> {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.onStatus("disconnected");
  }
}
