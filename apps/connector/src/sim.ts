// SimSession — mode simulasi: event TikTok sintetis untuk development & test
// (tanpa koneksi TikTok asli). Port dari SimAdapter prototipe. Pool data mock
// (user, chat, katalog gift) kini tinggal di @mocci/shared/mockdata dan
// dipakai bersama dengan mode demo overlay.
import type { NormalizedEvent } from "@mocci/shared";
import {
  MOCK_CHAT_LINES,
  MOCK_USERS,
  pickStreakCount,
  pickWeightedGift,
} from "@mocci/shared/mockdata";
import {
  normalizeChat,
  normalizeFollow,
  normalizeGift,
  type RawGiftPayload,
  type RawUser,
} from "./normalize.js";

export type SimStatus = "live" | "disconnected";
export type EventSink = (ev: NormalizedEvent) => void;
export type StatusSink = (status: SimStatus) => void;

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
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
    const user: RawUser = { uniqueId: MOCK_USERS[this.n % MOCK_USERS.length] };
    const roll = Math.random();

    if (roll < 0.62) {
      this.onEvent(normalizeChat(user, pick(MOCK_CHAT_LINES)));
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
