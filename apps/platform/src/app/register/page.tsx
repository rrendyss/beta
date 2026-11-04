"use client";

import Link from "next/link";
import { useActionState } from "react";
import { registerAction, type AuthFormState } from "@/app/actions/auth";

export default function RegisterPage() {
  const [state, formAction, pending] = useActionState<AuthFormState, FormData>(registerAction, {});

  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-950 px-4">
      <div className="w-full max-w-sm rounded-2xl border border-zinc-800 bg-zinc-900/60 p-8 shadow-xl">
        <h1 className="mb-1 text-2xl font-bold text-white">Buat Akun Mocci</h1>
        <p className="mb-6 text-sm text-zinc-400">Gratis untuk beta — mulai bangun overlay-mu.</p>
        <form action={formAction} className="flex flex-col gap-4">
          <input
            name="name"
            type="text"
            placeholder="Nama"
            required
            className="rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2.5 text-white placeholder-zinc-500 outline-none focus:border-violet-500"
          />
          <input
            name="email"
            type="email"
            placeholder="Email"
            required
            className="rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2.5 text-white placeholder-zinc-500 outline-none focus:border-violet-500"
          />
          <input
            name="password"
            type="password"
            placeholder="Password (min. 8 karakter)"
            required
            minLength={8}
            className="rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2.5 text-white placeholder-zinc-500 outline-none focus:border-violet-500"
          />
          {state.error && <p className="text-sm text-red-400">{state.error}</p>}
          <button
            type="submit"
            disabled={pending}
            className="rounded-lg bg-violet-600 px-4 py-2.5 font-semibold text-white transition hover:bg-violet-500 disabled:opacity-50"
          >
            {pending ? "Memproses…" : "Daftar"}
          </button>
        </form>
        <p className="mt-6 text-center text-sm text-zinc-400">
          Sudah punya akun?{" "}
          <Link href="/login" className="text-violet-400 hover:underline">
            Masuk
          </Link>
        </p>
      </div>
    </main>
  );
}
