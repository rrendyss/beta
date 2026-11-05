import { parseScene, type Scene } from "@mocci/shared";

/** Respons error API yang konsisten. */
export function apiError(status: number, message: string) {
  return Response.json({ error: message }, { status });
}

/** parseScene dengan ZodError ditangkap → 400, bukan 500. */
export function parseSceneOr400(
  json: unknown,
): { scene: Scene } | { response: Response } {
  try {
    return { scene: parseScene(json) };
  } catch (err) {
    const message = err instanceof Error ? err.message.slice(0, 300) : "Scene tidak valid";
    return { response: apiError(400, `Scene tidak valid: ${message}`) };
  }
}

export async function readJson<T>(req: Request): Promise<T | null> {
  try {
    return (await req.json()) as T;
  } catch {
    return null;
  }
}
