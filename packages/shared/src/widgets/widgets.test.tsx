// Test perilaku widget event-driven (task 9) — render komponen dengan
// EventFeedProvider berisi event terkontrol, asert via DOM (jsdom).
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import type { NormalizedEvent } from "../events.js";
import { ChatBox } from "./ChatBox.js";
import { EventFeedProvider } from "./EventFeedContext.js";
import { GiftAlert } from "./GiftAlert.js";
import { GoalCounter } from "./GoalCounter.js";
import { Leaderboard } from "./Leaderboard.js";

afterEach(cleanup);

let seq = 0;
function ev(partial: Partial<NormalizedEvent> & { type: NormalizedEvent["type"]; user: string }): NormalizedEvent {
  seq += 1;
  return {
    id: `t-${seq}`,
    amount: 0,
    createdAt: new Date(Date.parse("2026-01-01T00:00:00.000Z") + seq * 1000).toISOString(),
    ...partial,
  } as NormalizedEvent;
}

describe("Leaderboard", () => {
  it("agregasi koin per user dan urut menurun", () => {
    const events = [
      ev({ type: "gift", user: "budi", amount: 100, data: { giftName: "Rose", giftCount: 1 } }),
      ev({ type: "gift", user: "sari", amount: 250, data: { giftName: "Galaxy", giftCount: 1 } }),
      ev({ type: "gift", user: "budi", amount: 50, data: { giftName: "Rose", giftCount: 1 } }),
      ev({ type: "chat", user: "budi", data: { message: "halo" } }), // tidak dihitung
    ];
    render(
      <EventFeedProvider events={events}>
        <Leaderboard config={{ title: "Top", topN: 5, metric: "coins", windowMinutes: 0 }} />
      </EventFeedProvider>,
    );
    const text = document.body.textContent ?? "";
    expect(text).toContain("sari");
    expect(text).toContain("budi");
    // sari (250) di atas budi (150)
    expect(text.indexOf("sari")).toBeLessThan(text.indexOf("budi"));
    expect(text).toContain("250");
    expect(text).toContain("150");
  });

  it("rolling window mengecualikan gift di luar jendela", () => {
    const events = [
      { ...ev({ type: "gift", user: "lama", amount: 900 }), createdAt: "2026-01-01T00:00:00.000Z" },
      { ...ev({ type: "gift", user: "baru", amount: 10 }), createdAt: "2026-01-01T00:10:00.000Z" },
      { ...ev({ type: "gift", user: "anchor", amount: 1 }), createdAt: "2026-01-01T00:20:00.000Z" },
    ];
    render(
      <EventFeedProvider events={events}>
        <Leaderboard config={{ title: "Top", topN: 5, metric: "coins", windowMinutes: 15 }} />
      </EventFeedProvider>,
    );
    const text = document.body.textContent ?? "";
    // event 20 menit lalu lebih tua dari jendela 15 menit (relatif event terbaru)
    expect(text).not.toContain("lama");
    expect(text).toContain("baru");
  });

  it("metric gifts menghitung jumlah gift, bukan koin", () => {
    const events = [
      ev({ type: "gift", user: "budi", amount: 500, data: { giftName: "Rose", giftCount: 2 } }),
    ];
    render(
      <EventFeedProvider events={events}>
        <Leaderboard config={{ title: "Top", topN: 5, metric: "gifts", windowMinutes: 0 }} />
      </EventFeedProvider>,
    );
    expect(document.body.textContent).toContain("2");
  });
});

describe("GoalCounter", () => {
  it("akumulasi koin dan lebar progress bar sesuai", () => {
    const events = [
      ev({ type: "gift", user: "budi", amount: 100 }),
      ev({ type: "gift", user: "sari", amount: 50 }),
    ];
    render(
      <EventFeedProvider events={events}>
        <GoalCounter config={{ label: "Target", target: 1000, metric: "coins" }} />
      </EventFeedProvider>,
    );
    expect(document.body.textContent).toContain("150");
    const bar = document.querySelector<HTMLElement>("[style*='width: 15%']");
    expect(bar).not.toBeNull();
  });

  it("metric followers menghitung event follow", () => {
    const events = [
      ev({ type: "follow", user: "a" }),
      ev({ type: "follow", user: "b" }),
      ev({ type: "gift", user: "c", amount: 100 }),
    ];
    render(
      <EventFeedProvider events={events}>
        <GoalCounter config={{ label: "Follower", target: 10, metric: "followers" }} />
      </EventFeedProvider>,
    );
    expect(document.body.textContent).toContain("2");
  });
});

describe("ChatBox", () => {
  it("membatasi buffer sesuai maxMessages (terbaru dipertahankan)", () => {
    const events = [
      ev({ type: "chat", user: "u1", data: { message: "satu" } }),
      ev({ type: "chat", user: "u2", data: { message: "dua" } }),
      ev({ type: "chat", user: "u3", data: { message: "tiga" } }),
    ];
    render(
      <EventFeedProvider events={events}>
        <ChatBox config={{ maxMessages: 2, fontSize: 16, backgroundColor: "#000", textColor: "#fff" }} />
      </EventFeedProvider>,
    );
    const text = document.body.textContent ?? "";
    expect(text).not.toContain("satu");
    expect(text).toContain("dua");
    expect(text).toContain("tiga");
  });
});

describe("GiftAlert", () => {
  it("menampilkan alert dengan template terisi", () => {
    const events = [
      ev({ type: "gift", user: "budi", amount: 10, data: { giftName: "Rose", giftCount: 2 } }),
    ];
    render(
      <EventFeedProvider events={events}>
        <GiftAlert config={{ textTemplate: "{user} mengirim {gift} x{count}!", durationMs: 60000, accentColor: "#a855f7" }} />
      </EventFeedProvider>,
    );
    expect(document.body.textContent).toContain("budi mengirim Rose x2!");
  });

  it("antrean: alert pertama tampil, berikutnya menunggu durasi", () => {
    const events = [
      ev({ type: "gift", user: "a", amount: 1, data: { giftName: "Rose", giftCount: 1 } }),
      ev({ type: "gift", user: "b", amount: 1, data: { giftName: "TikTok", giftCount: 1 } }),
    ];
    render(
      <EventFeedProvider events={events}>
        <GiftAlert config={{ textTemplate: "{user} · {gift}", durationMs: 60000, accentColor: "#fff" }} />
      </EventFeedProvider>,
    );
    const text = document.body.textContent ?? "";
    expect(text).toContain("a · Rose");
    expect(text).not.toContain("b · TikTok");
  });
});

describe("Widget absen dari scene", () => {
  it("hanya widget yang dirender yang bereaksi pada event", () => {
    const events = [
      ev({ type: "chat", user: "penonton", data: { message: "pesan rahasia" } }),
      ev({ type: "gift", user: "budi", amount: 100, data: { giftName: "Rose", giftCount: 1 } }),
    ];
    // Scene hanya punya Leaderboard — teks chat tidak boleh muncul di mana pun.
    render(
      <EventFeedProvider events={events}>
        <Leaderboard config={{ title: "Top", topN: 5, metric: "coins", windowMinutes: 0 }} />
      </EventFeedProvider>,
    );
    expect(document.body.textContent).not.toContain("pesan rahasia");
    expect(document.body.textContent).toContain("budi");
  });
});
