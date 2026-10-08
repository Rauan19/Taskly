import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getCurrentUser } from "@/lib/auth/session";
import { getStorage } from "@/lib/storage";

export const runtime = "nodejs";

/** Entrega o arquivo somente para membros do projeto dono da tarefa. */
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const user = await getCurrentUser();
  if (!user) return new NextResponse("Não autenticado", { status: 401 });

  const att = await prisma.attachment.findFirst({
    where: { id, task: { column: { board: { project: { members: { some: { userId: user.id } } } } } } },
    select: { fileUrl: true, fileName: true, fileType: true },
  });
  if (!att) return new NextResponse("Não encontrado", { status: 404 });

  const obj = await (await getStorage()).get(att.fileUrl);
  if (!obj) return new NextResponse("Arquivo indisponível", { status: 404 });

  return new NextResponse(new Uint8Array(obj.body), {
    headers: {
      "Content-Type": att.fileType,
      "Content-Length": String(obj.body.length),
      "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(att.fileName)}`,
      "Cache-Control": "private, max-age=3600, immutable",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'; img-src 'self' data:; style-src 'unsafe-inline'; sandbox",
    },
  });
}
