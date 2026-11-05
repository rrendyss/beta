import { notFound } from "next/navigation";
import { connection } from "next/server";
import { parseScene } from "@mocci/shared";
import { prisma } from "@/lib/db";
import { OverlayRuntime } from "./OverlayRuntime";

// Dinamis — lookup DB per request (token publik, tanpa auth).
export const instant = false;

export default async function OverlayPage({ params }: { params: Promise<{ token: string }> }) {
  await connection();
  const { token } = await params;
  const overlay = await prisma.overlay.findUnique({ where: { publicToken: token } });
  if (!overlay) notFound();

  return (
    <OverlayRuntime
      overlayId={overlay.id}
      token={token}
      initialScene={parseScene(overlay.sceneJson)}
    />
  );
}
