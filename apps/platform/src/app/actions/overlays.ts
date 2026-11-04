"use server";

import { randomBytes } from "node:crypto";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { emptyScene } from "@mocci/shared";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";

export async function createOverlayAction(formData: FormData) {
  const session = await getSession();
  if (!session.userId) redirect("/login");

  const name = String(formData.get("name") ?? "").trim() || "Overlay Baru";
  const overlay = await prisma.overlay.create({
    data: {
      userId: session.userId,
      name,
      sceneJson: emptyScene(),
      publicToken: randomBytes(16).toString("hex"),
    },
  });

  revalidatePath("/dashboard");
  redirect(`/editor/${overlay.id}`);
}

export async function deleteOverlayAction(formData: FormData) {
  const session = await getSession();
  if (!session.userId) redirect("/login");

  const id = String(formData.get("id") ?? "");
  const overlay = await prisma.overlay.findUnique({ where: { id } });
  if (overlay && overlay.userId === session.userId) {
    await prisma.overlay.delete({ where: { id } });
  }
  revalidatePath("/dashboard");
}
