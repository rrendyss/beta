// SimSession — mode simulasi: event TikTok sintetis untuk development & test
// (tanpa koneksi TikTok asli). Port dari SimAdapter prototipe.
import type { NormalizedEvent } from "@mocci/shared";
import {
  normalizeChat,
  normalizeFollow,
  normalizeGift,
  type RawGiftPayload,
  type RawUser,
} from "./normalize.js";

const NAMES = [
  "nadia_plays", "bayu.op", "rani.gift", "dimas_afk", "sultan.live", "kimo_22",
  "vira.tiktok", "joko.stream", "mel_central", "reno_p", "zara_says", "fikri.ogg",
];

const CHAT_LINES = [
  "lets goo!", "gaskeun", "halo semuanya", "wkwk", "sip", "mantap",
  "kiri", "kanan", "join", "1", "2", "udah join", "sukses ya streamnya",
];

/** Katalog gift simulasi — bobot menyerupai distribusi gift umum. */
const GIFTS: { name: string; coins: number; weight: number }[] = [
  { name: "Rose", coins: 1, weight: 55 },
  { name: "Finger Heart", coins: 5, weight: 18 },
  { name: "Doughnut", coins: 30, weight: 12 },
  { name: "Hand Hearts", coins: 100, weight: 9 },
  { name: "Galaxy", coins: 1000, weight: 4 },
  { name: "TikTok Universe", coins: 34999, weight: 2 },
];

export type SimStatus = "live" | "disconnected";
export type EventSink = (ev: NormalizedEvent) => void;
export type StatusSink = (status: SimStatus) => void;

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function pickWeightedGift(): { name: string; coins: number } {
  const total = GIFTS.reduce((s, g) => s + g.weight, 0);
  let r = Math.random() * total;
  for (const g of GIFTS) {
    r -= g.weight;
    if (r <= 0) return { name: g.name, coins: g.coins };
  }
  return GIFTS[0];
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
    const user: RawUser = { uniqueId: NAMES[this.n % NAMES.length] };
    const roll = Math.random();

    if (roll < 0.62) {
      this.onEvent(normalizeChat(user, pick(CHAT_LINES)));
    } else if (roll < 0.93) {
      const gift = pickWeightedGift();
      const count = Math.random() < 0.7 ? 1 : 1 + Math.floor(Math.random() * 5);
      const raw: RawGiftPayload = {
        gift: { id: gift.name, name: gift.name, diamondCount: gift.coins, type: 0 },
        repeatCount: count,
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
