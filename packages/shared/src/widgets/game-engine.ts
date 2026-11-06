// GalaxyDefenseEngine — inti game "Galaxy Defense" sebagai widget native.
// Kanvas murni + loop rAF; event masuk lewat push() (satu-satunya sumber
// aksi), sehingga game berjalan di editor, overlay runtime, dan mode demo
// tanpa URL/iframe/koneksi tambahan. Loop dan ukuran dijaga agar aman di
// jsdom (tanpa rAF/ResizeObserver) dan saat SSR.
import type { NormalizedEvent } from "../events";

export type GameDifficulty = "santai" | "normal" | "gila";

/** Faktor kesulitan: jeda spawn dan kecepatan asteroid. */
const DIFFICULTY: Record<GameDifficulty, { spawn: number; speed: number }> = {
  santai: { spawn: 1.35, speed: 0.85 },
  normal: { spawn: 1, speed: 1 },
  gila: { spawn: 0.6, speed: 1.3 },
};

interface Asteroid {
  x: number; y: number; r: number;
  vx: number; vy: number;
  hp: number; maxHp: number;
  rot: number; spin: number;
  verts: number[]; hit: number;
}
interface Beam { x1: number; y1: number; x2: number; y2: number; life: number }
interface Particle { x: number; y: number; vx: number; vy: number; life: number; max: number; color: string; s: number }
interface Floater { x: number; y: number; text: string; color: string; size: number; life: number; max: number }
interface Star { x: number; y: number; v: number; s: number }
interface Banner { text: string; color: string; life: number }
/** Gelombang kejut dari base saat share. */
interface Wave { life: number; max: number }

/** Snapshot state untuk keperluan tes/inspeksi. */
export interface GameStats {
  score: number;
  hp: number;
  combo: number;
  mult: number;
  asteroids: number;
  dead: boolean;
  gotEvent: boolean;
  likes: number;
  shares: number;
  beams: number;
  waves: number;
}

const fmt = (n: number) => Math.round(n).toLocaleString("id-ID");
const rnd = (a: number, b: number) => a + Math.random() * (b - a);

/** Batas dedupe — aman karena buffer feed maksimal 500 event. */
const MAX_SEEN = 1000;

export class GalaxyDefenseEngine {
  private readonly canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D | null = null;
  private ro: ResizeObserver | null = null;
  private raf = 0;
  private running = false;
  private last = 0;
  private readonly diff: { spawn: number; speed: number };

  private W = 1;
  private H = 1;
  private U = 1;

  private hp = 100;
  private hpMax = 100;
  private score = 0;
  private combo = 0;
  private mult = 1;
  private dead = 0;
  private spawnAt = 0;
  private time = 0;
  private shake = 0;
  private flash = 0;
  private shield = 0;
  private gotEvent = false;
  private banner: Banner | null = null;
  private likes = 0;
  private shares = 0;

  private asteroids: Asteroid[] = [];
  private beams: Beam[] = [];
  private parts: Particle[] = [];
  private floaters: Floater[] = [];
  private waves: Wave[] = [];
  private stars: Star[] = [];
  private seenIds = new Set<string>();

  constructor(canvas: HTMLCanvasElement, opts?: { difficulty?: GameDifficulty }) {
    this.canvas = canvas;
    this.diff = DIFFICULTY[opts?.difficulty ?? "normal"];
    try {
      this.ctx = canvas.getContext("2d");
    } catch {
      this.ctx = null; // jsdom tanpa paket canvas — mode gambar nonaktif
    }
    for (let i = 0; i < 90; i++) {
      this.stars.push({ x: Math.random(), y: Math.random(), v: rnd(6, 22), s: rnd(0.6, 2) });
    }
    // Ukuran harus benar sejak awal — step() tidak boleh bergantung start()
    // (baseY negatif saat W/H masih 1×1 membuat asteroid hilang seketika).
    this.resize();
  }

  // ── Lifecycle ──────────────────────────────────────────────────────────────

  start(): void {
    if (this.running) return;
    this.resize();
    if (typeof ResizeObserver !== "undefined") {
      this.ro = new ResizeObserver(() => this.resize());
      this.ro.observe(this.canvas);
    }
    this.running = true;
    this.last = 0;
    if (typeof requestAnimationFrame !== "function") return;
    const loop = (now: number) => {
      if (!this.running) return;
      const dt = this.last ? Math.min(0.05, Math.max(0, (now - this.last) / 1000)) : 0;
      this.last = now;
      this.step(dt);
      this.raf = requestAnimationFrame(loop);
    };
    this.raf = requestAnimationFrame(loop);
  }

  destroy(): void {
    this.running = false;
    if (this.raf && typeof cancelAnimationFrame === "function") cancelAnimationFrame(this.raf);
    this.raf = 0;
    this.ro?.disconnect();
    this.ro = null;
    this.ctx = null;
  }

  get stats(): GameStats {
    return {
      score: this.score,
      hp: this.hp,
      combo: this.combo,
      mult: this.mult,
      asteroids: this.asteroids.length,
      dead: this.dead > 0,
      gotEvent: this.gotEvent,
      likes: this.likes,
      shares: this.shares,
      beams: this.beams.length,
      waves: this.waves.length,
    };
  }

  // ── Event (dari feed overlay) ──────────────────────────────────────────────

  /** Terima event baru — dedupe by id agar buffer tak pernah diproses dua kali. */
  push(ev: NormalizedEvent): void {
    if (!ev || this.seenIds.has(ev.id)) return;
    this.seenIds.add(ev.id);
    if (this.seenIds.size > MAX_SEEN) {
      const oldest = this.seenIds.values().next().value;
      if (oldest !== undefined) this.seenIds.delete(oldest);
    }

    if (ev.type === "gift") this.onGift(ev);
    else if (ev.type === "follow") this.onFollow(ev);
    else if (ev.type === "chat") this.onChat();
    else if (ev.type === "like") this.onLike();
    else if (ev.type === "share") this.onShare(ev);
  }

  private onGift(ev: NormalizedEvent): void {
    const amount = Math.max(1, ev.amount || 1);
    this.score += amount * this.mult;
    this.gotEvent = true;
    const c = this.cannon();
    if (this.asteroids.length === 0) {
      // tetap tembak ke langit — gift harus terasa bereaksi
      this.beams.push({ x1: c.x, y1: c.y, x2: c.x + rnd(-80, 80) * this.U, y2: c.y - this.H * 0.5, life: 0.3 });
      this.burst(c.x, c.y - 6 * this.U, "#c084fc", 10, 120);
    }
    for (const a of this.asteroids) {
      a.hp -= amount;
      a.hit = 0.14;
      this.beams.push({ x1: c.x, y1: c.y, x2: a.x, y2: a.y, life: 0.3 });
      this.floater(a.x, a.y, "-" + fmt(amount), amount >= 1000 ? "#fbbf24" : "#fda4af",
        12 + Math.min(10, Math.log10(amount + 1) * 3));
    }
    this.killDead();
    this.shake = Math.min(20, this.shake + 2 + Math.log10(amount + 1) * 3.2);
    this.flash = Math.min(0.4, this.flash + 0.05 + amount / 26000);
    const name = (ev.data && ev.data.giftName) || "gift";
    const count = (ev.data && ev.data.giftCount) || 1;
    if (amount >= 1000) {
      this.setBanner(ev.user + " mengirim " + name + " x" + count + "!",
        amount >= 10000 ? "#fbbf24" : "#a855f7");
      if (amount >= 10000) this.burst(this.W / 2, this.H * 0.3, "#fbbf24", 40, 220);
    }
  }

  private onFollow(ev: NormalizedEvent): void {
    this.gotEvent = true;
    const heal = Math.min(15, this.hpMax - this.hp);
    if (heal > 0) {
      this.hp += heal;
      const c = this.cannon();
      this.floater(c.x, c.y - 26 * this.U, "+" + heal + " HP", "#4ade80", 14);
    }
    this.shield = 1.3;
    this.setBanner("★ " + ev.user + " mengikuti!", "#22d3ee");
  }

  private onChat(): void {
    this.gotEvent = true;
    this.combo += 1;
    const nm = 1 + Math.min(4, Math.floor(this.combo / 10));
    if (nm > this.mult) {
      this.mult = nm;
      this.floater(this.W / 2, this.H * 0.4, "KOMBO x" + nm, "#fbbf24", 22);
    }
  }

  /**
   * Like = charge. Setiap 10 like menembakkan satu laser ke asteroid
   * terkuat (12 damage) — like penonton tetap terasa tanpa menyaingi gift.
   */
  private onLike(): void {
    this.gotEvent = true;
    this.likes += 1;
    if (this.likes % 10 !== 0) return;
    const c = this.cannon();
    let target: Asteroid | null = null;
    for (const a of this.asteroids) {
      if (!target || a.hp > target.hp) target = a;
    }
    if (!target) {
      // belum ada asteroid — tembak langit agar like tetap terlihat
      this.beams.push({ x1: c.x, y1: c.y, x2: c.x + rnd(-60, 60) * this.U, y2: c.y - this.H * 0.5, life: 0.3 });
      this.floater(c.x, c.y - 60 * this.U, "⚡ " + this.likes + " LIKE!", "#67e8f9", 16);
      this.shake = Math.min(6, this.shake + 2);
      return;
    }
    const dmg = 12;
    target.hp -= dmg;
    target.hit = 0.14;
    this.beams.push({ x1: c.x, y1: c.y, x2: target.x, y2: target.y, life: 0.3 });
    this.floater(target.x, target.y, "-" + dmg + " ⚡", "#67e8f9", 13);
    this.killDead();
    this.shake = Math.min(8, this.shake + 2);
  }

  /**
   * Share = gelombang kejut dari base: 20 damage ke SEMUA asteroid,
   * kilau, dan banner — momen langka yang layak dirayakan.
   */
  private onShare(ev: NormalizedEvent): void {
    this.gotEvent = true;
    this.shares += 1;
    const dmg = 20;
    for (const a of this.asteroids) {
      a.hp -= dmg;
      a.hit = 0.14;
      this.floater(a.x, a.y, "-" + dmg, "#fbbf24", 13);
    }
    this.killDead();
    this.waves.push({ life: 0.7, max: 0.7 });
    this.shake = Math.min(10, this.shake + 4);
    this.flash = Math.min(0.25, this.flash + 0.1);
    this.setBanner(ev.user + " membagikan stream!", "#34d399");
  }

  /** Buang asteroid mati (hp ≤ 0) dengan ledakan. */
  private killDead(): void {
    const alive: Asteroid[] = [];
    for (const a of this.asteroids) {
      if (a.hp <= 0) {
        this.explode(a);
        this.floater(a.x, a.y - a.r, "HANCUR", "#fdba74", 12);
      } else {
        alive.push(a);
      }
    }
    this.asteroids = alive;
  }

  // ── Simulasi ───────────────────────────────────────────────────────────────

  private baseY(): number { return this.H - 44 * this.U; }
  private cannon(): { x: number; y: number } { return { x: this.W / 2, y: this.baseY() - 10 * this.U }; }

  private resize(): void {
    const dpr = Math.min(typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1, 2);
    const w = Math.max(1, this.canvas.clientWidth || this.canvas.width || 1);
    const h = Math.max(1, this.canvas.clientHeight || this.canvas.height || 1);
    this.W = w;
    this.H = h;
    try {
      this.canvas.width = Math.round(w * dpr);
      this.canvas.height = Math.round(h * dpr);
      this.ctx?.setTransform(dpr, 0, 0, dpr, 0, 0);
    } catch { /* canvas nonaktif */ }
    // U = faktor skala relatif area 960×540, dibatasi agar elemen tetap terbaca
    this.U = Math.max(0.5, Math.min(w / 960, h / 540));
  }

  private setBanner(text: string, color: string): void {
    this.banner = { text, color, life: 3.4 };
  }

  private floater(x: number, y: number, text: string, color: string, size: number): void {
    this.floaters.push({
      x, y, text, color,
      size: Math.max(10, (size || 13) * Math.max(0.75, this.U)),
      life: 1, max: 1,
    });
  }

  private burst(x: number, y: number, color: string, n: number, power: number): void {
    for (let i = 0; i < n; i++) {
      const a = rnd(0, Math.PI * 2), v = rnd(30, 30 + power) * this.U;
      this.parts.push({
        x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v,
        life: rnd(0.4, 0.9), max: 0.9, color, s: rnd(1.5, 3.5) * this.U,
      });
    }
  }

  private spawnInterval(): number {
    const base = Math.max(520, 1350 - this.time * 8 - Math.min(this.score, 20000) * 0.035);
    return Math.max(340, base * this.diff.spawn);
  }

  private spawnAsteroid(): void {
    const r = rnd(13, 32) * this.U;
    const hpBase = 10 + Math.min(30, this.score / 1500) + rnd(0, 14);
    const verts: number[] = [];
    const n = 8 + ((Math.random() * 4) | 0);
    for (let i = 0; i < n; i++) verts.push(rnd(0.72, 1.15));
    this.asteroids.push({
      x: rnd(r + 8, Math.max(r + 9, this.W - r - 8)), y: -r - 4, r,
      vy: (34 + rnd(0, 26) + Math.min(34, this.score / 1400)) * this.U * this.diff.speed,
      vx: rnd(-12, 12) * this.U,
      hp: hpBase, maxHp: hpBase,
      rot: rnd(0, 6.28), spin: rnd(-0.8, 0.8),
      verts, hit: 0,
    });
  }

  private explode(a: Asteroid): void {
    this.burst(a.x, a.y, "#fb923c", 16, 90);
    this.burst(a.x, a.y, "#fde68a", 8, 140);
    this.shake = Math.min(14, this.shake + 3 + a.r / (10 * this.U));
  }

  private gameOver(): void {
    const c = this.cannon();
    this.burst(c.x, this.baseY(), "#ef4444", 60, 260);
    this.burst(c.x, this.baseY(), "#fbbf24", 30, 180);
    this.shake = 26;
    this.flash = 0.5;
    this.dead = 2.6;
    this.setBanner("BASE HANCUR · memulihkan…", "#ef4444");
  }

  private reset(): void {
    this.asteroids = [];
    this.beams = [];
    this.parts = [];
    this.floaters = [];
    this.hp = this.hpMax;
    this.score = 0;
    this.combo = 0;
    this.mult = 1;
    this.spawnAt = this.time * 1000 + 600;
  }

  /** Majukan simulasi dt detik + gambar frame (dipanggil loop rAF & tes). */
  step(dt: number): void {
    const d = Math.min(0.05, Math.max(0, dt));
    this.time += d;

    this.shake = Math.max(0, this.shake - d * 46);
    this.flash = Math.max(0, this.flash - d * 1.6);
    this.shield = Math.max(0, this.shield - d);
    if (this.banner) {
      this.banner.life -= d;
      if (this.banner.life <= 0) this.banner = null;
    }

    if (this.dead > 0) {
      this.dead -= d;
      if (this.dead <= 0) this.reset();
    } else if (this.time * 1000 >= this.spawnAt) {
      this.spawnAsteroid();
      this.spawnAt = this.time * 1000 + this.spawnInterval();
    }

    for (let i = this.asteroids.length - 1; i >= 0; i--) {
      const a = this.asteroids[i];
      a.x += a.vx * d;
      a.y += a.vy * d;
      a.rot += a.spin * d;
      if (a.hit > 0) a.hit -= d;
      if (a.x < a.r || a.x > this.W - a.r) a.vx *= -1;
      if (a.y > this.baseY() - a.r * 0.4) {
        this.asteroids.splice(i, 1);
        if (this.dead <= 0) {
          this.hp = Math.max(0, this.hp - 25);
          this.burst(a.x, this.baseY(), "#f87171", 18, 150);
          this.shake = Math.min(22, this.shake + 9);
          this.floater(a.x, this.baseY() - 20 * this.U, "-25 HP", "#f87171", 15);
          if (this.hp <= 0) this.gameOver();
        }
      }
    }

    for (let i = this.beams.length - 1; i >= 0; i--) {
      this.beams[i].life -= d;
      if (this.beams[i].life <= 0) this.beams.splice(i, 1);
    }
    for (let i = this.parts.length - 1; i >= 0; i--) {
      const p = this.parts[i];
      p.life -= d;
      p.x += p.vx * d;
      p.y += p.vy * d;
      p.vx *= 1 - 2.2 * d;
      p.vy *= 1 - 2.2 * d;
      if (p.life <= 0) this.parts.splice(i, 1);
    }
    for (let i = this.floaters.length - 1; i >= 0; i--) {
      const f = this.floaters[i];
      f.life -= d;
      f.y -= 34 * this.U * d;
      if (f.life <= 0) this.floaters.splice(i, 1);
    }
    for (let i = this.waves.length - 1; i >= 0; i--) {
      this.waves[i].life -= d;
      if (this.waves[i].life <= 0) this.waves.splice(i, 1);
    }
    for (const st of this.stars) {
      st.y += (st.v * d) / this.H;
      if (st.y > 1) { st.y = 0; st.x = Math.random(); }
    }

    this.draw();
  }

  // ── Gambar ─────────────────────────────────────────────────────────────────

  private roundRect(x: number, y: number, w: number, h: number, r: number): void {
    const ctx = this.ctx!;
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  private drawAsteroid(a: Asteroid): void {
    const ctx = this.ctx!;
    ctx.save();
    ctx.translate(a.x, a.y);
    ctx.rotate(a.rot);
    ctx.beginPath();
    const n = a.verts.length;
    for (let i = 0; i < n; i++) {
      const ang = (i / n) * Math.PI * 2;
      const rr = a.r * a.verts[i];
      const px = Math.cos(ang) * rr, py = Math.sin(ang) * rr;
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath();
    const g = ctx.createRadialGradient(-a.r * 0.3, -a.r * 0.3, a.r * 0.2, 0, 0, a.r * 1.1);
    g.addColorStop(0, a.hit > 0 ? "#fff7ed" : "#9ca3af");
    g.addColorStop(1, a.hit > 0 ? "#fb923c" : "#4b5563");
    ctx.fillStyle = g;
    ctx.fill();
    ctx.strokeStyle = "rgba(0,0,0,0.35)";
    ctx.lineWidth = Math.max(1, 1.5 * this.U);
    ctx.stroke();
    if (a.hp < a.maxHp) {
      // retakan — indikator asteroid terluka
      ctx.strokeStyle = "rgba(254,204,220,0.65)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(-a.r * 0.5, -a.r * 0.4);
      ctx.lineTo(a.r * 0.1, 0);
      ctx.lineTo(-a.r * 0.2, a.r * 0.55);
      ctx.stroke();
    }
    ctx.restore();
  }

  private drawHud(): void {
    const ctx = this.ctx!;
    const pad = 14 * this.U;
    const ui = Math.max(1, this.U);

    // judul + skor
    ctx.textAlign = "left";
    ctx.fillStyle = "rgba(196,181,253,0.75)";
    ctx.font = "700 " + 11 * ui + "px system-ui, sans-serif";
    ctx.fillText("GALAXY DEFENSE", pad, pad + 11 * ui);
    ctx.fillStyle = "#ffffff";
    ctx.font = "800 " + Math.max(16, 26 * this.U) + "px system-ui, sans-serif";
    ctx.fillText(fmt(this.score), pad, pad + 11 * ui + Math.max(18, 30 * this.U));

    // kombo
    ctx.textAlign = "right";
    ctx.fillStyle = "#fbbf24";
    ctx.font = "700 " + Math.max(12, 16 * this.U) + "px system-ui, sans-serif";
    ctx.fillText("KOMBO " + this.combo + " · x" + this.mult, this.W - pad, pad + Math.max(13, 17 * this.U));

    // banner perayaan / info
    if (this.banner) {
      const b = this.banner;
      ctx.globalAlpha = Math.min(1, b.life / 0.5);
      ctx.textAlign = "center";
      ctx.font = "800 " + Math.max(13, 20 * this.U) + "px system-ui, sans-serif";
      const tw = ctx.measureText(b.text).width;
      const bh = Math.max(30, 40 * this.U);
      const bx = this.W / 2;
      const by2 = Math.max(46 * this.U, this.H * 0.16);
      ctx.fillStyle = "rgba(9,10,20,0.82)";
      this.roundRect(bx - tw / 2 - 18 * this.U, by2 - bh * 0.55, tw + 36 * this.U, bh, Math.max(8, 12 * this.U));
      ctx.fill();
      ctx.strokeStyle = b.color;
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = b.color;
      ctx.fillText(b.text, bx, by2 + Math.max(4, 6 * this.U));
      ctx.globalAlpha = 1;
    }

    // menunggu event pertama
    if (!this.gotEvent) {
      ctx.textAlign = "center";
      ctx.fillStyle = "rgba(148,163,184,0.75)";
      ctx.font = "600 " + Math.max(10, 13 * this.U) + "px system-ui, sans-serif";
      ctx.fillText("Menunggu event live…", this.W / 2, this.H - 72 * this.U);
    }

    // bar HP base
    const barH = Math.max(5, 8 * this.U);
    const x = pad, w = this.W - pad * 2, y = this.H - barH - Math.max(6, 9 * this.U);
    ctx.fillStyle = "rgba(255,255,255,0.12)";
    this.roundRect(x, y, w, barH, barH / 2);
    ctx.fill();
    const ratio = Math.max(0, this.hp / this.hpMax);
    if (ratio > 0) {
      ctx.fillStyle = ratio > 0.5 ? "#4ade80" : ratio > 0.25 ? "#fbbf24" : "#ef4444";
      this.roundRect(x, y, Math.max(barH, w * ratio), barH, barH / 2);
      ctx.fill();
    }
    ctx.textAlign = "left";
    ctx.fillStyle = "rgba(255,255,255,0.7)";
    ctx.font = "700 " + Math.max(9, 11 * this.U) + "px system-ui, sans-serif";
    ctx.fillText("BASE " + this.hp + "/" + this.hpMax, x, y - 5 * this.U);
  }

  private draw(): void {
    const ctx = this.ctx;
    if (!ctx) return;
    const { W, H, U } = this;

    ctx.save();
    if (this.shake > 0.3) ctx.translate(rnd(-this.shake, this.shake), rnd(-this.shake, this.shake));

    // latar + bintang
    ctx.fillStyle = "#05060f";
    ctx.fillRect(-40, -40, W + 80, H + 80);
    for (const st of this.stars) {
      ctx.globalAlpha = 0.25 + st.s * 0.3;
      ctx.fillStyle = "#c7d2fe";
      ctx.fillRect(st.x * W, st.y * H, st.s, st.s);
    }
    ctx.globalAlpha = 1;

    // pangkalan
    const by = this.baseY(), bw = 170 * U, bh = 26 * U;
    const grad = ctx.createLinearGradient(W / 2 - bw / 2, by, W / 2 + bw / 2, by);
    grad.addColorStop(0, "#1e1b4b");
    grad.addColorStop(0.5, "#4c1d95");
    grad.addColorStop(1, "#1e1b4b");
    ctx.fillStyle = grad;
    this.roundRect(W / 2 - bw / 2, by, bw, bh, 8 * U);
    ctx.fill();
    ctx.strokeStyle = "rgba(167,139,250,0.7)";
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.fillStyle = "#312e81";
    ctx.beginPath();
    ctx.arc(W / 2, by, 26 * U, Math.PI, 0);
    ctx.fill();
    const c = this.cannon();
    ctx.fillStyle = "#a855f7";
    ctx.fillRect(c.x - 4 * U, c.y - 20 * U, 8 * U, 22 * U);
    if (this.shield > 0) {
      ctx.globalAlpha = Math.min(1, this.shield);
      ctx.strokeStyle = "#22d3ee";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.ellipse(W / 2, by + bh / 2, bw * 0.85, bh * 1.5, 0, 0, 6.29);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    for (const a of this.asteroids) this.drawAsteroid(a);

    // gelombang kejut share — cincin membesar dari base
    for (const w of this.waves) {
      const t = 1 - Math.max(0, w.life) / w.max; // 0 → 1
      ctx.globalAlpha = (1 - t) * 0.9;
      ctx.strokeStyle = "#34d399";
      ctx.lineWidth = Math.max(1, 5 * (1 - t));
      ctx.beginPath();
      ctx.arc(W / 2, by + bh / 2, 30 * U + t * Math.max(W, H) * 0.55, 0, 6.29);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    // sinar laser hadiah
    for (const b of this.beams) {
      const t = Math.max(0, b.life / 0.3);
      ctx.globalAlpha = t;
      ctx.strokeStyle = "#c084fc";
      ctx.lineWidth = 5 * U * t + 1;
      ctx.beginPath();
      ctx.moveTo(b.x1, b.y1);
      ctx.lineTo(b.x2, b.y2);
      ctx.stroke();
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = Math.max(1, 1.4);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    // partikel (aditif)
    ctx.globalCompositeOperation = "lighter";
    for (const p of this.parts) {
      ctx.globalAlpha = Math.max(0, p.life / p.max);
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x, p.y, p.s, p.s);
    }
    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = 1;

    // angka damage melayang
    ctx.textAlign = "center";
    for (const f of this.floaters) {
      ctx.globalAlpha = Math.max(0, f.life / f.max);
      ctx.fillStyle = f.color;
      ctx.font = "700 " + f.size + "px system-ui, sans-serif";
      ctx.fillText(f.text, f.x, f.y);
    }
    ctx.globalAlpha = 1;

    ctx.restore(); // akhir area goyang

    if (this.flash > 0.01) {
      ctx.fillStyle = "rgba(255,255,255," + this.flash + ")";
      ctx.fillRect(0, 0, W, H);
    }

    this.drawHud();
  }
}
