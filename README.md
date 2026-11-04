# Mocci (Beta)

SaaS overlay builder untuk streamer — desain game overlay interaktif dengan
drag-and-drop editor, pasang di OBS/TikTok Live Studio via browser source.

- Design spec: `docs/superpowers/specs/2026-11-04-mocci-overlay-saas-design.md`
- PRD: `.taskmaster/docs/prd.txt`
- Tasks: `task-master list` (10 task beta)

## Struktur Monorepo (pnpm workspaces)

```
apps/
  platform/    Next.js 15+ (App Router) — auth, dashboard, editor, overlay runtime, WS hub
  connector/   Node service — koneksi TikTok Live → Redis pub/sub
packages/
  shared/      Zod schemas & tipe bersama (scene JSON, widget)
```

## Menjalankan

```bash
pnpm install
pnpm dev:platform    # http://localhost:3000
pnpm dev:connector   # http://localhost:4001
pnpm build           # build semua workspace
```

## Kontribusi

1. Buat branch kerja baru dari `main`
2. Commit perubahan setahap demi setahap
3. Push branch & buka Pull Request bila bekerja bersama
