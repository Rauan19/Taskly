"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/prisma";
import { run, UserError } from "@/lib/action";
import { DEFAULT_COLUMNS } from "@/lib/constants";
import { requireBoardAccess, requireColumnAccess, requireProjectAdmin, ForbiddenError, isAdmin } from "@/lib/permissions";
import { boardNameSchema, columnSchema, idSchema } from "@/schemas";
import { z } from "zod";

const refresh = (projectId: string) => revalidatePath(`/projects/${projectId}`, "layout");

// ---------- quadros ----------

export async function createBoardAction(projectId: string, name: string) {
  return run(async () => {
    await requireProjectAdmin(projectId);
    const data = boardNameSchema.parse({ name });
    const last = await prisma.board.aggregate({ where: { projectId }, _max: { position: true } });
    const board = await prisma.board.create({
      data: {
        projectId,
        name: data.name,
        position: (last._max.position ?? -1) + 1,
        columns: { create: DEFAULT_COLUMNS.map((n, position) => ({ name: n, position })) },
      },
      select: { id: true },
    });
    refresh(projectId);
    return { id: board.id };
  });
}

export async function renameBoardAction(boardId: string, name: string) {
  return run(async () => {
    const { projectId } = await requireBoardAccess(boardId);
    await requireProjectAdmin(projectId);
    const data = boardNameSchema.parse({ name });
    await prisma.board.update({ where: { id: boardId }, data: { name: data.name } });
    refresh(projectId);
  });
}

export async function deleteBoardAction(boardId: string) {
  return run(async () => {
    const { projectId } = await requireBoardAccess(boardId);
    await requireProjectAdmin(projectId);
    const count = await prisma.board.count({ where: { projectId } });
    if (count <= 1) throw new UserError("O projeto precisa ter pelo menos um quadro.");
    await prisma.board.delete({ where: { id: boardId } });
    refresh(projectId);
  });
}

// ---------- colunas ----------

export async function createColumnAction(boardId: string, input: { name: string; color?: string | null }) {
  return run(async () => {
    const { projectId, role } = await requireBoardAccess(boardId);
    if (!isAdmin(role)) throw new ForbiddenError("Apenas administradores gerenciam colunas.");
    const data = columnSchema.parse(input);
    const last = await prisma.column.aggregate({ where: { boardId }, _max: { position: true } });
    await prisma.column.create({
      data: { boardId, name: data.name, color: data.color ?? null, position: (last._max.position ?? -1) + 1 },
    });
    refresh(projectId);
  });
}

export async function updateColumnAction(columnId: string, input: { name: string; color?: string | null }) {
  return run(async () => {
    const { projectId, role } = await requireColumnAccess(columnId);
    if (!isAdmin(role)) throw new ForbiddenError("Apenas administradores gerenciam colunas.");
    const data = columnSchema.parse(input);
    await prisma.column.update({ where: { id: columnId }, data: { name: data.name, color: data.color ?? null } });
    refresh(projectId);
  });
}

export async function deleteColumnAction(columnId: string) {
  return run(async () => {
    const { projectId, role, column } = await requireColumnAccess(columnId);
    if (!isAdmin(role)) throw new ForbiddenError("Apenas administradores gerenciam colunas.");
    const count = await prisma.column.count({ where: { boardId: column.boardId } });
    if (count <= 1) throw new UserError("O quadro precisa ter pelo menos uma coluna.");
    const files = await prisma.attachment.findMany({ where: { task: { columnId } }, select: { fileUrl: true } });
    await prisma.column.delete({ where: { id: columnId } });
    const { getStorage } = await import("@/lib/storage");
    const storage = await getStorage();
    await Promise.allSettled(files.map((f) => storage.delete(f.fileUrl)));
    refresh(projectId);
  });
}

/** Reordena as colunas de um quadro numa única transação. Não revalida: a UI já é otimista. */
export async function reorderColumnsAction(boardId: string, orderedIds: string[]) {
  return run(async () => {
    const { role } = await requireBoardAccess(boardId);
    if (!isAdmin(role)) throw new ForbiddenError("Apenas administradores gerenciam colunas.");
    const ids = z.array(idSchema).max(100).parse(orderedIds);
    const cols = await prisma.column.findMany({ where: { boardId }, select: { id: true, position: true } });
    const known = new Map(cols.map((c) => [c.id, c.position]));
    if (ids.length !== cols.length || ids.some((id) => !known.has(id))) throw new UserError("Colunas inválidas.");
    const changes = ids.filter((id, i) => known.get(id) !== i);
    await prisma.$transaction(
      changes.map((id) => prisma.column.update({ where: { id }, data: { position: ids.indexOf(id) } })),
    );
  });
}
