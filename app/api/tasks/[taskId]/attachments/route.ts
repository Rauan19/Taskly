import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getCurrentUser } from "@/lib/auth/session";
import { ForbiddenError, requireTaskAccess } from "@/lib/permissions";
import { rateLimit } from "@/lib/rate-limit";
import { getStorage } from "@/lib/storage";
import { processUpload, UploadError } from "@/lib/uploads";
import { logActivity } from "@/lib/activity";
import { revalidateTask } from "@/lib/revalidate";
import { MAX_ATTACHMENTS_PER_TASK, MAX_FILE_SIZE } from "@/lib/constants";

export const runtime = "nodejs";

export async function POST(req: Request, ctx: { params: Promise<{ taskId: string }> }) {
  const { taskId } = await ctx.params;
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  try {
    const { user, projectId, task } = await requireTaskAccess(taskId);
    if (!rateLimit(`upload:${user.id}`, 30, 10 * 60_000))
      return NextResponse.json({ error: "Muitos envios. Aguarde um pouco." }, { status: 429 });

    // Recusa cedo, antes de ler o corpo inteiro.
    const declared = Number(req.headers.get("content-length") ?? 0);
    if (declared > MAX_FILE_SIZE + 64 * 1024)
      return NextResponse.json({ error: "Arquivo maior que 4 MB." }, { status: 413 });

    const count = await prisma.attachment.count({ where: { taskId } });
    if (count >= MAX_ATTACHMENTS_PER_TASK)
      return NextResponse.json({ error: `Limite de ${MAX_ATTACHMENTS_PER_TASK} anexos por tarefa.` }, { status: 400 });

    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) return NextResponse.json({ error: "Nenhum arquivo enviado." }, { status: 400 });

    const processed = await processUpload(file);
    const key = `attachments/${projectId}/${taskId}/${randomUUID()}.${processed.ext}`;
    await (await getStorage()).put(key, processed.buffer, processed.contentType);

    const attachment = await prisma.attachment.create({
      data: {
        taskId,
        uploadedById: user.id,
        fileName: processed.fileName,
        fileUrl: key,
        fileType: processed.contentType,
        fileSize: processed.buffer.length,
      },
      select: { id: true },
    });
    await logActivity({
      projectId,
      userId: user.id,
      taskId,
      type: "ATTACHMENT_ADDED",
      description: `anexou ${processed.fileName} em "${task.title}"`,
    });
    revalidateTask(projectId, taskId);
    return NextResponse.json({ id: attachment.id }, { status: 201 });
  } catch (e) {
    if (e instanceof ForbiddenError) return NextResponse.json({ error: e.message }, { status: 403 });
    if (e instanceof UploadError) return NextResponse.json({ error: e.message }, { status: 400 });
    console.error(e);
    return NextResponse.json({ error: "Falha ao enviar o arquivo." }, { status: 500 });
  }
}
