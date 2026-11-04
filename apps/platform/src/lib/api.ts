/** Respons error API yang konsisten. */
export function apiError(status: number, message: string) {
  return Response.json({ error: message }, { status });
}

export async function readJson<T>(req: Request): Promise<T | null> {
  try {
    return (await req.json()) as T;
  } catch {
    return null;
  }
}
