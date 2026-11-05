// LiveSession — koneksi TikTok LIVE asli via `tiktok-live-connector` 2.4.0
// (rilis MIT terakhir), dimuat dinamis agar kegagalannya tidak mematikan
// service. Termasuk reconnect dengan exponential backoff saat stream berakhir.
import type { NormalizedEvent } from "@mocci/shared";
import { normalizeChat, normalizeFollow, normalizeGift } from "./normalize.js";

type AnyConn = Record<string, any>;
type AnyCtor = new (username: string, options?: Record<string, unknown>) => AnyConn;

export type LiveStatus = "connecting" | "live" | "reconnecting" | "error" | "disconnected";
export type EventSink = (ev: NormalizedEvent) => void;
export type StatusSink = (status: LiveStatus, message?: string) => void;

/** Backoff reconnect: 1s → 2s → 4s → 8s → 16s → 30s, lalu menyerah (error). */
const BACKOFF_MS = [1000, 2000, 4000, 8000, 16000, 30000];

async function loadTtlc(): Promise<AnyCtor> {
  const mod = (await import("tiktok-live-connector")) as Record<string, unknown>;
  const Ctor =
    (mod as { TikTokLiveConnection?: unknown }).TikTokLiveConnection ??
    (mod as { default?: { TikTokLiveConnection?: unknown } }).default?.TikTokLiveConnection ??
    (mod as { default?: unknown }).default;
  if (typeof Ctor !== "function") {
    throw new Error("tiktok-live-connector tidak menyediakan TikTokLiveConnection");
  }
  return Ctor as AnyCtor;
}

export class LiveSession {
  private conn: AnyConn | null = null;
  private disposed = false;
  private attempts = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private username: string,
    private onEvent: EventSink,
    private onStatus: StatusSink,
  ) {}

  async start(): Promise<void> {
    await this.connectOnce();
  }

  private async connectOnce(): Promise<void> {
    if (this.disposed) return;
    this.onStatus("connecting", `Connecting to @${this.username}…`);
    try {
      const Ctor = await loadTtlc();
      const conn = new Ctor(this.username, {
        enableExtendedGiftInfo: true,
        processInitialData: false,
      });
      this.conn = conn;
      this.wire(conn);
      await conn.connect();
      if (this.disposed) {
        await this.safeDisconnect(conn);
        return;
      }
      this.attempts = 0;
      this.onStatus("live", `Connected to @${this.username}`);
    } catch (err) {
      const msg = String((err as Error)?.message ?? err);
      if (this.disposed) return;
      if (/not live|offline/i.test(msg)) {
        this.onStatus("error", `@${this.username} tidak sedang live`);
        return;
      }
      this.scheduleReconnect(msg);
    }
  }

  private wire(conn: AnyConn): void {
    const on = (name: string, cb: (payload: any) => void) => {
      try {
        conn.on(name, cb);
      } catch {
        /* event tidak didukung versi lib ini */
      }
    };

    on("chat", (d) => this.onEvent(normalizeChat(d?.user, d?.comment)));
    on("gift", (d) => {
      const ev = normalizeGift(d?.user, d);
      if (ev) this.onEvent(ev);
    });
    on("social", (d) => {
      const hay = `${d?.displayType ?? ""} ${d?.action ?? ""}`.toLowerCase();
      if (!hay.includes("share")) this.onEvent(normalizeFollow(d?.user));
    });
    on("room_user", (d) => {
      // viewers dipakai status panel (fase 2) — diabaikan untuk beta.
      void d;
    });
    on("stream_end", () => {
      if (!this.disposed) this.scheduleReconnect("stream_end");
    });
    on("disconnect", () => {
      if (!this.disposed) this.scheduleReconnect("disconnect");
    });
  }

  private scheduleReconnect(reason: string): void {
    if (this.disposed || this.reconnectTimer) return;
    void this.safeDisconnect(this.conn);
    this.conn = null;

    if (this.attempts >= BACKOFF_MS.length) {
      this.onStatus("error", `Gagal reconnect setelah ${this.attempts} percobaan (${reason})`);
      return;
    }
    const delay = BACKOFF_MS[this.attempts];
    this.attempts += 1;
    this.onStatus("reconnecting", `Reconnect #${this.attempts} dalam ${delay}ms (${reason})`);
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      void this.connectOnce();
    }, delay);
  }

  async stop(): Promise<void> {
    this.disposed = true;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    await this.safeDisconnect(this.conn);
    this.conn = null;
    this.onStatus("disconnected");
  }

  private async safeDisconnect(conn: AnyConn | null): Promise<void> {
    if (!conn) return;
    try {
      if (typeof conn.disconnect === "function") await conn.disconnect();
      else if (typeof conn.disconnectAsync === "function") await conn.disconnectAsync();
    } catch {
      /* koneksi sudah putus */
    }
  }
}
