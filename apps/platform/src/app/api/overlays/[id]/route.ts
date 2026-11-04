import { parseScene } from "@mocci/shared";
import { apiError, readJson } from "@/lib/api";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";

type Params = { params: Promise<{ id: string }> };

async function getOwnedOverlay(id: string, userId: string) {
  const overlay = await prisma.overlay.findUnique({ where: { id } });
  if (!overlay) return { error: apiError(404, "Overlay tidak ditemukan") };
  if (overlay.userId !== userId) return { error: apiError(403, "Bukan milik Anda") };
  return { overlay };
}

/** GET /api/overlays/:id */
export async function GET(_req: Request, { params }: Params) {
  const session = await getSession();
  if (!session.userId) return apiError(401, "Belum login");

  const { id } = await params;
  const result = await getOwnedOverlay(id, session.userId);
  if ("error" in result) return result.error;
  return Response.json({ overlay: result.overlay });
}

/** PATCH /api/overlays/:id — update nama dan/atau scene. */
export async function PATCH(req: Request, { params }: Params) {
  const session = await getSession();
  if (!session.userId) return apiError(401, "Belum login");

  const { id } = await params;
  const result = await getOwnedOverlay(id, session.userId);
  if ("error" in result) return result.error;

  const body = await readJson<{ name?: string; scene?: unknown }>(req);
  if (!body || (body.name === undefined && body.scene === undefined)) {
    return apiError(400, "Tidak ada data untuk diupdate");
  }

  const data: { name?: string; sceneJson?: ReturnType<typeof parseScene> } = {};
  if (body.name !== undefined) {
    const name = body.name.trim();
    if (!name) return apiError(400, "Nama tidak boleh kosong");
    data.name = name;
  }
  if (body.scene !== undefined) data.sceneJson = parseScene(body.scene);

  const overlay = await prisma.overlay.update({ where: { id }, data });
  return Response.json({ overlay });
}

/** DELETE /api/overlays/:id */
export async function DELETE(_req: Request, { params }: Params) {
  const session = await getSession();
  if (!session.userId) return apiError(401, "Belum login");

  const { id } = await params;
  const result = await getOwnedOverlay(id, session.userId);
  if ("error" in result) return result.error;

  await prisma.overlay.delete({ where: { id } });
  return Response.json({ ok: true });
}
