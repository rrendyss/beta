// Tes GalaxyDefenseEngine — inti game native (widget game-canvas).
// Konteks 2d dipalsukan via Proxy agar logika step/push teruji di jsdom
// tanpa paket canvas.
import { describe, expect, it } from "vitest";
import type { NormalizedEvent } from "../events.js";
import { GalaxyDefenseEngine } from "./game-engine.js";

function makeCanvas(): { canvas: HTMLCanvasElement; fillTexts: string[] } {
  const fillTexts: string[] = [];
  const ctx = new Proxy({} as Record<PropertyKey, unknown>, {
    get(_t, prop) {
      if (prop === "measureText") return (s: string) => ({ width: String(s).length * 7 });
      if (prop === "createLinearGradient" || prop === "createRadialGradient") {
        return () => ({ addColorStop: () => {} });
      }
      if (prop === "fillText") return (s: string) => { fillTexts.push(String(s)); };
      return () => {};
    },
    set() { return true; },
  });
  const canvas = {
    clientWidth: 640,
    clientHeight: 480,
    width: 0,
    height: 0,
    getContext: () => ctx,
  } as unknown as HTMLCanvasElement;
  return { canvas, fillTexts };
}

let seq = 0;
function gift(amount: number): NormalizedEvent {
  seq += 1;
  return {
    id: `g-${seq}`, type: "gift", user: "tester", amount,
    data: { giftName: "Rose", giftCount: 1 },
    createdAt: new Date().toISOString(),
  };
}
function chat(): NormalizedEvent {
  seq += 1;
  return {
    id: `c-${seq}`, type: "chat", user: "tester", amount: 0,
    data: { message: "hai" }, createdAt: new Date().toISOString(),
  };
}
function follow(): NormalizedEvent {
  seq += 1;
  return {
    id: `f-${seq}`, type: "follow", user: "tester", amount: 0,
    createdAt: new Date().toISOString(),
  };
}
function like(): NormalizedEvent {
  seq += 1;
  return {
    id: `l-${seq}`, type: "like", user: "tester", amount: 0,
    createdAt: new Date().toISOString(),
  };
}
function share(): NormalizedEvent {
  seq += 1;
  return {
    id: `s-${seq}`, type: "share", user: "tester", amount: 0,
    createdAt: new Date().toISOString(),
  };
}

describe("GalaxyDefenseEngine", () => {
  it("step menggambar HUD (judul, skor, HP, menunggu event)", () => {
    const { canvas, fillTexts } = makeCanvas();
    const engine = new GalaxyDefenseEngine(canvas);
    engine.step(0.016);
    expect(fillTexts).toContain("GALAXY DEFENSE");
    expect(fillTexts).toContain("0");
    expect(fillTexts.some((t) => t.startsWith("BASE "))).toBe(true);
    expect(fillTexts).toContain("Menunggu event live…");
    expect(engine.stats.asteroids).toBeGreaterThanOrEqual(1); // spawn ambient
  });

  it("gift menambah skor; event id sama tidak diproses dua kali", () => {
    const { canvas } = makeCanvas();
    const engine = new GalaxyDefenseEngine(canvas);
    const g = gift(400);
    engine.push(g);
    engine.push(g); // duplikat — id sama
    expect(engine.stats.score).toBe(400);
    expect(engine.stats.gotEvent).toBe(true);
  });

  it("chat menghitung kombo → multiplier x2 setelah 10 chat", () => {
    const { canvas } = makeCanvas();
    const engine = new GalaxyDefenseEngine(canvas);
    for (let i = 0; i < 10; i++) engine.push(chat());
    expect(engine.stats.combo).toBe(10);
    expect(engine.stats.mult).toBe(2);
    engine.push(gift(10));
    expect(engine.stats.score).toBe(20); // skor ikut multiplier
  });

  it("follow memulihkan HP base (shield) tanpa overflow", () => {
    const { canvas } = makeCanvas();
    const engine = new GalaxyDefenseEngine(canvas);
    engine.push(follow());
    expect(engine.stats.hp).toBe(100); // sudah penuh — tetap 100
  });

  it("like mengisi charge: laser ditembakkan tepat setiap 10 like", () => {
    const { canvas } = makeCanvas();
    const engine = new GalaxyDefenseEngine(canvas);
    for (let i = 0; i < 9; i++) engine.push(like());
    expect(engine.stats.likes).toBe(9);
    expect(engine.stats.beams).toBe(0); // belum ke-10 — belum ada laser
    engine.push(like());
    expect(engine.stats.likes).toBe(10);
    expect(engine.stats.beams).toBeGreaterThanOrEqual(1); // laser ke-10 ditembakkan
  });

  it("share memicu gelombang kejut: damage semua asteroid + banner", () => {
    const { canvas, fillTexts } = makeCanvas();
    const engine = new GalaxyDefenseEngine(canvas);
    engine.step(0.016); // pastikan minimal 1 asteroid (spawn ambient)
    const before = engine.stats.asteroids;
    expect(before).toBeGreaterThanOrEqual(1);

    engine.push(share());
    expect(engine.stats.shares).toBe(1);
    expect(engine.stats.waves).toBeGreaterThanOrEqual(1); // cincin kejut aktif

    // 2× share = 40 damage → semua asteroid (hp 10–24) pasti hancur
    engine.push(share());
    expect(engine.stats.asteroids).toBe(0);

    engine.step(0.016);
    expect(fillTexts.some((t) => t.includes("membagikan stream"))).toBe(true);
  });

  it("asteroid yang sampai dasar mengurangi HP base", () => {
    const { canvas } = makeCanvas();
    const engine = new GalaxyDefenseEngine(canvas);
    let guard = 0;
    while (engine.stats.hp === 100 && guard < 4000) {
      engine.step(0.05);
      guard += 1;
    }
    expect(engine.stats.hp).toBeLessThan(100);
  });

  it("tanpa konteks 2d (jsdom) tetap aman: state jalan, draw nonaktif", () => {
    const canvas = {
      clientWidth: 320, clientHeight: 240, width: 0, height: 0,
      getContext: () => null,
    } as unknown as HTMLCanvasElement;
    const engine = new GalaxyDefenseEngine(canvas);
    engine.push(gift(100));
    engine.step(0.016);
    engine.destroy();
    expect(engine.stats.score).toBe(100);
  });

  it("destroy aman dipanggil berkali-kali (unmount React)", () => {
    const { canvas } = makeCanvas();
    const engine = new GalaxyDefenseEngine(canvas);
    engine.start(); // jsdom mungkin tanpa rAF — tetap aman
    engine.destroy();
    engine.destroy();
    expect(engine.stats.dead).toBe(false);
  });
});
