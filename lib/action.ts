import "server-only";
import { ZodError } from "zod";
import { ForbiddenError } from "@/lib/permissions";

/** Erro com mensagem segura para mostrar ao usuário. */
export class UserError extends Error {}

export type ActionResult<T = void> = { ok: true; data: T } | { ok: false; error: string };

/** Executa a action capturando erros esperados; erros de controle do Next (redirect/notFound) passam. */
export async function run<T = void>(fn: () => Promise<T>): Promise<ActionResult<T>> {
  try {
    return { ok: true, data: await fn() };
  } catch (e) {
    const digest = (e as { digest?: unknown })?.digest;
    if (typeof digest === "string" && digest.startsWith("NEXT_")) throw e;
    if (e instanceof ZodError) return { ok: false, error: e.issues[0]?.message ?? "Dados inválidos." };
    if (e instanceof ForbiddenError || e instanceof UserError) return { ok: false, error: e.message };
    console.error(e);
    return { ok: false, error: "Algo deu errado. Tente novamente." };
  }
}
