// Tes pool mock & MockEventGenerator (mode demo overlay ?demo=1).
import { describe, expect, it } from "vitest";
import {
  MOCK_CHAT_LINES,
  MOCK_GIFTS,
  MOCK_USERS,
  MockEventGenerator,
} from "./mockdata.js";

describe("pool mock", () => {
  it("user, chat, dan katalog gift valid", () => {
    expect(MOCK_USERS.length).toBeGreaterThanOrEqual(20);
    expect(new Set(MOCK_USERS).size).toBe(MOCK_USERS.length);
    expect(MOCK_CHAT_LINES.length).toBeGreaterThanOrEqual(30);
    expect(new Set(MOCK_GIFTS.map((g) => g.name)).size).toBe(MOCK_GIFTS.length);
    for (const g of MOCK_GIFTS) {
      expect(g.coins).toBeGreaterThan(0);
      expect(g.weight).toBeGreaterThan(0);
      expect(g.streakMax).toBeGreaterThanOrEqual(1);
    }
  });
});

describe("MockEventGenerator", () => {
  it("pola cycle deterministik: gift dijamin sejak event ke-3", () => {
    const gen = new MockEventGenerator();
    const cycle = ["chat", "chat", "gift", "follow", "like", "chat", "gift", "share"];
    const first8 = Array.from({ length: 8 }, () => gen.next());
    expect(first8.map((e) => e.type)).toEqual(cycle);
    // seluruh siklus berikutnya tetap konsisten
    const next8 = Array.from({ length: 8 }, () => gen.next());
    expect(next8.map((e) => e.type)).toEqual(cycle);
  });

  it("event memenuhi kontrak NormalizedEvent dan berasal dari pool", () => {
    const gen = new MockEventGenerator();
    const users = new Set(MOCK_USERS);
    const giftNames = new Set(MOCK_GIFTS.map((g) => g.name));
    const messages = new Set(MOCK_CHAT_LINES);
    const seenIds = new Set<string>();

    for (let i = 0; i < 30; i++) {
      const e = gen.next();
      expect(seenIds.has(e.id)).toBe(false);
      seenIds.add(e.id);
      expect(users.has(e.user)).toBe(true);
      expect(Number.isNaN(Date.parse(e.createdAt))).toBe(false);

      if (e.type === "gift") {
        expect(giftNames.has(e.data?.giftName ?? "")).toBe(true);
        const gift = MOCK_GIFTS.find((g) => g.name === e.data?.giftName)!;
        expect(e.amount).toBe(gift.coins * (e.data?.giftCount ?? 0));
        expect(e.amount).toBeGreaterThan(0);
        expect(e.data?.giftCount).toBeGreaterThanOrEqual(1);
      } else if (e.type === "chat") {
        expect(messages.has(e.data?.message ?? "")).toBe(true);
        expect(e.amount).toBe(0);
      } else {
        expect(e.amount).toBe(0);
      }
    }
  });
});
