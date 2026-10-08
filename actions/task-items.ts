"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/prisma";
import { run, UserError } from "@/lib/action";
import { logActivity } from "@/lib/activity";
import { cleanText } from "@/lib/utils";
import { assertCanEditTask, ForbiddenError, isAdmin, requireTaskAccess } from "@/lib/permissions";
import { checklistTitleSchema, commentSchema, idSchema } from "@/schemas";
import { z } from "zod";

const refresh = (projectId: string, taskId: string) => {
  revalidatePath(`/projects/${projectId}/board`);
  revalidatePath(`/tasks/${taskId}`);
};

// ---------- checklist ----------

async function checklistItemAccess(itemId: string) {
  const item = await prisma.checklist.findUnique({ where: { id: itemId }, select: { id: true, taskId: true } });
  if (!item) throw new UserError("Item não encontrado.");
  const access = await requireTaskAccess(item.taskId);
  assertCanEditTask(access.role, access.user.id, access.task);
  return { ...access, item };
}

export async function addChecklistItemAction(taskId: string, title: string) {
  return run(async () => {
    const text = cleanText(checklistTitleSchema.parse(title));
    const { user, role, projectId, task } = await requireTaskAccess(taskId);
    assertCanEditTask(role, user.id, task);
    const count = await prisma.checklist.count({ where: { taskId } });
    if (count >= 100) throw new UserError("Limite de 100 itens por tarefa.");
    const last = await prisma.checklist.aggregate({ where: { taskId }, _max: { position: true } });
    await prisma.checklist.create({ data: { taskId, title: text, position: (last._max.position ?? -1) + 1 } });
    refresh(projectId, taskId);
  });
}

export async function toggleChecklistItemAction(itemId: string, completed: boolean) {
  return run(async () => {
    const { projectId, item } = await checklistItemAccess(itemId);
    await prisma.checklist.update({ where: { id: itemId }, data: { completed } });
    refresh(projectId, item.taskId);
  });
}

export async function renameChecklistItemAction(itemId: string, title: string) {
  return run(async () => {
    const text = cleanText(checklistTitleSchema.parse(title));
    const { projectId, item } = await checklistItemAccess(itemId);
    await prisma.checklist.update({ where: { id: itemId }, data: { title: text } });
    refresh(projectId, item.taskId);
  });
}

export async function deleteChecklistItemAction(itemId: string) {
  return run(async () => {
    const { projectId, item } = await checklistItemAccess(itemId);
    await prisma.checklist.delete({ where: { id: itemId } });
    refresh(projectId, item.taskId);
  });
}

export async function reorderChecklistAction(taskId: string, orderedIds: string[]) {
  return run(async () => {
    const ids = z.array(idSchema).max(100).parse(orderedIds);
    const { user, role, task } = await requireTaskAccess(taskId);
    assertCanEditTask(role, user.id, task);
    const items = await prisma.checklist.findMany({ where: { taskId }, select: { id: true, position: true } });
    const known = new Map(items.map((i) => [i.id, i.position]));
    if (ids.length !== items.length || ids.some((id) => !known.has(id))) throw new UserError("Itens inválidos.");
    await prisma.$transaction(
      ids.flatMap((id, i) => (known.get(id) !== i ? [prisma.checklist.update({ where: { id }, data: { position: i } })] : [])),
    );
  });
}

// ---------- comentários ----------

export async function addCommentAction(taskId: string, content: string) {
  return run(async () => {
    const text = cleanText(commentSchema.parse(content));
    const { user, projectId, task } = await requireTaskAccess(taskId);
    await prisma.comment.create({ data: { taskId, userId: user.id, content: text } });
    await logActivity({
      projectId,
      userId: user.id,
      taskId,
      type: "COMMENT_ADDED",
      description: `comentou em "${task.title}"`,
    });
    refresh(projectId, taskId);
  });
}

async function commentAccess(commentId: string) {
  const c = await prisma.comment.findUnique({ where: { id: commentId }, select: { id: true, taskId: true, userId: true } });
  if (!c) throw new UserError("Comentário não encontrado.");
  return { ...(await requireTaskAccess(c.taskId)), comment: c };
}

export async function updateCommentAction(commentId: string, content: string) {
  return run(async () => {
    const text = cleanText(commentSchema.parse(content));
    const { user, projectId, comment } = await commentAccess(commentId);
    if (comment.userId !== user.id) throw new ForbiddenError("Você só pode editar seus próprios comentários.");
    await prisma.comment.update({ where: { id: commentId }, data: { content: text } });
    refresh(projectId, comment.taskId);
  });
}

export async function deleteCommentAction(commentId: string) {
  return run(async () => {
    const { user, role, projectId, comment } = await commentAccess(commentId);
    if (comment.userId !== user.id && !isAdmin(role)) throw new ForbiddenError();
    await prisma.comment.delete({ where: { id: commentId } });
    refresh(projectId, comment.taskId);
  });
}

// ---------- anexos (upload é feito pelo Route Handler /api/tasks/[taskId]/attachments) ----------

export async function deleteAttachmentAction(attachmentId: string) {
  return run(async () => {
    const att = await prisma.attachment.findUnique({
      where: { id: attachmentId },
      select: { id: true, taskId: true, uploadedById: true, fileUrl: true },
    });
    if (!att) return;
    const { user, role, projectId } = await requireTaskAccess(att.taskId);
    if (att.uploadedById !== user.id && !isAdmin(role)) throw new ForbiddenError();
    await prisma.attachment.delete({ where: { id: attachmentId } });
    const { getStorage } = await import("@/lib/storage");
    await (await getStorage()).delete(att.fileUrl).catch(() => undefined);
    refresh(projectId, att.taskId);
  });
}
