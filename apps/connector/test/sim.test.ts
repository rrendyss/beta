// Tes data & perilaku mode simulasi (pool demo yang diperkaya).
import { describe, expect, it } from "vitest";
import type { NormalizedEvent } from "@mocci/shared";
import {
  MOCK_CHAT_LINES as SIM_CHAT_LINES,
  MOCK_GIFTS as SIM_GIFTS,
  MOCK_USERS as SIM_USERS,
  pickStreakCount,
  pickWeightedGift,
} from "@mocci/shared/mockdata";
import { SimSession } from "../src/sim.js";

describe("pool data simulasi", () => {
  it("user & chat cukup banyak dan unik/d relevan", () => {
    expect(SIM_USERS.length).toBeGreaterThanOrEqual(20);
    expect(new Set(SIM_USERS).size).toBe(SIM_USERS.length);
    expect(SIM_CHAT_LINES.length).toBeGreaterThanOrEqual(30);
    expect(SIM_CHAT_LINES.every((l) => l.trim().length > 0)).toBe(true);
  });

  it("katalog gift: koin positif, nama unik, bobot positif", () => {
    expect(SIM_GIFTS.length).toBeGreaterThanOrEqual(9);
    expect(new Set(SIM_GIFTS.map((g) => g.name)).size).toBe(SIM_GIFTS.length);
    for (const g of SIM_GIFTS) {
      expect(g.coins).toBeGreaterThan(0);
      expect(g.weight).toBeGreaterThan(0);
      expect(g.streakMax).toBeGreaterThanOrEqual(1);
    }
  });

  it("memuat gift ikonik TikTok dengan nilai koin nyata", () => {
    const byName = new Map(SIM_GIFTS.map((g) => [g.name, g]));
    expect(byName.get("Rose")?.coins).toBe(1);
    expect(byName.get("Galaxy")?.coins).toBe(1000);
    expect(byName.get("TikTok Universe")?.coins).toBeGreaterThan(10000);
  });

  it("pickWeightedGift hanya mengembalikan gift dari katalog", () => {
    const names = new Set(SIM_GIFTS.map((g) => g.name));
    for (let i = 0; i < 200; i++) {
      expect(names.has(pickWeightedGift().name)).toBe(true);
    }
  });

  it("pickStreakCount: gift mahal selalu x1, gift murah dalam batas streak", () => {
    const galaxy = SIM_GIFTS.find((g) => g.name === "Galaxy")!;
    const rose = SIM_GIFTS.find((g) => g.name === "Rose")!;
    for (let i = 0; i < 100; i++) {
      expect(pickStreakCount(galaxy)).toBe(1);
      const c = pickStreakCount(rose);
      expect(c).toBeGreaterThanOrEqual(1);
      expect(c).toBeLessThanOrEqual(rose.streakMax);
    }
  });
});

describe("SimSession", () => {
  async function collect(ticks: number) {
    const events: NormalizedEvent[] = [];
    const statuses: string[] = [];
    const session = new SimSession(
      (ev) => events.push(ev),
      (s) => statuses.push(s),
      10_000, // interval panjang — tick dipanggil manual agar deterministik
    );
    session.start();
    // akses private tick untuk tes: event dipancarkan sinkron
    for (let i = 0; i < ticks; i++) (session as unknown as { tick(): void }).tick();
    await session.stop(); // hentikan interval agar proses tes berakhir
    return { events, statuses, session };
  }

  it("memancarkan status live dan event dengan bentuk kontrak", async () => {
    const { events, statuses } = await collect(300);
    expect(statuses).toContain("live");
    expect(events.length).toBe(300);

    const giftNames = new Set(SIM_GIFTS.map((g) => g.name));
    const users = new Set(SIM_USERS);
    for (const ev of events) {
      expect(["gift", "chat", "follow"]).toContain(ev.type);
      expect(typeof ev.id).toBe("string");
      expect(users.has(ev.user)).toBe(true);
      expect(typeof ev.createdAt).toBe("string");
      if (ev.type === "gift") {
        expect(giftNames.has(ev.data?.giftName ?? "")).toBe(true);
        const gift = SIM_GIFTS.find((g) => g.name === ev.data?.giftName)!;
        expect(ev.amount).toBe(gift.coins * (ev.data?.giftCount ?? 1));
        expect(ev.amount).toBeGreaterThan(0);
      } else {
        expect(ev.amount).toBe(0);
      }
    }
    // pastikan ketiga tipe sempat muncul dalam 300 tick
    expect(new Set(events.map((e) => e.type)).size).toBe(3);
  });

  it("stop() memancarkan status disconnected", async () => {
    const statuses: string[] = [];
    const session = new SimSession(() => {}, (s) => statuses.push(s), 10_000);
    await session.stop();
    expect(statuses).toEqual(["disconnected"]);
  });
});
