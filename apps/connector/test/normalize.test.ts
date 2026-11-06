import { describe, expect, it } from "vitest";
import {
  isStreakOpen,
  normalizeChat,
  normalizeFollow,
  normalizeGift,
  normalizeLike,
  normalizeShare,
  userName,
} from "../src/normalize.js";

describe("userName", () => {
  it("memilih nickname, lalu uniqueId, lalu anonymous", () => {
    expect(userName({ nickname: "Budi", uniqueId: "budi99" })).toBe("Budi");
    expect(userName({ uniqueId: "budi99" })).toBe("budi99");
    expect(userName({})).toBe("anonymous");
    expect(userName(null)).toBe("anonymous");
  });
});

describe("normalizeGift", () => {
  it("menghitung amount = diamondCount × repeatCount", () => {
    const ev = normalizeGift(
      { uniqueId: "budi99", nickname: "Budi" },
      { gift: { name: "Rose", diamondCount: 10 }, repeatCount: 5, giftType: 0, repeatEnd: 1 },
    );
    expect(ev).not.toBeNull();
    expect(ev!.type).toBe("gift");
    expect(ev!.user).toBe("Budi");
    expect(ev!.amount).toBe(50);
    expect(ev!.data?.giftName).toBe("Rose");
    expect(ev!.data?.giftCount).toBe(5);
  });

  it("menahan event streak yang masih terbuka (giftType 1)", () => {
    expect(
      normalizeGift({ uniqueId: "budi" }, { giftType: 1, repeatEnd: 0, repeatCount: 3, gift: { name: "Rose", diamondCount: 1 } }),
    ).toBeNull();
  });

  it("menghitung event penutup streak (repeatEnd 1)", () => {
    const ev = normalizeGift(
      { uniqueId: "budi" },
      { giftType: 1, repeatEnd: 1, repeatCount: 10, gift: { name: "Rose", diamondCount: 1 } },
    );
    expect(ev?.amount).toBe(10);
    expect(ev?.data?.giftCount).toBe(10);
  });

  it("fallback untuk data rusak: count min 1, coins min 0", () => {
    const ev = normalizeGift(null, { gift: null });
    expect(ev?.amount).toBe(0);
    expect(ev?.data?.giftCount).toBe(1);
    expect(ev?.data?.giftName).toBe("Gift");
  });
});

describe("normalizeChat", () => {
  it("memetakan teks ke data.message dengan amount 0", () => {
    const ev = normalizeChat({ uniqueId: "sari" }, "halo semuanya");
    expect(ev.type).toBe("chat");
    expect(ev.user).toBe("sari");
    expect(ev.amount).toBe(0);
    expect(ev.data?.message).toBe("halo semuanya");
  });
});

describe("normalizeFollow", () => {
  it("memetakan follow dengan amount 0", () => {
    const ev = normalizeFollow({ nickname: "Dewi" });
    expect(ev.type).toBe("follow");
    expect(ev.user).toBe("Dewi");
    expect(ev.amount).toBe(0);
  });
});

describe("normalizeLike", () => {
  it("memetakan like dengan amount 0 (satu event = satu charge)", () => {
    const ev = normalizeLike({ nickname: "Dewi" });
    expect(ev.type).toBe("like");
    expect(ev.user).toBe("Dewi");
    expect(ev.amount).toBe(0);
    expect(typeof ev.id).toBe("string");
    expect(Number.isNaN(Date.parse(ev.createdAt))).toBe(false);
  });

  it("fallback anonymous saat payload kosong", () => {
    expect(normalizeLike(null).user).toBe("anonymous");
  });
});

describe("normalizeShare", () => {
  it("memetakan share dengan amount 0", () => {
    const ev = normalizeShare({ nickname: "Rian" });
    expect(ev.type).toBe("share");
    expect(ev.user).toBe("Rian");
    expect(ev.amount).toBe(0);
    expect(Number.isNaN(Date.parse(ev.createdAt))).toBe(false);
  });
});

describe("isStreakOpen", () => {
  it("terbuka hanya untuk giftType 1 tanpa repeatEnd", () => {
    expect(isStreakOpen({ giftType: 1, repeatEnd: 0 })).toBe(true);
    expect(isStreakOpen({ giftType: 1, repeatEnd: 1 })).toBe(false);
    expect(isStreakOpen({ giftType: 0 })).toBe(false);
    expect(isStreakOpen({})).toBe(false);
  });
});
