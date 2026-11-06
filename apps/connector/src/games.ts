// GameHub — streaming event (SSE) ke game yang tertanam di overlay, plus
// penyajian halaman game statis dari public/games/. Game di-serve connector
// karena connectorlah pemilik event (sim & live) — tanpa melalui Redis.
import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import type { ServerResponse } from "node:http";
import type { NormalizedEvent } from "@mocci/shared";

const GAMES_DIR = join(fileURLToPath(new URL(".", import.meta.url)), "..", "public", "games");

/** Registry klien game (SSE) per overlayId. */
export class GameHub {
  private clients = new Map<string, Set<ServerResponse>>();

  /** Daftarkan klien; kembalikan fungsi cleanup (idempoten). */
  add(overlayId: string, res: ServerResponse): () => void {
    let set = this.clients.get(overlayId);
    if (!set) {
      set = new Set();
      this.clients.set(overlayId, set);
    }
    set.add(res);
    let removed = false;
    return () => {
      if (removed) return;
      removed = true;
      this.remove(overlayId, res);
    };
  }

  remove(overlayId: string, res: ServerResponse): void {
    const set = this.clients.get(overlayId);
    if (!set) return;
    set.delete(res);
    if (set.size === 0) this.clients.delete(overlayId);
  }

  count(overlayId: string): number {
    return this.clients.get(overlayId)?.size ?? 0;
  }

  /** Kirim event ke seluruh klien game overlay. Return jumlah yang menerima. */
  broadcast(overlayId: string, event: NormalizedEvent): number {
    const set = this.clients.get(overlayId);
    if (!set || set.size === 0) return 0;
    const chunk = `data: ${JSON.stringify({ event })}\n\n`;
    let delivered = 0;
    for (const res of set) {
      try {
        res.write(chunk);
        delivered += 1;
      } catch {
        // socket mati tanpa event 'close' — buang dari registry
        this.remove(overlayId, res);
      }
    }
    return delivered;
  }
}

export const gameHub = new GameHub();

/**
 * Buka aliran SSE `text/event-stream` untuk overlay. Alur:
 * headers → retry → registry → heartbeat ping tiap 20s → cleanup saat close.
 */
export function streamGameEvents(res: ServerResponse, overlayId: string): void {
  res.writeHead(200, {
    "content-type": "text/event-stream",
    "cache-control": "no-cache",
    connection: "keep-alive",
    "x-accel-buffering": "no",
  });
  res.write("retry: 3000\n\n");
  const remove = gameHub.add(overlayId, res);
  const ping = setInterval(() => {
    try {
      res.write(": ping\n\n");
    } catch {
      /* ditangani listener 'close' */
    }
  }, 20_000);
  res.on("close", () => {
    clearInterval(ping);
    remove();
  });
}

/** Daftar nama game yang tersedia (tanpa ekstensi). */
export async function listGames(): Promise<string[]> {
  try {
    const files = await readdir(GAMES_DIR);
    return files
      .filter((f) => f.endsWith(".html"))
      .map((f) => f.slice(0, -5))
      .sort();
  } catch {
    return [];
  }
}

/**
 * Baca halaman game `public/games/<name>.html`. Ketat terhadap path
 * traversal: hanya `[a-z0-9-]` (opsional sufiks .html yang dibuang).
 */
export async function readGamePage(name: string): Promise<string | null> {
  const base = name.endsWith(".html") ? name.slice(0, -5) : name;
  if (!/^[a-z0-9-]{1,64}$/.test(base)) return null;
  try {
    return await readFile(join(GAMES_DIR, `${base}.html`), "utf8");
  } catch {
    return null;
  }
}
