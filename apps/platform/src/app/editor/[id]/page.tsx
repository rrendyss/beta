import { notFound, redirect } from "next/navigation";
import { parseScene } from "@mocci/shared";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import { EditorClient } from "./EditorClient";

// Halaman dinamis per-user — jangan diprerender saat build.
export const instant = false;

export default async function EditorPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session.userId) redirect("/login");

  const { id } = await params;
  const overlay = await prisma.overlay.findUnique({ where: { id } });
  if (!overlay || overlay.userId !== session.userId) notFound();

  return (
    <EditorClient
      overlayId={overlay.id}
      name={overlay.name}
      publicToken={overlay.publicToken}
      initialScene={parseScene(overlay.sceneJson)}
    />
  );
}
