import { getIronSession, type IronSession, type SessionOptions } from "iron-session";
import { connection } from "next/server";
import { cookies } from "next/headers";

export interface SessionData {
  userId?: string;
  email?: string;
}

export const sessionOptions: SessionOptions = {
  password: process.env.AUTH_SECRET ?? "dev-secret-mocci-beta-local-0123456789",
  cookieName: "mocci_session",
  cookieOptions: {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
  },
};

export async function getSession(): Promise<IronSession<SessionData>> {
  // Tandai render sebagai request-time sejak awal — query Prisma memakai
  // Date.now() internal yang ditandai detektor prerender Next 16 jika
  // dieksekusi sebelum ada akses dinamis eksplisit.
  await connection();
  return getIronSession<SessionData>(await cookies(), sessionOptions);
}

/** Session user yang sudah login — throw 401-style jika belum. */
export async function requireUser() {
  const session = await getSession();
  if (!session.userId) return null;
  return session;
}
