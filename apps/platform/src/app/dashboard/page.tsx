import Link from "next/link";
import { redirect } from "next/navigation";
import { logoutAction } from "@/app/actions/auth";
import { createOverlayAction, deleteOverlayAction } from "@/app/actions/overlays";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";

// Halaman dinamis per-user — jangan diprerender saat build.
export const instant = false;

export default async function DashboardPage() {
  const session = await getSession();
  if (!session.userId) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    include: { overlays: { orderBy: { updatedAt: "desc" } } },
  });
  if (!user) redirect("/login");

  return (
    <main className="min-h-screen bg-zinc-950 text-white">
      <header className="flex items-center justify-between border-b border-zinc-800 px-6 py-4">
        <div className="text-lg font-bold">
          Mocci<span className="ml-2 rounded bg-violet-600/20 px-2 py-0.5 text-xs font-semibold text-violet-300">BETA</span>
        </div>
        <div className="flex items-center gap-4 text-sm text-zinc-400">
          <span>{user.name}</span>
          <form action={logoutAction}>
            <button className="rounded-lg border border-zinc-700 px-3 py-1.5 transition hover:border-zinc-500 hover:text-white">
              Keluar
            </button>
          </form>
        </div>
      </header>

      <div className="mx-auto max-w-4xl px-6 py-10">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Overlay Saya</h1>
            <p className="text-sm text-zinc-400">Kelola overlay game interaktif untuk stream-mu.</p>
          </div>
          <form action={createOverlayAction}>
            <button className="rounded-lg bg-violet-600 px-4 py-2.5 font-semibold transition hover:bg-violet-500">
              + Overlay Baru
            </button>
          </form>
        </div>

        {user.overlays.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-zinc-700 p-16 text-center">
            <p className="text-zinc-400">Belum ada overlay. Buat yang pertama!</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {user.overlays.map((o) => (
              <div key={o.id} className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5">
                <h2 className="mb-1 font-semibold">{o.name}</h2>
                <p className="mb-4 text-xs text-zinc-500">
                  Diubah {o.updatedAt.toLocaleString("id-ID")}
                </p>
                <div className="flex gap-2">
                  <Link
                    href={`/editor/${o.id}`}
                    className="rounded-lg bg-violet-600 px-3 py-1.5 text-sm font-medium transition hover:bg-violet-500"
                  >
                    Edit
                  </Link>
                  <form action={deleteOverlayAction}>
                    <input type="hidden" name="id" value={o.id} />
                    <button className="rounded-lg border border-zinc-700 px-3 py-1.5 text-sm text-zinc-400 transition hover:border-red-500 hover:text-red-400">
                      Hapus
                    </button>
                  </form>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
