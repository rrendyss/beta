import { apiError, readJson } from "@/lib/api";
import { prisma } from "@/lib/db";
import { redisPub } from "@/lib/redis";

const VALID_TYPES = new Set(["gift", "chat", "follow"]);

/**
 * POST /api/ingest/[token] — connector (atau tool testing) mengirim event
 * normalisasi; diverifikasi via publicToken lalu dipublish ke Redis
 * untuk direlay hub ke room overlay terkait.
 */
export async function POST(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const overlay = await prisma.overlay.findUnique({
    where: { publicToken: token },
    select: { id: true },
  });
  if (!overlay) return apiError(404, "Overlay tidak ditemukan");

  const body = await readJson<{ events?: unknown }>(req);
  const rawEvents = Array.isArray(body?.events) ? body.events : body && typeof body === "object" && "type" in body ? [body] : null;
  if (!rawEvents) return apiError(400, "Body harus berisi event atau array events");

  const valid = rawEvents.filter(
    (e) =>
      typeof e === "object" &&
      e !== null &&
      VALID_TYPES.has((e as { type?: string }).type ?? "") &&
      typeof (e as { user?: string }).user === "string",
  );
  if (valid.length === 0) return apiError(400, "Tidak ada event valid");

  for (const event of valid) {
    await redisPub.publish("mocci:events", JSON.stringify({ overlayId: overlay.id, event }));
  }
  return Response.json({ ok: true, delivered: valid.length });
}
