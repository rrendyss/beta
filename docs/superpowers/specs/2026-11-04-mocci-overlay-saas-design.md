# Design Doc — Mocci: SaaS Overlay Builder untuk Streamer (Beta)

Tanggal: 2026-11-04
Status: Disetujui oleh user

## 1. Ringkasan

Mocci adalah SaaS yang memungkinkan streamer mendesain **game overlay** interaktif
dengan **editor drag-and-drop**, lalu memasangnya di OBS/TikTok Live Studio
melalui URL browser source. Gift, komentar, dan event TikTok Live memicu reaksi
real-time di overlay (game, alert, leaderboard).

Fase beta fokus pada: fondasi SaaS (auth, dashboard) + **layout editor
drag-and-drop** (widget positioning) + overlay runtime real-time. Kustomisasi
game (gift-mapping) menyusul di fase 2.

## 2. Pendekatan Editor

**Dipilih: A — DOM-based editor (React).**

Widget ditulis sekali sebagai komponen React dan dipakai di dua tempat:
editor (WYSIWYG) dan overlay runtime. Scene diserialisasi ke JSON.

Alternatif yang ditolak:
- Canvas 2D (Konva/Fabric): widget berbasis HTML (chat, alert) harus
  di-render ulang di canvas → implementasi ganda.
- Editor + iframe preview: preview akurat tapi butuh postMessage dan lebih
  banyak moving parts.

## 3. Arsitektur

Dua service:

```
┌─────────────────────────────┐     ┌──────────────────────────────┐
│  Platform (Next.js)         │     │  Connector Service           │
│  - Auth (dashboard)         │     │  (evolusi tiktok-overlay-    │
│  - Editor drag-and-drop     │◄───►│   connector)                 │
│  - Overlay runtime          │ WS  │  - Koneksi TikTok Live       │
│    /overlay/[token]         │     │  - Publish event (gift, chat,│
│  - WebSocket hub (socket.io)│     │    follow) via Redis pub/sub │
└─────────────────────────────┘     └──────────────────────────────┘
```

- Platform memakai custom server Next.js + socket.io untuk WebSocket hub.
- Connector berjalan sebagai proses terpisah; satu koneksi TikTok per
  streamer yang aktif live.
- Overlay runtime menerima event via WebSocket (mengganti canvas polling
  pada prototype).

## 4. Data Model (Postgres + Prisma)

- `users` — id, email, password_hash, name
- `overlays` — id, user_id, name, scene_json (jsonb), public_token (unique)
- `connections` — id, user_id, platform ("tiktok"), username, status
- `events` — id, connection_id, type (gift/chat/follow), payload (jsonb), created_at

## 5. Scene JSON (kontrak editor ↔ runtime)

```json
{
  "canvas": { "width": 1920, "height": 1080 },
  "layers": [
    {
      "id": "uuid",
      "type": "gift-alert | chat | leaderboard | game-canvas | goal | text | image",
      "x": 0, "y": 0, "width": 400, "height": 200,
      "rotation": 0, "opacity": 1, "zIndex": 1,
      "config": { "...": "per-widget" }
    }
  ]
}
```

- Divalidasi dengan Zod di editor, API, dan runtime.
- Runtime merender scene JSON apa adanya — editor dan runtime memakai
  komponen widget yang sama.

## 6. Editor UX

- Layout 3 kolom: kiri = palet widget, tengah = kanvas 1920×1080
  (zoom/pan, grid, snap), kanan = inspector (posisi, ukuran, style, config).
- Bawah: daftar layer (urutan zIndex, visibilitas, lock).
- Interaksi: drag untuk pindah, handle untuk resize, rotasi, undo/redo
  (command pattern), multi-select dasar.
- Autosave (debounced) + indikator status simpan.

## 7. Widget Beta (6)

1. **Game Canvas** — embed renderer game dari connector (iframe/URL)
2. **Gift Alert** — animasi saat gift masuk (konfigurasi teks, durasi, suara)
3. **Chat Box** — komentar live dengan styling
4. **Leaderboard** — top gifters (dari events)
5. **Goal/Counter** — progress bar target (mis. total gift)
6. **Teks & Gambar** — elemen statis (judul, logo); dua tipe scene: `text`, `image`

## 8. Real-time Pipeline

```
TikTok Live → Connector (login per streamer) → Redis pub/sub
→ WebSocket hub (Platform) → /overlay/[token] (browser source)
```

- Event dinormalisasi ke bentuk umum: `{type, user, amount, data}`.
- Overlay runtime filter event berdasarkan widget yang ada di scene.

## 9. Stack

- Next.js 15 (App Router) + TypeScript + Tailwind + shadcn/ui
- dnd-kit (drag) + react-rnd (resize/transform)
- Prisma + Postgres, Zod, socket.io, Redis
- Monorepo sederhana: `apps/platform`, `apps/connector`, `packages/shared`

## 10. Testing

- Unit: parser/validator scene JSON, reducer editor (undo/redo)
- Integration: API auth + overlay CRUD
- E2E: alur register → buat overlay → drag widget → buka /overlay/[token]
- Connector: fixture event TikTok (tanpa koneksi live asli di CI)

## 11. Out of Scope (Beta)

- Billing/subscription, template marketplace
- Multi-platform (Twitch/YouTube)
- Gift-mapping UI (fase 2), kolaborasi real-time multi-user
- Mobile app

## 12. Fase Berikutnya

1. Gift-mapping editor (B): gift TikTok → aksi game
2. Template library (template-first onboarding)
3. Billing + paket gratis/berbayar
