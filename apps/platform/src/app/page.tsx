import Link from "next/link";

export default function LandingPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-zinc-950 px-4 text-center">
      <h1 className="bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-6xl font-extrabold text-transparent">
        Mocci
      </h1>
      <p className="mt-4 max-w-md text-lg text-zinc-400">
        Desain overlay game interaktif untuk stream-mu — drag, drop, langsung tayang.
      </p>
      <div className="mt-8 flex gap-4">
        <Link
          href="/register"
          className="rounded-xl bg-violet-600 px-6 py-3 font-semibold text-white transition hover:bg-violet-500"
        >
          Mulai Gratis
        </Link>
        <Link
          href="/login"
          className="rounded-xl border border-zinc-700 px-6 py-3 font-semibold text-zinc-300 transition hover:border-zinc-500 hover:text-white"
        >
          Masuk
        </Link>
      </div>
    </main>
  );
}
