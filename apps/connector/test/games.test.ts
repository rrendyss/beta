// Tes GameHub (registry SSE klien game) & penyajian halaman game.
import { describe, expect, it, vi } from "vitest";
import type { ServerResponse } from "node:http";
import type { NormalizedEvent } from "@mocci/shared";
import { GameHub, listGames, readGamePage } from "../src/games.js";

function fakeRes(write?: () => never): ServerResponse {
  return {
    write: write ? vi.fn(write) : vi.fn(() => true),
    on: vi.fn(),
  } as unknown as ServerResponse;
}

function ev(id: string): NormalizedEvent {
  return {
    id,
    type: "chat",
    user: "tester",
    amount: 0,
    data: { message: "hai" },
    createdAt: new Date().toISOString(),
  };
}

describe("GameHub", () => {
  it("broadcast tanpa klien = no-op (return 0)", () => {
    const hub = new GameHub();
    expect(hub.broadcast("o1", ev("a"))).toBe(0);
    expect(hub.count("o1")).toBe(0);
  });

  it("mengirim payload SSE `data: {json}\\n\\n` ke seluruh klien overlay", () => {
    const hub = new GameHub();
    const r1 = fakeRes();
    const r2 = fakeRes();
    hub.add("o1", r1);
    hub.add("o1", r2);

    expect(hub.broadcast("o1", ev("e1"))).toBe(2);
    for (const r of [r1, r2]) {
      const chunk = vi.mocked(r.write).mock.calls[0][0] as string;
      expect(chunk.startsWith("data: ")).toBe(true);
      expect(chunk.endsWith("\n\n")).toBe(true);
      const parsed = JSON.parse(chunk.slice(6)) as { event: NormalizedEvent };
      expect(parsed.event.id).toBe("e1");
      expect(parsed.event.user).toBe("tester");
    }
    expect(hub.count("o1")).toBe(2);
  });

  it("isolasi antar overlay — event overlay A tidak bocor ke B", () => {
    const hub = new GameHub();
    const a = fakeRes();
    const b = fakeRes();
    hub.add("oA", a);
    hub.add("oB", b);

    expect(hub.broadcast("oA", ev("only-a"))).toBe(1);
    expect(vi.mocked(a.write)).toHaveBeenCalledTimes(1);
    expect(vi.mocked(b.write)).not.toHaveBeenCalled();
  });

  it("cleanup idempoten: klien dihapus setelah close", () => {
    const hub = new GameHub();
    const r = fakeRes();
    const remove = hub.add("o1", r);
    expect(hub.count("o1")).toBe(1);
    remove();
    remove(); // panggilan kedua tidak boleh error
    expect(hub.count("o1")).toBe(0);
    expect(hub.broadcast("o1", ev("x"))).toBe(0);
  });

  it("klien yang write-nya gagal dibuang dari registry", () => {
    const hub = new GameHub();
    const dead = fakeRes(() => {
      throw new Error("socket closed");
    });
    const alive = fakeRes();
    hub.add("o1", dead);
    hub.add("o1", alive);

    expect(hub.broadcast("o1", ev("e1"))).toBe(1);
    expect(hub.count("o1")).toBe(1); // dead dibuang, alive bertahan
    expect(hub.broadcast("o1", ev("e2"))).toBe(1);
    expect(vi.mocked(alive.write)).toHaveBeenCalledTimes(2);
  });
});

describe("halaman game", () => {
  it("readGamePage('galaxy-defense') mengembalikan HTML game", async () => {
    const page = await readGamePage("galaxy-defense");
    expect(page).not.toBeNull();
    expect(page).toContain("<canvas");
    expect(page).toContain("EventSource");
    expect(page).toContain("/api/games/stream");
    expect(page).toContain("Menunggu event live");
  });

  it("menerima sufiks .html dan menolak path traversal / nama asing", async () => {
    expect(await readGamePage("galaxy-defense.html")).not.toBeNull();
    expect(await readGamePage("../db")).toBeNull();
    expect(await readGamePage("..%2Fdb")).toBeNull();
    expect(await readGamePage("")).toBeNull();
    expect(await readGamePage("game-tidak-ada")).toBeNull();
  });

  it("listGames menyertakan galaxy-defense", async () => {
    expect(await listGames()).toContain("galaxy-defense");
  });
});
