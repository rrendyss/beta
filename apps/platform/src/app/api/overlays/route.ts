import { randomBytes } from "node:crypto";
import { emptyScene, parseScene } from "@mocci/shared";
import { apiError, readJson } from "@/lib/api";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";

/** GET /api/overlays — daftar overlay milik user. */
export async function GET() {
  const session = await getSession();
  if (!session.userId) return apiError(401, "Belum login");

  const overlays = await prisma.overlay.findMany({
    where: { userId: session.userId },
    orderBy: { updatedAt: "desc" },
    select: { id: true, name: true, publicToken: true, updatedAt: true },
  });
  return Response.json({ overlays });
}

/** POST /api/overlays — buat overlay baru dengan scene kosong. */
export async function POST(req: Request) {
  const session = await getSession();
  if (!session.userId) return apiError(401, "Belum login");

  const body = await readJson<{ name?: string; scene?: unknown }>(req);
  const name = body?.name?.trim() || "Overlay Baru";
  const scene = body?.scene ? parseScene(body.scene) : emptyScene();

  const overlay = await prisma.overlay.create({
    data: {
      userId: session.userId,
      name,
      sceneJson: scene,
      publicToken: randomBytes(16).toString("hex"),
    },
  });
  return Response.json({ overlay }, { status: 201 });
}
